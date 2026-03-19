// tests/ui/sidepanel.test.tsx
// @vitest-environment jsdom
import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import SidePanel from "../../src/sidepanel"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import type { ThemeRepository } from "../../src/lib/config/theme-repository"
import type { BookmarkRecord } from "../../src/types/bookmark"
import type { AppSettings, ProviderConfig } from "../../src/types/settings"
import type { AiProvider } from "../../src/lib/providers/provider"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

globalThis.chrome = {
  ...(globalThis.chrome ?? {}),
  storage: {
    ...((globalThis.chrome as any)?.storage ?? {}),
    local: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {})
    }
  },
  runtime: {
    ...((globalThis.chrome as any)?.runtime ?? {}),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: vi.fn()
  }
} as any

describe("SidePanel", () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  afterEach(async () => {
    if (root && container) {
      await act(async () => { root?.unmount() })
    }
    container?.remove()
    container = null
    root = null
    vi.restoreAllMocks()
  })

  async function renderSidePanel(services: any = createServices()) {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root!.render(<SidePanel services={services} />)
    })

    await act(async () => {
      await Promise.resolve()
    })
  }

  it("renders the Side Panel header and library", async () => {
    await renderSidePanel()

    expect(container?.textContent).toContain("TabVault Pro")
    expect(container?.textContent).toContain("Manage and search your library")
    expect(container?.querySelector("#sidepanel-search")).not.toBeNull()
    expect(container?.textContent).toContain("Library")
  })

  it("renders a theme toggle button in the header", async () => {
    await renderSidePanel()
    const btn = container?.querySelector<HTMLButtonElement>("[data-testid='theme-toggle-button']")
    expect(btn).not.toBeNull()
    expect(btn?.getAttribute("aria-label")).toMatch(/switch to (dark|light) mode/i)
  })

  it("calls themeRepository.setTheme when toggle is clicked", async () => {
    const setTheme = vi.fn(async () => {})
    const services = createServices({
      themeRepository: { getTheme: vi.fn(async () => undefined), setTheme }
    })
    await renderSidePanel(services)

    const btn = container?.querySelector<HTMLButtonElement>("[data-testid='theme-toggle-button']")
    await act(async () => {
      btn?.click()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(setTheme).toHaveBeenCalledWith(expect.stringMatching(/dark|light/))
  })

  it("renders a list of bookmarks in search mode", async () => {
    const bookmarks = [
      createBookmark({ id: "1", title: "Bookmark Alpha" }),
      createBookmark({ id: "2", title: "Bookmark Beta" })
    ]
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => bookmarks)
      })
    })

    await renderSidePanel(services)

    // Trigger search mode with a query that matches both
    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "Bookmark")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.textContent).toContain("Bookmark Alpha")
    expect(container?.textContent).toContain("Bookmark Beta")
    expect(container?.textContent).toContain("2") // Count
  })

  it("sends IMPORT_BOOKMARKS message when import button is clicked", async () => {
    const sendMessageMock = vi.fn((msg, cb) => {
      if (cb) cb({ success: true, count: 5 })
    })
    globalThis.chrome = {
      ...(globalThis.chrome ?? {}),
      runtime: {
        ...((globalThis.chrome as any)?.runtime ?? {}),
        sendMessage: sendMessageMock,
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() }
      }
    } as any

    await renderSidePanel()

    const importBtn = Array.from(container?.querySelectorAll("button") ?? [])
      .find(b => b.textContent?.includes("Import"))

    await act(async () => {
      importBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(sendMessageMock).toHaveBeenCalledWith(
      { type: "IMPORT_BOOKMARKS" },
      expect.any(Function)
    )
    expect(container?.textContent).toContain("Imported 5 bookmarks")
  })

  it("filters bookmarks based on search query", async () => {
    const bookmarks = [
      createBookmark({ id: "1", title: "React Docs" }),
      createBookmark({ id: "2", title: "Vitest Guide" })
    ]
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => bookmarks)
      })
    })

    await renderSidePanel(services)

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "React")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(container?.textContent).toContain("React Docs")
  })

  it("renders bookmark list in compact mode with no summary or tags visible", async () => {
    const b1 = createBookmark({
      id: "1",
      title: "My Article",
      status: "done",
      summary: "A long summary text",
      aiTags: ["research"],
      userTags: []
    })
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [b1])
      })
    })

    await renderSidePanel(services)

    // Trigger search mode to show compact BookmarkList
    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "My")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    // Summary should NOT appear in compact mode
    expect(container?.textContent).not.toContain("A long summary text")
    // Tags should NOT appear in compact mode
    expect(container?.textContent).not.toContain("research")
    // Title should appear
    expect(container?.textContent).toContain("My Article")
  })

  it("opens the drawer when a search result is selected", async () => {
    const bookmark = createBookmark({ id: "1", title: "Drawer article", status: "done" })
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [bookmark])
      })
    })

    await renderSidePanel(services)

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "Drawer")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const resultLink = Array.from(container?.querySelectorAll("a") ?? []).find((link) => link.textContent?.includes("Drawer article"))
    await act(async () => {
      resultLink?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.querySelector("[data-testid='bookmark-drawer']")?.textContent).toContain("Drawer article")
  })
})

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "Example page",
    url: "https://example.com/article",
    aiTags: [],
    userTags: [],
    status: "saved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

function createServices(overrides: any = {}): any {
  return {
    bookmarkRepository: createBookmarkRepository(),
    settingsRepository: createSettingsRepository(),
    themeRepository: createThemeRepository(),
    analyzeBookmark: vi.fn(async ({ bookmark }) => ({ ...bookmark, status: "done" })),
    createProvider: vi.fn(() => ({ analyze: vi.fn() })),
    ...overrides
  }
}

function createThemeRepository(overrides: Partial<ThemeRepository> = {}): ThemeRepository {
  return {
    getTheme: vi.fn(async () => undefined),
    setTheme: vi.fn(async () => undefined),
    ...overrides
  }
}

function createBookmarkRepository(overrides: Partial<BookmarkRepository> = {}): BookmarkRepository {
  return {
    save: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    clearAnalysis: vi.fn(async () => undefined),
    clearAllAnalysis: vi.fn(async () => undefined),
    clearErrorAnalysis: vi.fn(async () => undefined),
    ...overrides
  }
}

function createSettingsRepository(overrides: Partial<SettingsRepository> = {}): SettingsRepository {
  return {
    getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto",
      autoRetryOnError: false
    })),
    saveAppSettings: vi.fn(async () => undefined),
    getProviders: vi.fn(async (): Promise<ProviderConfig[]> => []),
    saveProviders: vi.fn(async () => undefined),
    ...overrides
  }
}
