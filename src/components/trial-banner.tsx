import React from "react"

import type { DisplayLanguage } from "../types/settings"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

export type TrialBannerProps = {
  status: "trial" | "expired"
  language?: DisplayLanguage
  title?: string
  message: string
  detail?: string
  ctaLabel: string
  onCtaClick?: () => void
}

const DEFAULT_TITLES: Record<DisplayLanguage, Record<TrialBannerProps["status"], string>> = {
  en: {
    trial: "Trial active",
    expired: "Trial expired"
  },
  zh: {
    trial: "\u8bd5\u7528\u4e2d",
    expired: "\u8bd5\u7528\u5df2\u7ed3\u675f"
  }
}

export function TrialBanner({ status, language = "en", title, message, detail, ctaLabel, onCtaClick }: TrialBannerProps) {
  const theme = useThemeContext()

  const resolvedTitle = title ?? DEFAULT_TITLES[language][status]
  const isClickable = typeof onCtaClick === "function"
  const titleId = `trial-banner-title-${status}`

  const statusPalette =
    status === "trial"
      ? { title: theme.accent, border: "rgba(107, 142, 115, 0.3)" }
      : { title: theme.textDanger, border: "rgba(239, 68, 68, 0.24)" }

  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: "16px",
    borderRadius: "12px",
    border: `1px solid ${statusPalette.border}`,
    backgroundColor: theme.surface,
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
  }

  const contentStyle: React.CSSProperties = {
    minWidth: 0,
    display: "grid",
    gap: "4px",
    flex: "1 1 auto"
  }

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.875rem",
    fontWeight: 600,
    color: statusPalette.title
  }

  const messageStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.75rem",
    lineHeight: 1.5,
    color: theme.textMuted
  }

  const ctaStyle: React.CSSProperties = {
    flexShrink: 0,
    border: "none",
    borderRadius: "8px",
    padding: `6px ${spacing.md}`,
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: isClickable ? "pointer" : "not-allowed",
    opacity: isClickable ? 1 : 0.6
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid="trial-banner"
      data-trial-status={status}
      style={containerStyle}
    >
      <div style={contentStyle}>
        <h3 id={titleId} style={titleStyle}>{resolvedTitle}</h3>
        <p style={messageStyle}>{detail ?? message}</p>
      </div>
      <button
        data-testid="trial-banner-cta"
        disabled={!isClickable}
        onClick={onCtaClick}
        style={ctaStyle}
        type="button"
      >
        {ctaLabel}
      </button>
    </section>
  )
}
