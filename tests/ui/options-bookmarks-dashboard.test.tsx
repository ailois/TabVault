// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import Options from "../../src/options"
import type { BookmarkRecord } from "../../src/types/bookmark"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const chromeBookmarkTree = [
  {
    id: "0",
    title: "",
    children: [
      {
        id: "1",
        title: "Bookmarks Bar",
        children: [
          { id: "bm-node-1", title: "React Docs", url: "https://react.dev" },
          { id: "bm-node-2", title: "Vue Docs", url: "https://vuejs.org" }
        ]
      },
      {
        id: "2",
        title: "Other Bookmarks",
        children: [
          { id: "bm-node-3", title: "Svelte Docs", url: "https://svelte.dev" }
        ]
      }
    ]
  }
]

globalThis.chrome = {
  ...(globalThis.chrome ?? {}),
  storage: {
    ...((globalThis.chrome as any)?.storage ?? {}),
    local: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {})
    },
    sync: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {})
    }
  },
  runtime: {
    ...((globalThis.chrome as any)?.runtime ?? {}),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: vi.fn()
  },
  bookmarks: {
    getTree: vi.fn(async () => chromeBookmarkTree),
    remove: vi.fn().mockResolvedValue(undefined)
  }
} as any

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(async () => {
  localStorage.clear()

  if (root && container) {
    await act(async () => {
      root?.unmount()
    })
  }

  container?.remove()
  container = null
  root = null
})

function makeBookmarkRecord(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "record-1",
    url: "https://react.dev",
    title: "React Docs",
    aiTags: ["frontend"],
    userTags: [],
    status: "done",
    summary: "Learn React",
    provider: "claude",
    model: "claude-sonnet-4-5",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  }
}

function makeBookmarkRepository(records: BookmarkRecord[] = []): BookmarkRepository {
  return {
    save: vi.fn(async () => {}),
    list: vi.fn(async () => records),
    getById: vi.fn(async (id: string) => records.find((record) => record.id === id) ?? null),
    update: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    clearAnalysis: vi.fn(async () => {}),
    clearAllAnalysis: vi.fn(async () => {}),
    clearErrorAnalysis: vi.fn(async () => {})
  }
}

function makeSettingsRepository(): SettingsRepository {
  return {
    getAppSettings: async () => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto" as const,
      autoRetryOnError: false
    }),
    saveAppSettings: async () => {},
    getProviders: async () => [
      { provider: "openai", apiKey: "sk-test", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", enabled: true }
    ],
    saveProviders: async () => {}
  }
}

async function renderBookmarksTab(records: BookmarkRecord[] = []): Promise<void> {
  ;(globalThis.chrome as any).bookmarks.getTree = vi.fn(async () => chromeBookmarkTree)

  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root!.render(
      <Options
        services={{
          settingsRepository: makeSettingsRepository(),
          bookmarkRepository: makeBookmarkRepository(records),
          testConnection: async () => {}
        }}
      />
    )
  })

  const bookmarksTabBtn = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Bookmarks"
  )

  await act(async () => {
    bookmarksTabBtn?.click()
  })

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
}

function getBookmarkListColumn(): HTMLElement | null {
  return container?.querySelector('[data-testid="bookmark-list-column"]') ?? null
}

function getBookmarkDetailsColumn(): HTMLElement | null {
  return container?.querySelector('[data-testid="bookmark-details-column"]') ?? null
}

describe("Options bookmarks dashboard", () => {
  it("renders a three-column bookmarks dashboard", async () => {
    await renderBookmarksTab([makeBookmarkRecord()])

    expect(container?.querySelector('[data-testid="options-dashboard-shell"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="bookmarks-workspace"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="options-nav-bookmarks"]')?.getAttribute("aria-pressed")).toBe("true")

    expect(container?.textContent).toContain("YOUR FOLDERS")
    expect(container?.textContent).toContain("BOOKMARKS")
    expect(container?.textContent).toContain("DETAILS")
    expect(getBookmarkListColumn()).not.toBeNull()
    expect(getBookmarkDetailsColumn()?.textContent).toContain("Select a bookmark to view details")
  })

  it("does not cap the details column height", async () => {
    await renderBookmarksTab([makeBookmarkRecord()])

    expect(getBookmarkDetailsColumn()).not.toBeNull()
    expect(getBookmarkDetailsColumn()?.style.maxHeight).toBe("")
  })

  it("updates middle column when a different folder is selected in left column", async () => {
    await renderBookmarksTab([makeBookmarkRecord()])

    expect(getBookmarkListColumn()?.textContent).toContain("React Docs")
    expect(getBookmarkListColumn()?.textContent).toContain("Vue Docs")
    expect(getBookmarkListColumn()?.textContent).not.toContain("Svelte Docs")

    const folderButton = Array.from(container?.querySelectorAll("[role='button']") ?? []).find(
      (element) => element.textContent?.trim().includes("Other Bookmarks")
    ) as HTMLElement | null

    await act(async () => {
      folderButton?.click()
    })

    expect(getBookmarkListColumn()?.textContent).toContain("Svelte Docs")
    expect(getBookmarkListColumn()?.textContent).not.toContain("React Docs")
  })

  it("switches middle column to global search results when searching", async () => {
    await renderBookmarksTab([makeBookmarkRecord()])

    expect(getBookmarkListColumn()?.textContent).not.toContain("Svelte Docs")

    const searchInput = container?.querySelector('input[type="search"]') as HTMLInputElement | null

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setValue?.call(searchInput, "svelte")
      searchInput?.dispatchEvent(new Event("input", { bubbles: true }))
      searchInput?.dispatchEvent(new Event("change", { bubbles: true }))
    })

    expect(getBookmarkListColumn()?.textContent).toContain("Svelte Docs")
    expect(getBookmarkListColumn()?.textContent).not.toContain("React Docs")
  })

  it("shows analyzing status badge in the bookmark list immediately after clicking Analyze in the detail panel", async () => {
    let resolveAnalyze!: () => void
    const analyzedRecord = makeBookmarkRecord({
      status: "done",
      summary: "Learn React",
      aiTags: ["frontend", "library"],
      userTags: [],
      updatedAt: "2026-01-02T00:00:00.000Z"
    })
    const analyzeBookmark = vi.fn(
      () => new Promise<BookmarkRecord>((resolve) => {
        resolveAnalyze = () => resolve(analyzedRecord)
      })
    )

    let currentRecords: BookmarkRecord[] = [
      makeBookmarkRecord({
        status: "saved",
        summary: undefined,
        aiTags: [],
        userTags: []
      })
    ]

    const repo: BookmarkRepository = {
      save: vi.fn(async () => {}),
      list: vi.fn(async () => currentRecords),
      getById: vi.fn(async (id: string) => currentRecords.find((record) => record.id === id) ?? null),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      clearAnalysis: vi.fn(async () => {}),
      clearAllAnalysis: vi.fn(async () => {}),
      clearErrorAnalysis: vi.fn(async () => {})
    }

    ;(globalThis.chrome as any).bookmarks.getTree = vi.fn(async () => chromeBookmarkTree)

    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <Options
          services={{
            settingsRepository: makeSettingsRepository(),
            bookmarkRepository: repo,
            analyzeBookmark,
            testConnection: async () => {}
          }}
        />
      )
    })

    const bookmarksTabBtn = Array.from(container!.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Bookmarks"
    )
    await act(async () => { bookmarksTabBtn?.click() })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })

    const bookmarkBtn = container?.querySelector<HTMLElement>('[data-testid="bookmark-result-button"]')
    await act(async () => { bookmarkBtn?.click() })

    const analyzeBtn = container?.querySelector<HTMLButtonElement>('[data-testid="detail-analyze-button"]')
    expect(analyzeBtn).not.toBeNull()

    await act(async () => {
      analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    const statusBadge = bookmarkBtn?.querySelector('[data-testid="bookmark-result-status"]')
    expect(statusBadge?.textContent).toBe("analyzing")

    await act(async () => {
      currentRecords = [analyzedRecord]
      resolveAnalyze()
    })
  })

  it("refreshes detail panel tags immediately after analysis completes", async () => {
    let resolveAnalyze!: () => void
    const analyzedRecord = makeBookmarkRecord({
      status: "done",
      summary: "Learn React",
      aiTags: ["frontend", "library"],
      userTags: [],
      updatedAt: "2026-01-02T00:00:00.000Z"
    })
    const analyzeBookmark = vi.fn(
      () => new Promise<BookmarkRecord>((resolve) => {
        resolveAnalyze = () => resolve(analyzedRecord)
      })
    )

    let currentRecords: BookmarkRecord[] = [
      makeBookmarkRecord({
        status: "saved",
        summary: undefined,
        aiTags: [],
        userTags: []
      })
    ]

    const repo: BookmarkRepository = {
      save: vi.fn(async () => {}),
      list: vi.fn(async () => currentRecords),
      getById: vi.fn(async (id: string) => currentRecords.find((record) => record.id === id) ?? null),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      clearAnalysis: vi.fn(async () => {}),
      clearAllAnalysis: vi.fn(async () => {}),
      clearErrorAnalysis: vi.fn(async () => {})
    }

    ;(globalThis.chrome as any).bookmarks.getTree = vi.fn(async () => chromeBookmarkTree)

    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <Options
          services={{
            settingsRepository: makeSettingsRepository(),
            bookmarkRepository: repo,
            analyzeBookmark,
            testConnection: async () => {}
          }}
        />
      )
    })

    const bookmarksTabBtn = Array.from(container!.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Bookmarks"
    )
    await act(async () => { bookmarksTabBtn?.click() })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })

    const bookmarkBtn = container?.querySelector<HTMLElement>('[data-testid="bookmark-result-button"]')
    await act(async () => { bookmarkBtn?.click() })

    expect(getBookmarkDetailsColumn()?.textContent).not.toContain("frontend")
    expect(getBookmarkDetailsColumn()?.textContent).not.toContain("library")

    const analyzeBtn = container?.querySelector<HTMLButtonElement>('[data-testid="detail-analyze-button"]')

    await act(async () => {
      analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    await act(async () => {
      currentRecords = [analyzedRecord]
      resolveAnalyze()
    })

    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })

    expect(getBookmarkDetailsColumn()?.textContent).toContain("frontend")
    expect(getBookmarkDetailsColumn()?.textContent).toContain("library")
  })
})
