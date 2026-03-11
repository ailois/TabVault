import React, { useEffect, useState } from "react"

import type { ProviderFormState } from "../features/settings/provider-form-state"
import type { ProviderValidation } from "../features/settings/settings-validation"
import { colors, controls, radius, spacing } from "../ui/design-tokens"

type ProviderSettingsFormProps = {
  value: ProviderFormState
  onChange: (nextValue: ProviderFormState) => void
  fieldErrors?: ProviderValidation
  onTestConnection: (value: ProviderFormState) => Promise<"ok" | string>
}

const PROVIDER_LABELS: Record<ProviderFormState["provider"], string> = {
  openai: "OpenAI-compatible",
  claude: "Claude",
  gemini: "Gemini"
}

const PROVIDER_DESCRIPTIONS: Record<ProviderFormState["provider"], string> = {
  openai: "Use any OpenAI-compatible endpoint by providing an API key, model, and base URL.",
  claude: "Use your Anthropic API key and preferred Claude model for analysis.",
  gemini: "Use your Google AI Studio API key and Gemini model for analysis."
}

const PROVIDER_COLORS: Record<ProviderFormState["provider"], string> = {
  openai: "#10a37f",
  claude: "#d97706",
  gemini: "#4285f4"
}

function ProviderSettingsForm({ value, onChange, fieldErrors, onTestConnection }: ProviderSettingsFormProps) {
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | string>("idle")

  useEffect(() => {
    setTestStatus("idle")
  }, [value])

  const providerLabel = PROVIDER_LABELS[value.provider]
  const providerDescription = PROVIDER_DESCRIPTIONS[value.provider]
  const providerColor = PROVIDER_COLORS[value.provider]
  const apiKeyErrorId = `${value.provider}-api-key-error`
  const modelErrorId = `${value.provider}-model-error`
  const baseUrlErrorId = `${value.provider}-base-url-error`

  const updateField = <K extends keyof ProviderFormState>(field: K, fieldValue: ProviderFormState[K]) => {
    onChange({
      ...value,
      [field]: fieldValue
    })
  }

  const canTest =
    value.enabled &&
    value.apiKey.trim().length > 0 &&
    value.model.trim().length > 0 &&
    (value.provider !== "openai" || (value.baseUrl ?? "").trim().length > 0)

  async function handleTestConnection(): Promise<void> {
    setTestStatus("testing")
    const result = await onTestConnection(value)
    setTestStatus(result)

    if (result === "ok") {
      setTimeout(() => setTestStatus("idle"), 3000)
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <h2 style={headingStyle}>
          <span style={{ ...colorDotStyle, backgroundColor: providerColor }} aria-hidden="true" />
          {providerLabel}
        </h2>
        <p data-testid="provider-description" style={descriptionStyle}>
          {providerDescription}
        </p>
      </div>

      <div data-testid="provider-enabled-row" style={enabledRowStyle}>
        <label style={enabledLabelStyle}>
          <span>Enabled</span>
          <input
            checked={value.enabled}
            onChange={(event) => updateField("enabled", event.target.checked)}
            style={checkboxStyle}
            type="checkbox"
          />
        </label>
      </div>

      <div data-testid="provider-field-stack" style={fieldStackStyle}>
        <label htmlFor={`${value.provider}-api-key`} style={fieldLabelStyle}>
          API key
        </label>
        <input
          aria-describedby={fieldErrors?.apiKey ? apiKeyErrorId : undefined}
          aria-invalid={fieldErrors?.apiKey ? true : undefined}
          id={`${value.provider}-api-key`}
          onChange={(event) => updateField("apiKey", event.target.value)}
          style={inputStyle}
          type="password"
          value={value.apiKey}
        />
        {fieldErrors?.apiKey ? (
          <p aria-live="polite" id={apiKeyErrorId} role="alert" style={errorStyle}>
            {fieldErrors.apiKey}
          </p>
        ) : null}
      </div>

      <div data-testid="provider-field-stack" style={fieldStackStyle}>
        <label htmlFor={`${value.provider}-model`} style={fieldLabelStyle}>
          Model
        </label>
        <input
          aria-describedby={fieldErrors?.model ? modelErrorId : undefined}
          aria-invalid={fieldErrors?.model ? true : undefined}
          id={`${value.provider}-model`}
          onChange={(event) => updateField("model", event.target.value)}
          style={inputStyle}
          type="text"
          value={value.model}
        />
        {fieldErrors?.model ? (
          <p aria-live="polite" id={modelErrorId} role="alert" style={errorStyle}>
            {fieldErrors.model}
          </p>
        ) : null}
      </div>

      {value.provider === "openai" ? (
        <div data-testid="provider-field-stack" style={fieldStackStyle}>
          <label htmlFor="openai-base-url" style={fieldLabelStyle}>
            Base URL
          </label>
          <input
            aria-describedby={fieldErrors?.baseUrl ? baseUrlErrorId : undefined}
            aria-invalid={fieldErrors?.baseUrl ? true : undefined}
            id="openai-base-url"
            onChange={(event) => updateField("baseUrl", event.target.value)}
            style={inputStyle}
            type="url"
            value={value.baseUrl ?? ""}
          />
          {fieldErrors?.baseUrl ? (
            <p aria-live="polite" id={baseUrlErrorId} role="alert" style={errorStyle}>
              {fieldErrors.baseUrl}
            </p>
          ) : null}
        </div>
      ) : null}

      <div style={testRowStyle}>
        <button
          data-testid="provider-test-button"
          disabled={!canTest || testStatus === "testing"}
          onClick={() => void handleTestConnection()}
          style={testButtonStyle}
          type="button"
        >
          {testStatus === "testing" ? "Testing..." : "Test connection"}
        </button>
        {testStatus !== "idle" && testStatus !== "testing" ? (
          <span
            data-testid="connection-test-result"
            style={testStatus === "ok" ? testSuccessStyle : testErrorStyle}
          >
            {testStatus === "ok" ? "✓ Connected" : testStatus}
          </span>
        ) : null}
      </div>
    </section>
  )
}

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.md
}

const headerStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px"
}

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: spacing.sm
}

const colorDotStyle: React.CSSProperties = {
  display: "inline-block",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  flexShrink: 0
}

const descriptionStyle: React.CSSProperties = {
  margin: 0,
  color: colors.textMuted,
  fontSize: "0.8125rem",
  lineHeight: 1.5,
  maxWidth: "60ch"
}

const enabledRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: spacing.sm
}

const enabledLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.md,
  fontWeight: 500,
  fontSize: "0.875rem"
}

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  accentColor: controls.primary.background
}

const fieldStackStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.xs
}

const fieldLabelStyle: React.CSSProperties = {
  fontWeight: 500,
  fontSize: "0.875rem",
  color: colors.textSecondary
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: `${spacing.sm} ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.input.background,
  fontSize: "0.875rem",
  color: colors.textPrimary,
  transition: "background-color 0.15s ease"
}

const errorStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  color: colors.textDanger
}

const testRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm
}

const testButtonStyle: React.CSSProperties = {
  padding: `6px ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.secondary.background,
  color: colors.textSecondary,
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer"
}

const testSuccessStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: colors.textSuccess
}

const testErrorStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: colors.textDanger
}

export default ProviderSettingsForm
