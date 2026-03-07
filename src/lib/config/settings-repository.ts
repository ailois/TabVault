import type { AppSettings, ProviderConfig } from "../../types/settings"

export interface SettingsRepository {
  getAppSettings(): Promise<AppSettings>
  saveAppSettings(settings: AppSettings): Promise<void>
  getProviders(): Promise<ProviderConfig[]>
  saveProviders(providers: ProviderConfig[]): Promise<void>
}
