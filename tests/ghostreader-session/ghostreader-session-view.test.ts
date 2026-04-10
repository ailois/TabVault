import { describe, expect, it } from "vitest"

import {
  buildGhostreaderInheritedMemory,
  getGhostreaderSessionSnapshot,
  getGhostreaderTranscript
} from "../../src/features/ghostreader-session/ghostreader-session-view"
import { createEmptyGhostreaderSession } from "../../src/features/ghostreader-session/ghostreader-session-types"
import {
  appendAssistantMessage,
  appendUserMessage,
  replaceWorkingSet,
  updateFollowUpMemory
} from "../../src/features/ghostreader-session/ghostreader-session-reducer"

describe("ghostreader session view", () => {
  it("returns full transcript messages for the active session", () => {
    let session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })
    session = appendUserMessage(session, {
      id: "user-1",
      text: "第一问",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: ["bm-1"]
    })
    session = appendAssistantMessage(session, {
      id: "assistant-1",
      text: "第一答",
      referencedBookmarkIds: ["bm-1"]
    })
    session = appendUserMessage(session, {
      id: "user-2",
      text: "第二问",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: ["bm-2"]
    })
    session = appendAssistantMessage(session, {
      id: "assistant-2",
      text: "第二答",
      referencedBookmarkIds: ["bm-2"]
    })

    expect(getGhostreaderTranscript(session)).toEqual(session.messages)
    expect(getGhostreaderTranscript(null)).toEqual([])
  })

  it("builds inherited memory from recent successful sessions", () => {
    let session1 = createEmptyGhostreaderSession({ id: "session-1", title: "Session 1" })
    session1 = appendUserMessage(session1, {
      id: "user-1",
      text: "如何整理 AI 访谈笔记",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: ["bm-1"]
    })
    session1 = appendAssistantMessage(session1, {
      id: "assistant-1",
      text: "先按主题聚类",
      referencedBookmarkIds: ["bm-1"]
    })
    session1 = replaceWorkingSet(session1, ["bm-1", "bm-2"])
    session1 = updateFollowUpMemory(session1, {
      lastQuery: "如何整理 AI 访谈笔记",
      lastAnswer: "先按主题聚类",
      lastReferencedBookmarkIds: ["bm-3"],
      lastQueryMode: "cross-bookmark"
    })

    let session2 = createEmptyGhostreaderSession({ id: "session-2", title: "Session 2" })
    session2 = appendUserMessage(session2, {
      id: "user-2",
      text: "再给我一个可执行模板",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: ["bm-4"]
    })
    session2 = appendAssistantMessage(session2, {
      id: "assistant-2",
      text: "用三段式模板",
      referencedBookmarkIds: ["bm-4"]
    })
    session2 = replaceWorkingSet(session2, ["bm-4"])
    session2 = updateFollowUpMemory(session2, {
      lastQuery: "再给我一个可执行模板",
      lastAnswer: "用三段式模板",
      lastReferencedBookmarkIds: ["bm-5"],
      lastQueryMode: "cross-bookmark"
    })

    let activeSession = createEmptyGhostreaderSession({ id: "session-active", title: "Active" })
    activeSession = appendUserMessage(activeSession, {
      id: "user-active",
      text: "这是当前会话",
      queryMode: "current-only",
      referencedBookmarkIds: ["bm-active"]
    })

    let failedSession = createEmptyGhostreaderSession({ id: "session-failed", title: "Failed" })
    failedSession = appendUserMessage(failedSession, {
      id: "user-failed",
      text: "这轮没有成功回答",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: ["bm-failed"]
    })

    session1 = { ...session1, updatedAt: "2026-04-10T10:00:00.000Z" }
    session2 = { ...session2, updatedAt: "2026-04-10T12:00:00.000Z" }
    activeSession = { ...activeSession, updatedAt: "2026-04-10T13:00:00.000Z" }
    failedSession = { ...failedSession, updatedAt: "2026-04-10T11:00:00.000Z" }

    expect(
      buildGhostreaderInheritedMemory([failedSession, session1, activeSession, session2], "session-active")
    ).toEqual({
      recentTopicSummary: "再给我一个可执行模板；如何整理 AI 访谈笔记",
      bookmarkIds: ["bm-5", "bm-4", "bm-3", "bm-1", "bm-2"],
      sourceSessionIds: ["session-2", "session-1"]
    })
  })

  it("uses globally recent user turns for inherited memory summary", () => {
    let olderSession = createEmptyGhostreaderSession({ id: "session-older", title: "Older" })
    olderSession = appendUserMessage(olderSession, {
      id: "older-user-1",
      text: "older-should-be-excluded",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: []
    })
    olderSession = appendAssistantMessage(olderSession, {
      id: "older-assistant-1",
      text: "older-answer",
      referencedBookmarkIds: []
    })

    let newerSession = createEmptyGhostreaderSession({ id: "session-newer", title: "Newer" })
    newerSession = appendUserMessage(newerSession, {
      id: "newer-user-1",
      text: "newer-early-turn",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: []
    })
    newerSession = appendAssistantMessage(newerSession, {
      id: "newer-assistant-1",
      text: "answer-1",
      referencedBookmarkIds: []
    })
    newerSession = appendUserMessage(newerSession, {
      id: "newer-user-2",
      text: "newer-middle-turn",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: []
    })
    newerSession = appendAssistantMessage(newerSession, {
      id: "newer-assistant-2",
      text: "answer-2",
      referencedBookmarkIds: []
    })
    newerSession = appendUserMessage(newerSession, {
      id: "newer-user-3",
      text: "newer-latest-turn",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: []
    })
    newerSession = appendAssistantMessage(newerSession, {
      id: "newer-assistant-3",
      text: "answer-3",
      referencedBookmarkIds: []
    })

    olderSession = {
      ...olderSession,
      updatedAt: "2026-04-10T10:00:00.000Z",
      messages: olderSession.messages.map((message) => {
        if (message.id === "older-user-1") {
          return { ...message, createdAt: "2026-04-10T10:59:00.000Z" }
        }

        if (message.id === "older-assistant-1") {
          return { ...message, createdAt: "2026-04-10T10:59:30.000Z" }
        }

        return message
      })
    }

    newerSession = {
      ...newerSession,
      updatedAt: "2026-04-10T12:00:00.000Z",
      messages: newerSession.messages.map((message) => {
        if (message.id === "newer-user-1") {
          return { ...message, createdAt: "2026-04-10T10:00:00.000Z" }
        }

        if (message.id === "newer-assistant-1") {
          return { ...message, createdAt: "2026-04-10T10:00:30.000Z" }
        }

        if (message.id === "newer-user-2") {
          return { ...message, createdAt: "2026-04-10T11:30:00.000Z" }
        }

        if (message.id === "newer-assistant-2") {
          return { ...message, createdAt: "2026-04-10T11:30:30.000Z" }
        }

        if (message.id === "newer-user-3") {
          return { ...message, createdAt: "2026-04-10T11:59:00.000Z" }
        }

        if (message.id === "newer-assistant-3") {
          return { ...message, createdAt: "2026-04-10T11:59:30.000Z" }
        }

        return message
      })
    }

    expect(buildGhostreaderInheritedMemory([olderSession, newerSession], null).recentTopicSummary).toBe(
      "newer-latest-turn；newer-middle-turn；older-should-be-excluded"
    )
  })

  it("does not treat assistant error turns as successful inherited-memory sources", () => {
    let successfulSession = createEmptyGhostreaderSession({ id: "session-success", title: "Success" })
    successfulSession = appendUserMessage(successfulSession, {
      id: "user-success",
      text: "valid question",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: ["bm-success"]
    })
    successfulSession = appendAssistantMessage(successfulSession, {
      id: "assistant-success",
      text: "valid answer",
      referencedBookmarkIds: ["bm-success"]
    })
    successfulSession = updateFollowUpMemory(successfulSession, {
      lastQuery: "valid question",
      lastAnswer: "valid answer",
      lastReferencedBookmarkIds: ["bm-success"],
      lastQueryMode: "cross-bookmark"
    })

    let failedSession = createEmptyGhostreaderSession({ id: "session-failed", title: "Failed" })
    failedSession = appendUserMessage(failedSession, {
      id: "user-failed",
      text: "failing question",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: ["bm-failed"]
    })
    failedSession = appendAssistantMessage(failedSession, {
      id: "assistant-error",
      text: "OpenAI-compatible authentication failed",
      referencedBookmarkIds: [],
      isError: true
    })

    successfulSession = { ...successfulSession, updatedAt: "2026-04-10T10:00:00.000Z" }
    failedSession = { ...failedSession, updatedAt: "2026-04-10T12:00:00.000Z" }

    expect(buildGhostreaderInheritedMemory([failedSession, successfulSession], null)).toEqual({
      recentTopicSummary: "valid question",
      bookmarkIds: ["bm-success"],
      sourceSessionIds: ["session-success"]
    })
  })

  it("excludes failed follow-up user turns inside an otherwise successful session", () => {
    let mixedSession = createEmptyGhostreaderSession({ id: "session-mixed", title: "Mixed" })
    mixedSession = appendUserMessage(mixedSession, {
      id: "user-success-turn",
      text: "keep-this-success-query",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: []
    })
    mixedSession = appendAssistantMessage(mixedSession, {
      id: "assistant-success-turn",
      text: "successful answer",
      referencedBookmarkIds: []
    })
    mixedSession = appendUserMessage(mixedSession, {
      id: "user-failed-turn",
      text: "exclude-this-failed-query",
      queryMode: "cross-bookmark",
      referencedBookmarkIds: []
    })
    mixedSession = appendAssistantMessage(mixedSession, {
      id: "assistant-error-turn",
      text: "provider timeout",
      referencedBookmarkIds: [],
      isError: true
    })

    mixedSession = {
      ...mixedSession,
      updatedAt: "2026-04-10T12:00:00.000Z",
      messages: mixedSession.messages.map((message) => {
        if (message.id === "user-success-turn") {
          return { ...message, createdAt: "2026-04-10T10:00:00.000Z" }
        }

        if (message.id === "assistant-success-turn") {
          return { ...message, createdAt: "2026-04-10T10:00:30.000Z" }
        }

        if (message.id === "user-failed-turn") {
          return { ...message, createdAt: "2026-04-10T11:00:00.000Z" }
        }

        if (message.id === "assistant-error-turn") {
          return { ...message, createdAt: "2026-04-10T11:00:30.000Z" }
        }

        return message
      })
    }

    expect(buildGhostreaderInheritedMemory([mixedSession], null).recentTopicSummary).toBe(
      "keep-this-success-query"
    )
  })

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
