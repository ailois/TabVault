import { describe, expect, it } from "vitest"
import { createEmptyBookmarkDraft } from "../../src/types/bookmark"

describe("createEmptyBookmarkDraft", () => {
  it("creates a bookmark draft with saved status and empty tags", () => {
    const draft = createEmptyBookmarkDraft({
      title: "Example",
      url: "https://example.com"
    })

    expect(draft.title).toBe("Example")
    expect(draft.url).toBe("https://example.com")
    expect(draft.status).toBe("saved")
    expect(draft.tags).toEqual([])
  })
})
