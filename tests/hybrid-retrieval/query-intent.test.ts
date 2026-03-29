import { describe, expect, it } from "vitest"
import { detectQueryIntent } from "../../src/features/hybrid-retrieval/query-intent"

describe("detectQueryIntent", () => {
  it("returns retrieve for short keyword queries", () => {
    expect(detectQueryIntent("react compiler memoization")).toBe("retrieve")
  })

  it("returns answer for natural-language questions", () => {
    expect(detectQueryIntent("这篇文章对 useMemo 的结论是什么？")).toBe("answer")
  })

  it("returns mixed for ambiguous descriptive prompts", () => {
    expect(detectQueryIntent("compare current page with my saved react notes")).toBe("mixed")
  })
})
