import { normalizeQuery } from "../hybrid-retrieval/query-normalization"

import type { GhostreaderSession } from "./ghostreader-session-types"

export type GhostreaderReferenceSource =
  | "current-bookmark"
  | "working-set"
  | "added-in-session"
  | "latest-results"
  | "follow-up-memory"
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
const FOLLOW_UP_MEMORY_REFERENCE_MARKERS = ["刚才那个", "上面那个", "那个", "这个"]
const ORDINAL_RESULT_PATTERNS: Array<{ pattern: RegExp; index: (resultCount: number) => number | null }> = [
  { pattern: /第一个结果|第一条|第一个/u, index: () => 0 },
  { pattern: /第二个结果|第二条|第二个/u, index: () => 1 },
  { pattern: /第三个结果|第三条|第三个/u, index: () => 2 },
  { pattern: /最后一个结果|最后一条|最后一个/u, index: (resultCount) => (resultCount > 0 ? resultCount - 1 : null) }
]
const SHORT_FOLLOW_UP_MARKERS = [
  "为什么",
  "具体呢",
  "展开说说",
  "值得收藏吗",
  "值得收藏",
  "有什么价值",
  "再总结一下"
]

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}

function isShortFollowUpQuery(normalized: string): boolean {
  return SHORT_FOLLOW_UP_MARKERS.some((marker) => normalized.includes(marker)) || normalized.length <= 6
}

function resolveOrdinalResultBookmarkId(normalized: string, latestResultBookmarkIds: string[]): string[] {
  for (const { pattern, index } of ORDINAL_RESULT_PATTERNS) {
    if (!pattern.test(normalized)) {
      continue
    }

    const resolvedIndex = index(latestResultBookmarkIds.length)
    if (resolvedIndex == null || resolvedIndex < 0 || resolvedIndex >= latestResultBookmarkIds.length) {
      return []
    }

    return [latestResultBookmarkIds[resolvedIndex]]
  }

  return []
}

export function isSessionReferenceQuery(query: string): boolean {
  const normalized = normalizeQuery(query)

  return [
    ...SINGULAR_REFERENCE_MARKERS,
    ...PLURAL_REFERENCE_MARKERS,
    ...RECENTLY_ADDED_REFERENCE_MARKERS,
    ...PREVIOUS_RESULT_REFERENCE_MARKERS,
    ...FOLLOW_UP_MEMORY_REFERENCE_MARKERS,
    ...SHORT_FOLLOW_UP_MARKERS
  ].some((marker) => normalized.includes(marker)) || ORDINAL_RESULT_PATTERNS.some(({ pattern }) => pattern.test(normalized))
}

export function resolveSessionReferences(
  query: string,
  context: GhostreaderReferenceContext
): GhostreaderReferenceResolution {
  const normalized = normalizeQuery(query)
  const latestResultBookmarkIds = uniqueIds(context.latestResultBookmarkIds ?? [])
  const workingSetBookmarkIds = uniqueIds(context.session.workingSetBookmarkIds)
  const addedBookmarkIds = uniqueIds(context.session.bookmarksAddedInSession.map((event) => event.bookmarkId))
  const followUpMemoryBookmarkIds = uniqueIds(context.session.followUpMemory.lastReferencedBookmarkIds)

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

  const ordinalBookmarkIds = resolveOrdinalResultBookmarkId(normalized, latestResultBookmarkIds)
  if (ordinalBookmarkIds.length > 0) {
    return {
      bookmarkIds: ordinalBookmarkIds,
      isReferenceQuery: true,
      source: "latest-results"
    }
  }

  if (FOLLOW_UP_MEMORY_REFERENCE_MARKERS.some((marker) => normalized.includes(marker)) && followUpMemoryBookmarkIds.length > 0) {
    return {
      bookmarkIds: followUpMemoryBookmarkIds,
      isReferenceQuery: true,
      source: "follow-up-memory"
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

  if (isShortFollowUpQuery(normalized)) {
    return {
      bookmarkIds: followUpMemoryBookmarkIds,
      isReferenceQuery: true,
      source: followUpMemoryBookmarkIds.length > 0 ? "follow-up-memory" : null
    }
  }

  return {
    bookmarkIds: [],
    isReferenceQuery: true,
    source: null
  }
}
