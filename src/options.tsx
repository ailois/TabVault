import React from "react"

import ProviderSettingsForm from "./components/provider-settings-form"
import { DEFAULT_APP_SETTINGS } from "./features/settings/default-settings"
import { buildProviderFormState } from "./features/settings/provider-form-state"
import { validateSettingsForm } from "./features/settings/settings-validation"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"

type OptionsProps = {
  services?: Partial<OptionsServices>
}

type OptionsServices = {
  settingsRepository: SettingsRepository
}

type SaveStatus = "idle" | "saving" | "saved" | "error"

const DEFAULT_OPTIONS_SERVICES: OptionsServices = {
  settingsRepository: new ChromeSettingsRepository()
}

function Options({ services }: OptionsProps) {
  const optionsServices = React.useMemo(() => ({ ...DEFAULT_OPTIONS_SERVICES, ...services }), [services])
  const [appSettings, setAppSettings] = React.useState(DEFAULT_APP_SETTINGS)
  const [providers, setProviders] = React.useState(() => buildProviderFormState([]))
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle")
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasLoadError, setHasLoadError] = React.useState(false)
  const isSavingRef = React.useRef(false)
  const validation = React.useMemo(() => validateSettingsForm(appSettings, providers), [appSettings, providers])

  const handleSave = React.useCallback(async () => {
    if (isLoading || hasLoadError || isSavingRef.current || validation.hasErrors) {
      return
    }

    isSavingRef.current = true
    setSaveStatus("saving")

    try {
      await Promise.all([
        optionsServices.settingsRepository.saveAppSettings(appSettings),
        optionsServices.settingsRepository.saveProviders(providers)
      ])

      setSaveStatus("saved")
    } catch {
      setSaveStatus("error")
    } finally {
      isSavingRef.current = false
    }
  }, [appSettings, hasLoadError, isLoading, optionsServices, providers, validation.hasErrors])

  React.useEffect(() => {
    let isMounted = true

    void (async () => {
      try {
        const [storedAppSettings, storedProviders] = await Promise.all([
          optionsServices.settingsRepository.getAppSettings(),
          optionsServices.settingsRepository.getProviders()
        ])

        if (!isMounted) {
          return
        }

        setAppSettings(storedAppSettings)
        setProviders(buildProviderFormState(storedProviders))
        setHasLoadError(false)
      } catch {
        if (isMounted) {
          setHasLoadError(true)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [optionsServices])

  return (
    <main>
      <h1>TabVault Settings</h1>

      <section>
        <h2>App settings</h2>

        <div>
          <label htmlFor="default-provider">Default provider</label>
          <select
            id="default-provider"
            onChange={(event) =>
              setAppSettings((currentSettings) => ({
                ...currentSettings,
                defaultProvider: event.target.value as typeof currentSettings.defaultProvider
              }))
            }
            value={appSettings.defaultProvider}>
            <option value="openai">OpenAI-compatible</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
          {validation.defaultProvider ? <p>{validation.defaultProvider}</p> : null}
        </div>

        <label>
          <input
            checked={appSettings.autoAnalyzeOnSave}
            onChange={(event) =>
              setAppSettings((currentSettings) => ({
                ...currentSettings,
                autoAnalyzeOnSave: event.target.checked
              }))
            }
            type="checkbox"
          />
          Auto analyze on save
        </label>
      </section>

      {providers.map((provider, index) => (
        <ProviderSettingsForm
          key={provider.provider}
          onChange={(nextValue) => {
            setProviders((currentProviders) =>
              currentProviders.map((currentProvider, currentIndex) =>
                currentIndex === index ? nextValue : currentProvider
              )
            )
          }}
          fieldErrors={validation.providers[provider.provider]}
          value={provider}
        />
      ))}

      <div>
        <button
          disabled={isLoading || hasLoadError || saveStatus === "saving" || validation.hasErrors}
          onClick={() => void handleSave()}
          type="button">
          Save settings
        </button>
        <p aria-live="polite" data-testid="save-status" role="status">
          {getSaveStatusMessage(saveStatus, isLoading, hasLoadError)}
        </p>
      </div>
    </main>
  )
}

function getSaveStatusMessage(saveStatus: SaveStatus, isLoading: boolean, hasLoadError: boolean): string {
  if (isLoading) {
    return "Loading settings..."
  }

  if (hasLoadError) {
    return "Failed to load settings"
  }

  switch (saveStatus) {
    case "saving":
      return "Saving..."
    case "saved":
      return "Saved settings"
    case "error":
      return "Failed to save settings"
    default:
      return "Status: Not saved yet"
  }
}

export default Options
