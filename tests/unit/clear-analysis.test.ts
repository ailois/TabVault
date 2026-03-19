// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { IndexedDbBookmarkRepository } from "../../src/lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRecord } from "../../src/types/bookmark"

function makeBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bm-1",
    title: "Test",
    url: "https://example.com",
    aiTags: ["ai", "research"],
    userTags: [],
    summary: "Some summary",
    provider: "claude",
    model: "claude-sonnet-4-5",
    status: "done",
    errorMessage: "prior error",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  } as BookmarkRecord
}

describe("clearAnalysis", () => {
  it("resets analysis fields and sets status to saved", async () => {
    const bookmark = makeBookmark()
    const putSpy = vi.fn(async (_b: BookmarkRecord) => {})
    const getSpy = vi.fn(async () => bookmark)

    const storage = { put: putSpy, get: getSpy, getAll: vi.fn(async () => [bookmark]), delete: vi.fn() }
    const repo = new IndexedDbBookmarkRepository(storage as any)

    await repo.clearAnalysis("bm-1")

    expect(putSpy).toHaveBeenCalledOnce()
    const call = putSpy.mock.calls[0]
    if (!call) throw new Error("putSpy was not called")
    const saved = call[0] as BookmarkRecord
    expect(saved.summary).toBeUndefined()
    expect(saved.aiTags).toEqual([])
    expect(saved.userTags).toEqual([])
    expect(saved.provider).toBeUndefined()
    expect(saved.model).toBeUndefined()
    expect(saved.errorMessage).toBeUndefined()
    expect(saved.status).toBe("saved")
  })

  it("clearAllAnalysis resets all bookmarks that have analysis", async () => {
    const b1 = makeBookmark({ id: "b1", status: "done", summary: "s1", aiTags: ["t1"] })
    const b2 = makeBookmark({ id: "b2", status: "saved", summary: undefined, aiTags: [] })
    const putSpy = vi.fn(async (_b: BookmarkRecord) => {})

    const storage = {
      put: putSpy,
      get: vi.fn(),
      getAll: vi.fn(async () => [b1, b2]),
      delete: vi.fn()
    }
    const repo = new IndexedDbBookmarkRepository(storage as any)

    await repo.clearAllAnalysis()

    const savedIds = putSpy.mock.calls.map((c) => {
      const b = c[0] as BookmarkRecord
      return b.id
    })
    expect(savedIds).toContain("b1")
    const callB1 = putSpy.mock.calls.find((c) => {
      const b = c[0] as BookmarkRecord
      return b.id === "b1"
    })
    if (!callB1) throw new Error("b1 was not saved")
    const savedB1 = callB1[0] as BookmarkRecord
    expect(savedB1.summary).toBeUndefined()
    expect(savedB1.aiTags).toEqual([])
    expect(savedB1.userTags).toEqual([])
    expect(savedB1.status).toBe("saved")
  })
})
