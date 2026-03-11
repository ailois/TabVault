// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BookmarkList } from "../../src/components/bookmark-list"
import type { BookmarkRecord } from "../../src/types/bookmark"
import { colors, radius, spacing } from "../../src/ui/design-tokens"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("BookmarkCard", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => { root?.unmount() })
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

  it("renders domain and date separated by · in metadata", async () => {
    await renderList([createBookmark({ url: "https://example.com/article", updatedAt: "2026-03-11T12:00:00.000Z" })])

    const metadata = getCard()?.querySelector<HTMLElement>("[data-testid='bookmark-metadata']")

    expect(metadata?.textContent).toContain("example.com")
    expect(metadata?.textContent).toContain("·")
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
    await renderList([createBookmark({ tags: ["ai", "research"] })])

    const tagItems = Array.from(getCard()?.querySelectorAll("[data-testid='bookmark-tag']") ?? [])
    expect(tagItems.map(t => t.textContent)).toEqual(["ai", "research"])
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

  it("uses design token colors and radius for card styling", async () => {
    await renderList([createBookmark()])

    const card = getCard()

    expect(card?.style.backgroundColor).toBe(normalizeCssColor(colors.surface))
    expect(card?.style.borderRadius).toBe(radius.large)
    expect(card?.style.padding).toBe(spacing.md)
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderList(
  bookmarks: BookmarkRecord[],
  onDelete: (id: string) => Promise<void> = vi.fn(async () => undefined)
): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<BookmarkList bookmarks={bookmarks} onDelete={onDelete} />)
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
    tags: [],
    status: "saved",
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
    ...overrides
  }
}

function normalizeCssColor(value: string): string {
  const element = document.createElement("div")
  element.style.color = value
  return element.style.color
}
