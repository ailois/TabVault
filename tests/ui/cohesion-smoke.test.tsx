// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import Popup from "../../src/popup"
import SidePanel from "../../src/sidepanel"
import Options from "../../src/options"
import { DashboardShell } from "../../src/features/dashboard/dashboard-shell"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import type { ThemeRepository } from "../../src/lib/config/theme-repository"
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
    },
    sync: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {})
    }
  },
  runtime: {
    ...((globalThis.chrome as any)?.runtime ?? {}),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    openOptionsPage: vi.fn(async () => undefined)
  },
  tabs: {
    create: vi.fn(async () => undefined),
    query: vi.fn(async () => [{ id: 1, title: "Example page", url: "https://example.com/article" }])
  },
  sidePanel: {
    open: vi.fn(async () => undefined)
  },
  bookmarks: {
    getTree: vi.fn(async () => [{ id: "0", title: "", children: [{ id: "1", title: "Bookmarks Bar", children: [] }] }]),
    remove: vi.fn().mockResolvedValue(undefined)
  }
} as any

describe("Cross-surface cohesion smoke", () => {
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

  it("renders popup, sidepanel, dashboard, and settings with shared shell language", async () => {
    await renderSurface(
      <ThemeProvider theme={{ ...buildThemeFromOverride("light"), toggle: () => {} }}>
        <div>
          <Popup services={createPopupServices()} />
          <SidePanel services={createSidePanelServices()} />
          <DashboardShell initialBookmarks={[createBookmark({ id: "1", title: "React Docs" })]} />
          <Options services={{ settingsRepository: createSettingsRepository(), bookmarkRepository: createBookmarkRepository(), testConnection: async () => {} }} />
        </div>
      </ThemeProvider>
    )

    expect(container?.querySelector("[data-testid='popup-shell']")).not.toBeNull()
    expect(container?.querySelector("[data-testid='ghostreader-input']")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-shell']")).not.toBeNull()
    expect(container?.querySelector("[data-testid='settings-workspace']")).not.toBeNull()
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderSurface(element: React.ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(element)
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

function createThemeRepository(overrides: Partial<ThemeRepository> = {}): ThemeRepository {
  return {
    getTheme: vi.fn(async () => undefined),
    setTheme: vi.fn(async () => undefined),
    ...overrides
  }
}

function createAiProvider(): AiProvider {
  return {
    analyze: vi.fn(async () => ({ summary: "Summary", tags: ["tag"] }))
  }
}

function createPopupServices() {
  return {
    bookmarkRepository: createBookmarkRepository(),
    settingsRepository: createSettingsRepository(),
    saveCurrentPage: vi.fn(async ({ activeTab }: { activeTab: { title?: string | null; url?: string | null } }) =>
      createBookmark({ title: activeTab.title ?? "Example page", url: activeTab.url ?? "https://example.com/article" })
    ),
    analyzeBookmark: vi.fn(async ({ bookmark }: { bookmark: BookmarkRecord }) => bookmark),
    extractPage: vi.fn(async () => "Example content"),
    queryActiveTab: vi.fn(async () => ({ id: 1, title: "Example page", url: "https://example.com/article" })),
    createProvider: vi.fn(() => createAiProvider()),
    themeRepository: createThemeRepository()
  }
}

function createSidePanelServices() {
  return {
    bookmarkRepository: createBookmarkRepository(),
    settingsRepository: createSettingsRepository(),
    themeRepository: createThemeRepository(),
    analyzeBookmark: vi.fn(async ({ bookmark }: { bookmark: BookmarkRecord }) => ({ ...bookmark, status: "done" as const })),
    createProvider: vi.fn(() => createAiProvider()),
    queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
    extractPage: vi.fn(async () => "react compiler and useMemo")
  }
}
