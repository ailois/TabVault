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

  it("renders design-aligned header tabs and a separate experience card", async () => {
    await renderOptions(createSettingsRepository())

    const agentTab = container?.querySelector<HTMLButtonElement>('[data-testid="settings-tab-agent"]')
    const retrievalTab = container?.querySelector<HTMLButtonElement>('[data-testid="settings-tab-retrieval"]')
    const experienceCard = container?.querySelector('[data-testid="settings-experience-card"]')

    const agentPanel = container?.querySelector<HTMLElement>('[data-testid="settings-tab-panel-agent"]')
    const retrievalPanel = container?.querySelector<HTMLElement>('[data-testid="settings-tab-panel-retrieval"]')

    expect(container?.querySelector('[data-testid="settings-page-header"]')?.textContent).toContain("Architecture Settings")
    expect(agentTab?.textContent).toBe("Agent Companion Engine")
    expect(retrievalTab?.textContent).toBe("Lightweight Hybrid Retrieval")
    expect(agentTab?.getAttribute("aria-selected")).toBe("true")
    expect(retrievalTab?.getAttribute("aria-selected")).toBe("false")
    expect(agentPanel).toBeTruthy()
    expect(retrievalPanel).toBeTruthy()
    expect(agentPanel?.style.display).toBe("grid")
    expect(retrievalPanel?.style.display).toBe("none")
    expect(experienceCard?.textContent).toContain("Experience & Automation")
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
      displayLanguage: "en" as const
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
