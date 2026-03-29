import { normalizeQuery } from "./query-normalization"
import type { SearchDocument } from "./search-documents"

export function buildCurrentPageDocument(input: {
  title?: string | null
  url?: string | null
  extractedText?: string | null
}): SearchDocument | null {
  const title = input.title?.trim()
  const url = input.url?.trim()
  const bodyText = input.extractedText?.trim()

  if (!title || !url || !bodyText) {
    return null
  }

  return {
    sourceType: "current-page",
    title,
    url,
    summary: undefined,
    tagsText: "",
    bodyText,
    combinedText: normalizeQuery(`${title} ${url} ${bodyText}`),
    updatedAt: new Date().toISOString()
  }
}
