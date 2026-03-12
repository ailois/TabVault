// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import Options from "../../src/options"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

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
        summaryLanguage: "auto" as const
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

    expect(getSelect("default-provider")?.value).toBe("claude")
    expect(getSectionByHeading("App Settings")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true)

    expect(getInput("openai-api-key")?.value).toBe("openai-key")
    expect(getInput("openai-model")?.value).toBe("gpt-4.1-mini")
    expect(getInput("openai-base-url")?.value).toBe("https://openai.example.com/v1")
    expect(getSectionByHeading("OpenAI-compatible")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true)

    expect(getInput("claude-api-key")?.value).toBe("claude-key")
    expect(getInput("claude-model")?.value).toBe("claude-3-7-sonnet")
    expect(getSectionByHeading("Claude")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true)

    expect(getInput("gemini-api-key")?.value).toBe("")
    expect(getInput("gemini-model")?.value).toBe("gemini-1.5-flash")
    expect(getSectionByHeading("Gemini")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false)
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
  return Array.from(container?.querySelectorAll("section") ?? []).find((section) => {
    const sectionHeading = section.querySelector("h2")

    return sectionHeading?.textContent === heading
  })
}

function getInput(id: string): HTMLInputElement | null | undefined {
  return container?.querySelector<HTMLInputElement>(`#${id}`)
}

function getSelect(id: string): HTMLSelectElement | null | undefined {
  return container?.querySelector<HTMLSelectElement>(`#${id}`)
}
