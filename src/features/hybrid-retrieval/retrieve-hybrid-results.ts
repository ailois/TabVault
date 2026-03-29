import type { BookmarkRecord } from "../../types/bookmark"
import { buildCurrentPageDocument } from "./current-page-context"
import { rankHybridResults } from "./rank-hybrid-results"
import { buildBookmarkSearchDocument } from "./search-documents"

export async function retrieveHybridResults(input: {
  query: string
  currentPage: {
    title?: string | null
    url?: string | null
    extractedText?: string | null
  }
  listBookmarks: () => Promise<BookmarkRecord[]>
}) {
  const bookmarks = await input.listBookmarks()
  const savedDocuments = bookmarks.map(buildBookmarkSearchDocument)
  const currentPageDocument = buildCurrentPageDocument(input.currentPage)
  const allDocuments = currentPageDocument ? [currentPageDocument, ...savedDocuments] : savedDocuments

  return rankHybridResults(allDocuments, input.query)
}
