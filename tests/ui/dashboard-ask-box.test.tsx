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
