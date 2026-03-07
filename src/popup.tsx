import React, { useEffect, useMemo, useState } from "react"

import { ErrorBanner } from "./components/error-banner"
import { BookmarkList } from "./components/bookmark-list"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { saveCurrentPage as defaultSaveCurrentPage } from "./features/bookmarks/save-current-page"
import { searchBookmarks } from "./features/bookmarks/search-bookmarks"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { extractPage as defaultExtractPage } from "./lib/extraction/extract-page"
import { OpenAiCompatibleProvider } from "./lib/providers/openai-compatible-provider"
import type { AiProvider } from "./lib/providers/provider"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import type { BookmarkRecord } from "./types/bookmark"
import type { ProviderConfig } from "./types/settings"

type PopupProps = {
  services?: PopupServices
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
  createProvider: (config) =>
    new OpenAiCompatibleProvider({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
      model: config.model
    })
}

function Popup({ services }: PopupProps) {
  const popupServices = useMemo(() => services ?? DEFAULT_POPUP_SERVICES, [services])
  const [statusMessage, setStatusMessage] = useState("Ready to save the current page.")
  const [statusTone, setStatusTone] = useState<"info" | "success">("info")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true)
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBookmarks = useMemo(
    () => searchBookmarks(bookmarks, searchQuery),
    [bookmarks, searchQuery]
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
      setErrorMessage(getErrorMessage(error, "Failed to save current page"))
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
    <main>
      <h1>TabVault</h1>
      <button disabled={isSaving || isAnalyzing} onClick={() => void handleSaveCurrentPage()} type="button">
        {isAnalyzing ? "Analyzing..." : isSaving ? "Saving..." : "Save current page"}
      </button>
      <button disabled={isLoadingBookmarks || isSaving || isAnalyzing} onClick={() => void loadBookmarks()} type="button">
        {isLoadingBookmarks ? "Loading bookmarks..." : "Reload bookmarks"}
      </button>
      <div>
        <label htmlFor="bookmark-search">Search bookmarks</label>
        <input
          id="bookmark-search"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search title, URL, summary, tags"
          type="search"
          value={searchQuery}
        />
      </div>
      <p data-tone={statusTone}>{statusMessage}</p>
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      <p>{filteredBookmarks.length} bookmark(s)</p>
      <BookmarkList bookmarks={filteredBookmarks} />
    </main>
  )
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export default Popup
