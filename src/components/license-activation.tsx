import React, { useEffect, useMemo, useState } from "react"

import { ErrorBanner } from "./error-banner"
import type { DisplayLanguage } from "../types/settings"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

export type LicenseActivationProps = {
  licenseKey: string
  isLicensed: boolean
  language?: DisplayLanguage
  isSubmitting?: boolean
  errorMessage?: string | null
  copy?: Partial<{
    headingActivate: string
    descriptionActivate: string
    headingActivated: string
    descriptionActivated: string
    fieldLabel: string
    activateButton: string
    activatingButton: string
    changeButton: string
  }>
  onLicenseKeyChange: (value: string) => void
  onSubmit: () => void | Promise<void>
  onEdit?: () => void
}

const DEFAULT_COPY: Record<DisplayLanguage, {
  headingActivate: string
  descriptionActivate: string
  headingActivated: string
  descriptionActivated: string
  fieldLabel: string
  activateButton: string
  activatingButton: string
  changeButton: string
}> = {
  en: {
    headingActivate: "Activate TabVault",
    descriptionActivate: "Enter your license key to unlock premium features.",
    headingActivated: "Activated",
    descriptionActivated: "Your license is active on this browser profile.",
    fieldLabel: "License Key",
    activateButton: "Activate",
    activatingButton: "Activating...",
    changeButton: "Change license key"
  },
  zh: {
    headingActivate: "\u6fc0\u6d3b TabVault",
    descriptionActivate: "\u8f93\u5165\u8bb8\u53ef\u5bc6\u94a5\u4ee5\u89e3\u9501\u5b8c\u6574\u529f\u80fd\u3002",
    headingActivated: "\u5df2\u6fc0\u6d3b",
    descriptionActivated: "\u4f60\u7684\u8bb8\u53ef\u5df2\u5728\u5f53\u524d\u6d4f\u89c8\u5668\u914d\u7f6e\u4e2d\u751f\u6548\u3002",
    fieldLabel: "\u8bb8\u53ef\u5bc6\u94a5",
    activateButton: "\u6fc0\u6d3b",
    activatingButton: "\u6fc0\u6d3b\u4e2d...",
    changeButton: "\u66f4\u6362\u8bb8\u53ef\u5bc6\u94a5"
  }
}

function maskLicenseKey(key: string): string {
  const trimmed = key.trim()

  if (trimmed.length === 0) {
    return ""
  }

  const visiblePart = trimmed.slice(-4)
  const maskedPrefix = "\u2022".repeat(Math.max(0, trimmed.length - 4))

  return `${maskedPrefix}${visiblePart}`
}

export function LicenseActivation({
  licenseKey,
  isLicensed,
  language = "en",
  isSubmitting = false,
  errorMessage = null,
  copy,
  onLicenseKeyChange,
  onSubmit,
  onEdit
}: LicenseActivationProps) {
  const theme = useThemeContext()
  const [isEditing, setIsEditing] = useState(!isLicensed)
  const headingId = isLicensed && !isEditing ? "license-activation-heading-active" : "license-activation-heading-edit"

  useEffect(() => {
    setIsEditing(!isLicensed)
  }, [isLicensed])

  const canSubmit = licenseKey.trim().length > 0 && !isSubmitting
  const maskedKey = useMemo(() => maskLicenseKey(licenseKey), [licenseKey])
  const resolvedCopy = { ...DEFAULT_COPY[language], ...copy }

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
      <section aria-labelledby={headingId} data-testid="license-activation-card" style={cardStyle}>
        <h2 id={headingId} style={headingStyle}>{resolvedCopy.headingActivated}</h2>
        <p style={descriptionStyle}>{resolvedCopy.descriptionActivated}</p>
        <p style={{ margin: 0, color: theme.textMuted, fontSize: "0.8125rem" }}>{maskedKey}</p>
        <button
          data-testid="license-change-button"
          onClick={() => {
            setIsEditing(true)
            onEdit?.()
          }}
          style={secondaryButtonStyle}
          type="button"
        >
          {resolvedCopy.changeButton}
        </button>
      </section>
    )
  }

  return (
    <section aria-labelledby={headingId} data-testid="license-activation-card" style={cardStyle}>
      <h2 id={headingId} style={headingStyle}>{resolvedCopy.headingActivate}</h2>
      <p style={descriptionStyle}>{resolvedCopy.descriptionActivate}</p>

      <div style={{ display: "grid", gap: spacing.xs }}>
        <label htmlFor="license-key-input" style={{ fontSize: "0.75rem", color: theme.textMuted, fontWeight: 500 }}>
          {resolvedCopy.fieldLabel}
        </label>
        <input
          aria-label={resolvedCopy.fieldLabel}
          data-testid="license-key-input"
          disabled={isSubmitting}
          id="license-key-input"
          onChange={(event) => onLicenseKeyChange(event.target.value)}
          style={inputStyle}
          type="text"
          value={licenseKey}
        />
      </div>

      {errorMessage ? <ErrorBanner language={language} message={errorMessage} /> : null}

      <button data-testid="license-submit-button" disabled={!canSubmit} onClick={() => void onSubmit()} style={primaryButtonStyle} type="button">
        {isSubmitting ? resolvedCopy.activatingButton : resolvedCopy.activateButton}
      </button>
    </section>
  )
}

export default LicenseActivation
