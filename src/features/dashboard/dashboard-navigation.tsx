import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type DashboardNavigationProps = {
  bookmarks: BookmarkRecord[]
  activeBookmarkId: string | null
  onSelect: (bookmark: BookmarkRecord) => void
  width: number
}

export function DashboardNavigation({ bookmarks, activeBookmarkId, onSelect, width }: DashboardNavigationProps) {
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
        flexShrink: 0
      }}
    >
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
    </aside>
  )
}
