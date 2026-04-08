// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DashboardAiSidebar } from "../../src/features/dashboard/dashboard-ai-sidebar"
import { DEFAULT_APP_SETTINGS } from "../../src/features/settings/default-settings"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import type { AiProvider } from "../../src/lib/providers/provider"
import type { DisplayLanguage, ProviderConfig } from "../../src/types/settings"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import type { BookmarkRecord } from "../../src/types/bookmark"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("Dashboard ask box", () => {
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

  it("renders ask input and submit button", async () => {
    await renderSidebar(createBookmark())

    expect(container?.querySelector("[data-testid='dashboard-ai-sidebar']")?.getAttribute("aria-label")).toBe("AI tools")
    expect(container?.querySelector("[data-testid='dashboard-ask-input']")).not.toBeNull()
    expect(container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.disabled).toBe(true)
    expect(container?.querySelector("[data-testid='dashboard-ask-submit-icon'] svg")).not.toBeNull()
  })

  it("shows an answer block after submitting a question", async () => {
    const provider = {
      analyze: vi.fn(async () => ({ summary: "杨幂相关书签的网站是 https://yangmi.example。", tags: [] }))
    }
    const createProvider = vi.fn(() => provider)
    const settingsRepository = createSettingsRepository()
    const activeBookmark = createBookmark({
      id: "react-docs",
      title: "React Docs",
      extractedText: "React lets you build user interfaces.",
      summary: "React summary"
    })
    const yangMiBookmark = createBookmark({
      id: "yangmi-site",
      title: "杨幂资讯站",
      url: "https://yangmi.example",
      extractedText: "杨幂 影视 资讯"
    })

    await renderSidebar(activeBookmark, "zh", {
      bookmarks: [activeBookmark, yangMiBookmark],
      createProvider,
      settingsRepository
    })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(input, "关于杨幂的书签，网站是哪个？")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const submit = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")
    expect(submit?.disabled).toBe(false)
    await act(async () => {
      submit?.click()
    })

    expect(provider.analyze).toHaveBeenCalledOnce()
    const analyzeInput = provider.analyze.mock.calls.at(0)?.at(0) as { content: string } | undefined
    expect(analyzeInput).toBeDefined()
    if (!analyzeInput) {
      throw new Error("Expected analyze input")
    }
    expect(analyzeInput.content).toContain("杨幂资讯站")
    expect(analyzeInput.content).toContain("https://yangmi.example")
    expect(container?.textContent).toContain("杨幂相关书签的网站是 https://yangmi.example。")
    expect(container?.textContent).toContain("杨幂资讯站")
  })

  it("renders localized ask box copy in zh", async () => {
    await renderSidebar(createBookmark(), "zh")

    expect(container?.querySelector("[data-testid='dashboard-ai-sidebar']")?.getAttribute("aria-label")).toContain("\u667a\u80fd\u5de5\u5177")
    expect(container?.textContent).toContain("\u8be2\u95ee Ghostreader")
    expect(container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")?.placeholder).toContain("Ghostreader \u8be2\u95ee\u8fd9\u4e2a\u4e66\u7b7e")
  })

  it("shows a loading icon while the dashboard ask request is in flight", async () => {
    let resolveAnalyze: ((value: { summary: string; tags: string[] }) => void) | null = null
    const provider = {
      analyze: vi.fn(
        () =>
          new Promise<{ summary: string; tags: string[] }>((resolve) => {
            resolveAnalyze = resolve
          })
      )
    }
    const createProvider = vi.fn(() => provider)

    await renderSidebar(createBookmark(), "en", {
      createProvider,
      settingsRepository: createSettingsRepository()
    })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(input, "Which bookmarks mention React?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    expect(container?.querySelector("[data-testid='dashboard-ask-submit-loading'] svg")).not.toBeNull()

    await act(async () => {
      resolveAnalyze?.({ summary: "React bookmarks", tags: [] })
      await Promise.resolve()
    })
  })

  it("keeps current-bookmark summary questions out of cross-bookmark dashboard context", async () => {
    const provider = {
      analyze: vi.fn(async () => ({ summary: "This bookmark focuses on React UI concepts.", tags: [] }))
    }
    const createProvider = vi.fn(() => provider)
    const settingsRepository = createSettingsRepository()
    const activeBookmark = createBookmark({
      id: "react-docs",
      title: "React Docs",
      extractedText: "React lets you build user interfaces.",
      summary: "React summary"
    })
    const unrelatedBookmark = createBookmark({
      id: "yangmi-site",
      title: "Yang Mi interview archive",
      url: "https://yangmi.example",
      extractedText: "Yang Mi profile and interview references"
    })

    await renderSidebar(activeBookmark, "en", {
      bookmarks: [activeBookmark, unrelatedBookmark],
      createProvider,
      settingsRepository
    })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(input, "Summarize this bookmark")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    expect(provider.analyze).toHaveBeenCalledOnce()
    const analyzeInput = provider.analyze.mock.calls.at(0)?.at(0) as { content: string } | undefined
    expect(analyzeInput?.content).not.toContain("Saved bookmark matches")
    expect(analyzeInput?.content).not.toContain("Yang Mi interview archive")
    expect(analyzeInput?.content).not.toContain("https://yangmi.example")
    expect(container?.textContent).toContain("This bookmark focuses on React UI concepts.")
    expect(container?.textContent).not.toContain("Yang Mi interview archive")
  })

  it("falls back to the current bookmark when the dashboard page has no extracted text", async () => {
    const provider = {
      analyze: vi.fn(async () => {
        const error = new Error("OpenAI-compatible request failed") as Error & { code?: string }
        error.code = "network_error"
        throw error
      })
    }

    await renderSidebar(
      createBookmark({
        title: "Yang Mi interview archive",
        url: "https://yangmi.example",
        extractedText: "",
        summary: "",
        userNotes: ""
      }),
      "zh",
      {
        createProvider: vi.fn(() => provider),
        settingsRepository: createSettingsRepository()
      }
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(input, "目前页面是什么")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    expect(provider.analyze).toHaveBeenCalledOnce()
    expect(container?.textContent).toContain("Yang Mi interview archive")
    expect(container?.textContent).not.toContain("未找到本地结果")
  })

  it("clears previous Ghostreader state when the selected dashboard bookmark changes", async () => {
    const provider = {
      analyze: vi.fn(async () => ({ summary: "This is the first bookmark.", tags: [] }))
    }

    await renderSidebar(
      createBookmark({
        id: "bookmark-1",
        title: "First bookmark",
        url: "https://first.example",
        extractedText: "First content"
      }),
      "en",
      {
        createProvider: vi.fn(() => provider),
        settingsRepository: createSettingsRepository()
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

    expect(container?.textContent).toContain("This is the first bookmark.")

    await rerenderSidebar(
      createBookmark({
        id: "bookmark-2",
        title: "Second bookmark",
        url: "https://second.example",
        extractedText: "Second content"
      }),
      "en",
      {
        createProvider: vi.fn(() => provider),
        settingsRepository: createSettingsRepository()
      }
    )

    expect(container?.textContent).not.toContain("This is the first bookmark.")
    expect(container?.textContent).not.toContain("What is this page?")
    expect(container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")?.value).toBe("")
  })

  it("ignores an in-flight Ghostreader response after switching to another bookmark", async () => {
    let resolveAnalyze: ((value: { summary: string; tags: string[] }) => void) | null = null
    const provider = {
      analyze: vi.fn(
        () =>
          new Promise<{ summary: string; tags: string[] }>((resolve) => {
            resolveAnalyze = resolve
          })
      )
    }

    await renderSidebar(
      createBookmark({
        id: "bookmark-1",
        title: "First bookmark",
        url: "https://first.example",
        extractedText: "First content"
      }),
      "en",
      {
        createProvider: vi.fn(() => provider),
        settingsRepository: createSettingsRepository()
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

    await rerenderSidebar(
      createBookmark({
        id: "bookmark-2",
        title: "Second bookmark",
        url: "https://second.example",
        extractedText: "Second content"
      }),
      "en",
      {
        createProvider: vi.fn(() => provider),
        settingsRepository: createSettingsRepository()
      }
    )

    await act(async () => {
      resolveAnalyze?.({ summary: "This is the old response.", tags: [] })
      await Promise.resolve()
    })

    expect(container?.textContent).not.toContain("This is the old response.")
    expect(container?.textContent).not.toContain("What is this page?")
  })

  it("does not submit another Ghostreader request while one is already in flight", async () => {
    let resolveAnalyze: ((value: { summary: string; tags: string[] }) => void) | null = null
    const provider = {
      analyze: vi.fn(
        () =>
          new Promise<{ summary: string; tags: string[] }>((resolve) => {
            resolveAnalyze = resolve
          })
      )
    }

    await renderSidebar(createBookmark(), "en", {
      createProvider: vi.fn(() => provider),
      settingsRepository: createSettingsRepository()
    })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(input, "First question")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    await act(async () => {
      setValue?.call(input, "Second question")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    expect(provider.analyze).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveAnalyze?.({ summary: "Done", tags: [] })
      await Promise.resolve()
    })
  })

  it("ignores the old bookmark response after switching bookmarks and asking again", async () => {
    let resolvers: Array<(value: { summary: string; tags: string[] }) => void> = []
    const provider = {
      analyze: vi.fn(
        () =>
          new Promise<{ summary: string; tags: string[] }>((resolve) => {
            resolvers.push(resolve)
          })
      )
    }

    await renderSidebar(
      createBookmark({
        id: "bookmark-1",
        title: "First bookmark",
        url: "https://first.example",
        extractedText: "First content"
      }),
      "en",
      {
        createProvider: vi.fn(() => provider),
        settingsRepository: createSettingsRepository()
      }
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setValue?.call(input, "First question")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    await rerenderSidebar(
      createBookmark({
        id: "bookmark-2",
        title: "Second bookmark",
        url: "https://second.example",
        extractedText: "Second content"
      }),
      "en",
      {
        createProvider: vi.fn(() => provider),
        settingsRepository: createSettingsRepository()
      }
    )

    const nextInput = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    await act(async () => {
      setValue?.call(nextInput, "Second question")
      nextInput?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    await act(async () => {
      resolvers[0]?.({ summary: "Old bookmark answer", tags: [] })
      await Promise.resolve()
    })

    expect(container?.textContent).not.toContain("Old bookmark answer")

    await act(async () => {
      resolvers[1]?.({ summary: "Second bookmark answer", tags: [] })
      await Promise.resolve()
    })

    expect(container?.textContent).toContain("Second bookmark answer")
    expect(container?.textContent).not.toContain("Old bookmark answer")
  })

  it("clears previous supporting results when a later dashboard ask fails", async () => {
    const provider = {
      analyze: vi.fn(async (_input: unknown) => {
        if (provider.analyze.mock.calls.length === 1) {
          return { summary: "Yang Mi matches found.", tags: [] }
        }

        const error = new Error("OpenAI-compatible authentication failed") as Error & { code?: string }
        error.code = "auth_error"
        throw error
      })
    }
    const settingsRepository = createSettingsRepository()
    const activeBookmark = createBookmark({
      id: "react-docs",
      title: "React Docs",
      extractedText: "React lets you build user interfaces."
    })
    const yangMiBookmark = createBookmark({
      id: "yangmi-site",
      title: "Yang Mi interview archive",
      url: "https://yangmi.example",
      extractedText: "Yang Mi profile and interview references"
    })

    await renderSidebar(activeBookmark, "en", {
      bookmarks: [activeBookmark, yangMiBookmark],
      createProvider: vi.fn(() => provider),
      settingsRepository
    })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setValue?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    expect(container?.textContent).toContain("Yang Mi interview archive")

    await act(async () => {
      setValue?.call(input, "What bookmarks mention Vue?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    expect(container?.textContent).toContain("OpenAI-compatible authentication failed")
    expect(container?.textContent).not.toContain("Yang Mi interview archive")
    expect(container?.textContent).not.toContain("Yang Mi matches found.")
  })

  it("uses fresh retrieval results for dashboard fallback instead of stale previous matches", async () => {
    const provider = {
      analyze: vi.fn(async (_input: unknown) => {
        if (provider.analyze.mock.calls.length === 1) {
          return { summary: "Yang Mi matches found.", tags: [] }
        }

        const error = new Error("OpenAI-compatible request failed") as Error & { code?: string }
        error.code = "network_error"
        throw error
      })
    }
    const settingsRepository = createSettingsRepository()
    const activeBookmark = createBookmark({
      id: "react-docs",
      title: "React Docs",
      extractedText: "React lets you build user interfaces."
    })
    const yangMiBookmark = createBookmark({
      id: "yangmi-site",
      title: "Yang Mi interview archive",
      url: "https://yangmi.example",
      extractedText: "Yang Mi profile and interview references"
    })
    const vueBookmark = createBookmark({
      id: "vue-site",
      title: "Vue Docs",
      url: "https://vue.example",
      extractedText: "Vue composition api guide"
    })

    await renderSidebar(activeBookmark, "en", {
      bookmarks: [activeBookmark, yangMiBookmark, vueBookmark],
      createProvider: vi.fn(() => provider),
      settingsRepository
    })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setValue?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    expect(container?.textContent).toContain("Yang Mi interview archive")

    await act(async () => {
      setValue?.call(input, "What bookmarks mention Vue?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    expect(container?.textContent).toContain("Vue Docs")
    expect(container?.textContent).not.toContain("Yang Mi interview archive")
    expect(container?.textContent).not.toContain("OpenAI-compatible request failed")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderSidebar(
  bookmark: BookmarkRecord,
  language: DisplayLanguage = "en",
  overrides: {
    bookmarks?: BookmarkRecord[]
    settingsRepository?: SettingsRepository
    createProvider?: (config: ProviderConfig) => AiProvider
  } = {}
) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardAiSidebar bookmark={bookmark} language={language} {...overrides} />
      </ThemeProvider>
    )
  })

  await act(async () => {
    await Promise.resolve()
  })
}

async function rerenderSidebar(
  bookmark: BookmarkRecord,
  language: DisplayLanguage = "en",
  overrides: {
    bookmarks?: BookmarkRecord[]
    settingsRepository?: SettingsRepository
    createProvider?: (config: ProviderConfig) => AiProvider
  } = {}
) {
  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardAiSidebar bookmark={bookmark} language={language} {...overrides} />
      </ThemeProvider>
    )
  })

  await act(async () => {
    await Promise.resolve()
  })
}

function createSettingsRepository(): SettingsRepository {
  return {
    getAppSettings: async () => ({ ...DEFAULT_APP_SETTINGS, defaultProvider: "openai", summaryLanguage: "zh" }),
    saveAppSettings: async () => {},
    getProviders: async () => [
      {
        provider: "openai",
        enabled: true,
        apiKey: "test-key",
        model: "gpt-test"
      }
    ],
    saveProviders: async () => {}
  }
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
