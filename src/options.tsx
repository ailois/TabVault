import React from "react"

import ProviderSettingsForm from "./components/provider-settings-form"
import { ToggleSwitch } from "./components/toggle-switch"
import { LicenseActivation } from "./components/license-activation"
import { TrialBanner } from "./components/trial-banner"
import { DEFAULT_APP_SETTINGS } from "./features/settings/default-settings"
import { buildProviderFormState } from "./features/settings/provider-form-state"
import { validateSettingsForm } from "./features/settings/settings-validation"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { validateLicenseKey } from "./lib/trial/license-service"
import { TrialRepository } from "./lib/trial/trial-repository"
import { TRIAL_ANALYSIS_LIMIT, TRIAL_DAYS } from "./lib/trial/trial-constants"
import { useTrialStatus } from "./lib/trial/use-trial-status"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import type { ProviderConfig, ProviderType } from "./types/settings"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import { radius, spacing } from "./ui/design-tokens"
import { useTheme } from "./ui/use-theme"
import { useGlobalStyles } from "./ui/use-global-styles"
import { ThemeProvider } from "./ui/theme-context"

type OptionsProps = {
  services?: Partial<OptionsServices>
}

type OptionsServices = {
  settingsRepository: SettingsRepository
  bookmarkRepository: BookmarkRepository
  testConnection: (config: ProviderConfig) => Promise<void>
  themeRepository: ThemeRepository
}

type SaveStatus = "idle" | "saving" | "saved" | "error"

type LicenseEntryStateProps = {
  status: "trial" | "expired" | "licensed"
  installedAt?: string
  analysisUsed?: number
  storedLicenseKey?: string
  licenseInput: string
  isActivationExpanded: boolean
  isSubmittingLicense: boolean
  licenseError: string | null
  onExpandActivation: () => void
  onLicenseInputChange: (value: string) => void
  onLicenseSubmit: () => Promise<void>
  onLicenseEdit: () => void
}

const DEFAULT_OPTIONS_SERVICES: OptionsServices = {
  settingsRepository: new ChromeSettingsRepository(),
  bookmarkRepository: new IndexedDbBookmarkRepository(),
  testConnection: async (config: ProviderConfig) => {
    await defaultCreateProvider(config).analyze({
      title: "test",
      url: "https://test",
      content: "Say OK"
    })
  },
  themeRepository: new ChromeThemeRepository()
}

export function applySingleProviderEnabledState(
  providers: ReturnType<typeof buildProviderFormState>,
  defaultProvider: ProviderType
): ReturnType<typeof buildProviderFormState> {
  return providers.map((provider) => ({
    ...provider,
    enabled: provider.provider === defaultProvider
  }))
}

function Options({ services }: OptionsProps) {
  const optionsServices = React.useMemo(() => ({ ...DEFAULT_OPTIONS_SERVICES, ...services }), [services])
  const theme = useTheme(optionsServices.themeRepository)
  useGlobalStyles(theme)
  const trial = useTrialStatus()
  const trialRepository = React.useMemo(() => new TrialRepository(), [])
  const [appSettings, setAppSettings] = React.useState(DEFAULT_APP_SETTINGS)
  const [providers, setProviders] = React.useState(() => buildProviderFormState([]))
  const [providerEditorSelection, setProviderEditorSelection] = React.useState<ProviderType>(DEFAULT_APP_SETTINGS.defaultProvider)
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle")
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasLoadError, setHasLoadError] = React.useState(false)
  const [isActivationExpanded, setIsActivationExpanded] = React.useState(false)
  const [licenseInput, setLicenseInput] = React.useState("")
  const [licenseError, setLicenseError] = React.useState<string | null>(null)
  const [isSubmittingLicense, setIsSubmittingLicense] = React.useState(false)
  const [optimisticLicensedKey, setOptimisticLicensedKey] = React.useState<string | null>(null)
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
      const providersToSave = applySingleProviderEnabledState(
        providers,
        appSettings.defaultProvider
      )
      await Promise.all([
        optionsServices.settingsRepository.saveAppSettings(appSettings),
        optionsServices.settingsRepository.saveProviders(providersToSave)
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
        setProviders(applySingleProviderEnabledState(buildProviderFormState(storedProviders), storedAppSettings.defaultProvider))
        setProviderEditorSelection(storedAppSettings.defaultProvider)
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
    if (trial.status === "licensed") {
      setIsActivationExpanded(false)
      setLicenseError(null)
      setOptimisticLicensedKey(null)
    }
  }, [trial.status])

  React.useEffect(() => {
    if (trial.status === "licensed" && trial.state?.licenseKey) {
      setLicenseInput(trial.state.licenseKey)
    }
  }, [trial.state?.licenseKey, trial.status])

  const handleLicenseSubmit = React.useCallback(async () => {
    setLicenseError(null)
    setIsSubmittingLicense(true)

    try {
      const result = await validateLicenseKey(licenseInput)

      if (result === "invalid") {
        setLicenseError("This license key is invalid.")
        return
      }

      if (result === "unvalidated") {
        setLicenseError("Could not validate right now. Try again shortly.")
        return
      }

      const existingState = (await trialRepository.get()) ?? {
        installedAt: new Date().toISOString(),
        analysisUsed: 0
      }

      await trialRepository.save({
        ...existingState,
        licenseKey: licenseInput,
        licenseStatus: "valid",
        licenseValidatedAt: new Date().toISOString()
      })

      setOptimisticLicensedKey(licenseInput)
      await trial.reload()
      setIsActivationExpanded(false)
    } catch {
      setLicenseError("Failed to save license state.")
    } finally {
      setIsSubmittingLicense(false)
    }
  }, [licenseInput, trial, trialRepository])

  return (
    <ThemeProvider theme={theme}>
      <main
        data-testid="options-dashboard-shell"
        style={{
          display: "grid",
          gridTemplateColumns: "248px minmax(0, 1fr)",
          backgroundColor: theme.page,
          boxSizing: "border-box",
          minHeight: "100vh",
          minWidth: 0
        }}
      >
        <aside
          data-testid="options-sidebar"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing.md,
            padding: `${spacing.lg} ${spacing.md}`,
            borderRight: `1px solid ${theme.border}`,
            backgroundColor: theme.isDark ? theme.page : theme.surface,
            minWidth: 0
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: spacing.sm,
              paddingBottom: spacing.md,
              borderBottom: `1px solid ${theme.border}`
            }}
          >
            <div style={{ display: "grid", gap: "6px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                <div
                  aria-hidden="true"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: "30px",
                    height: "30px",
                    borderRadius: "10px",
                    backgroundColor: theme.accent,
                    color: "#ffffff",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  ✦
                </div>
                <span style={{ fontSize: "1.125rem", fontWeight: 800, color: theme.textPrimary }}>
                  TabVault
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: theme.textMuted, lineHeight: 1.5 }}>
                Local-first bookmark workspace
              </p>
            </div>

            <button
              aria-label={theme.isDark ? "Switch to light mode" : "Switch to dark mode"}
              data-testid="theme-toggle-button"
              onClick={() => theme.toggle()}
              style={{
                display: "grid",
                placeItems: "center",
                width: "32px",
                height: "32px",
                backgroundColor: theme.surfaceElevated,
                border: `1px solid ${theme.border}`,
                borderRadius: radius.medium,
                cursor: "pointer",
                fontSize: "1rem",
                color: theme.textMuted,
                lineHeight: 1,
                flexShrink: 0
              }}
              type="button"
            >
              {theme.isDark ? "☀️" : "🌙"}
            </button>
          </div>

          <nav style={{ display: "grid", gap: spacing.xs }}>
            <button
              aria-pressed={true}
              data-testid="options-nav-settings"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: `${spacing.sm} ${spacing.md}`,
                border: `1px solid ${theme.borderFocus}`,
                borderRadius: "12px",
                backgroundColor: theme.accentSoft,
                color: theme.textPrimary,
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "default",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease"
              }}
              type="button"
            >
              <span>Settings</span>
              <span aria-hidden="true" style={{ color: theme.accent, fontSize: "0.75rem" }}>
                ●
              </span>
            </button>
          </nav>
        </aside>

        <div
          data-testid="options-main-content"
          style={{
            padding: `${spacing.xl} ${spacing.xl} 80px`,
            backgroundColor: theme.page,
            boxSizing: "border-box",
            minWidth: 0
          }}
        >
          <div data-testid="settings-page-shell" style={{ width: "100%", minWidth: 0, display: "grid", gap: spacing.lg }}>
              <header data-testid="settings-page-header" style={{ display: "grid", gap: "4px" }}>
                <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: theme.textPrimary }}>Architecture Settings</h1>
                <p data-testid="settings-page-description" style={{ margin: 0, color: theme.textMuted, fontSize: "0.875rem" }}>
                  Configure provider protocols, retrieval architecture, experience behavior, and licensing.
                </p>
              </header>

              <SettingsTabContent
                appSettings={appSettings}
                handleSave={handleSave}
                hasLoadError={hasLoadError}
                isLoading={isLoading}
                optionsServices={optionsServices}
                providers={providers}
                providerEditorSelection={providerEditorSelection}
                saveStatus={saveStatus}
                setAppSettings={setAppSettings}
                setProviders={setProviders}
                setProviderEditorSelection={setProviderEditorSelection}
                theme={theme}
                validation={validation}
                buildProviderConfig={buildProviderConfig}
                trialStateProps={trial.status ? {
                  analysisUsed: trial.state?.analysisUsed,
                  installedAt: trial.state?.installedAt,
                  isActivationExpanded,
                  isSubmittingLicense,
                  licenseError,
                  licenseInput,
                  onExpandActivation: () => setIsActivationExpanded(true),
                  onLicenseEdit: () => {
                    setLicenseError(null)
                    setIsActivationExpanded(true)
                    setOptimisticLicensedKey(null)
                    setLicenseInput(trial.state?.licenseKey ?? licenseInput)
                  },
                  onLicenseInputChange: setLicenseInput,
                  onLicenseSubmit: handleLicenseSubmit,
                  storedLicenseKey: optimisticLicensedKey ?? trial.state?.licenseKey,
                  status: optimisticLicensedKey ? "licensed" : trial.status
                } : null}
              />
            </div>
        </div>
      </main>
    </ThemeProvider>
  )
}

function getTrialBannerDetail(installedAt: string | undefined, analysisUsed: number | undefined): string | undefined {
  if (!installedAt || typeof analysisUsed !== "number") {
    return undefined
  }

  const installedAtTime = new Date(installedAt).getTime()

  if (Number.isNaN(installedAtTime)) {
    return undefined
  }

  const daysLeft = Math.max(0, Math.ceil((TRIAL_DAYS - (Date.now() - installedAtTime)) / (24 * 60 * 60 * 1000)))
  const analysesLeft = Math.max(0, TRIAL_ANALYSIS_LIMIT - analysisUsed)

  return `${daysLeft} days left · ${analysesLeft} analyses remaining`
}

function OptionsLicenseEntry({
  status,
  installedAt,
  analysisUsed,
  storedLicenseKey,
  licenseInput,
  isActivationExpanded,
  isSubmittingLicense,
  licenseError,
  onExpandActivation,
  onLicenseInputChange,
  onLicenseSubmit,
  onLicenseEdit
}: LicenseEntryStateProps) {
  const detail = getTrialBannerDetail(installedAt, analysisUsed)
  const shouldShowActivationForm = status !== "licensed" && isActivationExpanded

  return (
    <div data-testid="settings-license-state" style={{ display: "grid", gap: spacing.md }}>
      {status === "trial" ? (
        <TrialBanner
          ctaLabel="Activate now"
          detail={detail}
          message="Try TabVault free for 3 days."
          onCtaClick={onExpandActivation}
          status="trial"
        />
      ) : null}

      {status === "expired" ? (
        <TrialBanner
          ctaLabel="Unlock TabVault"
          detail="Your saved analysis stays available."
          message="New AI analysis is locked until you activate TabVault."
          onCtaClick={onExpandActivation}
          status="expired"
        />
      ) : null}

      {shouldShowActivationForm ? (
        <LicenseActivation
          errorMessage={licenseError}
          isLicensed={false}
          isSubmitting={isSubmittingLicense}
          licenseKey={licenseInput}
          onLicenseKeyChange={onLicenseInputChange}
          onSubmit={onLicenseSubmit}
        />
      ) : null}

      {status === "licensed" ? (
        <LicenseActivation
          errorMessage={null}
          isLicensed={true}
          licenseKey={storedLicenseKey ?? ""}
          onEdit={onLicenseEdit}
          onLicenseKeyChange={onLicenseInputChange}
          onSubmit={onLicenseSubmit}
        />
      ) : null}
    </div>
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
      return "Ready"
  }
}

type SettingsTabContentProps = {
  appSettings: typeof DEFAULT_APP_SETTINGS
  handleSave: () => Promise<void>
  hasLoadError: boolean
  isLoading: boolean
  optionsServices: OptionsServices
  providers: ReturnType<typeof buildProviderFormState>
  providerEditorSelection: ProviderType
  saveStatus: SaveStatus
  setAppSettings: React.Dispatch<React.SetStateAction<typeof DEFAULT_APP_SETTINGS>>
  setProviders: React.Dispatch<React.SetStateAction<ReturnType<typeof buildProviderFormState>>>
  setProviderEditorSelection: React.Dispatch<React.SetStateAction<ProviderType>>
  theme: ReturnType<typeof useTheme>
  validation: ReturnType<typeof validateSettingsForm>
  buildProviderConfig: (formState: ReturnType<typeof buildProviderFormState>[0]) => ProviderConfig
  trialStateProps: LicenseEntryStateProps | null
}

function SettingsTabContent({
  appSettings, handleSave, hasLoadError, isLoading, optionsServices,
  providers, providerEditorSelection, saveStatus, setAppSettings, setProviders,
  setProviderEditorSelection, theme, validation, buildProviderConfig, trialStateProps
}: SettingsTabContentProps) {
  async function handleClearAll() {
    if (!window.confirm("Clear all analysis results? This cannot be undone.")) return
    await optionsServices.bookmarkRepository.clearAllAnalysis()
  }

  async function handleClearErrors() {
    if (!window.confirm("Clear all failed analysis results? This cannot be undone.")) return
    await optionsServices.bookmarkRepository.clearErrorAnalysis()
  }

  const providerLabels: Record<ProviderType, string> = {
    openai: "OpenAI-compatible",
    claude: "Claude",
    gemini: "Gemini"
  }

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: "16px",
    overflow: "hidden",
    backgroundColor: theme.surface,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
  }

  const cardHeaderStyle: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.md}`,
    borderBottom: `1px solid ${theme.borderMuted}`,
    backgroundColor: theme.surfaceElevated
  }

  const selectStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${theme.border}`,
    borderRadius: radius.medium,
    backgroundColor: theme.surfaceSubtle,
    color: theme.textPrimary,
    fontSize: "0.875rem"
  }

  const toggleRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: radius.medium,
    backgroundColor: theme.surfaceSubtle
  }

  return (
    <>
      <div
        data-testid="settings-workspace"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 380px) minmax(0, 1fr)",
          gap: spacing.lg,
          alignItems: "start"
        }}
      >
        <div style={{ display: "grid", gap: spacing.lg }}>
          <section data-testid="settings-section-card" style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary }}>Provider & Protocol</h2>
            </div>
            <div style={{ padding: "20px", display: "grid", gap: spacing.md }}>
              <div style={{ display: "grid", gap: spacing.sm }}>
                <label htmlFor="default-provider" style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textSecondary }}>
                  Default provider
                </label>
                <select
                  aria-describedby={validation.defaultProvider ? "default-provider-error" : undefined}
                  aria-invalid={validation.defaultProvider ? true : undefined}
                  id="default-provider"
                  onChange={(event) => {
                    const newProvider = event.target.value as typeof appSettings.defaultProvider
                    setAppSettings((currentSettings) => ({
                      ...currentSettings,
                      defaultProvider: newProvider
                    }))
                    setProviders((currentProviders) => applySingleProviderEnabledState(currentProviders, newProvider))
                    setProviderEditorSelection(newProvider)
                  }}
                  style={selectStyle}
                  value={appSettings.defaultProvider}
                >
                  <option value="openai">OpenAI-compatible</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                </select>
                {validation.defaultProvider ? (
                  <p aria-live="polite" id="default-provider-error" role="alert" style={{ margin: 0, fontSize: "0.8125rem", color: theme.textDanger }}>
                    {validation.defaultProvider}
                  </p>
                ) : null}
              </div>

              <div style={{ display: "grid", gap: spacing.sm }}>
                <label htmlFor="summary-language" style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textSecondary }}>
                  Summary language
                </label>
                <select
                  id="summary-language"
                  onChange={(event) =>
                    setAppSettings((currentSettings) => ({
                      ...currentSettings,
                      summaryLanguage: event.target.value as typeof currentSettings.summaryLanguage
                    }))
                  }
                  style={selectStyle}
                  value={appSettings.summaryLanguage ?? "auto"}
                >
                  <option value="auto">Auto (follow content)</option>
                  <option value="zh">Chinese</option>
                  <option value="en">English</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="es">Spanish</option>
                </select>
              </div>

              <div style={toggleRowStyle}>
                <span style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textPrimary }}>Auto analyze on save</span>
                <ToggleSwitch
                  checked={appSettings.autoAnalyzeOnSave}
                  label="Auto analyze on save"
                  onChange={(next) =>
                    setAppSettings((currentSettings) => ({
                      ...currentSettings,
                      autoAnalyzeOnSave: next
                    }))
                  }
                />
              </div>

              <div style={toggleRowStyle}>
                <span style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textPrimary }}>Auto retry failed analysis</span>
                <ToggleSwitch
                  checked={appSettings.autoRetryOnError}
                  label="Auto retry failed analysis"
                  onChange={(next) =>
                    setAppSettings((currentSettings) => ({
                      ...currentSettings,
                      autoRetryOnError: next
                    }))
                  }
                />
              </div>
            </div>
          </section>

          <section data-testid="settings-section-card" style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary }}>Retrieval Architecture</h2>
            </div>
            <div style={{ padding: "20px", display: "grid", gap: spacing.md }}>
              <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.6, color: theme.textMuted }}>
                Configure how local retrieval works across saved bookmarks and current-page context.
              </p>
              <div style={toggleRowStyle}>
                <span style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textPrimary }}>Auto retry failed analysis</span>
                <ToggleSwitch
                  checked={appSettings.autoRetryOnError}
                  label="Auto retry failed analysis"
                  onChange={(next) =>
                    setAppSettings((currentSettings) => ({
                      ...currentSettings,
                      autoRetryOnError: next
                    }))
                  }
                />
              </div>
              <div style={{ padding: `${spacing.sm} ${spacing.md}`, borderRadius: radius.medium, backgroundColor: theme.surfaceSubtle, color: theme.textMuted, fontSize: "0.8125rem", lineHeight: 1.6 }}>
                Planned controls for reranking and architecture routing are not wired yet.
              </div>
              <div
                data-testid="provider-rail"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: spacing.sm
                }}
              >
                {providers.map((provider) => {
                  const isActive = providerEditorSelection === provider.provider
                  const isDefault = appSettings.defaultProvider === provider.provider

                  return (
                    <button
                      key={provider.provider}
                      aria-pressed={isActive}
                      data-testid={`provider-rail-${provider.provider}`}
                      onClick={() => setProviderEditorSelection(provider.provider)}
                      style={{
                        display: "grid",
                        gap: "4px",
                        textAlign: "left",
                        padding: `${spacing.md} ${spacing.md}`,
                        border: `1px solid ${isActive ? theme.borderFocus : theme.border}`,
                        borderRadius: "14px",
                        backgroundColor: isActive ? theme.accentSoft : theme.surface,
                        color: theme.textPrimary,
                        cursor: "pointer",
                        minWidth: 0
                      }}
                      type="button"
                    >
                      <span style={{ fontSize: "0.875rem", fontWeight: isActive ? 700 : 600, color: theme.textPrimary }}>
                        {providerLabels[provider.provider]}
                      </span>
                      {isDefault ? (
                        <span style={{ fontSize: "0.75rem", color: isActive ? theme.accent : theme.textMuted }}>
                          Default provider
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
                <button
                  data-testid="clear-all-analysis-btn"
                  onClick={() => void handleClearAll()}
                  style={{ padding: `${spacing.xs} ${spacing.md}`, border: `1px solid ${theme.borderMuted}`, borderRadius: radius.medium, backgroundColor: "transparent", color: theme.textDanger, fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}
                  type="button"
                >
                  Clear all analysis
                </button>
                <button
                  data-testid="clear-error-analysis-btn"
                  onClick={() => void handleClearErrors()}
                  style={{ padding: `${spacing.xs} ${spacing.md}`, border: `1px solid ${theme.borderMuted}`, borderRadius: radius.medium, backgroundColor: "transparent", color: theme.textDanger, fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}
                  type="button"
                >
                  Clear failed analysis
                </button>
              </div>
            </div>
          </section>

          <section data-testid="settings-section-card" style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary }}>Experience & Theme</h2>
            </div>
            <div style={{ padding: "20px", display: "grid", gap: spacing.md }}>
              <div style={{ display: "grid", gap: spacing.sm }}>
                <label htmlFor="summary-language" style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textSecondary }}>
                  Summary language
                </label>
                <select
                  id="summary-language"
                  onChange={(event) =>
                    setAppSettings((currentSettings) => ({
                      ...currentSettings,
                      summaryLanguage: event.target.value as typeof currentSettings.summaryLanguage
                    }))
                  }
                  style={selectStyle}
                  value={appSettings.summaryLanguage ?? "auto"}
                >
                  <option value="auto">Auto (follow content)</option>
                  <option value="zh">Chinese</option>
                  <option value="en">English</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="es">Spanish</option>
                </select>
              </div>

              <div style={toggleRowStyle}>
                <span style={{ fontWeight: 500, fontSize: "0.875rem", color: theme.textPrimary }}>Auto analyze on save</span>
                <ToggleSwitch
                  checked={appSettings.autoAnalyzeOnSave}
                  label="Auto analyze on save"
                  onChange={(next) =>
                    setAppSettings((currentSettings) => ({
                      ...currentSettings,
                      autoAnalyzeOnSave: next
                    }))
                  }
                />
              </div>
            </div>
          </section>

          <section data-testid="settings-section-card" style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary }}>Trial & License</h2>
            </div>
            <div style={{ padding: "20px" }}>
              {trialStateProps ? <OptionsLicenseEntry {...trialStateProps} /> : null}
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: spacing.md, minWidth: 0 }}>
          {providers
            .map((provider, originalIndex) => ({ provider, originalIndex }))
            .filter(({ provider }) => provider.provider === providerEditorSelection)
            .map(({ provider, originalIndex }) => {
              const isDefault = provider.provider === appSettings.defaultProvider

              return (
                <div
                  data-testid="settings-section-card"
                  key={provider.provider}
                  style={{
                    border: `1px solid ${theme.border}`,
                    borderRadius: "16px",
                    overflow: "hidden",
                    backgroundColor: theme.surface,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    position: "relative"
                  }}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: theme.accent, borderRadius: "16px 0 0 16px" }} />
                  <div style={{ padding: `${spacing.sm} ${spacing.md}`, paddingLeft: "20px", borderBottom: `1px solid ${theme.borderMuted}`, backgroundColor: theme.surfaceElevated, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary }}>
                      {providerLabels[provider.provider]}
                    </span>
                    {isDefault ? (
                      <span style={{ fontSize: "0.625rem", fontWeight: 800, backgroundColor: theme.accentSoft, color: theme.accent, border: `1px solid ${theme.border}`, padding: "2px 8px", borderRadius: "9999px" }}>
                        DEFAULT
                      </span>
                    ) : null}
                  </div>
                  <div style={{ padding: "20px" }}>
                    <ProviderSettingsForm
                      onChange={(nextValue) => {
                        setProviders((currentProviders) =>
                          currentProviders.map((currentProvider, currentIndex) =>
                            currentIndex === originalIndex ? nextValue : currentProvider
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
                </div>
              )
            })}
        </div>
      </div>

      <section
        data-testid="settings-save-actions"
        style={{
          position: "sticky",
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
          marginTop: spacing.lg,
          padding: `${spacing.md} ${spacing.lg}`,
          borderTop: `1px solid ${theme.borderMuted}`,
          backgroundColor: theme.page,
          boxShadow: theme.shadow
        }}
      >
        <div style={{ display: "grid", gap: "4px" }}>
          <h2 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: theme.textPrimary }}>Save settings</h2>
          <p aria-live="polite" data-testid="save-status" role="status" style={{ margin: 0, fontSize: "0.8125rem", color: theme.textMuted }}>
            {getSaveStatusMessage(saveStatus, isLoading, hasLoadError)}
          </p>
        </div>

        <button
          disabled={isLoading || hasLoadError || saveStatus === "saving" || validation.hasErrors}
          onClick={() => void handleSave()}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            border: "none",
            borderRadius: radius.medium,
            backgroundColor: theme.isDark ? theme.textPrimary : "#18181B",
            color: theme.isDark ? theme.page : "#ffffff",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow: theme.isDark ? "0 4px 12px rgba(0,0,0,0.32)" : "0 4px 12px rgba(15,23,42,0.14)"
          }}
          type="button"
        >
          Save settings
        </button>
      </section>
    </>
  )
}

export default Options
