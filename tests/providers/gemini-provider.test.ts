import { describe, expect, it, vi } from "vitest"

import { GeminiProvider } from "../../src/lib/providers/gemini-provider"

describe("GeminiProvider", () => {
  it("builds a Gemini generate-content request and parses summary and tags", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"summary":"Short","tags":["x","y"]}' }]
            }
          }
        ]
      })
    }))

    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      fetchImpl: fetchMock
    })

    const result = await provider.analyze({
      title: "Example",
      url: "https://example.com",
      content: "Example content"
    })

    expect(result.summary).toBe("Short")
    expect(result.tags).toEqual(["x", "y"])
    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-goog-api-key": "test-key"
        })
      })
    )

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]

    expect(request).toBeDefined()
    expect(JSON.parse(String(request.body))).toEqual({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Analyze this bookmark and return strict JSON with shape {\"summary\":\"string\",\"tags\":[\"string\"]}. Bookmark title: Example\nBookmark URL: https://example.com\nBookmark content: Example content"
            }
          ]
        }
      ]
    })
  })

  it("normalizes safety-blocked responses", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        promptFeedback: {
          blockReason: "SAFETY"
        }
      })
    }))

    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      fetchImpl: fetchMock
    })

    await expect(
      provider.analyze({
        title: "Example",
        url: "https://example.com",
        content: "Example content"
      })
    ).rejects.toMatchObject({
      name: "ProviderError",
      code: "safety_blocked",
      message: "Gemini blocked the request for safety reasons"
    })
  })

  it("normalizes common Gemini HTTP errors", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({})
    }))

    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      fetchImpl: fetchMock
    })

    await expect(
      provider.analyze({
        title: "Example",
        url: "https://example.com",
        content: "Example content"
      })
    ).rejects.toMatchObject({
      name: "ProviderError",
      code: "auth_error",
      message: "Gemini authentication failed"
    })
  })
})
