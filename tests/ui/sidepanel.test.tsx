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
let storageChangeListener: ((changes: Record<string, chrome.storage.StorageChange>, areaName?: string) => void) | null = null

globalThis.chrome = {
  ...(globalThis.chrome ?? {}),
  storage: {
    ...((globalThis.chrome as any)?.storage ?? {}),
    sync: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {})
    },
    local: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {})
    },
    onChanged: {
      addListener: vi.fn((listener) => {
        storageChangeListener = listener
      }),
      removeListener: vi.fn((listener) => {
        if (storageChangeListener === listener) {
          storageChangeListener = null
        }
      })
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

  it("does not render the sidepanel trial promotion UI when trial is active", async () => {
    vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
      status: "trial",
      state: {
        installedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        analysisUsed: 3
      },
      reload: vi.fn(async () => {})
    })

    await renderSidePanel()

    expect(container?.querySelector("[data-testid='trial-banner']")).toBeNull()
    expect(container?.textContent).not.toContain("Trial active")
    expect(container?.querySelector("#sidepanel-search")).toBeTruthy()
  })

  it("does not render the sidepanel trial promotion UI when the trial has expired", async () => {
    vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
      status: "expired",
      state: {
        installedAt: "2026-03-01T00:00:00.000Z",
        analysisUsed: 50
      },
      reload: vi.fn(async () => {})
    })

    await renderSidePanel()

    expect(container?.querySelector("[data-testid='trial-banner']")).toBeNull()
    expect(container?.textContent).not.toContain("Trial expired")
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



  it("renders the Ghostreader header and search entry", async () => {
    await renderSidePanel()

    expect(container?.textContent).toContain("Ghostreader")
    expect(container?.textContent).toContain("Ask about the current page")
    expect(container?.querySelector("#sidepanel-search")).not.toBeNull()
    expect(container?.querySelector("[data-testid='ghostreader-input']")).not.toBeNull()
  })

  it("renders localized sidepanel copy when display language is zh", async () => {
    await renderSidePanel(
      createServices({
        settingsRepository: createSettingsRepository({
          getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
            defaultProvider: "openai",
            autoAnalyzeOnSave: false,
            summaryLanguage: "auto",
            autoRetryOnError: false,
            displayLanguage: "zh",
            theme: "sage"
          }))
        }),
        queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
        extractPage: vi.fn(async () => "react compiler and useMemo")
      })
    )

    expect(container?.querySelector<HTMLInputElement>("#sidepanel-search")?.placeholder).toContain("\u641c\u7d22\u4e66\u7b7e")
    expect(container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")?.placeholder).toContain("Ghostreader")
    expect(container?.textContent).toContain("\u5f53\u524d\u9875\u9762")
    expect(container?.textContent).toContain("\u540c\u6b65\u4e66\u7b7e")
    expect(container?.textContent).toContain("\u603b\u7ed3\u91cd\u70b9")
  })

  it("localizes sidepanel action aria labels in Chinese", async () => {
    await renderSidePanel(
      createServices({
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
      })
    )

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "React")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.querySelector<HTMLButtonElement>("[data-testid='sidepanel-search-clear']")?.getAttribute("aria-label")).toContain("\u6e05\u7a7a\u641c\u7d22")
    expect(container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.getAttribute("aria-label")).toContain("\u53d1\u9001\u7ed9 Ghostreader")
  })

  it("reacts to synced display language changes after mount", async () => {
    await renderSidePanel()

    await act(async () => {
      storageChangeListener?.({
        "app-settings": {
          oldValue: { displayLanguage: "en" },
          newValue: { displayLanguage: "zh" }
        } as chrome.storage.StorageChange
      }, "sync")
    })

    expect(container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.getAttribute("aria-label")).toContain("\u53d1\u9001\u7ed9 Ghostreader")
  })

  it("passes localized zh copy into the bookmark drawer", async () => {
    await renderSidePanel(
      createServices({
        settingsRepository: createSettingsRepository({
          getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
            defaultProvider: "openai",
            autoAnalyzeOnSave: false,
            summaryLanguage: "auto",
            autoRetryOnError: false,
            displayLanguage: "zh",
            theme: "sage"
          }))
        }),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [createBookmark({ id: "zh-drawer", title: "React Notes", extractedText: "react hooks and compiler" })])
        }),
        queryActiveTab: vi.fn(async () => undefined),
        extractPage: vi.fn(async () => "")
      })
    )

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "React")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const resultButton = Array.from(container?.querySelectorAll("button") ?? []).find((btn) => btn.textContent?.includes("React Notes"))
    await act(async () => { resultButton?.click() })
    await act(async () => { await Promise.resolve() })

    const drawerText = container?.querySelector("[data-testid='bookmark-drawer']")?.textContent ?? ""
    expect(drawerText).toContain("\u94fe\u63a5")
    expect(drawerText).toContain("\u6253\u5f00")
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

    const importBtn = container?.querySelector<HTMLButtonElement>("[data-testid='sidepanel-import-button']")

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

  it("finds Chinese-title bookmarks from a natural-language Chinese Ghostreader query", async () => {
    const bookmarks = [
      createBookmark({ id: "1", title: "\u6768\u5e42\u91c7\u8bbf\u5408\u96c6" }),
      createBookmark({ id: "2", title: "Vitest Guide" })
    ]
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => bookmarks)
      }),
      queryActiveTab: vi.fn(async () => ({ id: 1, title: "\u5a31\u4e50\u8d44\u8baf", url: "https://example.com/current" })),
      extractPage: vi.fn(async () => "\u6768\u5e42\u76f8\u5173\u65b0\u95fb\u6574\u7406")
    })

    await renderSidePanel(services)

    const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(searchInput, "\u5173\u4e8e\u6768\u5e42\u7684\u4e66\u7b7e\u6709\u54ea\u4e9b\uff1f")
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.textContent).toContain("\u6768\u5e42\u91c7\u8bbf\u5408\u96c6")
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

  it("shows a localized analyze error when drawer analysis fails", async () => {
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [createBookmark({ id: "bm-fail", status: "saved", title: "Example page" })])
      }),
      settingsRepository: createSettingsRepository({
        getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
          defaultProvider: "openai",
          autoAnalyzeOnSave: false,
          summaryLanguage: "auto",
          autoRetryOnError: false,
          displayLanguage: "zh",
          theme: "sage"
        })),
        getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
          { provider: "openai", apiKey: "sk-test", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", enabled: true }
        ])
      }),
      analyzeBookmark: vi.fn(async () => {
        throw new Error("Analysis failed")
      })
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
    await act(async () => { resultButton?.click() })
    await act(async () => { await Promise.resolve() })

    const analyzeBtn = container?.querySelector<HTMLButtonElement>("[data-testid='drawer-analyze-button']")
    await act(async () => {
      analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    const errorAlert = container?.querySelector<HTMLElement>("[role='alert']")
    expect(errorAlert?.textContent).toContain("\u5206\u6790\u4e66\u7b7e\u5931\u8d25")
    expect(errorAlert?.textContent).not.toContain("Analysis failed")
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

    const actionButton = container?.querySelector<HTMLButtonElement>("[data-testid='hybrid-action-ask-current-page']")
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

    const actionButton = container?.querySelector<HTMLButtonElement>("[data-testid='hybrid-action-ask-top-matches']")
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
      displayLanguage: "en",
      theme: "sage"
    })),
    saveAppSettings: vi.fn(async () => undefined),
    getProviders: vi.fn(async (): Promise<ProviderConfig[]> => []),
    saveProviders: vi.fn(async () => undefined),
    ...overrides
  }
}

