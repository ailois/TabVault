// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { DashboardShell } from "../../src/features/dashboard/dashboard-shell"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("Dashboard scanability", () => {
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

  it("exposes summary snippet on dashboard result cards when available", async () => {
    await renderDashboard([
      createBookmark({
        id: "1",
        title: "React Docs",
        url: "https://react.dev",
        summary: "This is a very informative summary about React that helps scanning."
      })
    ])

    const cards = container?.querySelectorAll("[data-bookmark-card='true']")
    expect(cards?.[0]?.textContent).toContain("This is a very informative summary about React")
  })

  it("exposes tags on dashboard result cards when available", async () => {
    await renderDashboard([
      createBookmark({
        id: "1",
        title: "Vue Docs",
        url: "https://vuejs.org",
        aiTags: ["frontend", "framework"],
        userTags: ["favorite"]
      })
    ])

    const cards = container?.querySelectorAll("[data-bookmark-card='true']")
    expect(cards?.[0]?.textContent).toContain("frontend")
    expect(cards?.[0]?.textContent).toContain("framework")
    expect(cards?.[0]?.textContent).toContain("favorite")
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
