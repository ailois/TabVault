import type { RankedHybridResult } from "./rank-hybrid-results"

export type AnswerCitation = {
  sourceType: "current-page" | "saved-bookmark"
  title: string
  url: string
  matchReason: string
}

export type AnswerBlock = {
  text: string
  citations: AnswerCitation[]
}

export function buildAnswerBlock(input: {
  query: string
  rankedResults: RankedHybridResult[]
}): AnswerBlock {
  const citations = input.rankedResults.slice(0, 3).map((result) => ({
    sourceType: result.document.sourceType,
    title: result.document.title,
    url: result.document.url,
    matchReason: result.matchReason
  }))

  const text = citations.length > 0
    ? `Based on ${citations.map((citation) => citation.title).join(", ")}, here are the most relevant local results for: ${input.query}`
    : `No local results found for: ${input.query}`

  return { text, citations }
}
