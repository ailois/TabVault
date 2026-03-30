import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { radius, spacing } from "../../ui/design-tokens"
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
        boxSizing: "border-box",
        backgroundColor: theme.page
      }}
    >
      {!bookmark ? (
        <div
          data-testid="dashboard-reading-empty"
          style={{
            color: theme.textMuted,
            fontSize: "0.9375rem",
            border: `1px dashed ${theme.border}`,
            borderRadius: radius.xl,
            padding: "32px",
            backgroundColor: theme.surfaceSubtle
          }}
        >
          Select a bookmark to start reading
        </div>
      ) : (
        <article
          data-testid="dashboard-reading-card"
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: radius.xl,
            backgroundColor: theme.surface,
            padding: "32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            minHeight: "100%",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.75rem", color: theme.textPrimary, lineHeight: 1.2 }}>{bookmark.title}</h1>
          <div data-testid="dashboard-reading-metadata" style={{ marginTop: spacing.sm, color: theme.textMuted, fontSize: "0.75rem", paddingBottom: spacing.md, borderBottom: `1px solid ${theme.border}`, display: "flex", gap: spacing.md, flexWrap: "wrap" }}>
            <span>{bookmark.url}</span>
            <span>{bookmark.createdAt}</span>
          </div>
          <div style={{ marginTop: spacing.lg, color: theme.textSecondary, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {bookmark.extractedText ?? "No extracted text available."}
          </div>
          <div
            data-testid="dashboard-reading-fade"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "96px",
              background: `linear-gradient(to top, ${theme.surface}, transparent)`,
              pointerEvents: "none"
            }}
          />
        </article>
      )}
    </section>
  )
}
