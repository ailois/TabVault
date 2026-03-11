import type { AiProvider } from "../../lib/providers/provider"
import type { BookmarkRepository } from "../../lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../../types/bookmark"

export async function analyzeBookmark(input: {
  bookmark: BookmarkRecord
  provider: AiProvider
  bookmarkRepository: BookmarkRepository
  contentOverride?: string
}): Promise<BookmarkRecord> {
  const content = input.contentOverride ? input.contentOverride : normalizeContent(input.bookmark)
  const analyzingBookmark: BookmarkRecord = {
    ...input.bookmark,
    status: "analyzing",
    errorMessage: undefined,
    updatedAt: new Date().toISOString()
  }

  await input.bookmarkRepository.update(analyzingBookmark)

  try {
    const analysis = await input.provider.analyze({
      title: analyzingBookmark.title,
      url: analyzingBookmark.url,
      content
    })
    const analyzedBookmark: BookmarkRecord = {
      ...analyzingBookmark,
      summary: analysis.summary,
      tags: analysis.tags,
      status: "done",
      updatedAt: new Date().toISOString()
    }

    await input.bookmarkRepository.update(analyzedBookmark)

    return analyzedBookmark
  } catch (error) {
    const failedBookmark: BookmarkRecord = {
      ...analyzingBookmark,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Analysis failed",
      updatedAt: new Date().toISOString()
    }

    await input.bookmarkRepository.update(failedBookmark)

    throw error
  }
}

function normalizeContent(bookmark: BookmarkRecord): string {
  const extractedText = normalizeOptionalValue(bookmark.extractedText)

  if (extractedText) {
    return extractedText
  }

  const selectedText = normalizeOptionalValue(bookmark.selectedText)

  if (selectedText) {
    return selectedText
  }

  return bookmark.title.trim()
}

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim()

  return normalized ? normalized : undefined
}
