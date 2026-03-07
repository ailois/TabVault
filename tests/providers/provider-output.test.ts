import { describe, expect, it } from "vitest"

import { parseAnalyzeResult } from "../../src/lib/providers/provider-output"

describe("parseAnalyzeResult", () => {
  it("parses summary and tags from provider JSON text", () => {
    const result = parseAnalyzeResult('{"summary":"Short","tags":["one","two"]}')

    expect(result.summary).toBe("Short")
    expect(result.tags).toEqual(["one", "two"])
  })
})
