// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import Options from "../../src/options"
import type { AppSettings, ProviderConfig } from "../../src/types/settings"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("Options save state", () => {
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

  it("persists app settings and all provider rows when Save is clicked", async () => {
    const saveAppSettings = vi.fn<SettingsRepository["saveAppSettings"]>(async () => {})
    const saveProviders = vi.fn<SettingsRepository["saveProviders"]>(async () => {})

    const settingsRepository: SettingsRepository = {
      getAppSettings: async () => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false
      }),
      saveAppSettings,
      getProviders: async () => getValidProviders(),
      saveProviders
    }

    await renderOptions(settingsRepository)

    await changeSelectValue("default-provider", "gemini")
    await clickCheckbox(getAppSettingsCheckbox(), true)
    await changeInputValue("openai-api-key", "openai-key")
    await changeInputValue("openai-model", "gpt-4.1")
    await changeInputValue("openai-base-url", "https://openai.example.com/v1")
    await clickCheckbox(getSectionCheckbox("OpenAI-compatible"), true)

    await changeInputValue("claude-api-key", "claude-key")
    await changeInputValue("claude-model", "claude-3-7-sonnet")
    await clickCheckbox(getSectionCheckbox("Claude"), true)

    await changeInputValue("gemini-api-key", "gemini-key")
    await changeInputValue("gemini-model", "gemini-2.0-flash")
    await clickCheckbox(getSectionCheckbox("Gemini"), true)

    await clickSave()

    const expectedAppSettings = {
      defaultProvider: "gemini",
      autoAnalyzeOnSave: true
    } satisfies AppSettings

    const expectedProviders = [
      {
        provider: "openai",
        apiKey: "openai-key",
        model: "gpt-4.1",
        baseUrl: "https://openai.example.com/v1",
        enabled: true
      },
      {
        provider: "claude",
        apiKey: "claude-key",
        model: "claude-3-7-sonnet",
        enabled: true
      },
      {
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-2.0-flash",
        enabled: true
      }
    ] satisfies ProviderConfig[]

    expect(saveAppSettings).toHaveBeenCalledWith(expectedAppSettings)
    expect(saveProviders).toHaveBeenCalledWith(expectedProviders)
  })

  it("shows Saving... while settings are being persisted and Saved settings after success", async () => {
    const saveCompletion = createDeferred<void>()
    const settingsRepository: SettingsRepository = {
      getAppSettings: async () => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false
      }),
      saveAppSettings: async () => {
        await saveCompletion.promise
      },
      getProviders: async () => getValidProviders(),
      saveProviders: async () => {
        await saveCompletion.promise
      }
    }

    await renderOptions(settingsRepository)

    await clickSave()

    expect(getSaveStatusText()).toBe("Saving...")
    expect(getSaveButton()?.disabled).toBe(true)

    saveCompletion.resolve()
    await flushPromises()

    expect(getSaveStatusText()).toBe("Saved settings")
    expect(getSaveButton()?.disabled).toBe(false)
  })

  it("renders save controls inside a dedicated bottom action area", async () => {
    await renderOptions(createSettingsRepository())

    const actionArea = getSaveActionArea()

    expect(actionArea).toBeDefined()
    expect(actionArea?.textContent).toContain("Save settings")
    expect(actionArea?.querySelector("button")?.textContent).toBe("Save settings")
    expect(actionArea?.querySelector('[data-testid="save-status"]')?.textContent).toBe("Ready")
  })

  it("shows Failed to save settings when persisting throws", async () => {
    const settingsRepository: SettingsRepository = {
      getAppSettings: async () => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false
      }),
      saveAppSettings: async () => {
        throw new Error("save failed")
      },
      getProviders: async () => getValidProviders(),
      saveProviders: async () => {}
    }

    await renderOptions(settingsRepository)
    await clickSave()
    await flushPromises()

    expect(getSaveStatusText()).toBe("Failed to save settings")
  })

  it("disables save and renders an app-level error when the default provider is disabled", async () => {
    await renderOptions(createSettingsRepository())

    await clickCheckbox(getSectionCheckbox("OpenAI-compatible"), true)
    await changeSelectValue("default-provider", "claude")

    expect(getSaveButton()?.disabled).toBe(true)
    expect(getAppSettingsValidationAlert()?.textContent).toBe("Default provider must be enabled")
  })

  it("disables save when an enabled provider is missing required fields", async () => {
    await renderOptions(createSettingsRepository())

    await clickCheckbox(getSectionCheckbox("OpenAI-compatible"), true)
    await changeInputValue("openai-model", "")
    await changeInputValue("openai-base-url", "")

    const providerAlerts = getSectionAlerts("OpenAI-compatible")

    expect(getSaveButton()?.disabled).toBe(true)
    expect(providerAlerts.map((alert) => alert.textContent)).toEqual([
      "API key is required",
      "Model is required",
      "Base URL is required"
    ])
    expect(getInput("openai-api-key")?.getAttribute("aria-invalid")).toBe("true")
    expect(getInput("openai-model")?.getAttribute("aria-invalid")).toBe("true")
    expect(getInput("openai-base-url")?.getAttribute("aria-invalid")).toBe("true")
  })

  it("does not persist invalid settings when save is clicked", async () => {
    const saveAppSettings = vi.fn<SettingsRepository["saveAppSettings"]>(async () => {})
    const saveProviders = vi.fn<SettingsRepository["saveProviders"]>(async () => {})

    await renderOptions(
      createSettingsRepository({
        saveAppSettings,
        saveProviders
      })
    )

    await clickCheckbox(getSectionCheckbox("OpenAI-compatible"), true)
    await clickSave()

    expect(getSaveButton()?.disabled).toBe(true)
    expect(saveAppSettings).not.toHaveBeenCalled()
    expect(saveProviders).not.toHaveBeenCalled()
    expect(getSaveStatusText()).toBe("Ready")
  })

  it("disables save when enabled OpenAI has an invalid base URL", async () => {
    const saveAppSettings = vi.fn<SettingsRepository["saveAppSettings"]>(async () => {})
    const saveProviders = vi.fn<SettingsRepository["saveProviders"]>(async () => {})

    await renderOptions(
      createSettingsRepository({
        saveAppSettings,
        saveProviders,
        getProviders: async () => [
          {
            provider: "openai",
            apiKey: "openai-key",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4o-mini",
            enabled: true
          },
          {
            provider: "claude",
            apiKey: "claude-key",
            model: "claude-sonnet-4-5",
            enabled: false
          },
          {
            provider: "gemini",
            apiKey: "gemini-key",
            model: "gemini-1.5-flash",
            enabled: false
          }
        ]
      })
    )

    await changeInputValue("openai-base-url", "not-a-url")
    await clickSave()

    expect(getSaveButton()?.disabled).toBe(true)
    expect(getSectionByHeading("OpenAI-compatible")?.textContent).toContain("Base URL must be a valid URL")
    expect(saveAppSettings).not.toHaveBeenCalled()
    expect(saveProviders).not.toHaveBeenCalled()
  })

  it("allows save when a disabled provider has empty fields", async () => {
    const saveAppSettings = vi.fn<SettingsRepository["saveAppSettings"]>(async () => {})
    const saveProviders = vi.fn<SettingsRepository["saveProviders"]>(async () => {})

    await renderOptions(
      createSettingsRepository({
        saveAppSettings,
        saveProviders,
        getAppSettings: async () => ({
          defaultProvider: "claude",
          autoAnalyzeOnSave: false
        }),
        getProviders: async () => [
          {
            provider: "openai",
            apiKey: "",
            baseUrl: "",
            model: "",
            enabled: false
          },
          {
            provider: "claude",
            apiKey: "claude-key",
            model: "claude-sonnet-4-5",
            enabled: true
          },
          {
            provider: "gemini",
            apiKey: "",
            model: "",
            enabled: false
          }
        ]
      })
    )

    expect(getSectionByHeading("OpenAI-compatible")?.textContent).not.toContain("Base URL is required")
    expect(getSectionByHeading("OpenAI-compatible")?.textContent).not.toContain("API key is required")
    expect(getSectionByHeading("OpenAI-compatible")?.textContent).not.toContain("Model is required")
    expect(getSaveButton()?.disabled).toBe(false)

    await clickSave()
    await flushPromises()

    expect(saveAppSettings).toHaveBeenCalledWith({
      defaultProvider: "claude",
      autoAnalyzeOnSave: false
    })
    expect(saveProviders).toHaveBeenCalledWith([
      {
        provider: "openai",
        apiKey: "",
        baseUrl: "",
        model: "",
        enabled: false
      },
      {
        provider: "claude",
        apiKey: "claude-key",
        model: "claude-sonnet-4-5",
        enabled: true
      },
      {
        provider: "gemini",
        apiKey: "",
        model: "",
        enabled: false
      }
    ])
    expect(getSaveStatusText()).toBe("Saved settings")
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

async function changeInputValue(id: string, value: string): Promise<void> {
  const input = getInput(id)

  if (!input) {
    throw new Error(`Expected input #${id}`)
  }

  await act(async () => {
    setElementValue(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

async function changeSelectValue(id: string, value: string): Promise<void> {
  const select = container?.querySelector<HTMLSelectElement>(`#${id}`)

  if (!select) {
    throw new Error(`Expected select #${id}`)
  }

  await act(async () => {
    select.value = value
    select.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

async function clickCheckbox(checkbox: HTMLInputElement | null | undefined, nextChecked: boolean): Promise<void> {
  if (!checkbox) {
    throw new Error("Expected checkbox")
  }

  if (checkbox.checked === nextChecked) {
    return
  }

  await act(async () => {
    checkbox.click()
  })
}

async function clickSave(): Promise<void> {
  const button = getSaveButton()

  if (!button) {
    throw new Error("Expected Save settings button")
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

function getInput(id: string): HTMLInputElement | null | undefined {
  return container?.querySelector<HTMLInputElement>(`#${id}`)
}

function setElementValue(element: HTMLInputElement, value: string): void {
  const prototype = Object.getPrototypeOf(element)
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value")

  descriptor?.set?.call(element, value)
}

function getAppSettingsCheckbox(): HTMLInputElement | null | undefined {
  return getSectionByHeading("App Settings")?.querySelector<HTMLInputElement>('input[type="checkbox"]')
}

function getAppSettingsSection(): HTMLElement | undefined {
  return getSectionByHeading("App Settings")
}

function getAppSettingsValidationAlert(): HTMLElement | undefined {
  return getAppSettingsSection()?.querySelector<HTMLElement>('[role="alert"]') ?? undefined
}

function getSectionCheckbox(heading: string): HTMLInputElement | null | undefined {
  return getSectionByHeading(heading)?.querySelector<HTMLInputElement>('input[type="checkbox"]')
}

function getSectionByHeading(heading: string): HTMLElement | undefined {
  return Array.from(container?.querySelectorAll("section") ?? []).find((section) => {
    const sectionHeading = section.querySelector("h2")

    return sectionHeading?.textContent === heading
  })
}

function getSectionAlerts(heading: string): HTMLElement[] {
  return Array.from(getSectionByHeading(heading)?.querySelectorAll<HTMLElement>('[role="alert"]') ?? [])
}

function getSaveStatusText(): string | undefined {
  return container?.querySelector<HTMLElement>('[data-testid="save-status"]')?.textContent ?? undefined
}

function getSaveActionArea(): HTMLElement | undefined {
  return container?.querySelector<HTMLElement>('[data-testid="settings-save-actions"]') ?? undefined
}

function getSaveButton(): HTMLButtonElement | undefined {
  return Array.from(container?.querySelectorAll("button") ?? []).find(
    (candidate): candidate is HTMLButtonElement => candidate.textContent === "Save settings"
  )
}

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
} {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function createSettingsRepository(overrides: Partial<SettingsRepository> = {}): SettingsRepository {
  return {
    getAppSettings: async () => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false
    }),
    saveAppSettings: async () => {},
    getProviders: async () => [],
    saveProviders: async () => {},
    ...overrides
  }
}

function getValidProviders(): ProviderConfig[] {
  return [
    {
      provider: "openai",
      apiKey: "openai-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      enabled: true
    },
    {
      provider: "claude",
      apiKey: "claude-key",
      model: "claude-sonnet-4-5",
      enabled: false
    },
    {
      provider: "gemini",
      apiKey: "gemini-key",
      model: "gemini-1.5-flash",
      enabled: false
    }
  ]
}
