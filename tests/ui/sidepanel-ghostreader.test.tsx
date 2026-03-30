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
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`)
  },
  tabs: {
    create: vi.fn(async () => undefined),
    query: vi.fn(async () => [{ id: 1, title: "Current React Page", url: "https://example.com/current" }])
  },
  sidePanel: {
    open: vi.fn(async () => undefined)
  },
  bookmarks: {
    getTree: vi.fn(async () => [])
  }
} as any

describe("SidePanel Ghostreader", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount()
      })
    }

    container?.remove()
    container = null
    root = null
    vi.clearAllMocks()
  })

  it("renders a persistent Ghostreader input", async () => {
    await renderSidePanel(createServices())

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    expect(input).not.toBeNull()
    expect(input?.getAttribute("placeholder")).toContain("Ghostreader")
  })

  it("shows an assistant-led welcome state for the current page", async () => {
    await renderSidePanel(createServices())

    expect(container?.textContent).toContain("Ghostreader")
    expect(container?.textContent).toContain("Current React Page")
    expect(container?.textContent).toContain("总结核心观点")
  })

  it("uses the persistent Ghostreader input to run a query", async () => {
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [createBookmark({ id: "1", title: "React Compiler Notes", extractedText: "memoization details" })])
      })
    })

    await renderSidePanel(services)

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "react compiler")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.textContent).toContain("Current page match")
    expect(container?.textContent).toContain("React Compiler Notes")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderSidePanel(services: any) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(<SidePanel services={services} />)
  })

  await act(async () => { await Promise.resolve() })
}

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

function createServices(overrides: any = {}) {
  return {
    bookmarkRepository: createBookmarkRepository(),
    settingsRepository: createSettingsRepository(),
    themeRepository: createThemeRepository(),
    analyzeBookmark: vi.fn(async ({ bookmark }: { bookmark: BookmarkRecord }) => ({ ...bookmark, status: "done" })),
    createProvider: vi.fn(() => ({ analyze: vi.fn() })),
    queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
    extractPage: vi.fn(async () => "react compiler and useMemo"),
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
