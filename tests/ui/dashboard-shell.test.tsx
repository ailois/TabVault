// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { DashboardShell } from "../../src/features/dashboard/dashboard-shell"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const SAMPLE_TREE: chrome.bookmarks.BookmarkTreeNode[] = [
  {
    id: "0",
    title: "",
    syncing: false,
    children: [
      {
        id: "1",
        title: "Bookmarks Bar",
        syncing: false,
        children: [
          { id: "b1", title: "React Docs", url: "https://react.dev", syncing: false },
          { id: "b2", title: "Vue Docs", url: "https://vuejs.org", syncing: false }
        ]
      },
      {
        id: "2",
        title: "Other Bookmarks",
        syncing: false,
        children: [{ id: "b3", title: "Svelte Docs", url: "https://svelte.dev", syncing: false }]
      }
    ]
  }
]

describe("DashboardShell", () => {
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

  it("renders a dashboard folder tree and updates results when a folder is selected", async () => {
    const bookmarks = [
      createBookmark({ id: "b1", title: "React Docs", url: "https://react.dev" }),
      createBookmark({ id: "b2", title: "Vue Docs", url: "https://vuejs.org" }),
      createBookmark({ id: "b3", title: "Svelte Docs", url: "https://svelte.dev" })
    ]

    await renderDashboardWithTree(bookmarks, SAMPLE_TREE)

    expect(container?.querySelector('[data-testid="dashboard-folder-tree"]')).not.toBeNull()
    expect(container?.textContent).toContain("React Docs")
    expect(container?.textContent).toContain("Vue Docs")

    const otherBookmarks = Array.from(container?.querySelectorAll('[role="button"]') ?? []).find((el) =>
      el.textContent?.includes("Other Bookmarks")
    )
    await act(async () => {
      ;(otherBookmarks as HTMLElement | undefined)?.click()
    })

    expect(container?.textContent).toContain("Svelte Docs")
    expect(container?.textContent).not.toContain("React Docs")
  })

  it("loads bookmarks and browser folders into the dashboard workspace", async () => {
    const bookmarks = [createBookmark({ id: "b1", title: "React Docs", url: "https://react.dev" })]
    await renderDashboardWithTree(bookmarks, SAMPLE_TREE)

    expect(container?.querySelector('[data-testid="dashboard-navigation"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="dashboard-folder-tree"]')).not.toBeNull()
  })

  it("renders design-aligned dashboard with browse and bulk edit views", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs" })])

    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-shell']")).not.toBeNull()
    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-browse-view']")).not.toBeNull()
    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-navigation']")).not.toBeNull()
    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-results-column']")).not.toBeNull()
    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-reading-pane']")).not.toBeNull()
    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-ai-sidebar']")).not.toBeNull()
  })

  it("shows an empty reading state when no bookmark is selected", async () => {
    await renderDashboard([])

    expect(container?.textContent).toContain("Select a bookmark to start reading")
  })

  it("switches the dashboard results column to search mode when typing", async () => {
    const bookmarks = [
      createBookmark({ id: "b1", title: "React Docs", url: "https://react.dev" }),
      createBookmark({ id: "b2", title: "Vue Docs", url: "https://vuejs.org" }),
      createBookmark({ id: "b3", title: "Svelte Docs", url: "https://svelte.dev" })
    ]
    await renderDashboard(bookmarks)

    const searchInput = container?.querySelector<HTMLInputElement>('[data-testid="dashboard-search-input"]')
    expect(searchInput).not.toBeNull()

    await act(async () => {
      Object.defineProperty(searchInput, "value", { writable: true, value: "svelte" })
      searchInput?.dispatchEvent(new Event("change", { bubbles: true }))
    })

    expect(container?.textContent).toContain("Svelte Docs")
    expect(container?.textContent).not.toContain("React Docs")
  })

  it("enters bulk edit mode when a result is selected", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs", extractedText: "React content" })])

    const resultButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")
    await act(async () => {
      resultButton?.click()
    })

    expect(container?.querySelector('[data-testid="dashboard-bulk-edit-view"]')).not.toBeNull()
    expect(container?.textContent).toContain("批量编辑工作台")
  })

  it("styles navigation items and reading metadata closer to the design", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", extractedText: "React lets you build UIs." })
    ])

    const resultButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")
    await act(async () => {
      resultButton?.click()
    })

    const metadata = container?.querySelector<HTMLElement>("[data-testid='dashboard-reading-metadata']")
    expect(resultButton?.style.padding).toBe("8px 16px")
    expect(resultButton?.style.borderRadius).toBe("14px")
    expect(metadata).not.toBeNull()
    expect(metadata?.style.borderBottom).toContain("1px solid")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderDashboard(bookmarks: BookmarkRecord[]) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardShell initialBookmarks={bookmarks} />
      </ThemeProvider>
    )
  })
}

async function renderDashboardWithTree(bookmarks: BookmarkRecord[], tree: chrome.bookmarks.BookmarkTreeNode[]) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardShell initialBookmarks={bookmarks} initialTree={tree} />
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
    aiTags: [],
    userTags: [],
    status: "done",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  }
}
