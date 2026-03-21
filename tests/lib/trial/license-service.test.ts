import { beforeEach, describe, expect, it, vi } from "vitest"

import { isRevalidationNeeded, validateLicenseKey } from "../../../src/lib/trial/license-service"
import { LICENSE_REVALIDATION_INTERVAL } from "../../../src/lib/trial/trial-constants"

describe("isRevalidationNeeded", () => {
  const now = new Date("2026-03-19T12:00:00.000Z").getTime()

  it("returns true when never validated", () => {
    expect(isRevalidationNeeded(undefined, now)).toBe(true)
  })

  it("returns false when validated recently", () => {
    const recentlyValidated = new Date(now - 1_000).toISOString()

    expect(isRevalidationNeeded(recentlyValidated, now)).toBe(false)
  })

  it("returns true when validated more than 30 days ago", () => {
    const oldValidation = new Date(now - LICENSE_REVALIDATION_INTERVAL - 1_000).toISOString()

    expect(isRevalidationNeeded(oldValidation, now)).toBe(true)
  })

  it("returns true when the validation timestamp is invalid", () => {
    expect(isRevalidationNeeded("not-a-date", now)).toBe(true)
  })
})

describe("validateLicenseKey", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.unstubAllGlobals()
  })

  it("returns valid for a successful API response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, license: { status: "active" } })
    })

    vi.stubGlobal("fetch", fetchMock)

    await expect(validateLicenseKey("LSKEY-VALID")).resolves.toBe("valid")
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lemonsqueezy.com/v1/licenses/validate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ license_key: "LSKEY-VALID" })
      }
    )
  })

  it("returns invalid for an unsuccessful API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "not_found" })
      })
    )

    await expect(validateLicenseKey("LSKEY-INVALID")).resolves.toBe("invalid")
  })

  it("returns unvalidated when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")))

    await expect(validateLicenseKey("LSKEY-ANY")).resolves.toBe("unvalidated")
  })
})
