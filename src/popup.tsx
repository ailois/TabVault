import React, { useEffect, useMemo, useState } from "react"

import { ErrorBanner } from "./components/error-banner"
import { BookmarkList } from "./components/bookmark-list"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { saveCurrentPage as defaultSaveCurrentPage } from "./features/bookmarks/save-current-page"
import { searchBookmarks } from "./features/bookmarks/search-bookmarks"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { extractPage as defaultExtractPage } from "./lib/extraction/extract-page"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import type { AiProvider } from "./lib/providers/provider"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import type { BookmarkRecord } from "./types/bookmark"
import type { ProviderConfig } from "./types/settings"
import { colors, controls, GLOBAL_FOCUS_STYLES, radius, shadow, spacing } from "./ui/design-tokens"

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
  createProvider: defaultCreateProvider
}

function Popup({ services }: PopupProps) {
  const popupServices = useMemo(() => ({ ...DEFAULT_POPUP_SERVICES, ...services }), [services])
  const [statusMessage, setStatusMessage] = useState("Ready to save the current page.")
  const [statusTone, setStatusTone] = useState<"info" | "success">("info")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true)
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null)

  const filteredBookmarks = useMemo(
    () => searchBookmarks(bookmarks, searchQuery),
    [bookmarks, searchQuery]
  )

  const hasPendingBookmarks = bookmarks.some(
    (b) => b.status === "saved" || b.status === "error"
  )

  useEffect(() => {
    void loadBookmarks()
  }, [])

  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = GLOBAL_FOCUS_STYLES
    document.head.appendChild(style)

    return () => {
      style.remove()
    }
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

    if (!bookmark) {
      return
    }

    try {
      await popupServices.analyzeBookmark({
        bookmark,
        provider: popupServices.createProvider(selectedProvider),
        bookmarkRepository: popupServices.bookmarkRepository
      })
      await loadBookmarks()
    } catch {
      // Error is written to bookmark record by analyzeBookmark; reload to show updated status
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

  return (
    <main aria-labelledby="popup-title" style={pageStyle}>
      <div data-testid="popup-shell" style={shellStyle}>
        {/* Search bar — always at top */}
        <div style={searchBarStyle}>
          <label htmlFor="bookmark-search" style={visuallyHiddenStyle}>Search bookmarks</label>
          <input
            id="bookmark-search"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, URL, summary, tags..."
            style={searchInputStyle}
            type="search"
            value={searchQuery}
          />
        </div>

        {/* Secondary actions row */}
        <section aria-labelledby="popup-actions-title" style={actionsRowStyle}>
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
        </section>

        {/* Status/error feedback — inline text, not a card */}
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
        {statusTone === "success" ? (
          <p aria-live="polite" role="status" style={statusTextStyle}>{statusMessage}</p>
        ) : null}

        {/* Bookmark count label + list */}
        <section aria-labelledby="popup-library-title" style={librarySectionStyle}>
          <h2 id="popup-library-title" style={libraryHeadingStyle}>
            Library
            <span style={bookmarkCountStyle}>{filteredBookmarks.length}</span>
          </h2>
          <BookmarkList bookmarks={filteredBookmarks} onDelete={handleDeleteBookmark} onAnalyze={handleAnalyzeBookmark} />
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

const pageStyle: React.CSSProperties = {
  width: "400px",
  height: "560px",
  overflow: "hidden",
  backgroundColor: colors.page,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column"
}

const shellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: colors.page
}

const searchBarStyle: React.CSSProperties = {
  padding: `${spacing.md} ${spacing.md} ${spacing.sm}`
}

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "none",
  borderBottom: `1px solid ${colors.borderMuted}`,
  borderRadius: 0,
  backgroundColor: "transparent",
  color: colors.textPrimary,
  fontSize: "0.9375rem"
}

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing.sm,
  padding: `0 ${spacing.md} ${spacing.sm}`
}

const secondaryActionButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  border: "none",
  borderRadius: radius.pill,
  backgroundColor: controls.secondary.background,
  color: colors.textMuted,
  fontSize: "0.8125rem",
  fontWeight: 500,
  cursor: "pointer"
}

const statusTextStyle: React.CSSProperties = {
  margin: `0 ${spacing.md}`,
  fontSize: "0.8125rem",
  color: colors.textSuccess,
  padding: `0 0 ${spacing.xs}`
}

const librarySectionStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  minHeight: 0
}

const libraryHeadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  margin: 0,
  padding: `${spacing.xs} ${spacing.md}`,
  fontSize: "0.75rem",
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em"
}

const bookmarkCountStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1px 6px",
  borderRadius: radius.pill,
  backgroundColor: colors.surfaceMuted,
  fontSize: "0.7rem",
  fontWeight: 600,
  color: colors.textMuted
}

const stickyFooterStyle: React.CSSProperties = {
  padding: spacing.md,
  borderTop: `1px solid ${colors.borderMuted}`,
  backgroundColor: colors.page,
  boxShadow: shadow.soft
}

const primaryActionButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: `${spacing.sm} ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.primary.background,
  color: controls.primary.foreground,
  fontWeight: 600,
  fontSize: "0.9375rem",
  cursor: "pointer"
}

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
