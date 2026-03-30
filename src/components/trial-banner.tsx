import React from "react"

import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

export type TrialBannerProps = {
  status: "trial" | "expired"
  title?: string
  message: string
  detail?: string
  ctaLabel: string
  onCtaClick?: () => void
}

const DEFAULT_TITLES: Record<TrialBannerProps["status"], string> = {
  trial: "Trial active",
  expired: "Trial expired"
}

export function TrialBanner({ status, title, message, detail, ctaLabel, onCtaClick }: TrialBannerProps) {
  const theme = useThemeContext()

  const resolvedTitle = title ?? DEFAULT_TITLES[status]
  const isClickable = typeof onCtaClick === "function"

  const statusPalette =
    status === "trial"
      ? { background: theme.successSoft, text: theme.textSuccess }
      : { background: theme.dangerSoft, text: theme.textDanger }

  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: radius.large,
    border: `1px solid ${statusPalette.background}`,
    backgroundColor: statusPalette.background
  }

  const contentStyle: React.CSSProperties = {
    minWidth: 0,
    display: "grid",
    gap: spacing.xs,
    flex: "1 1 auto"
  }

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.875rem",
    fontWeight: 600,
    color: statusPalette.text
  }

  const messageStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.8125rem",
    lineHeight: 1.4,
    color: theme.textPrimary
  }

  const detailStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.75rem",
    lineHeight: 1.4,
    color: theme.textSecondary
  }

  const ctaStyle: React.CSSProperties = {
    flexShrink: 0,
    border: "none",
    borderRadius: radius.medium,
    padding: `6px ${spacing.md}`,
    backgroundColor: theme.accent,
    color: theme.surface,
    fontSize: "0.8125rem",
    fontWeight: 600,
    cursor: isClickable ? "pointer" : "not-allowed",
    opacity: isClickable ? 1 : 0.6
  }

  return (
    <section data-testid="trial-banner" data-trial-status={status} style={containerStyle}>
      <div style={contentStyle}>
        <h3 style={titleStyle}>{resolvedTitle}</h3>
        <p style={messageStyle}>{message}</p>
        {detail ? <p style={detailStyle}>{detail}</p> : null}
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
