import React from "react"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type ErrorBannerProps = {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  const theme = useThemeContext()

  const bannerStyle: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: radius.medium,
    border: `1px solid ${theme.dangerSoft}`,
    backgroundColor: theme.dangerSoft,
    color: theme.textDanger
  }

  const titleStyle: React.CSSProperties = {
    margin: "0 0 4px 0",
    fontSize: "0.875rem",
    fontWeight: 600
  }

  const messageStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.8125rem",
    lineHeight: 1.5
  }

  return (
    <article data-feedback-kind="error" role="alert" style={bannerStyle}>
      <h3 style={titleStyle}>Error</h3>
      <p style={messageStyle}>{message}</p>
    </article>
  )
}
