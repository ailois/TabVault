import { describe, expect, it } from "vitest"

import { buildProviderFormState } from "../../src/features/settings/provider-form-state"

describe("buildProviderFormState", () => {
  it("returns fixed rows for openai, claude, and gemini in order", () => {
    const state = buildProviderFormState([])

    expect(state).toEqual([
      {
        provider: "openai",
        apiKey: "",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        enabled: false
      },
      {
        provider: "claude",
        apiKey: "",
        model: "claude-sonnet-4-5",
        enabled: false
      },
      {
        provider: "gemini",
        apiKey: "",
        model: "gemini-1.5-flash",
        enabled: false
      }
    ])
  })

  it("merges stored provider configs over defaults while keeping fixed rows", () => {
    const state = buildProviderFormState([
      {
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-2.0-flash",
        enabled: true
      },
      {
        provider: "openai",
        apiKey: "openai-key",
        baseUrl: "https://openrouter.ai/api/v1",
        model: "gpt-4.1-mini",
        enabled: true
      }
    ])

    expect(state).toEqual([
      {
        provider: "openai",
        apiKey: "openai-key",
        baseUrl: "https://openrouter.ai/api/v1",
        model: "gpt-4.1-mini",
        enabled: true
      },
      {
        provider: "claude",
        apiKey: "",
        model: "claude-sonnet-4-5",
        enabled: false
      },
      {
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-2.0-flash",
        enabled: true
      }
    ])
  })

  it("returns fresh default row objects on each call", () => {
    const first = buildProviderFormState([])
    const second = buildProviderFormState([])

    first[0].apiKey = "changed"

    expect(second[0].apiKey).toBe("")
    expect(first[0]).not.toBe(second[0])
  })
})
