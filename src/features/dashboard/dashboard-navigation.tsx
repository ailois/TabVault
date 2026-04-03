import React from "react"

import { getMessage } from "../../lib/i18n/messages"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage } from "../../types/settings"
import { useThemeContext } from "../../ui/theme-context"

type DashboardNavigationProps = {
  bookmarks: BookmarkRecord[]
  activeBookmarkId: string | null
  chromeTree?: chrome.bookmarks.BookmarkTreeNode[]
  language?: DisplayLanguage
  onSelect: (bookmark: BookmarkRecord) => void
  selectedFolderId?: string | null
  onSelectFolder?: (folderId: string) => void
  width: number
}

export function DashboardNavigation({
  chromeTree,
  language = "en",
  onSelectFolder,
  selectedFolderId
}: DashboardNavigationProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)

  return (
    <aside
      data-testid="dashboard-navigation"
      style={{
        width: "256px",
        minWidth: "256px",
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
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "10px", color: theme.textPrimary }}>
          <span style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "6px", backgroundColor: theme.accent, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }} />
          TabVault
        </h1>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {t("dashboard.navigation.library")}
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "2px" }}>
          <li>
            <button
              aria-current={!selectedFolderId ? "page" : undefined}
              onClick={() => onSelectFolder?.("")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "0.875rem",
                fontWeight: !selectedFolderId ? 500 : undefined,
                color: !selectedFolderId ? theme.accent : theme.textMuted,
                backgroundColor: !selectedFolderId ? theme.accentSoft : "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
              type="button"
            >
              <span>A</span> {t("dashboard.navigation.allBookmarks")}
            </button>
          </li>
          <li>
            <button
              style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
              type="button"
            >
              <span>R</span> {t("dashboard.navigation.recents")}
            </button>
          </li>
          <li>
            <button
              style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
              type="button"
            >
              <span>H</span> {t("dashboard.navigation.highlights")}
            </button>
          </li>
        </ul>

        {chromeTree && chromeTree.length > 0 ? (
          <div data-testid="dashboard-folder-tree" style={{ marginTop: "28px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
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
          <p style={{ margin: "0 0 12px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {t("dashboard.navigation.tags")}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "2px" }}>
            <li>
              <button
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
                type="button"
              >
                <span>{t("dashboard.navigation.tagFrontend")}</span>
                <span style={{ fontSize: "0.625rem", backgroundColor: theme.border, padding: "2px 6px", borderRadius: "999px" }}>12</span>
              </button>
            </li>
            <li>
              <button
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
                type="button"
              >
                <span>{t("dashboard.navigation.tagAi")}</span>
                <span style={{ fontSize: "0.625rem", backgroundColor: theme.border, padding: "2px 6px", borderRadius: "999px" }}>8</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div style={{ padding: "12px 16px", borderTop: `1px solid ${theme.border}` }}>
        <button
          style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
          type="button"
        >
          S {t("dashboard.navigation.settings")}
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
  const theme = useThemeContext()
  const folders = nodes.filter((node) => !node.url)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginLeft: depth > 0 ? "12px" : 0 }}>
      {folders.map((folder) => {
        const isSelected = folder.id === selectedFolderId
        return (
          <div key={folder.id}>
            {folder.title ? (
              <div
                onClick={() => onSelectFolder?.(folder.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onSelectFolder?.(folder.id)
                }}
                role="button"
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? theme.accent : theme.textMuted,
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
