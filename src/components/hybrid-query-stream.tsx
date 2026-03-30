import React from "react"

import type { ActionCard } from "../features/hybrid-retrieval/build-action-cards"
import type { AnswerBlock } from "../features/hybrid-retrieval/build-answer-block"
import type { RankedHybridResult } from "../features/hybrid-retrieval/rank-hybrid-results"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

export function HybridQueryStream(input: {
  query: string
  rankedResults: RankedHybridResult[]
  actions: ActionCard[]
  answer?: AnswerBlock | null
  onOpenBookmark?: (bookmarkId: string) => void
  onAction?: (actionId: ActionCard["id"]) => void
}) {
  const theme = useThemeContext()
  const currentPageResults = input.rankedResults.filter((result) => result.document.sourceType === "current-page")
  const savedBookmarkResults = input.rankedResults.filter((result) => result.document.sourceType === "saved-bookmark")

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: "0.6875rem",
    fontWeight: 700,
    color: theme.textMuted,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    margin: 0
  }

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: radius.large,
    backgroundColor: theme.surface,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    padding: spacing.sm
  }

  return (
    <section aria-label="Hybrid query stream" style={{ display: "grid", gap: spacing.sm }}>
      <div
        style={{
          ...cardStyle,
          backgroundColor: theme.accentSoft,
          color: theme.textPrimary
        }}
      >
        <div style={{ fontSize: "0.75rem", color: theme.textMuted, marginBottom: "4px" }}>Query</div>
        <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{input.query}</div>
      </div>

      {currentPageResults.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.xs }}>
          <p style={sectionTitleStyle}>Current page match</p>
          {currentPageResults.map((result) => (
            <div
              data-testid="hybrid-result-card"
              key={`${result.document.url}-current`}
              style={cardStyle}
            >
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: theme.textPrimary }}>
                {result.document.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: theme.textMuted, marginTop: "4px" }}>
                Current page
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {savedBookmarkResults.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.xs }}>
          <p style={sectionTitleStyle}>Saved bookmarks</p>
          {savedBookmarkResults.map((result) => (
            <button
              data-testid="hybrid-result-card"
              key={result.document.bookmarkId}
              onClick={() => result.document.bookmarkId && input.onOpenBookmark?.(result.document.bookmarkId)}
              style={{
                ...cardStyle,
                cursor: "pointer",
                textAlign: "left"
              }}
              type="button"
            >
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: theme.textPrimary }}>
                {result.document.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: theme.textMuted, marginTop: "4px" }}>
                Saved bookmark
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {input.actions.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.xs }}>
          {input.actions.map((action) => (
            <button
              data-testid="hybrid-action-card"
              key={action.id}
              onClick={() => input.onAction?.(action.id)}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: radius.medium,
                backgroundColor: theme.surface,
                color: theme.textSecondary,
                padding: "6px 10px",
                fontSize: "0.75rem",
                cursor: "pointer"
              }}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {input.answer ? (
        <article
          data-testid="hybrid-answer-card"
          style={{
            ...cardStyle,
            borderRadius: radius.large,
            backgroundColor: theme.surfaceSubtle
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textPrimary, lineHeight: 1.5 }}>
            {input.answer.text}
          </p>
          {input.answer.citations.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm }}>
              {input.answer.citations.map((citation, index) => (
                <div
                  key={`${citation.sourceType}:${citation.url}:${citation.title}:${index}`}
                  style={{
                    fontSize: "0.6875rem",
                    color: theme.textMuted,
                    border: `1px solid ${theme.border}`,
                    borderRadius: radius.pill,
                    padding: "2px 8px",
                    backgroundColor: theme.surface
                  }}
                >
                  {citation.title}
                </div>
              ))}
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  )
}
