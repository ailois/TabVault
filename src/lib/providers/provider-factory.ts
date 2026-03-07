import type { ProviderConfig } from "../../types/settings"

import { ClaudeProvider } from "./claude-provider"
import { GeminiProvider } from "./gemini-provider"
import { OpenAiCompatibleProvider } from "./openai-compatible-provider"
import type { AiProvider } from "./provider"

export function createProvider(config: ProviderConfig): AiProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAiCompatibleProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
        model: config.model
      })
    case "claude":
      return new ClaudeProvider({
        apiKey: config.apiKey,
        model: config.model
      })
    case "gemini":
      return new GeminiProvider({
        apiKey: config.apiKey,
        model: config.model
      })
    default:
      return assertNever(config.provider)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported provider: ${String(value)}`)
}
