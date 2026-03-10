import React from "react"

import type { BookmarkRecord } from "../types/bookmark"
import { colors, radius, shadow, spacing, typography } from "../ui/design-tokens"

type BookmarkListProps = {
  bookmarks: BookmarkRecord[]
}

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  listStyle: "none",
  margin: 0,
  padding: 0
}

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surfaceElevated,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.large,
  boxShadow: shadow.soft,
  padding: spacing.md
}

const metadataStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: typography.metadata.size,
  lineHeight: typography.metadata.lineHeight,
  margin: `${spacing.xs} 0 0`,
  wordBreak: "break-all"
}

const summaryStyle: React.CSSProperties = {
  color: colors.textPrimary,
  lineHeight: typography.body.lineHeight,
  margin: `${spacing.sm} 0 0`
}

const tagListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm,
  listStyle: "none",
  margin: `${spacing.sm} 0 0`,
  padding: 0
}

const tagStyle: React.CSSProperties = {
  backgroundColor: colors.surfaceMuted,
  border: `1px solid ${colors.borderMuted}`,
  borderRadius: radius.pill,
  color: colors.textSecondary,
  fontSize: typography.tag.size,
  fontWeight: typography.tag.weight,
  padding: `${spacing.xs} ${spacing.sm}`
}

const titleStyle: React.CSSProperties = {
  fontSize: typography.title.size,
  fontWeight: typography.title.weight,
  lineHeight: typography.title.lineHeight,
  margin: 0
}

export function BookmarkList({ bookmarks }: BookmarkListProps) {
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
          <article data-bookmark-card="true" style={cardStyle}>
            <h3 style={titleStyle}>
              <a href={bookmark.url} rel="noreferrer" target="_blank">
                {bookmark.title}
              </a>
            </h3>
            <p style={metadataStyle}>{formatSecondaryMetadata(bookmark)}</p>
            {bookmark.summary ? <p style={summaryStyle}>{bookmark.summary}</p> : null}
            {bookmark.tags.length > 0 ? (
              <ul aria-label={`${bookmark.title} tags`} style={tagListStyle}>
                {bookmark.tags.map((tag) => (
                  <li key={tag} style={tagStyle}>
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  )
}

function formatSecondaryMetadata(bookmark: BookmarkRecord): string {
  const host = getBookmarkHost(bookmark.url)
  const timestamp = new Date(bookmark.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })

  return [host, timestamp].filter(Boolean).join(" | ")
}

function getBookmarkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}
