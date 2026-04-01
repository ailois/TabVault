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
import { radius, spacing } from "../../src/ui/design-tokens"

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

  it("shows current page quick-entry content on load", async () => {
    await renderPopup(createServices())

    expect(screen().text()).toContain("Browsing now")
    expect(screen().text()).toContain("Example page")
    expect(screen().getPrimaryActionButton()?.textContent).toContain("Save current page")
    expect(screen().getPopupShell()?.style.backgroundColor).toBeTruthy()
  })

  it("renders popup copy in Chinese when display language is zh", async () => {
    await renderPopup(createServices({
      settingsRepository: createSettingsRepository({
        getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
          defaultProvider: "openai",
          autoAnalyzeOnSave: false,
          summaryLanguage: "auto",
          autoRetryOnError: false,
          displayLanguage: "zh"
        }))
      })
    }))

    expect(screen().text()).toContain("正在浏览")
    expect(container?.querySelector("[data-testid='popup-open-sidepanel']")?.textContent).toContain("打开侧边栏")
    expect(container?.querySelector("[data-testid='popup-open-dashboard']")?.textContent).toContain("控制台")
    expect(screen().getPrimaryActionButton()?.textContent).toContain("保存当前页面")
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
          displayLanguage: "en"
        })),
        getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [])
      })
    })

    await renderPopup(services)
    await clickButton("Save current page")

    const statusRegion = screen().getStatusRegion()
    const errorAlert = screen().getErrorAlert()

    expect(screen().getStatusRegion()?.textContent).toContain("Saved: Example page")
    expect(statusRegion?.getAttribute("role")).toBe("status")
    expect(statusRegion?.getAttribute("aria-live")).toBe("polite")
    expect(errorAlert?.textContent).toContain("Add an API key in Settings to enable automatic analysis.")
    expect(errorAlert?.getAttribute("role")).toBe("alert")
    expect(errorAlert?.style.backgroundColor).toBeTruthy()
    expect(errorAlert?.style.color).toBeTruthy()
  })

  it("shows a save failure banner when saving the current page fails", async () => {
    const services = createServices({
      saveCurrentPage: vi.fn(async () => {
        throw new Error("Failed to save current page")
      })
    })

    await renderPopup(services)
    await clickButton("Save current page")

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
    await clickButton("Save current page")

    expect(screen().getErrorAlert()?.textContent).toContain(
      "Current tab can't be saved because its title or URL is unavailable."
    )
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
          displayLanguage: "en"
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
    await clickButton("Save current page")

    expect(screen().getButton("Analyzing...")?.textContent).toBe("Analyzing...")

    analyzeDeferred.reject(new Error("Analysis failed"))
    await flush()

    expect(screen().getStatusRegion()?.textContent).toContain("Saved: Example page")
    expect(screen().getErrorAlert()?.textContent).toContain("Analysis failed")
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
          displayLanguage: "en"
        })),
        getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [providerConfig])
      }),
      analyzeBookmark
    })

    await renderPopup(services)
    await clickButton("Save current page")

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
    expect(btn?.getAttribute("aria-label")).toMatch(/switch to (dark|light) mode/i)
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

    const settingsButton = container?.querySelector<HTMLButtonElement>("button[aria-label='Open settings']")
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

    expect(setTheme).toHaveBeenCalledWith(expect.stringMatching(/dark|light/))
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

function screen() {
  const text = () => container?.textContent ?? ""
  const getMain = () => container?.querySelector<HTMLElement>("main") ?? null
  const getPopupShell = () => container?.querySelector<HTMLElement>("[data-testid='popup-shell']") ?? null
  const getActionsSection = () =>
    container?.querySelector<HTMLElement>("section[aria-labelledby='popup-actions-title']") ?? null
  const getPrimaryActionButton = () =>
    container?.querySelector<HTMLButtonElement>("[data-testid='popup-primary-action']") ?? null
  const getSecondaryActionButton = () =>
    container?.querySelector<HTMLButtonElement>("[data-testid='popup-secondary-action']") ?? null
  const getFeedbackSection = () =>
    container?.querySelector<HTMLElement>("section[aria-labelledby='popup-feedback-title']") ?? null
  const getStatusCard = () => container?.querySelector<HTMLElement>("[data-feedback-kind='status']") ?? null
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
    getMain,
    getPopupShell,
    getActionsSection,
    getPrimaryActionButton,
    getSecondaryActionButton,
    getFeedbackSection,
    getStatusCard,
    getStatusRegion,
    getErrorAlert,
    getLibrarySection,
    getBookmarkCards,
    getButton
  }
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
  themeRepository?: import("../../src/lib/config/theme-repository").ThemeRepository
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
    getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto",
      autoRetryOnError: false,
      displayLanguage: "en"
    })),
    saveAppSettings: vi.fn(async () => undefined),
    getProviders: vi.fn(async (): Promise<ProviderConfig[]> => []),
    saveProviders: vi.fn(async () => undefined),
    ...overrides
  }
}

function createAiProvider(config: ProviderConfig): AiProvider {
  return {
    analyze: vi.fn(async () => ({
      summary: `${config.provider} summary`,
      tags: [config.provider]
    }))
  }
}

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "Example page",
    url: "https://example.com/article",
    aiTags: [],
    userTags: [],
    status: "saved",
    createdAt: "2026-03-07T10:00:00.000Z",
    updatedAt: "2026-03-07T10:00:00.000Z",
    ...overrides
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function normalizeCssColor(value: string): string {
  const element = document.createElement("div")
  element.style.color = value

  return element.style.color
}
