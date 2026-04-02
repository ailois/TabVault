import React, { useEffect, useMemo, useState } from "react"

import { IndexedDbBookmarkRepository } from "../../lib/storage/indexeddb-bookmark-repository"
import { updateBookmarkMetadata } from "../../lib/storage/update-bookmark-metadata"
import type { BookmarkRecord } from "../../types/bookmark"
import { spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import { collectBookmarksWithFolderContext, findDefaultFolderId, matchesSearch } from "./bookmark-workspace"
import { DashboardAiSidebar } from "./dashboard-ai-sidebar"
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

  const isBulkEditMode = activeBookmark !== null

  return (
    <div
      data-testid="dashboard-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: theme.page,
        color: theme.textPrimary,
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <div
        style={{
          padding: `${spacing.sm} ${spacing.md}`,
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.surface,
          flexShrink: 0
        }}
      >
        <input
          data-testid="dashboard-search-input"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bookmarks..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: `${spacing.sm} ${spacing.md}`,
            border: `1px solid ${theme.border}`,
            borderRadius: "10px",
            backgroundColor: theme.surfaceSubtle,
            color: theme.textPrimary,
            fontSize: "0.875rem",
            outline: "none"
          }}
          type="text"
          value={searchQuery}
        />
      </div>

      <div data-testid="dashboard-browse-view" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <DashboardNavigation
          activeBookmarkId={activeBookmark?.id ?? null}
          bookmarks={[]}
          chromeTree={chromeTree}
          onSelect={setActiveBookmark}
          onSelectFolder={setSelectedFolderId}
          selectedFolderId={selectedFolderId}
          width={280}
        />
        <DashboardResultsList
          activeUrl={activeBookmark?.url ?? null}
          bookmarks={visibleBookmarks}
          onSelectUrl={(url) => {
            const bm = bookmarks.find((b) => b.url === url) ?? null
            setActiveBookmark(bm)
          }}
        />
        <DashboardReadingPane bookmark={activeBookmark} />
        <DashboardAiSidebar
          bookmark={activeBookmark}
          onSaveSummary={handleSaveSummary}
          onSaveTags={handleSaveTags}
          width={360}
        />
      </div>

      {isBulkEditMode ? (
        <div data-testid="dashboard-bulk-edit-view" style={{ display: "none" }}>
          批量编辑工作台
        </div>
      ) : null}
    </div>
  )
}
