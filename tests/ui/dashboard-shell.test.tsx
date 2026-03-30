// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DashboardShell } from "../../src/features/dashboard/dashboard-shell"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

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

  it("renders resizable three-column workspace rails", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs" })])

    const shell = container?.querySelector<HTMLElement>("[data-testid='dashboard-shell']")
    const leftRail = container?.querySelector<HTMLElement>("[data-testid='dashboard-navigation']")
    const rightRail = container?.querySelector<HTMLElement>("[data-testid='dashboard-ai-sidebar']")
    const leftResize = container?.querySelector<HTMLElement>("[data-testid='dashboard-resize-left']")
    const rightResize = container?.querySelector<HTMLElement>("[data-testid='dashboard-resize-right']")

    expect(shell).not.toBeNull()
    expect(leftRail?.style.width).toBe("280px")
    expect(rightRail?.style.width).toBe("360px")
    expect(leftResize).not.toBeNull()
    expect(rightResize).not.toBeNull()
  })

  it("shows an empty reading state when no bookmark is selected", async () => {
    await renderDashboard([])

    expect(container?.textContent).toContain("Select a bookmark to start reading")
  })

  it("styles navigation items and reading metadata closer to the design", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", extractedText: "React lets you build UIs." })
    ])

    const navButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-navigation'] button")
    await act(async () => {
      navButton?.click()
    })

    const metadata = container?.querySelector<HTMLElement>("[data-testid='dashboard-reading-metadata']")
    expect(navButton?.style.padding).toBe("8px 12px")
    expect(navButton?.style.borderRadius).toBe("12px")
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
      <ThemeProvider theme={{ ...buildThemeFromOverride("light"), toggle: () => {} }}>
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
