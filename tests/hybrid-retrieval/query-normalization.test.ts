import { describe, expect, it } from "vitest"
import { normalizeQuery, tokenizeQuery } from "../../src/features/hybrid-retrieval/query-normalization"

describe("normalizeQuery", () => {
  it("trims and lowercases the query", () => {
    expect(normalizeQuery("  React Compiler  ")).toBe("react compiler")
  })
})

describe("tokenizeQuery", () => {
  it("splits normalized query into non-empty tokens", () => {
    expect(tokenizeQuery("react compiler memoization")).toEqual(["react", "compiler", "memoization"])
  })

  it("extracts meaningful CJK tokens from a natural-language Chinese question", () => {
    const tokens = tokenizeQuery("\u5173\u4e8e\u6768\u5e42\u7684\u4e66\u7b7e\u6709\u54ea\u4e9b\uff1f")

    expect(tokens).toContain("\u6768\u5e42")
    expect(tokens).not.toContain("\u5173\u4e8e")
    expect(tokens).not.toContain("\u4e66\u7b7e")
  })
})
