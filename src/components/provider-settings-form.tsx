import React, { useEffect, useMemo, useState } from "react"

import type { ProviderFormState } from "../features/settings/provider-form-state"
import type { ProviderValidation } from "../features/settings/settings-validation"
import { getProviderPresentation } from "../lib/i18n/provider-metadata"
import type { DisplayLanguage } from "../types/settings"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type ProviderSettingsFormProps = {
  value: ProviderFormState
  onChange: (nextValue: ProviderFormState) => void
  fieldErrors?: ProviderValidation
  onTestConnection: (value: ProviderFormState) => Promise<"ok" | string>
  language?: DisplayLanguage
}

const PROVIDER_COLORS: Record<ProviderFormState["provider"], string> = {
  openai: "#6B8E73",
  "openai-response": "#6B8E73",
  claude: "#C08457",
  gemini: "#5B7C99"
}

const PROVIDER_BASE_URL_DEFAULTS: Partial<Record<ProviderFormState["provider"], string>> = {
  openai: "https://api.openai.com/v1",
  "openai-response": "https://api.openai.com/v1",
  claude: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models"
}

const FORM_COPY: Record<DisplayLanguage, {
  required: string
  apiKey: string
  model: string
  baseUrl: string
  baseUrlOptional: (url: string) => string
  connectionIdle: string
  connectionTesting: string
  connectionSuccess: string
  testButton: string
  testingButton: string
}> = {
  en: {
    required: "Required",
    apiKey: "API key",
    model: "Model",
    baseUrl: "Base URL",
    baseUrlOptional: (url) => `optional, defaults to ${url}`,
    connectionIdle: "Connection not tested yet",
    connectionTesting: "Testing connection...",
    connectionSuccess: "Connected",
    testButton: "Test connection",
    testingButton: "Testing..."
  },
  zh: {
    required: "必填",
    apiKey: "API Key",
    model: "模型",
    baseUrl: "Base URL",
    baseUrlOptional: (url) => `可选，默认使用 ${url}`,
    connectionIdle: "尚未测试连接",
    connectionTesting: "正在测试连接...",
    connectionSuccess: "连接成功",
    testButton: "测试连接",
    testingButton: "测试中..."
  }
}

const LOCALIZED_FORM_COPY: typeof FORM_COPY = {
  en: FORM_COPY.en,
  zh: {
    required: "\u5fc5\u586b",
    apiKey: "API \u5bc6\u94a5",
    model: "\u6a21\u578b",
    baseUrl: "\u57fa\u7840 URL",
    baseUrlOptional: (url) => `\u53ef\u9009\uff0c\u9ed8\u8ba4\u4f7f\u7528 ${url}`,
    connectionIdle: "\u5c1a\u672a\u6d4b\u8bd5\u8fde\u63a5",
    connectionTesting: "\u6b63\u5728\u6d4b\u8bd5\u8fde\u63a5...",
    connectionSuccess: "\u8fde\u63a5\u6210\u529f",
    testButton: "\u6d4b\u8bd5\u8fde\u63a5",
    testingButton: "\u6d4b\u8bd5\u4e2d..."
  }
}

function ProviderSettingsForm({
  value,
  onChange,
  fieldErrors,
  onTestConnection,
  language = "en"
}: ProviderSettingsFormProps) {
  const theme = useThemeContext()
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | string>("idle")

  useEffect(() => {
    setTestStatus("idle")
  }, [value])

  const copy = LOCALIZED_FORM_COPY[language]
  const providerPresentation = getProviderPresentation(language, value.provider)
  const providerColor = PROVIDER_COLORS[value.provider]
  const apiKeyErrorId = `${value.provider}-api-key-error`
  const modelErrorId = `${value.provider}-model-error`
  const baseUrlErrorId = `${value.provider}-base-url-error`

  const connectionLabel = useMemo(() => {
    if (testStatus === "idle") {
      return null
    }
    if (testStatus === "testing") {
      return copy.connectionTesting
    }
    if (testStatus === "ok") {
      return copy.connectionSuccess
    }
    return testStatus
  }, [copy.connectionSuccess, copy.connectionTesting, testStatus])

  const updateField = <K extends keyof ProviderFormState>(field: K, fieldValue: ProviderFormState[K]) => {
    onChange({
      ...value,
      [field]: fieldValue
    })
  }

  const canTest =
    value.apiKey.trim().length > 0 &&
    value.model.trim().length > 0 &&
    (value.provider !== "openai" && value.provider !== "openai-response" || (value.baseUrl ?? "").trim().length > 0)

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
    <section data-testid={`provider-settings-form-${value.provider}`} style={{ display: "grid", gap: spacing.lg }}>
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
          {providerPresentation.label}
        </h2>
        <p data-testid="provider-description" style={{ margin: 0, color: theme.textMuted, fontSize: "0.75rem", lineHeight: 1.5 }}>
          {providerPresentation.description}
        </p>
      </div>

      <div style={{ display: "grid", gap: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${theme.border}` }}>
        <div data-testid="provider-field-stack" style={{ display: "grid", gap: spacing.xs }}>
          <label htmlFor={`${value.provider}-api-key`} style={labelStyle}>
            <span>{copy.apiKey}</span>
            <span style={{ color: theme.textDanger, opacity: 0.8 }}>{copy.required}</span>
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

        <div data-testid="provider-field-stack" style={{ display: "grid", gap: spacing.xs }}>
          <label htmlFor={`${value.provider}-model`} style={labelStyle}>
            <span>{copy.model}</span>
            <span style={{ color: theme.textDanger, opacity: 0.8 }}>{copy.required}</span>
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

        <div data-testid="provider-field-stack" style={{ display: "grid", gap: spacing.xs }}>
          <label htmlFor={`${value.provider}-base-url`} style={{ ...labelStyle, justifyContent: "flex-start" }}>
            <span>
              {copy.baseUrl}
              {value.provider !== "openai" && value.provider !== "openai-response" ? (
                <span style={{ fontWeight: 400, color: theme.textMuted, marginLeft: "0.5em" }}>
                  ({copy.baseUrlOptional(PROVIDER_BASE_URL_DEFAULTS[value.provider] ?? "")})
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
        {connectionLabel ? (
          <span data-testid="connection-test-result" style={{ fontSize: "0.75rem", color: testStatus === "ok" ? theme.textSuccess : testStatus !== "idle" && testStatus !== "testing" ? theme.textDanger : theme.textMuted, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: testStatus === "ok" ? theme.textSuccess : testStatus !== "idle" && testStatus !== "testing" ? theme.textDanger : "#D1D5DB" }} />
            {connectionLabel}
          </span>
        ) : (
          <span style={{ fontSize: "0.75rem", color: theme.textMuted, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: "#D1D5DB" }} />
            {copy.connectionIdle}
          </span>
        )}
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
          {testStatus === "testing" ? copy.testingButton : copy.testButton}
        </button>
      </div>
    </section>
  )
}

export default ProviderSettingsForm
