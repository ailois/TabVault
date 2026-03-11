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
import { colors, controls, radius, shadow, spacing } from "../../src/ui/design-tokens"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

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

  it("shows a loading state while bookmarks are being fetched", async () => {
    const listDeferred = createDeferred<BookmarkRecord[]>()
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(() => listDeferred.promise)
      })
    })

    await renderPopup(services)

    expect(screen().getButton("Loading bookmarks...")?.textContent).toBe("Loading bookmarks...")
    expect(screen().getButton("Loading bookmarks...")?.hasAttribute("disabled")).toBe(true)

    listDeferred.resolve([])
    await flush()
  })

  it("renders a popup shell with header copy and a dedicated actions section", async () => {
    await renderPopup(createServices())

    expect(screen().getMain()?.querySelector("header h1")?.textContent).toBe("TabVault")
    expect(screen().text()).toContain("Save and search your local bookmark library.")

    const actionsSection = screen().getActionsSection()

    expect(actionsSection?.querySelector("h2")?.textContent).toBe("Actions")
    expect(actionsSection?.textContent).toContain("Save current page")
    expect(actionsSection?.textContent).toContain("Reload bookmarks")

    expect(screen().getMain()?.style.padding).toBe(spacing.md)
    expect(screen().getPopupShell()?.style.backgroundColor).toBe(normalizeCssColor(colors.page))
    expect(actionsSection?.style.backgroundColor).toBe(normalizeCssColor(colors.surfaceElevated))
    expect(actionsSection?.style.borderRadius).toBe(radius.large)
    expect(actionsSection?.style.boxShadow).toBe(shadow.soft)
    expect(screen().getPrimaryActionButton()?.style.backgroundColor).toBe(normalizeCssColor(controls.primary.background))
    expect(screen().getSecondaryActionButton()?.style.backgroundColor).toBe(normalizeCssColor(controls.secondary.background))
  })

  it("renders search and bookmark count inside a dedicated library section", async () => {
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [createBookmark(), createBookmark({ id: "bookmark-2", title: "Second page" })])
      })
    })

    await renderPopup(services)

    const librarySection = screen().getLibrarySection()
    const searchInput = container?.querySelector("#bookmark-search")

    expect(librarySection?.querySelector("h2")?.textContent).toBe("Library")
    expect(librarySection?.textContent).toContain("Search bookmarks")
    expect(searchInput?.getAttribute("type")).toBe("search")
    expect(librarySection?.textContent).toContain("2 bookmark(s)")
  })

  it("renders bookmark results as cards with title, metadata, summary, and tags", async () => {
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [
          createBookmark({
            summary: "A concise page summary.",
            tags: ["research", "alpha"]
          })
        ])
      })
    })

    await renderPopup(services)

    const [bookmarkCard] = screen().getBookmarkCards()
    const metadata = bookmarkCard?.querySelector<HTMLElement>("p") ?? null
    const tag = bookmarkCard?.querySelector<HTMLElement>("ul li") ?? null

    expect(bookmarkCard?.querySelector("h3 a")?.textContent).toBe("Example page")
    expect(bookmarkCard?.querySelector("p")?.textContent).toContain("example.com")
    expect(bookmarkCard?.querySelector("p")?.textContent).not.toContain("https://example.com/article")
    expect(bookmarkCard?.textContent).toContain("A concise page summary.")
    expect(bookmarkCard?.textContent).toContain("research")
    expect(bookmarkCard?.textContent).toContain("alpha")
    expect(bookmarkCard?.style.backgroundColor).toBe(normalizeCssColor(colors.surfaceElevated))
    expect(bookmarkCard?.style.borderColor).toBe(normalizeCssColor(colors.border))
    expect(bookmarkCard?.style.borderRadius).toBe(radius.large)
    expect(bookmarkCard?.style.padding).toBe(spacing.md)
    expect(metadata?.style.color).toBe(normalizeCssColor(colors.textMuted))
    expect(tag?.style.backgroundColor).toBe(normalizeCssColor(colors.surfaceMuted))
    expect(tag?.style.color).toBe(normalizeCssColor(colors.textSecondary))
    expect(tag?.style.borderRadius).toBe(radius.pill)
  })

  it("preserves the empty-state message when no bookmarks exist", async () => {
    await renderPopup(createServices())

    expect(screen().text()).toContain("No bookmarks found.")
  })

  it("shows save success and a missing API key hint when auto-analysis cannot start", async () => {
    const services = createServices({
      settingsRepository: createSettingsRepository({
        getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
          defaultProvider: "openai",
          autoAnalyzeOnSave: true
        })),
        getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [])
      })
    })

    await renderPopup(services)
    await clickButton("Save current page")

    const feedbackSection = screen().getFeedbackSection()
    const statusRegion = screen().getStatusRegion()
    const errorAlert = screen().getErrorAlert()

    expect(feedbackSection?.querySelector("h2")?.textContent).toBe("Feedback")
    expect(statusRegion?.textContent).toContain("Saved: Example page")
    expect(statusRegion?.getAttribute("role")).toBe("status")
    expect(statusRegion?.getAttribute("aria-live")).toBe("polite")
    expect(errorAlert?.textContent).toContain("Add an API key in Settings to enable automatic analysis.")
    expect(errorAlert?.getAttribute("role")).toBe("alert")
    expect(screen().getStatusCard()?.style.backgroundColor).toBe(normalizeCssColor(colors.surface))
    expect(screen().getStatusCard()?.style.borderRadius).toBe(radius.medium)
    expect(errorAlert?.style.backgroundColor).toBe(normalizeCssColor(colors.surface))
    expect(errorAlert?.style.borderColor).toBe(normalizeCssColor(colors.textDanger))
  })

  it("shows a save failure banner when saving the current page fails", async () => {
    const services = createServices({
      saveCurrentPage: vi.fn(async () => {
        throw new Error("Failed to save current page")
      })
    })

    await renderPopup(services)
    await clickButton("Save current page")

    expect(screen().getFeedbackSection()).not.toBeNull()
    expect(screen().getStatusRegion()?.textContent).toContain("Ready to save the current page.")
    expect(screen().getErrorAlert()?.textContent).toContain("Failed to save current page")
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
          autoAnalyzeOnSave: true
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

    expect(screen().getStatusRegion()?.textContent).toContain("Analyzing saved bookmark...")
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
          autoAnalyzeOnSave: true
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

  it("removes a bookmark from the list after it is deleted", async () => {
    const bookmark = createBookmark({ id: "bm-to-delete", title: "Page to delete" })
    vi.spyOn(window, "confirm").mockReturnValue(true)

    const deleteBookmark = vi.fn(async () => undefined)
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [bookmark]),
        delete: deleteBookmark
      })
    })

    await renderPopup(services)

    expect(screen().text()).toContain("Page to delete")

    const deleteBtn = container?.querySelector<HTMLButtonElement>("[data-testid='bookmark-delete-button']")

    await act(async () => {
      deleteBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    await flush()

    expect(deleteBookmark).toHaveBeenCalledWith("bm-to-delete")
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
    container?.querySelector<HTMLElement>("[data-feedback-kind='status'] [role='status']") ?? null
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
}

function createServices(overrides: Partial<TestPopupServices> = {}): Partial<TestPopupServices> {
  return {
    bookmarkRepository: createBookmarkRepository(),
    settingsRepository: createSettingsRepository(),
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
        tags: ["example"]
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
    ...overrides
  }
}

function createSettingsRepository(overrides: Partial<SettingsRepository> = {}): SettingsRepository {
  return {
    getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false
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
    tags: [],
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
