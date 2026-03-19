import type { BookmarkRecord } from "../../types/bookmark"

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
      return [bookmark.title, bookmark.url, bookmark.summary, allTags]
        .filter((v): v is string => Boolean(v))
        .join(" ")
        .toLocaleLowerCase()
  }
}
