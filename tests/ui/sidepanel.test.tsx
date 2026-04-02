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
import * as licenseService from "../../src/lib/trial/license-service"
import { TrialRepository } from "../../src/lib/trial/trial-repository"
import * as trialHooks from "../../src/lib/trial/use-trial-status"

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

  it("renders a trial banner below the search bar when trial is active", async () => {
    vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
      status: "trial",
      state: {
        installedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        analysisUsed: 3
      },
      reload: vi.fn(async () => {})
    })

    await renderSidePanel()

    expect(container?.querySelector("[data-testid='trial-banner']")).toBeTruthy()
    expect(container?.textContent).toContain("Trial active")
    expect(container?.querySelector("#sidepanel-search")).toBeTruthy()
  })

  it("renders an expired banner when the trial has expired", async () => {
    vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
      status: "expired",
      state: {
        installedAt: "2026-03-01T00:00:00.000Z",
        analysisUsed: 50
      },
      reload: vi.fn(async () => {})
    })

    await renderSidePanel()

    expect(container?.querySelector("[data-testid='trial-banner']")).toBeTruthy()
    expect(container?.textContent).toContain("Trial expired")
  })

  it("expands the license activation form when clicking the trial banner CTA", async () => {
    vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
      status: "trial",
      state: {
        installedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        analysisUsed: 3
      },
      reload: vi.fn(async () => {})
    })

    await renderSidePanel()

    const cta = container?.querySelector<HTMLButtonElement>("[data-testid='trial-banner-cta']")
    await act(async () => { cta?.click() })

    expect(container?.querySelector("[data-testid='license-activation-card']")).toBeTruthy()
    expect(container?.textContent).toContain("Activate TabVault")
  })

  it("does not render any trial region when the user is licensed", async () => {
    vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
      status: "licensed",
      state: {
        installedAt: "2026-03-01T00:00:00.000Z",
        analysisUsed: 50,
        licenseKey: "LSKEY-ABCD-1234",
        licenseStatus: "valid",
        licenseValidatedAt: "2026-03-20T12:00:00.000Z"
      },
      reload: vi.fn(async () => {})
    })

    await renderSidePanel()

    expect(container?.querySelector("[data-testid='trial-banner']")).toBeNull()
    expect(container?.querySelector("[data-testid='license-activation-card']")).toBeNull()
  })

  it("validates and saves the license key when submitting from the sidepanel", async () => {
    const reload = vi.fn(async () => {})
    const save = vi.fn(async () => {})
    const get = vi.fn(async () => ({
      installedAt: "2026-03-20T00:00:00.000Z",
      analysisUsed: 3
    }))

    vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
      status: "trial",
      state: { installedAt: "2026-03-20T00:00:00.000Z", analysisUsed: 3 },
      reload
    })
    vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("valid")
    vi.spyOn(TrialRepository.prototype, "get").mockImplementation(get)
    vi.spyOn(TrialRepository.prototype, "save").mockImplementation(save)

    await renderSidePanel()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='trial-banner-cta']")?.click()
    })

    const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      valueSetter?.call(input, "LSKEY-VALID")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const activateButton = Array.from(
      container?.querySelectorAll('[data-testid="license-activation-card"] button') ?? []
    ).find((btn): btn is HTMLButtonElement => btn.textContent === "Activate")

    await act(async () => { activateButton?.click() })

    expect(licenseService.validateLicenseKey).toHaveBeenCalledWith("LSKEY-VALID")
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        licenseKey: "LSKEY-VALID",
        licenseStatus: "valid",
        licenseValidatedAt: expect.any(String)
      })
    )
    expect(reload).toHaveBeenCalled()
  })

  it("shows an error when the license key is invalid", async () => {
    vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
      status: "trial",
      state: { installedAt: "2026-03-20T00:00:00.000Z", analysisUsed: 3 },
      reload: vi.fn(async () => {})
    })
    vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("invalid")

    await renderSidePanel()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='trial-banner-cta']")?.click()
    })

    const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      valueSetter?.call(input, "LSKEY-BAD")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const activateButton = Array.from(
      container?.querySelectorAll('[data-testid="license-activation-card"] button') ?? []
    ).find((btn): btn is HTMLButtonElement => btn.textContent === "Activate")

    await act(async () => { activateButton?.click() })

    expect(container?.textContent).toContain("This license key is invalid.")
    expect(input?.value).toBe("LSKEY-BAD")
  })

  it("renders the Ghostreader header and search entry", async () => {
    await renderSidePanel()

    expect(container?.textContent).toContain("Ghostreader")
    expect(container?.textContent).toContain("Ask about the current page")
    expect(container?.querySelector("#sidepanel-search")).not.toBeNull()
    expect(container?.querySelector("[data-testid='ghostreader-input']")).not.toBeNull()
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

    expect(setTheme).toHaveBeenCalledWith(expect.stringMatching(/obsidian|sage/))
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
      if (msg.type === "IMPORT_BOOKMARKS" && cb) cb({ success: true, count: 5 })
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
      .find(b => b.textContent?.match(/Sync Bookmarks|同步书签/))

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
      }),
      queryActiveTab: vi.fn(async () => undefined),
      extractPage: vi.fn(async () => "")
    })

    await renderSidePanel(services)

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "Drawer")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const resultLink = Array.from(container?.querySelectorAll("button") ?? []).find((btn) => btn.textContent?.includes("Drawer article"))
    await act(async () => {
      resultLink?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.querySelector("[data-testid='bookmark-drawer']")?.textContent).toContain("Drawer article")
  })

  it("shows analyzing spinner after a query result analyze action starts", async () => {
    let resolveAnalyze!: () => void
    const analyzeBookmark = vi.fn(
      () => new Promise<BookmarkRecord>((resolve) => { resolveAnalyze = () => resolve(createBookmark({ id: "bm-sp", status: "done" })) })
    )

    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [createBookmark({ id: "bm-sp", status: "saved", title: "Example page" })])
      }),
      settingsRepository: createSettingsRepository({
        getProviders: vi.fn(async () => [
          { provider: "openai" as const, apiKey: "sk-test", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", enabled: true }
        ])
      }),
      analyzeBookmark
    })

    await renderSidePanel(services)

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "Example")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const resultButton = Array.from(container?.querySelectorAll("button") ?? []).find((btn) => btn.textContent?.includes("Example page"))
    await act(async () => {
      resultButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const analyzeBtn = container?.querySelector<HTMLButtonElement>("[data-testid='drawer-analyze-button']")
    expect(analyzeBtn).not.toBeNull()

    await act(async () => {
      analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(analyzeBookmark).toHaveBeenCalledOnce()

    await act(async () => { resolveAnalyze() })
  })

  it("renders the hybrid context bar when current page context is available", async () => {
    const services = createServices({
      queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
      extractPage: vi.fn(async () => "React compiler removes useMemo boilerplate")
    })

    await renderSidePanel(services)

    expect(container?.textContent).toContain("Current page")
    expect(container?.textContent).toContain("Current React Page")
  })

  it("renders styled context and result cards instead of plain text rows", async () => {
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [createBookmark({ id: "1", title: "React Compiler Notes", extractedText: "memoization details" })])
      }),
      queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
      extractPage: vi.fn(async () => "react compiler and useMemo")
    })

    await renderSidePanel(services)

    const contextBar = container?.querySelector<HTMLElement>("[data-testid='hybrid-context-bar']")
    expect(contextBar).not.toBeNull()
    expect(contextBar?.style.borderRadius).toBe("12px")

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "react compiler")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const resultCard = container?.querySelector<HTMLElement>("[data-testid='hybrid-result-card']")
    expect(resultCard).not.toBeNull()
    expect(resultCard?.style.borderRadius).toBe("12px")
  })

  it("opens the drawer when a saved-bookmark hybrid result is selected", async () => {
    const bookmark = createBookmark({ id: "1", title: "Drawer article", extractedText: "React compiler details" })
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({ list: vi.fn(async () => [bookmark]) }),
      queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
      extractPage: vi.fn(async () => "react compiler")
    })

    await renderSidePanel(services)

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "react compiler")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const resultButton = Array.from(container?.querySelectorAll("button") ?? []).find((btn) => btn.textContent?.includes("Drawer article"))
    await act(async () => { resultButton?.click() })

    expect(container?.querySelector("[data-testid='bookmark-drawer']")?.textContent).toContain("Drawer article")
  })

  it("refreshes the answer block when clicking Ask current page", async () => {
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [createBookmark({ id: "1", title: "Saved React Note", extractedText: "saved note on compiler" })])
      }),
      queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
      extractPage: vi.fn(async () => "current page useMemo explanation")
    })

    await renderSidePanel(services)

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "compare current page with my saved react notes")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const actionButton = Array.from(container?.querySelectorAll("button") ?? []).find((btn) => btn.textContent?.includes("Ask current page"))
    expect(actionButton).not.toBeNull()

    await act(async () => { actionButton?.click() })

    const streamText = container?.textContent ?? ""
    expect(streamText).toContain("Based on Current React Page")
    expect(streamText).not.toContain("Saved React Note, Current React Page")
  })

  it("refreshes the answer block when clicking Ask top matches", async () => {
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [
          createBookmark({ id: "1", title: "Saved React Note", extractedText: "saved note on compiler" }),
          createBookmark({ id: "2", title: "Saved React Guide", extractedText: "guide for useMemo" })
        ])
      }),
      queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
      extractPage: vi.fn(async () => "current page useMemo explanation")
    })

    await renderSidePanel(services)

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "compare current page with my saved react notes")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const actionButton = Array.from(container?.querySelectorAll("button") ?? []).find((btn) => btn.textContent?.includes("Ask top matches"))
    expect(actionButton).not.toBeNull()

    await act(async () => { actionButton?.click() })

    const streamText = container?.textContent ?? ""
    expect(streamText).toContain("Based on")
    expect(streamText).toContain("Saved React Note")
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
    queryActiveTab: vi.fn(async () => undefined),
    extractPage: vi.fn(async () => ""),
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
      autoRetryOnError: false,
      displayLanguage: "en"
    })),
    saveAppSettings: vi.fn(async () => undefined),
    getProviders: vi.fn(async (): Promise<ProviderConfig[]> => []),
    saveProviders: vi.fn(async () => undefined),
    ...overrides
  }
}
