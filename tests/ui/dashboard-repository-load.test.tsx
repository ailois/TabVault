// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DashboardShell } from "../../src/features/dashboard/dashboard-shell"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("DashboardShell repository loading", () => {
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

  it("loads bookmarks from the repository and updates reading pane and AI sidebar after selection", async () => {
    const bookmarks = [
      createBookmark({
        id: "1",
        title: "React Docs",
        url: "https://react.dev/reference/react",
        extractedText: "React lets you build user interfaces.",
        summary: "React reference summary",
        aiTags: ["react"],
        userTags: ["docs"]
      }),
      createBookmark({
        id: "2",
        title: "Vue Docs",
        url: "https://vuejs.org/guide/introduction.html",
        extractedText: "Vue is a progressive framework.",
        summary: "Vue guide summary",
        aiTags: ["vue"],
        userTags: []
      })
    ]

    const listBookmarks = vi.fn(async () => bookmarks)

    await renderDashboard(listBookmarks)

    expect(listBookmarks).toHaveBeenCalledOnce()
    expect(container?.textContent).toContain("React Docs")
    expect(container?.textContent).toContain("Vue Docs")

    const vueButton = Array.from(container?.querySelectorAll("button") ?? []).find((element) => element.textContent?.includes("Vue Docs")) as HTMLButtonElement | undefined

    await act(async () => {
      vueButton?.click()
    })

    expect(container?.textContent).toContain("https://vuejs.org/guide/introduction.html")
    expect(container?.textContent).toContain("Vue is a progressive framework.")
    expect(container?.textContent).toContain("Vue guide summary")
    expect(container?.textContent).toContain("vue")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderDashboard(listBookmarks: () => Promise<BookmarkRecord[]>) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardShell listBookmarks={listBookmarks} />
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
    summary: "Example summary",
    aiTags: [],
    userTags: [],
    status: "done",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  }
}
