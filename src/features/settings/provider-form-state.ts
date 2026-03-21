import type { ProviderConfig, ProviderType } from "../../types/settings"

export type ProviderFormState = {
  provider: ProviderType
  apiKey: string
  baseUrl?: string
  model: string
  enabled: boolean
}

const OPENAI_BASE_URL = "https://api.openai.com/v1"

const DEFAULT_PROVIDER_FORM_STATE: Record<ProviderType, ProviderFormState> = {
  openai: {
    provider: "openai",
    apiKey: "",
    baseUrl: OPENAI_BASE_URL,
    model: "gpt-4o-mini",
    enabled: false
  },
  claude: {
    provider: "claude",
    apiKey: "",
    model: "claude-sonnet-4-5",
    enabled: false
  },
  gemini: {
    provider: "gemini",
    apiKey: "",
    model: "gemini-1.5-flash",
    enabled: false
  }
}

const PROVIDER_ORDER: ProviderType[] = ["openai", "claude", "gemini"]

export function buildProviderFormState(storedProviders: ProviderConfig[]): ProviderFormState[] {
  const storedByProvider = new Map(storedProviders.map((provider) => [provider.provider, provider]))

  return PROVIDER_ORDER.map((provider) => {
    const defaults = DEFAULT_PROVIDER_FORM_STATE[provider]
    const stored = storedByProvider.get(provider)

    if (!stored) {
      return { ...defaults }
    }

    if (provider === "openai") {
      return {
        ...defaults,
        ...stored,
        baseUrl: stored.baseUrl ?? defaults.baseUrl
      }
    }

    const { baseUrl: _baseUrl, ...storedWithoutBaseUrl } = stored

    return {
      ...defaults,
      ...storedWithoutBaseUrl
    }
  })
}
