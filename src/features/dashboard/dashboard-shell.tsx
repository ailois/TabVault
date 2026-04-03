import React, { useEffect, useMemo, useState } from "react"

import { IndexedDbBookmarkRepository } from "../../lib/storage/indexeddb-bookmark-repository"
import { updateBookmarkMetadata } from "../../lib/storage/update-bookmark-metadata"
import type { BookmarkRecord } from "../../types/bookmark"
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
}

export function DashboardShell({ initialBookmarks, initialTree, listBookmarks, getBookmarkTree, updateBookmark }: DashboardShellProps) {
  const theme = useThemeContext()
  const bookmarkRepository = useMemo(() => new IndexedDbBookmarkRepository(), [])
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>(initialBookmarks ?? [])
  const [chromeTree, setChromeTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>(initialTree ?? [])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeBookmark, setActiveBookmark] = useState<BookmarkRecord | null>(null)

  useEffect(() => {
    if (initialBookmarks !== undefined) return

    const loadBookmarks = listBookmarks ?? (() => bookmarkRepository.list())
    const loadTree = getBookmarkTree ?? (() => (typeof chrome !== "undefined" && chrome.bookmarks ? chrome.bookmarks.getTree() : Promise.resolve([])))

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

  const metadataMap = useMemo(() => {
    const map: Record<string, BookmarkRecord> = {}
    for (const bm of bookmarks) map[bm.url] = bm
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

    return folderItems.filter((bm) =>
      matchesSearch(
        { id: bm.id, title: bm.title, url: bm.url, folderId: null, folderTitle: "" },
        searchQuery,
        metadataMap
      )
    )
  }, [chromeTree, selectedFolderId, bookmarks, metadataMap, searchQuery])

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
    setBookmarks((prev) => prev.map((bookmark) => bookmark.id === nextBookmark.id ? nextBookmark : bookmark))
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
    setBookmarks((prev) => prev.map((bookmark) => bookmark.id === nextBookmark.id ? nextBookmark : bookmark))
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
      {/* 左栏：知识库导航 */}
      <DashboardNavigation
        activeBookmarkId={activeBookmark?.id ?? null}
        bookmarks={bookmarks}
        chromeTree={chromeTree}
        onSelect={setActiveBookmark}
        onSelectFolder={(folderId) => setSelectedFolderId(folderId || null)}
        selectedFolderId={selectedFolderId}
        width={256}
      />

      {/* 中栏：搜索 + 结果列表 */}
      <div data-testid="dashboard-browse-view" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <DashboardResultsList
          activeUrl={activeBookmark?.url ?? null}
          bookmarks={visibleBookmarks}
          onSearchQueryChange={setSearchQuery}
          onSelectUrl={(url) => {
            const bm = bookmarks.find((b) => b.url === url) ?? null
            setActiveBookmark(bm)
          }}
          searchQuery={searchQuery}
        />

        {/* 右栏：阅读区（标题 + tab + 内容） */}
        <DashboardReadingPane
          bookmark={activeBookmark}
          onSaveSummary={handleSaveSummary}
          onSaveTags={handleSaveTags}
        />
      </div>

      {/* 隐藏保留：批量编辑区（暂未实现） */}
      <div data-testid="dashboard-bulk-edit-view" style={{ display: "none" }}>
        批量编辑工作台
      </div>
    </div>
  )
}
