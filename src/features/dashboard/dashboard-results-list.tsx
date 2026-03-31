import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type DashboardResultsListProps = {
  bookmarks: BookmarkRecord[]
  activeUrl: string | null
  onSelectUrl: (url: string) => void
}

export function DashboardResultsList({ bookmarks, activeUrl, onSelectUrl }: DashboardResultsListProps) {
  const theme = useThemeContext()

  if (bookmarks.length === 0) {
    return (
      <div
        data-testid="dashboard-results-column"
        style={{ padding: spacing.md, color: theme.textMuted, fontSize: "0.875rem" }}
      >
        No bookmarks match your search.
      </div>
    )
  }

  return (
    <section
      data-testid="dashboard-results-column"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing.xs,
        padding: spacing.md,
        overflowY: "auto"
      }}
    >
      {bookmarks.map((bookmark) => {
        const selected = activeUrl === bookmark.url
        return (
          <button
            key={bookmark.id}
            data-testid="dashboard-result-button"
            onClick={() => onSelectUrl(bookmark.url)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: "14px",
              border: `1px solid ${selected ? theme.borderFocus : theme.border}`,
              backgroundColor: selected ? theme.accentSoft : theme.surfaceSubtle,
              color: theme.textPrimary,
              cursor: "pointer",
              fontSize: "0.875rem",
              lineHeight: 1.4
            }}
            type="button"
          >
            <div style={{ fontWeight: 600 }}>{bookmark.title}</div>
            <div style={{ fontSize: "0.75rem", color: theme.textMuted, marginTop: "2px" }}>{bookmark.url}</div>
            {bookmark.summary ? (
              <div style={{ fontSize: "0.75rem", color: theme.textMuted, marginTop: "2px" }}>{bookmark.summary}</div>
            ) : null}
          </button>
        )
      })}
    </section>
  )
}
