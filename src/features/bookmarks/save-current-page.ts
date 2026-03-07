import type { BookmarkRepository } from "../../lib/storage/bookmark-repository"
import { createEmptyBookmarkDraft, type BookmarkRecord } from "../../types/bookmark"

export type ActiveTabBookmarkSource = {
  title?: string | null
  url?: string | null
}

export async function saveCurrentPage(input: {
  activeTab: ActiveTabBookmarkSource
  extractedText?: string | null
  bookmarkRepository: BookmarkRepository
}): Promise<BookmarkRecord> {
  const title = normalizeRequiredValue(input.activeTab.title, "Active tab title is required")
  const url = normalizeRequiredValue(input.activeTab.url, "Active tab URL is required")
  const extractedText = normalizeOptionalValue(input.extractedText)
  const bookmark = createEmptyBookmarkDraft({ title, url })

  if (extractedText) {
    bookmark.extractedText = extractedText
  }

  await input.bookmarkRepository.save(bookmark)

  return bookmark
}

function normalizeRequiredValue(value: string | null | undefined, errorMessage: string): string {
  const normalized = normalizeOptionalValue(value)

  if (!normalized) {
    throw new Error(errorMessage)
  }

  return normalized
}

function normalizeOptionalValue(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()

  return normalized ? normalized : undefined
}
