import type { GhostreaderBookmarkEvent } from "./ghostreader-session-types"

export type GhostreaderBookmarkAddedPayload = {
  bookmarkId: string
  title: string
  url: string
  source: GhostreaderBookmarkEvent["source"]
}

export type GhostreaderBookmarkAddedMessage = GhostreaderBookmarkAddedPayload & {
  type: "BOOKMARK_ADDED"
}

export function createGhostreaderBookmarkAddedMessage(
  payload: GhostreaderBookmarkAddedPayload
): GhostreaderBookmarkAddedMessage {
  return {
    type: "BOOKMARK_ADDED",
    ...payload
  }
}

export function isGhostreaderBookmarkAddedMessage(
  message: unknown
): message is GhostreaderBookmarkAddedMessage {
  if (!message || typeof message !== "object") {
    return false
  }

  const candidate = message as Partial<GhostreaderBookmarkAddedMessage>
  return (
    candidate.type === "BOOKMARK_ADDED" &&
    typeof candidate.bookmarkId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.url === "string" &&
    (candidate.source === "manual" || candidate.source === "page-save" || candidate.source === "session-action")
  )
}
