import { getMessage } from "../../lib/i18n/messages"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage } from "../../types/settings"

export type SearchMode = "all" | "title" | "tags" | "url"

export function searchBookmarks(
  bookmarks: BookmarkRecord[],
  query: string,
  mode: SearchMode = "all"
): BookmarkRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    return bookmarks
  }

  return bookmarks.filter((bookmark) => createSearchText(bookmark, mode).includes(normalizedQuery))
}

function createSearchText(bookmark: BookmarkRecord, mode: SearchMode): string {
  const allTags = [...bookmark.aiTags, ...bookmark.userTags].join(" ")
  switch (mode) {
    case "title":
      return bookmark.title.toLocaleLowerCase()
    case "tags":
      return allTags.toLocaleLowerCase()
    case "url":
      return bookmark.url.toLocaleLowerCase()
    default:
      return [bookmark.title, bookmark.url, bookmark.summary, allTags, bookmark.extractedText]
        .filter((v): v is string => Boolean(v))
        .join(" ")
        .toLocaleLowerCase()
  }
}

export type SearchResultWithReason = {
  bookmark: BookmarkRecord
  matchReason: string
}

export function searchBookmarksWithReasons(
  bookmarks: BookmarkRecord[],
  query: string,
  language: DisplayLanguage = "en"
): SearchResultWithReason[] {
  const q = query.trim().toLowerCase()

  if (!q) {
    return []
  }

  const results: SearchResultWithReason[] = []

  for (const bookmark of bookmarks) {
    if (bookmark.title.toLowerCase().includes(q)) {
      results.push({ bookmark, matchReason: getMessage(language, "dashboard.results.reason.title") })
    } else if (bookmark.summary?.toLowerCase().includes(q)) {
      results.push({ bookmark, matchReason: getMessage(language, "dashboard.results.reason.summary") })
    } else if ([...bookmark.aiTags, ...bookmark.userTags].some((t) => t.toLowerCase().includes(q))) {
      results.push({ bookmark, matchReason: getMessage(language, "dashboard.results.reason.tag") })
    } else if (bookmark.extractedText?.toLowerCase().includes(q)) {
      results.push({ bookmark, matchReason: getMessage(language, "dashboard.results.reason.content") })
    } else if (bookmark.url.toLowerCase().includes(q)) {
      results.push({ bookmark, matchReason: getMessage(language, "dashboard.results.reason.url") })
    }
  }

  return results
}
