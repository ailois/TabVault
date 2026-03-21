import { describe, expect, it, vi } from "vitest"

import { ResponsesApiProvider } from "../../src/lib/providers/responses-api-provider"

function makeJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }
}

const defaultInput = {
  title: "Example",
  url: "https://example.com",
  content: "Example content"
}

describe("ResponsesApiProvider", () => {
  it("parses summary and tags from a responses API reply", async () => {
    const fetchMock = vi.fn(async () =>
      makeJsonResponse({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: '{"summary":"Short","tags":["one","two"]}'
              }
            ]
          }
        ]
      })
    )

    const provider = new ResponsesApiProvider({
      apiKey: "test-key",
      baseUrl: "https://callflow.top/v1",
      model: "gpt-5.4-mini",
      fetchImpl: fetchMock
    })

    const result = await provider.analyze(defaultInput)

    expect(result.summary).toBe("Short")
    expect(result.tags).toEqual(["one", "two"])
    expect(fetchMock).toHaveBeenCalledWith(
      "https://callflow.top/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-key"
        })
      })
    )
  })

  it("normalizes a trailing slash in baseUrl", async () => {
    const fetchMock = vi.fn(async () =>
      makeJsonResponse({
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: '{"summary":"Short","tags":["one"]}' }]
          }
        ]
      })
    )

    const provider = new ResponsesApiProvider({
      apiKey: "test-key",
      baseUrl: "https://callflow.top/v1/",
      model: "gpt-5.4-mini",
      fetchImpl: fetchMock
    })

    await provider.analyze(defaultInput)

    expect(fetchMock).toHaveBeenCalledWith(
      "https://callflow.top/v1/responses",
      expect.any(Object)
    )
  })

  it("skips reasoning output items and reads the message item", async () => {
    const fetchMock = vi.fn(async () =>
      makeJsonResponse({
        output: [
          {
            type: "reasoning",
            encrypted_content: "some-encrypted-blob"
          },
          {
            type: "message",
            content: [
              { type: "output_text", text: '{"summary":"Reasoned","tags":["a"]}' }
            ]
          }
        ]
      })
    )

    const provider = new ResponsesApiProvider({
      apiKey: "test-key",
      baseUrl: "https://callflow.top/v1",
      model: "gpt-5.4-mini",
      fetchImpl: fetchMock
    })

    const result = await provider.analyze(defaultInput)

    expect(result.summary).toBe("Reasoned")
    expect(result.tags).toEqual(["a"])
  })

  it.each([
    { status: 401, code: "auth_error", message: "Responses API authentication failed" },
    { status: 403, code: "auth_error", message: "Responses API authentication failed" },
    { status: 429, code: "rate_limit_error", message: "Responses API rate limit exceeded" },
    { status: 500, code: "server_error", message: "Responses API service failed" },
    { status: 400, code: "invalid_request_error", message: "Responses API rejected the request" }
  ])("normalizes HTTP $status responses", async ({ status, code, message }) => {
    const fetchMock = vi.fn(async () => makeJsonResponse({}, status))

    const provider = new ResponsesApiProvider({
      apiKey: "test-key",
      baseUrl: "https://callflow.top/v1",
      model: "gpt-5.4-mini",
      fetchImpl: fetchMock
    })

    await expect(provider.analyze(defaultInput)).rejects.toMatchObject({
      name: "ProviderError",
      code,
      message
    })
  })

  it("normalizes fetch rejections as network errors", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("socket hang up")
    })

    const provider = new ResponsesApiProvider({
      apiKey: "test-key",
      baseUrl: "https://callflow.top/v1",
      model: "gpt-5.4-mini",
      fetchImpl: fetchMock
    })

    await expect(provider.analyze(defaultInput)).rejects.toMatchObject({
      name: "ProviderError",
      code: "network_error",
      message: "socket hang up"
    })
  })

  it("normalizes missing output text as bad model output", async () => {
    const fetchMock = vi.fn(async () =>
      makeJsonResponse({
        output: [{ type: "message", content: [] }]
      })
    )

    const provider = new ResponsesApiProvider({
      apiKey: "test-key",
      baseUrl: "https://callflow.top/v1",
      model: "gpt-5.4-mini",
      fetchImpl: fetchMock
    })

    await expect(provider.analyze(defaultInput)).rejects.toMatchObject({
      name: "ProviderError",
      code: "bad_model_output",
      message: "Responses API returned no text output"
    })
  })

  it("normalizes invalid JSON output text as bad model output", async () => {
    const fetchMock = vi.fn(async () =>
      makeJsonResponse({
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "not json" }]
          }
        ]
      })
    )

    const provider = new ResponsesApiProvider({
      apiKey: "test-key",
      baseUrl: "https://callflow.top/v1",
      model: "gpt-5.4-mini",
      fetchImpl: fetchMock
    })

    await expect(provider.analyze(defaultInput)).rejects.toMatchObject({
      name: "ProviderError",
      code: "bad_model_output"
    })
  })
})
