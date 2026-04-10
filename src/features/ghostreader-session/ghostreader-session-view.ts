import type { GhostreaderQueryMode } from "../hybrid-retrieval/hybrid-types"
import type { GhostreaderSession, GhostreaderSessionMessage } from "./ghostreader-session-types"

export type GhostreaderSessionSnapshot = {
  query: string
  mode: GhostreaderQueryMode
  answerText: string | null
  referencedBookmarkIds: string[]
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
        ...session.workingSetBookmarkIds
      ])
    )
  }
}
