import { expect, it, describe } from "vitest"
import { getBrowserName } from "../../../src/lib/utils/browser"

describe("getBrowserName", () => {
  it("detects Chrome", () => {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    expect(getBrowserName(userAgent)).toBe("Chrome")
  })

  it("detects Edge", () => {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
    expect(getBrowserName(userAgent)).toBe("Edge")
  })
})
