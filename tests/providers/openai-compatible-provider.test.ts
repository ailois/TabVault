import { describe, expect, it, vi } from "vitest"

import { OpenAiCompatibleProvider } from "../../src/lib/providers/openai-compatible-provider"

describe("OpenAiCompatibleProvider", () => {
  it("parses summary and tags from a chat completions response", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"summary":"Short","tags":["one","two"]}'
            }
          }
        ]
      })
    }))

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      fetchImpl: fetchMock
    })

    const result = await provider.analyze({
      title: "Example",
      url: "https://example.com",
      content: "Example content"
    })

    expect(result.summary).toBe("Short")
    expect(result.tags).toEqual(["one", "two"])
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-key"
        })
      })
    )
  })

  it("normalizes a trailing slash in baseUrl", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"summary":"Short","tags":["one","two"]}'
            }
          }
        ]
      })
    }))

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1/",
      model: "gpt-4o-mini",
      fetchImpl: fetchMock
    })

    await provider.analyze({
      title: "Example",
      url: "https://example.com",
      content: "Example content"
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.any(Object)
    )
  })

  it.each([
    {
      status: 401,
      code: "auth_error",
      message: "OpenAI-compatible authentication failed"
    },
    {
      status: 403,
      code: "auth_error",
      message: "OpenAI-compatible authentication failed"
    },
    {
      status: 429,
      code: "rate_limit_error",
      message: "OpenAI-compatible rate limit exceeded"
    },
    {
      status: 500,
      code: "server_error",
      message: "OpenAI-compatible service failed"
    },
    {
      status: 400,
      code: "invalid_request_error",
      message: "OpenAI-compatible rejected the request"
    }
  ])("normalizes HTTP $status responses", async ({ status, code, message }) => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status,
      json: async () => ({})
    }))

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
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

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
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
      message: "socket hang up"
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

      const provider = new OpenAiCompatibleProvider({
        apiKey: "test-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        fetchImpl: fetchMock,
        timeoutMs: 10
      })

      const analyzePromise = provider.analyze({
        title: "Example",
        url: "https://example.com",
        content: "Example content"
      })

      const rejectionExpectation = expect(analyzePromise).rejects.toMatchObject({
        name: "ProviderError",
        code: "network_error",
        message: "The operation was aborted."
      })

      await vi.advanceTimersByTimeAsync(10)

      await rejectionExpectation
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not normalize synchronous pre-fetch request construction failures as network errors", async () => {
    const fetchMock = vi.fn()
    const config = {
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      fetchImpl: fetchMock,
      get model(): string {
        throw new Error("model getter failed")
      }
    }

    const provider = new OpenAiCompatibleProvider(config)

    await expect(
      provider.analyze({
        title: "Example",
        url: "https://example.com",
        content: "Example content"
      })
    ).rejects.toThrow("model getter failed")

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("normalizes missing message content as bad model output", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {}
          }
        ]
      })
    }))

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
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
      message: "OpenAI-compatible returned no text output"
    })
  })

  it("normalizes invalid JSON model content as bad model output", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: "not json"
            }
          }
        ]
      })
    }))

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
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
      code: "bad_model_output"
    })
  })
})
