import { describe, expect, it } from "vitest"

import { updateBookmarkMetadata } from "../../src/lib/storage/update-bookmark-metadata"
import type { BookmarkRecord } from "../../src/types/bookmark"

describe("updateBookmarkMetadata", () => {
  it("updates summary, aiTags, userTags and refreshes updatedAt", () => {
    const original: BookmarkRecord = {
      id: "bookmark-1",
      title: "Example page",
      url: "https://example.com/article",
      extractedText: "Example content",
      summary: "Old summary",
      aiTags: ["old-ai"],
      userTags: ["old-user"],
      status: "done",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z"
    }

    const updated = updateBookmarkMetadata(original, {
      summary: "New summary",
      aiTags: ["react", "docs"],
      userTags: ["favorite"]
    })

    expect(updated.summary).toBe("New summary")
    expect(updated.aiTags).toEqual(["react", "docs"])
    expect(updated.userTags).toEqual(["favorite"])
    expect(updated.updatedAt).not.toBe(original.updatedAt)
    expect(updated.id).toBe(original.id)
    expect(updated.createdAt).toBe(original.createdAt)
  })
})
