// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DashboardAiSidebar } from "../../src/features/dashboard/dashboard-ai-sidebar"
import { DEFAULT_APP_SETTINGS } from "../../src/features/settings/default-settings"
import SidePanel from "../../src/sidepanel"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import type { AiProvider } from "../../src/lib/providers/provider"
import type { ThemeRepository } from "../../src/lib/config/theme-repository"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../../src/types/bookmark"
import type { AppSettings, ProviderConfig } from "../../src/types/settings"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"

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
    query: vi.fn(async () => [{ id: 1, title: "Current Page", url: "https://example.com/current" }])
  },
  sidePanel: {
    open: vi.fn(async () => undefined)
  },
  bookmarks: {
    getTree: vi.fn(async () => [])
  }
} as any

describe("Ghostreader session fallback", () => {
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

  it("keeps sidepanel Ghostreader usable when session storage fails", async () => {
    const analyze = vi.fn(async () => ({ summary: "Sidepanel still answered", tags: [] }))

    await renderSidePanel({
      bookmarkRepository: createBookmarkRepository(),
      settingsRepository: createSettingsRepository(),
      themeRepository: createThemeRepository(),
      analyzeBookmark: vi.fn(async ({ bookmark }: { bookmark: BookmarkRecord }) => ({ ...bookmark, status: "done" })),
      createProvider: vi.fn(() => ({ analyze })),
      queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current Page", url: "https://example.com/current" })),
      extractPage: vi.fn(async () => "Current page content"),
      ghostreaderSessionStore: {
        loadSessions: vi.fn(async () => {
          throw new Error("storage unavailable")
        }),
        saveSessions: vi.fn(async () => {
          throw new Error("storage unavailable")
        }),
        clearActiveSession: vi.fn(async () => undefined)
      }
    })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    expect(container?.querySelector("[data-testid='sidepanel-session-persistence-warning']")).not.toBeNull()

    await act(async () => {
      setValue?.call(input, "What is this page?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    expect(analyze).toHaveBeenCalledOnce()
    expect(container?.textContent).toContain("Sidepanel still answered")
    expect(container?.querySelector("[data-testid='sidepanel-session-persistence-warning']")).not.toBeNull()
  })

  it("keeps dashboard Ghostreader usable when session saving fails", async () => {
    const analyze = vi.fn(async () => ({ summary: "Dashboard still answered", tags: [] }))

    await renderDashboard(
      createBookmark({
        id: "bookmark-1",
        title: "React Docs",
        url: "https://react.dev",
        extractedText: "React content"
      }),
      {
        createProvider: vi.fn(() => ({ analyze })),
        settingsRepository: createSettingsRepository(),
        ghostreaderSessionStore: {
          loadSessions: vi.fn(async () => ({
            activeSessionId: null,
            sessions: [],
            version: 1
          })),
          saveSessions: vi.fn(async () => {
            throw new Error("storage unavailable")
          }),
          clearActiveSession: vi.fn(async () => undefined)
        }
      }
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setValue?.call(input, "What is this page?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    expect(analyze).toHaveBeenCalledOnce()
    expect(container?.textContent).toContain("Dashboard still answered")
    expect(container?.querySelector("[data-testid='dashboard-session-persistence-warning']")).not.toBeNull()
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

  await act(async () => {
    await Promise.resolve()
  })
}

async function renderDashboard(
  bookmark: BookmarkRecord,
  overrides: {
    settingsRepository?: SettingsRepository
    createProvider?: (config: ProviderConfig) => AiProvider
    ghostreaderSessionStore?: {
      loadSessions: () => Promise<{ activeSessionId: string | null; sessions: any[]; version: number }>
      saveSessions: (input: { activeSessionId: string | null; sessions: any[] }) => Promise<void>
      clearActiveSession: () => Promise<void>
    }
  } = {}
) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardAiSidebar bookmark={bookmark} language="en" {...overrides} />
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
      ...DEFAULT_APP_SETTINGS,
      defaultProvider: "openai",
      displayLanguage: "en"
    })),
    saveAppSettings: vi.fn(async () => undefined),
    getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
      {
        provider: "openai",
        apiKey: "test-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        enabled: true
      }
    ]),
    saveProviders: vi.fn(async () => undefined),
    ...overrides
  }
}
