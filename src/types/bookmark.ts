export type BookmarkRecord = {
  id: string
  parentId?: string
  url: string
  title: string
  selectedText?: string
  extractedText?: string
  summary?: string
  aiTags: string[]
  userTags: string[]
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
    aiTags: [],
    userTags: [],
    status: "saved",
    createdAt: now,
    updatedAt: now
  }
}
