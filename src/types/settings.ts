export type ProviderType = "openai" | "claude" | "gemini" | "responses"

export type ProviderConfig = {
  provider: ProviderType
  apiKey: string
  baseUrl?: string
  model: string
  enabled: boolean
}

export type SummaryLanguage = "auto" | "zh" | "en" | "ja" | "ko" | "fr" | "de" | "es"

export type AppSettings = {
  defaultProvider: ProviderType
  autoAnalyzeOnSave: boolean
  summaryLanguage: SummaryLanguage
  autoRetryOnError: boolean
}
