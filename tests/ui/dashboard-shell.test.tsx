// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { DashboardShell } from "../../src/features/dashboard/dashboard-shell"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import type { BookmarkRecord } from "../../src/types/bookmark"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"

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

    const otherBookmarks = container?.querySelector<HTMLElement>("[data-testid='dashboard-folder-2']")
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
  })

  it("shows an empty reading state when no bookmark is selected", async () => {
    await renderDashboard([])

    expect(container?.textContent).toContain("Select a bookmark to start reading")
  })

  it("renders localized dashboard copy when display language is zh", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs" })], undefined, createSettingsRepository("zh"))

    expect(container?.textContent).toContain("\u77e5\u8bc6\u5e93")
    expect(container?.querySelector<HTMLInputElement>("[data-testid='dashboard-search-input']")?.placeholder).toContain("\u641c\u7d22\u6807\u9898")
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

  it("marks the selected result with accessible current-state semantics", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", url: "https://react.dev" }),
      createBookmark({ id: "2", title: "Vue Docs", url: "https://vuejs.org" })
    ])

    const resultButtons = Array.from(
      container?.querySelectorAll<HTMLButtonElement>("[data-testid='dashboard-result-button']") ?? []
    )
    const vueButton = resultButtons.find((element) => element.textContent?.includes("Vue Docs"))
    const reactButton = resultButtons.find((element) => element.textContent?.includes("React Docs"))

    expect(vueButton?.getAttribute("aria-pressed")).toBe("false")
    expect(vueButton?.getAttribute("aria-current")).toBeNull()

    await act(async () => {
      vueButton?.click()
    })

    const updatedButtons = Array.from(
      container?.querySelectorAll<HTMLButtonElement>("[data-testid='dashboard-result-button']") ?? []
    )
    const updatedVueButton = updatedButtons.find((element) => element.textContent?.includes("Vue Docs"))
    const updatedReactButton = updatedButtons.find((element) => element.textContent?.includes("React Docs"))

    expect(updatedVueButton?.getAttribute("aria-pressed")).toBe("true")
    expect(updatedVueButton?.getAttribute("aria-current")).toBe("true")
    expect(updatedReactButton?.getAttribute("aria-pressed")).toBe("false")
    expect(updatedReactButton?.getAttribute("aria-current")).toBeNull()
    expect(reactButton).not.toBeNull()
  })

  it("enters bulk edit mode when a result is selected", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs", extractedText: "React content" })])

    const resultButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")
    await act(async () => {
      resultButton?.click()
    })

    expect(container?.querySelector('[data-testid="dashboard-bulk-edit-view"]')).not.toBeNull()
    expect(container?.textContent).toContain("Bulk edit coming soon")
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
    expect(resultButton).not.toBeNull()
    expect(metadata).not.toBeNull()
    expect(metadata?.style.borderBottom).toContain("1px solid")
  })

  it("marks placeholder navigation buttons as disabled until their views are wired", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs" })])

    const recentsButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-nav-recents']")
    const highlightsButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-nav-highlights']")
    const settingsButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-nav-settings']")
    const frontendTagButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-tag-frontend']")

    expect(recentsButton?.disabled).toBe(true)
    expect(recentsButton?.title).toContain("Coming soon")
    expect(highlightsButton?.disabled).toBe(true)
    expect(settingsButton?.disabled).toBe(true)
    expect(frontendTagButton?.disabled).toBe(true)
  })

  it("uses tab semantics in the reading pane and disables note-format placeholders", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", extractedText: "React lets you build UIs." })
    ])

    const resultButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")
    await act(async () => {
      resultButton?.click()
    })

    const notesTab = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-notes-tab']")
    const aiTab = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ai-tab']")
    const boldButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-format-bold']")
    const italicButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-format-italic']")
    const quoteButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-format-quote']")

    expect(notesTab?.getAttribute("aria-selected")).toBe("true")
    expect(aiTab?.getAttribute("aria-selected")).toBe("false")
    expect(boldButton?.disabled).toBe(true)
    expect(italicButton?.disabled).toBe(true)
    expect(quoteButton?.disabled).toBe(true)
    expect(boldButton?.title).toContain("Coming soon")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderDashboard(
  bookmarks: BookmarkRecord[],
  updateBookmark?: (bookmark: BookmarkRecord) => Promise<void>,
  settingsRepository?: SettingsRepository
) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardShell initialBookmarks={bookmarks} settingsRepository={settingsRepository} updateBookmark={updateBookmark} />
      </ThemeProvider>
    )
  })

  await act(async () => {
    await Promise.resolve()
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

  await act(async () => {
    await Promise.resolve()
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

function createSettingsRepository(displayLanguage: "en" | "zh"): SettingsRepository {
  return {
    getAppSettings: async () => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto",
      autoRetryOnError: false,
      displayLanguage,
      theme: "sage"
    }),
    saveAppSettings: async () => {},
    getProviders: async () => [],
    saveProviders: async () => {}
  }
}
