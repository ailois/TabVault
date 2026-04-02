import React, { useEffect, useMemo, useState } from "react"

import { ErrorBanner } from "./error-banner"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

export type LicenseActivationProps = {
  licenseKey: string
  isLicensed: boolean
  isSubmitting?: boolean
  errorMessage?: string | null
  onLicenseKeyChange: (value: string) => void
  onSubmit: () => void | Promise<void>
  onEdit?: () => void
}

function maskLicenseKey(key: string): string {
  const trimmed = key.trim()

  if (trimmed.length === 0) {
    return ""
  }

  const visiblePart = trimmed.slice(-4)
  const maskedPrefix = "•".repeat(Math.max(0, trimmed.length - 4))

  return `${maskedPrefix}${visiblePart}`
}

export function LicenseActivation({
  licenseKey,
  isLicensed,
  isSubmitting = false,
  errorMessage = null,
  onLicenseKeyChange,
  onSubmit,
  onEdit
}: LicenseActivationProps) {
  const theme = useThemeContext()
  const [isEditing, setIsEditing] = useState(!isLicensed)

  useEffect(() => {
    setIsEditing(!isLicensed)
  }, [isLicensed])

  const canSubmit = licenseKey.trim().length > 0 && !isSubmitting
  const maskedKey = useMemo(() => maskLicenseKey(licenseKey), [licenseKey])

  const cardStyle: React.CSSProperties = {
    display: "grid",
    gap: spacing.md,
    padding: "20px",
    border: `1px solid ${theme.border}`,
    borderRadius: "12px",
    backgroundColor: theme.surface,
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
  }

  const headingStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 600,
    color: theme.textPrimary
  }

  const descriptionStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    color: theme.textMuted
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${theme.border}`,
    borderRadius: "10px",
    backgroundColor: theme.page,
    color: theme.textPrimary,
    fontSize: "0.875rem"
  }

  const primaryButtonStyle: React.CSSProperties = {
    padding: `10px ${spacing.md}`,
    borderRadius: "10px",
    border: "none",
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer"
  }

  const secondaryButtonStyle: React.CSSProperties = {
    padding: `10px ${spacing.md}`,
    borderRadius: "10px",
    border: `1px solid ${theme.border}`,
    backgroundColor: "transparent",
    color: theme.textPrimary,
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer"
  }

  if (isLicensed && !isEditing) {
    return (
      <section data-testid="license-activation-card" style={cardStyle}>
        <h2 style={headingStyle}>Activated</h2>
        <p style={descriptionStyle}>Your license is active on this browser profile.</p>
        <p style={{ margin: 0, color: theme.textMuted, fontSize: "0.8125rem" }}>{maskedKey}</p>
        <button
          onClick={() => {
            setIsEditing(true)
            onEdit?.()
          }}
          style={secondaryButtonStyle}
          type="button"
        >
          Change license key
        </button>
      </section>
    )
  }

  return (
    <section data-testid="license-activation-card" style={cardStyle}>
      <h2 style={headingStyle}>Activate TabVault</h2>
      <p style={descriptionStyle}>Enter your license key to unlock premium features.</p>

      <div style={{ display: "grid", gap: spacing.xs }}>
        <label htmlFor="license-key-input" style={{ fontSize: "0.75rem", color: theme.textMuted, fontWeight: 500 }}>
          License Key
        </label>
        <input
          aria-label="License Key"
          disabled={isSubmitting}
          id="license-key-input"
          onChange={(event) => onLicenseKeyChange(event.target.value)}
          style={inputStyle}
          type="text"
          value={licenseKey}
        />
      </div>

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <button disabled={!canSubmit} onClick={() => void onSubmit()} style={primaryButtonStyle} type="button">
        {isSubmitting ? "Activating..." : "Activate"}
      </button>
    </section>
  )
}

export default LicenseActivation
