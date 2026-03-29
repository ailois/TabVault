import type { QueryIntent } from "./hybrid-types"
import { normalizeQuery } from "./query-normalization"

const QUESTION_MARKERS = ["?", "？", "什么", "为什么", "how", "what", "why"]
const MIXED_MARKERS = ["compare", "对比", "结合", "across", "with my saved"]

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
