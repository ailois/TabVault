import { describe, expect, it } from "vitest"

import { resolveSessionReferences } from "../../src/features/ghostreader-session/ghostreader-reference-resolution"
import { createEmptyGhostreaderSession } from "../../src/features/ghostreader-session/ghostreader-session-types"

describe("ghostreader reference resolution", () => {
  it("prefers recently added bookmarks for 刚加的几个", () => {
    const session = {
      ...createEmptyGhostreaderSession({ id: "session-1", title: "New session" }),
      workingSetBookmarkIds: ["bm-1", "bm-2"],
      bookmarksAddedInSession: [
        {
          bookmarkId: "bm-2",
          title: "杨幂采访合集",
          url: "https://yangmi.example",
          addedAt: "2026-04-09T00:00:00.000Z",
          source: "manual" as const
        }
      ]
    }

    const resolved = resolveSessionReferences("把刚加的几个也总结一下", {
      session,
      currentBookmarkId: "bm-1",
      latestResultBookmarkIds: ["bm-1"]
    })

    expect(resolved.isReferenceQuery).toBe(true)
    expect(resolved.bookmarkIds).toEqual(["bm-2"])
    expect(resolved.source).toBe("added-in-session")
  })

  it("prefers current bookmark for 这个书签 when one is selected", () => {
    const session = {
      ...createEmptyGhostreaderSession({ id: "session-1", title: "New session" }),
      workingSetBookmarkIds: ["bm-2"]
    }

    const resolved = resolveSessionReferences("总结这个书签", {
      session,
      currentBookmarkId: "bm-1",
      latestResultBookmarkIds: ["bm-2"]
    })

    expect(resolved.bookmarkIds).toEqual(["bm-1"])
    expect(resolved.source).toBe("current-bookmark")
  })

  it("uses follow-up memory bookmark ids for 刚才那个", () => {
    const session = {
      ...createEmptyGhostreaderSession({ id: "session-1", title: "New session" }),
      followUpMemory: {
        lastQuery: "帮我找一个关于杨幂的书签",
        lastAnswer: "我找到一个采访合集",
        lastReferencedBookmarkIds: ["bm-2"],
        lastQueryMode: "cross-bookmark" as const,
        updatedAt: "2026-04-10T00:00:00.000Z"
      }
    }

    expect(resolveSessionReferences("刚才那个为什么重要", {
      session,
      latestResultBookmarkIds: ["bm-3", "bm-4"]
    })).toMatchObject({
      bookmarkIds: ["bm-2"],
      isReferenceQuery: true
    })
  })

  it("resolves ordinal references against latest results", () => {
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })

    expect(resolveSessionReferences("第一个结果展开说说", {
      session,
      latestResultBookmarkIds: ["bm-3", "bm-4"]
    })).toMatchObject({
      bookmarkIds: ["bm-3"],
      isReferenceQuery: true,
      source: "latest-results"
    })
  })

  it("treats short follow-ups as reference-style when follow-up memory has bookmark ids", () => {
    const session = {
      ...createEmptyGhostreaderSession({ id: "session-1", title: "New session" }),
      followUpMemory: {
        lastQuery: "帮我找一个关于杨幂的书签",
        lastAnswer: "我找到一个采访合集",
        lastReferencedBookmarkIds: ["bm-2"],
        lastQueryMode: "cross-bookmark" as const,
        updatedAt: "2026-04-10T00:00:00.000Z"
      }
    }

    expect(resolveSessionReferences("为什么值得收藏？", {
      session,
      latestResultBookmarkIds: []
    })).toMatchObject({
      bookmarkIds: ["bm-2"],
      isReferenceQuery: true
    })
  })

  it("treats short follow-ups as semantic continuation when no bookmark ids exist", () => {
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })

    expect(resolveSessionReferences("具体呢？", {
      session,
      latestResultBookmarkIds: []
    })).toEqual({
      bookmarkIds: [],
      isReferenceQuery: true,
      source: null
    })
  })
})
