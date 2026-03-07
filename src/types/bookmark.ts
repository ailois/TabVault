export type BookmarkRecord = {
  id: string
  url: string
  title: string
  selectedText?: string
  extractedText?: string
  summary?: string
  tags: string[]
  provider?: "openai" | "claude" | "gemini"
  model?: string
  status: "saved" | "analyzing" | "done" | "error"
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export function createEmptyBookmarkDraft(input: {
  title: string
  url: string
}): BookmarkRecord {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    title: input.title,
    url: input.url,
    tags: [],
    status: "saved",
    createdAt: now,
    updatedAt: now
  }
}
