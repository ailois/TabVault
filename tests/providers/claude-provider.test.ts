import { describe, expect, it, vi } from "vitest"

import { ClaudeProvider } from "../../src/lib/providers/claude-provider"

describe("ClaudeProvider", () => {
  it("parses Claude Messages API text output into summary and tags", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: "text", text: '{"summary":"Short","tags":["a","b"]}' }]
      })
    }))

    const provider = new ClaudeProvider({
      apiKey: "test-key",
      model: "claude-sonnet-4-5",
      fetchImpl: fetchMock
    })

    const result = await provider.analyze({
      title: "Example",
      url: "https://example.com",
      content: "Example content"
    })

    expect(result.summary).toBe("Short")
    expect(result.tags).toEqual(["a", "b"])
  })

  it("sends requests to the Claude Messages API with required headers", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: "text", text: '{"summary":"Short","tags":["a","b"]}' }]
      })
    }))

    const provider = new ClaudeProvider({
      apiKey: "test-key",
      model: "claude-sonnet-4-5",
      fetchImpl: fetchMock
    })

    await provider.analyze({
      title: "Example",
      url: "https://example.com",
      content: "Example content"
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": "test-key",
          "anthropic-version": "2023-06-01"
        })
      })
    )
  })

  it.each([
    {
      status: 401,
      code: "auth_error",
      message: "Claude authentication failed"
    },
    {
      status: 403,
      code: "auth_error",
      message: "Claude authentication failed"
    },
    {
      status: 429,
      code: "rate_limit_error",
      message: "Claude rate limit exceeded"
    },
    {
      status: 500,
      code: "server_error",
      message: "Claude service failed"
    },
    {
      status: 400,
      code: "invalid_request_error",
      message: "Claude rejected the request"
    }
  ])("normalizes HTTP $status responses", async ({ status, code, message }) => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status,
      json: async () => ({})
    }))

    const provider = new ClaudeProvider({
      apiKey: "test-key",
      model: "claude-sonnet-4-5",
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

    const provider = new ClaudeProvider({
      apiKey: "test-key",
      model: "claude-sonnet-4-5",
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
      message: "Claude request failed"
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

      const provider = new ClaudeProvider({
        apiKey: "test-key",
        model: "claude-sonnet-4-5",
        fetchImpl: fetchMock,
        timeoutMs: 10
      })

      const analyzePromise = provider.analyze({
        title: "Example",
        url: "https://example.com",
        content: "Example content"
      })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      )

      const rejectionExpectation = expect(analyzePromise).rejects.toMatchObject({
        name: "ProviderError",
        code: "network_error",
        message: "Claude request failed"
      })

      await vi.advanceTimersByTimeAsync(10)

      await rejectionExpectation
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not normalize synchronous pre-fetch request construction failures as network errors", async () => {
    const fetchMock = vi.fn()
    const provider = new ClaudeProvider({
      apiKey: "test-key",
      model: "claude-sonnet-4-5",
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
        content: [{ type: "tool_use" }]
      })
    }))

    const provider = new ClaudeProvider({
      apiKey: "test-key",
      model: "claude-sonnet-4-5",
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
      message: "Claude returned no text output"
    })
  })
})
