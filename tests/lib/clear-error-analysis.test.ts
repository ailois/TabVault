// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { IndexedDbBookmarkRepository } from "../../src/lib/storage/indexeddb-bookmark-repository"

describe("clearErrorAnalysis", () => {
  it("resets only error records, leaving done records intact", async () => {
    const now = new Date().toISOString()
    const errorRecord = { id: "1", url: "https://a.com", title: "A", aiTags: [], userTags: [], status: "error" as const, createdAt: now, updatedAt: now, errorMessage: "fail", summary: "old", provider: "openai" as const, model: "gpt" }
    const doneRecord = { id: "2", url: "https://b.com", title: "B", aiTags: ["x"], userTags: [], status: "done" as const, createdAt: now, updatedAt: now, summary: "done summary", provider: "claude" as const, model: "claude-3" }

    const putCalls: unknown[] = []
    const mockStorage = {
      getAll: vi.fn().mockResolvedValue([errorRecord, doneRecord]),
      put: vi.fn(async (record: unknown) => { putCalls.push(record) }),
      get: vi.fn(),
      delete: vi.fn()
    }

    const repo = new IndexedDbBookmarkRepository(mockStorage as any)
    await repo.clearErrorAnalysis()

    expect(putCalls).toHaveLength(1)
    const cleared = putCalls[0] as typeof errorRecord
    expect(cleared.id).toBe("1")
    expect(cleared.status).toBe("saved")
    expect(cleared.summary).toBeUndefined()
    expect(cleared.aiTags).toEqual([])
    expect(cleared.userTags).toEqual([])
    expect(cleared.errorMessage).toBeUndefined()
  })
})
