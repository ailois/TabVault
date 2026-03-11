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

  async function handleAnalyzeAll(): Promise<void> {
    const pending = bookmarks.filter(
      (b) => b.status === "saved" || b.status === "error"
    )

    if (pending.length === 0) {
      return
    }

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

    for (let i = 0; i < pending.length; i++) {
      const bookmark = pending[i]!
      setAnalyzeProgress({ current: i + 1, total: pending.length })
      setStatusMessage(`Analyzing ${i + 1}/${pending.length}...`)
      setStatusTone("info")

      try {
        await popupServices.analyzeBookmark({
          bookmark,
          provider: popupServices.createProvider(selectedProvider),
          bookmarkRepository: popupServices.bookmarkRepository
        })
      } catch {
        // Error written to bookmark record; continue with next
      }

      await loadBookmarks()
    }

    setAnalyzeProgress(null)
    setStatusMessage("Ready to save the current page.")
    setStatusTone("info")
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
        <header style={{ marginBottom: spacing.xs }}>
          <h1 id="popup-title">TabVault</h1>
          <p>Save and search your local bookmark library.</p>
        </header>
        <section aria-labelledby="popup-actions-title" style={actionsSectionStyle}>
          <h2 id="popup-actions-title" style={visuallyHiddenStyle}>Actions</h2>
          <button
              data-testid="popup-primary-action"
              disabled={isSaving || isAnalyzing}
              onClick={() => void handleSaveCurrentPage()}
              style={primaryActionButtonStyle}
              type="button">
              {isAnalyzing ? "Analyzing..." : isSaving ? "Saving..." : "Save current page"}
            </button>
            <button
              data-testid="popup-secondary-action"
              disabled={isLoadingBookmarks || isSaving || isAnalyzing}
              onClick={() => void loadBookmarks()}
              style={secondaryActionButtonStyle}
              type="button">
              {isLoadingBookmarks ? "Loading bookmarks..." : "Reload bookmarks"}
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
        <section aria-labelledby="popup-feedback-title" style={feedbackSectionStyle}>
          <h2 id="popup-feedback-title" style={visuallyHiddenStyle}>Feedback</h2>
          <article data-feedback-kind="status" data-tone={statusTone} style={getStatusCardStyle(statusTone)}>
            <p aria-live="polite" role="status">
              {statusMessage}
            </p>
          </article>
          {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
        </section>
        <section aria-labelledby="popup-library-title" style={librarySectionStyle}>
          <h2 id="popup-library-title">Library</h2>
          <div>
            <label htmlFor="bookmark-search">Search bookmarks</label>
            <input
              id="bookmark-search"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title, URL, summary, tags"
              style={searchInputStyle}
              type="search"
              value={searchQuery}
            />
          </div>
          <p>{filteredBookmarks.length} bookmark(s)</p>
          <BookmarkList bookmarks={filteredBookmarks} onDelete={handleDeleteBookmark} onAnalyze={handleAnalyzeBookmark} />
        </section>
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
  padding: spacing.md,
  backgroundColor: colors.page,
  boxSizing: "border-box"
}

const shellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  gap: spacing.sm,
  backgroundColor: colors.page
}

const actionsSectionStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm,
  padding: `${spacing.sm} ${spacing.md}`,
  border: `1px solid ${controls.input.border}`,
  borderRadius: radius.large,
  backgroundColor: colors.surfaceElevated,
  boxShadow: shadow.soft
}

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm
}

const actionButtonStyle: React.CSSProperties = {
  padding: `${spacing.sm} ${spacing.md}`,
  border: "none",
  borderRadius: radius.pill,
  fontWeight: 600,
  cursor: "pointer"
}

const primaryActionButtonStyle: React.CSSProperties = {
  ...actionButtonStyle,
  backgroundColor: controls.primary.background,
  color: controls.primary.foreground
}

const secondaryActionButtonStyle: React.CSSProperties = {
  ...actionButtonStyle,
  backgroundColor: controls.secondary.background,
  color: controls.secondary.foreground
}

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: `1px solid ${controls.input.border}`,
  borderRadius: radius.medium,
  backgroundColor: controls.input.background,
  color: colors.textPrimary
}

const feedbackSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.sm
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

const librarySectionStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  minHeight: 0,
  display: "grid",
  gap: spacing.sm
}

function getStatusCardStyle(statusTone: "info" | "success"): React.CSSProperties {
  return {
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${statusTone === "success" ? colors.borderStrong : colors.borderMuted}`,
    borderRadius: radius.medium,
    backgroundColor: colors.surface
  }
}
