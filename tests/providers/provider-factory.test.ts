import { describe, expect, it } from "vitest"

import { ClaudeProvider } from "../../src/lib/providers/claude-provider"
import { GeminiProvider } from "../../src/lib/providers/gemini-provider"
import { createProvider } from "../../src/lib/providers/provider-factory"

describe("createProvider", () => {
  it("creates an OpenAI-compatible provider for openai configs", () => {
    const provider = createProvider({
      provider: "openai",
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      enabled: true
    })

    expect(provider).toBeTruthy()
  })

  it("creates a Claude provider for claude configs", () => {
    const provider = createProvider({
      provider: "claude",
      apiKey: "test-key",
      model: "claude-sonnet-4-5",
      enabled: true
    })

    expect(provider).toBeInstanceOf(ClaudeProvider)
  })

  it("creates a Gemini provider for gemini configs", () => {
    const provider = createProvider({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      enabled: true
    })

    expect(provider).toBeInstanceOf(GeminiProvider)
  })
})
