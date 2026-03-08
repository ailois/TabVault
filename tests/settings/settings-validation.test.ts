import { describe, expect, it } from "vitest"

import { validateSettingsForm } from "../../src/features/settings/settings-validation"
import type { AppSettings, ProviderConfig } from "../../src/types/settings"

describe("validateSettingsForm", () => {
  it("flags an enabled provider with an empty API key", () => {
    const result = validateSettingsForm(
      createValidAppSettings(),
      createValidProviders({ openai: { apiKey: "" } })
    )

    expect(result.providers.openai.apiKey).toBe("API key is required")
    expect(result.hasErrors).toBe(true)
  })

  it("flags an enabled provider with an empty model", () => {
    const result = validateSettingsForm(
      createValidAppSettings(),
      createValidProviders({ openai: { model: "" } })
    )

    expect(result.providers.openai.model).toBe("Model is required")
    expect(result.hasErrors).toBe(true)
  })

  it("flags an enabled OpenAI provider with an empty base URL", () => {
    const result = validateSettingsForm(
      createValidAppSettings(),
      createValidProviders({ openai: { baseUrl: "" } })
    )

    expect(result.providers.openai.baseUrl).toBe("Base URL is required")
    expect(result.hasErrors).toBe(true)
  })

  it("flags an enabled OpenAI provider with an invalid base URL", () => {
    const result = validateSettingsForm(
      createValidAppSettings(),
      createValidProviders({ openai: { baseUrl: "not-a-url" } })
    )

    expect(result.providers.openai.baseUrl).toBe("Base URL must be a valid URL")
    expect(result.hasErrors).toBe(true)
  })

  it("flags a default provider that is not enabled", () => {
    const result = validateSettingsForm(
      createValidAppSettings({ defaultProvider: "claude" }),
      createValidProviders({ claude: { apiKey: "claude-key", model: "claude-sonnet-4-5" } })
    )

    expect(result.defaultProvider).toBe("Default provider must be enabled")
    expect(result.hasErrors).toBe(true)
  })

  it("does not flag empty required fields for disabled providers", () => {
    const result = validateSettingsForm(
      createValidAppSettings(),
      createValidProviders()
    )

    expect(result.providers.claude).toEqual({})
    expect(result.providers.gemini).toEqual({})
    expect(result.hasErrors).toBe(false)
  })

  it("does not flag empty fields for a disabled OpenAI provider", () => {
    const result = validateSettingsForm(
      createValidAppSettings({ defaultProvider: "claude" }),
      createValidProviders({
        openai: { enabled: false, apiKey: "", model: "", baseUrl: "" },
        claude: { enabled: true, apiKey: "claude-key", model: "claude-sonnet-4-5" }
      })
    )

    expect(result.providers.openai).toEqual({})
    expect(result.hasErrors).toBe(false)
  })

})

function createValidAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    defaultProvider: "openai",
    autoAnalyzeOnSave: false,
    ...overrides
  }
}

function createValidProviders(overrides: Partial<Record<ProviderConfig["provider"], Partial<ProviderConfig>>> = {}): ProviderConfig[] {
  return [
    {
      provider: "openai",
      enabled: true,
      apiKey: "openai-key",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1",
      ...overrides.openai
    },
    {
      provider: "claude",
      enabled: false,
      apiKey: "",
      model: "",
      ...overrides.claude
    },
    {
      provider: "gemini",
      enabled: false,
      apiKey: "",
      model: "",
      ...overrides.gemini
    }
  ]
}
