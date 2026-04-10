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
})
