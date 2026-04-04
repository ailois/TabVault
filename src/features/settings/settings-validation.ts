import type { AppSettings, DisplayLanguage, ProviderConfig, ProviderType } from "../../types/settings"

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

const PROVIDERS: ProviderType[] = ["openai", "openai-response", "claude", "gemini"]

const VALIDATION_COPY: Record<DisplayLanguage, {
  apiKeyRequired: string
  modelRequired: string
  baseUrlRequired: string
  baseUrlInvalid: string
  defaultProviderDisabled: string
}> = {
  en: {
    apiKeyRequired: "API key is required",
    modelRequired: "Model is required",
    baseUrlRequired: "Base URL is required",
    baseUrlInvalid: "Base URL must be a valid URL",
    defaultProviderDisabled: "Default provider must be enabled"
  },
  zh: {
    apiKeyRequired: "API \u5bc6\u94a5\u4e3a\u5fc5\u586b\u9879",
    modelRequired: "\u6a21\u578b\u4e3a\u5fc5\u586b\u9879",
    baseUrlRequired: "\u57fa\u7840 URL \u4e3a\u5fc5\u586b\u9879",
    baseUrlInvalid: "\u57fa\u7840 URL \u5fc5\u987b\u662f\u6709\u6548\u7684 URL",
    defaultProviderDisabled: "\u9ed8\u8ba4 Provider \u5fc5\u987b\u5904\u4e8e\u542f\u7528\u72b6\u6001"
  }
}

export function validateSettingsForm(appSettings: AppSettings, providers: ProviderConfig[], language: DisplayLanguage = "en"): SettingsValidation {
  const validation: SettingsValidation = {
    providers: {
      openai: {},
      "openai-response": {},
      claude: {},
      gemini: {}
    },
    hasErrors: false
  }
  const copy = VALIDATION_COPY[language]

  const providerByType = new Map(providers.map((provider) => [provider.provider, provider]))

  for (const providerType of PROVIDERS) {
    const provider = providerByType.get(providerType)

    if (!isEnabledProvider(provider)) {
      continue
    }

    if (!provider.apiKey.trim()) {
      validation.providers[providerType].apiKey = copy.apiKeyRequired
    }

    if (!provider.model.trim()) {
      validation.providers[providerType].model = copy.modelRequired
    }

    if (providerType === "openai" || providerType === "openai-response") {
      validateOpenAiBaseUrl(provider, validation.providers[providerType], copy)
    }
  }

  if (!isEnabledProvider(providerByType.get(appSettings.defaultProvider))) {
    validation.defaultProvider = copy.defaultProviderDisabled
  }

  validation.hasErrors = hasProviderErrors(validation.providers) || Boolean(validation.defaultProvider)

  return validation
}

function isEnabledProvider(provider: ProviderConfig | undefined): provider is ProviderConfig {
  return Boolean(provider?.enabled)
}

function validateOpenAiBaseUrl(
  provider: ProviderConfig,
  validation: ProviderValidation,
  copy: (typeof VALIDATION_COPY)["en"]
): void {
  const baseUrl = provider.baseUrl?.trim() ?? ""

  if (!baseUrl) {
    validation.baseUrl = copy.baseUrlRequired

    return
  }

  try {
    new URL(baseUrl)
  } catch {
    validation.baseUrl = copy.baseUrlInvalid
  }
}

function hasProviderErrors(providers: Record<ProviderType, ProviderValidation>): boolean {
  return PROVIDERS.some((providerType) => Object.keys(providers[providerType]).length > 0)
}
