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
  openai: "OpenAI Chat",
  claude: "Claude",
  gemini: "Gemini"
}

const PROVIDER_DESCRIPTIONS: Record<ProviderFormState["provider"], string> = {
  openai: "/v1/chat/completions",
  claude: "Anthropic Messages",
  gemini: "Google AI Studio"
}

const PROVIDER_COLORS: Record<ProviderFormState["provider"], string> = {
  openai: "#6B8E73",
  claude: "#C08457",
  gemini: "#5B7C99"
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
    borderRadius: radius.medium,
    backgroundColor: theme.page,
    fontSize: "0.875rem",
    color: theme.textPrimary,
    transition: "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease"
  }

  const labelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    fontWeight: 500,
    fontSize: "0.75rem",
    color: theme.textMuted,
    marginBottom: "6px"
  }

  return (
    <section style={{ display: "grid", gap: spacing.lg }}>
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
        <p data-testid="provider-description" style={{ margin: 0, color: theme.textMuted, fontSize: "0.75rem", lineHeight: 1.5 }}>
          {providerDescription}
        </p>
      </div>

      <div style={{ display: "grid", gap: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${theme.border}` }}>
        <div data-testid="provider-field-stack" style={{ display: "grid" }}>
          <label htmlFor={`${value.provider}-api-key`} style={labelStyle}>
            <span>API Key</span>
            <span style={{ color: theme.textDanger, opacity: 0.8 }}>必填</span>
          </label>
          <input
            aria-describedby={fieldErrors?.apiKey ? apiKeyErrorId : undefined}
            aria-invalid={fieldErrors?.apiKey ? true : undefined}
            id={`${value.provider}-api-key`}
            onChange={(event) => updateField("apiKey", event.target.value)}
            placeholder="sk-..."
            style={fieldStyle}
            type="password"
            value={value.apiKey}
          />
          {fieldErrors?.apiKey ? (
            <p aria-live="polite" id={apiKeyErrorId} role="alert" style={{ margin: "6px 0 0", fontSize: "0.8125rem", color: theme.textDanger }}>
              {fieldErrors.apiKey}
            </p>
          ) : null}
        </div>

        <div data-testid="provider-field-stack" style={{ display: "grid" }}>
          <label htmlFor={`${value.provider}-model`} style={labelStyle}>
            <span>Model (模型名称)</span>
            <span style={{ color: theme.textDanger, opacity: 0.8 }}>必填</span>
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
            <p aria-live="polite" id={modelErrorId} role="alert" style={{ margin: "6px 0 0", fontSize: "0.8125rem", color: theme.textDanger }}>
              {fieldErrors.model}
            </p>
          ) : null}
        </div>

        <div data-testid="provider-field-stack" style={{ display: "grid" }}>
          <label htmlFor={`${value.provider}-base-url`} style={{ ...labelStyle, justifyContent: "flex-start" }}>
            <span>
              Base URL
              {value.provider !== "openai" ? (
                <span style={{ fontWeight: 400, color: theme.textMuted, marginLeft: "0.5em" }}>
                  (optional, defaults to {PROVIDER_BASE_URL_DEFAULTS[value.provider]})
                </span>
              ) : null}
            </span>
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
            <p aria-live="polite" id={baseUrlErrorId} role="alert" style={{ margin: "6px 0 0", fontSize: "0.8125rem", color: theme.textDanger }}>
              {fieldErrors.baseUrl}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: "4px", paddingTop: spacing.md, borderTop: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <span style={{ fontSize: "0.75rem", color: testStatus === "ok" ? theme.textSuccess : theme.textMuted, display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: testStatus === "ok" ? theme.textSuccess : testStatus !== "idle" && testStatus !== "testing" ? theme.textDanger : "#D1D5DB" }} />
          {testStatus === "idle" || testStatus === "testing"
            ? "尚未测试连通性"
            : testStatus === "ok"
              ? "连接成功"
              : testStatus}
        </span>
        <button
          data-testid="provider-test-button"
          disabled={!canTest || testStatus === "testing"}
          onClick={() => void handleTestConnection()}
          style={{
            padding: 0,
            border: "none",
            backgroundColor: "transparent",
            color: theme.accent,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
          type="button"
        >
          {testStatus === "testing" ? "测试中..." : "测试连接 (Test)"}
        </button>
      </div>
    </section>
  )
}

export default ProviderSettingsForm
