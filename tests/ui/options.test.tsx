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
import { colors, controls, radius, shadow, spacing } from "../../src/ui/design-tokens"

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

    const pageShell = container?.querySelector('[data-testid="settings-page-shell"]')
    const pageHeader = container?.querySelector('[data-testid="settings-page-header"]')
    const pageDescription = container?.querySelector('[data-testid="settings-page-description"]')

    expect(container?.textContent).toContain("TabVault Settings")
    expect(container?.textContent).toContain("Configure providers and analysis behavior")
    expect(pageShell).toBeTruthy()
    expect(pageHeader?.textContent).toContain("TabVault Settings")
    expect(pageDescription?.textContent).toContain("Configure providers and analysis behavior")

    const appSection = getSectionByHeading("App Settings")
    const openAiSection = getSectionByHeading("OpenAI-compatible")
    const claudeSection = getSectionByHeading("Claude")
    const geminiSection = getSectionByHeading("Gemini")

    expect(appSection?.closest('[data-testid="settings-section-card"]')).toBeTruthy()
    expect(openAiSection?.closest('[data-testid="settings-section-card"]')).toBeTruthy()
    expect(claudeSection?.closest('[data-testid="settings-section-card"]')).toBeTruthy()
    expect(geminiSection?.closest('[data-testid="settings-section-card"]')).toBeTruthy()
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
    const apiKeyInput = getInputById("openai-api-key")
    const modelInput = getInputById("openai-model")
    const baseUrlInput = getInputById("openai-base-url")
    const alerts = Array.from(openAiSection?.querySelectorAll('[role="alert"]') ?? [])

    expect(alerts).toHaveLength(3)
    expect(alerts.map((alert) => alert.textContent)).toEqual([
      "API key is required",
      "Model is required",
      "Base URL is required"
    ])
    expect(apiKeyInput?.getAttribute("aria-invalid")).toBe("true")
    expect(modelInput?.getAttribute("aria-invalid")).toBe("true")
    expect(baseUrlInput?.getAttribute("aria-invalid")).toBe("true")
    expect(apiKeyInput?.getAttribute("aria-describedby")).toBeTruthy()
    expect(modelInput?.getAttribute("aria-describedby")).toBeTruthy()
    expect(baseUrlInput?.getAttribute("aria-describedby")).toBeTruthy()
  })

  it("renders provider sections with readable descriptions and explicit field groupings", async () => {
    await renderOptions()

    assertProviderSectionStructure("OpenAI-compatible", {
      description: "Use any OpenAI-compatible endpoint by providing an API key, model, and base URL.",
      expectedFieldLabels: ["API key", "Model", "Base URL"]
    })

    assertProviderSectionStructure("Claude", {
      description: "Use your Anthropic API key and preferred Claude model for analysis.",
      expectedFieldLabels: ["API key", "Model"]
    })

    assertProviderSectionStructure("Gemini", {
      description: "Use your Google AI Studio API key and Gemini model for analysis.",
      expectedFieldLabels: ["API key", "Model"]
    })
  })

  it("uses shared design tokens for the settings shell and provider controls", async () => {
    await renderOptions()

    const pageShell = container?.querySelector<HTMLElement>('[data-testid="settings-page-shell"]')
    const sectionCard = container?.querySelector<HTMLElement>('[data-testid="settings-section-card"]')
    const saveActions = container?.querySelector<HTMLElement>('[data-testid="settings-save-actions"]')
    const saveStatus = container?.querySelector<HTMLElement>('[data-testid="save-status"]')
    const saveButton = Array.from(container?.querySelectorAll("button") ?? []).find(
      (candidate): candidate is HTMLButtonElement => candidate.textContent === "Save settings"
    )

    expect(pageShell?.style.gap).toBe(spacing.lg)
    expect(sectionCard?.style.padding).toBe(spacing.lg)
    expect(sectionCard?.style.backgroundColor).toBe("rgb(255, 255, 255)")
    expect(saveActions?.style.borderRadius).toBe(radius.large)
    expect(saveActions?.style.backgroundColor).toBe("rgb(255, 255, 255)")
    expect(saveActions?.style.boxShadow).toBe("0 -2px 8px rgba(0,0,0,0.04)")
    expect(saveStatus?.style.color).toBe("rgb(113, 113, 122)")
    expect(saveButton?.style.backgroundColor).toBe("rgb(24, 24, 27)")
    expect(saveButton?.style.color).toBe("rgb(250, 250, 250)")
    expect(saveButton?.style.borderRadius).toBe(radius.medium)
  })

  it("uses shared design tokens for provider form copy, rows, and inputs", async () => {
    await renderProviderSettingsForm(
      {
        provider: "openai",
        apiKey: "",
        baseUrl: "",
        model: "",
        enabled: false
      },
      {}
    )

    const description = container?.querySelector<HTMLElement>('[data-testid="provider-description"]')
    const enabledRow = container?.querySelector<HTMLElement>('[data-testid="provider-enabled-row"]')
    const fieldStack = container?.querySelector<HTMLElement>('[data-testid="provider-field-stack"]')
    const apiKeyInput = getInputById("openai-api-key")

    expect(description?.style.color).toBe("rgb(113, 113, 122)")
    expect(enabledRow?.style.padding).toBe(`${spacing.sm} ${spacing.md}`)
    expect(enabledRow?.style.borderRadius).toBe(radius.medium)
    expect(enabledRow?.style.backgroundColor).toBe("rgb(244, 244, 245)")
    expect(fieldStack?.style.gap).toBe(spacing.xs)
    expect(apiKeyInput?.style.padding).toBe(`${spacing.sm} ${spacing.md}`)
    expect(apiKeyInput?.style.borderRadius).toBe(radius.small)
    expect(apiKeyInput?.style.backgroundColor).toBe("rgb(255, 255, 255)")
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
    root.render(<Options services={{ settingsRepository, testConnection: async () => {} }} />)
  })
}

async function renderProviderSettingsForm(value: ProviderFormState, fieldErrors: ProviderValidation): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<ProviderSettingsForm fieldErrors={fieldErrors} onChange={() => {}} onTestConnection={async () => "ok"} value={value} />)
  })
}

function getSectionByHeading(heading: string): HTMLElement | undefined {
  return Array.from(container?.querySelectorAll("section") ?? []).find((section) => {
    const sectionHeading = section.querySelector("h2")

    return sectionHeading?.textContent === heading
  })
}

function getInputById(id: string): HTMLInputElement | null | undefined {
  return container?.querySelector<HTMLInputElement>(`#${id}`)
}

function assertProviderSectionStructure(
  heading: string,
  options: {
    description: string
    expectedFieldLabels: string[]
  }
): void {
  const section = getSectionByHeading(heading)

  expect(section).toBeTruthy()
  const description = section?.querySelector('[data-testid="provider-description"]')
  expect(description).toBeTruthy()
  expect(description?.textContent ?? "").toContain(options.description)

  const enabledRow = section?.querySelector('[data-testid="provider-enabled-row"]')
  expect(enabledRow).toBeTruthy()
  expect(enabledRow?.textContent).toContain("Enabled")
  expect(enabledRow?.querySelector('input[type="checkbox"]')).toBeTruthy()

  const fieldStacks = Array.from(section?.querySelectorAll('[data-testid="provider-field-stack"]') ?? [])
  expect(fieldStacks).toHaveLength(options.expectedFieldLabels.length)

  options.expectedFieldLabels.forEach((label, index) => {
    const fieldStack = fieldStacks[index]

    expect(fieldStack?.querySelector("label")?.textContent).toContain(label)
    expect(fieldStack?.querySelector("input")).toBeTruthy()
  })
}
