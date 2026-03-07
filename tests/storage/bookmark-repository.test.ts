import { beforeEach, describe, expect, it } from "vitest"

import type { BookmarkRecord } from "../../src/types/bookmark"
import { IndexedDbBookmarkRepository } from "../../src/lib/storage/indexeddb-bookmark-repository"
import type { BookmarkStorage } from "../../src/lib/storage/db"

class InMemoryBookmarkStorage implements BookmarkStorage {
  private readonly records = new Map<string, BookmarkRecord>()

  async put(bookmark: BookmarkRecord): Promise<void> {
    this.records.set(bookmark.id, bookmark)
  }

  async get(id: string): Promise<BookmarkRecord | null> {
    return this.records.get(id) ?? null
  }

  async getAll(): Promise<BookmarkRecord[]> {
    return Array.from(this.records.values()).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    )
  }
}

describe("IndexedDbBookmarkRepository", () => {
  let repository: IndexedDbBookmarkRepository

  beforeEach(() => {
    repository = new IndexedDbBookmarkRepository(new InMemoryBookmarkStorage())
  })

  it("saves bookmarks and lists them in created order", async () => {
    const firstBookmark = createBookmark({
      id: "bookmark-1",
      title: "First",
      createdAt: "2026-03-07T10:00:00.000Z",
      updatedAt: "2026-03-07T10:00:00.000Z"
    })
    const secondBookmark = createBookmark({
      id: "bookmark-2",
      title: "Second",
      createdAt: "2026-03-07T10:01:00.000Z",
      updatedAt: "2026-03-07T10:01:00.000Z"
    })

    await repository.save(firstBookmark)
    await repository.save(secondBookmark)

    await expect(repository.list()).resolves.toEqual([firstBookmark, secondBookmark])
  })

  it("returns null when a bookmark does not exist", async () => {
    await expect(repository.getById("missing-bookmark")).resolves.toBeNull()
  })

  it("gets a saved bookmark by id", async () => {
    const bookmark = createBookmark({ id: "bookmark-1" })

    await repository.save(bookmark)

    await expect(repository.getById(bookmark.id)).resolves.toEqual(bookmark)
  })

  it("updates an existing bookmark", async () => {
    const bookmark = createBookmark({
      id: "bookmark-1",
      title: "Original title",
      updatedAt: "2026-03-07T10:00:00.000Z"
    })
    const updatedBookmark: BookmarkRecord = {
      ...bookmark,
      title: "Updated title",
      status: "done",
      tags: ["ai", "saved"],
      summary: "Summary",
      updatedAt: "2026-03-07T10:05:00.000Z"
    }

    await repository.save(bookmark)
    await repository.update(updatedBookmark)

    await expect(repository.getById(bookmark.id)).resolves.toEqual(updatedBookmark)
    await expect(repository.list()).resolves.toEqual([updatedBookmark])
  })
})

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-default",
    url: "https://example.com",
    title: "Example",
    tags: [],
    status: "saved",
    createdAt: "2026-03-07T10:00:00.000Z",
    updatedAt: "2026-03-07T10:00:00.000Z",
    ...overrides
  }
}
