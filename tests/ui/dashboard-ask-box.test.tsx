// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { DashboardAiSidebar } from "../../src/features/dashboard/dashboard-ai-sidebar"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("Dashboard ask box", () => {
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

  it("renders ask input and submit button", async () => {
    await renderSidebar(createBookmark())

    expect(container?.querySelector("[data-testid='dashboard-ask-input']")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-ask-submit']")).not.toBeNull()
  })

  it("shows an answer block after submitting a question", async () => {
    await renderSidebar(createBookmark({
      title: "React Docs",
      extractedText: "React lets you build user interfaces.",
      summary: "React summary"
    }))

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(input, "What is this about?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const submit = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")
    await act(async () => {
      submit?.click()
    })

    expect(container?.textContent).toContain("No local results found for: What is this about?")
    expect(container?.textContent).toContain("What is this about?")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderSidebar(bookmark: BookmarkRecord) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("light"), toggle: () => {} }}>
        <DashboardAiSidebar bookmark={bookmark} />
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
    summary: "Example summary",
    aiTags: [],
    userTags: [],
    status: "done",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  }
}
