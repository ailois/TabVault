import { describe, expect, it } from "vitest"

import {
  appendAssistantMessage,
  appendUserMessage,
  recordBookmarkAddedEvent,
  replaceWorkingSet
} from "../../src/features/ghostreader-session/ghostreader-session-reducer"
import {
  GHOSTREADER_MAX_MESSAGES_PER_SESSION,
  GHOSTREADER_MAX_WORKING_SET_BOOKMARK_IDS,
  createEmptyGhostreaderSession
} from "../../src/features/ghostreader-session/ghostreader-session-types"

describe("ghostreader session reducer", () => {
  it("adds a user message and preserves session shape", () => {
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })
    const next = appendUserMessage(session, {
      id: "msg-1",
      text: "关于杨幂的书签有哪些？",
      queryMode: "cross-bookmark"
    })

    expect(next.messages).toHaveLength(1)
    expect(next.messages[0]).toMatchObject({
      id: "msg-1",
      role: "user",
      text: "关于杨幂的书签有哪些？",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: []
    })
    expect(next.updatedAt).not.toBe(session.updatedAt)
  })

  it("adds bookmark event into working set immediately", () => {
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })
    const next = recordBookmarkAddedEvent(session, {
      bookmarkId: "bm-1",
      title: "杨幂采访合集",
      url: "https://yangmi.example",
      source: "manual"
    })

    expect(next.bookmarksAddedInSession).toHaveLength(1)
    expect(next.workingSetBookmarkIds).toContain("bm-1")
    expect(next.messages.at(-1)?.role).toBe("system")
    expect(next.messages.at(-1)?.text).toContain("杨幂采访合集")
  })

  it("deduplicates and truncates working set bookmark ids", () => {
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })
    const ids = Array.from({ length: GHOSTREADER_MAX_WORKING_SET_BOOKMARK_IDS + 10 }, (_, index) => `bm-${index}`)
    const next = replaceWorkingSet(session, ["bm-3", "bm-3", ...ids])

    expect(new Set(next.workingSetBookmarkIds).size).toBe(next.workingSetBookmarkIds.length)
    expect(next.workingSetBookmarkIds).toHaveLength(GHOSTREADER_MAX_WORKING_SET_BOOKMARK_IDS)
    expect(next.workingSetBookmarkIds[0]).toBe("bm-3")
  })

  it("trims older messages when the session exceeds the message cap", () => {
    let session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })

    for (let index = 0; index < GHOSTREADER_MAX_MESSAGES_PER_SESSION + 5; index += 1) {
      session = appendAssistantMessage(session, {
        id: `msg-${index}`,
        text: `answer ${index}`
      })
    }

    expect(session.messages).toHaveLength(GHOSTREADER_MAX_MESSAGES_PER_SESSION)
    expect(session.messages[0]?.id).toBe("msg-5")
    expect(session.messages.at(-1)?.id).toBe(`msg-${GHOSTREADER_MAX_MESSAGES_PER_SESSION + 4}`)
  })
})
