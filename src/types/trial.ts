export type LicenseStatus = "unvalidated" | "valid" | "invalid"

export type TrialState = {
  installedAt: string
  analysisUsed: number
  licenseKey?: string
  licenseStatus?: LicenseStatus
  licenseValidatedAt?: string
}

export type TrialStatus = "trial" | "expired" | "licensed"
