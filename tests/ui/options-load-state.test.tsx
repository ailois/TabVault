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

describe("Options load state", () => {
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

  it("loads saved app settings and providers into the form on mount", async () => {
    const settingsRepository: SettingsRepository = {
      getAppSettings: async () => ({
        defaultProvider: "claude",
        autoAnalyzeOnSave: true,
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
          baseUrl: "https://openai.example.com/v1",
          model: "gpt-4.1-mini",
          enabled: true
        },
        {
          provider: "claude",
          apiKey: "claude-key",
          model: "claude-3-7-sonnet",
          enabled: true
        }
      ],
      saveProviders: async () => {}
    }

    await renderOptions(settingsRepository)

    expect(getDefaultProviderSelect()?.value).toBe("claude")
    expect(getProviderRailButton("claude")?.getAttribute("aria-pressed")).toBe("true")
    expect(getProviderRailButton("openai")?.getAttribute("aria-pressed")).toBe("false")
    expect(getProviderRailButton("gemini")?.getAttribute("aria-pressed")).toBe("false")
    expect(container?.querySelector('[data-testid="settings-experience-card"] [role="switch"]')?.getAttribute("aria-checked")).toBe("true")

    // defaultProvider is claude, so only the claude form is visible
    expect(getInput("claude-api-key")?.value).toBe("claude-key")
    expect(getInput("claude-model")?.value).toBe("claude-3-7-sonnet")
    expect(getInput("claude-api-key")).not.toBeNull()

    // openai and gemini forms are not visible when defaultProvider is claude
    expect(getInput("openai-api-key")).toBeNull()
    expect(getInput("gemini-api-key")).toBeNull()
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

function getSectionByHeading(heading: string): HTMLElement | undefined {
  const headings = Array.from(container?.querySelectorAll("h2") ?? [])
  const match = headings.find((h) => h.textContent === heading)
  return match?.closest("section") ?? undefined
}

function getInput(id: string): HTMLInputElement | null | undefined {
  return container?.querySelector<HTMLInputElement>(`#${id}`)
}

function getDefaultProviderSelect(): HTMLSelectElement | null | undefined {
  return container?.querySelector<HTMLSelectElement>("#default-provider")
}

function getProviderRailButton(provider: "openai" | "claude" | "gemini"): HTMLButtonElement | null | undefined {
  return container?.querySelector<HTMLButtonElement>(`[data-testid="provider-rail-${provider}"]`)
}
