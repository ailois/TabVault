import { describe, expect, it } from "vitest"

import { createEmptyGhostreaderSession } from "../../src/features/ghostreader-session/ghostreader-session-types"

describe("ghostreader session types", () => {
  it("creates an empty active session with intent memory and working set", () => {
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })

    expect(session.id).toBe("session-1")
    expect(session.title).toBe("New session")
    expect(session.status).toBe("active")
    expect(session.messages).toEqual([])
    expect(session.workingSetBookmarkIds).toEqual([])
    expect(session.bookmarksAddedInSession).toEqual([])
    expect(session.intentMemory).toEqual({
      summary: "",
      updatedAt: null,
      source: "rule-based"
    })
  })
})
