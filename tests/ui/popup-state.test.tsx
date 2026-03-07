// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import Popup from "../../src/popup"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import type { AiProvider } from "../../src/lib/providers/provider"
import type { BookmarkRecord } from "../../src/types/bookmark"
import type { AppSettings, ProviderConfig } from "../../src/types/settings"

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

    expect(screen().text()).toContain("Saved: Example page")
    expect(screen().text()).toContain("Add an API key in Settings to enable automatic analysis.")
  })

  it("shows a save failure banner when saving the current page fails", async () => {
    const services = createServices({
      saveCurrentPage: vi.fn(async () => {
        throw new Error("Failed to save current page")
      })
    })

    await renderPopup(services)
    await clickButton("Save current page")

    expect(screen().text()).toContain("Failed to save current page")
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

    expect(screen().text()).toContain("Analyzing saved bookmark...")
    expect(screen().getButton("Analyzing...")?.textContent).toBe("Analyzing...")

    analyzeDeferred.reject(new Error("Analysis failed"))
    await flush()

    expect(screen().text()).toContain("Saved: Example page")
    expect(screen().text()).toContain("Analysis failed")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderPopup(services: TestPopupServices): Promise<void> {
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
  const getButton = (name: string) =>
    Array.from(container?.querySelectorAll("button") ?? []).find((button) => button.textContent?.includes(name))

  return { text, getButton }
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
  createProvider: (config: ProviderConfig) => AiProvider
}

function createServices(overrides: Partial<TestPopupServices> = {}): TestPopupServices {
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
    createProvider: vi.fn((config) => createAiProvider(config)),
    ...overrides
  }
}

function createBookmarkRepository(overrides: Partial<BookmarkRepository> = {}): BookmarkRepository {
  return {
    save: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    update: vi.fn(async () => undefined),
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
