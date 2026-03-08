import React from "react"

import type { ProviderFormState } from "../features/settings/provider-form-state"
import type { ProviderValidation } from "../features/settings/settings-validation"

type ProviderSettingsFormProps = {
  value: ProviderFormState
  onChange: (nextValue: ProviderFormState) => void
  fieldErrors?: ProviderValidation
}

const PROVIDER_LABELS: Record<ProviderFormState["provider"], string> = {
  openai: "OpenAI-compatible",
  claude: "Claude",
  gemini: "Gemini"
}

function ProviderSettingsForm({ value, onChange, fieldErrors }: ProviderSettingsFormProps) {
  const providerLabel = PROVIDER_LABELS[value.provider]

  const updateField = <K extends keyof ProviderFormState>(field: K, fieldValue: ProviderFormState[K]) => {
    onChange({
      ...value,
      [field]: fieldValue
    })
  }

  return (
    <section>
      <h2>{providerLabel}</h2>

      <label>
        <input
          checked={value.enabled}
          onChange={(event) => updateField("enabled", event.target.checked)}
          type="checkbox"
        />
        Enabled
      </label>

      <div>
        <label htmlFor={`${value.provider}-api-key`}>API key</label>
        <input
          id={`${value.provider}-api-key`}
          onChange={(event) => updateField("apiKey", event.target.value)}
          type="password"
          value={value.apiKey}
        />
        {fieldErrors?.apiKey ? <p>{fieldErrors.apiKey}</p> : null}
      </div>

      <div>
        <label htmlFor={`${value.provider}-model`}>Model</label>
        <input
          id={`${value.provider}-model`}
          onChange={(event) => updateField("model", event.target.value)}
          type="text"
          value={value.model}
        />
        {fieldErrors?.model ? <p>{fieldErrors.model}</p> : null}
      </div>

      {value.provider === "openai" ? (
        <div>
          <label htmlFor="openai-base-url">Base URL</label>
          <input
            id="openai-base-url"
            onChange={(event) => updateField("baseUrl", event.target.value)}
            type="url"
            value={value.baseUrl ?? ""}
          />
          {fieldErrors?.baseUrl ? <p>{fieldErrors.baseUrl}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

export default ProviderSettingsForm
