import React, { useMemo, useState } from "react"

import { rankHybridResults } from "../../features/hybrid-retrieval/rank-hybrid-results"
import type { SearchDocument } from "../../features/hybrid-retrieval/search-documents"
import { getMessage } from "../../lib/i18n/messages"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type DashboardAskBoxProps = {
  bookmark: BookmarkRecord | null
  language?: DisplayLanguage
}

function formatAnswer(language: DisplayLanguage, query: string, titles: string[]): string {
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)

  if (titles.length === 0) {
    return t("dashboard.ask.answer.none").replace("{query}", query)
  }

  return t("dashboard.ask.answer.found")
    .replace("{titles}", titles.join(", "))
    .replace("{query}", query)
}

export function DashboardAskBox({ bookmark, language = "en" }: DashboardAskBoxProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const [query, setQuery] = useState("")
  const [answerText, setAnswerText] = useState<string | null>(null)

  const searchDocument = useMemo<SearchDocument | null>(() => {
    if (!bookmark) return null

    const tagsText = [...bookmark.aiTags, ...bookmark.userTags].join(" ")
    const bodyText = bookmark.extractedText ?? ""
    const combinedText = [bookmark.title, bookmark.url, bookmark.summary ?? "", tagsText, bodyText]
      .filter(Boolean)
      .join(" ")

    return {
      sourceType: "saved-bookmark",
      bookmarkId: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      summary: bookmark.summary,
      tagsText,
      bodyText,
      combinedText,
      updatedAt: bookmark.updatedAt
    }
  }, [bookmark])

  function handleSubmit(): void {
    const trimmedQuery = query.trim()
    if (!searchDocument || !trimmedQuery) {
      return
    }

    const results = rankHybridResults([searchDocument], trimmedQuery)
    const titles = results.slice(0, 3).map((result) => result.document.title)
    setAnswerText(formatAnswer(language, trimmedQuery, titles))
  }

  return (
    <div data-testid="dashboard-ask-card" style={{ border: `1px solid ${theme.border}`, borderRadius: radius.xl, padding: "20px", backgroundColor: theme.page, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em", marginBottom: spacing.sm }}>
        {t("dashboard.ask.title")}
      </div>
      <div style={{ position: "relative" }}>
        <input
          aria-label={t("dashboard.ask.title")}
          data-testid="dashboard-ask-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("dashboard.ask.placeholder")}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 40px 10px 12px",
            border: `1px solid ${theme.border}`,
            borderRadius: radius.medium,
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            fontSize: "0.875rem"
          }}
          type="text"
          value={query}
        />
        <button
          aria-label={t("dashboard.ask.submit")}
          data-testid="dashboard-ask-submit"
          onClick={handleSubmit}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "28px",
            height: "28px",
            border: `1px solid ${theme.accent}`,
            borderRadius: radius.medium,
            backgroundColor: theme.accent,
            color: "#ffffff",
            cursor: "pointer"
          }}
          type="button"
        >
          {">"}
        </button>
      </div>
      {answerText ? (
        <div style={{ marginTop: spacing.sm, color: theme.textPrimary, fontSize: "0.875rem", lineHeight: 1.5 }}>
          {answerText}
        </div>
      ) : null}
    </div>
  )
}
