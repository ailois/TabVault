import type { GhostreaderQueryMode } from "../hybrid-retrieval/hybrid-types"

export const GHOSTREADER_MAX_SESSIONS = 20
export const GHOSTREADER_MAX_MESSAGES_PER_SESSION = 30
export const GHOSTREADER_MAX_WORKING_SET_BOOKMARK_IDS = 50
export const GHOSTREADER_MAX_BOOKMARK_EVENTS_PER_SESSION = 20

export type GhostreaderSessionStatus = "active" | "archived"
export type GhostreaderSessionMessageRole = "user" | "assistant" | "system"
export type GhostreaderIntentMemorySource = "rule-based" | "manual-reset"
export type GhostreaderBookmarkEventSource = "manual" | "page-save" | "session-action"

export type GhostreaderSessionMessage = {
  id: string
  role: GhostreaderSessionMessageRole
  text: string
  createdAt: string
  referencedBookmarkIds: string[]
  queryMode?: GhostreaderQueryMode
  retrievalSummary?: string
}

export type GhostreaderBookmarkEvent = {
  bookmarkId: string
  title: string
  url: string
  addedAt: string
  source: GhostreaderBookmarkEventSource
}

export type GhostreaderIntentMemory = {
  summary: string
  updatedAt: string | null
  source: GhostreaderIntentMemorySource
}

export type GhostreaderSession = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  status: GhostreaderSessionStatus
  messages: GhostreaderSessionMessage[]
  workingSetBookmarkIds: string[]
  bookmarksAddedInSession: GhostreaderBookmarkEvent[]
  intentMemory: GhostreaderIntentMemory
}

export function createEmptyGhostreaderSession(input: { id: string; title: string }): GhostreaderSession {
  const now = new Date().toISOString()

  return {
    id: input.id,
    title: input.title,
    createdAt: now,
    updatedAt: now,
    status: "active",
    messages: [],
    workingSetBookmarkIds: [],
    bookmarksAddedInSession: [],
    intentMemory: {
      summary: "",
      updatedAt: null,
      source: "rule-based"
    }
  }
}
