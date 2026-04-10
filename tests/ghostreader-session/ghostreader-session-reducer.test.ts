import { describe, expect, it } from "vitest"

import {
  appendAssistantMessage,
  appendUserMessage,
  recordBookmarkAddedEvent,
  replaceWorkingSet,
  updateFollowUpMemory
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

  it("updates follow-up memory with latest query, answer, mode, and bookmark ids", () => {
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })
    const next = updateFollowUpMemory(session, {
      lastQuery: "这个为什么值得收藏？",
      lastAnswer: "因为它总结了核心观点",
      lastReferencedBookmarkIds: ["bm-1", "bm-1"],
      lastQueryMode: "cross-bookmark"
    })

    expect(next.followUpMemory).toMatchObject({
      lastQuery: "这个为什么值得收藏？",
      lastAnswer: "因为它总结了核心观点",
      lastReferencedBookmarkIds: ["bm-1"],
      lastQueryMode: "cross-bookmark"
    })
    expect(next.followUpMemory.updatedAt).not.toBeNull()
  })

  it("overwrites older follow-up memory with newer values", () => {
    const session = updateFollowUpMemory(createEmptyGhostreaderSession({ id: "session-1", title: "New session" }), {
      lastQuery: "旧问题",
      lastAnswer: "旧答案",
      lastReferencedBookmarkIds: ["bm-old"],
      lastQueryMode: "current-only"
    })

    const next = updateFollowUpMemory(session, {
      lastQuery: "新问题",
      lastAnswer: "新答案",
      lastReferencedBookmarkIds: ["bm-new"],
      lastQueryMode: "cross-bookmark"
    })

    expect(next.followUpMemory).toMatchObject({
      lastQuery: "新问题",
      lastAnswer: "新答案",
      lastReferencedBookmarkIds: ["bm-new"],
      lastQueryMode: "cross-bookmark"
    })
  })

  it("keeps follow-up memory scoped to explicit or retrieved bookmark ids", () => {
    const session = replaceWorkingSet(createEmptyGhostreaderSession({ id: "session-1", title: "New session" }), [
      "bm-working-1",
      "bm-working-2"
    ])

    const next = updateFollowUpMemory(session, {
      lastQuery: "具体呢？",
      lastAnswer: "继续解释上一个结论",
      lastReferencedBookmarkIds: [],
      lastQueryMode: "current-only"
    })

    expect(next.workingSetBookmarkIds).toEqual(["bm-working-1", "bm-working-2"])
    expect(next.followUpMemory.lastReferencedBookmarkIds).toEqual([])
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
