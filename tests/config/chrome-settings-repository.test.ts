import { beforeEach, describe, expect, it } from "vitest"

import type { AppSettings, ProviderConfig } from "../../src/types/settings"
import { ChromeSettingsRepository } from "../../src/lib/config/chrome-settings-repository"

const APP_SETTINGS_KEY = "app-settings"
const PROVIDERS_KEY = "provider-configs"

type StorageShape = Record<string, unknown>

describe("ChromeSettingsRepository", () => {
  let storage: StorageShape
  let repository: ChromeSettingsRepository

  beforeEach(() => {
    storage = {}

    globalThis.chrome = {
      storage: {
        sync: {
          get: async (key: string) => ({ [key]: storage[key] }),
          set: async (values: StorageShape) => {
            Object.assign(storage, values)
          }
        }
      }
    } as typeof chrome

    repository = new ChromeSettingsRepository()
  })

  it("returns default app settings when none have been saved", async () => {
    await expect(repository.getAppSettings()).resolves.toEqual({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto",
      autoRetryOnError: false,
      displayLanguage: "en",
      theme: "sage"
    })
  })

  it("stores app settings under the explicit app settings key", async () => {
    const settings: AppSettings = {
      defaultProvider: "claude",
      autoAnalyzeOnSave: true,
      summaryLanguage: "auto",
      autoRetryOnError: false,
      displayLanguage: "zh",
      theme: "obsidian"
    }

    await repository.saveAppSettings(settings)

    expect(storage[APP_SETTINGS_KEY]).toEqual(settings)
    await expect(repository.getAppSettings()).resolves.toEqual(settings)
  })

  it("merges stored settings with defaults so new fields survive old stored objects", async () => {
    const oldStyleStored = {
      defaultProvider: "claude",
      autoAnalyzeOnSave: true,
      summaryLanguage: "en",
      autoRetryOnError: false
      // displayLanguage absent — simulates settings saved before this field was added
    }
    storage[APP_SETTINGS_KEY] = oldStyleStored

    const result = await repository.getAppSettings()

    expect(result.displayLanguage).toBe("en")
    expect(result.theme).toBe("sage")
    expect(result.defaultProvider).toBe("claude")
    expect(result.autoAnalyzeOnSave).toBe(true)
  })

  it("stores provider configs under the explicit providers key", async () => {
    const providers: ProviderConfig[] = [
      {
        provider: "openai",
        apiKey: "test-key",
        baseUrl: "https://api.example.com",
        model: "gpt-4o-mini",
        enabled: true
      }
    ]

    await repository.saveProviders(providers)

    expect(storage[PROVIDERS_KEY]).toEqual(providers)
    await expect(repository.getProviders()).resolves.toEqual(providers)
  })
})
