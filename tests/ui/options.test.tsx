// @vitest-environment jsdom

import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import ProviderSettingsForm from "../../src/components/provider-settings-form"
import Options from "../../src/options"
import type { ProviderFormState } from "../../src/features/settings/provider-form-state"
import type { ProviderValidation } from "../../src/features/settings/settings-validation"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import * as licenseService from "../../src/lib/trial/license-service"
import { TrialRepository } from "../../src/lib/trial/trial-repository"
import * as trialHooks from "../../src/lib/trial/use-trial-status"
import type { TrialState, TrialStatus } from "../../src/types/trial"
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
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
      status: "licensed",
      state: {
        installedAt: "2026-03-20T00:00:00.000Z",
        analysisUsed: 0,
        licenseKey: "LSKEY-READY",
        licenseStatus: "valid",
        licenseValidatedAt: "2026-03-20T12:00:00.000Z"
      },
      reload: mockReload
    })
  })

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

  it("renders settings as the only primary options destination", async () => {
    await renderOptions()

    expect(container?.querySelector('[data-testid="options-nav-settings"]')?.getAttribute("aria-pressed")).toBe("true")
    expect(container?.querySelector('[data-testid="options-nav-bookmarks"]')).toBeNull()
    expect(container?.textContent).not.toContain("Bookmarks")
    expect(container?.querySelector('[data-testid="settings-page-shell"]')).toBeTruthy()
  })

  it("renders settings with architecture-style header and section grouping", async () => {
    await renderOptions()

    expect(container?.textContent).toContain("Architecture Settings")
    expect(container?.querySelector('[data-testid="settings-page-description"]')?.textContent).toContain("provider protocols")
    expect(container?.textContent).toContain("Provider & Protocol")
    expect(container?.textContent).toContain("Experience & Automation")
    expect(container?.textContent).toContain("Trial & License")
    expect(container?.querySelector('[data-testid="settings-save-actions"]')).toBeTruthy()
  })

  it("renders the experience card with real settings controls", async () => {
    await renderOptions()

    const experienceCard = container?.querySelector<HTMLElement>('[data-testid="settings-experience-card"]')
    const displayLanguage = container?.querySelector<HTMLSelectElement>('#display-language')
    const summaryLanguage = container?.querySelector<HTMLSelectElement>('#summary-language')
    const autoAnalyzeToggle = container?.querySelector<HTMLButtonElement>('[aria-label="Auto analyze on save"]')
    const autoRetryToggle = container?.querySelector<HTMLButtonElement>('[aria-label="Auto retry failed analysis"]')

    expect(experienceCard?.textContent).toContain("Display language")
    expect(experienceCard?.textContent).toContain("Summary language")
    expect(experienceCard?.textContent).toContain("Auto (follow content)")
    expect(experienceCard?.textContent).toContain("Auto analyze on save")
    expect(experienceCard?.textContent).toContain("Auto retry failed analysis")
    expect(displayLanguage?.value).toBe("en")
    expect(summaryLanguage?.value).toBe("auto")
    expect(autoAnalyzeToggle?.getAttribute("aria-checked")).toBe("false")
    expect(autoRetryToggle?.getAttribute("aria-checked")).toBe("false")
  })

  it("renders Chinese settings copy when display language is zh", async () => {
    const zhSettingsRepository: SettingsRepository = {
      ...settingsRepository,
      getAppSettings: async () => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false,
        summaryLanguage: "auto" as const,
        autoRetryOnError: false,
        displayLanguage: "zh" as const
      })
    }

    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<Options services={{ settingsRepository: zhSettingsRepository, testConnection: async () => {} }} />)
    })

    expect(container?.textContent).toContain("架构配置")
    expect(container?.textContent).toContain("轻量级混合检索")
    expect(container?.textContent).toContain("体验与自动化")
    expect(container?.textContent).toContain("界面语言")
    expect(container?.textContent).toContain("保存设置")
  })

  it("renders editable app and provider settings sections", async () => {
    await renderOptions()

    const dashboardShell = container?.querySelector('[data-testid="options-dashboard-shell"]')
    const sidebar = container?.querySelector('[data-testid="options-sidebar"]')
    const mainContent = container?.querySelector('[data-testid="options-main-content"]')
    const settingsNavButton = container?.querySelector<HTMLButtonElement>('[data-testid="options-nav-settings"]')

    expect(container?.textContent).toContain("TabVault")
    expect(container?.textContent).toContain("Settings")
    expect(container?.textContent).not.toContain("Bookmarks")
    expect(dashboardShell).toBeTruthy()
    expect(sidebar).toBeTruthy()
    expect(mainContent).toBeTruthy()
    expect(settingsNavButton?.getAttribute("aria-pressed")).toBe("true")

    const appSection = getSectionByHeading("Provider & Protocol")
    const retrievalPanel = container?.querySelector('[data-testid="settings-tab-panel-retrieval"]')
    const openAiSection = getSectionByHeading("OpenAI-compatible")
    const workspace = container?.querySelector('[data-testid="settings-workspace"]')
    const providerRail = container?.querySelector('[data-testid="provider-rail"]')

    const providerRailButtons = Array.from(container?.querySelectorAll('[data-testid^="provider-rail-"]') ?? [])

    expect(appSection?.closest('[data-testid="settings-section-card"]')).toBeTruthy()
    expect(retrievalPanel).toBeTruthy()
    expect(workspace).toBeTruthy()
    expect(providerRail).toBeTruthy()
    expect(providerRailButtons).toHaveLength(3)
    expect(container?.querySelector('[data-testid="provider-rail-responses"]')).toBeNull()
    expect(container?.textContent).not.toContain("Responses API")
    expect(container?.textContent).not.toContain("Edit configuration")
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

  it("renders a trial banner below the settings header when trial is active", async () => {
    mockTrialStatus({
      status: "trial",
      state: {
        installedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        analysisUsed: 3
      }
    })

    await renderOptions()

    const statusRegion = container?.querySelector('[data-testid="settings-license-state"]')
    const banner = container?.querySelector('[data-testid="trial-banner"]')

    expect(statusRegion).toBeTruthy()
    expect(banner).toBeTruthy()
    expect(container?.textContent).toContain("Trial active")
    expect(container?.querySelector('[data-testid="settings-workspace"]')).toBeTruthy()
  })

  it("renders an expired banner below the settings header when trial has expired", async () => {
    mockTrialStatus({
      status: "expired",
      state: {
        installedAt: "2026-03-01T00:00:00.000Z",
        analysisUsed: 50
      }
    })

    await renderOptions()

    const banner = container?.querySelector('[data-testid="trial-banner"]')
    expect(banner).toBeTruthy()
    expect(container?.textContent).toContain("Trial expired")
  })

  it("shows the license activation form when clicking the trial banner CTA", async () => {
    mockTrialStatus({
      status: "trial",
      state: {
        installedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        analysisUsed: 3
      }
    })

    await renderOptions()

    const cta = container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')

    await act(async () => {
      cta?.click()
    })

    expect(container?.querySelector('[data-testid="license-activation-card"]')).toBeTruthy()
    expect(container?.textContent).toContain("Activate TabVault")
  })

  it("shows the license activation form when clicking the expired banner CTA", async () => {
    mockTrialStatus({
      status: "expired",
      state: {
        installedAt: "2026-03-01T00:00:00.000Z",
        analysisUsed: 50
      }
    })

    await renderOptions()

    const cta = container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')

    await act(async () => {
      cta?.click()
    })

    expect(container?.querySelector('[data-testid="license-activation-card"]')).toBeTruthy()
    expect(container?.textContent).toContain("Activate TabVault")
  })

  it("renders the activated license view when the user is licensed", async () => {
    mockTrialStatus({
      status: "licensed",
      state: {
        installedAt: "2026-03-01T00:00:00.000Z",
        analysisUsed: 50,
        licenseKey: "LSKEY-ABCD-1234",
        licenseStatus: "valid",
        licenseValidatedAt: "2026-03-20T12:00:00.000Z"
      }
    })

    await renderOptions()

    expect(container?.querySelector('[data-testid="license-activation-card"]')).toBeTruthy()
    expect(container?.textContent).toContain("Activated")
    expect(container?.querySelector('[data-testid="trial-banner"]')).toBeNull()
  })

  it("validates and saves the license key, then reloads trial status on success", async () => {
    const reload = vi.fn(async () => {})
    const save = vi.fn(async () => {})
    const get = vi.fn(async () => ({
      installedAt: "2026-03-20T00:00:00.000Z",
      analysisUsed: 3
    }))

    mockTrialStatus({
      status: "trial",
      state: {
        installedAt: "2026-03-20T00:00:00.000Z",
        analysisUsed: 3
      },
      reload
    })

    vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("valid")
    vi.spyOn(TrialRepository.prototype, "get").mockImplementation(get)
    vi.spyOn(TrialRepository.prototype, "save").mockImplementation(save)

    await renderOptions()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')?.click()
    })

    const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      valueSetter?.call(input, "LSKEY-VALID")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const activateButton = Array.from(container?.querySelectorAll('[data-testid="license-activation-card"] button') ?? []).find(
      (candidate): candidate is HTMLButtonElement => candidate.textContent === "Activate"
    )

    await act(async () => {
      activateButton?.click()
    })

    expect(licenseService.validateLicenseKey).toHaveBeenCalledWith("LSKEY-VALID")
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        licenseKey: "LSKEY-VALID",
        licenseStatus: "valid",
        licenseValidatedAt: expect.any(String)
      })
    )
    expect(reload).toHaveBeenCalled()
    expect(container?.textContent).toContain("Activated")
  })

  it("shows an invalid key error without clearing the input", async () => {
    mockTrialStatus({
      status: "trial",
      state: {
        installedAt: "2026-03-20T00:00:00.000Z",
        analysisUsed: 3
      }
    })
    vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("invalid")

    await renderOptions()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')?.click()
    })

    const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      valueSetter?.call(input, "LSKEY-BAD")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const activateButton = Array.from(container?.querySelectorAll('[data-testid="license-activation-card"] button') ?? []).find(
      (candidate): candidate is HTMLButtonElement => candidate.textContent === "Activate"
    )

    await act(async () => {
      activateButton?.click()
    })

    expect(container?.textContent).toContain("This license key is invalid.")
    expect(input?.value).toBe("LSKEY-BAD")
  })

  it("shows a temporary validation error when the license cannot be validated", async () => {
    mockTrialStatus({
      status: "trial",
      state: {
        installedAt: "2026-03-20T00:00:00.000Z",
        analysisUsed: 3
      }
    })
    vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("unvalidated")

    await renderOptions()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')?.click()
    })

    const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      valueSetter?.call(input, "LSKEY-ANY")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const activateButton = Array.from(container?.querySelectorAll('[data-testid="license-activation-card"] button') ?? []).find(
      (candidate): candidate is HTMLButtonElement => candidate.textContent === "Activate"
    )

    await act(async () => {
      activateButton?.click()
    })

    expect(container?.textContent).toContain("Could not validate right now. Try again shortly.")
    expect(input?.value).toBe("LSKEY-ANY")
  })

  it("shows a save error when license state persistence fails", async () => {
    mockTrialStatus({
      status: "trial",
      state: {
        installedAt: "2026-03-20T00:00:00.000Z",
        analysisUsed: 3
      }
    })
    vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("valid")
    vi.spyOn(TrialRepository.prototype, "get").mockResolvedValue({
      installedAt: "2026-03-20T00:00:00.000Z",
      analysisUsed: 3
    })
    vi.spyOn(TrialRepository.prototype, "save").mockRejectedValue(new Error("save failed"))

    await renderOptions()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')?.click()
    })

    const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      valueSetter?.call(input, "LSKEY-VALID")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const activateButton = Array.from(container?.querySelectorAll('[data-testid="license-activation-card"] button') ?? []).find(
      (candidate): candidate is HTMLButtonElement => candidate.textContent === "Activate"
    )

    await act(async () => {
      activateButton?.click()
    })

    expect(container?.textContent).toContain("Failed to save license state.")
    expect(input?.value).toBe("LSKEY-VALID")
  })

  it("renders provider form fields with expected styling", async () => {
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

const mockReload = vi.fn(async () => {})

const settingsRepository: SettingsRepository = {
  getAppSettings: async () => ({
    defaultProvider: "openai",
    autoAnalyzeOnSave: false,
    summaryLanguage: "auto" as const,
    autoRetryOnError: false,
    displayLanguage: "en" as const
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

function mockTrialStatus(overrides: {
  status: TrialStatus
  state: TrialState
  reload?: () => Promise<void>
}): void {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: overrides.status,
    state: overrides.state,
    reload: overrides.reload ?? mockReload
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
  const headings = Array.from(container?.querySelectorAll("h2") ?? [])
  const match = headings.find((sectionHeading) => sectionHeading.textContent === heading)

  return match?.closest("section") ?? undefined
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
