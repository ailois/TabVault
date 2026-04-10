import type { GhostreaderQueryMode } from "../hybrid-retrieval/hybrid-types"

import {
  GHOSTREADER_MAX_BOOKMARK_EVENTS_PER_SESSION,
  GHOSTREADER_MAX_MESSAGES_PER_SESSION,
  GHOSTREADER_MAX_WORKING_SET_BOOKMARK_IDS,
  type GhostreaderBookmarkEvent,
  type GhostreaderSession,
  type GhostreaderSessionMessage
} from "./ghostreader-session-types"

type AppendUserMessageInput = {
  id: string
  text: string
  queryMode: GhostreaderQueryMode
  referencedBookmarkIds?: string[]
  retrievalSummary?: string
}

type AppendAssistantMessageInput = {
  id: string
  text: string
  referencedBookmarkIds?: string[]
  retrievalSummary?: string
}

type RecordBookmarkAddedEventInput = {
  bookmarkId: string
  title: string
  url: string
  source: GhostreaderBookmarkEvent["source"]
}

function nowIso(previousIso?: string): string {
  const now = Date.now()
  const previous = previousIso ? Date.parse(previousIso) : Number.NaN

  if (!Number.isNaN(previous) && now <= previous) {
    return new Date(previous + 1).toISOString()
  }

  return new Date(now).toISOString()
}

function trimMessages(messages: GhostreaderSessionMessage[]): GhostreaderSessionMessage[] {
  return messages.slice(-GHOSTREADER_MAX_MESSAGES_PER_SESSION)
}

function dedupeBookmarkIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const next: string[] = []

  for (const id of ids) {
    if (!id || seen.has(id)) {
      continue
    }

    seen.add(id)
    next.push(id)
  }

  return next.slice(0, GHOSTREADER_MAX_WORKING_SET_BOOKMARK_IDS)
}

export function touchSession(session: GhostreaderSession, updatedAt = nowIso(session.updatedAt)): GhostreaderSession {
  return {
    ...session,
    updatedAt
  }
}

export function appendUserMessage(session: GhostreaderSession, input: AppendUserMessageInput): GhostreaderSession {
  const createdAt = nowIso(session.updatedAt)
  const nextMessage: GhostreaderSessionMessage = {
    id: input.id,
    role: "user",
    text: input.text,
    createdAt,
    queryMode: input.queryMode,
    referencedBookmarkIds: input.referencedBookmarkIds ?? [],
    retrievalSummary: input.retrievalSummary
  }

  return {
    ...touchSession(session, createdAt),
    messages: trimMessages([...session.messages, nextMessage])
  }
}

export function appendAssistantMessage(
  session: GhostreaderSession,
  input: AppendAssistantMessageInput
): GhostreaderSession {
  const createdAt = nowIso(session.updatedAt)
  const nextMessage: GhostreaderSessionMessage = {
    id: input.id,
    role: "assistant",
    text: input.text,
    createdAt,
    referencedBookmarkIds: input.referencedBookmarkIds ?? [],
    retrievalSummary: input.retrievalSummary
  }

  return {
    ...touchSession(session, createdAt),
    messages: trimMessages([...session.messages, nextMessage])
  }
}

export function replaceWorkingSet(session: GhostreaderSession, bookmarkIds: string[]): GhostreaderSession {
  return {
    ...touchSession(session),
    workingSetBookmarkIds: dedupeBookmarkIds(bookmarkIds)
  }
}

export function recordBookmarkAddedEvent(
  session: GhostreaderSession,
  input: RecordBookmarkAddedEventInput
): GhostreaderSession {
  const addedAt = nowIso(session.updatedAt)
  const nextEvent: GhostreaderBookmarkEvent = {
    bookmarkId: input.bookmarkId,
    title: input.title,
    url: input.url,
    source: input.source,
    addedAt
  }
  const nextEvents = [...session.bookmarksAddedInSession, nextEvent].slice(-GHOSTREADER_MAX_BOOKMARK_EVENTS_PER_SESSION)
  const nextMessage: GhostreaderSessionMessage = {
    id: `event-${input.bookmarkId}-${addedAt}`,
    role: "system",
    text: `Added bookmark: ${input.title}`,
    createdAt: addedAt,
    referencedBookmarkIds: [input.bookmarkId]
  }

  return {
    ...touchSession(session, addedAt),
    bookmarksAddedInSession: nextEvents,
    workingSetBookmarkIds: dedupeBookmarkIds([input.bookmarkId, ...session.workingSetBookmarkIds]),
    messages: trimMessages([...session.messages, nextMessage])
  }
}
