import React, { useEffect, useMemo, useState } from "react"
import { BookmarkList } from "./components/bookmark-list"
import { ErrorBanner } from "./components/error-banner"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { searchBookmarks } from "./features/bookmarks/search-bookmarks"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import type { AiProvider } from "./lib/providers/provider"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import { getBrowserName } from "./lib/utils/browser"
import type { BookmarkRecord } from "./types/bookmark"
import type { ProviderConfig } from "./types/settings"
import { colors, controls, GLOBAL_FOCUS_STYLES, radius, shadow, spacing } from "./ui/design-tokens"

type SidePanelProps = {
  services?: Partial<SidePanelServices>
}

type SidePanelServices = {
  bookmarkRepository: BookmarkRepository
  settingsRepository: SettingsRepository
  analyzeBookmark: typeof defaultAnalyzeBookmark
  createProvider: (config: ProviderConfig) => AiProvider
}

const DEFAULT_SIDEPANEL_SERVICES: SidePanelServices = {
  bookmarkRepository: new IndexedDbBookmarkRepository(),
  settingsRepository: new ChromeSettingsRepository(),
  analyzeBookmark: defaultAnalyzeBookmark,
  createProvider: defaultCreateProvider
}

export default function SidePanel({ services }: SidePanelProps) {
  const sidePanelServices = useMemo(() => ({ ...DEFAULT_SIDEPANEL_SERVICES, ...services }), [services])
  const [status, setStatus] = useState<string>("")
  const [isImporting, setIsImporting] = useState(false)
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null)

  const filteredBookmarks = useMemo(
    () => searchBookmarks(bookmarks, searchQuery),
    [bookmarks, searchQuery]
  )

  const hasPendingBookmarks = bookmarks.some(
    (b) => b.status === "saved" || b.status === "error"
  )

  const browserName = useMemo(() => getBrowserName(), [])

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

  // Listen for background updates
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "IMPORT_COMPLETE" || message.type === "ANALYSIS_COMPLETE") {
        setAnalyzeProgress(null)
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

  async function loadBookmarks(): Promise<void> {
    setIsLoadingBookmarks(true)
    try {
      const savedBookmarks = await sidePanelServices.bookmarkRepository.list()
      setBookmarks(savedBookmarks)
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

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>TabVault Pro</h1>
        <p style={subtitleStyle}>Manage and search your library.</p>
      </header>

      <div style={contentStyle}>
        <div style={searchBarStyle}>
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

        <div style={actionsRowStyle}>
          <button
            disabled={!hasPendingBookmarks || analyzeProgress !== null}
            onClick={() => void handleAnalyzeAll()}
            style={secondaryActionButtonStyle}
            type="button">
            {analyzeProgress
              ? `Analyzing ${analyzeProgress.current}/${analyzeProgress.total}...`
              : "Analyze all"}
          </button>
        </div>

        {errorMessage && <div style={errorContainerStyle}><ErrorBanner message={errorMessage} /></div>}
        {status && <p style={statusStyle}>{status}</p>}

        <section aria-labelledby="sidepanel-library-title" style={librarySectionStyle}>
          <h2 id="sidepanel-library-title" style={libraryHeadingStyle}>
            Library
            <span style={bookmarkCountStyle}>{filteredBookmarks.length}</span>
          </h2>
          {isLoadingBookmarks ? (
            <p style={loadingTextStyle}>Loading bookmarks...</p>
          ) : (
            <BookmarkList
              bookmarks={filteredBookmarks}
              compact={true}
              onDelete={handleDeleteBookmark}
              onAnalyze={handleAnalyzeBookmark}
            />
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
  )
}

const pageStyle: React.CSSProperties = {
  backgroundColor: colors.page,
  minHeight: "100vh",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column"
}

const headerStyle: React.CSSProperties = {
  padding: `${spacing.lg} ${spacing.lg} ${spacing.md}`,
  borderBottom: `1px solid ${colors.borderMuted}`
}

const titleStyle: React.CSSProperties = {
  margin: "0 0 4px 0",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: colors.textPrimary
}

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.textMuted,
  fontSize: "0.875rem"
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0
}

const searchBarStyle: React.CSSProperties = {
  padding: `${spacing.md} ${spacing.lg} ${spacing.sm}`
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

const errorContainerStyle: React.CSSProperties = {
  padding: `0 ${spacing.lg}`
}

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing.sm,
  padding: `0 ${spacing.lg} ${spacing.sm}`
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
  padding: `${spacing.md} ${spacing.lg}`,
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

const loadingTextStyle: React.CSSProperties = {
  padding: `0 ${spacing.lg}`,
  fontSize: "0.875rem",
  color: colors.textMuted
}

const footerStyle: React.CSSProperties = {
  padding: spacing.lg,
  borderTop: `1px solid ${colors.borderMuted}`,
  backgroundColor: colors.page,
  boxShadow: shadow.soft
}

const importButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: `${spacing.sm} ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.primary.background,
  color: controls.primary.foreground,
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer"
}

const statusStyle: React.CSSProperties = {
  margin: `0 ${spacing.lg} ${spacing.sm}`,
  fontSize: "0.8125rem",
  color: colors.textSuccess
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
