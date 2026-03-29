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
})
