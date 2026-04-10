import { normalizeQuery } from "../hybrid-retrieval/query-normalization"

import type { GhostreaderSession } from "./ghostreader-session-types"

export type GhostreaderReferenceSource =
  | "current-bookmark"
  | "working-set"
  | "added-in-session"
  | "latest-results"
  | null

export type GhostreaderReferenceResolution = {
  bookmarkIds: string[]
  isReferenceQuery: boolean
  source: GhostreaderReferenceSource
}

type GhostreaderReferenceContext = {
  session: GhostreaderSession
  currentBookmarkId?: string | null
  latestResultBookmarkIds?: string[]
}

const SINGULAR_REFERENCE_MARKERS = [
  "this bookmark",
  "this result",
  "这个书签",
  "这个结果",
  "该书签"
]
const PLURAL_REFERENCE_MARKERS = [
  "these bookmarks",
  "these results",
  "这些书签",
  "这些结果"
]
const RECENTLY_ADDED_REFERENCE_MARKERS = [
  "just added",
  "recently added",
  "刚加的",
  "刚添加的"
]
const PREVIOUS_RESULT_REFERENCE_MARKERS = [
  "last result",
  "previous result",
  "上一个结果",
  "上一条结果"
]

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}

export function isSessionReferenceQuery(query: string): boolean {
  const normalized = normalizeQuery(query)

  return [
    ...SINGULAR_REFERENCE_MARKERS,
    ...PLURAL_REFERENCE_MARKERS,
    ...RECENTLY_ADDED_REFERENCE_MARKERS,
    ...PREVIOUS_RESULT_REFERENCE_MARKERS
  ].some((marker) => normalized.includes(marker))
}

export function resolveSessionReferences(
  query: string,
  context: GhostreaderReferenceContext
): GhostreaderReferenceResolution {
  const normalized = normalizeQuery(query)
  const latestResultBookmarkIds = uniqueIds(context.latestResultBookmarkIds ?? [])
  const workingSetBookmarkIds = uniqueIds(context.session.workingSetBookmarkIds)
  const addedBookmarkIds = uniqueIds(context.session.bookmarksAddedInSession.map((event) => event.bookmarkId))

  if (!isSessionReferenceQuery(normalized)) {
    return {
      bookmarkIds: [],
      isReferenceQuery: false,
      source: null
    }
  }

  if (RECENTLY_ADDED_REFERENCE_MARKERS.some((marker) => normalized.includes(marker)) && addedBookmarkIds.length > 0) {
    return {
      bookmarkIds: addedBookmarkIds,
      isReferenceQuery: true,
      source: "added-in-session"
    }
  }

  if (PREVIOUS_RESULT_REFERENCE_MARKERS.some((marker) => normalized.includes(marker)) && latestResultBookmarkIds.length > 0) {
    return {
      bookmarkIds: latestResultBookmarkIds,
      isReferenceQuery: true,
      source: "latest-results"
    }
  }

  if (SINGULAR_REFERENCE_MARKERS.some((marker) => normalized.includes(marker))) {
    if (context.currentBookmarkId) {
      return {
        bookmarkIds: [context.currentBookmarkId],
        isReferenceQuery: true,
        source: "current-bookmark"
      }
    }

    if (workingSetBookmarkIds.length > 0) {
      return {
        bookmarkIds: [workingSetBookmarkIds[0]],
        isReferenceQuery: true,
        source: "working-set"
      }
    }

    if (addedBookmarkIds.length > 0) {
      return {
        bookmarkIds: [addedBookmarkIds[0]],
        isReferenceQuery: true,
        source: "added-in-session"
      }
    }

    if (latestResultBookmarkIds.length > 0) {
      return {
        bookmarkIds: [latestResultBookmarkIds[0]],
        isReferenceQuery: true,
        source: "latest-results"
      }
    }
  }

  if (PLURAL_REFERENCE_MARKERS.some((marker) => normalized.includes(marker))) {
    if (workingSetBookmarkIds.length > 0) {
      return {
        bookmarkIds: workingSetBookmarkIds,
        isReferenceQuery: true,
        source: "working-set"
      }
    }

    if (addedBookmarkIds.length > 0) {
      return {
        bookmarkIds: addedBookmarkIds,
        isReferenceQuery: true,
        source: "added-in-session"
      }
    }

    if (latestResultBookmarkIds.length > 0) {
      return {
        bookmarkIds: latestResultBookmarkIds,
        isReferenceQuery: true,
        source: "latest-results"
      }
    }
  }

  return {
    bookmarkIds: [],
    isReferenceQuery: true,
    source: null
  }
}
