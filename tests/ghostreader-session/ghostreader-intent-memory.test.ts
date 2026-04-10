import { describe, expect, it } from "vitest"

import { updateIntentMemory } from "../../src/features/ghostreader-session/ghostreader-intent-memory"
import { createEmptyGhostreaderSession } from "../../src/features/ghostreader-session/ghostreader-session-types"

describe("ghostreader intent memory", () => {
  it("summarizes a collection goal from cross-bookmark query", () => {
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })
    const next = updateIntentMemory(session, {
      latestUserText: "关于杨幂的书签有哪些？",
      bookmarkEvents: []
    })

    expect(next.intentMemory.summary).toContain("杨幂")
  })

  it("mentions recent bookmark additions when bookmark events exist", () => {
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })
    const next = updateIntentMemory(session, {
      latestUserText: "把刚加的几个也整理一下",
      bookmarkEvents: [
        { bookmarkId: "bm-1", title: "杨幂采访合集", url: "https://yangmi.example", addedAt: "2026-04-09T00:00:00.000Z", source: "manual" }
      ]
    })

    expect(next.intentMemory.summary).toContain("刚添加")
  })
})
