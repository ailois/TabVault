// @vitest-environment jsdom

import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ProviderSettingsForm from "../../src/components/provider-settings-form"
import Options from "../../src/options"
import type { ProviderFormState } from "../../src/features/settings/provider-form-state"
import type { ProviderValidation } from "../../src/features/settings/settings-validation"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import { radius, spacing } from "../../src/ui/design-tokens"

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
  }
} as any

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

    const dashboardShell = container?.querySelector('[data-testid="options-dashboard-shell"]')
    const sidebar = container?.querySelector('[data-testid="options-sidebar"]')
    const mainContent = container?.querySelector('[data-testid="options-main-content"]')
    const settingsNavButton = container?.querySelector<HTMLButtonElement>('[data-testid="options-nav-settings"]')

    expect(container?.textContent).toContain("TabVault")
    expect(container?.textContent).toContain("Settings")
    expect(container?.textContent).toContain("Bookmarks")
    expect(dashboardShell).toBeTruthy()
    expect(sidebar).toBeTruthy()
    expect(mainContent).toBeTruthy()
    expect(settingsNavButton?.getAttribute("aria-pressed")).toBe("true")

    const appSection = getSectionByHeading("App Settings")
    const maintenanceSection = getSectionByHeading("Maintenance")
    const openAiSection = getSectionByHeading("OpenAI-compatible")
    const workspace = container?.querySelector('[data-testid="settings-workspace"]')
    const providerRail = container?.querySelector('[data-testid="provider-rail"]')

    expect(appSection?.closest('[data-testid="settings-section-card"]')).toBeTruthy()
    expect(maintenanceSection?.closest('[data-testid="settings-section-card"]')).toBeTruthy()
    expect(workspace).toBeTruthy()
    expect(providerRail).toBeTruthy()
    // defaultProvider is openai, so only openai provider form is visible
    expect(openAiSection?.closest('[data-testid="settings-section-card"]') ?? openAiSection).toBeTruthy()
    // provider editor selector should be removed
    expect(container?.querySelector("#provider-editor-selector")).toBeNull()
    // claude and gemini sections are not visible
    expect(getSectionByHeading("Claude")).toBeUndefined()
    expect(getSectionByHeading("Gemini")).toBeUndefined()
  })

  it("switching provider rail selection makes the selected provider form visible", async () => {
    await renderOptions()

    // Initially openai should be visible, claude not
    expect(getSectionByHeading("OpenAI-compatible")).toBeTruthy()
    expect(getSectionByHeading("Claude")).toBeUndefined()

    // Switch provider rail to claude
    const claudeRailButton = container?.querySelector<HTMLButtonElement>('[data-testid="provider-rail-claude"]')
    expect(claudeRailButton).toBeTruthy()

    await act(async () => {
      claudeRailButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    // Now claude should be visible, openai not
    expect(getSectionByHeading("OpenAI-compatible")).toBeUndefined()
    expect(getSectionByHeading("Claude")).toBeTruthy()
    expect(container?.querySelector<HTMLButtonElement>('[data-testid="provider-rail-openai"]')?.getAttribute("aria-pressed")).toBe("false")
    expect(container?.querySelector<HTMLButtonElement>('[data-testid="provider-rail-claude"]')?.getAttribute("aria-pressed")).toBe("true")
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
  })

  it("renders settings page shell and save actions sections", async () => {
    await renderOptions()

    const pageShell = container?.querySelector<HTMLElement>('[data-testid="settings-page-shell"]')
    const sectionCard = container?.querySelector<HTMLElement>('[data-testid="settings-section-card"]')
    const saveActions = container?.querySelector<HTMLElement>('[data-testid="settings-save-actions"]')
    const saveStatus = container?.querySelector<HTMLElement>('[data-testid="save-status"]')
    const saveButton = Array.from(container?.querySelectorAll("button") ?? []).find(
      (candidate): candidate is HTMLButtonElement => candidate.textContent === "Save settings"
    )

    expect(pageShell?.style.gap).toBe(spacing.lg)
    expect(sectionCard?.style.borderRadius).toBe("16px")
    expect(sectionCard?.style.overflow).toBe("hidden")
    expect(saveActions?.style.borderTop).toBeTruthy()
    expect(saveActions?.style.backgroundColor).toBeTruthy()
    expect(saveStatus).toBeTruthy()
    expect(saveButton?.style.borderRadius).toBe(radius.medium)
  })

  it("renders provider form with toggle and styled fields", async () => {
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
    const fieldStack = container?.querySelector<HTMLElement>('[data-testid="provider-field-stack"]')
    const apiKeyInput = getInputById("openai-api-key")

    expect(description?.style.color).toBeTruthy()
    expect(fieldStack?.style.gap).toBe(spacing.xs)
    expect(apiKeyInput?.style.padding).toBe(`${spacing.sm} ${spacing.md}`)
    expect(apiKeyInput?.style.borderRadius).toBe(radius.small)
    expect(apiKeyInput?.style.backgroundColor).toBeTruthy()
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

const settingsRepository: SettingsRepository = {
  getAppSettings: async () => ({
    defaultProvider: "openai",
    autoAnalyzeOnSave: false,
    summaryLanguage: "auto" as const,
    autoRetryOnError: false
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

  const fieldStacks = Array.from(section?.querySelectorAll('[data-testid="provider-field-stack"]') ?? [])
  expect(fieldStacks).toHaveLength(options.expectedFieldLabels.length)

  options.expectedFieldLabels.forEach((label, index) => {
    const fieldStack = fieldStacks[index]
    expect(fieldStack?.querySelector("label")?.textContent).toContain(label)
    expect(fieldStack?.querySelector("input")).toBeTruthy()
  })
}
