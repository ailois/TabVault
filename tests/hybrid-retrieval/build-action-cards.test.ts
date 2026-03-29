import { describe, expect, it } from "vitest"
import { buildActionCards } from "../../src/features/hybrid-retrieval/build-action-cards"

describe("buildActionCards", () => {
  it("offers ask-current-page and ask-top-matches actions when both sources are present", () => {
    const actions = buildActionCards({ hasCurrentPage: true, hasSavedMatches: true })

    expect(actions.map((action) => action.id)).toEqual([
      "ask-current-page",
      "ask-top-matches",
      "open-dashboard"
    ])
  })
})
