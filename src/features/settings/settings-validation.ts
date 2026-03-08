import type { AppSettings, ProviderConfig, ProviderType } from "../../types/settings"

export type ProviderValidation = {
  apiKey?: string
  model?: string
  baseUrl?: string
}

export type SettingsValidation = {
  defaultProvider?: string
  providers: Record<ProviderType, ProviderValidation>
  hasErrors: boolean
}

const PROVIDERS: ProviderType[] = ["openai", "claude", "gemini"]

export function validateSettingsForm(appSettings: AppSettings, providers: ProviderConfig[]): SettingsValidation {
  const validation: SettingsValidation = {
    providers: {
      openai: {},
      claude: {},
      gemini: {}
    },
    hasErrors: false
  }

  const providerByType = new Map(providers.map((provider) => [provider.provider, provider]))

  for (const providerType of PROVIDERS) {
    const provider = providerByType.get(providerType)

    if (!isEnabledProvider(provider)) {
      continue
    }

    if (!provider.apiKey.trim()) {
      validation.providers[providerType].apiKey = "API key is required"
    }

    if (!provider.model.trim()) {
      validation.providers[providerType].model = "Model is required"
    }

    if (providerType === "openai") {
      validateOpenAiBaseUrl(provider, validation.providers.openai)
    }
  }

  if (!isEnabledProvider(providerByType.get(appSettings.defaultProvider))) {
    validation.defaultProvider = "Default provider must be enabled"
  }

  validation.hasErrors = hasProviderErrors(validation.providers) || Boolean(validation.defaultProvider)

  return validation
}

function isEnabledProvider(provider: ProviderConfig | undefined): provider is ProviderConfig {
  return Boolean(provider?.enabled)
}

function validateOpenAiBaseUrl(provider: ProviderConfig, validation: ProviderValidation): void {
  const baseUrl = provider.baseUrl?.trim() ?? ""

  if (!baseUrl) {
    validation.baseUrl = "Base URL is required"

    return
  }

  try {
    new URL(baseUrl)
  } catch {
    validation.baseUrl = "Base URL must be a valid URL"
  }
}

function hasProviderErrors(providers: Record<ProviderType, ProviderValidation>): boolean {
  return PROVIDERS.some((providerType) => Object.keys(providers[providerType]).length > 0)
}
