import React from "react"

type HybridContextBarProps = {
  currentPageTitle?: string
  indexedBookmarkCount: number
}

export function HybridContextBar({ currentPageTitle, indexedBookmarkCount }: HybridContextBarProps) {
  return (
    <section aria-label="Hybrid retrieval context">
      <div>Current page: {currentPageTitle ?? "Unavailable"}</div>
      <div>Library: {indexedBookmarkCount} bookmarks indexed</div>
      <div>Hybrid local search enabled</div>
    </section>
  )
}
