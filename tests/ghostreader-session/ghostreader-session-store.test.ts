import { describe, expect, it, vi } from "vitest"

import {
  ACTIVE_GHOSTREADER_SESSION_ID_KEY,
  ChromeGhostreaderSessionStore,
  GHOSTREADER_SESSIONS_KEY,
  GHOSTREADER_SESSIONS_VERSION,
  GHOSTREADER_SESSIONS_VERSION_KEY
} from "../../src/features/ghostreader-session/ghostreader-session-store"
import { createEmptyGhostreaderSession } from "../../src/features/ghostreader-session/ghostreader-session-types"

const EMPTY_FOLLOW_UP_MEMORY = {
  lastQuery: "",
  lastAnswer: "",
  lastReferencedBookmarkIds: [],
  lastQueryMode: null,
  updatedAt: null
}

const EMPTY_INHERITED_MEMORY = {
  recentTopicSummary: "",
  bookmarkIds: [],
  sourceSessionIds: []
}

describe("ghostreader session store", () => {
  it("loads empty state when storage has nothing persisted", async () => {
    const get = vi.fn(async () => ({}))
    const set = vi.fn(async () => undefined)
    const remove = vi.fn(async () => undefined)
    const store = new ChromeGhostreaderSessionStore({ storage: { get, set, remove } })

    await expect(store.loadSessions()).resolves.toEqual({
      activeSessionId: null,
      sessions: [],
      version: GHOSTREADER_SESSIONS_VERSION
    })
  })

  it("saves active session id with sessions and persists the schema version", async () => {
    const storage = new Map<string, unknown>()
    const get = vi.fn(async (keys?: string | string[]) => {
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, storage.get(key)]))
      }

      if (typeof keys === "string") {
        return { [keys]: storage.get(keys) }
      }

      return Object.fromEntries(storage.entries())
    })
    const set = vi.fn(async (values: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(values)) {
        storage.set(key, value)
      }
    })
    const remove = vi.fn(async () => undefined)
    const store = new ChromeGhostreaderSessionStore({ storage: { get, set, remove } })
    const session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })

    expect(session.followUpMemory).toEqual(EMPTY_FOLLOW_UP_MEMORY)
    expect(session.inheritedMemory).toEqual(EMPTY_INHERITED_MEMORY)

    await store.saveSessions({ activeSessionId: session.id, sessions: [session] })

    expect(set).toHaveBeenCalledWith({
      [ACTIVE_GHOSTREADER_SESSION_ID_KEY]: "session-1",
      [GHOSTREADER_SESSIONS_KEY]: [session],
      [GHOSTREADER_SESSIONS_VERSION_KEY]: GHOSTREADER_SESSIONS_VERSION
    })

    await expect(store.loadSessions()).resolves.toEqual({
      activeSessionId: "session-1",
      sessions: [session],
      version: GHOSTREADER_SESSIONS_VERSION
    })
  })

  it("backfills follow-up memory when loading older persisted sessions", async () => {
    const legacySession = {
      id: "session-legacy",
      title: "Legacy session",
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
      status: "active" as const,
      messages: [],
      workingSetBookmarkIds: [],
      bookmarksAddedInSession: [],
      intentMemory: {
        summary: "",
        updatedAt: null,
        source: "rule-based" as const
      }
    }
    const store = new ChromeGhostreaderSessionStore({
      storage: {
        get: vi.fn(async () => ({
          [ACTIVE_GHOSTREADER_SESSION_ID_KEY]: "session-legacy",
          [GHOSTREADER_SESSIONS_KEY]: [legacySession],
          [GHOSTREADER_SESSIONS_VERSION_KEY]: GHOSTREADER_SESSIONS_VERSION
        })),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined)
      }
    })

    await expect(store.loadSessions()).resolves.toMatchObject({
      sessions: [
        expect.objectContaining({
          followUpMemory: EMPTY_FOLLOW_UP_MEMORY,
          inheritedMemory: EMPTY_INHERITED_MEMORY
        })
      ]
    })
  })

  it("keeps only the most recently updated sessions when persisting", async () => {
    const savedValues: Array<Record<string, unknown>> = []
    const store = new ChromeGhostreaderSessionStore({
      storage: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async (values: Record<string, unknown>) => {
          savedValues.push(values)
        }),
        remove: vi.fn(async () => undefined)
      }
    })

    const sessions = Array.from({ length: 25 }, (_, index) => ({
      ...createEmptyGhostreaderSession({ id: `session-${index}`, title: `Session ${index}` }),
      updatedAt: new Date(2026, 3, index + 1).toISOString()
    }))

    await store.saveSessions({
      activeSessionId: "session-24",
      sessions
    })

    const latestWrite = savedValues.at(-1)
    const persistedSessions = latestWrite?.[GHOSTREADER_SESSIONS_KEY] as Array<{ id: string }> | undefined

    expect(persistedSessions).toHaveLength(20)
    expect(persistedSessions?.[0]?.id).toBe("session-24")
    expect(persistedSessions?.at(-1)?.id).toBe("session-5")
  })

  it("clears the active session key without deleting stored sessions", async () => {
    const remove = vi.fn(async () => undefined)
    const store = new ChromeGhostreaderSessionStore({
      storage: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => undefined),
        remove
      }
    })

    await store.clearActiveSession()

    expect(remove).toHaveBeenCalledWith(ACTIVE_GHOSTREADER_SESSION_ID_KEY)
  })
})
