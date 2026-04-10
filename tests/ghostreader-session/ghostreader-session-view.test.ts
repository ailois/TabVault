import { describe, expect, it } from "vitest"

import { getGhostreaderSessionSnapshot } from "../../src/features/ghostreader-session/ghostreader-session-view"
import { createEmptyGhostreaderSession } from "../../src/features/ghostreader-session/ghostreader-session-types"
import {
  appendAssistantMessage,
  appendUserMessage,
  replaceWorkingSet,
  updateFollowUpMemory
} from "../../src/features/ghostreader-session/ghostreader-session-reducer"

describe("ghostreader session view", () => {
  it("includes follow-up memory bookmark ids when restoring referenced bookmarks", () => {
    let session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })
    session = appendUserMessage(session, {
      id: "user-1",
      text: "为什么值得收藏？",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: []
    })
    session = appendAssistantMessage(session, {
      id: "assistant-1",
      text: "它总结了采访重点",
      referencedBookmarkIds: []
    })
    session = replaceWorkingSet(session, ["bm-working"])
    session = updateFollowUpMemory(session, {
      lastQuery: "为什么值得收藏？",
      lastAnswer: "它总结了采访重点",
      lastReferencedBookmarkIds: ["bm-follow-up"],
      lastQueryMode: "cross-bookmark"
    })

    expect(getGhostreaderSessionSnapshot(session)).toEqual({
      query: "为什么值得收藏？",
      mode: "cross-bookmark",
      answerText: "它总结了采访重点",
      referencedBookmarkIds: ["bm-follow-up", "bm-working"]
    })
  })
})
