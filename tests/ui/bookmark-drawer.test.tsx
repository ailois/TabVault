// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BookmarkDrawer } from "../../src/components/bookmark-drawer"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.chrome = {
  storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) } },
  runtime: { onMessage: { addListener: vi.fn(), removeListener: vi.fn() }, sendMessage: vi.fn() }
} as any

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(async () => {
  if (root && container) await act(async () => { root?.unmount() })
  container?.remove()
  container = null
  root = null
})

function makeBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bm-1", title: "React Hooks", url: "https://reactjs.org/hooks",
    aiTags: ["react", "hooks"], userTags: [], summary: "A guide to React hooks.",
    provider: "claude", model: "claude-sonnet-4-5",
    status: "done",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  }
}

async function render(bookmark: BookmarkRecord | null, onClose = vi.fn(), onUpdateTags = vi.fn(async () => undefined)) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      <BookmarkDrawer
        bookmark={bookmark}
        onClose={onClose}
        onAnalyze={vi.fn(async () => undefined)}
        onClearAnalysis={vi.fn(async () => undefined)}
        onUpdateTags={onUpdateTags}
      />
    )
  })
}

describe("BookmarkDrawer", () => {
  it("renders nothing when bookmark is null", async () => {
    await render(null)
    expect(container?.querySelector("[data-testid='bookmark-drawer']")).toBeNull()
  })

  it("renders the drawer when bookmark is provided", async () => {
    await render(makeBookmark())
    expect(container?.querySelector("[data-testid='bookmark-drawer']")).not.toBeNull()
  })

  it("shows title, URL, summary, and tags", async () => {
    await render(makeBookmark())
    const drawer = container?.querySelector("[data-testid='bookmark-drawer']")
    expect(drawer?.textContent).toContain("React Hooks")
    expect(drawer?.textContent).toContain("https://reactjs.org/hooks")
    expect(drawer?.textContent).toContain("A guide to React hooks.")
    expect(drawer?.textContent).toContain("react")
    expect(drawer?.textContent).toContain("hooks")
  })

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn()
    await render(makeBookmark(), onClose)
    const closeBtn = container?.querySelector<HTMLButtonElement>("[data-testid='drawer-close-button']")
    await act(async () => { closeBtn?.click() })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("saves edited user tags when closing the drawer", async () => {
    const onClose = vi.fn()
    const onUpdateTags = vi.fn(async () => undefined)
    await render(makeBookmark(), onClose, onUpdateTags)

    const editButton = container?.querySelector<HTMLButtonElement>("[data-testid='tags-edit-button']")
    await act(async () => { editButton?.click() })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='tag-input']")
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(input, "custom-tag")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
      input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    const closeBtn = container?.querySelector<HTMLButtonElement>("[data-testid='drawer-close-button']")
    await act(async () => { closeBtn?.click() })

    expect(onUpdateTags).toHaveBeenCalledWith("bm-1", ["react", "hooks"], ["custom-tag"])
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("shows Analyze button when status is saved", async () => {
    await render(makeBookmark({ status: "saved", summary: undefined, aiTags: [], userTags: [] }))
    expect(container?.querySelector("[data-testid='drawer-analyze-button']")).not.toBeNull()
  })

  it("shows Clear button when status is done", async () => {
    await render(makeBookmark({ status: "done" }))
    expect(container?.querySelector("[data-testid='drawer-clear-button']")).not.toBeNull()
  })
})
