import React, { useCallback, useEffect, useMemo, useState } from "react"

import type { GhostreaderBookmarkAddedPayload } from "../../features/ghostreader-session/ghostreader-bookmark-events"
import { isGhostreaderBookmarkAddedMessage } from "../../features/ghostreader-session/ghostreader-bookmark-events"
import { DEFAULT_APP_SETTINGS } from "../../features/settings/default-settings"
import { APP_SETTINGS_KEY, ChromeSettingsRepository } from "../../lib/config/chrome-settings-repository"
import type { SettingsRepository } from "../../lib/config/settings-repository"
import { getMessage } from "../../lib/i18n/messages"
import type { AiProvider } from "../../lib/providers/provider"
import { createProvider as defaultCreateProvider } from "../../lib/providers/provider-factory"
import { IndexedDbBookmarkRepository } from "../../lib/storage/indexeddb-bookmark-repository"
import { updateBookmarkMetadata } from "../../lib/storage/update-bookmark-metadata"
import { openSettingsPage } from "../../lib/utils/navigation"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage, ProviderConfig } from "../../types/settings"
import { useThemeContext } from "../../ui/theme-context"
import {
  collectBookmarksWithFolderContext,
  findDefaultFolderId,
  matchesFilterMode,
  matchesSearch,
  type BookmarkFilterMode
} from "./bookmark-workspace"
import { DashboardBulkEditPanel } from "./dashboard-bulk-edit-panel"
import { DashboardNavigation } from "./dashboard-navigation"
import { DashboardReadingPane } from "./dashboard-reading-pane"
import { DashboardResultsList } from "./dashboard-results-list"

type DashboardShellProps = {
  initialBookmarks?: BookmarkRecord[]
  initialTree?: chrome.bookmarks.BookmarkTreeNode[]
  listBookmarks?: () => Promise<BookmarkRecord[]>
  getBookmarkTree?: () => Promise<chrome.bookmarks.BookmarkTreeNode[]>
  updateBookmark?: (bookmark: BookmarkRecord) => Promise<void>
  settingsRepository?: SettingsRepository
  createProvider?: (config: ProviderConfig) => AiProvider
}

type AnalysisProgressState = {
  running: boolean
  current: number
  total: number
}

type DashboardNavigationMode = "all" | "recents" | "highlights"
type DashboardTagFilter = "frontend" | "ai"

export function DashboardShell({
  initialBookmarks,
  initialTree,
  listBookmarks,
  getBookmarkTree,
  updateBookmark,
  settingsRepository,
  createProvider = defaultCreateProvider
}: DashboardShellProps) {
  const theme = useThemeContext()
  const bookmarkRepository = useMemo(() => new IndexedDbBookmarkRepository(), [])
  const dashboardSettingsRepository = useMemo(
    () =>
      settingsRepository ??
      (typeof chrome !== "undefined" && chrome.storage?.sync
        ? new ChromeSettingsRepository()
        : {
            getAppSettings: async () => DEFAULT_APP_SETTINGS,
            saveAppSettings: async () => {},
            getProviders: async () => [],
            saveProviders: async () => {}
          }),
    [settingsRepository]
  )
  const loadBookmarksSource = useMemo(
    () =>
      listBookmarks ??
      (initialBookmarks !== undefined ? async () => initialBookmarks : () => bookmarkRepository.list()),
    [bookmarkRepository, initialBookmarks, listBookmarks]
  )
  const loadTreeSource = useMemo(
    () =>
      getBookmarkTree ??
      (initialTree !== undefined
        ? async () => initialTree
        : () => (typeof chrome !== "undefined" && chrome.bookmarks ? chrome.bookmarks.getTree() : Promise.resolve([]))),
    [getBookmarkTree, initialTree]
  )
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>(initialBookmarks ?? [])
  const [chromeTree, setChromeTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>(initialTree ?? [])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [navigationMode, setNavigationMode] = useState<DashboardNavigationMode>("all")
  const [activeTagFilter, setActiveTagFilter] = useState<DashboardTagFilter | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<BookmarkFilterMode>("all")
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<string[]>([])
  const [activeBookmark, setActiveBookmark] = useState<BookmarkRecord | null>(null)
  const [displayLanguage, setDisplayLanguage] = useState<DisplayLanguage>("en")
  const [isSettingsReady, setIsSettingsReady] = useState(false)
  const [analysisState, setAnalysisState] = useState<AnalysisProgressState>({ running: false, current: 0, total: 0 })
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [latestGhostreaderBookmarkEvent, setLatestGhostreaderBookmarkEvent] = useState<GhostreaderBookmarkAddedPayload | null>(null)
  const t = useMemo(
    () => (key: Parameters<typeof getMessage>[1]) => getMessage(displayLanguage, key),
    [displayLanguage]
  )

  const refreshBookmarkState = useCallback((records: BookmarkRecord[]) => {
    setBookmarks(records)
    setActiveBookmark((current) => (current ? records.find((bookmark) => bookmark.id === current.id) ?? null : null))
    setSelectedBookmarkIds((current) =>
      current.filter((bookmarkId) => records.some((bookmark) => bookmark.id === bookmarkId))
    )
  }, [])

  const reloadWorkspace = useCallback(async () => {
    const [records, tree] = await Promise.all([loadBookmarksSource(), loadTreeSource()])
    refreshBookmarkState(records)
    setChromeTree(tree)
  }, [loadBookmarksSource, loadTreeSource, refreshBookmarkState])

  useEffect(() => {
    if (initialBookmarks !== undefined && initialTree !== undefined) return
    void reloadWorkspace()
  }, [initialBookmarks, initialTree, reloadWorkspace])

  useEffect(() => {
    if (selectedFolderId !== null) return
    const defaultId = findDefaultFolderId(chromeTree)
    if (defaultId) setSelectedFolderId(defaultId)
  }, [chromeTree, selectedFolderId])

  useEffect(() => {
    void dashboardSettingsRepository
      .getAppSettings()
      .then((settings) => {
        setDisplayLanguage(settings.displayLanguage)
      })
      .finally(() => {
        setIsSettingsReady(true)
      })
  }, [dashboardSettingsRepository])

  useEffect(() => {
    function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>, areaName?: string) {
      if (areaName && areaName !== "sync") {
        return
      }

      const newValue = changes[APP_SETTINGS_KEY]?.newValue
      if (newValue && typeof newValue === "object" && "displayLanguage" in newValue) {
        const language = (newValue as { displayLanguage: unknown }).displayLanguage
        if (language === "en" || language === "zh") {
          setDisplayLanguage(language)
        }
      }
    }

    globalThis.chrome?.storage?.onChanged?.addListener(handleStorageChange)
    return () => globalThis.chrome?.storage?.onChanged?.removeListener(handleStorageChange)
  }, [])

  useEffect(() => {
    const sendMessage = globalThis.chrome?.runtime?.sendMessage
    if (!sendMessage) return

    void sendMessage({ type: "GET_ANALYSIS_STATUS" })
      .then((response: Partial<AnalysisProgressState> | undefined) => {
        if (!response) return
        setAnalysisState({
          running: Boolean(response.running),
          current: response.current ?? 0,
          total: response.total ?? 0
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const listener = (message: {
      type?: string
      current?: number
      total?: number
      bookmarkId?: string
      title?: string
      url?: string
      source?: "manual" | "page-save" | "session-action"
    }) => {
      if (isGhostreaderBookmarkAddedMessage(message)) {
        setLatestGhostreaderBookmarkEvent({
          bookmarkId: message.bookmarkId,
          title: message.title,
          url: message.url,
          source: message.source
        })
      }

      if (message.type === "IMPORT_COMPLETE" || message.type === "BOOKMARKS_CHANGED" || message.type === "ANALYSIS_COMPLETE") {
        if (message.type === "ANALYSIS_COMPLETE") {
          setAnalysisState({ running: false, current: 0, total: 0 })
        }
        void reloadWorkspace()
        return
      }

      if (message.type === "ANALYSIS_PROGRESS") {
        setAnalysisState({
          running: true,
          current: message.current ?? 0,
          total: message.total ?? 0
        })

        if (!message.bookmarkId) return

        setBookmarks((current) =>
          current.map((bookmark) =>
            bookmark.id === message.bookmarkId ? { ...bookmark, status: "analyzing" } : bookmark
          )
        )
        setActiveBookmark((current) =>
          current?.id === message.bookmarkId ? { ...current, status: "analyzing" } : current
        )
      }
    }

    globalThis.chrome?.runtime?.onMessage?.addListener(listener)
    return () => globalThis.chrome?.runtime?.onMessage?.removeListener(listener)
  }, [reloadWorkspace])

  const metadataMap = useMemo(() => {
    const map: Record<string, BookmarkRecord> = {}
    for (const bookmark of bookmarks) map[bookmark.url] = bookmark
    return map
  }, [bookmarks])

  const folderBookmarks = useMemo(() => {
    if (chromeTree.length === 0) {
      return bookmarks
    }

    const allItems = collectBookmarksWithFolderContext(chromeTree)
    const filtered = selectedFolderId ? allItems.filter((item) => item.folderId === selectedFolderId) : allItems
    return filtered.map((item) => metadataMap[item.url]).filter(Boolean) as BookmarkRecord[]
  }, [bookmarks, chromeTree, metadataMap, selectedFolderId])

  const navigationBookmarks = useMemo(() => {
    if (navigationMode === "recents") {
      return [...bookmarks].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    }

    if (navigationMode === "highlights") {
      return bookmarks.filter(
        (bookmark) =>
          Boolean(bookmark.summary?.trim()) ||
          Boolean(bookmark.userNotes?.trim()) ||
          bookmark.aiTags.length > 0 ||
          bookmark.userTags.length > 0
      )
    }

    return folderBookmarks
  }, [bookmarks, folderBookmarks, navigationMode])

  const tagCounts = useMemo(
    () => ({
      frontend: bookmarks.filter((bookmark) => matchesTagFilter(bookmark, "frontend")).length,
      ai: bookmarks.filter((bookmark) => matchesTagFilter(bookmark, "ai")).length
    }),
    [bookmarks]
  )

  const tagFilteredBookmarks = useMemo(() => {
    if (!activeTagFilter) {
      return navigationBookmarks
    }

    return navigationBookmarks.filter((bookmark) => matchesTagFilter(bookmark, activeTagFilter))
  }, [activeTagFilter, navigationBookmarks])

  const searchedBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return tagFilteredBookmarks

    return tagFilteredBookmarks.filter((bookmark) =>
      matchesSearch(
        { id: bookmark.id, title: bookmark.title, url: bookmark.url, folderId: null, folderTitle: "" },
        searchQuery,
        metadataMap
      )
    )
  }, [metadataMap, searchQuery, tagFilteredBookmarks])

  const visibleBookmarks = useMemo(
    () => searchedBookmarks.filter((bookmark) => matchesFilterMode(bookmark.url, filterMode, metadataMap)),
    [filterMode, metadataMap, searchedBookmarks]
  )
  const resultsHeading = useMemo(() => {
    if (activeTagFilter === "frontend") {
      return t("dashboard.navigation.tagFrontend")
    }

    if (activeTagFilter === "ai") {
      return t("dashboard.navigation.tagAi")
    }

    if (navigationMode === "recents") {
      return t("dashboard.navigation.recents")
    }

    if (navigationMode === "highlights") {
      return t("dashboard.navigation.highlights")
    }

    return t("dashboard.results.heading")
  }, [activeTagFilter, navigationMode, t])
  const analyzedCount = useMemo(
    () => searchedBookmarks.filter((bookmark) => bookmark.status === "done").length,
    [searchedBookmarks]
  )
  const pendingCount = useMemo(
    () => searchedBookmarks.filter((bookmark) => bookmark.status !== "done").length,
    [searchedBookmarks]
  )
  const selectedBookmarkIdSet = useMemo(() => new Set(selectedBookmarkIds), [selectedBookmarkIds])
  const selectedBookmarks = useMemo(
    () => bookmarks.filter((bookmark) => selectedBookmarkIdSet.has(bookmark.id)),
    [bookmarks, selectedBookmarkIdSet]
  )

  async function persistBookmark(nextBookmark: BookmarkRecord): Promise<void> {
    if (updateBookmark) {
      await updateBookmark(nextBookmark)
      return
    }

    await bookmarkRepository.update(nextBookmark)
  }

  async function handleSaveSummary(summary: string): Promise<void> {
    if (!activeBookmark) return

    const nextBookmark = updateBookmarkMetadata(activeBookmark, {
      summary,
      aiTags: activeBookmark.aiTags,
      userTags: activeBookmark.userTags
    })

    await persistBookmark(nextBookmark)
    setBookmarks((prev) => prev.map((bookmark) => (bookmark.id === nextBookmark.id ? nextBookmark : bookmark)))
    setActiveBookmark(nextBookmark)
  }

  async function handleSaveTags(aiTags: string[], userTags: string[]): Promise<void> {
    if (!activeBookmark) return

    const nextBookmark = updateBookmarkMetadata(activeBookmark, {
      summary: activeBookmark.summary,
      aiTags,
      userTags
    })

    await persistBookmark(nextBookmark)
    setBookmarks((prev) => prev.map((bookmark) => (bookmark.id === nextBookmark.id ? nextBookmark : bookmark)))
    setActiveBookmark(nextBookmark)
  }

  async function handleSaveNotes(userNotes: string): Promise<void> {
    if (!activeBookmark) return

    const nextBookmark = updateBookmarkMetadata(activeBookmark, {
      summary: activeBookmark.summary,
      aiTags: activeBookmark.aiTags,
      userTags: activeBookmark.userTags,
      userNotes
    })

    await persistBookmark(nextBookmark)
    setBookmarks((prev) => prev.map((bookmark) => (bookmark.id === nextBookmark.id ? nextBookmark : bookmark)))
    setActiveBookmark(nextBookmark)
  }

  async function handleBulkEdit(input: { notes: string; tags: string[] }): Promise<void> {
    const shouldUpdateNotes = input.notes.trim().length > 0
    const tagsToAppend = input.tags.filter(Boolean)

    if (selectedBookmarks.length === 0 || (!shouldUpdateNotes && tagsToAppend.length === 0)) {
      return
    }

    const nextBookmarks = selectedBookmarks.map((bookmark) => {
      const nextUserTags = Array.from(new Set([...bookmark.userTags, ...tagsToAppend]))

      return updateBookmarkMetadata(bookmark, {
        summary: bookmark.summary,
        aiTags: bookmark.aiTags,
        userTags: nextUserTags,
        userNotes: shouldUpdateNotes ? input.notes.trim() : bookmark.userNotes
      })
    })

    for (const bookmark of nextBookmarks) {
      await persistBookmark(bookmark)
    }

    setBookmarks((prev) =>
      prev.map((bookmark) => nextBookmarks.find((nextBookmark) => nextBookmark.id === bookmark.id) ?? bookmark)
    )
    setActiveBookmark((current) =>
      current ? nextBookmarks.find((bookmark) => bookmark.id === current.id) ?? current : current
    )
    setSelectedBookmarkIds([])
  }

  function toggleBookmarkSelection(bookmarkId: string) {
    setSelectedBookmarkIds((current) =>
      current.includes(bookmarkId) ? current.filter((id) => id !== bookmarkId) : [...current, bookmarkId]
    )
  }

  function selectVisibleBookmarks() {
    setSelectedBookmarkIds((current) => {
      const next = new Set(current)
      for (const bookmark of visibleBookmarks) {
        next.add(bookmark.id)
      }
      return Array.from(next)
    })
  }

  async function startAnalysis(message: { type: "ANALYZE_ALL" | "ANALYZE_PENDING" | "ANALYZE_BOOKMARKS"; bookmarkIds?: string[] }) {
    const sendMessage = globalThis.chrome?.runtime?.sendMessage
    if (!sendMessage) {
      setAnalysisError(t("sidepanel.error.analyzeFailed"))
      return false
    }

    setAnalysisError(null)

    const total =
      message.type === "ANALYZE_ALL"
        ? bookmarks.length
        : message.type === "ANALYZE_PENDING"
          ? bookmarks.filter((bookmark) => bookmark.status === "saved" || bookmark.status === "error").length
          : message.bookmarkIds?.length ?? 0

    if (total === 0) {
      setAnalysisState({ running: false, current: 0, total: 0 })
      return false
    }

    const response = await sendMessage(message).catch((error: unknown) => ({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }))

    if (response && typeof response === "object" && "success" in response && response.success === false) {
      setAnalysisError(typeof response.error === "string" ? response.error : t("sidepanel.error.analyzeFailed"))
      return false
    }

    setAnalysisState({
      running: true,
      current: 0,
      total
    })

    return true
  }

  return (
    <div
      data-testid="dashboard-shell"
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: theme.page,
        color: theme.textPrimary,
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <DashboardNavigation
        activeBookmarkId={activeBookmark?.id ?? null}
        activeMode={navigationMode}
        activeTagFilter={activeTagFilter}
        bookmarks={bookmarks}
        chromeTree={chromeTree}
        language={displayLanguage}
        onOpenSettings={() => {
          void openSettingsPage()
        }}
        onSelect={setActiveBookmark}
        onSelectMode={(mode) => {
          setNavigationMode(mode)
          if (mode === "all") {
            return
          }
          setSelectedFolderId(null)
        }}
        onToggleTagFilter={(tag) => {
          setActiveTagFilter((current) => (current === tag ? null : tag))
        }}
        onSelectFolder={(folderId) => setSelectedFolderId(folderId || null)}
        selectedFolderId={selectedFolderId}
        tagCounts={tagCounts}
        width={256}
      />

      <div data-testid="dashboard-browse-view" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {isSettingsReady ? (
          <>
            <DashboardResultsList
              activeUrl={activeBookmark?.url ?? null}
              analyzedCount={analyzedCount}
              analysisError={analysisError}
              analysisProgress={analysisState}
              bookmarks={visibleBookmarks}
              filterMode={filterMode}
              language={displayLanguage}
              heading={resultsHeading}
              onAnalyzeAll={() => {
                void startAnalysis({ type: "ANALYZE_ALL" })
              }}
              onAnalyzeSelected={() => {
                const ids = visibleBookmarks
                  .filter((bookmark) => selectedBookmarkIdSet.has(bookmark.id))
                  .map((bookmark) => bookmark.id)
                if (ids.length === 0) return
                void startAnalysis({ type: "ANALYZE_BOOKMARKS", bookmarkIds: ids }).then((started) => {
                  if (started) {
                    setSelectedBookmarkIds([])
                  }
                })
              }}
              onAnalyzeUnanalyzed={() => {
                void startAnalysis({ type: "ANALYZE_PENDING" })
              }}
              onClearSelection={() => setSelectedBookmarkIds([])}
              onFilterModeChange={setFilterMode}
              onSearchQueryChange={setSearchQuery}
              onSelectUrl={(url) => {
                const bookmark = bookmarks.find((item) => item.url === url) ?? null
                setActiveBookmark(bookmark)
              }}
              onSelectVisible={selectVisibleBookmarks}
              onToggleSelection={toggleBookmarkSelection}
              pendingCount={pendingCount}
              searchQuery={searchQuery}
              selectedBookmarkIds={selectedBookmarkIdSet}
            />

            {selectedBookmarks.length > 0 ? (
              <DashboardBulkEditPanel
                bookmarks={selectedBookmarks}
                language={displayLanguage}
                onApply={handleBulkEdit}
                onCancel={() => setSelectedBookmarkIds([])}
              />
            ) : (
              <DashboardReadingPane
                bookmark={activeBookmark}
                bookmarks={bookmarks}
                createProvider={createProvider}
                language={displayLanguage}
                onOpenBookmark={(bookmarkId) => {
                  const bookmark = bookmarks.find((item) => item.id === bookmarkId) ?? null
                  setActiveBookmark(bookmark)
                }}
                onSaveNotes={handleSaveNotes}
                onSaveSummary={handleSaveSummary}
                onSaveTags={handleSaveTags}
                settingsRepository={dashboardSettingsRepository}
                latestGhostreaderBookmarkEvent={latestGhostreaderBookmarkEvent}
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

function matchesTagFilter(bookmark: BookmarkRecord, tagFilter: DashboardTagFilter): boolean {
  const normalizedFilter = normalizeTag(tagFilter)
  return [...bookmark.aiTags, ...bookmark.userTags].some((tag) => normalizeTag(tag) === normalizedFilter)
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase()
}
