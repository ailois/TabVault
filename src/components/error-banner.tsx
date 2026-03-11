import React from "react"

import { radius, spacing } from "../ui/design-tokens"

type ErrorBannerProps = {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <article data-feedback-kind="error" role="alert" style={errorBannerStyle}>
      <h3 style={errorTitleStyle}>Error</h3>
      <p style={errorMessageStyle}>{message}</p>
    </article>
  )
}

const errorBannerStyle: React.CSSProperties = {
  padding: `${spacing.sm} ${spacing.md}`,
  borderRadius: radius.medium,
  backgroundColor: "#fef2f2",
  color: "#991b1b"
}

const errorTitleStyle: React.CSSProperties = {
  margin: "0 0 4px 0",
  fontSize: "0.875rem",
  fontWeight: 600
}

const errorMessageStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  lineHeight: 1.5
}
