import React, { useEffect, useMemo, useState } from "react"

import { ChromeSettingsRepository } from "../../lib/config/chrome-settings-repository"
import type { SettingsRepository } from "../../lib/config/settings-repository"
import { DEFAULT_APP_SETTINGS } from "../../features/settings/default-settings"
import { getMessage } from "../../lib/i18n/messages"
import { IndexedDbBookmarkRepository } from "../../lib/storage/indexeddb-bookmark-repository"
import { updateBookmarkMetadata } from "../../lib/storage/update-bookmark-metadata"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage } from "../../types/settings"
import { useThemeContext } from "../../ui/theme-context"
import { collectBookmarksWithFolderContext, findDefaultFolderId, matchesSearch } from "./bookmark-workspace"
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
}

export function DashboardShell({
  initialBookmarks,
  initialTree,
  listBookmarks,
  getBookmarkTree,
  updateBookmark,
  settingsRepository
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
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>(initialBookmarks ?? [])
  const [chromeTree, setChromeTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>(initialTree ?? [])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeBookmark, setActiveBookmark] = useState<BookmarkRecord | null>(null)
  const [displayLanguage, setDisplayLanguage] = useState<DisplayLanguage>("en")
  const [isSettingsReady, setIsSettingsReady] = useState(false)
  const t = useMemo(
    () => (key: Parameters<typeof getMessage>[1]) => getMessage(displayLanguage, key),
    [displayLanguage]
  )

  useEffect(() => {
    if (initialBookmarks !== undefined) return

    const loadBookmarks = listBookmarks ?? (() => bookmarkRepository.list())
    const loadTree =
      getBookmarkTree ??
      (() => (typeof chrome !== "undefined" && chrome.bookmarks ? chrome.bookmarks.getTree() : Promise.resolve([])))

    void Promise.all([loadBookmarks(), loadTree()]).then(([records, tree]) => {
      setBookmarks(records)
      setChromeTree(tree)
    })
  }, [bookmarkRepository, getBookmarkTree, initialBookmarks, listBookmarks])

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
    function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>) {
      const newValue = changes["appSettings"]?.newValue
      if (newValue && typeof newValue === "object" && "displayLanguage" in newValue) {
        const language = (newValue as { displayLanguage: unknown }).displayLanguage
        if (language === "en" || language === "zh") {
          setDisplayLanguage(language)
        }
      }
    }

    globalThis.chrome?.storage?.local?.onChanged?.addListener(handleStorageChange)
    return () => globalThis.chrome?.storage?.local?.onChanged?.removeListener(handleStorageChange)
  }, [])

  const metadataMap = useMemo(() => {
    const map: Record<string, BookmarkRecord> = {}
    for (const bookmark of bookmarks) map[bookmark.url] = bookmark
    return map
  }, [bookmarks])

  const visibleBookmarks = useMemo(() => {
    let folderItems: BookmarkRecord[]
    if (chromeTree.length === 0) {
      folderItems = bookmarks
    } else {
      const allItems = collectBookmarksWithFolderContext(chromeTree)
      const filtered = selectedFolderId ? allItems.filter((item) => item.folderId === selectedFolderId) : allItems
      folderItems = filtered.map((item) => metadataMap[item.url]).filter(Boolean) as BookmarkRecord[]
    }

    if (!searchQuery.trim()) return folderItems

    return folderItems.filter((bookmark) =>
      matchesSearch(
        { id: bookmark.id, title: bookmark.title, url: bookmark.url, folderId: null, folderTitle: "" },
        searchQuery,
        metadataMap
      )
    )
  }, [bookmarks, chromeTree, metadataMap, searchQuery, selectedFolderId])

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
        bookmarks={bookmarks}
        chromeTree={chromeTree}
        language={displayLanguage}
        onSelect={setActiveBookmark}
        onSelectFolder={(folderId) => setSelectedFolderId(folderId || null)}
        selectedFolderId={selectedFolderId}
        width={256}
      />

      <div data-testid="dashboard-browse-view" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {isSettingsReady ? (
          <>
            <DashboardResultsList
              activeUrl={activeBookmark?.url ?? null}
              bookmarks={visibleBookmarks}
              language={displayLanguage}
              onSearchQueryChange={setSearchQuery}
              onSelectUrl={(url) => {
                const bookmark = bookmarks.find((item) => item.url === url) ?? null
                setActiveBookmark(bookmark)
              }}
              searchQuery={searchQuery}
            />

            <DashboardReadingPane
              bookmark={activeBookmark}
              language={displayLanguage}
              onSaveSummary={handleSaveSummary}
              onSaveTags={handleSaveTags}
            />
          </>
        ) : null}
      </div>

      <div data-testid="dashboard-bulk-edit-view" style={{ display: "none" }}>
        {t("dashboard.bulkEdit.placeholder")}
      </div>
    </div>
  )
}
