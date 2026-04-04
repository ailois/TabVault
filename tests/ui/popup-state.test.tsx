// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import Popup from "../../src/popup"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import { ClaudeProvider } from "../../src/lib/providers/claude-provider"
import { GeminiProvider } from "../../src/lib/providers/gemini-provider"
import { OpenAiCompatibleProvider } from "../../src/lib/providers/openai-compatible-provider"
import type { AiProvider } from "../../src/lib/providers/provider"
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
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    openOptionsPage: vi.fn(async () => undefined)
  },
  tabs: {
    create: vi.fn(async () => undefined),
    query: vi.fn(async () => [{ id: 1, title: "Example page", url: "https://example.com/article" }])
  },
  sidePanel: {
    open: vi.fn(async () => undefined)
  }
} as any

describe("Popup state", () => {
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

  it("renders the unsynced popup state when current page is not saved", async () => {
    await renderPopup(createServices())

    expect(container?.querySelector('[data-testid="popup-unsynced-view"]')).not.toBeNull()
    expect(screen().text()).toContain("Example page")
    expect(screen().getPrimaryActionButton()?.textContent).toContain("\u4fdd\u5b58\u5f53\u524d\u9875\u9762")
  })

  it("renders the synced popup state when current page already exists", async () => {
    await renderPopup(createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [
          createBookmark({
            title: "Example page",
            url: "https://example.com/article",
            summary: "Saved summary",
            aiTags: ["example"]
          })
        ])
      })
    }))

    expect(container?.querySelector('[data-testid="popup-synced-view"]')).not.toBeNull()
    expect(container?.textContent).toContain("Saved summary")
    expect(container?.textContent).toContain("example")
    expect(container?.textContent).toContain("\u5df2\u5728\u5e93\u4e2d")
  })

  it("renders popup copy in Chinese when display language is zh", async () => {
    await renderPopup(createServices({
      settingsRepository: createSettingsRepository({
        getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
          defaultProvider: "openai",
          autoAnalyzeOnSave: false,
          summaryLanguage: "auto",
          autoRetryOnError: false,
          displayLanguage: "zh",
          theme: "sage"
        }))
      })
    }))

    expect(container?.querySelector("[data-testid='popup-open-sidepanel']")?.textContent).toContain("\u6253\u5f00\u4fa7\u8fb9\u680f")
    expect(container?.querySelector("[data-testid='popup-open-dashboard']")?.textContent).toContain("\u6253\u5f00\u9762\u677f")
    expect(screen().getPrimaryActionButton()?.textContent).toContain("\u4fdd\u5b58\u5f53\u524d\u9875\u9762")
  })

  it("does not render search, library, or bookmark management UI", async () => {
    await renderPopup(createServices())

    expect(container?.querySelector("#bookmark-search")).toBeNull()
    expect(screen().getActionsSection()).toBeNull()
    expect(screen().getLibrarySection()).toBeNull()
    expect(screen().getBookmarkCards()).toHaveLength(0)
  })

  it("shows save success and a missing API key hint when auto-analysis cannot start", async () => {
    const services = createServices({
      settingsRepository: createSettingsRepository({
        getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
          defaultProvider: "openai",
          autoAnalyzeOnSave: true,
          summaryLanguage: "auto",
          autoRetryOnError: false,
          displayLanguage: "zh",
          theme: "sage"
        })),
        getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [])
      })
    })

    await renderPopup(services)
    await clickButton("\u4fdd\u5b58\u5f53\u524d\u9875\u9762")

    const statusRegion = screen().getStatusRegion()
    const errorAlert = screen().getErrorAlert()

    expect(screen().getStatusRegion()?.textContent).toContain("\u5df2\u4fdd\u5b58\uff1aExample page")
    expect(statusRegion?.getAttribute("role")).toBe("status")
    expect(statusRegion?.getAttribute("aria-live")).toBe("polite")
    expect(errorAlert?.textContent).toContain("\u8bf7\u5148\u5728\u8bbe\u7f6e\u4e2d\u586b\u5199 API Key\uff0c\u624d\u80fd\u542f\u7528\u81ea\u52a8\u5206\u6790\u3002")
    expect(errorAlert?.getAttribute("role")).toBe("alert")
  })

  it("shows a save failure banner when saving the current page fails", async () => {
    const services = createServices({
      saveCurrentPage: vi.fn(async () => {
        throw new Error("Failed to save current page")
      })
    })

    await renderPopup(services)
    await clickButton("\u4fdd\u5b58\u5f53\u524d\u9875\u9762")

    expect(screen().getErrorAlert()?.textContent).toContain("Failed to save current page")
    expect(screen().getStatusRegion()).toBeNull()
  })

  it("shows a clearer message when the active tab metadata is unavailable", async () => {
    const { saveCurrentPage } = await import("../../src/features/bookmarks/save-current-page")
    const services = createServices({
      bookmarkRepository: createBookmarkRepository(),
      queryActiveTab: vi.fn(async () => ({ id: 1, title: null, url: null })),
      saveCurrentPage
    })

    await renderPopup(services)
    await clickButton("\u4fdd\u5b58\u5f53\u524d\u9875\u9762")

    expect(screen().getErrorAlert()?.textContent).toContain("\u5f53\u524d\u6807\u7b7e\u9875\u7f3a\u5c11\u6807\u9898\u6216 URL\uff0c\u65e0\u6cd5\u4fdd\u5b58\u3002")
    expect(screen().text()).not.toContain("Active tab title is required")
  })

  it("shows analyzing state and then surfaces analysis failure after save succeeds", async () => {
    const analyzeDeferred = createDeferred<BookmarkRecord>()
    const services = createServices({
      settingsRepository: createSettingsRepository({
        getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
          defaultProvider: "openai",
          autoAnalyzeOnSave: true,
          summaryLanguage: "auto",
          autoRetryOnError: false,
          displayLanguage: "zh",
          theme: "sage"
        })),
        getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
          {
            provider: "openai",
            apiKey: "sk-test",
            baseUrl: "https://api.example.com",
            model: "gpt-4o-mini",
            enabled: true
          }
        ])
      }),
      analyzeBookmark: vi.fn(() => analyzeDeferred.promise),
      createProvider: vi.fn((config) => createAiProvider(config))
    })

    await renderPopup(services)
    await clickButton("\u4fdd\u5b58\u5f53\u524d\u9875\u9762")

    expect(screen().getStatusRegion()).toBeNull()

    analyzeDeferred.reject(new Error("Analysis failed"))
    await flush()

    expect(screen().getStatusRegion()?.textContent).toContain("\u5df2\u4fdd\u5b58\uff1aExample page")
    expect(screen().getErrorAlert()?.textContent).toContain("\u5206\u6790\u4e66\u7b7e\u5931\u8d25")
  })

  it.each<readonly [ProviderConfig["provider"], ProviderConfig]>([
    [
      "openai",
      {
        provider: "openai",
        apiKey: "sk-openai",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        enabled: true
      }
    ],
    [
      "claude",
      {
        provider: "claude",
        apiKey: "sk-claude",
        model: "claude-sonnet-4-5",
        enabled: true
      }
    ],
    [
      "gemini",
      {
        provider: "gemini",
        apiKey: "sk-gemini",
        model: "gemini-1.5-flash",
        enabled: true
      }
    ]
  ])("routes %s auto-analysis through the default provider factory", async (providerName, providerConfig) => {
    const analyzeBookmark = vi.fn(
      async ({ bookmark }: { bookmark: BookmarkRecord; provider: AiProvider }) => bookmark
    )
    const services = createServices({
      settingsRepository: createSettingsRepository({
        getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
          defaultProvider: providerConfig.provider,
          autoAnalyzeOnSave: true,
          summaryLanguage: "auto",
          autoRetryOnError: false,
          displayLanguage: "zh",
          theme: "sage"
        })),
        getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [providerConfig])
      }),
      analyzeBookmark
    })

    await renderPopup(services)
    await clickButton("\u4fdd\u5b58\u5f53\u524d\u9875\u9762")

    const provider = analyzeBookmark.mock.calls[0]?.[0]?.provider

    if (providerName === "openai") {
      expect(provider).toBeInstanceOf(OpenAiCompatibleProvider)
    }

    if (providerName === "claude") {
      expect(provider).toBeInstanceOf(ClaudeProvider)
    }

    if (providerName === "gemini") {
      expect(provider).toBeInstanceOf(GeminiProvider)
    }
  })

  it("renders a theme toggle button in the header area", async () => {
    await renderPopup(createServices())
    const btn = container?.querySelector<HTMLButtonElement>("[data-testid='theme-toggle-button']")
    expect(btn).not.toBeNull()
    expect(btn?.getAttribute("aria-label")).toMatch(/switch to (dark|light) mode|\u5207\u6362\u5230[\u6df1\u6d45]\u8272\u6a21\u5f0f/i)
  })

  it("localizes the theme toggle label in Chinese", async () => {
    await renderPopup(createServices())

    const btn = container?.querySelector<HTMLButtonElement>("[data-testid='theme-toggle-button']")

    expect(btn?.getAttribute("aria-label")).toContain("\u5207\u6362\u5230\u6df1\u8272\u6a21\u5f0f")
  })

  it("uses localized save fallback for internal storage errors", async () => {
    const services = createServices({
      saveCurrentPage: vi.fn(async () => {
        throw new Error("Failed to open bookmark database")
      })
    })

    await renderPopup(services)
    await clickButton("\u4fdd\u5b58\u5f53\u524d\u9875\u9762")

    expect(screen().getErrorAlert()?.textContent).toContain("\u4fdd\u5b58\u5f53\u524d\u9875\u9762\u5931\u8d25")
    expect(screen().getErrorAlert()?.textContent).not.toContain("Failed to open bookmark database")
  })

  it("opens settings from the header action", async () => {
    const openOptionsPage = vi.fn(async () => undefined)
    globalThis.chrome = {
      ...globalThis.chrome,
      runtime: {
        ...globalThis.chrome.runtime,
        openOptionsPage
      }
    } as any

    await renderPopup(createServices())

    const settingsButton = container?.querySelector<HTMLButtonElement>("[data-testid='popup-settings-button']")
    await act(async () => { settingsButton?.click() })
    await flush()

    expect(openOptionsPage).toHaveBeenCalled()
  })

  it("calls themeRepository.setTheme and sends THEME_CHANGED when toggle is clicked", async () => {
    const setTheme = vi.fn(async () => {})
    const sendMessage = vi.fn()
    globalThis.chrome = { ...globalThis.chrome, runtime: { ...globalThis.chrome?.runtime, sendMessage, onMessage: { addListener: vi.fn(), removeListener: vi.fn() } } } as any

    await renderPopup({
      ...createServices(),
      themeRepository: { getTheme: vi.fn(async () => undefined), setTheme }
    })

    const btn = container?.querySelector<HTMLButtonElement>("[data-testid='theme-toggle-button']")
    await act(async () => { btn?.click() })
    await flush()

    expect(setTheme).toHaveBeenCalledWith(expect.stringMatching(/obsidian|sage/))
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "THEME_CHANGED" }))
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

async function clickButton(name: string): Promise<void> {
  const button = screen().getButton(name)

  if (!button) {
    throw new Error(`Button not found: ${name}`)
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
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
  themeRepository?: { getTheme: () => Promise<any>; setTheme: (theme: any) => Promise<void> }
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
      displayLanguage: "zh",
      theme: "sage"
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

function createAiProvider(_config: ProviderConfig): AiProvider {
  return {
    analyze: vi.fn(async () => ({ summary: "Summary", tags: ["tag"] }))
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function screen() {
  const text = () => container?.textContent ?? ""
  const getPopupShell = () => container?.querySelector<HTMLElement>("[data-testid='popup-shell']") ?? null
  const getActionsSection = () =>
    container?.querySelector<HTMLElement>("section[aria-labelledby='popup-actions-title']") ?? null
  const getPrimaryActionButton = () =>
    container?.querySelector<HTMLButtonElement>("[data-testid='popup-primary-action']") ?? null
  const getStatusRegion = () =>
    container?.querySelector<HTMLElement>("[role='status']") ?? null
  const getErrorAlert = () =>
    container?.querySelector<HTMLElement>("[role='alert']") ?? null
  const getLibrarySection = () =>
    container?.querySelector<HTMLElement>("section[aria-labelledby='popup-library-title']") ?? null
  const getBookmarkCards = () =>
    Array.from(container?.querySelectorAll<HTMLElement>("article[data-bookmark-card='true']") ?? [])
  const getButton = (name: string) =>
    Array.from(container?.querySelectorAll("button") ?? []).find((button) => button.textContent?.includes(name))

  return {
    text,
    getPopupShell,
    getActionsSection,
    getPrimaryActionButton,
    getStatusRegion,
    getErrorAlert,
    getLibrarySection,
    getBookmarkCards,
    getButton
  }
}
