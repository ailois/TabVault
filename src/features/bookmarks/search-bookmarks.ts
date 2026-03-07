import type { BookmarkRecord } from "../../types/bookmark"

export function searchBookmarks(bookmarks: BookmarkRecord[], query: string): BookmarkRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    return bookmarks
  }

  return bookmarks.filter((bookmark) => createSearchText(bookmark).includes(normalizedQuery))
}

function createSearchText(bookmark: BookmarkRecord): string {
  return [bookmark.title, bookmark.url, bookmark.summary, bookmark.tags.join(" ")]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase()
}
