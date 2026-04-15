// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import Options from "../../src/options"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"

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
  },
  bookmarks: {
    getTree: vi.fn().mockResolvedValue([
      { id: "0", title: "", children: [{ id: "1", title: "Bookmarks Bar", children: [] }] }
    ]),
    remove: vi.fn().mockResolvedValue(undefined)
  }
} as any

describe("Options architecture sections", () => {
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

  it("renders settings sidebar navigation and both content panels", async () => {
    await renderOptions(createSettingsRepository())

    const architectureNav = container?.querySelector<HTMLElement>('[data-testid="options-nav-settings"]')
    const knowledgeNav = container?.querySelector<HTMLElement>('[data-testid="settings-nav-knowledge"]')
    const architecturePanel = container?.querySelector<HTMLElement>('[data-testid="settings-panel-architecture"]')
    const knowledgePanel = container?.querySelector<HTMLElement>('[data-testid="settings-panel-knowledge"]')

    expect(container?.querySelector('[data-testid="settings-page-header"]')?.textContent).toContain("TabVault Settings")
    expect(architectureNav?.getAttribute("aria-current")).toBe("page")
    expect(knowledgeNav?.textContent).toContain("Knowledge Base")
    expect(architecturePanel).toBeTruthy()
    expect(knowledgePanel).toBeTruthy()
    expect(knowledgePanel?.getAttribute("hidden")).toBe("")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderOptions(settingsRepository: SettingsRepository): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<Options services={{ settingsRepository, testConnection: async () => {} }} />)
  })
}

function createSettingsRepository(): SettingsRepository {
  return {
    getAppSettings: async () => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto" as const,
      autoRetryOnError: false,
      displayLanguage: "en" as const,
      theme: "sage" as const
    }),
    saveAppSettings: async () => {},
    getProviders: async () => [
      {
        provider: "openai",
        apiKey: "openai-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        enabled: true
      }
    ],
    saveProviders: async () => {}
  }
}
