import type { LicenseStatus } from "../../types/trial"

import { LICENSE_REVALIDATION_INTERVAL } from "./trial-constants"

const LEMON_SQUEEZY_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate"

type ValidateLicenseResponse = {
  valid?: boolean
  license?: {
    status?: string
  }
}

export function isRevalidationNeeded(lastValidatedAt: string | undefined, now: number = Date.now()): boolean {
  if (!lastValidatedAt) {
    return true
  }

  const lastValidatedAtTime = new Date(lastValidatedAt).getTime()

  if (Number.isNaN(lastValidatedAtTime)) {
    return true
  }

  return now - lastValidatedAtTime > LICENSE_REVALIDATION_INTERVAL
}

export async function validateLicenseKey(key: string): Promise<LicenseStatus> {
  try {
    const response = await fetch(LEMON_SQUEEZY_VALIDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ license_key: key })
    })

    if (!response.ok) {
      return "invalid"
    }

    const data = (await response.json()) as ValidateLicenseResponse

    if (data.valid && data.license?.status === "active") {
      return "valid"
    }

    return "invalid"
  } catch {
    return "unvalidated"
  }
}
