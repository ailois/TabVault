import { DEFAULT_APP_SETTINGS } from "../../features/settings/default-settings"
import type { AppSettings, ProviderConfig } from "../../types/settings"

import type { SettingsRepository } from "./settings-repository"

export const APP_SETTINGS_KEY = "app-settings"
export const PROVIDERS_KEY = "provider-configs"

export class ChromeSettingsRepository implements SettingsRepository {
  async getAppSettings(): Promise<AppSettings> {
    const result = await chrome.storage.sync.get(APP_SETTINGS_KEY)
    const stored = result[APP_SETTINGS_KEY] as Partial<AppSettings> | undefined

    if (!stored) {
      return DEFAULT_APP_SETTINGS
    }

    return {
      ...DEFAULT_APP_SETTINGS,
      ...stored
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    await chrome.storage.sync.set({ [APP_SETTINGS_KEY]: settings })
  }

  async getProviders(): Promise<ProviderConfig[]> {
    const result = await chrome.storage.sync.get(PROVIDERS_KEY)
    const providers = result[PROVIDERS_KEY] as ProviderConfig[] | undefined

    return providers ?? []
  }

  async saveProviders(providers: ProviderConfig[]): Promise<void> {
    await chrome.storage.sync.set({ [PROVIDERS_KEY]: providers })
  }
}
