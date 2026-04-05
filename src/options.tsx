
import "./styles/globals.css"
import React from "react"

import KnowledgeSettingsPanel from "./components/knowledge-settings-panel"
import ProviderSettingsForm from "./components/provider-settings-form"
import { ToggleSwitch } from "./components/toggle-switch"
import { LicenseActivation } from "./components/license-activation"
import { TrialBanner } from "./components/trial-banner"
import { DEFAULT_APP_SETTINGS } from "./features/settings/default-settings"
import { buildProviderFormState } from "./features/settings/provider-form-state"
import { validateSettingsForm } from "./features/settings/settings-validation"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { getLocalizedErrorMessage } from "./lib/i18n/error-messages"
import { getMessage } from "./lib/i18n/messages"
import { getProviderPresentation } from "./lib/i18n/provider-metadata"
import { testOpenAiCompatibleConnection } from "./lib/providers/openai-compatible-provider"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import { validateLicenseKey } from "./lib/trial/license-service"
import { TRIAL_ANALYSIS_LIMIT, TRIAL_DAYS } from "./lib/trial/trial-constants"
import { TrialRepository } from "./lib/trial/trial-repository"
import { useTrialStatus } from "./lib/trial/use-trial-status"
import type { DisplayLanguage, ProviderConfig, ProviderType, ThemeName } from "./types/settings"
import { spacing } from "./ui/design-tokens"
import { ThemeProvider } from "./ui/theme-context"
import { useGlobalStyles } from "./ui/use-global-styles"
import { useTheme } from "./ui/use-theme"

const SHOW_TRIAL_PROMOTION_UI = false

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
type OptionsPage = "settings" | "knowledge"

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

type ProviderCardDefinition = {
  id: ProviderType
  dataTestId: string
  icon: string
  accent: string
}

type ThemeCardDefinition = {
  theme: ThemeName
  chipColor: string
  dark?: boolean
  emoji?: string
}

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1"

const DEFAULT_OPTIONS_SERVICES: OptionsServices = {
  settingsRepository: new ChromeSettingsRepository(),
  bookmarkRepository: new IndexedDbBookmarkRepository(),
  testConnection: async (config: ProviderConfig) => {
    if (config.provider === "openai" || config.provider === "openai-response") {
      await testOpenAiCompatibleConnection({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl ?? OPENAI_DEFAULT_BASE_URL,
        model: config.model
      })
      return
    }

    await defaultCreateProvider(config).analyze({
      title: "test",
      url: "https://test",
      content: "Say OK"
    })
  },
  themeRepository: new ChromeThemeRepository()
}

const PROVIDER_CARDS: ProviderCardDefinition[] = [
  { id: "openai", dataTestId: "provider-rail-openai", icon: "O", accent: "#6B8E73" },
  { id: "openai-response", dataTestId: "provider-rail-openai-response", icon: "R", accent: "#6B8E73" },
  { id: "claude", dataTestId: "provider-rail-claude", icon: "C", accent: "#C08457" },
  { id: "gemini", dataTestId: "provider-rail-gemini", icon: "G", accent: "#5B7C99" }
]

const THEME_CARDS: ThemeCardDefinition[] = [
  { theme: "sage", chipColor: "#6B8E73" },
  { theme: "breeze", chipColor: "#5B7C99" },
  { theme: "vanilla", chipColor: "#D4A373" },
  { theme: "cloud", chipColor: "#FAFAFA" },
  { theme: "obsidian", chipColor: "#121214", dark: true },
  { theme: "taro", chipColor: "#9D8CBA" },
  { theme: "custom", chipColor: "#9D8CBA", emoji: "C" }
]

const CUSTOM_THEME_PRESETS = ["#9D8CBA", "#6B8E73", "#5B7C99", "#D4A373", "#E07B54", "#C2587B", "#4A90B8", "#7B9E6B"]

const THEME_LABELS: Record<DisplayLanguage, Record<ThemeName, string>> = {
  en: { sage: "Sage", breeze: "Breeze", vanilla: "Vanilla", cloud: "Cloud", obsidian: "Obsidian", taro: "Taro", custom: "Custom" },
  zh: { sage: "\u9f20\u5c3e\u8349", breeze: "\u6d77\u98ce\u84dd", vanilla: "\u9999\u8349\u8272", cloud: "\u4e91\u96fe\u767d", obsidian: "\u66dc\u77f3\u9ed1", taro: "\u828b\u7d2b", custom: "\u81ea\u5b9a\u4e49" }
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

function getThemeLabel(language: DisplayLanguage, theme: ThemeName): string {
  return THEME_LABELS[language][theme]
}

function getLicenseActivationCopy(t: (key: Parameters<typeof getMessage>[1]) => string) {
  return {
    headingActivate: t("license.heading.activate"),
    descriptionActivate: t("license.description.activate"),
    headingActivated: t("license.heading.activated"),
    descriptionActivated: t("license.description.activated"),
    fieldLabel: t("license.field.label"),
    activateButton: t("license.button.activate"),
    activatingButton: t("license.button.activating"),
    changeButton: t("license.button.change")
  }
}

function getTrialBannerDetail(
  t: (key: Parameters<typeof getMessage>[1]) => string,
  installedAt: string | undefined,
  analysisUsed: number | undefined
): string | undefined {
  if (!installedAt || typeof analysisUsed !== "number") {
    return undefined
  }

  const installedAtTime = new Date(installedAt).getTime()
  if (Number.isNaN(installedAtTime)) {
    return undefined
  }

  const daysLeft = Math.max(0, Math.ceil((TRIAL_DAYS - (Date.now() - installedAtTime)) / (24 * 60 * 60 * 1000)))
  const analysesLeft = Math.max(0, TRIAL_ANALYSIS_LIMIT - analysisUsed)

  return t("settings.trial.detail.remaining")
    .replace("{days}", String(daysLeft))
    .replace("{analyses}", String(analysesLeft))
}

function getSaveStatusMessage(
  saveStatus: SaveStatus,
  isLoading: boolean,
  hasLoadError: boolean,
  t: (key: Parameters<typeof getMessage>[1]) => string
): string {
  if (isLoading) {
    return t("settings.save.status.loading")
  }
  if (hasLoadError) {
    return t("settings.save.status.loadError")
  }

  switch (saveStatus) {
    case "saving":
      return t("settings.save.status.saving")
    case "saved":
      return t("settings.save.status.saved")
    case "error":
      return t("settings.save.status.saveError")
    default:
      return t("settings.save.status.ready")
  }
}
function Options({ services }: OptionsProps) {
  const optionsServices = React.useMemo(() => ({ ...DEFAULT_OPTIONS_SERVICES, ...services }), [services])
  const theme = useTheme(optionsServices.themeRepository)
  useGlobalStyles(theme)

  const trial = useTrialStatus()
  const trialUiStatus = !SHOW_TRIAL_PROMOTION_UI && trial.status && trial.status !== "licensed" ? "licensed" : trial.status
  const trialRepository = React.useMemo(() => new TrialRepository(), [])
  const [appSettings, setAppSettings] = React.useState(DEFAULT_APP_SETTINGS)
  const [providers, setProviders] = React.useState(() => buildProviderFormState([]))
  const [providerEditorSelection, setProviderEditorSelection] = React.useState<ProviderType>(DEFAULT_APP_SETTINGS.defaultProvider)
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle")
  const [activePage, setActivePage] = React.useState<OptionsPage>("settings")
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasLoadError, setHasLoadError] = React.useState(false)
  const [isActivationExpanded, setIsActivationExpanded] = React.useState(false)
  const [licenseInput, setLicenseInput] = React.useState("")
  const [licenseError, setLicenseError] = React.useState<string | null>(null)
  const [isSubmittingLicense, setIsSubmittingLicense] = React.useState(false)
  const [optimisticLicensedKey, setOptimisticLicensedKey] = React.useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = React.useState(false)
  const [customColorDraft, setCustomColorDraft] = React.useState("#9D8CBA")
  const isSavingRef = React.useRef(false)

  const t = React.useCallback(
    (key: Parameters<typeof getMessage>[1]) => getMessage(appSettings.displayLanguage, key),
    [appSettings.displayLanguage]
  )
  const validation = React.useMemo(
    () => validateSettingsForm(appSettings, providers, appSettings.displayLanguage),
    [appSettings, providers]
  )

  React.useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const [storedAppSettings, storedProviders, storedTheme] = await Promise.all([
          optionsServices.settingsRepository.getAppSettings(),
          optionsServices.settingsRepository.getProviders(),
          optionsServices.themeRepository.getTheme()
        ])

        if (!mounted) {
          return
        }

        const normalizedAppSettings = {
          ...DEFAULT_APP_SETTINGS,
          ...storedAppSettings,
          theme: storedTheme ?? storedAppSettings.theme ?? DEFAULT_APP_SETTINGS.theme
        }

        setAppSettings(normalizedAppSettings)
        setProviders(applySingleProviderEnabledState(buildProviderFormState(storedProviders), normalizedAppSettings.defaultProvider))
        setProviderEditorSelection(normalizedAppSettings.defaultProvider)
        setHasLoadError(false)
      } catch {
        if (mounted) {
          setHasLoadError(true)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [optionsServices])

  React.useEffect(() => {
    if (appSettings.theme === "custom") {
      setCustomColorDraft(theme.accent)
    }
  }, [appSettings.theme, theme.accent])

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

  function buildProviderConfig(formState: ReturnType<typeof buildProviderFormState>[0]): ProviderConfig {
    return {
      provider: formState.provider,
      apiKey: formState.apiKey,
      model: formState.model,
      baseUrl: formState.baseUrl,
      enabled: formState.enabled
    }
  }

  const handleSave = React.useCallback(async () => {
    if (isLoading || hasLoadError || validation.hasErrors || isSavingRef.current) {
      return
    }

    isSavingRef.current = true
    setSaveStatus("saving")

    try {
      const providersToSave = applySingleProviderEnabledState(providers, appSettings.defaultProvider)
      await Promise.all([
        optionsServices.settingsRepository.saveAppSettings(appSettings),
        optionsServices.settingsRepository.saveProviders(providersToSave),
        optionsServices.themeRepository.setTheme(appSettings.theme)
      ])
      setSaveStatus("saved")
    } catch {
      setSaveStatus("error")
    } finally {
      isSavingRef.current = false
    }
  }, [appSettings, hasLoadError, isLoading, optionsServices, providers, validation.hasErrors])

  const handleLicenseSubmit = React.useCallback(async () => {
    setLicenseError(null)
    setIsSubmittingLicense(true)

    try {
      const result = await validateLicenseKey(licenseInput)
      if (result === "invalid") {
        setLicenseError(t("settings.license.invalid"))
        return
      }
      if (result === "unvalidated") {
        setLicenseError(t("settings.license.unvalidated"))
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
      setLicenseError(t("settings.license.saveError"))
    } finally {
      setIsSubmittingLicense(false)
    }
  }, [licenseInput, t, trial, trialRepository])

  const licenseEntryProps = trialUiStatus
    ? {
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
      }
    : null

  const selectedProvider = providers.find((provider) => provider.provider === providerEditorSelection) ?? null
  const shouldShowTrialBanner = SHOW_TRIAL_PROMOTION_UI && licenseEntryProps?.status === "trial"
  const shouldShowExpiredBanner = SHOW_TRIAL_PROMOTION_UI && licenseEntryProps?.status === "expired"

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
    overflow: "hidden",
    padding: "24px"
  }

  const selectStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${theme.border}`,
    borderRadius: "10px",
    backgroundColor: theme.page,
    color: theme.textPrimary,
    fontSize: "0.875rem",
    appearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg fill='%237A8A7D' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>\")",
    backgroundRepeat: "no-repeat",
    backgroundPositionX: "98%",
    backgroundPositionY: "50%"
  }

  const panelStyle: React.CSSProperties = {
    display: "grid",
    gap: spacing.lg,
    minWidth: 0
  }
  const sidebarButtonStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    width: "100%",
    minHeight: "44px",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: "12px",
    border: `1px solid ${isActive ? theme.borderFocus : "transparent"}`,
    backgroundColor: isActive ? theme.accentSoft : "transparent",
    color: isActive ? theme.accent : theme.textMuted,
    fontSize: "0.875rem",
    fontWeight: isActive ? 600 : 500,
    cursor: "pointer",
    boxSizing: "border-box"
  })

  function selectProvider(provider: ProviderType): void {
    setAppSettings((current) => ({ ...current, defaultProvider: provider }))
    setProviders((current) => applySingleProviderEnabledState(current, provider))
    setProviderEditorSelection(provider)
  }

  function renderSettingsPanel() {
    return (
      <div data-testid="settings-page-shell" style={panelStyle}>
        {shouldShowTrialBanner ? (
          <TrialBanner
            ctaLabel={t("settings.trial.cta.activate")}
            detail={getTrialBannerDetail(t, licenseEntryProps.installedAt, licenseEntryProps.analysisUsed)}
            message={t("settings.trial.message.try")}
            onCtaClick={licenseEntryProps.onExpandActivation}
            status="trial"
            title={t("trialBanner.title.trial")}
          />
        ) : null}

        {shouldShowExpiredBanner ? (
          <TrialBanner
            ctaLabel={t("settings.trial.cta.unlock")}
            detail={t("settings.trial.detail.savedAnalysis")}
            message={t("settings.trial.message.locked")}
            onCtaClick={licenseEntryProps.onExpandActivation}
            status="expired"
            title={t("trialBanner.title.expired")}
          />
        ) : null}

        <div data-testid="settings-workspace" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "32px", alignItems: "start", paddingBottom: "48px" }}>
          <div style={{ display: "grid", gap: "24px" }}>
            <section data-testid="settings-section-card" style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>{t("settings.provider.heading")}</h3>
              <input id="default-provider" type="hidden" value={appSettings.defaultProvider} readOnly />

              <div data-testid="provider-rail" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginBottom: "24px" }}>
                {PROVIDER_CARDS.map((provider) => {
                  const isSelected = providerEditorSelection === provider.id
                  const isDefault = appSettings.defaultProvider === provider.id
                  const providerPresentation = getProviderPresentation(appSettings.displayLanguage, provider.id)

                  return (
                    <button
                      key={provider.id}
                      aria-pressed={isSelected}
                      data-testid={provider.dataTestId}
                      onClick={() => selectProvider(provider.id)}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        width: "100%",
                        padding: "12px",
                        borderRadius: "12px",
                        border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                        backgroundColor: isSelected ? theme.page : theme.surface,
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                      type="button"
                    >
                      <span style={{ width: "32px", height: "32px", borderRadius: "999px", backgroundColor: theme.surface, display: "grid", placeItems: "center", fontSize: "0.875rem", border: `1px solid ${theme.border}`, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", flexShrink: 0 }}>
                        {provider.icon}
                      </span>
                      <span style={{ display: "grid", minWidth: 0 }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: theme.textPrimary }}>{providerPresentation.label}</span>
                        <span style={{ fontSize: "0.625rem", color: theme.textMuted, lineHeight: 1.4 }}>{providerPresentation.description}</span>
                      </span>
                      {isSelected ? (
                        <span aria-hidden="true" style={{ position: "absolute", top: "8px", right: "8px", width: "8px", height: "8px", borderRadius: "999px", backgroundColor: provider.accent }} />
                      ) : null}
                      {isDefault ? (
                        <span style={{ position: "absolute", bottom: "8px", right: "8px", fontSize: "0.625rem", color: theme.accent, fontWeight: 700 }}>
                          {t("settings.defaultProvider.badge")}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {selectedProvider ? (
                <ProviderSettingsForm
                  fieldErrors={validation.providers[selectedProvider.provider]}
                  language={appSettings.displayLanguage}
                  onChange={(nextValue) => {
                    setProviders((current) =>
                      current.map((provider) => provider.provider === nextValue.provider ? nextValue : provider)
                    )
                  }}
                  onTestConnection={async (formValue) => {
                    try {
                      await optionsServices.testConnection(buildProviderConfig(formValue))
                      return "ok"
                    } catch (error) {
                      return getLocalizedErrorMessage(appSettings.displayLanguage, error, "settings.provider.connectionFailed")
                    }
                  }}
                  value={selectedProvider}
                />
              ) : null}
            </section>
          </div>
          <div style={{ display: "grid", gap: "24px" }}>
            <section data-testid="settings-experience-card" style={cardStyle}>
              <h3 style={{ margin: "0 0 24px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>{t("settings.section.experience")}</h3>

              <div style={{ display: "grid", gap: "24px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "12px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>{t("settings.theme.label")}</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
                    {THEME_CARDS.map((themeOption) => {
                      const isSelected = appSettings.theme === themeOption.theme

                      return (
                        <button
                          key={themeOption.theme}
                          data-testid={`theme-card-${themeOption.theme}`}
                          onClick={() => {
                            if (themeOption.theme === "custom") {
                              setShowColorPicker((current) => !current)
                              setAppSettings((current) => ({ ...current, theme: "custom" }))
                              return
                            }

                            setShowColorPicker(false)
                            setAppSettings((current) => ({ ...current, theme: themeOption.theme }))
                            theme.setTheme(themeOption.theme)
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            minHeight: "40px",
                            borderRadius: "10px",
                            border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                            backgroundColor: themeOption.dark ? "#1C1C1F" : theme.surface,
                            color: themeOption.dark ? (isSelected ? "#8BA1B7" : "#909096") : isSelected ? theme.accent : theme.textMuted,
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            cursor: "pointer"
                          }}
                          type="button"
                        >
                          {themeOption.emoji ? <span>{themeOption.emoji}</span> : <span style={{ width: "12px", height: "12px", borderRadius: "999px", backgroundColor: themeOption.chipColor, border: themeOption.theme === "cloud" ? "1px solid #D1D5DB" : "none" }} />}
                          <span>{getThemeLabel(appSettings.displayLanguage, themeOption.theme)}</span>
                        </button>
                      )
                    })}
                  </div>

                  {showColorPicker ? (
                    <div style={{ marginTop: "12px", padding: "16px", borderRadius: "10px", border: `1px solid ${theme.border}`, backgroundColor: theme.surfaceSubtle, display: "grid", gap: "12px" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {CUSTOM_THEME_PRESETS.map((color) => (
                          <button
                            key={color}
                            data-testid={`custom-theme-preset-${color}`}
                            onClick={() => {
                              setCustomColorDraft(color)
                              theme.setCustomAccentColor(color)
                              setAppSettings((current) => ({ ...current, theme: "custom" }))
                            }}
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "999px",
                              backgroundColor: color,
                              border: customColorDraft === color ? `2px solid ${theme.textPrimary}` : "2px solid transparent",
                              cursor: "pointer"
                            }}
                            title={color}
                            type="button"
                          />
                        ))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="color"
                          value={customColorDraft}
                          onChange={(event) => {
                            setCustomColorDraft(event.target.value)
                            theme.setCustomAccentColor(event.target.value)
                            setAppSettings((current) => ({ ...current, theme: "custom" }))
                          }}
                          style={{ width: "40px", height: "32px", border: "none", cursor: "pointer", borderRadius: "6px" }}
                        />
                        <span style={{ fontSize: "0.75rem", color: theme.textMuted }}>{customColorDraft}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                  <div>
                    <label htmlFor="display-language" style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>
                      {t("settings.displayLanguage.label")}
                    </label>
                    <select
                      id="display-language"
                      onChange={(event) => {
                        const nextLanguage = event.target.value as DisplayLanguage
                        setAppSettings((current) => ({ ...current, displayLanguage: nextLanguage }))
                      }}
                      style={selectStyle}
                      value={appSettings.displayLanguage}
                    >
                      <option value="en">{t("settings.displayLanguage.option.en")}</option>
                      <option value="zh">{t("settings.displayLanguage.option.zh")}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="summary-language" style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>
                      {t("settings.summaryLanguage.label")}
                    </label>
                    <select
                      id="summary-language"
                      onChange={(event) =>
                        setAppSettings((current) => ({
                          ...current,
                          summaryLanguage: event.target.value as typeof current.summaryLanguage
                        }))
                      }
                      style={selectStyle}
                      value={appSettings.summaryLanguage ?? "auto"}
                    >
                      <option value="auto">{t("settings.summaryLanguage.option.auto")}</option>
                      <option value="zh">{t("settings.summaryLanguage.option.zh")}</option>
                      <option value="en">{t("settings.summaryLanguage.option.en")}</option>
                      <option value="ja">{t("settings.summaryLanguage.option.ja")}</option>
                      <option value="ko">{t("settings.summaryLanguage.option.ko")}</option>
                      <option value="fr">{t("settings.summaryLanguage.option.fr")}</option>
                      <option value="de">{t("settings.summaryLanguage.option.de")}</option>
                      <option value="es">{t("settings.summaryLanguage.option.es")}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "20px", paddingTop: "24px", borderTop: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>{t("settings.autoAnalyzeOnSave.label")}</span>
                    <ToggleSwitch
                      checked={appSettings.autoAnalyzeOnSave}
                      label={t("settings.autoAnalyzeOnSave.label")}
                      onChange={(next) => setAppSettings((current) => ({ ...current, autoAnalyzeOnSave: next }))}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>{t("settings.autoRetryOnError.label")}</span>
                    <ToggleSwitch
                      checked={appSettings.autoRetryOnError}
                      label={t("settings.autoRetryOnError.label")}
                      onChange={(next) => setAppSettings((current) => ({ ...current, autoRetryOnError: next }))}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section data-testid="settings-section-card" style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>{t("settings.knowledge.card.title")}</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted, lineHeight: 1.6 }}>
                {t("settings.knowledge.card.description")}
              </p>
            </section>

            <section data-testid="settings-license-card" style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>{t("settings.section.license")}</h3>
              {licenseEntryProps ? (
                <OptionsLicenseEntry language={appSettings.displayLanguage} licenseCopy={getLicenseActivationCopy(t)} t={t} {...licenseEntryProps} />
              ) : (
                <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted }}>{t("settings.license.unavailable")}</p>
              )}
            </section>
          </div>
        </div>

        <section
          data-testid="settings-save-actions"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.md,
            padding: "16px 32px",
            borderTop: `1px solid ${theme.border}`,
            backgroundColor: theme.surface,
            boxShadow: "0 -2px 10px rgba(0,0,0,0.02)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: saveStatus === "error" ? theme.textDanger : theme.accent, boxShadow: saveStatus === "error" ? `0 0 4px ${theme.textDanger}` : "0 0 4px rgba(107,142,115,0.5)" }} />
            <p aria-live="polite" data-testid="save-status" role="status" style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted }}>
              {getSaveStatusMessage(saveStatus, isLoading, hasLoadError, t)}
            </p>
          </div>

          <button
            data-testid="settings-save-button"
            disabled={isLoading || hasLoadError || saveStatus === "saving" || validation.hasErrors}
            onClick={() => void handleSave()}
            style={{
              padding: "10px 32px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: theme.accent,
              color: "#ffffff",
              fontWeight: 500,
              fontSize: "0.875rem",
              cursor: "pointer"
            }}
            type="button"
          >
            {t("settings.save.button")}
          </button>
        </section>
      </div>
    )
  }

  function renderKnowledgePanel() {
    return <KnowledgeSettingsPanel bookmarkRepository={optionsServices.bookmarkRepository} language={appSettings.displayLanguage} />
  }

  return (
    <ThemeProvider theme={theme}>
      <main
        data-testid="options-dashboard-shell"
        style={{
          display: "grid",
          gridTemplateColumns: "256px minmax(0, 1fr)",
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
            minWidth: "256px",
            minHeight: "100vh",
            backgroundColor: theme.surface,
            borderRight: `1px solid ${theme.border}`,
            boxShadow: "2px 0 8px rgba(0,0,0,0.02)",
            zIndex: 10
          }}
        >
          <div style={{ padding: "24px 24px 16px", borderBottom: `1px solid ${theme.border}` }}>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "10px", color: theme.textPrimary }}>
              <span style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "6px", backgroundColor: theme.accent, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }} />
              TabVault
            </h1>
            <p style={{ margin: "10px 0 0", fontSize: "0.8125rem", lineHeight: 1.5, color: theme.textMuted }}>
              {t("settings.sidebar.tagline")}
            </p>
          </div>
          <nav style={{ display: "grid", gap: "12px", padding: "20px 16px", flex: 1, alignContent: "start" }}>
            <div>
              <p
                style={{
                  margin: "0 0 10px",
                  padding: "0 12px",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: theme.textMuted,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase"
                }}
              >
                {t("settings.nav.settings")}
              </p>
              <div style={{ display: "grid", gap: "4px" }}>
                <button
                  aria-current={activePage === "settings" ? "page" : undefined}
                  data-testid="options-nav-settings"
                  onClick={() => setActivePage("settings")}
                  style={sidebarButtonStyle(activePage === "settings")}
                  type="button"
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: "24px",
                        height: "24px",
                        borderRadius: "8px",
                        backgroundColor: activePage === "settings" ? theme.page : theme.surfaceSubtle,
                        color: activePage === "settings" ? theme.accent : theme.textMuted,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      A
                    </span>
                    <span>{t("settings.nav.architecture")}</span>
                  </span>
                  {activePage === "settings" ? (
                    <span
                      aria-hidden="true"
                      style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: theme.accent, flexShrink: 0 }}
                    />
                  ) : null}
                </button>
                <button
                  aria-current={activePage === "knowledge" ? "page" : undefined}
                  data-testid="settings-nav-knowledge"
                  onClick={() => setActivePage("knowledge")}
                  style={sidebarButtonStyle(activePage === "knowledge")}
                  type="button"
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: "24px",
                        height: "24px",
                        borderRadius: "8px",
                        backgroundColor: activePage === "knowledge" ? theme.page : theme.surfaceSubtle,
                        color: activePage === "knowledge" ? theme.accent : theme.textMuted,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      K
                    </span>
                    <span>{t("settings.nav.knowledge")}</span>
                  </span>
                  {activePage === "knowledge" ? (
                    <span
                      aria-hidden="true"
                      style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: theme.accent, flexShrink: 0 }}
                    />
                  ) : null}
                </button>
              </div>
            </div>
          </nav>
          <div
            style={{
              padding: "12px 16px 16px",
              borderTop: `1px solid ${theme.border}`,
              display: "grid",
              gap: "6px"
            }}
          >
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {activePage === "settings" ? t("settings.nav.architecture") : t("settings.nav.knowledge")}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.75rem",
                color: theme.textPrimary
              }}
            >
              <span
                aria-hidden="true"
                style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: theme.accent, flexShrink: 0 }}
              />
              {t("settings.save.title")}
            </span>
          </div>
        </aside>

        <div
          data-testid="options-main-content"
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: "100vh",
            backgroundColor: theme.page
          }}
        >
          <header data-testid="settings-page-header" style={{ padding: "32px 32px 16px", flexShrink: 0 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 700, color: theme.textPrimary }}>
              {activePage === "settings" ? t("settings.title") : t("settings.knowledge.title")}
            </h2>
            <p data-testid="settings-page-description" style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted }}>
              {activePage === "settings" ? t("settings.subtitle") : t("settings.knowledge.subtitle")}
            </p>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 32px 32px", boxSizing: "border-box" }}>
            <section data-testid="settings-panel-architecture" hidden={activePage !== "settings"}>
              {activePage === "settings" ? renderSettingsPanel() : null}
            </section>
            <section data-testid="settings-panel-knowledge" hidden={activePage !== "knowledge"}>
              {activePage === "knowledge" ? renderKnowledgePanel() : null}
            </section>
          </div>
        </div>
      </main>
    </ThemeProvider>
  )
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
  language,
  onExpandActivation,
  onLicenseInputChange,
  onLicenseSubmit,
  onLicenseEdit,
  t,
  licenseCopy
}: LicenseEntryStateProps & {
  language: DisplayLanguage
  t: (key: Parameters<typeof getMessage>[1]) => string
  licenseCopy: ReturnType<typeof getLicenseActivationCopy>
}) {
  const detail = getTrialBannerDetail(t, installedAt, analysisUsed)
  const shouldShowActivationForm = SHOW_TRIAL_PROMOTION_UI && status !== "licensed" && isActivationExpanded

  return (
    <div data-testid="settings-license-state" style={{ display: "grid", gap: spacing.md }}>
      {SHOW_TRIAL_PROMOTION_UI && status === "trial" ? (
        <TrialBanner
          ctaLabel={t("settings.trial.cta.activate")}
          detail={detail}
          message={t("settings.trial.message.try")}
          onCtaClick={onExpandActivation}
          status="trial"
          title={t("trialBanner.title.trial")}
        />
      ) : null}

      {SHOW_TRIAL_PROMOTION_UI && status === "expired" ? (
        <TrialBanner
          ctaLabel={t("settings.trial.cta.unlock")}
          detail={t("settings.trial.detail.savedAnalysis")}
          message={t("settings.trial.message.locked")}
          onCtaClick={onExpandActivation}
          status="expired"
          title={t("trialBanner.title.expired")}
        />
      ) : null}

      {shouldShowActivationForm ? (
        <LicenseActivation
          copy={licenseCopy}
          errorMessage={licenseError}
          isLicensed={false}
          isSubmitting={isSubmittingLicense}
          language={language}
          licenseKey={licenseInput}
          onLicenseKeyChange={onLicenseInputChange}
          onSubmit={onLicenseSubmit}
        />
      ) : null}

      {status === "licensed" ? (
        <LicenseActivation
          copy={licenseCopy}
          errorMessage={null}
          isLicensed={true}
          language={language}
          licenseKey={storedLicenseKey ?? ""}
          onEdit={onLicenseEdit}
          onLicenseKeyChange={onLicenseInputChange}
          onSubmit={onLicenseSubmit}
        />
      ) : null}
    </div>
  )
}

export default Options
