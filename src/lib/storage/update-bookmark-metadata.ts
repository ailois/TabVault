import type { BookmarkRecord } from "../../types/bookmark"

export function updateBookmarkMetadata(
  bookmark: BookmarkRecord,
  updates: {
    summary?: string
    aiTags: string[]
    userTags: string[]
    userNotes?: string
  }
): BookmarkRecord {
  return {
    ...bookmark,
    summary: updates.summary,
    aiTags: updates.aiTags,
    userTags: updates.userTags,
    userNotes: Object.prototype.hasOwnProperty.call(updates, "userNotes") ? updates.userNotes : bookmark.userNotes,
    updatedAt: new Date().toISOString()
  }
}
