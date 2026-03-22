// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BookmarkList } from "../../src/components/bookmark-list"
import type { BookmarkRecord } from "../../src/types/bookmark"
import { radius } from "../../src/ui/design-tokens"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

globalThis.chrome = {
  ...(globalThis.chrome ?? {}),
  storage: {
    ...((globalThis.chrome as any)?.storage ?? {}),
    local: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {})
    }
  },
  runtime: {
    ...((globalThis.chrome as any)?.runtime ?? {}),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: vi.fn()
  }
} as any

describe("BookmarkCard", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount()
      })
    }
    container?.remove()
    container = null
    root = null
  })

  it("renders title as a link with the bookmark URL", async () => {
    await renderList([createBookmark({ title: "My Page", url: "https://example.com" })])

    const card = getCard()
    const link = card?.querySelector("h3 a")

    expect(link?.textContent).toBe("My Page")
    expect(link?.getAttribute("href")).toBe("https://example.com")
    expect(link?.getAttribute("target")).toBe("_blank")
  })

  it("renders domain and date in metadata", async () => {
    await renderList([createBookmark({ url: "https://example.com/article", updatedAt: "2026-03-11T12:00:00.000Z" })])

    const metadata = getCard()?.querySelector<HTMLElement>("[data-testid='bookmark-metadata']")

    expect(metadata?.textContent).toContain("example.com")
    expect(metadata?.textContent).toContain("2026")
  })

  it("renders a local fallback icon based on hostname initial", async () => {
    await renderList([createBookmark({ url: "https://example.com/article" })])

    const icon = getCard()?.querySelector<HTMLElement>("[data-testid='local-icon']")

    expect(icon?.textContent).toBe("E")
  })

  it("shows no status badge for saved or done bookmarks", async () => {
    await renderList([createBookmark({ status: "saved" })])
    expect(getCard()?.querySelector("[data-testid='bookmark-status-badge']")).toBeNull()

    container?.remove()
    container = null
    root = null

    await renderList([createBookmark({ status: "done" })])
    expect(getCard()?.querySelector("[data-testid='bookmark-status-badge']")).toBeNull()
  })

  it("shows Analyzing... badge when status is analyzing", async () => {
    await renderList([createBookmark({ status: "analyzing" })])

    const badge = getCard()?.querySelector("[data-testid='bookmark-status-badge']")
    expect(badge?.textContent).toBe("Analyzing...")
  })

  it("shows a spinner element next to the analyzing badge when status is analyzing", async () => {
    await renderList([createBookmark({ status: "analyzing" })])

    const badge = getCard()?.querySelector("[data-testid='bookmark-status-badge']")
    const spinner = getCard()?.querySelector("[data-testid='bookmark-analyzing-spinner']")

    expect(badge?.textContent).toContain("Analyzing")
    expect(spinner).not.toBeNull()
  })

  it("shows analyzing indicator in compact card when status is analyzing", async () => {
    await renderList([createBookmark({ status: "analyzing" })], undefined, undefined, undefined, true)

    const spinner = getCard()?.querySelector("[data-testid='bookmark-analyzing-spinner']")
    expect(spinner).not.toBeNull()
  })

  it("shows Error badge when status is error", async () => {
    await renderList([createBookmark({ status: "error" })])

    const badge = getCard()?.querySelector("[data-testid='bookmark-status-badge']")
    expect(badge?.textContent).toBe("Error")
  })

  it("shows error message at bottom of card when status is error and errorMessage is set", async () => {
    await renderList([createBookmark({ status: "error", errorMessage: "Provider network error" })])

    const errorLine = getCard()?.querySelector("[data-testid='bookmark-error-message']")
    expect(errorLine?.textContent).toBe("Provider network error")
  })

  it("renders summary collapsed by default with Show more button when summary exists", async () => {
    await renderList([createBookmark({ summary: "A long AI-generated summary of this page." })])

    const summary = getCard()?.querySelector("[data-testid='bookmark-summary']")
    const toggleBtn = getCard()?.querySelector("[data-testid='bookmark-summary-toggle']")

    expect(summary).not.toBeNull()
    expect(toggleBtn?.textContent).toBe("Show more")
  })

  it("expands summary when Show more is clicked", async () => {
    await renderList([createBookmark({ summary: "A long AI-generated summary." })])

    const toggleBtn = getCard()?.querySelector<HTMLButtonElement>("[data-testid='bookmark-summary-toggle']")

    await act(async () => {
      toggleBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(getCard()?.querySelector("[data-testid='bookmark-summary-toggle']")?.textContent).toBe("Show less")
  })

  it("does not show summary section or toggle when no summary", async () => {
    await renderList([createBookmark({ summary: undefined })])

    expect(getCard()?.querySelector("[data-testid='bookmark-summary']")).toBeNull()
    expect(getCard()?.querySelector("[data-testid='bookmark-summary-toggle']")).toBeNull()
  })

  it("renders tags as pills", async () => {
    await renderList([createBookmark({ aiTags: ["ai", "research"], userTags: [] })])

    const tagItems = Array.from(getCard()?.querySelectorAll("[data-testid='bookmark-tag']") ?? [])
    expect(tagItems.map((tag) => tag.textContent?.trim())).toEqual(["✨ ai", "✨ research"])
  })

  it("calls onDelete with bookmark id when delete button is clicked and confirmed", async () => {
    const onDelete = vi.fn(async () => undefined)
    vi.spyOn(window, "confirm").mockReturnValue(true)

    await renderList([createBookmark({ id: "bm-1" })], onDelete)

    const deleteBtn = getCard()?.querySelector<HTMLButtonElement>("[data-testid='bookmark-delete-button']")

    await act(async () => {
      deleteBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(onDelete).toHaveBeenCalledWith("bm-1")
  })

  it("does not call onDelete when delete is cancelled", async () => {
    const onDelete = vi.fn(async () => undefined)
    vi.spyOn(window, "confirm").mockReturnValue(false)

    await renderList([createBookmark({ id: "bm-1" })], onDelete)

    const deleteBtn = getCard()?.querySelector<HTMLButtonElement>("[data-testid='bookmark-delete-button']")

    await act(async () => {
      deleteBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(onDelete).not.toHaveBeenCalled()
  })

  it("renders card styling hooks", async () => {
    await renderList([createBookmark()])

    const card = getCard()

    expect(card).not.toBeNull()
    expect(card?.style.borderBottom).toBeTruthy()
    expect(card?.style.padding).not.toBe("")
  })

  it("renders tag radius token", async () => {
    await renderList([createBookmark({ aiTags: ["ai"], userTags: [] })])
    const tag = getCard()?.querySelector<HTMLElement>("[data-testid='bookmark-tag']")
    expect(tag?.style.borderRadius).toBe("4px")
  })

  it("shows Analyze button for saved bookmarks", async () => {
    await renderList([createBookmark({ status: "saved" })])
    expect(getCard()?.querySelector("[data-testid='bookmark-analyze-button']")).not.toBeNull()
  })

  it("shows Analyze button for error bookmarks", async () => {
    await renderList([createBookmark({ status: "error" })])
    expect(getCard()?.querySelector("[data-testid='bookmark-analyze-button']")).not.toBeNull()
  })

  it("hides Analyze button for analyzing bookmarks", async () => {
    await renderList([createBookmark({ status: "analyzing" })])
    expect(getCard()?.querySelector("[data-testid='bookmark-analyze-button']")).toBeNull()
  })

  it("hides Analyze button for done bookmarks", async () => {
    await renderList([createBookmark({ status: "done" })])
    expect(getCard()?.querySelector("[data-testid='bookmark-analyze-button']")).toBeNull()
  })

  it("calls onAnalyze with bookmark id when Analyze button is clicked", async () => {
    const onAnalyze = vi.fn(async () => undefined)
    await renderList([createBookmark({ id: "bm-1", status: "saved" })], vi.fn(async () => undefined), onAnalyze)

    const analyzeBtn = getCard()?.querySelector<HTMLButtonElement>("[data-testid='bookmark-analyze-button']")

    await act(async () => {
      analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(onAnalyze).toHaveBeenCalledWith("bm-1")
  })

  it("shows Clear button for done bookmarks", async () => {
    await renderList([createBookmark({ status: "done" })])
    expect(getCard()?.querySelector("[data-testid='bookmark-clear-button']")).not.toBeNull()
  })

  it("calls onClearAnalysis with bookmark id when Clear is clicked", async () => {
    const onClearAnalysis = vi.fn(async () => undefined)
    await renderList(
      [createBookmark({ id: "bm-1", status: "done" })],
      vi.fn(async () => undefined),
      vi.fn(async () => undefined),
      onClearAnalysis
    )
    const clearBtn = getCard()?.querySelector<HTMLButtonElement>("[data-testid='bookmark-clear-button']")
    await act(async () => {
      clearBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(onClearAnalysis).toHaveBeenCalledWith("bm-1")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderList(
  bookmarks: BookmarkRecord[],
  onDelete: (id: string) => Promise<void> = vi.fn(async () => undefined),
  onAnalyze: (id: string) => Promise<void> = vi.fn(async () => undefined),
  onClearAnalysis: (id: string) => Promise<void> = vi.fn(async () => undefined),
  compact: boolean = false
): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(
      <BookmarkList
        bookmarks={bookmarks}
        compact={compact}
        onAnalyze={onAnalyze}
        onClearAnalysis={onClearAnalysis}
        onDelete={onDelete}
      />
    )
  })
}

function getCard(): HTMLElement | null {
  return container?.querySelector<HTMLElement>("article[data-bookmark-card='true']") ?? null
}

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "Example page",
    url: "https://example.com/article",
    aiTags: [],
    userTags: [],
    status: "saved",
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
    ...overrides
  }
}
