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
})
