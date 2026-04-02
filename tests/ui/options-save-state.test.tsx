// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import Options from "../../src/options"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import type { ThemeRepository } from "../../src/lib/config/theme-repository"
import type { AppSettings, ProviderConfig } from "../../src/types/settings"

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

  it("saving always persists exactly one enabled provider", async () => {
    const saveAppSettings = vi.fn<SettingsRepository["saveAppSettings"]>(async () => {})
    const saveProviders = vi.fn<SettingsRepository["saveProviders"]>(async () => {})

    const settingsRepository: SettingsRepository = {
      getAppSettings: async () => ({
        defaultProvider: "claude",
        autoAnalyzeOnSave: false,
        summaryLanguage: "auto" as const,
        autoRetryOnError: false,
        displayLanguage: "en" as const,
        theme: "sage" as const
      }),
      saveAppSettings,
      getProviders: async () => [
        {
          provider: "openai",
          apiKey: "openai-key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini",
          enabled: false
        },
        {
          provider: "openai-response",
          apiKey: "response-key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4.1-mini",
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
          apiKey: "gemini-key",
          model: "gemini-1.5-flash",
          enabled: false
        }
      ],
      saveProviders
    }

    await renderOptions(settingsRepository)
    await clickSave()
    await flushPromises()

    expect(saveProviders).toHaveBeenCalledWith([
      {
        provider: "openai",
        apiKey: "openai-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        enabled: false
      },
      {
        provider: "openai-response",
        apiKey: "response-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4.1-mini",
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
        apiKey: "gemini-key",
        model: "gemini-1.5-flash",
        enabled: false
      }
    ])
  })

  it("selecting a provider card updates which provider gets saved as enabled", async () => {
    const saveProviders = vi.fn<SettingsRepository["saveProviders"]>(async () => {})

    const settingsRepository: SettingsRepository = {
      getAppSettings: async () => ({
        defaultProvider: "claude",
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
          enabled: false
        },
        {
          provider: "openai-response",
          apiKey: "response-key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4.1-mini",
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
          apiKey: "gemini-key",
          model: "gemini-1.5-flash",
          enabled: false
        }
      ],
      saveProviders
    }

    await renderOptions(settingsRepository)

    // New card interaction also changes defaultProvider.
    await clickProviderRail("openai")
    await changeInputValue("openai-api-key", "new-openai-key")

    await clickSave()
    await flushPromises()

    // OpenAI should now be enabled because selecting the card updates the default provider.
    const savedProviders = saveProviders.mock.calls[0][0]
    const claudeProvider = savedProviders.find((p: ProviderConfig) => p.provider === "claude")
    const openaiProvider = savedProviders.find((p: ProviderConfig) => p.provider === "openai")
    const responseProvider = savedProviders.find((p: ProviderConfig) => p.provider === "openai-response")
    const geminiProvider = savedProviders.find((p: ProviderConfig) => p.provider === "gemini")
    expect(claudeProvider?.enabled).toBe(false)
    expect(openaiProvider?.enabled).toBe(true)
    expect(responseProvider?.enabled).toBe(false)
    expect(geminiProvider?.enabled).toBe(false)
    expect(openaiProvider?.apiKey).toBe("new-openai-key")
  })

  it("shows Saving... while settings are being persisted and Saved settings after success", async () => {
    const saveCompletion = createDeferred<void>()
    const settingsRepository: SettingsRepository = {
      getAppSettings: async () => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false,
        summaryLanguage: "auto" as const,
        autoRetryOnError: false,
        displayLanguage: "en" as const,
        theme: "sage" as const
      }),
      saveAppSettings: async () => {
        await saveCompletion.promise
      },
      saveProviders: async () => {
        await saveCompletion.promise
      },
      getProviders: async () => getValidProviders()
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

  it("theme selection applies immediately and persists through themeRepository on save", async () => {
    const setTheme = vi.fn<ThemeRepository["setTheme"]>(async () => {})
    const themeRepository: ThemeRepository = {
      getTheme: async () => "sage",
      setTheme
    }

    await renderOptions(createSettingsRepository(), themeRepository)

    await clickButtonByTestId("theme-card-obsidian")

    expect(setTheme).toHaveBeenCalledWith("obsidian")
    expect(document.documentElement.dataset.theme).toBe("obsidian")

    await clickSave()
    await flushPromises()

    expect(setTheme).toHaveBeenLastCalledWith("obsidian")
  })

  it("renders OpenAI Response as a real configurable provider", async () => {
    await renderOptions(
      createSettingsRepository({
        getAppSettings: async () => ({
          defaultProvider: "openai-response",
          autoAnalyzeOnSave: false,
          summaryLanguage: "auto" as const,
          autoRetryOnError: false,
          displayLanguage: "en" as const,
          theme: "sage" as const
        }),
        getProviders: async () => [
          {
            provider: "openai",
            apiKey: "openai-key",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4o-mini",
            enabled: false
          },
          {
            provider: "openai-response",
            apiKey: "response-key",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4.1-mini",
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

    await clickProviderRail("openai-response")

    expect(getSectionByHeading("OpenAI Response")?.textContent).toContain("/v1/responses")
    expect(getInput("openai-response-api-key")?.value).toBe("response-key")
    expect(getInput("openai-response-model")?.value).toBe("gpt-4.1-mini")
  })

  it("shows Failed to save settings when persisting throws", async () => {
    const settingsRepository: SettingsRepository = {
      getAppSettings: async () => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false,
        summaryLanguage: "auto" as const,
        autoRetryOnError: false,
        displayLanguage: "en" as const,
        theme: "sage" as const
      }),
      saveAppSettings: async () => {
        throw new Error("save failed")
      },
      saveProviders: async () => {},
      getProviders: async () => getValidProviders()
    }

    await renderOptions(settingsRepository)
    await clickSave()
    await flushPromises()

    expect(getSaveStatusText()).toBe("Failed to save settings")
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
            provider: "openai-response",
            apiKey: "response-key",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4.1-mini",
            enabled: false
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
    expect(getSectionByHeading("OpenAI Chat")?.textContent).toContain("Base URL must be a valid URL")
    expect(saveAppSettings).not.toHaveBeenCalled()
    expect(saveProviders).not.toHaveBeenCalled()
  })

  it("disables save when the default provider has an empty API key", async () => {
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
            provider: "openai-response",
            apiKey: "response-key",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4.1-mini",
            enabled: false
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

    await changeInputValue("openai-api-key", "")
    await clickSave()

    expect(getSaveButton()?.disabled).toBe(true)
    expect(getSectionByHeading("OpenAI Chat")?.textContent).toContain("API key is required")
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
          autoAnalyzeOnSave: false,
          summaryLanguage: "auto" as const,
          autoRetryOnError: false,
          displayLanguage: "en" as const,
          theme: "sage" as const
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
            provider: "openai-response",
            apiKey: "",
            baseUrl: "",
            model: "gpt-4.1-mini",
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

    expect(getSaveButton()?.disabled).toBe(false)

    await clickSave()
    await flushPromises()

    expect(saveAppSettings).toHaveBeenCalledWith({
      defaultProvider: "claude",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto",
      autoRetryOnError: false,
      displayLanguage: "en",
      theme: "sage"
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
        provider: "openai-response",
        apiKey: "",
        baseUrl: "",
        model: "gpt-4.1-mini",
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

async function renderOptions(settingsRepository: SettingsRepository, themeRepository?: ThemeRepository): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(
      <Options
        services={{
          settingsRepository,
          testConnection: async () => {},
          ...(themeRepository ? { themeRepository } : {})
        }}
      />
    )
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
    setElementValue(select, value)
    select.dispatchEvent(new Event("input", { bubbles: true }))
    select.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

async function clickSwitchByLabel(label: string): Promise<void> {
  const button = container?.querySelector<HTMLButtonElement>(`[role="switch"][aria-label="${label}"]`)

  if (!button) {
    throw new Error(`Expected switch ${label}`)
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

async function clickProviderRail(provider: "openai" | "openai-response" | "claude" | "gemini"): Promise<void> {
  const button = container?.querySelector<HTMLButtonElement>(`[data-testid="provider-rail-${provider}"]`)

  if (!button) {
    throw new Error(`Expected provider rail button for ${provider}`)
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

async function clickButtonByTestId(testId: string): Promise<void> {
  const button = container?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)

  if (!button) {
    throw new Error(`Expected button ${testId}`)
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
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

function setElementValue(element: HTMLInputElement | HTMLSelectElement, value: string): void {
  const prototype = Object.getPrototypeOf(element)
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value")

  descriptor?.set?.call(element, value)
}

function getSectionByHeading(heading: string): HTMLElement | undefined {
  const headings = Array.from(container?.querySelectorAll("h2") ?? [])
  const match = headings.find((sectionHeading) => sectionHeading.textContent === heading)

  return match?.closest("section") ?? undefined
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
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto" as const,
      autoRetryOnError: false,
      displayLanguage: "en" as const,
      theme: "sage" as const
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
      provider: "openai-response",
      apiKey: "response-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      enabled: false
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
