import React from "react"

import { getMessage } from "../lib/i18n/messages"
import type { DisplayLanguage } from "../types/settings"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type HybridContextBarProps = {
  currentPageTitle?: string
  indexedBookmarkCount: number
  language?: DisplayLanguage
}

export function HybridContextBar({ currentPageTitle, indexedBookmarkCount, language = "en" }: HybridContextBarProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)

  return (
    <section
      aria-label={t("hybrid.context.ariaLabel")}
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
        {t("hybrid.context.currentPage")}: {currentPageTitle ?? t("hybrid.context.unavailable")}
      </div>
      <div style={{ fontSize: "0.75rem", color: theme.textSecondary }}>
        {t("hybrid.context.library")}: {t("hybrid.context.indexed").replace("{count}", String(indexedBookmarkCount))}
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
        {t("hybrid.context.enabled")}
      </div>
    </section>
  )
}
