import { DEFAULT_APP_SETTINGS } from "../../features/settings/default-settings"
import type { AppSettings, ProviderConfig } from "../../types/settings"

import type { SettingsRepository } from "./settings-repository"

const APP_SETTINGS_KEY = "app-settings"
const PROVIDERS_KEY = "provider-configs"

export class ChromeSettingsRepository implements SettingsRepository {
  async getAppSettings(): Promise<AppSettings> {
    const result = await chrome.storage.sync.get(APP_SETTINGS_KEY)
    const settings = result[APP_SETTINGS_KEY] as AppSettings | undefined

    return settings ?? DEFAULT_APP_SETTINGS
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
