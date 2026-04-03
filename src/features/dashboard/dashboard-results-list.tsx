import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type DashboardResultsListProps = {
  bookmarks: BookmarkRecord[]
  activeUrl: string | null
  onSelectUrl: (url: string) => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  heading?: string
}

export function DashboardResultsList({
  bookmarks,
  activeUrl,
  onSelectUrl,
  searchQuery,
  onSearchQueryChange,
  heading = "全部收藏"
}: DashboardResultsListProps) {
  const theme = useThemeContext()

  return (
    <section
      data-testid="dashboard-results-column"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "min(420px, 34vw)",
        minWidth: "360px",
        maxWidth: "520px",
        borderRight: `1px solid ${theme.border}`,
        backgroundColor: theme.page,
        boxSizing: "border-box"
      }}
    >
      <header style={{ padding: "24px 24px 12px", flexShrink: 0 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "1.25rem", fontWeight: 700, color: theme.textPrimary }}>{heading}</h2>
        <div style={{ position: "relative" }}>
          <input
            data-testid="dashboard-search-input"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="搜索标题、全文、标签或你的笔记..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 64px 12px 40px",
              border: `1px solid ${theme.border}`,
              borderRadius: "12px",
              backgroundColor: theme.surface,
              color: theme.textPrimary,
              fontSize: "0.875rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              outline: "none"
            }}
            type="text"
            value={searchQuery}
          />
          <span aria-hidden="true" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>
            🔍
          </span>
          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.625rem", color: theme.textMuted, border: `1px solid ${theme.border}`, padding: "2px 6px", borderRadius: "6px", backgroundColor: theme.page }}>
            ⌘ K
          </span>
        </div>
      </header>

      <div style={{ display: "grid", gap: "12px", overflowY: "auto", padding: "12px 24px 24px" }}>
        {bookmarks.length === 0 ? (
          <div style={{ padding: spacing.md, color: theme.textMuted, fontSize: "0.875rem" }}>
            No bookmarks match your search.
          </div>
        ) : null}

        {bookmarks.map((bookmark) => {
          const selected = activeUrl === bookmark.url
          const combinedTags = [...bookmark.aiTags, ...bookmark.userTags]

          return (
            <button
              key={bookmark.id}
              data-testid="dashboard-result-button"
              onClick={() => onSelectUrl(bookmark.url)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: selected ? "16px 16px 16px 20px" : "16px",
                borderRadius: "12px",
                border: `2px solid ${selected ? theme.accent : theme.border}`,
                backgroundColor: theme.surface,
                color: theme.textPrimary,
                cursor: "pointer",
                fontSize: "0.875rem",
                lineHeight: 1.4,
                boxShadow: selected ? "0 4px 12px rgba(107,142,115,0.08)" : "0 2px 4px rgba(0,0,0,0.02)",
                position: "relative"
              }}
              type="button"
            >
              {selected ? (
                <span aria-hidden="true" style={{ position: "absolute", left: 0, top: "12px", bottom: "12px", width: "4px", backgroundColor: theme.accent, borderRadius: "0 4px 4px 0" }} />
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
                <div style={{ fontWeight: selected ? 600 : 500, fontSize: "0.9375rem" }}>{bookmark.title}</div>
                <div style={{ color: selected ? "#FBBF24" : "#D0D6D1" }}>⭐</div>
              </div>
              <div style={{ fontSize: "0.75rem", color: theme.textMuted, marginTop: "6px" }}>
                {(bookmark.summary ?? bookmark.extractedText ?? "").slice(0, 120) || "暂无摘要"}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: "10px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", color: theme.textMuted, fontSize: "0.6875rem" }}>
                  <span>{new URL(bookmark.url).hostname}</span>
                  {combinedTags[0] ? <span style={{ width: "4px", height: "4px", borderRadius: "999px", backgroundColor: theme.border }} /> : null}
                  {combinedTags[0] ? <span style={{ backgroundColor: theme.accentSoft, color: theme.accent, padding: "2px 6px", borderRadius: "999px", fontWeight: 600 }}>#{combinedTags[0]}</span> : null}
                </div>
                <div style={{ fontSize: "0.625rem", color: theme.accent, backgroundColor: theme.accentSoft, padding: "2px 6px", borderRadius: "999px", fontWeight: 600 }}>
                  {bookmark.summary ? "💬 笔记" : "已保存"}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
