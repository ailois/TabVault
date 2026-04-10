import type { GhostreaderQueryMode } from "../hybrid-retrieval/hybrid-types"
import type {
  GhostreaderInheritedMemory,
  GhostreaderSession,
  GhostreaderSessionMessage
} from "./ghostreader-session-types"

export type GhostreaderSessionSnapshot = {
  query: string
  mode: GhostreaderQueryMode
  answerText: string | null
  referencedBookmarkIds: string[]
}

export function getGhostreaderTranscript(session: GhostreaderSession | null): GhostreaderSessionMessage[] {
  return session?.messages ?? []
}

function hasSuccessfulAssistantMessage(session: GhostreaderSession): boolean {
  return session.messages.some(
    (message) => message.role === "assistant" && !message.isError && message.text.trim().length > 0
  )
}

function getSuccessfulUserTurns(session: GhostreaderSession): GhostreaderSessionMessage[] {
  const successfulUserTurns: GhostreaderSessionMessage[] = []
  let pendingUserTurn: GhostreaderSessionMessage | null = null

  for (const message of session.messages) {
    if (message.role === "user") {
      pendingUserTurn = message.text.trim().length > 0 ? message : null
      continue
    }

    if (message.role === "assistant" && pendingUserTurn) {
      if (!message.isError && message.text.trim().length > 0) {
        successfulUserTurns.push(pendingUserTurn)
      }

      pendingUserTurn = null
    }
  }

  return successfulUserTurns
}

export function buildGhostreaderInheritedMemory(
  sessions: GhostreaderSession[],
  activeSessionId: string | null
): GhostreaderInheritedMemory {
  const sourceSessions = [...sessions]
    .filter((session) => session.id !== activeSessionId)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .filter((session) => hasSuccessfulAssistantMessage(session))
    .slice(0, 3)

  const recentTopicSummary = sourceSessions
    .flatMap((session) => getSuccessfulUserTurns(session))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 3)
    .map((message) => message.text)
    .join("；")

  const bookmarkIds = Array.from(
    new Set(
      sourceSessions.flatMap((session) => [
        ...session.followUpMemory.lastReferencedBookmarkIds,
        ...session.workingSetBookmarkIds
      ])
    )
  ).slice(0, 10)

  return {
    recentTopicSummary,
    bookmarkIds,
    sourceSessionIds: sourceSessions.map((session) => session.id)
  }
}

function findLastMessage(
  messages: GhostreaderSessionMessage[],
  predicate: (message: GhostreaderSessionMessage) => boolean
): GhostreaderSessionMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message && predicate(message)) {
      return message
    }
  }

  return null
}

export function getGhostreaderSessionSnapshot(
  session: GhostreaderSession | null
): GhostreaderSessionSnapshot | null {
  if (!session) {
    return null
  }

  const lastUserMessage = findLastMessage(session.messages, (message) => message.role === "user")
  if (!lastUserMessage) {
    return null
  }

  const lastAssistantMessage = findLastMessage(session.messages, (message) => {
    return message.role === "assistant" && message.createdAt >= lastUserMessage.createdAt
  })

  return {
    query: lastUserMessage.text,
    mode: lastUserMessage.queryMode ?? "current-only",
    answerText: lastAssistantMessage?.text ?? null,
    referencedBookmarkIds: Array.from(
      new Set([
        ...(lastAssistantMessage?.referencedBookmarkIds ?? []),
        ...lastUserMessage.referencedBookmarkIds,
        ...session.followUpMemory.lastReferencedBookmarkIds,
        ...session.workingSetBookmarkIds
      ])
    )
  }
}
