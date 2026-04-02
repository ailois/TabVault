import type { ProviderConfig } from "../../types/settings"

import { ClaudeProvider } from "./claude-provider"
import { GeminiProvider } from "./gemini-provider"
import { OpenAiCompatibleProvider } from "./openai-compatible-provider"
import type { AiProvider } from "./provider"

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1"

export function createProvider(config: ProviderConfig): AiProvider {
  switch (config.provider) {
    case "openai":
    case "openai-response":
      return new OpenAiCompatibleProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl ?? OPENAI_DEFAULT_BASE_URL,
        model: config.model
      })
    case "claude":
      return new ClaudeProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl
      })
    case "gemini":
      return new GeminiProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl
      })
    default:
      return assertNever(config.provider)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported provider: ${String(value)}`)
}
