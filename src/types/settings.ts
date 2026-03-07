export type ProviderType = "openai" | "claude" | "gemini"

export type ProviderConfig = {
  provider: ProviderType
  apiKey: string
  baseUrl?: string
  model: string
  enabled: boolean
}

export type AppSettings = {
  defaultProvider: ProviderType
  autoAnalyzeOnSave: boolean
}
