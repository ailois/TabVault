import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type DashboardNavigationProps = {
  bookmarks: BookmarkRecord[]
  activeBookmarkId: string | null
  onSelect: (bookmark: BookmarkRecord) => void
}

export function DashboardNavigation({ bookmarks, activeBookmarkId, onSelect }: DashboardNavigationProps) {
  const theme = useThemeContext()

  return (
    <aside
      data-testid="dashboard-navigation"
      style={{
        width: "256px",
        borderRight: `1px solid ${theme.border}`,
        backgroundColor: theme.surface,
        padding: spacing.md,
        boxSizing: "border-box",
        overflowY: "auto"
      }}
    >
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em", marginBottom: spacing.sm }}>
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
                borderRadius: radius.medium,
                backgroundColor: selected ? theme.accentSoft : theme.surface,
                color: selected ? theme.accent : theme.textPrimary,
                padding: `${spacing.sm} ${spacing.sm}`,
                cursor: "pointer",
                fontSize: "0.875rem"
              }}
              type="button"
            >
              {bookmark.title}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
