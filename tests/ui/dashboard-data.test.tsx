// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { DashboardShell } from "../../src/features/dashboard/dashboard-shell"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("DashboardShell data flow", () => {
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

  it("shows bookmark metadata and extracted text after selecting a bookmark", async () => {
    await renderDashboard([
      createBookmark({
        id: "1",
        title: "React Docs",
        url: "https://react.dev/reference/react",
        extractedText: "React lets you build user interfaces.",
        createdAt: "2026-03-01T00:00:00.000Z"
      })
    ])

    const button = Array.from(container?.querySelectorAll("button") ?? []).find((element) => element.textContent?.includes("React Docs")) as HTMLButtonElement | undefined

    await act(async () => {
      button?.click()
    })

    expect(container?.textContent).toContain("React Docs")
    expect(container?.textContent).toContain("https://react.dev/reference/react")
    expect(container?.textContent).toContain("2026-03-01T00:00:00.000Z")
    expect(container?.textContent).toContain("React lets you build user interfaces.")
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
