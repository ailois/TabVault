import type { GhostreaderQueryMode, QueryIntent } from "./hybrid-types"
import { normalizeQuery } from "./query-normalization"

const QUESTION_MARKERS = [
  "?",
  "？",
  "how",
  "what",
  "why",
  "\u4ec0\u4e48",
  "\u4e3a\u4ec0\u4e48",
  "\u600e\u4e48",
  "\u54ea\u4e2a",
  "\u54ea\u4e9b"
]
const MIXED_MARKERS = ["compare", "across", "with my saved"]
const GHOSTREADER_CROSS_BOOKMARK_MARKERS = [
  "which bookmarks",
  "what bookmarks",
  "bookmarks mention",
  "bookmark mentions",
  "my saved bookmarks",
  "saved bookmarks",
  "saved bookmark",
  "related bookmarks",
  "across bookmarks",
  "which site",
  "which website",
  "what site",
  "what website",
  "compare bookmarks",
  "\u54ea\u4e9b\u4e66\u7b7e",
  "\u4e66\u7b7e\u6709\u54ea\u4e9b",
  "\u54ea\u4e2a\u7f51\u7ad9",
  "\u7f51\u7ad9\u662f\u54ea\u4e2a",
  "\u54ea\u4e9b\u7f51\u7ad9",
  "\u6211\u6536\u85cf\u91cc",
  "\u6211\u7684\u4e66\u7b7e",
  "\u76f8\u5173\u4e66\u7b7e",
  "\u8fd8\u6709\u54ea\u4e9b",
  "\u54ea\u51e0\u4e2a\u4e66\u7b7e",
  "\u5bf9\u6bd4\u4e66\u7b7e"
]
const GHOSTREADER_CURRENT_ONLY_MARKERS = [
  "this bookmark",
  "current bookmark",
  "this page",
  "current page",
  "summarize this",
  "summary of this",
  "summarize",
  "summarise",
  "explain this",
  "translate this",
  "key points",
  "tl;dr",
  "tldr",
  "\u8fd9\u4e2a\u4e66\u7b7e",
  "\u5f53\u524d\u4e66\u7b7e",
  "\u8fd9\u7bc7",
  "\u5f53\u524d\u9875\u9762",
  "\u603b\u7ed3",
  "\u6458\u8981",
  "\u6982\u62ec",
  "\u89e3\u91ca",
  "\u7ffb\u8bd1",
  "\u63d0\u70bc",
  "\u8981\u70b9",
  "\u8fd9\u7bc7\u6587\u7ae0",
  "\u8fd9\u4e2a\u9875\u9762"
]
const GHOSTREADER_SESSION_REFERENCE_MARKERS = [
  "this bookmark",
  "this result",
  "these bookmarks",
  "these results",
  "just added",
  "recently added",
  "\u8fd9\u4e2a\u4e66\u7b7e",
  "\u8fd9\u4e9b\u4e66\u7b7e",
  "\u521a\u52a0\u7684",
  "\u521a\u6dfb\u52a0\u7684",
  "\u4e0a\u4e00\u4e2a\u7ed3\u679c"
]

export function detectQueryIntent(query: string): QueryIntent {
  const normalized = normalizeQuery(query)

  if (!normalized) {
    return "retrieve"
  }

  if (MIXED_MARKERS.some((marker) => normalized.includes(marker))) {
    return "mixed"
  }

  if (QUESTION_MARKERS.some((marker) => normalized.includes(marker))) {
    return "answer"
  }

  return "retrieve"
}

export function detectGhostreaderQueryMode(query: string): GhostreaderQueryMode {
  const normalized = normalizeQuery(query)

  if (!normalized) {
    return "current-only"
  }

  if (GHOSTREADER_CROSS_BOOKMARK_MARKERS.some((marker) => normalized.includes(marker))) {
    return "cross-bookmark"
  }

  if (GHOSTREADER_CURRENT_ONLY_MARKERS.some((marker) => normalized.includes(marker))) {
    return "current-only"
  }

  return "current-only"
}

export function isSessionReferenceQuery(query: string): boolean {
  const normalized = normalizeQuery(query)

  if (!normalized) {
    return false
  }

  return GHOSTREADER_SESSION_REFERENCE_MARKERS.some((marker) => normalized.includes(marker))
}
