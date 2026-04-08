import { describe, expect, it } from "vitest"
import { detectGhostreaderQueryMode, detectQueryIntent } from "../../src/features/hybrid-retrieval/query-intent"

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

  it("routes current-bookmark summary requests to current-only ghostreader mode", () => {
    expect(detectGhostreaderQueryMode("Summarize this bookmark")).toBe("current-only")
    expect(detectGhostreaderQueryMode("帮我总结这个书签的内容")).toBe("current-only")
  })

  it("routes bookmark-discovery questions to cross-bookmark ghostreader mode", () => {
    expect(detectGhostreaderQueryMode("Which bookmarks mention React?")).toBe("cross-bookmark")
    expect(detectGhostreaderQueryMode("关于杨幂的书签有哪些？")).toBe("cross-bookmark")
  })
})
