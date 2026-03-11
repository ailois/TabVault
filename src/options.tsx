import React from "react"

import ProviderSettingsForm from "./components/provider-settings-form"
import { DEFAULT_APP_SETTINGS } from "./features/settings/default-settings"
import { buildProviderFormState } from "./features/settings/provider-form-state"
import { validateSettingsForm } from "./features/settings/settings-validation"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { createProvider } from "./lib/providers/provider-factory"
import type { ProviderConfig } from "./types/settings"
import { colors, controls, GLOBAL_FOCUS_STYLES, radius, shadow, spacing } from "./ui/design-tokens"

type OptionsProps = {
  services?: Partial<OptionsServices>
}

type OptionsServices = {
  settingsRepository: SettingsRepository
  testConnection: (config: ProviderConfig) => Promise<void>
}

type SaveStatus = "idle" | "saving" | "saved" | "error"

const DEFAULT_OPTIONS_SERVICES: OptionsServices = {
  settingsRepository: new ChromeSettingsRepository(),
  testConnection: async (config: ProviderConfig) => {
    await createProvider(config).analyze({
      title: "test",
      url: "https://test",
      content: "Say OK"
    })
  }
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

  function buildProviderConfig(formState: typeof providers[0]): ProviderConfig {
    return {
      provider: formState.provider,
      apiKey: formState.apiKey,
      model: formState.model,
      baseUrl: formState.baseUrl,
      enabled: formState.enabled
    }
  }

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

  React.useEffect(() => {
    const style = document.createElement("style")
    style.textContent = GLOBAL_FOCUS_STYLES
    document.head.appendChild(style)

    return () => {
      style.remove()
    }
  }, [])

  return (
    <main style={pageStyle}>
      <div data-testid="settings-page-shell" style={pageShellStyle}>
        <header data-testid="settings-page-header" style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>TabVault Settings</h1>
          <p data-testid="settings-page-description" style={pageDescriptionStyle}>
            Configure providers and analysis behavior.
          </p>
        </header>

        <div style={pageSectionsStyle}>
          <section data-testid="settings-section-card" style={sectionCardStyle}>
            <h2 style={sectionHeadingStyle}>App Settings</h2>

            <div style={appFieldStackStyle}>
              <label htmlFor="default-provider" style={fieldLabelStyle}>
                Default provider
              </label>
              <select
                aria-describedby={validation.defaultProvider ? "default-provider-error" : undefined}
                aria-invalid={validation.defaultProvider ? true : undefined}
                id="default-provider"
                onChange={(event) =>
                  setAppSettings((currentSettings) => ({
                    ...currentSettings,
                    defaultProvider: event.target.value as typeof currentSettings.defaultProvider
                  }))
                }
                style={selectStyle}
                value={appSettings.defaultProvider}>
                <option value="openai">OpenAI-compatible</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                </select>
              {validation.defaultProvider ? (
                <p aria-live="polite" id="default-provider-error" role="alert" style={appErrorStyle}>
                  {validation.defaultProvider}
                </p>
              ) : null}
            </div>

            <div style={enabledRowContainerStyle}>
              <label style={enabledRowLabelStyle}>
                <span>Auto analyze on save</span>
                <input
                  checked={appSettings.autoAnalyzeOnSave}
                  onChange={(event) =>
                    setAppSettings((currentSettings) => ({
                      ...currentSettings,
                      autoAnalyzeOnSave: event.target.checked
                    }))
                  }
                  style={checkboxStyle}
                  type="checkbox"
                />
              </label>
            </div>
          </section>

          {providers.map((provider, index) => (
            <div data-testid="settings-section-card" key={provider.provider} style={sectionCardStyle}>
              <ProviderSettingsForm
                onChange={(nextValue) => {
                  setProviders((currentProviders) =>
                    currentProviders.map((currentProvider, currentIndex) =>
                      currentIndex === index ? nextValue : currentProvider
                    )
                  )
                }}
                fieldErrors={validation.providers[provider.provider]}
                onTestConnection={async (formValue) => {
                  try {
                    await optionsServices.testConnection(buildProviderConfig(formValue))
                    return "ok"
                  } catch (error) {
                    return error instanceof Error ? error.message : "Connection failed"
                  }
                }}
                value={provider}
              />
            </div>
          ))}
        </div>

        <section data-testid="settings-save-actions" style={saveActionsSectionStyle}>
          <div style={saveActionsCopyStyle}>
            <h2 style={saveActionsTitleStyle}>Save settings</h2>
            <p aria-live="polite" data-testid="save-status" role="status" style={saveStatusStyle}>
              {getSaveStatusMessage(saveStatus, isLoading, hasLoadError)}
            </p>
          </div>

          <button
            disabled={isLoading || hasLoadError || saveStatus === "saving" || validation.hasErrors}
            onClick={() => void handleSave()}
            style={saveButtonStyle}
            type="button">
            Save settings
          </button>
        </section>
      </div>
    </main>
  )
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: `${spacing.xl} ${spacing.md} 80px`,
  backgroundColor: colors.page,
  boxSizing: "border-box",
  minHeight: "100vh"
}

const pageShellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "640px",
  display: "grid",
  gap: spacing.lg
}

const pageHeaderStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.xs
}

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
  fontWeight: 700,
  color: colors.textPrimary
}

const pageDescriptionStyle: React.CSSProperties = {
  margin: 0,
  color: colors.textMuted,
  fontSize: "0.875rem"
}

const pageSectionsStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.lg
}

const sectionCardStyle: React.CSSProperties = {
  padding: `0 0 ${spacing.lg} 0`,
  borderBottom: `1px solid ${colors.borderMuted}`
}

const sectionHeadingStyle: React.CSSProperties = {
  margin: `0 0 ${spacing.md} 0`,
  fontSize: "1rem",
  fontWeight: 600,
  color: colors.textPrimary
}

const appFieldStackStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  marginBottom: spacing.md
}

const fieldLabelStyle: React.CSSProperties = {
  fontWeight: 500,
  fontSize: "0.875rem",
  color: colors.textSecondary
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: `${spacing.sm} ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.input.background,
  color: colors.textPrimary,
  fontSize: "0.875rem",
  transition: "background-color 0.15s ease"
}

const appErrorStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  color: colors.textDanger
}

const enabledRowContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
}

const enabledRowLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.md,
  fontWeight: 500,
  fontSize: "0.875rem",
  color: colors.textPrimary
}

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  accentColor: controls.primary.background
}

const saveActionsSectionStyle: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.md,
  padding: `${spacing.md} ${spacing.lg}`,
  borderTop: `1px solid ${colors.borderMuted}`,
  backgroundColor: colors.page,
  boxShadow: shadow.soft
}

const saveActionsCopyStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px"
}

const saveActionsTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  fontWeight: 600,
  color: colors.textPrimary
}

const saveStatusStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  color: colors.textMuted
}

const saveButtonStyle: React.CSSProperties = {
  padding: `${spacing.sm} ${spacing.lg}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.primary.background,
  color: controls.primary.foreground,
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "background-color 0.15s ease"
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
      return "Ready"
  }
}

export default Options
