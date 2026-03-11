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
    return this.storage.get(id)
  }

  async update(bookmark: BookmarkRecord): Promise<void> {
    await this.storage.put(bookmark)
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id)
  }
}
