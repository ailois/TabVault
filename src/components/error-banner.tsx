import React from "react"
import type { DisplayLanguage } from "../types/settings"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type ErrorBannerProps = {
  message: string
  language?: DisplayLanguage
}

const ERROR_BANNER_COPY: Record<DisplayLanguage, string> = {
  en: "Error",
  zh: "\u9519\u8bef"
}

export function ErrorBanner({ message, language = "en" }: ErrorBannerProps) {
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
      <h3 style={titleStyle}>{ERROR_BANNER_COPY[language]}</h3>
      <p style={messageStyle}>{message}</p>
    </article>
  )
}
