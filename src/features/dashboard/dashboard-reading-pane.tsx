import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type DashboardReadingPaneProps = {
  bookmark: BookmarkRecord | null
}

export function DashboardReadingPane({ bookmark }: DashboardReadingPaneProps) {
  const theme = useThemeContext()

  return (
    <section
      data-testid="dashboard-reading-pane"
      style={{
        flex: 1,
        padding: "32px",
        overflowY: "auto",
        boxSizing: "border-box"
      }}
    >
      {!bookmark ? (
        <div style={{ color: theme.textMuted, fontSize: "0.9375rem" }}>
          Select a bookmark to start reading
        </div>
      ) : (
        <>
          <h1 style={{ margin: 0, fontSize: "1.75rem", color: theme.textPrimary }}>{bookmark.title}</h1>
          <div style={{ marginTop: spacing.sm, color: theme.textMuted, fontSize: "0.75rem" }}>
            {bookmark.url} · {bookmark.createdAt}
          </div>
          <div style={{ marginTop: spacing.lg, color: theme.textSecondary, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {bookmark.extractedText ?? "No extracted text available."}
          </div>
        </>
      )}
    </section>
  )
}
