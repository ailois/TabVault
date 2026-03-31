import React, { useEffect, useMemo, useState } from "react"

import { IndexedDbBookmarkRepository } from "../../lib/storage/indexeddb-bookmark-repository"
import { updateBookmarkMetadata } from "../../lib/storage/update-bookmark-metadata"
import type { BookmarkRecord } from "../../types/bookmark"
import { useThemeContext } from "../../ui/theme-context"
import { collectBookmarksWithFolderContext, findDefaultFolderId } from "./bookmark-workspace"
import { DashboardAiSidebar } from "./dashboard-ai-sidebar"
import { DashboardNavigation } from "./dashboard-navigation"
import { DashboardReadingPane } from "./dashboard-reading-pane"

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
  const [activeBookmark, setActiveBookmark] = useState<BookmarkRecord | null>(null)
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(360)

  useEffect(() => {
    if (initialBookmarks !== undefined) return

    const loadBookmarks = listBookmarks ?? (() => bookmarkRepository.list())
    const loadTree = getBookmarkTree ?? (() => (typeof chrome !== "undefined" && chrome.bookmarks ? chrome.bookmarks.getTree() : Promise.resolve([])))

    void Promise.all([loadBookmarks(), loadTree()]).then(([records, tree]) => {
      setBookmarks(records)
      setChromeTree(tree)
    })
  }, [bookmarkRepository, getBookmarkTree, initialBookmarks, initialTree, listBookmarks])

  // When tree is provided but no folder selected, pick the first folder
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

  // Derive visible bookmarks: if tree provided, use folder-scoped; else show all
  const visibleBookmarks = useMemo(() => {
    if (chromeTree.length === 0) {
      return bookmarks
    }
    const allItems = collectBookmarksWithFolderContext(chromeTree)
    const folderItems = selectedFolderId ? allItems.filter((item) => item.folderId === selectedFolderId) : allItems
    return folderItems.map((item) => metadataMap[item.url]).filter(Boolean) as BookmarkRecord[]
  }, [chromeTree, selectedFolderId, bookmarks, metadataMap])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const nextLeftWidth = Math.min(420, Math.max(220, event.clientX))
      const nextRightWidth = Math.min(480, Math.max(280, window.innerWidth - event.clientX))

      if (document.body.dataset.dashboardResize === "left") {
        setLeftWidth(nextLeftWidth)
      }

      if (document.body.dataset.dashboardResize === "right") {
        setRightWidth(nextRightWidth)
      }
    }

    const handlePointerUp = () => {
      delete document.body.dataset.dashboardResize
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [])

  function startResize(side: "left" | "right") {
    document.body.dataset.dashboardResize = side
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

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
      <DashboardNavigation
        activeBookmarkId={activeBookmark?.id ?? null}
        bookmarks={visibleBookmarks}
        chromeTree={chromeTree}
        onSelect={setActiveBookmark}
        onSelectFolder={setSelectedFolderId}
        selectedFolderId={selectedFolderId}
        width={leftWidth}
      />
      <div
        data-testid="dashboard-resize-left"
        onPointerDown={() => startResize("left")}
        style={{
          width: "6px",
          cursor: "col-resize",
          backgroundColor: theme.page,
          borderRight: `1px solid ${theme.border}`,
          flexShrink: 0,
          position: "relative"
        }}
      >
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "2px", width: "2px", backgroundColor: theme.border }} />
      </div>
      <DashboardReadingPane bookmark={activeBookmark} />
      <div
        data-testid="dashboard-resize-right"
        onPointerDown={() => startResize("right")}
        style={{
          width: "6px",
          cursor: "col-resize",
          backgroundColor: theme.page,
          borderLeft: `1px solid ${theme.border}`,
          flexShrink: 0,
          position: "relative"
        }}
      >
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "2px", width: "2px", backgroundColor: theme.border }} />
      </div>
      <DashboardAiSidebar
        bookmark={activeBookmark}
        onSaveSummary={handleSaveSummary}
        onSaveTags={handleSaveTags}
        width={rightWidth}
      />
    </div>
  )
}
