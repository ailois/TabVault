import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type DashboardNavigationProps = {
  bookmarks: BookmarkRecord[]
  activeBookmarkId: string | null
  onSelect: (bookmark: BookmarkRecord) => void
  chromeTree?: chrome.bookmarks.BookmarkTreeNode[]
  selectedFolderId?: string | null
  onSelectFolder?: (folderId: string) => void
  width: number
}

export function DashboardNavigation({ bookmarks, activeBookmarkId, onSelect, chromeTree, selectedFolderId, onSelectFolder, width }: DashboardNavigationProps) {
  const theme = useThemeContext()

  return (
    <aside
      data-testid="dashboard-navigation"
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        borderRight: `1px solid ${theme.border}`,
        backgroundColor: theme.surface,
        padding: spacing.md,
        boxSizing: "border-box",
        overflowY: "auto",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: spacing.sm
      }}
    >
      {chromeTree && chromeTree.length > 0 ? (
        <div data-testid="dashboard-folder-tree">
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em", marginBottom: spacing.xs, padding: "4px 0" }}>
            FOLDERS
          </div>
          <FolderList
            nodes={chromeTree}
            onSelectFolder={onSelectFolder}
            selectedFolderId={selectedFolderId ?? null}
          />
        </div>
      ) : null}
      <div>
        <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em", marginBottom: spacing.sm, padding: "4px 0" }}>
          BOOKMARKS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
          {bookmarks.map((bookmark) => {
            const selected = bookmark.id === activeBookmarkId
            return (
              <button
                key={bookmark.id}
                onClick={() => onSelect(bookmark)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${selected ? theme.borderFocus : theme.border}`,
                  borderRadius: radius.large,
                  backgroundColor: selected ? theme.accentSoft : theme.surface,
                  color: selected ? theme.accent : theme.textPrimary,
                  padding: `${spacing.sm} 12px`,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  lineHeight: 1.4,
                  boxShadow: selected ? "0 2px 8px rgba(99,102,241,0.08)" : "none"
                }}
                type="button"
              >
                {bookmark.title}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

function FolderList({
  nodes,
  selectedFolderId,
  onSelectFolder,
  depth = 0
}: {
  nodes: chrome.bookmarks.BookmarkTreeNode[]
  selectedFolderId: string | null
  onSelectFolder?: (id: string) => void
  depth?: number
}) {
  const theme = useThemeContext()
  const folders = nodes.filter((n) => !n.url)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginLeft: depth > 0 ? "12px" : 0 }}>
      {folders.map((folder) => {
        const isSelected = folder.id === selectedFolderId
        return (
          <div key={folder.id}>
            {folder.title ? (
              <div
                onClick={() => onSelectFolder?.(folder.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectFolder?.(folder.id) }}
                role="button"
                style={{
                  padding: "6px 10px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? theme.accent : theme.textSecondary,
                  backgroundColor: isSelected ? theme.accentSoft : "transparent",
                  border: `1px solid ${isSelected ? theme.borderFocus : "transparent"}`
                }}
                tabIndex={0}
              >
                {folder.title}
              </div>
            ) : null}
            {folder.children && folder.children.length > 0 ? (
              <FolderList
                depth={depth + (folder.title ? 1 : 0)}
                nodes={folder.children}
                onSelectFolder={onSelectFolder}
                selectedFolderId={selectedFolderId}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

