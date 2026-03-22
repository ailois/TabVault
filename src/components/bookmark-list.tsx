import React, { useState } from "react"

import type { BookmarkRecord } from "../types/bookmark"
import { radius, spacing, typography } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"
import { LocalIcon } from "./local-icon"

type BookmarkListProps = {
  bookmarks: BookmarkRecord[]
  onDelete: (id: string) => Promise<void>
  onAnalyze: (id: string) => Promise<void>
  onClearAnalysis: (id: string) => Promise<void>
  onSelect?: (id: string) => void
  compact?: boolean
  matchReasons?: Record<string, string>
}

type BookmarkCardProps = {
  bookmark: BookmarkRecord
  onDelete: (id: string) => Promise<void>
  onAnalyze: (id: string) => Promise<void>
  onClearAnalysis: (id: string) => Promise<void>
  onSelect?: (id: string) => void
  compact?: boolean
  matchReason?: string
}

export function BookmarkList({
  bookmarks,
  onDelete,
  onAnalyze,
  onClearAnalysis,
  onSelect,
  compact = false,
  matchReasons = {}
}: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return (
      <section aria-label="Bookmark results">
        <p>No bookmarks found.</p>
      </section>
    )
  }

  return (
    <ul aria-label="Bookmark results" style={listStyle}>
      {bookmarks.map((bookmark) => (
        <li key={bookmark.id}>
          <BookmarkCard
            bookmark={bookmark}
            compact={compact}
            matchReason={matchReasons[bookmark.id]}
            onAnalyze={onAnalyze}
            onClearAnalysis={onClearAnalysis}
            onDelete={onDelete}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  )
}

function BookmarkCard({
  bookmark,
  onDelete,
  onAnalyze,
  onClearAnalysis,
  onSelect,
  compact = false,
  matchReason
}: BookmarkCardProps) {
  const theme = useThemeContext()
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const showAnalyzeButton = bookmark.status === "saved" || bookmark.status === "error"
  const showClearButton =
    bookmark.status === "done" || bookmark.status === "error" || bookmark.status === "analyzing"

  async function handleDelete(): Promise<void> {
    if (!window.confirm("Delete this bookmark?")) {
      return
    }

    await onDelete(bookmark.id)
  }

  const handleSelect = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault()
      onSelect(bookmark.id)
    }
  }

  if (compact) {
    return (
      <article
        data-bookmark-card="true"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...compactCardStyle,
          backgroundColor: hovered ? theme.surfaceHover : theme.surface
        }}
      >
        <div style={compactMainRowStyle}>
          <div style={compactStatusDotContainerStyle}>
            {bookmark.status === "analyzing" ? (
              <span
                data-testid="bookmark-analyzing-spinner"
                title="Analyzing"
                style={{
                  width: "8px",
                  height: "8px",
                  border: "2px solid #fde68a",
                  borderTopColor: "#d97706",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "tabvault-spin 0.7s linear infinite"
                }}
              />
            ) : null}
            {bookmark.status === "error" ? (
              <span style={{ ...dotBaseStyle, backgroundColor: theme.textDanger }} title="Error" />
            ) : null}
            {bookmark.status === "done" ? <span style={dotGreenStyle} title="Done" /> : null}
          </div>
          <LocalIcon url={bookmark.url} />
          <a
            href={bookmark.url}
            onClick={handleSelect}
            rel="noreferrer"
            style={{ ...compactTitleLinkStyle, color: theme.textPrimary }}
            target="_blank"
            title={bookmark.title}
          >
            {bookmark.title}
          </a>
          <span style={{ ...compactMetaStyle, color: theme.textMuted }}>
            {getBookmarkHost(bookmark.url)}
          </span>
          <div style={{ ...compactActionsStyle, opacity: hovered ? 1 : 0 }}>
            {showAnalyzeButton ? (
              <button
                aria-label={`Analyze ${bookmark.title}`}
                data-testid="bookmark-analyze-button"
                onClick={() => void onAnalyze(bookmark.id)}
                style={{ ...compactActionButtonStyle, color: theme.textMuted }}
                type="button"
              >
                Analyze
              </button>
            ) : null}
            {showClearButton ? (
              <button
                aria-label={`Clear analysis for ${bookmark.title}`}
                data-testid="bookmark-clear-button"
                onClick={() => void onClearAnalysis(bookmark.id)}
                style={{ ...compactActionButtonStyle, color: theme.textMuted }}
                type="button"
              >
                Clear
              </button>
            ) : null}
            <button
              aria-label={`Delete ${bookmark.title}`}
              data-testid="bookmark-delete-button"
              onClick={() => void handleDelete()}
              style={{ ...compactActionButtonStyle, color: theme.textMuted }}
              type="button"
            >
              X
            </button>
          </div>
        </div>
        {matchReason ? (
          <div style={{ paddingLeft: "8px", paddingBottom: "2px" }}>
            <span
              data-testid="match-reason-badge"
              style={{
                fontSize: "0.6875rem",
                padding: "1px 6px",
                borderRadius: radius.pill,
                backgroundColor: theme.accentSoft,
                color: theme.accent,
                display: "inline-block"
              }}
            >
              matched {matchReason}
            </span>
          </div>
        ) : null}
      </article>
    )
  }

  return (
    <article
      data-bookmark-card="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
        backgroundColor: theme.surface,
        border: `1px solid ${hovered ? theme.borderFocus : theme.border}`,
        borderRadius: "12px",
        boxShadow: hovered ? "0 4px 12px rgba(99,102,241,0.1)" : "0 1px 3px rgba(0,0,0,0.05)",
        margin: "0 8px 4px",
        position: "relative",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease"
      }}
    >
      <button
        aria-label={`Delete ${bookmark.title}`}
        data-testid="bookmark-delete-button"
        onClick={() => void handleDelete()}
        style={{
          ...deleteButtonStyle,
          color: theme.textMuted,
          position: "absolute",
          top: spacing.sm,
          right: spacing.sm,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.15s ease"
        }}
        type="button"
      >
        🗑️
      </button>

      <div style={cardBodyStyle}>
        {bookmark.status === "analyzing" ? (
          <div
            data-testid="bookmark-status-badge"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.6875rem", color: "#d97706", fontWeight: 500 }}
          >
            <span
              data-testid="bookmark-analyzing-spinner"
              style={{
                width: "10px",
                height: "10px",
                border: "2px solid #fde68a",
                borderTopColor: "#d97706",
                borderRadius: "50%",
                display: "inline-block",
                animation: "tabvault-spin 0.7s linear infinite"
              }}
            />
            Analyzing...
          </div>
        ) : null}
        {bookmark.status === "error" ? (
          <span
            data-testid="bookmark-status-badge"
            style={{ ...badgeStyle, backgroundColor: theme.dangerSoft, color: theme.textDanger }}
          >
            Error
          </span>
        ) : null}
        {showAnalyzeButton ? (
          <button
            aria-label={`Analyze ${bookmark.title}`}
            data-testid="bookmark-analyze-button"
            onClick={() => void onAnalyze(bookmark.id)}
            style={{ ...analyzeButtonStyle, color: theme.textMuted }}
            type="button"
          >
            Analyze
          </button>
        ) : null}
        {showClearButton ? (
          <button
            aria-label={`Clear analysis for ${bookmark.title}`}
            data-testid="bookmark-clear-button"
            onClick={() => void onClearAnalysis(bookmark.id)}
            style={{ ...analyzeButtonStyle, color: theme.textMuted }}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div style={titleRowStyle}>
        <LocalIcon url={bookmark.url} />
        <h3 style={titleStyle}>
          <a
            href={bookmark.url}
            onClick={handleSelect}
            rel="noreferrer"
            style={{ color: theme.textPrimary, textDecoration: "none" }}
            target="_blank"
          >
            {bookmark.title}
          </a>
        </h3>
      </div>


      <p data-testid="bookmark-metadata" style={{ ...metadataStyle, color: theme.textMuted }}>
        {formatMetadata(bookmark)}
      </p>

      {bookmark.summary ? (
        <>
          <p
            data-testid="bookmark-summary"
            style={expanded ? { ...summaryStyle, color: theme.textSecondary } : { ...summaryStyle, ...summaryCollapsedStyle, color: theme.textSecondary }}
          >
            {bookmark.summary}
          </p>
          <button
            data-testid="bookmark-summary-toggle"
            onClick={() => setExpanded((prev) => !prev)}
            style={{ ...summaryToggleStyle, color: theme.textMuted }}
            type="button"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </>
      ) : null}

      {(bookmark.aiTags.length > 0 || bookmark.userTags.length > 0) ? (
        <ul aria-label={`${bookmark.title} tags`} style={tagListStyle}>
          {bookmark.aiTags.map((tag) => (
            <li
              data-testid="bookmark-tag"
              key={`ai-${tag}`}
              style={{
                backgroundColor: theme.accentSoft,
                color: theme.accent,
                border: `1px solid ${theme.isDark ? "rgba(99,102,241,0.3)" : "#C7D2FE"}`,
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "0.625rem",
                fontWeight: 500
              }}
            >
              ✨ {tag}
            </li>
          ))}
          {bookmark.userTags.map((tag) => (
            <li
              data-testid="bookmark-tag"
              key={`user-${tag}`}
              style={{
                backgroundColor: theme.surfaceElevated,
                color: theme.textMuted,
                border: `1px solid ${theme.border}`,
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "0.625rem",
                fontWeight: 500
              }}
            >
              #{tag}
            </li>
          ))}
        </ul>
      ) : null}

      {bookmark.status === "error" && bookmark.errorMessage ? (
        <p data-testid="bookmark-error-message" style={{ margin: 0, fontSize: "0.8125rem", color: theme.textDanger }}>
          {bookmark.errorMessage}
        </p>
      ) : null}
    </article>
  )
}

function formatMetadata(bookmark: BookmarkRecord): string {
  const host = getBookmarkHost(bookmark.url)
  const timestamp = new Date(bookmark.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })

  return [host, timestamp].filter(Boolean).join(" / ")
}

function getBookmarkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0
}

const dotBaseStyle: React.CSSProperties = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "50%"
}

const dotAmberStyle: React.CSSProperties = {
  ...dotBaseStyle,
  backgroundColor: "#f59e0b"
}

const dotGreenStyle: React.CSSProperties = {
  ...dotBaseStyle,
  backgroundColor: "#22c55e"
}

const compactCardStyle: React.CSSProperties = {
  borderBottom: "1px solid transparent",
  padding: `6px ${spacing.sm}`,
  display: "flex",
  alignItems: "center"
}

const compactMainRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  width: "100%",
  overflow: "hidden"
}

const compactStatusDotContainerStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "8px",
  display: "flex",
  alignItems: "center"
}

const compactTitleLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  fontSize: "0.875rem",
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0
}

const compactMetaStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  flexShrink: 0,
  whiteSpace: "nowrap"
}

const compactActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "2px",
  flexShrink: 0,
  transition: "opacity 0.15s ease"
}

const compactActionButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "0.75rem",
  padding: "2px 4px",
  borderRadius: radius.small
}

const cardStyle: React.CSSProperties = {
  padding: `${spacing.md} ${spacing.sm}`,
  display: "grid",
  gap: spacing.xs,
  cursor: "pointer"
}

const cardBodyStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  flexWrap: "wrap"
}

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: radius.pill,
  fontSize: "0.75rem",
  fontWeight: 500
}

const analyzeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  borderRadius: radius.small,
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: 500,
  padding: "2px 6px",
  transition: "color 0.1s ease"
}

const deleteButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "0.875rem",
  lineHeight: 1,
  padding: "0 2px",
  borderRadius: radius.small
}

const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  minWidth: 0
}

const titleStyle: React.CSSProperties = {
  fontSize: typography.title.size,
  fontWeight: typography.title.weight,
  lineHeight: typography.title.lineHeight,
  margin: 0,
  minWidth: 0
}

const metadataStyle: React.CSSProperties = {
  fontSize: "0.6875rem",
  lineHeight: typography.metadata.lineHeight,
  margin: 0
}

const summaryStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  lineHeight: 1.5,
  margin: 0
}

const summaryCollapsedStyle: React.CSSProperties = {
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical"
}

const summaryToggleStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "0.8125rem",
  padding: 0,
  justifySelf: "start"
}

const tagListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.xs,
  listStyle: "none",
  margin: 0,
  padding: 0
}
