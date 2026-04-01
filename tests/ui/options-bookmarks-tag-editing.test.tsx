// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "../../src/ui/theme-context"
import type { BookmarkRecord } from "../../src/types/bookmark"

// Inline a minimal ThemeProvider wrapper — we import the actual component directly
// by rendering BookmarkDetailPanel in isolation.
// BookmarkDetailPanel is not exported, so we test it through a small subset
// of the real Options component by focusing on the detail panel's own behavior.

// We test BookmarkDetailPanel indirectly by rendering it directly:
// since it's not exported, we re-test through the component tree using
// the popup's BookmarkDrawer as a reference, and instead write simpler
// integration-level tests here.

// The approach: render Options → switch to Bookmarks tab → expand folder → select bookmark
// and then interact with the detail panel.

import Options from "../../src/options"
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
          { id: "bm-node-1", title: "React Docs", url: "https://react.dev" }
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
  if (root && container) {
    await act(async () => { root?.unmount() })
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
    aiTags: ["frontend", "library"],
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

function makeBookmarkRepository(record: BookmarkRecord, updateFn = vi.fn(async () => {})): BookmarkRepository {
  return {
    save: vi.fn(async () => {}),
    list: vi.fn(async () => [record]),
    getById: vi.fn(async () => record),
    update: updateFn,
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
      autoRetryOnError: false,
      displayLanguage: "en" as const
    }),
    saveAppSettings: async () => {},
    getProviders: async () => [
      { provider: "openai", apiKey: "sk-test", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", enabled: true }
    ],
    saveProviders: async () => {}
  }
}

async function renderAndSelectBookmark(bookmarkRepository: BookmarkRepository): Promise<void> {
  // Reset the getTree mock to ensure consistent behaviour across test runs
  ;(globalThis.chrome as any).bookmarks.getTree = vi.fn(async () => chromeBookmarkTree)

  // Pre-expand both folders via localStorage so BookmarkTreeNodeItem starts expanded
  localStorage.setItem("tabvault_folder_0", "true")
  localStorage.setItem("tabvault_folder_1", "true")

  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root!.render(
      <Options
        services={{
          settingsRepository: makeSettingsRepository(),
          bookmarkRepository,
          testConnection: async () => {}
        }}
      />
    )
  })

  // Switch to Bookmarks tab — button text is exactly "Bookmarks"
  const bookmarksTabBtn = Array.from(container!.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Bookmarks"
  )
  await act(async () => { bookmarksTabBtn?.click() })

  // Wait for loadData (chrome.bookmarks.getTree + bookmarkRepository.list) to settle
  await act(async () => { await new Promise((r) => setTimeout(r, 10)) })

  const listColumn = container!.querySelector('[data-testid="bookmark-list-column"]') as HTMLElement | null
  const bookmarkButton = listColumn?.querySelector('[data-testid="bookmark-result-button"]') as HTMLElement | null

  await act(async () => {
    bookmarkButton?.click()
  })
}

function getDetailEditButton(): HTMLButtonElement | null {
  // Use double quotes in the attribute selector to avoid any quoting issues
  return container?.querySelector<HTMLButtonElement>('[data-testid="detail-tags-edit-button"]') ?? null
}

function getDetailRemoveButtons(): HTMLButtonElement[] {
  return Array.from(container?.querySelectorAll<HTMLButtonElement>('[data-testid="detail-tag-remove-button"]') ?? [])
}

function getDetailTagInput(): HTMLInputElement | null {
  return container?.querySelector<HTMLInputElement>('[data-testid="detail-tag-input"]') ?? null
}

function getSelectedDetailPanelRoot(): HTMLElement | null {
  const detailsColumn = container?.querySelector('[data-testid="bookmark-details-column"]') as HTMLElement | null
  return (detailsColumn?.lastElementChild?.firstElementChild as HTMLElement | null) ?? null
}

function getSelectedDetailPanelBody(): HTMLElement | null {
  const root = getSelectedDetailPanelRoot()
  return (root?.children[1] as HTMLElement | null) ?? null
}

describe("BookmarkDetailPanel tag editing", () => {
  it("does not expose bookmark detail editing inside options", async () => {
    const repo = makeBookmarkRepository(makeBookmarkRecord())

    await renderAndSelectBookmark(repo)

    expect(container?.querySelector('[data-testid="detail-tags-edit-button"]')).toBeNull()
    expect(container?.querySelector('[data-testid="detail-analyze-button"]')).toBeNull()
    expect(container?.querySelector('[data-testid="bookmark-details-column"]')).toBeNull()
  })

  it("keeps options focused on settings after bookmark workspace removal", async () => {
    const repo = makeBookmarkRepository(makeBookmarkRecord())

    await renderAndSelectBookmark(repo)

    expect(container?.querySelector('[data-testid="options-nav-bookmarks"]')).toBeNull()
    expect(container?.textContent).not.toContain("Smart Tags")
  })
})
