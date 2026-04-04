// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BookmarkTree } from "../../src/components/bookmark-tree"
import type { BookmarkRecord } from "../../src/types/bookmark"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const SAMPLE_TREE: chrome.bookmarks.BookmarkTreeNode[] = [
  {
    id: "folder-1",
    title: "Frontend",
    syncing: false,
    children: [
      { id: "node-1", title: "React Docs", url: "https://react.dev", syncing: false }
    ]
  }
]

describe("BookmarkTree", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount()
      })
    }

    container?.remove()
    container = null
    root = null
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("uses native button semantics for folder rows", async () => {
    await renderTree()

    const folderButton = container?.querySelector<HTMLButtonElement>("[data-testid='bookmark-tree-folder-folder-1']")
    expect(folderButton).not.toBeNull()
    expect(folderButton?.type).toBe("button")
    expect(folderButton?.getAttribute("aria-expanded")).toBe("false")

    await act(async () => {
      folderButton?.click()
    })

    expect(folderButton?.getAttribute("aria-expanded")).toBe("true")
  })

  it("exposes a localized delete action label while keeping X decorative", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)
    await renderTree("zh")

    const folderButton = container?.querySelector<HTMLButtonElement>("[data-testid='bookmark-tree-folder-folder-1']")
    await act(async () => {
      folderButton?.click()
    })

    const deleteButton = Array.from(container?.querySelectorAll<HTMLButtonElement>("button") ?? []).find((element) =>
      element.getAttribute("aria-label")?.includes("\u5220\u9664 React Docs")
    )

    expect(deleteButton?.getAttribute("title")).toContain("\u5220\u9664 React Docs")
    expect(deleteButton?.textContent).toBe("X")

    await act(async () => {
      deleteButton?.click()
    })

    expect(window.confirm).toHaveBeenCalledWith("\u8981\u4ece Chrome \u4e2d\u5220\u9664\u8fd9\u4e2a\u4e66\u7b7e\u5417\uff1f")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderTree(language: "en" | "zh" = "en") {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  const metadataMap: Record<string, BookmarkRecord> = {
    "https://react.dev": createBookmark()
  }

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <BookmarkTree
          language={language}
          metadataMap={metadataMap}
          onAnalyze={vi.fn(async () => undefined)}
          onClearAnalysis={vi.fn(async () => undefined)}
          onDelete={vi.fn(async () => undefined)}
          treeNodes={SAMPLE_TREE}
        />
      </ThemeProvider>
    )
  })
}

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "React Docs",
    url: "https://react.dev",
    aiTags: [],
    userTags: [],
    status: "saved",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  }
}
