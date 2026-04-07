import React, { useMemo, useState } from "react"

import { getMessage } from "../../lib/i18n/messages"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage } from "../../types/settings"
import { useThemeContext } from "../../ui/theme-context"

const NAV_PLACEHOLDER_COPY: Record<DisplayLanguage, string> = {
  en: "Coming soon",
  zh: "\u5373\u5c06\u4e0a\u7ebf"
}

type DashboardNavigationMode = "all" | "recents" | "highlights"
type DashboardTagFilter = "frontend" | "ai"

type DashboardNavigationProps = {
  bookmarks: BookmarkRecord[]
  activeBookmarkId: string | null
  activeMode?: DashboardNavigationMode
  activeTagFilter?: DashboardTagFilter | null
  chromeTree?: chrome.bookmarks.BookmarkTreeNode[]
  language?: DisplayLanguage
  onOpenSettings?: () => void
  onSelect: (bookmark: BookmarkRecord) => void
  onSelectMode?: (mode: DashboardNavigationMode) => void
  onToggleTagFilter?: (tag: DashboardTagFilter) => void
  selectedFolderId?: string | null
  tagCounts?: Record<DashboardTagFilter, number>
  onSelectFolder?: (folderId: string) => void
  width: number
}

export function DashboardNavigation({
  activeMode = "all",
  activeTagFilter = null,
  chromeTree,
  language = "en",
  onOpenSettings,
  onSelectMode,
  onToggleTagFilter,
  onSelectFolder,
  selectedFolderId,
  tagCounts,
  width
}: DashboardNavigationProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const getPlaceholderTitle = (label: string) => `${label} - ${NAV_PLACEHOLDER_COPY[language]}`
  const placeholderButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    textAlign: "left",
    padding: "8px 12px",
    fontSize: "0.875rem",
    color: theme.textMuted,
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "8px",
    cursor: "not-allowed",
    opacity: 0.72
  }
  const buildNavigationButtonStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    textAlign: "left",
    padding: "8px 12px",
    fontSize: "0.875rem",
    fontWeight: active ? 500 : undefined,
    color: active ? theme.accent : theme.textMuted,
    backgroundColor: active ? theme.accentSoft : "transparent",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  })
  const isAllBookmarksActive = activeMode === "all" && !selectedFolderId

  return (
    <aside
      data-testid="dashboard-navigation"
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        backgroundColor: theme.surface,
        borderRight: `1px solid ${theme.border}`,
        boxShadow: "2px 0 8px rgba(0,0,0,0.02)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        flexShrink: 0
      }}
    >
      <div style={{ padding: "24px 24px 16px" }}>
        <h1
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: theme.textPrimary
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              backgroundColor: theme.accent,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
            }}
          />
          TabVault
        </h1>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: theme.textMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}
        >
          {t("dashboard.navigation.library")}
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "2px" }}>
          <li>
            <button
              aria-current={isAllBookmarksActive ? "page" : undefined}
              onClick={() => {
                onSelectMode?.("all")
                onSelectFolder?.("")
              }}
              style={buildNavigationButtonStyle(isAllBookmarksActive)}
              type="button"
            >
              <span aria-hidden="true">A</span> {t("dashboard.navigation.allBookmarks")}
            </button>
          </li>
          <li>
            <button
              aria-current={activeMode === "recents" ? "page" : undefined}
              data-testid="dashboard-nav-recents"
              onClick={() => onSelectMode?.("recents")}
              style={buildNavigationButtonStyle(activeMode === "recents")}
              type="button"
            >
              <span aria-hidden="true">R</span> {t("dashboard.navigation.recents")}
            </button>
          </li>
          <li>
            <button
              aria-current={activeMode === "highlights" ? "page" : undefined}
              data-testid="dashboard-nav-highlights"
              onClick={() => onSelectMode?.("highlights")}
              style={buildNavigationButtonStyle(activeMode === "highlights")}
              type="button"
            >
              <span aria-hidden="true">H</span> {t("dashboard.navigation.highlights")}
            </button>
          </li>
        </ul>

        {chromeTree && chromeTree.length > 0 ? (
          <div data-testid="dashboard-folder-tree" style={{ marginTop: "28px" }}>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                color: theme.textMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase"
              }}
            >
              {t("dashboard.navigation.folders")}
            </p>
            <FolderList
              nodes={chromeTree}
              onSelectFolder={onSelectFolder}
              selectedFolderId={selectedFolderId ?? null}
            />
          </div>
        ) : null}

        <div style={{ marginTop: "28px" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: theme.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase"
            }}
          >
            {t("dashboard.navigation.tags")}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "2px" }}>
            <li>
              <button
                data-testid="dashboard-tag-frontend"
                disabled={(tagCounts?.frontend ?? 0) === 0}
                onClick={() => onToggleTagFilter?.("frontend")}
                style={{
                  ...(tagCounts?.frontend ?? 0) === 0
                    ? { ...placeholderButtonStyle, justifyContent: "space-between" }
                    : { ...buildNavigationButtonStyle(activeTagFilter === "frontend"), justifyContent: "space-between" }
                }}
                title={(tagCounts?.frontend ?? 0) === 0 ? getPlaceholderTitle(t("dashboard.navigation.tagFrontend")) : undefined}
                type="button"
              >
                <span>{t("dashboard.navigation.tagFrontend")}</span>
                <span
                  style={{
                    fontSize: "0.625rem",
                    backgroundColor: theme.border,
                    padding: "2px 6px",
                    borderRadius: "999px"
                  }}
                >
                  {tagCounts?.frontend ?? 0}
                </span>
              </button>
            </li>
            <li>
              <button
                data-testid="dashboard-tag-ai"
                disabled={(tagCounts?.ai ?? 0) === 0}
                onClick={() => onToggleTagFilter?.("ai")}
                style={{
                  ...(tagCounts?.ai ?? 0) === 0
                    ? { ...placeholderButtonStyle, justifyContent: "space-between" }
                    : { ...buildNavigationButtonStyle(activeTagFilter === "ai"), justifyContent: "space-between" }
                }}
                title={(tagCounts?.ai ?? 0) === 0 ? getPlaceholderTitle(t("dashboard.navigation.tagAi")) : undefined}
                type="button"
              >
                <span>{t("dashboard.navigation.tagAi")}</span>
                <span
                  style={{
                    fontSize: "0.625rem",
                    backgroundColor: theme.border,
                    padding: "2px 6px",
                    borderRadius: "999px"
                  }}
                >
                  {tagCounts?.ai ?? 0}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div style={{ padding: "12px 16px", borderTop: `1px solid ${theme.border}` }}>
        <button
          data-testid="dashboard-nav-settings"
          onClick={() => onOpenSettings?.()}
          style={buildNavigationButtonStyle(false)}
          type="button"
        >
          <span aria-hidden="true">S</span>
          <span>{t("dashboard.navigation.settings")}</span>
        </button>
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
  const folders = nodes.filter((node) => !node.url)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginLeft: depth > 0 ? "12px" : 0 }}>
      {folders.map((folder) => {
        const isSelected = folder.id === selectedFolderId
        const childFolders = (folder.children ?? []).filter((child) => !child.url)
        const hasChildFolders = childFolders.length > 0
        return (
          <FolderTreeItem
            depth={depth}
            folder={folder}
            hasChildFolders={hasChildFolders}
            isSelected={isSelected}
            key={folder.id}
            onSelectFolder={onSelectFolder}
            selectedFolderId={selectedFolderId}
          />
        )
      })}
    </div>
  )
}

function FolderTreeItem({
  folder,
  selectedFolderId,
  onSelectFolder,
  isSelected,
  hasChildFolders,
  depth
}: {
  folder: chrome.bookmarks.BookmarkTreeNode
  selectedFolderId: string | null
  onSelectFolder?: (id: string) => void
  isSelected: boolean
  hasChildFolders: boolean
  depth: number
}) {
  const theme = useThemeContext()
  const childFolders = useMemo(() => (folder.children ?? []).filter((child) => !child.url), [folder.children])
  const shouldStartExpanded = useMemo(
    () => hasChildFolders && (depth === 0 || containsFolderId(childFolders, selectedFolderId)),
    [childFolders, depth, hasChildFolders, selectedFolderId]
  )
  const [isExpanded, setIsExpanded] = useState(shouldStartExpanded)

  return (
    <div>
      {folder.title ? (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            aria-label={isExpanded ? `Collapse ${folder.title}` : `Expand ${folder.title}`}
            data-testid={`dashboard-folder-toggle-${folder.id}`}
            disabled={!hasChildFolders}
            onClick={() => {
              if (!hasChildFolders) return
              setIsExpanded((current) => !current)
            }}
            style={{
              width: "24px",
              height: "24px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: hasChildFolders ? theme.page : "transparent",
              color: hasChildFolders ? theme.textMuted : "transparent",
              cursor: hasChildFolders ? "pointer" : "default",
              flexShrink: 0
            }}
            type="button"
          >
            {hasChildFolders ? (isExpanded ? "v" : ">") : "."}
          </button>
          <button
            aria-pressed={isSelected}
            data-testid={`dashboard-folder-${folder.id}`}
            onClick={() => onSelectFolder?.(folder.id)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "6px 10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? theme.accent : theme.textMuted,
              backgroundColor: isSelected ? theme.accentSoft : "transparent",
              border: `1px solid ${isSelected ? theme.borderFocus : "transparent"}`
            }}
            type="button"
          >
            {folder.title}
          </button>
        </div>
      ) : null}
      {isExpanded && folder.children && folder.children.length > 0 ? (
        <FolderList
          depth={depth + (folder.title ? 1 : 0)}
          nodes={folder.children}
          onSelectFolder={onSelectFolder}
          selectedFolderId={selectedFolderId}
        />
      ) : null}
    </div>
  )
}

function containsFolderId(nodes: chrome.bookmarks.BookmarkTreeNode[], folderId: string | null): boolean {
  if (!folderId) return false

  for (const node of nodes) {
    if (node.id === folderId) return true
    if (containsFolderId((node.children ?? []).filter((child) => !child.url), folderId)) {
      return true
    }
  }

  return false
}
