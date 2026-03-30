import React, { useMemo, useState } from "react"

import { buildAnswerBlock } from "../../features/hybrid-retrieval/build-answer-block"
import { rankHybridResults } from "../../features/hybrid-retrieval/rank-hybrid-results"
import type { SearchDocument } from "../../features/hybrid-retrieval/search-documents"
import type { BookmarkRecord } from "../../types/bookmark"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type DashboardAskBoxProps = {
  bookmark: BookmarkRecord | null
}

export function DashboardAskBox({ bookmark }: DashboardAskBoxProps) {
  const theme = useThemeContext()
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
    if (!searchDocument || !query.trim()) {
      return
    }

    const results = rankHybridResults([searchDocument], query)
    const answer = buildAnswerBlock({ query, rankedResults: results })
    setAnswerText(answer.text)
  }

  return (
    <div data-testid="dashboard-ask-card" style={{ border: `1px solid ${theme.border}`, borderRadius: radius.xl, padding: "20px", backgroundColor: theme.page, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em", marginBottom: spacing.sm }}>
        ASK GHOSTREADER
      </div>
      <div style={{ position: "relative" }}>
        <input
          data-testid="dashboard-ask-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask Ghostreader about this bookmark..."
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
          →
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
