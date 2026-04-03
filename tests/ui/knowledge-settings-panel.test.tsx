// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import KnowledgeSettingsPanel from "../../src/components/knowledge-settings-panel"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../../src/types/bookmark"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"

globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.chrome = {
  ...(globalThis.chrome ?? {}),
  runtime: {
    ...((globalThis.chrome as any)?.runtime ?? {}),
    sendMessage: vi.fn(async () => ({ success: true, count: 2 })),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() }
  }
} as any

describe("KnowledgeSettingsPanel", () => {
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

  it("renders localized zh knowledge copy", async () => {
    await renderPanel("zh")

    expect(container?.textContent).toContain("\u5b58\u50a8\u6982\u89c8")
    expect(container?.textContent).toContain("\u5bfc\u5165\u4e0e\u5bfc\u51fa")
    expect(container?.textContent).toContain("\u4fdd\u5b58\u77e5\u8bc6\u5e93\u8bbe\u7f6e")
  })

  it("renders stable storage summary separators in English", async () => {
    await renderPanel("en")

    expect(container?.textContent).toContain("1 bookmarks \u00b7 1 summaries \u00b7 1 vector chunks")
  })

  it("falls back to localized export errors for internal storage failures", async () => {
    await renderPanel("zh", createBookmarkRepository({
      list: vi.fn()
        .mockResolvedValueOnce([createBookmark({ id: "1", summary: "Summary", extractedText: "Some content for chunking" })])
        .mockRejectedValueOnce(new Error("Failed to open bookmark database"))
    }))

    const exportButton = container?.querySelector<HTMLButtonElement>('[data-testid="knowledge-export-button"]')

    await act(async () => {
      exportButton?.click()
    })

    expect(container?.querySelector('[data-testid="knowledge-save-status"]')?.textContent).toContain("\u5bfc\u51fa\u77e5\u8bc6\u5e93\u5931\u8d25")
    expect(container?.textContent).not.toContain("Failed to open bookmark database")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderPanel(language: "en" | "zh", bookmarkRepository: BookmarkRepository = createBookmarkRepository()) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <KnowledgeSettingsPanel bookmarkRepository={bookmarkRepository} language={language} />
      </ThemeProvider>
    )
  })
}

function createBookmarkRepository(overrides: Partial<BookmarkRepository> = {}): BookmarkRepository {
  return {
    save: async () => {},
    list: async () => [createBookmark({ id: "1", summary: "Summary", extractedText: "Some content for chunking" })],
    getById: async () => null,
    update: async () => {},
    delete: async () => {},
    clearAnalysis: async () => {},
    clearAllAnalysis: async () => {},
    clearErrorAnalysis: async () => {},
    ...overrides
  }
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
