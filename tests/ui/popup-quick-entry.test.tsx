// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import Popup from "../../src/popup"
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
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`)
  },
  tabs: {
    create: vi.fn(async () => undefined),
    query: vi.fn(async () => [{ id: 1, title: "Example page", url: "https://example.com/article" }])
  },
  sidePanel: {
    open: vi.fn(async () => undefined)
  }
} as any

describe("Popup quick entry", () => {
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

  it("matches the prototype popup spacing and card sizing", async () => {
    await renderPopup(createServices())

    const shell = container?.querySelector<HTMLElement>("main")
    const header = container?.querySelector<HTMLElement>("header")
    const card = Array.from(container?.querySelectorAll<HTMLElement>("section") ?? [])[0]
    const primaryAction = container?.querySelector<HTMLElement>("[data-testid='popup-primary-action']")

    expect(shell?.style.width).toBe("320px")
    expect(shell?.style.padding).toBe("16px")
    expect(header?.style.padding).toBe("")
    expect(card?.style.borderRadius).toBe("16px")
    expect(card?.style.padding).toBe("16px")
    expect(primaryAction?.style.borderRadius).toBe("8px")
    expect(primaryAction?.style.padding).toBe("8px 16px")
  })

  it("does not render bookmark list or search UI", async () => {
    await renderPopup(createServices())

    expect(container?.querySelector("#bookmark-search")).toBeNull()
    expect(container?.textContent).not.toContain("Library")
    expect(container?.querySelector("[data-bookmark-card='true']")).toBeNull()
  })

  it("renders Chinese quick-entry actions when display language is zh", async () => {
    await renderPopup(createServices())

    expect(container?.querySelector("[data-testid='popup-open-sidepanel']")?.textContent).toContain("打开侧边栏")
    expect(container?.querySelector("[data-testid='popup-open-dashboard']")?.textContent).toContain("控制台")
  })

})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderPopup(services: Partial<TestPopupServices>): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<Popup services={services} />)
  })

  await flush()
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

type TestPopupServices = {
  bookmarkRepository: BookmarkRepository
  settingsRepository: SettingsRepository
  saveCurrentPage: (input: {
    activeTab: { title?: string | null; url?: string | null }
    extractedText?: string | null
    bookmarkRepository: BookmarkRepository
  }) => Promise<BookmarkRecord>
  analyzeBookmark: (input: {
    bookmark: BookmarkRecord
    provider: AiProvider
    bookmarkRepository: BookmarkRepository
  }) => Promise<BookmarkRecord>
  extractPage: (tabId: number) => Promise<string | undefined>
  queryActiveTab: () => Promise<{ id?: number; title?: string | null; url?: string | null } | undefined>
  createProvider?: (config: ProviderConfig) => AiProvider
  themeRepository?: ThemeRepository
}

function createServices(overrides: Partial<TestPopupServices> = {}): Partial<TestPopupServices> {
  return {
    bookmarkRepository: createBookmarkRepository(),
    settingsRepository: createSettingsRepository(),
    themeRepository: {
      getTheme: vi.fn(async () => undefined),
      setTheme: vi.fn(async () => {})
    },
    saveCurrentPage: vi.fn(async ({ activeTab }) =>
      createBookmark({
        title: activeTab.title ?? "Example page",
        url: activeTab.url ?? "https://example.com/article"
      })
    ),
    analyzeBookmark: vi.fn(async ({ bookmark }) =>
      createBookmark({
        ...bookmark,
        status: "done",
        summary: "Summary",
        aiTags: ["example"],
        userTags: []
      })
    ),
    extractPage: vi.fn(async () => "Example content"),
    queryActiveTab: vi.fn(async () => ({
      id: 1,
      title: "Example page",
      url: "https://example.com/article"
    })),
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
    getProviders: vi.fn(async (): Promise<ProviderConfig[]> => []),
    saveProviders: vi.fn(async () => undefined),
    getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto",
      autoRetryOnError: false,
      displayLanguage: "zh"
    })),
    saveAppSettings: vi.fn(async () => undefined),
    ...overrides
  }
}

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "Example page",
    url: "https://example.com/article",
    extractedText: "Example content",
    aiTags: [],
    userTags: [],
    status: "saved",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  }
}
