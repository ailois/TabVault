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
import type { SettingsRepository } from "./lib/config/settings-repository"
import { validateLicenseKey } from "./lib/trial/license-service"
import { TrialRepository } from "./lib/trial/trial-repository"
import { TRIAL_ANALYSIS_LIMIT, TRIAL_DAYS } from "./lib/trial/trial-constants"
import { useTrialStatus } from "./lib/trial/use-trial-status"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import type { ProviderConfig, ProviderType, ThemeName } from "./types/settings"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import { getMessage } from "./lib/i18n/messages"
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
  label: string
  description: string
  icon: string
  accent: string
}

type ThemeCardDefinition = {
  theme: ThemeName
  label: string
  chipColor: string
  dark?: boolean
  emoji?: string
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

const PROVIDER_CARDS: ProviderCardDefinition[] = [
  {
    id: "openai",
    dataTestId: "provider-rail-openai",
    label: "OpenAI Chat",
    description: "/v1/chat/completions",
    icon: "💬",
    accent: "#6B8E73"
  },
  {
    id: "openai-response",
    dataTestId: "provider-rail-openai-response",
    label: "OpenAI Response",
    description: "/v1/responses",
    icon: "📄",
    accent: "#6B8E73"
  },
  {
    id: "claude",
    dataTestId: "provider-rail-claude",
    label: "Claude",
    description: "Anthropic Messages",
    icon: "🧠",
    accent: "#C08457"
  },
  {
    id: "gemini",
    dataTestId: "provider-rail-gemini",
    label: "Gemini",
    description: "Google AI Studio",
    icon: "✨",
    accent: "#5B7C99"
  }
]

const THEME_CARDS: ThemeCardDefinition[] = [
  { theme: "sage", label: "鼠尾草", chipColor: "#6B8E73" },
  { theme: "breeze", label: "海风蓝", chipColor: "#5B7C99" },
  { theme: "vanilla", label: "香草色", chipColor: "#D4A373" },
  { theme: "cloud", label: "极简浅", chipColor: "#FAFAFA" },
  { theme: "obsidian", label: "深邃暗", chipColor: "#121214", dark: true },
  { theme: "taro", label: "芋色", chipColor: "#9D8CBA" },
  { theme: "custom", label: "自定义", chipColor: "#9D8CBA", emoji: "🎨" }
]

const CUSTOM_THEME_PRESETS = ["#9D8CBA", "#6B8E73", "#5B7C99", "#D4A373", "#E07B54", "#C2587B", "#4A90B8", "#7B9E6B"]


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
  const [selectedProtocolCard, setSelectedProtocolCard] = React.useState<ProviderType>(DEFAULT_APP_SETTINGS.defaultProvider)
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle")
  const [activePage, setActivePage] = React.useState<OptionsPage>("settings")
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasLoadError, setHasLoadError] = React.useState(false)
  const [isActivationExpanded, setIsActivationExpanded] = React.useState(false)
  const [licenseInput, setLicenseInput] = React.useState("")
  const [licenseError, setLicenseError] = React.useState<string | null>(null)
  const [isSubmittingLicense, setIsSubmittingLicense] = React.useState(false)
  const [optimisticLicensedKey, setOptimisticLicensedKey] = React.useState<string | null>(null)
  const isSavingRef = React.useRef(false)
  const validation = React.useMemo(() => validateSettingsForm(appSettings, providers), [appSettings, providers])
  const t = React.useCallback(
    (key: Parameters<typeof getMessage>[1]) => getMessage(appSettings.displayLanguage, key),
    [appSettings.displayLanguage]
  )

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

  React.useEffect(() => {
    let isMounted = true

    void (async () => {
      try {
        const [storedAppSettings, storedProviders, storedTheme] = await Promise.all([
          optionsServices.settingsRepository.getAppSettings(),
          optionsServices.settingsRepository.getProviders(),
          optionsServices.themeRepository.getTheme()
        ])

        if (!isMounted) {
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
        setSelectedProtocolCard(normalizedAppSettings.defaultProvider)
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
            backgroundColor: theme.surface,
            borderRight: `1px solid ${theme.border}`,
            boxShadow: "2px 0 8px rgba(0,0,0,0.02)",
            zIndex: 10
          }}
        >
          <div style={{ padding: "24px 24px 16px", marginBottom: "16px" }}>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "10px", color: theme.textPrimary }}>
              <span style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "6px", backgroundColor: theme.accent, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }} />
              TabVault
            </h1>
          </div>

          <nav style={{ display: "grid", gap: "4px", padding: "0 16px", flex: 1 }}>
            <button
              aria-current={activePage === "settings" ? "page" : undefined}
              data-testid="options-nav-settings"
              onClick={() => setActivePage("settings")}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: activePage === "settings" ? theme.page : "transparent",
                color: activePage === "settings" ? theme.accent : theme.textMuted,
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer"
              }}
              type="button"
            >
              ⚙️ {t("settings.nav.architecture")}
            </button>
            <button
              aria-current={activePage === "knowledge" ? "page" : undefined}
              data-testid="settings-nav-knowledge"
              onClick={() => setActivePage("knowledge")}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: activePage === "knowledge" ? theme.page : "transparent",
                color: activePage === "knowledge" ? theme.accent : theme.textMuted,
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer"
              }}
              type="button"
            >
              📚 {t("settings.nav.knowledge")}
            </button>
          </nav>
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
              {activePage === "settings" ? t("settings.title") : "管理"}
            </h2>
            <p data-testid="settings-page-description" style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted }}>
              {activePage === "settings"
                ? t("settings.subtitle")
                : "管理本地书签数据、向量索引策略、存储空间及隐私规则。"}
            </p>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 32px 32px", boxSizing: "border-box" }}>
            {activePage === "settings" ? (
              <SettingsContent
                appSettings={appSettings}
                buildProviderConfig={buildProviderConfig}
                handleSave={handleSave}
                hasLoadError={hasLoadError}
                isLoading={isLoading}
                optionsServices={optionsServices}
                providerEditorSelection={providerEditorSelection}
                providers={providers}
                saveStatus={saveStatus}
                selectedProtocolCard={selectedProtocolCard}
                setAppSettings={setAppSettings}
                setProviderEditorSelection={setProviderEditorSelection}
                setProviders={setProviders}
                setSelectedProtocolCard={setSelectedProtocolCard}
                theme={theme}
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
                validation={validation}
                t={t}
              />
            ) : (
              <KnowledgeSettingsPanel bookmarkRepository={optionsServices.bookmarkRepository} />
            )}
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

type SettingsContentProps = {
  appSettings: typeof DEFAULT_APP_SETTINGS
  buildProviderConfig: (formState: ReturnType<typeof buildProviderFormState>[0]) => ProviderConfig
  handleSave: () => Promise<void>
  hasLoadError: boolean
  isLoading: boolean
  optionsServices: OptionsServices
  providerEditorSelection: ProviderType
  providers: ReturnType<typeof buildProviderFormState>
  saveStatus: SaveStatus
  selectedProtocolCard: ProviderType
  setAppSettings: React.Dispatch<React.SetStateAction<typeof DEFAULT_APP_SETTINGS>>
  setProviderEditorSelection: React.Dispatch<React.SetStateAction<ProviderType>>
  setProviders: React.Dispatch<React.SetStateAction<ReturnType<typeof buildProviderFormState>>>
  setSelectedProtocolCard: React.Dispatch<React.SetStateAction<ProviderType>>
  theme: ReturnType<typeof useTheme>
  trialStateProps: LicenseEntryStateProps | null
  validation: ReturnType<typeof validateSettingsForm>
  t: (key: Parameters<typeof getMessage>[1]) => string
}

function SettingsContent({
  appSettings,
  buildProviderConfig,
  handleSave,
  hasLoadError,
  isLoading,
  optionsServices,
  providerEditorSelection,
  providers,
  saveStatus,
  selectedProtocolCard,
  setAppSettings,
  setProviderEditorSelection,
  setProviders,
  setSelectedProtocolCard,
  theme,
  trialStateProps,
  validation,
  t
}: SettingsContentProps) {
  const [showColorPicker, setShowColorPicker] = React.useState(false)
  const [customColorDraft, setCustomColorDraft] = React.useState("#9D8CBA")

  React.useEffect(() => {
    if (appSettings.theme === "custom") {
      setCustomColorDraft(theme.accent)
    }
  }, [appSettings.theme, theme.accent])

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
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

  const selectedProvider = providers.find((provider) => provider.provider === providerEditorSelection)

  function selectProvider(provider: ProviderType): void {
    setAppSettings((currentSettings) => ({
      ...currentSettings,
      defaultProvider: provider
    }))
    setProviders((currentProviders) => applySingleProviderEnabledState(currentProviders, provider))
    setProviderEditorSelection(provider)
    setSelectedProtocolCard(provider)
  }

  return (
    <div data-testid="settings-page-shell" style={{ display: "grid", gap: "32px", minWidth: 0 }}>
      {trialStateProps?.status === "trial" ? (
        <div>
          <TrialBanner
            ctaLabel="Activate now"
            detail={getTrialBannerDetail(trialStateProps.installedAt, trialStateProps.analysisUsed)}
            message="Try TabVault free for 3 days."
            onCtaClick={trialStateProps.onExpandActivation}
            status="trial"
          />
        </div>
      ) : null}

      <div data-testid="settings-workspace" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "32px", alignItems: "start", paddingBottom: "48px" }}>
        <div style={{ display: "grid", gap: "24px" }}>
          <section data-testid="settings-section-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>伴读引擎协议 (Provider)</h3>
            <div data-testid="provider-rail" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {PROVIDER_CARDS.map((provider) => {
                const isSelected = selectedProtocolCard === provider.id
                const isStorageBacked = true
                const isDefault = isStorageBacked && appSettings.defaultProvider === provider.id

                return (
                  <button
                    key={provider.id}
                    aria-pressed={isSelected}
                    data-testid={provider.dataTestId}
                    onClick={() => {
                      selectProvider(provider.id)
                    }}
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
                      textAlign: "left",
                      transition: "background-color 0.15s ease, border-color 0.15s ease"
                    }}
                    type="button"
                  >
                    <span style={{ width: "32px", height: "32px", borderRadius: "999px", backgroundColor: theme.surface, display: "grid", placeItems: "center", fontSize: "1rem", border: `1px solid ${theme.border}`, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", flexShrink: 0 }}>
                      {provider.icon}
                    </span>
                    <span style={{ display: "grid", minWidth: 0 }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: theme.textPrimary }}>{provider.label}</span>
                      <span style={{ fontSize: "0.625rem", color: theme.textMuted, lineHeight: 1.4 }}>{provider.description}</span>
                    </span>
                    {isSelected ? (
                      <span aria-hidden="true" style={{ position: "absolute", top: "8px", right: "8px", width: "8px", height: "8px", borderRadius: "999px", backgroundColor: provider.accent }} />
                    ) : null}
                    {isDefault ? (
                      <span style={{ position: "absolute", bottom: "8px", right: "8px", fontSize: "0.625rem", color: theme.accent, fontWeight: 700 }}>
                        默认
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>

            {selectedProvider ? (
              <ProviderSettingsForm
                fieldErrors={validation.providers[selectedProvider.provider]}
                onChange={(nextValue) => {
                  setProviders((currentProviders) =>
                    currentProviders.map((currentProvider) =>
                      currentProvider.provider === nextValue.provider ? nextValue : currentProvider
                    )
                  )
                }}
                onTestConnection={async (formValue) => {
                  try {
                    await optionsServices.testConnection(buildProviderConfig(formValue))
                    return "ok"
                  } catch (error) {
                    return error instanceof Error ? error.message : "Connection failed"
                  }
                }}
                value={selectedProvider}
              />
            ) : null}
          </section>
        </div>

        <div style={{ display: "grid", gap: "24px" }}>
          <section data-testid="settings-experience-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 24px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>体验与自动化</h3>

            <div style={{ display: "grid", gap: "24px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "12px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>界面主题 (Theme)</label>
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
                            setAppSettings((currentSettings) => ({
                              ...currentSettings,
                              theme: "custom"
                            }))
                            return
                          }

                          setShowColorPicker(false)
                          setAppSettings((currentSettings) => ({
                            ...currentSettings,
                            theme: themeOption.theme
                          }))
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
                          cursor: "pointer",
                          boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.04)" : "none"
                        }}
                        type="button"
                      >
                        {themeOption.emoji ? <span>{themeOption.emoji}</span> : <span style={{ width: "12px", height: "12px", borderRadius: "999px", backgroundColor: themeOption.chipColor, border: themeOption.theme === "cloud" ? "1px solid #D1D5DB" : "none" }} />}
                        <span>{themeOption.label}</span>
                      </button>
                    )
                  })}
                </div>
                {showColorPicker ? (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "16px",
                      borderRadius: "10px",
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.surfaceSubtle,
                      display: "grid",
                      gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {CUSTOM_THEME_PRESETS.map((color) => (
                        <button
                          key={color}
                          data-testid={`custom-theme-preset-${color}`}
                          onClick={() => {
                            setCustomColorDraft(color)
                            theme.setCustomAccentColor(color)
                            setAppSettings((currentSettings) => ({
                              ...currentSettings,
                              theme: "custom"
                            }))
                          }}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "999px",
                            backgroundColor: color,
                            border: customColorDraft === color ? `2px solid ${theme.textPrimary}` : "2px solid transparent",
                            cursor: "pointer",
                            flexShrink: 0
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
                          setAppSettings((currentSettings) => ({
                            ...currentSettings,
                            theme: "custom"
                          }))
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
                    onChange={(event) =>
                      setAppSettings((currentSettings) => ({
                        ...currentSettings,
                        displayLanguage: event.target.value as typeof currentSettings.displayLanguage
                      }))
                    }
                    style={selectStyle}
                    value={appSettings.displayLanguage}
                  >
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="summary-language" style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>
                    {t("settings.summaryLanguage.label")}
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
                    onChange={(next) =>
                      setAppSettings((currentSettings) => ({
                        ...currentSettings,
                        autoAnalyzeOnSave: next
                      }))
                    }
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>{t("settings.autoRetryOnError.label")}</span>
                  <ToggleSwitch
                    checked={appSettings.autoRetryOnError}
                    label={t("settings.autoRetryOnError.label")}
                    onChange={(next) =>
                      setAppSettings((currentSettings) => ({
                        ...currentSettings,
                        autoRetryOnError: next
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section data-testid="settings-section-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>知识库管理</h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted, lineHeight: 1.6 }}>
              管理本地书签知识、同步来源与后续检索能力。当前页先保留结构入口，详细功能将在后续迭代补齐。
            </p>
          </section>

          <section data-testid="settings-license-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>试用与许可证</h3>
            {trialStateProps ? <OptionsLicenseEntry {...trialStateProps} /> : <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted }}>当前许可证状态不可用。</p>}
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
          disabled={isLoading || hasLoadError || saveStatus === "saving" || validation.hasErrors}
          onClick={() => void handleSave()}
          style={{
            padding: "10px 32px",
            border: "none",
            borderRadius: "10px",
            backgroundColor: theme.accent,
            color: "#ffffff",
            fontWeight: 500,
            fontSize: "0.875rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(107,142,115,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
          type="button"
        >
          <span>{t("settings.save.button")}</span>
        </button>
      </section>
    </div>
  )
}

export default Options
