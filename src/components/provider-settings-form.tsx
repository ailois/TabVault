import React, { useEffect, useState } from "react"

import type { ProviderFormState } from "../features/settings/provider-form-state"
import type { ProviderValidation } from "../features/settings/settings-validation"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

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

const PROVIDER_BASE_URL_DEFAULTS: Partial<Record<ProviderFormState["provider"], string>> = {
  openai: "https://api.openai.com/v1",
  claude: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models"
}

function ProviderSettingsForm({ value, onChange, fieldErrors, onTestConnection }: ProviderSettingsFormProps) {
  const theme = useThemeContext()
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

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${theme.border}`,
    borderRadius: radius.small,
    backgroundColor: theme.surfaceElevated,
    fontSize: "0.875rem",
    color: theme.textPrimary,
    transition: "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease"
  }

  return (
    <section style={{ display: "grid", gap: spacing.md }}>
      <div style={{ display: "grid", gap: "4px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            color: theme.textPrimary
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              flexShrink: 0,
              backgroundColor: providerColor
            }}
          />
          {providerLabel}
        </h2>
        <p data-testid="provider-description" style={{ margin: 0, color: theme.textMuted, fontSize: "0.8125rem", lineHeight: 1.5, maxWidth: "60ch" }}>
          {providerDescription}
        </p>
      </div>

      <div data-testid="provider-field-stack" style={{ display: "grid", gap: spacing.xs }}>
        <label htmlFor={`${value.provider}-api-key`} style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textSecondary }}>
          API key
        </label>
        <input
          aria-describedby={fieldErrors?.apiKey ? apiKeyErrorId : undefined}
          aria-invalid={fieldErrors?.apiKey ? true : undefined}
          id={`${value.provider}-api-key`}
          onChange={(event) => updateField("apiKey", event.target.value)}
          style={fieldStyle}
          type="password"
          value={value.apiKey}
        />
        {fieldErrors?.apiKey ? (
          <p aria-live="polite" id={apiKeyErrorId} role="alert" style={{ margin: 0, fontSize: "0.8125rem", color: theme.textDanger }}>
            {fieldErrors.apiKey}
          </p>
        ) : null}
      </div>

      <div data-testid="provider-field-stack" style={{ display: "grid", gap: spacing.xs }}>
        <label htmlFor={`${value.provider}-model`} style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textSecondary }}>
          Model
        </label>
        <input
          aria-describedby={fieldErrors?.model ? modelErrorId : undefined}
          aria-invalid={fieldErrors?.model ? true : undefined}
          id={`${value.provider}-model`}
          onChange={(event) => updateField("model", event.target.value)}
          style={fieldStyle}
          type="text"
          value={value.model}
        />
        {fieldErrors?.model ? (
          <p aria-live="polite" id={modelErrorId} role="alert" style={{ margin: 0, fontSize: "0.8125rem", color: theme.textDanger }}>
            {fieldErrors.model}
          </p>
        ) : null}
      </div>

      {(value.provider === "openai" || value.provider === "claude" || value.provider === "gemini") ? (
        <div data-testid="provider-field-stack" style={{ display: "grid", gap: spacing.xs }}>
          <label htmlFor={`${value.provider}-base-url`} style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textSecondary }}>
            Base URL
            {value.provider !== "openai" ? (
              <span style={{ fontWeight: 400, color: theme.textMuted, marginLeft: "0.5em" }}>
                (optional, defaults to {PROVIDER_BASE_URL_DEFAULTS[value.provider]})
              </span>
            ) : null}
          </label>
          <input
            aria-describedby={fieldErrors?.baseUrl ? baseUrlErrorId : undefined}
            aria-invalid={fieldErrors?.baseUrl ? true : undefined}
            id={`${value.provider}-base-url`}
            onChange={(event) => updateField("baseUrl", event.target.value)}
            placeholder={PROVIDER_BASE_URL_DEFAULTS[value.provider]}
            style={fieldStyle}
            type="url"
            value={value.baseUrl ?? ""}
          />
          {fieldErrors?.baseUrl ? (
            <p aria-live="polite" id={baseUrlErrorId} role="alert" style={{ margin: 0, fontSize: "0.8125rem", color: theme.textDanger }}>
              {fieldErrors.baseUrl}
            </p>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
        <button
          data-testid="provider-test-button"
          disabled={!canTest || testStatus === "testing"}
          onClick={() => void handleTestConnection()}
          style={{ padding: `6px ${spacing.md}`, border: "none", borderRadius: radius.medium, backgroundColor: "transparent", color: theme.accent, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}
          type="button"
        >
          {testStatus === "testing" ? "Testing..." : "Test connection"}
        </button>
        {testStatus !== "idle" && testStatus !== "testing" ? (
          <span data-testid="connection-test-result" style={{ fontSize: "0.8125rem", color: testStatus === "ok" ? theme.textSuccess : theme.textDanger }}>
            {testStatus === "ok" ? "Connected" : testStatus}
          </span>
        ) : null}
      </div>
    </section>
  )
}

export default ProviderSettingsForm
