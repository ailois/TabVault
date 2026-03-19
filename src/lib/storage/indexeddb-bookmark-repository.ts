import type { BookmarkRecord } from "../../types/bookmark"

import { IndexedDbBookmarkStorage, type BookmarkStorage } from "./db"
import type { BookmarkRepository } from "./bookmark-repository"

export class IndexedDbBookmarkRepository implements BookmarkRepository {
  constructor(private readonly storage: BookmarkStorage = new IndexedDbBookmarkStorage()) {}

  async save(bookmark: BookmarkRecord): Promise<void> {
    await this.storage.put(bookmark)
  }

  async list(): Promise<BookmarkRecord[]> {
    const bookmarks = await this.storage.getAll()

    return bookmarks.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }

  async getById(id: string): Promise<BookmarkRecord | null> {
    const record = await this.storage.get(id)
    return record ?? null
  }

  async update(bookmark: BookmarkRecord): Promise<void> {
    await this.storage.put(bookmark)
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id)
  }

  async clearAnalysis(id: string): Promise<void> {
    const bookmark = await this.getById(id)
    if (!bookmark) return

    await this.storage.put(clearAnalysisFields(bookmark, new Date().toISOString()))
  }

  async clearAllAnalysis(): Promise<void> {
    const bookmarks = await this.storage.getAll()
    const toReset = bookmarks.filter(
      (b) => b.status === "done" || b.status === "error" || b.status === "analyzing" || b.summary || b.aiTags.length > 0 || b.userTags.length > 0
    )
    const now = new Date().toISOString()

    await Promise.all(toReset.map((b) => this.storage.put(clearAnalysisFields(b, now))))
  }

  async clearErrorAnalysis(): Promise<void> {
    const bookmarks = await this.storage.getAll()
    const toReset = bookmarks.filter((b) => b.status === "error")
    const now = new Date().toISOString()

    await Promise.all(toReset.map((b) => this.storage.put(clearAnalysisFields(b, now))))
  }
}

function clearAnalysisFields(bookmark: BookmarkRecord, updatedAt: string): BookmarkRecord {
  return {
    ...bookmark,
    summary: undefined,
    aiTags: [],
    userTags: [],
    provider: undefined,
    model: undefined,
    errorMessage: undefined,
    status: "saved",
    updatedAt
  }
}
