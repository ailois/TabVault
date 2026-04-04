import type { RankedHybridResult } from "./rank-hybrid-results"

export type ActionCard = {
  id: "ask-current-page" | "ask-top-matches" | "open-dashboard"
  label?: string
}

export function buildActionCards(input: { hasCurrentPage: boolean; hasSavedMatches: boolean }): ActionCard[] {
  const actions: ActionCard[] = []

  if (input.hasCurrentPage) {
    actions.push({ id: "ask-current-page" })
  }

  if (input.hasSavedMatches) {
    actions.push({ id: "ask-top-matches" })
  }

  actions.push({ id: "open-dashboard" })
  return actions
}
