// @vitest-environment jsdom

import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it } from "vitest"

import Options from "../../src/options"
import ProviderSettingsForm from "../../src/components/provider-settings-form"
import type { ProviderValidation } from "../../src/features/settings/settings-validation"
import type { ProviderFormState } from "../../src/features/settings/provider-form-state"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("Options", () => {
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

  it("renders editable app and provider settings sections", async () => {
    await renderOptions()

    expect(container?.textContent).toContain("TabVault Settings")
    expect(container?.textContent).toContain("Save settings")
    expect(container?.textContent).toContain("Status: Not saved yet")

    const appSection = getSectionByHeading("App settings")
    const openAiSection = getSectionByHeading("OpenAI-compatible")
    const claudeSection = getSectionByHeading("Claude")
    const geminiSection = getSectionByHeading("Gemini")

    expect(appSection?.textContent).toContain("Default provider")
    expect(appSection?.textContent).toContain("Auto analyze on save")

    expect(openAiSection?.textContent).toContain("Enabled")
    expect(openAiSection?.textContent).toContain("API key")
    expect(openAiSection?.textContent).toContain("Model")
    expect(openAiSection?.textContent).toContain("Base URL")
    expect(openAiSection?.querySelector("#openai-api-key")).toBeTruthy()
    expect(openAiSection?.querySelector("#openai-model")).toBeTruthy()
    expect(openAiSection?.querySelector("#openai-base-url")).toBeTruthy()

    expect(claudeSection?.textContent).toContain("Enabled")
    expect(claudeSection?.textContent).toContain("API key")
    expect(claudeSection?.textContent).toContain("Model")
    expect(claudeSection?.querySelector("#claude-api-key")).toBeTruthy()
    expect(claudeSection?.querySelector("#claude-model")).toBeTruthy()
    expect(claudeSection?.textContent).not.toContain("Base URL")

    expect(geminiSection?.textContent).toContain("Enabled")
    expect(geminiSection?.textContent).toContain("API key")
    expect(geminiSection?.textContent).toContain("Model")
    expect(geminiSection?.querySelector("#gemini-api-key")).toBeTruthy()
    expect(geminiSection?.querySelector("#gemini-model")).toBeTruthy()
    expect(geminiSection?.textContent).not.toContain("Base URL")
  })

  it("renders provider field validation messages passed through props", async () => {
    await renderProviderSettingsForm(
      {
        provider: "openai",
        apiKey: "",
        baseUrl: "",
        model: "",
        enabled: true
      },
      {
        apiKey: "API key is required",
        model: "Model is required",
        baseUrl: "Base URL is required"
      }
    )

    const openAiSection = getSectionByHeading("OpenAI-compatible")

    expect(openAiSection?.textContent).toContain("API key is required")
    expect(openAiSection?.textContent).toContain("Model is required")
    expect(openAiSection?.textContent).toContain("Base URL is required")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

const settingsRepository: SettingsRepository = {
  getAppSettings: async () => ({
    defaultProvider: "openai",
    autoAnalyzeOnSave: false
  }),
  saveAppSettings: async () => {},
  getProviders: async () => [],
  saveProviders: async () => {}
}

async function renderOptions(): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<Options services={{ settingsRepository }} />)
  })
}

async function renderProviderSettingsForm(value: ProviderFormState, fieldErrors: ProviderValidation): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<ProviderSettingsForm fieldErrors={fieldErrors} onChange={() => {}} value={value} />)
  })
}

function getSectionByHeading(heading: string): HTMLElement | undefined {
  return Array.from(container?.querySelectorAll("section") ?? []).find((section) => {
    const sectionHeading = section.querySelector("h2")

    return sectionHeading?.textContent === heading
  })
}
