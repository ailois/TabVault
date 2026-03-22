import React, { useEffect, useMemo, useState } from "react"

import { ErrorBanner } from "./components/error-banner"
import { BookmarkList } from "./components/bookmark-list"
import { BookmarkDrawer } from "./components/bookmark-drawer"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { saveCurrentPage as defaultSaveCurrentPage } from "./features/bookmarks/save-current-page"
import { searchBookmarks, type SearchMode } from "./features/bookmarks/search-bookmarks"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { extractPage as defaultExtractPage } from "./lib/extraction/extract-page"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import type { AiProvider } from "./lib/providers/provider"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import type { BookmarkRecord } from "./types/bookmark"
import type { ProviderConfig } from "./types/settings"
import { buildGlobalStyles, radius, spacing } from "./ui/design-tokens"
import { useTheme } from "./ui/use-theme"
import { useGlobalStyles } from "./ui/use-global-styles"
import { ThemeProvider } from "./ui/theme-context"

type PopupProps = {
  services?: Partial<PopupServices>
}

type PopupServices = {
  bookmarkRepository: BookmarkRepository
  settingsRepository: SettingsRepository
  saveCurrentPage: typeof defaultSaveCurrentPage
  analyzeBookmark: typeof defaultAnalyzeBookmark
  extractPage: typeof defaultExtractPage
  queryActiveTab: () => Promise<ChromeTab | undefined>
  createProvider: (config: ProviderConfig) => AiProvider
  themeRepository: ThemeRepository
}

type ChromeTab = {
  id?: number
  title?: string | null
  url?: string | null
}

const DEFAULT_POPUP_SERVICES: PopupServices = {
  bookmarkRepository: new IndexedDbBookmarkRepository(),
  settingsRepository: new ChromeSettingsRepository(),
  saveCurrentPage: defaultSaveCurrentPage,
  analyzeBookmark: defaultAnalyzeBookmark,
  extractPage: defaultExtractPage,
  queryActiveTab: async () => {
    const [activeTab] = await (globalThis.chrome?.tabs?.query({
      active: true,
      currentWindow: true
    }) ?? Promise.resolve([]))

    return activeTab
  },
  createProvider: defaultCreateProvider,
  themeRepository: new ChromeThemeRepository()
}

function Popup({ services }: PopupProps) {
  const popupServices = useMemo(() => ({ ...DEFAULT_POPUP_SERVICES, ...services }), [services])
  const theme = useTheme(popupServices.themeRepository)
  useGlobalStyles(theme)
  const [statusMessage, setStatusMessage] = useState("Ready to save the current page.")
  const [statusTone, setStatusTone] = useState<"info" | "success">("info")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true)
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMode, setSearchMode] = useState<SearchMode>("all")
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null)
  const [selectedBookmark, setSelectedBookmark] = useState<BookmarkRecord | null>(null)
  const [localAnalyzingIds, setLocalAnalyzingIds] = useState<Set<string>>(new Set())

  const filteredBookmarks = useMemo(
    () => searchBookmarks(bookmarks, searchQuery, searchMode),
    [bookmarks, searchQuery, searchMode]
  )

  const displayedBookmarks = useMemo(
    () => filteredBookmarks.map((bm) =>
      localAnalyzingIds.has(bm.id) && bm.status !== "analyzing"
        ? { ...bm, status: "analyzing" as const }
        : bm
    ),
    [filteredBookmarks, localAnalyzingIds]
  )

  const hasPendingBookmarks = bookmarks.some(
    (b) => b.status === "saved" || b.status === "error"
  )

  const hasClearableBookmarks = bookmarks.some(
    (b) => b.status === "done" || b.status === "error" || b.status === "analyzing" || b.summary
  )

  useEffect(() => {
    void loadBookmarks()
  }, [])

  async function loadBookmarks(): Promise<void> {
    setIsLoadingBookmarks(true)

    try {
      const savedBookmarks = await popupServices.bookmarkRepository.list()

      setBookmarks(savedBookmarks)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to load bookmarks"))
    } finally {
      setIsLoadingBookmarks(false)
    }
  }

  async function handleDeleteBookmark(id: string): Promise<void> {
    try {
      await popupServices.bookmarkRepository.delete(id)
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to delete bookmark"))
    }
  }

  async function handleAnalyzeBookmark(id: string): Promise<void> {
    const settings = await popupServices.settingsRepository.getAppSettings()
    const providers = await popupServices.settingsRepository.getProviders()
    const selectedProvider = providers.find(
      (provider) => provider.enabled && provider.provider === settings.defaultProvider
    )

    if (!selectedProvider?.apiKey.trim()) {
      setErrorMessage("Add an API key in Settings to enable analysis.")
      return
    }

    const bookmark = bookmarks.find((b) => b.id === id)
    if (!bookmark) return

    setLocalAnalyzingIds((prev) => new Set([...prev, id]))
    setErrorMessage(null)

    try {
      await popupServices.analyzeBookmark({
        bookmark,
        provider: popupServices.createProvider(selectedProvider),
        bookmarkRepository: popupServices.bookmarkRepository
      })
    } finally {
      setLocalAnalyzingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await loadBookmarks()
    }
  }

  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "ANALYSIS_PROGRESS") {
        setAnalyzeProgress({ current: message.current, total: message.total })
      }
      if (message.type === "ANALYSIS_COMPLETE") {
        setAnalyzeProgress(null)
        void loadBookmarks()
      }
    }
    globalThis.chrome?.runtime?.onMessage.addListener(listener)

    globalThis.chrome?.runtime?.sendMessage(
      { type: "GET_ANALYSIS_STATUS" },
      (response: any) => {
        if (response?.running) {
          setAnalyzeProgress({ current: response.current, total: response.total })
        }
      }
    )

    return () => globalThis.chrome?.runtime?.onMessage.removeListener(listener)
  }, [])

  async function handleAnalyzeAll(): Promise<void> {
    if (!hasPendingBookmarks) return

    const settings = await popupServices.settingsRepository.getAppSettings()
    const providers = await popupServices.settingsRepository.getProviders()
    const selectedProvider = providers.find(
      (provider) => provider.enabled && provider.provider === settings.defaultProvider
    )

    if (!selectedProvider?.apiKey.trim()) {
      setErrorMessage("Add an API key in Settings to enable analysis.")
      return
    }

    setErrorMessage(null)
    globalThis.chrome?.runtime?.sendMessage({ type: "ANALYZE_ALL" }, () => {})
  }

  async function handleUpdateTags(id: string, aiTags: string[], userTags: string[]): Promise<void> {
    const bookmark = bookmarks.find((b) => b.id === id)
    if (!bookmark) return
    try {
      await popupServices.bookmarkRepository.update({ ...bookmark, aiTags, userTags, updatedAt: new Date().toISOString() })
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to update tags"))
    }
  }

  async function handleClearAnalysis(id: string): Promise<void> {
    try {
      await popupServices.bookmarkRepository.clearAnalysis(id)
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to clear analysis"))
    }
  }

  async function handleClearAllAnalysis(): Promise<void> {
    try {
      await popupServices.bookmarkRepository.clearAllAnalysis()
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to clear all analysis"))
    }
  }

  async function handleSaveCurrentPage(): Promise<void> {
    setIsSaving(true)
    setIsAnalyzing(false)
    setErrorMessage(null)
    setStatusTone("info")
    setStatusMessage("Saving current page...")

    try {
      const activeTab = await popupServices.queryActiveTab()
      const extractedText = typeof activeTab?.id === "number" ? await popupServices.extractPage(activeTab.id) : undefined
      const savedBookmark = await popupServices.saveCurrentPage({
        activeTab: activeTab ?? {},
        extractedText,
        bookmarkRepository: popupServices.bookmarkRepository
      })

      setStatusTone("success")
      setStatusMessage(`Saved: ${savedBookmark.title}`)
      await loadBookmarks()
      await maybeAnalyzeBookmark(savedBookmark)
    } catch (error) {
      setErrorMessage(getSaveErrorMessage(error))
      setStatusTone("info")
      setStatusMessage("Ready to save the current page.")
    } finally {
      setIsSaving(false)
    }
  }

  async function maybeAnalyzeBookmark(bookmark: BookmarkRecord): Promise<void> {
    const settings = await popupServices.settingsRepository.getAppSettings()

    if (!settings.autoAnalyzeOnSave) {
      return
    }

    const providers = await popupServices.settingsRepository.getProviders()
    const selectedProvider = providers.find(
      (provider) => provider.enabled && provider.provider === settings.defaultProvider
    )

    if (!selectedProvider?.apiKey.trim()) {
      setErrorMessage("Add an API key in Settings to enable automatic analysis.")
      return
    }

    setIsAnalyzing(true)
    setStatusTone("info")
    setStatusMessage("Analyzing saved bookmark...")

    try {
      await popupServices.analyzeBookmark({
        bookmark,
        provider: popupServices.createProvider(selectedProvider),
        bookmarkRepository: popupServices.bookmarkRepository
      })
      setStatusTone("success")
      setStatusMessage(`Saved: ${bookmark.title}`)
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to analyze bookmark"))
      setStatusTone("success")
      setStatusMessage(`Saved: ${bookmark.title}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const pageStyle: React.CSSProperties = {
    width: "380px",
    height: "600px",
    overflow: "hidden",
    backgroundColor: theme.page,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column"
  }

  const shellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: theme.surface
  }

  const secondaryActionButtonStyle: React.CSSProperties = {
    padding: "4px 10px",
    border: `1px solid ${theme.border}`,
    borderRadius: radius.pill,
    backgroundColor: theme.surface,
    color: theme.textMuted,
    fontSize: "0.8125rem",
    fontWeight: 500,
    cursor: "pointer"
  }

  const statusTextStyle: React.CSSProperties = {
    margin: `0 ${spacing.md}`,
    fontSize: "0.8125rem",
    color: theme.textSuccess,
    padding: `0 0 ${spacing.xs}`
  }

  const libraryHeadingStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    margin: 0,
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: "0.625rem",
    fontWeight: 700,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.1em"
  }

  const bookmarkCountStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1px 6px",
    borderRadius: radius.pill,
    backgroundColor: theme.surfaceElevated,
    fontSize: "0.7rem",
    fontWeight: 600,
    color: theme.textMuted
  }

  const stickyFooterStyle: React.CSSProperties = {
    padding: spacing.md,
    borderTop: `1px solid ${theme.border}`,
    backgroundColor: theme.surface,
    boxShadow: theme.shadow
  }

  const primaryActionButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}`,
    border: "none",
    borderRadius: "12px",
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.9375rem",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(99,102,241,0.22)"
  }

  return (
    <ThemeProvider theme={theme}>
    <main aria-labelledby="popup-title" style={pageStyle}>
      <div data-testid="popup-shell" style={shellStyle}>
        {/* Brand header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${spacing.sm} ${spacing.md}`,
          borderBottom: `1px solid ${theme.borderMuted}`,
          backgroundColor: theme.surface
        }}>
          <h1 id="popup-title" style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: theme.accent }}>✦</span>
            TabVault
            <span style={{ fontSize: "0.625rem", fontWeight: 800, background: theme.accentSoft, color: theme.accent, padding: "1px 5px", borderRadius: "4px" }}>PRO</span>
          </h1>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              aria-label={theme.isDark ? "Switch to light mode" : "Switch to dark mode"}
              data-testid="theme-toggle-button"
              onClick={() => theme.toggle()}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: theme.textMuted, padding: "4px", borderRadius: radius.small, lineHeight: 1, transition: "color 0.15s ease" }}
              type="button"
            >
              {theme.isDark ? "☀️" : "🌙"}
            </button>
            <button
              aria-label="Open settings"
              onClick={() => (globalThis.chrome?.runtime as any)?.openOptionsPage?.()}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: theme.textMuted, padding: "4px", borderRadius: radius.small, lineHeight: 1, transition: "color 0.15s ease" }}
              type="button"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Search area */}
        <div style={{ padding: spacing.sm, borderBottom: `1px solid ${theme.borderMuted}`, backgroundColor: theme.surfaceElevated }}>
          <label htmlFor="bookmark-search" style={visuallyHiddenStyle}>Search bookmarks</label>
          <input
            id="bookmark-search"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, URL, tags..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 12px",
              border: `1px solid ${theme.border}`,
              borderRadius: radius.medium,
              backgroundColor: theme.surface,
              color: theme.textPrimary,
              fontSize: "0.875rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
            }}
            type="search"
            value={searchQuery}
          />
          {/* Filter chips — KEEP data-testid="search-chip" */}
          <div style={{ display: "flex", gap: spacing.xs, marginTop: spacing.sm, overflowX: "auto" }}>
            {(["all", "title", "tags", "url"] as const).map((mode) => (
              <button
                data-testid="search-chip"
                key={mode}
                onClick={() => setSearchMode(mode)}
                style={{
                  padding: "3px 12px",
                  border: searchMode === mode ? "none" : `1px solid ${theme.border}`,
                  borderRadius: radius.pill,
                  fontSize: "0.6875rem",
                  fontWeight: searchMode === mode ? 700 : 500,
                  cursor: "pointer",
                  backgroundColor: searchMode === mode ? theme.accent : theme.surface,
                  color: searchMode === mode ? "#ffffff" : theme.textMuted,
                  whiteSpace: "nowrap" as const,
                  flexShrink: 0,
                  boxShadow: searchMode === mode ? "0 1px 2px rgba(79,70,229,0.22)" : "none"
                }}
                type="button"
              >
                {mode === "all" ? "All" : mode === "tags" ? "Tags" : mode === "url" ? "URL" : "Title"}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary actions row */}
        <section aria-labelledby="popup-actions-title" style={{ display: "flex", gap: spacing.xs, padding: `${spacing.xs} ${spacing.md}` }}>
          <h2 id="popup-actions-title" style={visuallyHiddenStyle}>Actions</h2>
          <button
            data-testid="popup-secondary-action"
            disabled={isLoadingBookmarks || isSaving || isAnalyzing}
            onClick={() => void loadBookmarks()}
            style={secondaryActionButtonStyle}
            type="button">
            {isLoadingBookmarks ? "Loading..." : "Reload"}
          </button>
          <button
            data-testid="popup-analyze-all-action"
            disabled={!hasPendingBookmarks || isSaving || analyzeProgress !== null}
            onClick={() => void handleAnalyzeAll()}
            style={secondaryActionButtonStyle}
            type="button">
            {analyzeProgress
              ? `Analyzing ${analyzeProgress.current}/${analyzeProgress.total}...`
              : "Analyze all"}
          </button>
          <button
            data-testid="popup-clear-all-action"
            disabled={!hasClearableBookmarks}
            onClick={() => void handleClearAllAnalysis()}
            style={secondaryActionButtonStyle}
            type="button">
            Clear all
          </button>
        </section>

        {/* Status/error feedback — inline text, not a card */}
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
        {statusTone === "success" ? (
          <p aria-live="polite" role="status" style={statusTextStyle}>{statusMessage}</p>
        ) : null}

        {/* Bookmark count label + list */}
        <section aria-labelledby="popup-library-title" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <h2 id="popup-library-title" style={libraryHeadingStyle}>
            Library
            <span style={bookmarkCountStyle}>{filteredBookmarks.length}</span>
          </h2>
          <BookmarkList bookmarks={displayedBookmarks} onDelete={handleDeleteBookmark} onAnalyze={handleAnalyzeBookmark} onClearAnalysis={handleClearAnalysis} onSelect={(id) => {
              const bm = bookmarks.find((b) => b.id === id) ?? null
              setSelectedBookmark(bm)
            }} />
        </section>

        {/* Primary action — sticky footer */}
        <footer style={stickyFooterStyle}>
          <button
            data-testid="popup-primary-action"
            disabled={isSaving || isAnalyzing}
            onClick={() => void handleSaveCurrentPage()}
            style={primaryActionButtonStyle}
            type="button">
            {isAnalyzing ? "Analyzing..." : isSaving ? "Saving..." : "Save current page"}
          </button>
        </footer>
      </div>
    </main>
    <BookmarkDrawer
      bookmark={selectedBookmark}
      onClose={() => setSelectedBookmark(null)}
      onAnalyze={async (id) => {
        setSelectedBookmark(null)
        await handleAnalyzeBookmark(id)
      }}
      onClearAnalysis={async (id) => {
        await handleClearAnalysis(id)
        setSelectedBookmark(null)
      }}
      onUpdateTags={handleUpdateTags}
    />
    </ThemeProvider>
  )
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function getSaveErrorMessage(error: unknown): string {
  const message = getErrorMessage(error, "Failed to save current page")

  if (message === "Active tab title is required" || message === "Active tab URL is required") {
    return "Current tab can't be saved because its title or URL is unavailable."
  }

  return message
}

export default Popup

const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0
}
