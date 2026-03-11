import React, { useState } from "react"

import type { BookmarkRecord } from "../types/bookmark"
import { colors, radius, shadow, spacing, typography } from "../ui/design-tokens"

type BookmarkListProps = {
  bookmarks: BookmarkRecord[]
  onDelete: (id: string) => Promise<void>
}

type BookmarkCardProps = {
  bookmark: BookmarkRecord
  onDelete: (id: string) => Promise<void>
}

export function BookmarkList({ bookmarks, onDelete }: BookmarkListProps) {
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
          <BookmarkCard bookmark={bookmark} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  )
}

function BookmarkCard({ bookmark, onDelete }: BookmarkCardProps) {
  const [expanded, setExpanded] = useState(false)

  async function handleDelete(): Promise<void> {
    if (!window.confirm("Delete this bookmark?")) {
      return
    }

    await onDelete(bookmark.id)
  }

  return (
    <article data-bookmark-card="true" style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={cardHeaderLeftStyle}>
          {bookmark.status === "analyzing" ? (
            <span data-testid="bookmark-status-badge" style={analyzingBadgeStyle}>
              Analyzing...
            </span>
          ) : bookmark.status === "error" ? (
            <span data-testid="bookmark-status-badge" style={errorBadgeStyle}>
              Error
            </span>
          ) : null}
        </div>
        <button
          aria-label={`Delete ${bookmark.title}`}
          data-testid="bookmark-delete-button"
          onClick={() => void handleDelete()}
          style={deleteButtonStyle}
          type="button"
        >
          ×
        </button>
      </div>

      <h3 style={titleStyle}>
        <a href={bookmark.url} rel="noreferrer" style={titleLinkStyle} target="_blank">
          {bookmark.title}
        </a>
      </h3>

      <p data-testid="bookmark-metadata" style={metadataStyle}>
        {formatMetadata(bookmark)}
      </p>

      {bookmark.summary ? (
        <>
          <p
            data-testid="bookmark-summary"
            style={expanded ? summaryExpandedStyle : summaryCollapsedStyle}
          >
            {bookmark.summary}
          </p>
          <button
            data-testid="bookmark-summary-toggle"
            onClick={() => setExpanded((prev) => !prev)}
            style={toggleButtonStyle}
            type="button"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </>
      ) : null}

      {bookmark.tags.length > 0 ? (
        <ul aria-label={`${bookmark.title} tags`} style={tagListStyle}>
          {bookmark.tags.map((tag) => (
            <li data-testid="bookmark-tag" key={tag} style={tagStyle}>
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {bookmark.status === "error" && bookmark.errorMessage ? (
        <p data-testid="bookmark-error-message" style={errorMessageStyle}>
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

  return [host, timestamp].filter(Boolean).join(" · ")
}

function getBookmarkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  listStyle: "none",
  margin: 0,
  padding: 0
}

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.large,
  boxShadow: shadow.soft,
  padding: spacing.md,
  display: "grid",
  gap: spacing.xs
}

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
  minHeight: "24px"
}

const cardHeaderLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs
}

const analyzingBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: radius.pill,
  backgroundColor: colors.surfaceMuted,
  color: colors.textMuted,
  fontSize: "0.75rem",
  fontWeight: 500
}

const errorBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: radius.pill,
  backgroundColor: "#fef2f2",
  color: colors.textDanger,
  fontSize: "0.75rem",
  fontWeight: 500
}

const deleteButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colors.textMuted,
  fontSize: "1.125rem",
  lineHeight: 1,
  padding: "0 2px",
  borderRadius: radius.small
}

const titleStyle: React.CSSProperties = {
  fontSize: typography.title.size,
  fontWeight: typography.title.weight,
  lineHeight: typography.title.lineHeight,
  margin: 0
}

const titleLinkStyle: React.CSSProperties = {
  color: colors.textPrimary,
  textDecoration: "none"
}

const metadataStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "0.8125rem",
  lineHeight: typography.metadata.lineHeight,
  margin: 0
}

const summaryCollapsedStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: "0.875rem",
  lineHeight: 1.5,
  margin: 0,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical"
}

const summaryExpandedStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: "0.875rem",
  lineHeight: 1.5,
  margin: 0
}

const toggleButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colors.textMuted,
  fontSize: "0.8125rem",
  padding: 0
}

const tagListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.xs,
  listStyle: "none",
  margin: 0,
  padding: 0
}

const tagStyle: React.CSSProperties = {
  backgroundColor: colors.surfaceMuted,
  border: `1px solid ${colors.borderMuted}`,
  borderRadius: radius.pill,
  color: colors.textSecondary,
  fontSize: "0.75rem",
  fontWeight: 600,
  padding: "2px 8px"
}

const errorMessageStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  color: colors.textDanger
}
