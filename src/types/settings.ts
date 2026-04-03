export type ProviderType = "openai" | "openai-response" | "claude" | "gemini"

export type ProviderConfig = {
  provider: ProviderType
  apiKey: string
  baseUrl?: string
  model: string
  enabled: boolean
}

export type SummaryLanguage = "auto" | "zh" | "en" | "ja" | "ko" | "fr" | "de" | "es"

export type DisplayLanguage = "en" | "zh"

export type ThemeName = "cloud" | "obsidian" | "sage" | "breeze" | "taro" | "vanilla" | "custom"

export type AppSettings = {
  defaultProvider: ProviderType
  autoAnalyzeOnSave: boolean
  summaryLanguage: SummaryLanguage
  autoRetryOnError: boolean
  displayLanguage: DisplayLanguage
  theme: ThemeName
}
