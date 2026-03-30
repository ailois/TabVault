import React from "react"

import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type HybridContextBarProps = {
  currentPageTitle?: string
  indexedBookmarkCount: number
}

export function HybridContextBar({ currentPageTitle, indexedBookmarkCount }: HybridContextBarProps) {
  const theme = useThemeContext()

  return (
    <section
      aria-label="Hybrid retrieval context"
      data-testid="hybrid-context-bar"
      style={{
        display: "grid",
        gap: spacing.xs,
        padding: spacing.sm,
        border: `1px solid ${theme.border}`,
        borderRadius: radius.large,
        backgroundColor: theme.surface,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}
    >
      <div style={{ fontSize: "0.75rem", color: theme.textMuted, fontWeight: 600 }}>
        Current page: {currentPageTitle ?? "Unavailable"}
      </div>
      <div style={{ fontSize: "0.75rem", color: theme.textSecondary }}>
        Library: {indexedBookmarkCount} bookmarks indexed
      </div>
      <div
        style={{
          fontSize: "0.6875rem",
          color: theme.accent,
          backgroundColor: theme.accentSoft,
          borderRadius: radius.pill,
          padding: "2px 8px",
          display: "inline-flex",
          width: "fit-content"
        }}
      >
        Hybrid local search enabled
      </div>
    </section>
  )
}
