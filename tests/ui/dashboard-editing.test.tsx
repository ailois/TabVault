// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DashboardAiSidebar } from "../../src/features/dashboard/dashboard-ai-sidebar"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("Dashboard editing", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount()
      })
    }
    container?.remove()
    container = null
    root = null
    vi.clearAllMocks()
  })

  it("renders summary in read mode and switches to edit mode", async () => {
    await renderSidebar(createBookmark({ summary: "Original summary" }), {
      onSaveSummary: vi.fn(async () => undefined),
      onSaveTags: vi.fn(async () => undefined)
    })

    expect(container?.textContent).toContain("Original summary")

    const editButton = container?.querySelector<HTMLButtonElement>("[aria-label='Edit summary']")
    await act(async () => {
      editButton?.click()
    })

    const textarea = container?.querySelector<HTMLTextAreaElement>("[data-testid='dashboard-summary-input']")
    expect(textarea).not.toBeNull()
    expect(textarea?.value).toBe("Original summary")
  })

  it("saves updated summary through the callback", async () => {
    const onSaveSummary = vi.fn(async () => undefined)

    await renderSidebar(createBookmark({ summary: "Original summary" }), {
      onSaveSummary,
      onSaveTags: vi.fn(async () => undefined)
    })

    const editButton = container?.querySelector<HTMLButtonElement>("[aria-label='Edit summary']")
    await act(async () => {
      editButton?.click()
    })

    const textarea = container?.querySelector<HTMLTextAreaElement>("[data-testid='dashboard-summary-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
    await act(async () => {
      setter?.call(textarea, "Updated summary")
      textarea?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const saveButton = container?.querySelector<HTMLButtonElement>("[aria-label='Save summary']")
    await act(async () => {
      saveButton?.click()
    })

    expect(onSaveSummary).toHaveBeenCalledWith("Updated summary")
  })

  it("styles summary and tags edit actions as compact design buttons", async () => {
    await renderSidebar(createBookmark(), {
      onSaveSummary: vi.fn(async () => undefined),
      onSaveTags: vi.fn(async () => undefined)
    })

    const summaryEdit = container?.querySelector<HTMLButtonElement>("[aria-label='Edit summary']")
    const tagsEdit = container?.querySelector<HTMLButtonElement>("[aria-label='Edit tags']")

    expect(summaryEdit?.style.borderRadius).toBe("8px")
    expect(summaryEdit?.style.padding).toBe("4px 10px")
    expect(tagsEdit?.style.borderRadius).toBe("8px")
    expect(tagsEdit?.style.padding).toBe("4px 10px")
  })

  it("styles summary save and cancel buttons in edit mode", async () => {
    await renderSidebar(createBookmark({ summary: "Original summary" }), {
      onSaveSummary: vi.fn(async () => undefined),
      onSaveTags: vi.fn(async () => undefined)
    })

    const editButton = container?.querySelector<HTMLButtonElement>("[aria-label='Edit summary']")
    await act(async () => {
      editButton?.click()
    })

    const cancelButton = container?.querySelector<HTMLButtonElement>("[aria-label='Cancel summary edit']")
    const saveButton = container?.querySelector<HTMLButtonElement>("[aria-label='Save summary']")

    expect(cancelButton?.style.borderRadius).toBe("8px")
    expect(cancelButton?.style.padding).toBe("4px 10px")
    expect(saveButton?.style.borderRadius).toBe("8px")
    expect(saveButton?.style.padding).toBe("4px 10px")
  })


})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderSidebar(
  bookmark: BookmarkRecord,
  callbacks: {
    onSaveSummary: (summary: string) => Promise<void>
    onSaveTags: (aiTags: string[], userTags: string[]) => Promise<void>
  }
) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("light"), toggle: () => {} }}>
        <DashboardAiSidebar
          bookmark={bookmark}
          onSaveSummary={callbacks.onSaveSummary}
          onSaveTags={callbacks.onSaveTags}
        />
      </ThemeProvider>
    )
  })
}

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "Example page",
    url: "https://example.com/article",
    extractedText: "Example extracted content",
    summary: "Example summary",
    aiTags: [],
    userTags: [],
    status: "done",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  }
}
