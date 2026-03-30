import type { BookmarkRecord } from "../../types/bookmark"

export function updateBookmarkMetadata(
  bookmark: BookmarkRecord,
  updates: {
    summary?: string
    aiTags: string[]
    userTags: string[]
  }
): BookmarkRecord {
  return {
    ...bookmark,
    summary: updates.summary,
    aiTags: updates.aiTags,
    userTags: updates.userTags,
    updatedAt: new Date().toISOString()
  }
}
