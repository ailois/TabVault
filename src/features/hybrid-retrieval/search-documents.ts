import type { BookmarkRecord } from "../../types/bookmark"

export type SearchDocument = {
  sourceType: "saved-bookmark" | "current-page"
  bookmarkId?: string
  title: string
  url: string
  summary?: string
  tagsText: string
  bodyText: string
  combinedText: string
  updatedAt: string
}

export function buildBookmarkSearchDocument(bookmark: BookmarkRecord): SearchDocument {
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
}
