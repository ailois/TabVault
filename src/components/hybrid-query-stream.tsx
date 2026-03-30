import React from "react"
import type { ActionCard } from "../features/hybrid-retrieval/build-action-cards"
import type { AnswerBlock } from "../features/hybrid-retrieval/build-answer-block"
import type { RankedHybridResult } from "../features/hybrid-retrieval/rank-hybrid-results"

export function HybridQueryStream(input: {
  query: string
  rankedResults: RankedHybridResult[]
  actions: ActionCard[]
  answer?: AnswerBlock | null
  onOpenBookmark?: (bookmarkId: string) => void
  onAction?: (actionId: ActionCard["id"]) => void
}) {
  const currentPageResults = input.rankedResults.filter((result) => result.document.sourceType === "current-page")
  const savedBookmarkResults = input.rankedResults.filter((result) => result.document.sourceType === "saved-bookmark")

  return (
    <section aria-label="Hybrid query stream">
      <div>{input.query}</div>
      {currentPageResults.length > 0 ? <div>Current page match</div> : null}
      {currentPageResults.map((result) => <div key={`${result.document.url}-current`}>{result.document.title}</div>)}
      {savedBookmarkResults.length > 0 ? <div>Saved bookmarks</div> : null}
      {savedBookmarkResults.map((result) => (
        <button key={result.document.bookmarkId} onClick={() => result.document.bookmarkId && input.onOpenBookmark?.(result.document.bookmarkId)} type="button">
          {result.document.title}
        </button>
      ))}
      {input.actions.map((action) => (
        <button key={action.id} onClick={() => input.onAction?.(action.id)} type="button">
          {action.label}
        </button>
      ))}
      {input.answer ? (
        <article>
          <p>{input.answer.text}</p>
          {input.answer.citations.map((citation, index) => (
            <div key={`${citation.sourceType}:${citation.url}:${citation.title}:${index}`}>{citation.title}</div>
          ))}
        </article>
      ) : null}
    </section>
  )
}
