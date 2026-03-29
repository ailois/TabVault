import { normalizeQuery, tokenizeQuery } from "./query-normalization"
import type { SearchDocument } from "./search-documents"

export type RankedHybridResult = {
  document: SearchDocument
  score: number
  matchReason: "current page" | "title" | "tag" | "AI summary" | "extracted text" | "URL"
}

export function rankHybridResults(documents: SearchDocument[], query: string): RankedHybridResult[] {
  const normalized = normalizeQuery(query)
  if (!normalized) return []

  const tokens = tokenizeQuery(query)

  return documents
    .map((document) => {
      const titleHit = tokens.some((token) => document.title.toLocaleLowerCase().includes(token))
      const tagHit = tokens.some((token) => document.tagsText.toLocaleLowerCase().includes(token))
      const summaryHit = tokens.some((token) => (document.summary ?? "").toLocaleLowerCase().includes(token))
      const bodyHit = tokens.some((token) => document.bodyText.toLocaleLowerCase().includes(token))
      const urlHit = tokens.some((token) => document.url.toLocaleLowerCase().includes(token))

      if (!(titleHit || tagHit || summaryHit || bodyHit || urlHit)) {
        return null
      }

      let score = 0
      let matchReason: RankedHybridResult["matchReason"] = "URL"

      if (document.sourceType === "current-page" && (titleHit || bodyHit)) {
        score += 120
        matchReason = "current page"
      }
      if (titleHit) {
        score += 100
        matchReason = document.sourceType === "current-page" ? "current page" : "title"
      } else if (tagHit) {
        score += 80
        matchReason = "tag"
      } else if (summaryHit) {
        score += 60
        matchReason = "AI summary"
      } else if (bodyHit) {
        score += 40
        matchReason = document.sourceType === "current-page" ? "current page" : "extracted text"
      } else if (urlHit) {
        score += 20
        matchReason = "URL"
      }

      return { document, score, matchReason }
    })
    .filter((result): result is RankedHybridResult => result !== null)
    .sort((left, right) => right.score - left.score)
}
