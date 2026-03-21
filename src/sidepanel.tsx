import React, { useCallback, useEffect, useMemo, useState } from "react"
import { BookmarkList } from "./components/bookmark-list"
import { BookmarkTree } from "./components/bookmark-tree"
import { BookmarkDrawer } from "./components/bookmark-drawer"
import { ErrorBanner } from "./components/error-banner"
import { LicenseActivation } from "./components/license-activation"
import { TrialBanner } from "./components/trial-banner"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { searchBookmarks, searchBookmarksWithReasons, type SearchMode } from "./features/bookmarks/search-bookmarks"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import type { AiProvider } from "./lib/providers/provider"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import { getBrowserName } from "./lib/utils/browser"
import { validateLicenseKey } from "./lib/trial/license-service"
import { TrialRepository } from "./lib/trial/trial-repository"
import { useTrialStatus } from "./lib/trial/use-trial-status"
import type { BookmarkRecord } from "./types/bookmark"
import type { ProviderConfig } from "./types/settings"
import { buildGlobalStyles, radius, spacing } from "./ui/design-tokens"
import { useTheme } from "./ui/use-theme"
import { useGlobalStyles } from "./ui/use-global-styles"
import { ThemeProvider } from "./ui/theme-context"

type SidePanelProps = {
  services?: Partial<SidePanelServices>
}

type SidePanelServices = {
  bookmarkRepository: BookmarkRepository
  settingsRepository: SettingsRepository
  themeRepository: ThemeRepository
  analyzeBookmark: typeof defaultAnalyzeBookmark
  createProvider: (config: ProviderConfig) => AiProvider
}

const DEFAULT_SIDEPANEL_SERVICES: SidePanelServices = {
  bookmarkRepository: new IndexedDbBookmarkRepository(),
  settingsRepository: new ChromeSettingsRepository(),
  themeRepository: new ChromeThemeRepository(),
  analyzeBookmark: defaultAnalyzeBookmark,
  createProvider: defaultCreateProvider
}

export default function SidePanel({ services }: SidePanelProps) {
  const sidePanelServices = useMemo(() => ({ ...DEFAULT_SIDEPANEL_SERVICES, ...services }), [services])
  const theme = useTheme(sidePanelServices.themeRepository)
  useGlobalStyles(theme)
  const trial = useTrialStatus()
  const trialRepository = useMemo(() => new TrialRepository(), [])
  const [isActivationExpanded, setIsActivationExpanded] = useState(false)
  const [licenseKeyInput, setLicenseKeyInput] = useState("")
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [isSubmittingLicense, setIsSubmittingLicense] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [isImporting, setIsImporting] = useState(false)
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMode, setSearchMode] = useState<SearchMode>("all")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null)
  const [bookmarkTree, setBookmarkTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>([])
  const [selectedBookmark, setSelectedBookmark] = useState<BookmarkRecord | null>(null)

  const filteredBookmarks = useMemo(
    () => searchBookmarks(bookmarks, searchQuery, searchMode),
    [bookmarks, searchQuery, searchMode]
  )

  const searchResultsWithReasons = useMemo(
    () => searchQuery.trim() ? searchBookmarksWithReasons(bookmarks, searchQuery) : [],
    [bookmarks, searchQuery]
  )

  const matchReasonMap = useMemo(
    () => Object.fromEntries(searchResultsWithReasons.map((r) => [r.bookmark.id, r.matchReason])),
    [searchResultsWithReasons]
  )

  const metadataMap = useMemo(
    () => bookmarks.reduce((acc, b) => ({ ...acc, [b.id]: b }), {} as Record<string, BookmarkRecord>),
    [bookmarks]
  )

  const hasPendingBookmarks = bookmarks.some(
    (b) => b.status === "saved" || b.status === "error"
  )

  const hasClearableBookmarks = bookmarks.some(
    (b) => b.status === "done" || b.status === "error" || b.status === "analyzing" || b.summary
  )

  const browserName = useMemo(() => getBrowserName(), [])

  useEffect(() => {
    void loadBookmarks()
  }, [])

  // Listen for background updates
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "IMPORT_COMPLETE" || message.type === "ANALYSIS_COMPLETE") {
        setAnalyzeProgress(null)
        void loadBookmarks()
      }
      if (message.type === "BOOKMARKS_CHANGED") {
        void loadBookmarks()
      }
      if (message.type === "ANALYSIS_PROGRESS") {
        setAnalyzeProgress({ current: message.current, total: message.total })
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

  const handleLicenseSubmit = useCallback(async () => {
    setLicenseError(null)
    setIsSubmittingLicense(true)

    try {
      const result = await validateLicenseKey(licenseKeyInput)

      if (result === "invalid") {
        setLicenseError("This license key is invalid.")
        return
      }

      if (result === "unvalidated") {
        setLicenseError("Could not validate right now. Try again shortly.")
        return
      }

      const existingState = (await trialRepository.get()) ?? {
        installedAt: new Date().toISOString(),
        analysisUsed: 0
      }

      await trialRepository.save({
        ...existingState,
        licenseKey: licenseKeyInput,
        licenseStatus: "valid",
        licenseValidatedAt: new Date().toISOString()
      })

      await trial.reload()
      setIsActivationExpanded(false)
    } catch {
      setLicenseError("Failed to save license state.")
    } finally {
      setIsSubmittingLicense(false)
    }
  }, [licenseKeyInput, trial, trialRepository])

  async function loadBookmarks(): Promise<void> {
    setIsLoadingBookmarks(true)
    try {
      const savedBookmarks = await sidePanelServices.bookmarkRepository.list()
      setBookmarks(savedBookmarks)
      if (globalThis.chrome?.bookmarks) {
        const tree = await chrome.bookmarks.getTree()
        setBookmarkTree(tree[0]?.children || tree)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load bookmarks")
    } finally {
      setIsLoadingBookmarks(false)
    }
  }

  async function handleDeleteBookmark(id: string): Promise<void> {
    try {
      await sidePanelServices.bookmarkRepository.delete(id)
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete bookmark")
    }
  }

  async function handleAnalyzeBookmark(id: string): Promise<void> {
    const settings = await sidePanelServices.settingsRepository.getAppSettings()
    const providers = await sidePanelServices.settingsRepository.getProviders()
    const selectedProvider = providers.find(
      (provider) => provider.enabled && provider.provider === settings.defaultProvider
    )

    if (!selectedProvider?.apiKey.trim()) {
      setErrorMessage("Add an API key in Settings to enable analysis.")
      return
    }

    const bookmark = bookmarks.find((b) => b.id === id)
    if (!bookmark) return

    try {
      await sidePanelServices.analyzeBookmark({
        bookmark,
        provider: sidePanelServices.createProvider(selectedProvider),
        bookmarkRepository: sidePanelServices.bookmarkRepository
      })
      await loadBookmarks()
    } catch {
      await loadBookmarks()
    }
  }

  async function handleClearAnalysis(id: string): Promise<void> {
    try {
      await sidePanelServices.bookmarkRepository.clearAnalysis(id)
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to clear analysis")
    }
  }

  async function handleUpdateTags(id: string, aiTags: string[], userTags: string[]): Promise<void> {
    const bookmark = bookmarks.find((b) => b.id === id)
    if (!bookmark) return
    try {
      await sidePanelServices.bookmarkRepository.update({ ...bookmark, aiTags, userTags, updatedAt: new Date().toISOString() })
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update tags")
    }
  }

  async function handleClearAllAnalysis(): Promise<void> {
    try {
      await sidePanelServices.bookmarkRepository.clearAllAnalysis()
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to clear all analysis")
    }
  }

  async function handleAnalyzeAll(): Promise<void> {
    if (!hasPendingBookmarks) return

    const settings = await sidePanelServices.settingsRepository.getAppSettings()
    const providers = await sidePanelServices.settingsRepository.getProviders()
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

  async function handleImport() {
    setIsImporting(true)
    setStatus("Importing...")
    setErrorMessage(null)

    globalThis.chrome?.runtime?.sendMessage({ type: "IMPORT_BOOKMARKS" }, (response: any) => {
      setIsImporting(false)
      if (response?.success) {
        setStatus(`Imported ${response.count} bookmarks`)
        void loadBookmarks()
      } else {
        setStatus("")
        setErrorMessage("Import failed")
      }
    })
  }

  const pageStyle: React.CSSProperties = {
    backgroundColor: theme.surface,
    minHeight: "100vh",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column"
  }

  const headerStyle: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.md}`,
    borderBottom: `1px solid ${theme.borderMuted}`,
    backgroundColor: theme.surfaceElevated,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  }

  const subtitleStyle: React.CSSProperties = {
    margin: 0,
    color: theme.textMuted,
    fontSize: "0.75rem"
  }

  const searchInputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    border: `1px solid ${theme.border}`,
    borderRadius: radius.medium,
    backgroundColor: theme.surface,
    color: theme.textPrimary,
    fontSize: "0.875rem",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
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

  const libraryHeadingStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    margin: 0,
    padding: `${spacing.md} ${spacing.lg}`,
    fontSize: "0.75rem",
    fontWeight: 600,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.05em"
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

  const loadingTextStyle: React.CSSProperties = {
    padding: `0 ${spacing.lg}`,
    fontSize: "0.875rem",
    color: theme.textMuted
  }

  const footerStyle: React.CSSProperties = {
    padding: spacing.lg,
    borderTop: `1px solid ${theme.borderMuted}`,
    backgroundColor: theme.surface,
    boxShadow: theme.shadow
  }

  const importButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}`,
    border: "none",
    borderRadius: "12px",
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(99,102,241,0.22)"
  }

  const statusStyle: React.CSSProperties = {
    margin: `0 ${spacing.lg} ${spacing.sm}`,
    fontSize: "0.8125rem",
    color: theme.textSuccess
  }

  return (
    <ThemeProvider theme={theme}>
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <div style={{ width: "28px", height: "28px", backgroundColor: theme.accent, borderRadius: radius.medium, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.875rem" }}>✦</div>
          <div>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: theme.textPrimary }}>TabVault Pro</span>
            <p style={subtitleStyle}>Manage and search your library.</p>
          </div>
        </div>
        <button
          aria-label={theme.isDark ? "Switch to light mode" : "Switch to dark mode"}
          data-testid="theme-toggle-button"
          onClick={() => theme.toggle()}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.125rem",
            color: theme.textMuted,
            padding: "4px",
            borderRadius: radius.small,
            lineHeight: 1
          }}
          type="button"
        >
          {theme.isDark ? "☀️" : "🌙"}
        </button>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: `${spacing.md} ${spacing.lg} ${spacing.sm}` }}>
          <label htmlFor="sidepanel-search" style={visuallyHiddenStyle}>Search bookmarks</label>
          <input
            id="sidepanel-search"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, URL, summary, tags..."
            style={searchInputStyle}
            type="search"
            value={searchQuery}
          />
        </div>

        {/* Search filter chips */}
        <div style={{ display: "flex", gap: spacing.xs, padding: `0 ${spacing.lg} ${spacing.xs}` }}>
          {(["all", "title", "tags", "url"] as const).map((mode) => (
            <button
              data-testid="search-chip"
              key={mode}
              onClick={() => setSearchMode(mode)}
              style={{
                padding: "3px 10px",
                border: searchMode === mode ? "none" : `1px solid ${theme.border}`,
                borderRadius: radius.pill,
                fontSize: "0.75rem",
                fontWeight: searchMode === mode ? 600 : 500,
                cursor: "pointer",
                backgroundColor: searchMode === mode ? theme.accent : theme.surface,
                color: searchMode === mode ? "#ffffff" : theme.textMuted,
                transition: "background-color 0.15s ease, color 0.15s ease"
              }}
              type="button"
            >
              {mode === "all" ? "All" : mode === "tags" ? "Tags" : mode === "url" ? "URL" : "Title"}
            </button>
          ))}
        </div>

        {(trial.status === "trial" || trial.status === "expired") ? (
          <div style={{ padding: `0 ${spacing.lg} ${spacing.sm}` }}>
            <TrialBanner
              ctaLabel={trial.status === "trial" ? "Activate now" : "Unlock TabVault"}
              message={
                trial.status === "trial"
                  ? "Try TabVault free for 3 days."
                  : "New AI analysis is locked until you activate TabVault."
              }
              onCtaClick={() => setIsActivationExpanded(true)}
              status={trial.status}
            />
            {isActivationExpanded ? (
              <div style={{ marginTop: spacing.sm }}>
                <LicenseActivation
                  errorMessage={licenseError}
                  isLicensed={false}
                  isSubmitting={isSubmittingLicense}
                  licenseKey={licenseKeyInput}
                  onLicenseKeyChange={setLicenseKeyInput}
                  onSubmit={handleLicenseSubmit}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: spacing.sm, padding: `0 ${spacing.lg} ${spacing.sm}` }}>
          <button
            disabled={!hasPendingBookmarks || analyzeProgress !== null}
            onClick={() => void handleAnalyzeAll()}
            style={secondaryActionButtonStyle}
            type="button">
            {analyzeProgress
              ? `Analyzing ${analyzeProgress.current}/${analyzeProgress.total}...`
              : "Analyze all"}
          </button>
          <button
            disabled={!hasClearableBookmarks}
            onClick={() => void handleClearAllAnalysis()}
            style={secondaryActionButtonStyle}
            type="button">
            Clear all
          </button>
        </div>

        {errorMessage && <div style={{ padding: `0 ${spacing.lg}` }}><ErrorBanner message={errorMessage} /></div>}
        {status && <p style={statusStyle}>{status}</p>}

        <section aria-labelledby="sidepanel-library-title" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <h2 id="sidepanel-library-title" style={libraryHeadingStyle}>
            Library
            <span style={bookmarkCountStyle}>{filteredBookmarks.length}</span>
          </h2>
          {isLoadingBookmarks ? (
            <p style={loadingTextStyle}>Loading bookmarks...</p>
          ) : searchQuery ? (
            <BookmarkList
              bookmarks={filteredBookmarks}
              compact={true}
              matchReasons={matchReasonMap}
              onDelete={handleDeleteBookmark}
              onAnalyze={handleAnalyzeBookmark}
              onClearAnalysis={handleClearAnalysis}
              onSelect={(id) => {
                const bookmark = bookmarks.find((b) => b.id === id) ?? null
                setSelectedBookmark(bookmark)
              }}
            />
          ) : (
            <>
              <div style={{ fontSize: "0.625rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em", padding: "8px 16px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                YOUR FOLDERS
              </div>
              <BookmarkTree
                treeNodes={bookmarkTree}
                metadataMap={metadataMap}
                onAnalyze={handleAnalyzeBookmark}
                onDelete={handleDeleteBookmark}
                onClearAnalysis={handleClearAnalysis}
                selectedUrl={selectedBookmark?.url ?? null}
                onSelect={(url) => {
                  const bookmark = bookmarks.find((b) => b.url === url) ?? null
                  setSelectedBookmark(bookmark)
                }}
              />
            </>
          )}
        </section>
      </div>

      <footer style={footerStyle}>
        <button
          disabled={isImporting}
          onClick={() => void handleImport()}
          style={importButtonStyle}
          type="button">
          {isImporting ? "Importing..." : `Import ${browserName} Bookmarks`}
        </button>
      </footer>
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
