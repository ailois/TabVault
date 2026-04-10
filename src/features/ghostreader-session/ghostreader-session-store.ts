import {
  GHOSTREADER_MAX_MESSAGES_PER_SESSION,
  GHOSTREADER_MAX_SESSIONS,
  GHOSTREADER_MAX_WORKING_SET_BOOKMARK_IDS,
  type GhostreaderSession
} from "./ghostreader-session-types"

export const ACTIVE_GHOSTREADER_SESSION_ID_KEY = "active-ghostreader-session-id"
export const GHOSTREADER_SESSIONS_KEY = "ghostreader-sessions"
export const GHOSTREADER_SESSIONS_VERSION_KEY = "ghostreader-sessions-version"
export const GHOSTREADER_SESSIONS_VERSION = 1

type StorageShape = {
  get: (keys?: string | string[]) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
  remove: (keys: string | string[]) => Promise<void>
}

export type GhostreaderPersistedSessions = {
  activeSessionId: string | null
  sessions: GhostreaderSession[]
  version: number
}

type GhostreaderSessionStoreDeps = {
  storage?: StorageShape
}

function defaultStorage(): StorageShape {
  const localStorage = globalThis.chrome?.storage?.local
  if (localStorage) {
    return {
      get: async (keys?: string | string[]) => localStorage.get(keys),
      set: async (items: Record<string, unknown>) => localStorage.set(items),
      remove: async (keys: string | string[]) => localStorage.remove(keys)
    }
  }

  const memory = new Map<string, unknown>()

  return {
    get: async (keys?: string | string[]) => {
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, memory.get(key)]))
      }

      if (typeof keys === "string") {
        return { [keys]: memory.get(keys) }
      }

      return Object.fromEntries(memory.entries())
    },
    set: async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) {
        memory.set(key, value)
      }
    },
    remove: async (keys: string | string[]) => {
      const targets = Array.isArray(keys) ? keys : [keys]
      for (const key of targets) {
        memory.delete(key)
      }
    }
  }
}

function trimSession(session: GhostreaderSession): GhostreaderSession {
  return {
    ...session,
    messages: session.messages.slice(-GHOSTREADER_MAX_MESSAGES_PER_SESSION),
    workingSetBookmarkIds: session.workingSetBookmarkIds.slice(0, GHOSTREADER_MAX_WORKING_SET_BOOKMARK_IDS)
  }
}

function sortSessionsByUpdatedAt(sessions: GhostreaderSession[]): GhostreaderSession[] {
  return [...sessions].sort((left, right) => {
    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  })
}

function normalizeSessions(sessions: GhostreaderSession[]): GhostreaderSession[] {
  return sortSessionsByUpdatedAt(sessions)
    .slice(0, GHOSTREADER_MAX_SESSIONS)
    .map(trimSession)
}

export class ChromeGhostreaderSessionStore {
  private readonly storage: StorageShape

  constructor(deps: GhostreaderSessionStoreDeps = {}) {
    this.storage = deps.storage ?? defaultStorage()
  }

  async loadSessions(): Promise<GhostreaderPersistedSessions> {
    const result = await this.storage.get([
      ACTIVE_GHOSTREADER_SESSION_ID_KEY,
      GHOSTREADER_SESSIONS_KEY,
      GHOSTREADER_SESSIONS_VERSION_KEY
    ])

    const storedSessions = Array.isArray(result[GHOSTREADER_SESSIONS_KEY])
      ? (result[GHOSTREADER_SESSIONS_KEY] as GhostreaderSession[])
      : []
    const activeSessionId =
      typeof result[ACTIVE_GHOSTREADER_SESSION_ID_KEY] === "string"
        ? (result[ACTIVE_GHOSTREADER_SESSION_ID_KEY] as string)
        : null
    const version =
      typeof result[GHOSTREADER_SESSIONS_VERSION_KEY] === "number"
        ? (result[GHOSTREADER_SESSIONS_VERSION_KEY] as number)
        : GHOSTREADER_SESSIONS_VERSION

    return {
      activeSessionId,
      sessions: normalizeSessions(storedSessions),
      version
    }
  }

  async saveSessions(input: Pick<GhostreaderPersistedSessions, "activeSessionId" | "sessions">): Promise<void> {
    await this.storage.set({
      [ACTIVE_GHOSTREADER_SESSION_ID_KEY]: input.activeSessionId,
      [GHOSTREADER_SESSIONS_KEY]: normalizeSessions(input.sessions),
      [GHOSTREADER_SESSIONS_VERSION_KEY]: GHOSTREADER_SESSIONS_VERSION
    })
  }

  async clearActiveSession(): Promise<void> {
    await this.storage.remove(ACTIVE_GHOSTREADER_SESSION_ID_KEY)
  }
}
