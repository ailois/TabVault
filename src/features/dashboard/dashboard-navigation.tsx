import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { useThemeContext } from "../../ui/theme-context"
import { collectBookmarksWithFolderContext, findDefaultFolderId, matchesSearch } from "./bookmark-workspace"

type DashboardNavigationProps = {
  bookmarks: BookmarkRecord[]
  activeBookmarkId: string | null
  onSelect: (bookmark: BookmarkRecord) => void
  chromeTree?: chrome.bookmarks.BookmarkTreeNode[]
  selectedFolderId?: string | null
  onSelectFolder?: (folderId: string) => void
  width: number
}

export function DashboardNavigation({ activeBookmarkId, onSelect, chromeTree, selectedFolderId, onSelectFolder }: DashboardNavigationProps) {
  const theme = useThemeContext()

  const accent = theme.accent
  const accentSoft = theme.accentSoft

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
      {/* Logo */}
      <div style={{ padding: "24px 24px 16px" }}>
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "10px", color: theme.textPrimary }}>
          <span style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "6px", backgroundColor: accent, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }} />
          TabVault
        </h1>
      </div>

      {/* 知识库分组 */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          知识库 (Library)
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
                color: !selectedFolderId ? accent : theme.textMuted,
                backgroundColor: !selectedFolderId ? accentSoft : "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
              type="button"
            >
              <span>📚</span> 全部收藏
            </button>
          </li>
          <li>
            <button
              style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
              type="button"
            >
              <span>📝</span> 我的笔记
            </button>
          </li>
          <li>
            <button
              style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
              type="button"
            >
              <span>⭐</span> 星标内容
            </button>
          </li>
        </ul>

        {/* 浏览器文件夹 */}
        {chromeTree && chromeTree.length > 0 ? (
          <div data-testid="dashboard-folder-tree" style={{ marginTop: "28px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              书签文件夹
            </p>
            <FolderList
              nodes={chromeTree}
              onSelectFolder={onSelectFolder}
              selectedFolderId={selectedFolderId ?? null}
            />
          </div>
        ) : null}

        {/* Tags */}
        <div style={{ marginTop: "28px" }}>
          <p style={{ margin: "0 0 12px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            智能标签 (Tags)
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "2px" }}>
            <li>
              <button
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
                type="button"
              >
                <span># 前端工程化</span>
                <span style={{ fontSize: "0.625rem", backgroundColor: theme.border, padding: "2px 6px", borderRadius: "999px" }}>12</span>
              </button>
            </li>
            <li>
              <button
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
                type="button"
              >
                <span># AI 教程</span>
                <span style={{ fontSize: "0.625rem", backgroundColor: theme.border, padding: "2px 6px", borderRadius: "999px" }}>8</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* 底部 settings 入口 */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${theme.border}` }}>
        <button
          style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: "0.875rem", color: theme.textMuted, backgroundColor: "transparent", border: "none", borderRadius: "8px", cursor: "pointer" }}
          type="button"
        >
          ⚙️ 架构设置
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
