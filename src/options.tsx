import React from "react"

import ProviderSettingsForm from "./components/provider-settings-form"
import { ToggleSwitch } from "./components/toggle-switch"
import { BookmarkTree } from "./components/bookmark-tree"
import { LicenseActivation } from "./components/license-activation"
import { TrialBanner } from "./components/trial-banner"
import { DEFAULT_APP_SETTINGS } from "./features/settings/default-settings"
import { buildProviderFormState } from "./features/settings/provider-form-state"
import { validateSettingsForm } from "./features/settings/settings-validation"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { validateLicenseKey } from "./lib/trial/license-service"
import { TrialRepository } from "./lib/trial/trial-repository"
import { TRIAL_ANALYSIS_LIMIT, TRIAL_DAYS } from "./lib/trial/trial-constants"
import { useTrialStatus } from "./lib/trial/use-trial-status"
import { createProvider } from "./lib/providers/provider-factory"
import type { AiProvider } from "./lib/providers/provider"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import type { ProviderConfig, ProviderType } from "./types/settings"
import type { BookmarkRecord } from "./types/bookmark"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import { buildGlobalStyles, radius, spacing } from "./ui/design-tokens"
import { useTheme } from "./ui/use-theme"
import { useGlobalStyles } from "./ui/use-global-styles"
import { ThemeProvider } from "./ui/theme-context"
import { useThemeContext } from "./ui/theme-context"

type OptionsProps = {
  services?: Partial<OptionsServices>
}

type OptionsServices = {
  settingsRepository: SettingsRepository
  bookmarkRepository: BookmarkRepository
  testConnection: (config: ProviderConfig) => Promise<void>
  themeRepository: ThemeRepository
  analyzeBookmark: typeof defaultAnalyzeBookmark
  createProvider: (config: ProviderConfig) => AiProvider
}

type SaveStatus = "idle" | "saving" | "saved" | "error"

type OptionsTab = "settings" | "bookmarks"

type BookmarkFilterMode = "all" | "analyzed" | "unanalyzed"

type BookmarkListItem = {
  id: string
  title: string
  url: string
  folderId: string | null
  folderTitle: string
}

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

function collectBookmarksWithFolderContext(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  currentFolder: chrome.bookmarks.BookmarkTreeNode | null = null
): BookmarkListItem[] {
  const result: BookmarkListItem[] = []

  for (const node of nodes) {
    if (node.url) {
      result.push({
        id: node.id,
        title: node.title,
        url: node.url,
        folderId: currentFolder?.id ?? null,
        folderTitle: currentFolder?.title || "Root"
      })
      continue
    }

    const nextFolder = node.title ? node : currentFolder
    result.push(...collectBookmarksWithFolderContext(node.children ?? [], nextFolder))
  }

  return result
}

function findDefaultFolderId(nodes: chrome.bookmarks.BookmarkTreeNode[]): string | null {
  for (const node of nodes) {
    if (node.url) continue
    if (node.title) return node.id

    const nested = findDefaultFolderId(node.children ?? [])
    if (nested) return nested
  }

  return null
}

function findFolderTitle(nodes: chrome.bookmarks.BookmarkTreeNode[], folderId: string): string | null {
  for (const node of nodes) {
    if (node.url) continue
    if (node.id === folderId) return node.title || "Root"

    const nested = findFolderTitle(node.children ?? [], folderId)
    if (nested) return nested
  }

  return null
}

function matchesFilterMode(
  url: string,
  filterMode: BookmarkFilterMode,
  metadataMap: Record<string, BookmarkRecord>
): boolean {
  if (filterMode === "analyzed") return metadataMap[url]?.status === "done"
  if (filterMode === "unanalyzed") return metadataMap[url]?.status !== "done"
  return true
}

function matchesSearch(
  item: BookmarkListItem,
  query: string,
  metadataMap: Record<string, BookmarkRecord>
): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const record = metadataMap[item.url]
  const fields = [
    item.title,
    item.url,
    item.folderTitle,
    record?.title ?? "",
    record?.summary ?? "",
    ...(record?.aiTags ?? []),
    ...(record?.userTags ?? [])
  ]

  return fields.some((field) => field.toLowerCase().includes(normalizedQuery))
}

const DEFAULT_OPTIONS_SERVICES: OptionsServices = {
  settingsRepository: new ChromeSettingsRepository(),
  bookmarkRepository: new IndexedDbBookmarkRepository(),
  testConnection: async (config: ProviderConfig) => {
    await createProvider(config).analyze({
      title: "test",
      url: "https://test",
      content: "Say OK"
    })
  },
  themeRepository: new ChromeThemeRepository(),
  analyzeBookmark: defaultAnalyzeBookmark,
  createProvider
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
  const [activeTab, setActiveTab] = React.useState<OptionsTab>("settings")
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
            {(["settings", "bookmarks"] as const).map((tab) => {
              const isActive = activeTab === tab

              return (
                <button
                  key={tab}
                  aria-pressed={isActive}
                  data-testid={`options-nav-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: `${spacing.sm} ${spacing.md}`,
                    border: `1px solid ${isActive ? theme.borderFocus : "transparent"}`,
                    borderRadius: "12px",
                    backgroundColor: isActive ? theme.accentSoft : "transparent",
                    color: isActive ? theme.textPrimary : theme.textMuted,
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease"
                  }}
                  type="button"
                >
                  <span>{tab === "settings" ? "Settings" : "Bookmarks"}</span>
                  {isActive ? (
                    <span aria-hidden="true" style={{ color: theme.accent, fontSize: "0.75rem" }}>
                      ●
                    </span>
                  ) : null}
                </button>
              )
            })}
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
          {activeTab === "bookmarks" ? (
            <BookmarksTab services={optionsServices} />
          ) : (
            <div data-testid="settings-page-shell" style={{ width: "100%", minWidth: 0, display: "grid", gap: spacing.lg }}>
              <header data-testid="settings-page-header" style={{ display: "grid", gap: "4px" }}>
                <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: theme.textPrimary }}>Settings</h1>
                <p data-testid="settings-page-description" style={{ margin: 0, color: theme.textMuted, fontSize: "0.875rem" }}>
                  Configure AI providers and analysis behavior.
                </p>
              </header>

              {trial.status ? (
                <OptionsLicenseEntry
                  analysisUsed={trial.state?.analysisUsed}
                  installedAt={trial.state?.installedAt}
                  isActivationExpanded={isActivationExpanded}
                  isSubmittingLicense={isSubmittingLicense}
                  licenseError={licenseError}
                  licenseInput={licenseInput}
                  onExpandActivation={() => setIsActivationExpanded(true)}
                  onLicenseEdit={() => {
                    setLicenseError(null)
                    setIsActivationExpanded(true)
                    setOptimisticLicensedKey(null)
                    setLicenseInput(trial.state?.licenseKey ?? licenseInput)
                  }}
                  onLicenseInputChange={setLicenseInput}
                  onLicenseSubmit={handleLicenseSubmit}
                  storedLicenseKey={optimisticLicensedKey ?? trial.state?.licenseKey}
                  status={optimisticLicensedKey ? "licensed" : trial.status}
                />
              ) : null}

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
              />
            </div>
          )}
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
}

function SettingsTabContent({
  appSettings, handleSave, hasLoadError, isLoading, optionsServices,
  providers, providerEditorSelection, saveStatus, setAppSettings, setProviders,
  setProviderEditorSelection, theme, validation, buildProviderConfig
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
              <h2 style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary }}>App Settings</h2>
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
              <h2 style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary }}>Maintenance</h2>
            </div>
            <div style={{ padding: "20px", display: "grid", gap: spacing.md }}>
              <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.6, color: theme.textMuted }}>
                Manage stored analysis results without changing your provider configuration.
              </p>
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
        </div>

        <div style={{ display: "grid", gap: spacing.md, minWidth: 0 }}>
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
                  <span style={{ fontSize: "0.75rem", color: isActive ? theme.accent : theme.textMuted }}>
                    {isDefault ? "Default provider" : "Edit configuration"}
                  </span>
                </button>
              )
            })}
          </div>

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

type ColumnWidths = {
  folders: number
  details: number
}

function useColumnResize(initial: ColumnWidths) {
  const [widths, setWidths] = React.useState<ColumnWidths>(initial)
  const draggingRef = React.useRef<"folders-list" | "list-details" | null>(null)
  const startXRef = React.useRef(0)
  const startWidthRef = React.useRef(0)

  const handleMouseDown = React.useCallback(
    (divider: "folders-list" | "list-details") =>
      (e: React.MouseEvent) => {
        e.preventDefault()
        draggingRef.current = divider
        startXRef.current = e.clientX
        startWidthRef.current = divider === "folders-list" ? widths.folders : widths.details
      },
    [widths]
  )

  React.useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return
      const delta = e.clientX - startXRef.current
      if (draggingRef.current === "folders-list") {
        setWidths((w) => ({
          ...w,
          folders: Math.max(180, Math.min(400, startWidthRef.current + delta))
        }))
      } else {
        setWidths((w) => ({
          ...w,
          details: Math.max(240, Math.min(600, startWidthRef.current - delta))
        }))
      }
    }
    function onMouseUp() {
      draggingRef.current = null
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  return { widths, handleMouseDown }
}

function ResizeDivider({
  onMouseDown,
  isDragging
}: {
  onMouseDown: (e: React.MouseEvent) => void
  isDragging: boolean
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: "5px",
        flexShrink: 0,
        cursor: "col-resize",
        position: "relative",
        userSelect: "none",
        zIndex: 1
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "1px",
          left: "2px",
          backgroundColor:
            isHovered || isDragging
              ? "rgba(99,102,241,0.5)"
              : "transparent",
          transition: "background-color 0.15s ease"
        }}
      />
    </div>
  )
}

function BookmarksTab({ services }: { services: OptionsServices }) {
  const theme = useThemeContext()
  const [chromeTree, setChromeTree] = React.useState<chrome.bookmarks.BookmarkTreeNode[]>([])
  const [tabvaultRecords, setTabvaultRecords] = React.useState<BookmarkRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterMode, setFilterMode] = React.useState<BookmarkFilterMode>("all")
  const [selectedUrl, setSelectedUrl] = React.useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [autoRetryEnabled, setAutoRetryEnabled] = React.useState(false)
  const { widths, handleMouseDown } = useColumnResize({ folders: 280, details: 360 })
  const [activeDivider, setActiveDivider] = React.useState<"folders-list" | "list-details" | null>(null)

  const metadataMap = React.useMemo<Record<string, BookmarkRecord>>(() => {
    const map: Record<string, BookmarkRecord> = {}
    for (const record of tabvaultRecords) {
      map[record.url] = record
    }
    return map
  }, [tabvaultRecords])

  const selectedRecord = selectedUrl ? (metadataMap[selectedUrl] ?? null) : null

  async function loadData() {
    setIsLoading(true)
    try {
      const [tree, records, settings] = await Promise.all([
        chrome.bookmarks.getTree(),
        services.bookmarkRepository.list(),
        services.settingsRepository.getAppSettings()
      ])
      setChromeTree(tree)
      setTabvaultRecords(records)
      setAutoRetryEnabled(settings.autoRetryOnError)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load bookmarks")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    void loadData()
  }, [])

  React.useEffect(() => {
    if (selectedFolderId || chromeTree.length === 0) return
    setSelectedFolderId(findDefaultFolderId(chromeTree))
  }, [chromeTree, selectedFolderId])

  const allBookmarks = React.useMemo(
    () => collectBookmarksWithFolderContext(chromeTree),
    [chromeTree]
  )

  const hasSearch = searchQuery.trim().length > 0
  const visibleBookmarks = React.useMemo<BookmarkListItem[]>(() => {
    const pool = hasSearch
      ? allBookmarks
      : allBookmarks.filter((bookmark) => bookmark.folderId === selectedFolderId)

    return pool
      .filter((bookmark) => matchesFilterMode(bookmark.url, filterMode, metadataMap))
      .filter((bookmark) => !hasSearch || matchesSearch(bookmark, searchQuery, metadataMap))
  }, [allBookmarks, filterMode, hasSearch, metadataMap, searchQuery, selectedFolderId])

  const selectedFolderTitle = React.useMemo(() => {
    if (!selectedFolderId) return null
    return findFolderTitle(chromeTree, selectedFolderId)
  }, [chromeTree, selectedFolderId])

  React.useEffect(() => {
    if (!selectedUrl) return
    const existsInTree = allBookmarks.some((bookmark) => bookmark.url === selectedUrl)
    if (!existsInTree) {
      setSelectedUrl(null)
    }
  }, [allBookmarks, selectedUrl])

  React.useEffect(() => {
    function onMouseUp() {
      setActiveDivider(null)
    }
    window.addEventListener("mouseup", onMouseUp)
    return () => window.removeEventListener("mouseup", onMouseUp)
  }, [])

  async function handleAnalyze(url: string) {
    const settings = await services.settingsRepository.getAppSettings()
    const providers = await services.settingsRepository.getProviders()
    const selectedProvider = providers.find(
      (p) => p.enabled && p.provider === settings.defaultProvider
    )
    if (!selectedProvider?.apiKey.trim()) {
      setErrorMessage("Add an API key in Settings to enable analysis.")
      return
    }
    const record = metadataMap[url]
    if (!record) {
      setErrorMessage("This bookmark has not been saved to TabVault yet.")
      return
    }
    try {
      await services.analyzeBookmark({
        bookmark: record,
        provider: services.createProvider(selectedProvider),
        bookmarkRepository: services.bookmarkRepository
      })
    } catch {
      // ignore — loadData will show updated status
    }
    await loadData()
  }

  async function handleDelete(nodeId: string, url: string) {
    try {
      await chrome.bookmarks.remove(nodeId)
      const record = metadataMap[url]
      if (record) {
        await services.bookmarkRepository.delete(record.id)
      }
      if (selectedUrl === url) setSelectedUrl(null)
      await loadData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete bookmark")
    }
  }

  async function handleClearAnalysis(url: string) {
    const record = metadataMap[url]
    if (!record) return
    try {
      await services.bookmarkRepository.clearAnalysis(record.id)
      await loadData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to clear analysis")
    }
  }

  async function handleUpdateTags(url: string, aiTags: string[], userTags: string[]) {
    const record = metadataMap[url]
    if (!record) return
    try {
      await services.bookmarkRepository.update({ ...record, aiTags, userTags, updatedAt: new Date().toISOString() })
      await loadData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update tags")
    }
  }

  async function handleRetryAllErrors() {
    const errorRecords = tabvaultRecords.filter((r) => r.status === "error")
    if (errorRecords.length === 0) return

    const settings = await services.settingsRepository.getAppSettings()
    const providers = await services.settingsRepository.getProviders()
    const selectedProvider = providers.find(
      (p) => p.enabled && p.provider === settings.defaultProvider
    )
    if (!selectedProvider?.apiKey.trim()) {
      setErrorMessage("Add an API key in Settings to enable analysis.")
      return
    }
    const provider = services.createProvider(selectedProvider)

    for (const record of errorRecords) {
      try {
        await services.analyzeBookmark({
          bookmark: record,
          provider,
          bookmarkRepository: services.bookmarkRepository
        })
      } catch {
        // leave individual errors, continue with others
      }
    }
    await loadData()
  }

  const microHeadingStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.625rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: theme.textMuted
  }

  return (
    <div style={{ display: "grid", gap: spacing.md }}>
      <div style={{ display: "grid", gap: "4px" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: theme.textPrimary }}>
          Bookmarks
        </h2>
        <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted }}>
          Browse folders, inspect saved analysis, and manage bookmark metadata.
        </p>
      </div>

      <div
        data-testid="bookmarks-workspace"
        style={{ display: "grid", gap: spacing.md }}
      >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        flexWrap: "wrap",
        padding: spacing.sm,
        border: `1px solid ${theme.borderMuted}`,
        borderRadius: radius.large,
        backgroundColor: theme.surfaceElevated,
        boxShadow: theme.isDark ? "none" : "inset 0 1px 0 rgba(255,255,255,0.8)"
      }}>
        <input
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search title, URL, summary, tags..."
          style={{
            flex: 1,
            minWidth: "180px",
            boxSizing: "border-box",
            padding: `${spacing.sm} ${spacing.md}`,
            border: `1px solid ${theme.border}`,
            borderRadius: radius.medium,
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            fontSize: "0.875rem",
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)"
          }}
          type="search"
          value={searchQuery}
        />
        <div style={{ display: "flex", gap: spacing.xs, flexShrink: 0 }}>
          {(["all", "analyzed", "unanalyzed"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              style={{
                padding: "4px 12px",
                border: filterMode === mode ? "none" : `1px solid ${theme.border}`,
                borderRadius: radius.pill,
                fontSize: "0.75rem",
                fontWeight: filterMode === mode ? 600 : 500,
                lineHeight: 1,
                cursor: "pointer",
                backgroundColor: filterMode === mode ? theme.accent : theme.surface,
                color: filterMode === mode ? "#ffffff" : theme.textMuted,
                transition: "background-color 0.15s ease, color 0.15s ease"
              }}
              type="button"
            >
              {mode === "all" ? "All" : mode === "analyzed" ? "Analyzed" : "Unanalyzed"}
            </button>
          ))}
        </div>
        {autoRetryEnabled && tabvaultRecords.some((r) => r.status === "error") ? (
          <button
            onClick={() => void handleRetryAllErrors()}
            style={{
              padding: "4px 12px",
              border: "none",
              borderRadius: radius.pill,
              fontSize: "0.75rem",
              fontWeight: 500,
              lineHeight: 1,
              cursor: "pointer",
              backgroundColor: theme.textDanger,
              color: "#fff",
              flexShrink: 0
            }}
            type="button"
          >
            Retry all failed
          </button>
        ) : null}
      </div>
      {errorMessage ? (
        <p style={{ margin: 0, fontSize: "0.8125rem", color: theme.textDanger }}>{errorMessage}</p>
      ) : null}
      <div style={{
        display: "flex",
        border: `1px solid ${theme.border}`,
        borderRadius: "20px",
        overflow: "hidden",
        backgroundColor: theme.surface,
        minHeight: "560px",
        minWidth: 0,
        boxShadow: theme.isDark ? "0 10px 28px rgba(0,0,0,0.24)" : "0 8px 24px rgba(15,23,42,0.06)",
        userSelect: activeDivider ? "none" : undefined
      }}>
        <div style={{
          width: `${widths.folders}px`,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.surfaceSubtle
        }}>
          <div style={{ padding: spacing.md, borderBottom: `1px solid ${theme.borderMuted}` }}>
            <p style={microHeadingStyle}>YOUR FOLDERS</p>
          </div>
          <div style={{ padding: spacing.sm, overflowY: "auto", flex: 1 }}>
            {isLoading ? (
              <p style={{ margin: 0, padding: spacing.md, fontSize: "0.875rem", color: theme.textMuted }}>
                Loading bookmarks...
              </p>
            ) : (
              <BookmarkTree
                metadataMap={metadataMap}
                onAnalyze={handleAnalyze}
                onDelete={handleDelete}
                onClearAnalysis={handleClearAnalysis}
                onSelectFolder={setSelectedFolderId}
                selectedFolderId={selectedFolderId}
                selectedUrl={selectedUrl}
                showBookmarks={false}
                treeNodes={chromeTree}
                variant="options"
              />
            )}
          </div>
        </div>
        <ResizeDivider
          onMouseDown={(e) => {
            setActiveDivider("folders-list")
            handleMouseDown("folders-list")(e)
          }}
          isDragging={activeDivider === "folders-list"}
        />
        <div
          data-testid="bookmark-list-column"
          style={{
            flex: 1,
            minWidth: 200,
            display: "flex",
            flexDirection: "column",
            backgroundColor: theme.surface
          }}
        >
          <div style={{ padding: spacing.md, borderBottom: `1px solid ${theme.borderMuted}`, display: "grid", gap: "4px" }}>
            <p style={microHeadingStyle}>BOOKMARKS</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: theme.textMuted }}>
              {hasSearch ? "Search results" : selectedFolderTitle ?? "No folder selected"}
            </p>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: spacing.sm, display: "grid", gap: spacing.xs, alignContent: "start" }}>
            {isLoading ? (
              <p style={{ margin: 0, padding: spacing.md, fontSize: "0.875rem", color: theme.textMuted }}>
                Loading bookmarks...
              </p>
            ) : visibleBookmarks.length === 0 ? (
              <p style={{ margin: 0, padding: spacing.md, fontSize: "0.875rem", color: theme.textMuted }}>
                {hasSearch ? "No bookmarks match your search." : "This folder has no bookmarks."}
              </p>
            ) : (
              visibleBookmarks.map((item) => {
                const isSelected = item.url === selectedUrl
                const status = metadataMap[item.url]?.status
                const host = getBookmarkHost(item.url)

                return (
                  <button
                    data-testid="bookmark-result-button"
                    key={item.id}
                    onClick={() => setSelectedUrl(item.url)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "grid",
                      gap: "4px",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      border: `1px solid ${isSelected ? theme.borderFocus : theme.borderMuted}`,
                      backgroundColor: isSelected ? theme.accentSoft : theme.surface,
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 1px 2px rgba(15,23,42,0.06)" : "none"
                    }}
                    type="button"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, minWidth: 0 }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: isSelected ? 700 : 600, color: theme.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {item.title || item.url}
                      </span>
                      {status ? (
                        <span style={{ fontSize: "0.6875rem", padding: "2px 8px", borderRadius: radius.pill, backgroundColor: theme.surfaceElevated, color: theme.textMuted, flexShrink: 0 }}>
                          {status}
                        </span>
                      ) : null}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: isSelected ? theme.accent : theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {host}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
        <ResizeDivider
          onMouseDown={(e) => {
            setActiveDivider("list-details")
            handleMouseDown("list-details")(e)
          }}
          isDragging={activeDivider === "list-details"}
        />
        <div
          data-testid="bookmark-details-column"
          style={{
            width: `${widths.details}px`,
            flexShrink: 0,
            overflowY: "auto",
            maxHeight: "680px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: theme.surface
          }}
        >
          <div style={{ padding: spacing.md, borderBottom: `1px solid ${theme.borderMuted}` }}>
            <p style={microHeadingStyle}>DETAILS</p>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <BookmarkDetailPanel
              record={selectedRecord}
              url={selectedUrl}
              onAnalyze={handleAnalyze}
              onClearAnalysis={handleClearAnalysis}
              onUpdateTags={handleUpdateTags}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

type BookmarkDetailPanelProps = {
  record: BookmarkRecord | null
  url: string | null
  onAnalyze: (url: string) => Promise<void>
  onClearAnalysis: (url: string) => Promise<void>
  onUpdateTags: (url: string, aiTags: string[], userTags: string[]) => Promise<void>
}

function getBookmarkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function formatBookmarkDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
}

function BookmarkDetailPanel({ record, url, onAnalyze, onClearAnalysis, onUpdateTags }: BookmarkDetailPanelProps) {
  const theme = useThemeContext()
  const [isEditingTags, setIsEditingTags] = React.useState(false)
  const [localAiTags, setLocalAiTags] = React.useState<string[]>([])
  const [localUserTags, setLocalUserTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState("")

  React.useEffect(() => {
    if (record) {
      setLocalAiTags(record.aiTags)
      setLocalUserTags(record.userTags)
    } else {
      setLocalAiTags([])
      setLocalUserTags([])
    }
    setIsEditingTags(false)
    setTagInput("")
  }, [record?.id])

  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTagsFromInput()
    }
  }

  function addTagsFromInput() {
    const newTags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .filter((t) => !localAiTags.includes(t) && !localUserTags.includes(t))
    if (newTags.length > 0) setLocalUserTags([...localUserTags, ...newTags])
    setTagInput("")
  }

  async function handleDoneEditing() {
    setIsEditingTags(false)
    if (!url) return
    const aiChanged = JSON.stringify(localAiTags) !== JSON.stringify(record?.aiTags ?? [])
    const userChanged = JSON.stringify(localUserTags) !== JSON.stringify(record?.userTags ?? [])
    if (aiChanged || userChanged) {
      await onUpdateTags(url, localAiTags, localUserTags)
    }
  }

  if (!url) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
        color: theme.textMuted,
        fontSize: "0.875rem",
        textAlign: "center"
      }}>
        Select a bookmark to view details
      </div>
    )
  }

  const showAnalyzeButton = !record || record.status === "saved" || record.status === "error"
  const showClearButton = record && (record.status === "done" || record.status === "error" || record.status === "analyzing")

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: spacing.lg, borderBottom: `1px solid ${theme.borderMuted}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: theme.textMuted, marginBottom: spacing.sm }}>
          <span>{getBookmarkHost(url)}</span>
          {record ? (
            <>
              <span>•</span>
              <span>{formatBookmarkDate(record.createdAt)}</span>
            </>
          ) : null}
        </div>
        {record ? (
          <h3 style={{ margin: 0, fontSize: "1.4rem", lineHeight: 1.25, fontWeight: 800, color: theme.textPrimary }}>
            {record.title}
          </h3>
        ) : null}
      </div>
      <div style={{ flex: 1, padding: spacing.lg, display: "grid", gap: spacing.lg, alignContent: "start" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "0.75rem", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>URL</p>
          <a
            href={url}
            rel="noreferrer"
            style={{ fontSize: "0.8125rem", color: theme.accent, textDecoration: "none", wordBreak: "break-all" }}
            target="_blank"
          >
            {url}
          </a>
        </div>
        {record ? (
          <>
            <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: radius.pill, backgroundColor: theme.surfaceElevated, color: theme.textMuted }}>
                {record.status}
              </span>
              {record.provider ? (
                <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: radius.pill, backgroundColor: theme.accentSoft, color: theme.accent }}>
                  {record.provider} / {record.model}
                </span>
              ) : null}
            </div>
            {record.summary ? (
              <div style={{
                background: theme.accentSoft,
                border: `1px solid ${theme.border}`,
                borderRadius: "18px",
                padding: "22px",
                boxShadow: theme.isDark ? "0 10px 24px rgba(0,0,0,0.2)" : "0 1px 3px rgba(15,23,42,0.06)"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "10px", borderBottom: `1px solid ${theme.isDark ? theme.borderMuted : "rgba(224,231,255,0.9)"}` }}>
                  <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: theme.isDark ? theme.textMuted : "#3730a3", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Summary</p>
                  {showAnalyzeButton ? (
                    <button
                      onClick={() => void onAnalyze(url)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: theme.accent, fontWeight: 500, padding: 0 }}
                      type="button"
                    >
                      Re-generate
                    </button>
                  ) : null}
                </div>
                <p style={{ margin: 0, fontSize: "0.9375rem", color: theme.isDark ? theme.textSecondary : "#374151", lineHeight: 1.7 }}>{record.summary}</p>
              </div>
            ) : null}
            {(localAiTags.length + localUserTags.length > 0 || isEditingTags) ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <p style={{ margin: 0, fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Smart Tags</p>
                  <button
                    aria-label={isEditingTags ? "Done editing tags" : "Edit tags"}
                    data-testid="detail-tags-edit-button"
                    onClick={() => isEditingTags ? void handleDoneEditing() : setIsEditingTags(true)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "2px 4px", borderRadius: radius.small }}
                    type="button"
                  >
                    {isEditingTags ? "Done" : "✎"}
                  </button>
                </div>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: spacing.xs,
                  alignItems: "center",
                  padding: "12px",
                  border: `1px solid ${theme.border}`,
                  borderRadius: "14px",
                  backgroundColor: theme.isDark ? theme.surfaceSubtle : "rgba(249,250,251,0.8)",
                  boxShadow: theme.isDark ? "inset 0 1px 3px rgba(0,0,0,0.22)" : "inset 0 1px 3px rgba(15,23,42,0.05)",
                  minHeight: "48px"
                }}>
                  {localAiTags.map((tag) => (
                    <div key={`ai-${tag}`} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8125rem", padding: "5px 10px", borderRadius: "10px", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, boxShadow: theme.isDark ? "0 1px 2px rgba(0,0,0,0.28)" : "0 1px 2px rgba(15,23,42,0.06)", color: theme.textPrimary, fontWeight: 500 }}>
                      <span style={{ color: theme.accent }}>#</span>
                      {tag}
                      {isEditingTags ? (
                        <button
                          aria-label={`Remove tag ${tag}`}
                          data-testid="detail-tag-remove-button"
                          onClick={() => setLocalAiTags(localAiTags.filter((t) => t !== tag))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "0 0 0 2px", lineHeight: 1 }}
                          type="button"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {localUserTags.map((tag) => (
                    <div key={`user-${tag}`} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8125rem", padding: "5px 10px", borderRadius: "10px", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, boxShadow: theme.isDark ? "0 1px 2px rgba(0,0,0,0.28)" : "0 1px 2px rgba(15,23,42,0.06)", color: theme.textPrimary, fontWeight: 500 }}>
                      <span style={{ color: theme.accent }}>#</span>
                      {tag}
                      {isEditingTags ? (
                        <button
                          aria-label={`Remove tag ${tag}`}
                          data-testid="detail-tag-remove-button"
                          onClick={() => setLocalUserTags(localUserTags.filter((t) => t !== tag))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "0 0 0 2px", lineHeight: 1 }}
                          type="button"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {isEditingTags ? (
                    <input
                      data-testid="detail-tag-input"
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="+ Add custom tag..."
                      style={{ flex: 1, minWidth: "120px", background: "transparent", outline: "none", border: "none", padding: "4px 6px", color: theme.textPrimary, fontSize: "0.8125rem" }}
                      type="text"
                      value={tagInput}
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Smart Tags</p>
                <button
                  aria-label="Edit tags"
                  data-testid="detail-tags-edit-button"
                  onClick={() => setIsEditingTags(true)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "2px 4px", borderRadius: radius.small }}
                  type="button"
                >✎</button>
              </div>
            )}
            {record.status === "error" && record.errorMessage ? (
              <p style={{ margin: 0, fontSize: "0.8125rem", color: theme.textDanger }}>{record.errorMessage}</p>
            ) : null}
            <div style={{ fontSize: "0.75rem", color: theme.textMuted }}>
              <p style={{ margin: 0 }}>Saved {formatBookmarkDate(record.createdAt)}</p>
              <p style={{ margin: "2px 0 0" }}>Updated {formatBookmarkDate(record.updatedAt)}</p>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted }}>
            This bookmark has not been analyzed yet.
          </p>
        )}
      </div>
      <div style={{ padding: spacing.lg, borderTop: `1px solid ${theme.borderMuted}`, display: "flex", gap: spacing.sm }}>
        {showAnalyzeButton && !record?.summary ? (
          <button
            onClick={() => void onAnalyze(url)}
            style={{ flex: 1, padding: `${spacing.sm} ${spacing.md}`, border: "none", borderRadius: radius.medium, backgroundColor: theme.accent, color: "#fff", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
            type="button"
          >
            Analyze
          </button>
        ) : null}
        {showClearButton ? (
          <button
            onClick={() => void onClearAnalysis(url)}
            style={{ flex: 1, padding: `${spacing.sm} ${spacing.md}`, border: `1px solid ${theme.border}`, borderRadius: radius.medium, backgroundColor: "transparent", color: theme.textSecondary, fontWeight: 500, fontSize: "0.875rem", cursor: "pointer" }}
            type="button"
          >
            Clear analysis
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default Options
