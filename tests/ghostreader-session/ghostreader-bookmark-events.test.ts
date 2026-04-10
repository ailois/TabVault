import { describe, expect, it } from "vitest"

import {
  createGhostreaderBookmarkAddedMessage,
  isGhostreaderBookmarkAddedMessage
} from "../../src/features/ghostreader-session/ghostreader-bookmark-events"

describe("ghostreader bookmark events", () => {
  it("creates a bookmark-added runtime message", () => {
    const message = createGhostreaderBookmarkAddedMessage({
      bookmarkId: "bm-1",
      title: "Yang Mi interview archive",
      url: "https://yangmi.example",
      source: "page-save"
    })

    expect(message).toEqual({
      type: "BOOKMARK_ADDED",
      bookmarkId: "bm-1",
      title: "Yang Mi interview archive",
      url: "https://yangmi.example",
      source: "page-save"
    })
  })

  it("validates bookmark-added runtime messages", () => {
    expect(
      isGhostreaderBookmarkAddedMessage({
        type: "BOOKMARK_ADDED",
        bookmarkId: "bm-1",
        title: "Yang Mi interview archive",
        url: "https://yangmi.example",
        source: "manual"
      })
    ).toBe(true)

    expect(
      isGhostreaderBookmarkAddedMessage({
        type: "BOOKMARK_ADDED",
        bookmarkId: "bm-1",
        title: "Yang Mi interview archive",
        source: "manual"
      })
    ).toBe(false)
  })
})
