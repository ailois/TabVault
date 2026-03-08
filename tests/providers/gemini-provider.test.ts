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
    const parsedBody = JSON.parse(String(request.body)) as {
      contents: Array<{ role: string; parts: Array<{ text?: string }> }>
    }

    expect(request).toBeDefined()
    expect(parsedBody.contents).toHaveLength(1)
    expect(parsedBody.contents[0]?.role).toBe("user")
    expect(parsedBody.contents[0]?.parts).toHaveLength(1)
    expect(parsedBody.contents[0]?.parts[0]?.text).toContain("Bookmark title: Example")
    expect(parsedBody.contents[0]?.parts[0]?.text).toContain("Bookmark URL: https://example.com")
    expect(parsedBody.contents[0]?.parts[0]?.text).toContain("Bookmark content: Example content")
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

  it.each([
    {
      status: 401,
      code: "auth_error",
      message: "Gemini authentication failed"
    },
    {
      status: 403,
      code: "auth_error",
      message: "Gemini authentication failed"
    },
    {
      status: 429,
      code: "rate_limit_error",
      message: "Gemini rate limit exceeded"
    },
    {
      status: 500,
      code: "server_error",
      message: "Gemini service failed"
    },
    {
      status: 400,
      code: "invalid_request_error",
      message: "Gemini rejected the request"
    }
  ])("normalizes HTTP $status responses", async ({ status, code, message }) => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status,
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
      code,
      message
    })
  })

  it("normalizes fetch rejections as network errors", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("socket hang up")
    })

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
      code: "network_error",
      message: "Gemini request failed"
    })
  })

  it("normalizes aborted timeout requests as network errors", async () => {
    vi.useFakeTimers()

    try {
      const fetchMock = vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<{
            ok: boolean
            status: number
            json(): Promise<unknown>
          }>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => {
                const abortError = new Error("The operation was aborted.")
                abortError.name = "AbortError"
                reject(abortError)
              },
              { once: true }
            )
          })
      )

      const provider = new GeminiProvider({
        apiKey: "test-key",
        model: "gemini-1.5-flash",
        fetchImpl: fetchMock,
        timeoutMs: 10
      })

      const analyzePromise = provider.analyze({
        title: "Example",
        url: "https://example.com",
        content: "Example content"
      })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      )

      const rejectionExpectation = expect(analyzePromise).rejects.toMatchObject({
        name: "ProviderError",
        code: "network_error",
        message: "Gemini request failed"
      })

      await vi.advanceTimersByTimeAsync(10)

      await rejectionExpectation
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not normalize synchronous pre-fetch request construction failures as network errors", async () => {
    const fetchMock = vi.fn()
    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      fetchImpl: fetchMock
    })
    const input = {
      get title(): string {
        throw new Error("title getter failed")
      },
      url: "https://example.com",
      content: "Example content"
    }

    await expect(
      provider.analyze(input)
    ).rejects.toThrow("title getter failed")

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("normalizes missing text output as bad model output", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ inlineData: { mimeType: "text/plain", data: "abc" } }]
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

    await expect(
      provider.analyze({
        title: "Example",
        url: "https://example.com",
        content: "Example content"
      })
    ).rejects.toMatchObject({
      name: "ProviderError",
      code: "bad_model_output",
      message: "Gemini returned no text output"
    })
  })
})
