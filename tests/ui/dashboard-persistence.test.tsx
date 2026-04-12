// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DashboardShell } from "../../src/features/dashboard/dashboard-shell"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("DashboardShell persistence", () => {
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

  it("saves edited summary through updateBookmark from the details tab and refreshes the sidebar", async () => {
    const bookmarks = [
      createBookmark({
        id: "1",
        title: "React Docs",
        summary: "Old summary",
        aiTags: ["react"],
        userTags: []
      })
    ]
    const updateBookmark = vi.fn(async () => undefined)

    await renderDashboard(bookmarks, updateBookmark)

    await selectBookmark("React Docs")
    const editButton = container?.querySelector<HTMLButtonElement>("[aria-label='Edit summary']")
    await act(async () => {
      editButton?.click()
    })

    const textarea = container?.querySelector<HTMLTextAreaElement>("[data-testid='dashboard-summary-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(textarea, "New summary")
      textarea?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const saveButton = container?.querySelector<HTMLButtonElement>("[aria-label='Save summary']")
    await act(async () => {
      saveButton?.click()
    })

    expect(updateBookmark).toHaveBeenCalledOnce()
    const firstCall = updateBookmark.mock.calls[0]
    expect(firstCall).toBeDefined()
    const firstUpdatedBookmark = updateBookmark.mock.calls.at(0)?.at(0) as BookmarkRecord | undefined
    expect(firstUpdatedBookmark).toBeDefined()
    expect(firstUpdatedBookmark).toMatchObject({
      id: "1",
      summary: "New summary",
      aiTags: ["react"],
      userTags: []
    })
    expect(firstUpdatedBookmark.updatedAt).not.toBe("2026-03-01T00:00:00.000Z")
    expect(container?.textContent).toContain("New summary")
  })

  it("saves edited tags through updateBookmark from the details tab and refreshes the sidebar", async () => {
    const bookmarks = [
      createBookmark({
        id: "1",
        title: "React Docs",
        summary: "Summary",
        aiTags: ["react"],
        userTags: []
      })
    ]
    const updateBookmark = vi.fn(async () => undefined)

    await renderDashboard(bookmarks, updateBookmark)

    await selectBookmark("React Docs")
    const editButton = container?.querySelector<HTMLButtonElement>("[aria-label='Edit tags']")
    await act(async () => {
      editButton?.click()
    })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-tag-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(input, "favorite")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const saveButton = container?.querySelector<HTMLButtonElement>("[aria-label='Save tags']")
    await act(async () => {
      saveButton?.click()
    })

    expect(updateBookmark).toHaveBeenCalledOnce()
    const firstCall = updateBookmark.mock.calls[0]
    expect(firstCall).toBeDefined()
    const firstUpdatedBookmark = updateBookmark.mock.calls.at(0)?.at(0) as BookmarkRecord | undefined
    expect(firstUpdatedBookmark).toBeDefined()
    expect(firstUpdatedBookmark).toMatchObject({
      id: "1",
      aiTags: ["react"],
      userTags: ["favorite"]
    })
    expect(container?.textContent).toContain("favorite")
  })

  it("saves edited notes through updateBookmark and refreshes the notes tab", async () => {
    const bookmarks = [
      createBookmark({
        id: "1",
        title: "React Docs",
        userNotes: "Old notes"
      })
    ]
    const updateBookmark = vi.fn(async () => undefined)

    await renderDashboard(bookmarks, updateBookmark)

    await selectBookmark("React Docs")

    const textarea = container?.querySelector<HTMLTextAreaElement>("[data-testid='dashboard-notes-input']")
    expect(textarea?.value).toBe("Old notes")

    const setValue = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(textarea, "New notes")
      textarea?.dispatchEvent(new Event("input", { bubbles: true }))
      textarea?.dispatchEvent(new FocusEvent("blur", { bubbles: true }))
    })

    expect(updateBookmark).toHaveBeenCalledOnce()
    const firstUpdatedBookmark = updateBookmark.mock.calls.at(0)?.at(0) as BookmarkRecord | undefined
    expect(firstUpdatedBookmark).toBeDefined()
    expect(firstUpdatedBookmark).toMatchObject({
      id: "1",
      userNotes: "New notes"
    })
    expect(firstUpdatedBookmark?.summary).toBe("Example summary")
    expect(firstUpdatedBookmark?.aiTags).toEqual([])
    expect(firstUpdatedBookmark?.userTags).toEqual([])
    expect(container?.querySelector<HTMLTextAreaElement>("[data-testid='dashboard-notes-input']")?.value).toBe("New notes")
  })

  it("formats selected notes as bold and persists the change", async () => {
    const bookmarks = [
      createBookmark({
        id: "1",
        title: "React Docs",
        userNotes: "Hello world"
      })
    ]
    const updateBookmark = vi.fn(async () => undefined)

    await renderDashboard(bookmarks, updateBookmark)
    await selectBookmark("React Docs")

    const textarea = container?.querySelector<HTMLTextAreaElement>("[data-testid='dashboard-notes-input']")
    expect(textarea).not.toBeNull()
    textarea?.focus()
    if (textarea) {
      textarea.selectionStart = 6
      textarea.selectionEnd = 11
    }

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-format-bold']")?.click()
      await Promise.resolve()
    })

    expect(container?.querySelector<HTMLTextAreaElement>("[data-testid='dashboard-notes-input']")?.value).toBe("Hello **world**")
    expect(updateBookmark).toHaveBeenCalledOnce()
    const updatedBookmark = updateBookmark.mock.calls.at(0)?.at(0) as BookmarkRecord | undefined
    expect(updatedBookmark?.userNotes).toBe("Hello **world**")
  })

})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderDashboard(bookmarks: BookmarkRecord[], updateBookmark: (bookmark: BookmarkRecord) => Promise<void>) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardShell initialBookmarks={bookmarks} updateBookmark={updateBookmark} />
      </ThemeProvider>
    )
  })
}

async function selectBookmark(title: string) {
  const button = Array.from(container?.querySelectorAll("button") ?? []).find((element) => element.textContent?.includes(title)) as HTMLButtonElement | undefined
  await act(async () => {
    button?.click()
  })
}

async function switchToAiWorkspace() {
  const button = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ai-tab']") ?? undefined
  await act(async () => {
    button?.click()
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
