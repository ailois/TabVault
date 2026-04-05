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

    expect(container?.querySelector('[data-testid="options-nav-settings"]')?.getAttribute("aria-current")).toBe("page")
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
        displayLanguage: "zh" as const,
        theme: "sage" as const
      })
    }

    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<Options services={{ settingsRepository: zhSettingsRepository, testConnection: async () => {} }} />)
    })

    expect(container?.textContent).toContain("\u67b6\u6784\u8bbe\u7f6e")
    expect(container?.textContent).toContain("\u77e5\u8bc6\u5e93")
    expect(container?.textContent).toContain("\u4f53\u9a8c\u4e0e\u81ea\u52a8\u5316")
    expect(container?.textContent).toContain("\u754c\u9762\u8bed\u8a00")
    expect(container?.textContent).toContain("\u4fdd\u5b58\u8bbe\u7f6e")
    expect(container?.textContent).toContain("OpenAI \u804a\u5929\u8865\u5168")
  })

  it("localizes provider connection fallback errors in zh", async () => {
    const zhSettingsRepository: SettingsRepository = {
      ...settingsRepository,
      getAppSettings: async () => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false,
        summaryLanguage: "auto" as const,
        autoRetryOnError: false,
        displayLanguage: "zh" as const,
        theme: "sage" as const
      }),
      getProviders: async () => [{
        provider: "openai" as const,
        apiKey: "sk-test",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        enabled: true
      }]
    }

    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<Options services={{ settingsRepository: zhSettingsRepository, testConnection: async () => { throw new Error("Failed to open bookmark database") } }} />)
    })

    const testButton = container?.querySelector<HTMLButtonElement>("[data-testid='provider-test-button']")

    await act(async () => {
      testButton?.click()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(container?.querySelector("[data-testid='connection-test-result']")?.textContent).toContain("\u8fde\u63a5\u5931\u8d25")
    expect(container?.textContent).not.toContain("Failed to open bookmark database")
  })

  it("renders editable app and provider settings sections", async () => {
    await renderOptions()

    const dashboardShell = container?.querySelector('[data-testid="options-dashboard-shell"]')
    const sidebar = container?.querySelector('[data-testid="options-sidebar"]')
    const mainContent = container?.querySelector('[data-testid="options-main-content"]')
    const settingsNavButton = container?.querySelector<HTMLButtonElement>('[data-testid="options-nav-settings"]')
    const appSection = getSectionByHeading("OpenAI Chat")
    const workspace = container?.querySelector('[data-testid="settings-workspace"]')
    const providerRail = container?.querySelector('[data-testid="provider-rail"]')
    const providerRailButtons = Array.from(container?.querySelectorAll('[data-testid^="provider-rail-"]') ?? [])

    expect(container?.textContent).toContain("TabVault")
    expect(container?.textContent).toContain("Knowledge Base")
    expect(dashboardShell).toBeTruthy()
    expect(sidebar).toBeTruthy()
    expect(mainContent).toBeTruthy()
    expect(settingsNavButton?.getAttribute("aria-current")).toBe("page")
    expect(appSection).toBeTruthy()
    expect(workspace).toBeTruthy()
    expect(providerRail).toBeTruthy()
    expect(providerRailButtons).toHaveLength(4)
    expect(container?.textContent).not.toContain("Edit configuration")
    expect(container?.querySelector("#provider-editor-selector")).toBeNull()
    expect(getSectionByHeading("Claude")).toBeUndefined()
    expect(getSectionByHeading("Gemini")).toBeUndefined()
  })

  it("switching provider rail selection makes the selected provider form visible", async () => {
    await renderOptions()

    // Initially openai should be visible, claude not
    expect(getSectionByHeading("OpenAI Chat")).toBeTruthy()
    expect(getSectionByHeading("Claude")).toBeUndefined()

    // Switch provider rail to claude
    const claudeRailButton = container?.querySelector<HTMLButtonElement>('[data-testid="provider-rail-claude"]')
    expect(claudeRailButton).toBeTruthy()

    await act(async () => {
      claudeRailButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    // Now claude should be visible, openai not
    expect(getSectionByHeading("OpenAI Chat")).toBeUndefined()
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

    const openAiSection = getSectionByHeading("OpenAI Chat")
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

    assertProviderSectionStructure("OpenAI Chat", {
      description: "/v1/chat/completions",
      expectedFieldLabels: ["API key", "Model", "Base URL"]
    })
  })

  it("renders settings page shell and save actions sections", async () => {
    await renderOptions()

    const pageShell = container?.querySelector<HTMLElement>('[data-testid="settings-page-shell"]')
    const sectionCard = container?.querySelector<HTMLElement>('[data-testid="settings-section-card"]')
    const saveActions = container?.querySelector<HTMLElement>('[data-testid="settings-save-actions"]')
    const saveStatus = container?.querySelector<HTMLElement>('[data-testid="save-status"]')
    const saveButton = container?.querySelector<HTMLButtonElement>('[data-testid="settings-save-button"]')

    expect(pageShell?.style.gap).toBe(spacing.lg)
    expect(sectionCard?.style.borderRadius).toBe("16px")
    expect(sectionCard?.style.overflow).toBe("hidden")
    expect(saveActions?.style.borderTop).toBeTruthy()
    expect(saveActions?.style.backgroundColor).toBeTruthy()
    expect(saveStatus).toBeTruthy()
    expect(saveButton?.style.borderRadius).toBe(radius.medium)
  })

  it("does not render the settings trial promotion UI when trial is active", async () => {
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
    expect(banner).toBeNull()
    expect(container?.textContent).not.toContain("Trial active")
    expect(container?.querySelector('[data-testid="settings-workspace"]')).toBeTruthy()
  })

  it("does not render the settings trial promotion UI when trial has expired", async () => {
    mockTrialStatus({
      status: "expired",
      state: {
        installedAt: "2026-03-01T00:00:00.000Z",
        analysisUsed: 50
      }
    })

    await renderOptions()

    const banner = container?.querySelector('[data-testid="trial-banner"]')
    expect(banner).toBeNull()
    expect(container?.textContent).not.toContain("Trial expired")
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

    const card = container?.querySelector<HTMLElement>('[data-testid="license-activation-card"]')
    expect(card).toBeTruthy()
    expect(card?.getAttribute("aria-labelledby")).toBe("license-activation-heading-active")
    expect(container?.querySelector('[data-testid="trial-banner"]')).toBeNull()
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

  it("renders provider form copy in zh", async () => {
    await renderProviderSettingsForm(
      {
        provider: "openai",
        apiKey: "",
        baseUrl: "",
        model: "",
        enabled: false
      },
      {},
      "zh"
    )

    expect(container?.textContent).toContain("API \u5bc6\u94a5")
    expect(container?.textContent).toContain("\u57fa\u7840 URL")
    expect(container?.textContent).toContain("\u6a21\u578b")
    expect(container?.textContent).toContain("\u6d4b\u8bd5\u8fde\u63a5")
    expect(container?.textContent).toContain("\u5fc5\u586b")
  })

  it("shows both taro preset and a custom color picker entry", async () => {
    await renderOptions()

    expect(container?.querySelector('[data-testid="theme-card-taro"]')?.textContent).toContain("Taro")
    expect(container?.querySelector('[data-testid="theme-card-custom"]')?.textContent).toContain("Custom")
  })

  it("opens a custom color picker and keeps purple as a preset option", async () => {
    await renderOptions()

    const customThemeButton = container?.querySelector<HTMLButtonElement>('[data-testid="theme-card-custom"]')
    expect(container?.querySelector<HTMLInputElement>('input[type="color"]')).toBeNull()

    await act(async () => {
      customThemeButton?.click()
    })

    const colorInput = container?.querySelector<HTMLInputElement>('input[type="color"]')
    const purplePreset = container?.querySelector<HTMLButtonElement>('[data-testid="custom-theme-preset-#9D8CBA"]')

    expect(colorInput).toBeTruthy()
    expect(purplePreset).toBeTruthy()
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
    displayLanguage: "en" as const,
    theme: "sage" as const
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

async function renderProviderSettingsForm(
  value: ProviderFormState,
  fieldErrors: ProviderValidation,
  language: "en" | "zh" = "en"
): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<ProviderSettingsForm fieldErrors={fieldErrors} language={language} onChange={() => {}} onTestConnection={async () => "ok"} value={value} />)
  })
}

function getSectionByHeading(heading: string): HTMLElement | undefined {
  const providerIdByHeading: Record<string, string> = {
    "OpenAI Chat": "openai",
    "OpenAI 鑱婂ぉ琛ュ叏": "openai",
    "OpenAI Response": "openai-response",
    "OpenAI 鍝嶅簲": "openai-response",
    Claude: "claude",
    Gemini: "gemini"
  }
  const providerId = providerIdByHeading[heading]
  return providerId
    ? container?.querySelector<HTMLElement>(`[data-testid="provider-settings-form-${providerId}"]`) ?? undefined
    : undefined
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
