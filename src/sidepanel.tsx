import "./styles/globals.css"
import React, { useCallback, useEffect, useMemo, useState } from "react"

import { BookmarkDrawer } from "./components/bookmark-drawer"
import { ErrorBanner } from "./components/error-banner"
import { HybridContextBar } from "./components/hybrid-context-bar"
import { HybridQueryStream } from "./components/hybrid-query-stream"
import { LicenseActivation } from "./components/license-activation"
import { TrialBanner } from "./components/trial-banner"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { buildActionCards, type ActionCard } from "./features/hybrid-retrieval/build-action-cards"
import type { AnswerBlock } from "./features/hybrid-retrieval/build-answer-block"
import {
  buildCurrentPageFallbackResults,
  buildGhostreaderContent,
  buildLocalizedAnswerBlock,
  getGhostreaderFallbackTitle,
  shouldFallbackToLocalGhostreaderAnswer
} from "./features/hybrid-retrieval/ghostreader"
import { detectGhostreaderQueryMode } from "./features/hybrid-retrieval/query-intent"
import { retrieveHybridResults } from "./features/hybrid-retrieval/retrieve-hybrid-results"
import type { RankedHybridResult } from "./features/hybrid-retrieval/rank-hybrid-results"
import { APP_SETTINGS_KEY, ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import { extractPage as defaultExtractPage } from "./lib/extraction/extract-page"
import { getLocalizedErrorMessage } from "./lib/i18n/error-messages"
import { getMessage } from "./lib/i18n/messages"
import type { AiProvider } from "./lib/providers/provider"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import { openDashboardTab } from "./lib/utils/navigation"
import { validateLicenseKey } from "./lib/trial/license-service"
import { TrialRepository } from "./lib/trial/trial-repository"
import { useTrialStatus } from "./lib/trial/use-trial-status"
import type { BookmarkRecord } from "./types/bookmark"
import type { ProviderConfig } from "./types/settings"
import type { GhostreaderQueryMode } from "./features/hybrid-retrieval/hybrid-types"
import { radius, spacing } from "./ui/design-tokens"
import { ThemeProvider } from "./ui/theme-context"
import { useGlobalStyles } from "./ui/use-global-styles"
import { useTheme } from "./ui/use-theme"

const SHOW_TRIAL_PROMOTION_UI = false

type SidePanelProps = {
  services?: Partial<SidePanelServices>
}

type SidePanelServices = {
  bookmarkRepository: BookmarkRepository
  settingsRepository: SettingsRepository
  themeRepository: ThemeRepository
  analyzeBookmark: typeof defaultAnalyzeBookmark
  createProvider: (config: ProviderConfig) => AiProvider
  extractPage: typeof defaultExtractPage
  queryActiveTab: () => Promise<{ id?: number; title?: string | null; url?: string | null } | undefined>
}

const DEFAULT_SIDEPANEL_SERVICES: SidePanelServices = {
  bookmarkRepository: new IndexedDbBookmarkRepository(),
  settingsRepository: new ChromeSettingsRepository(),
  themeRepository: new ChromeThemeRepository(),
  analyzeBookmark: defaultAnalyzeBookmark,
  createProvider: defaultCreateProvider,
  extractPage: defaultExtractPage,
  queryActiveTab: async () => {
    const [activeTab] = await (globalThis.chrome?.tabs?.query({ active: true, currentWindow: true }) ?? Promise.resolve([]))
    return activeTab
  }
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

function formatCurrentPageTitle(title?: string): string {
  return title ? `\u300a${title}\u300b` : ""
}

export default function SidePanel({ services }: SidePanelProps) {
  const sidePanelServices = useMemo(() => ({ ...DEFAULT_SIDEPANEL_SERVICES, ...services }), [services])
  const theme = useTheme(sidePanelServices.themeRepository)
  useGlobalStyles(theme)

  const trial = useTrialStatus()
  const trialUiStatus = !SHOW_TRIAL_PROMOTION_UI && trial.status && trial.status !== "licensed" ? "licensed" : trial.status
  const trialRepository = useMemo(() => new TrialRepository(), [])
  const [displayLanguage, setDisplayLanguage] = useState<"en" | "zh">("en")
  const t = useMemo(() => (key: Parameters<typeof getMessage>[1]) => getMessage(displayLanguage, key), [displayLanguage])
  const [isActivationExpanded, setIsActivationExpanded] = useState(false)
  const [licenseKeyInput, setLicenseKeyInput] = useState("")
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [isSubmittingLicense, setIsSubmittingLicense] = useState(false)
  const [status, setStatus] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [ghostreaderInput, setGhostreaderInput] = useState("")
  const [activeView, setActiveView] = useState<"search" | "ask" | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedBookmark, setSelectedBookmark] = useState<BookmarkRecord | null>(null)
  const [localAnalyzingIds, setLocalAnalyzingIds] = useState<Set<string>>(new Set())
  const [currentPageContext, setCurrentPageContext] = useState<{ title?: string; url?: string; extractedText?: string } | null>(null)
  const [searchResults, setSearchResults] = useState<RankedHybridResult[]>([])
  const [searchActionCards, setSearchActionCards] = useState<ActionCard[]>([])
  const [searchAnswerBlock, setSearchAnswerBlock] = useState<AnswerBlock | null>(null)
  const [submittedGhostreaderQuery, setSubmittedGhostreaderQuery] = useState("")
  const [submittedGhostreaderMode, setSubmittedGhostreaderMode] = useState<GhostreaderQueryMode>("current-only")
  const [ghostreaderResults, setGhostreaderResults] = useState<RankedHybridResult[]>([])
  const [ghostreaderActionCards, setGhostreaderActionCards] = useState<ActionCard[]>([])
  const [ghostreaderAnswerBlock, setGhostreaderAnswerBlock] = useState<AnswerBlock | null>(null)
  const [isGhostreaderSubmitting, setIsGhostreaderSubmitting] = useState(false)

  const displayedBookmarks = useMemo(
    () => bookmarks.map((bookmark) =>
      localAnalyzingIds.has(bookmark.id) && bookmark.status !== "analyzing"
        ? { ...bookmark, status: "analyzing" as const }
        : bookmark
    ),
    [bookmarks, localAnalyzingIds]
  )

  useEffect(() => {
    void sidePanelServices.settingsRepository.getAppSettings().then((settings) => {
      setDisplayLanguage(settings.displayLanguage)
    })
  }, [sidePanelServices])

  useEffect(() => {
    function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>, areaName?: string) {
      if (areaName && areaName !== "sync") {
        return
      }

      const newValue = changes[APP_SETTINGS_KEY]?.newValue
      if (newValue && typeof newValue === "object" && "displayLanguage" in newValue) {
        const lang = (newValue as { displayLanguage: unknown }).displayLanguage
        if (lang === "en" || lang === "zh") {
          setDisplayLanguage(lang)
        }
      }
    }

    globalThis.chrome?.storage?.onChanged?.addListener(handleStorageChange)
    return () => globalThis.chrome?.storage?.onChanged?.removeListener(handleStorageChange)
  }, [])

  useEffect(() => {
    void loadBookmarks()
  }, [])

  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "IMPORT_COMPLETE" || message.type === "ANALYSIS_COMPLETE") {
        void loadBookmarks()
      }
      if (message.type === "BOOKMARKS_CHANGED") {
        void loadBookmarks()
      }
    }
    globalThis.chrome?.runtime?.onMessage.addListener(listener)

    return () => globalThis.chrome?.runtime?.onMessage.removeListener(listener)
  }, [])

  useEffect(() => {
    async function loadCurrentPage() {
      const tab = await sidePanelServices.queryActiveTab()
      if (!tab?.id) return
      const extractedText = await sidePanelServices.extractPage(tab.id)
      setCurrentPageContext({ title: tab.title ?? undefined, url: tab.url ?? undefined, extractedText })
    }

    void loadCurrentPage()
  }, [sidePanelServices])

  const runHybridRetrieval = useCallback(async (query: string) => {
    const results = await retrieveHybridResults({
      query,
      currentPage: currentPageContext ?? {},
      listBookmarks: () => sidePanelServices.bookmarkRepository.list()
    })

    const hasCurrentPage = results.some((result) => result.document.sourceType === "current-page")
    const hasSavedMatches = results.some((result) => result.document.sourceType === "saved-bookmark")
    const actions = buildActionCards({ hasCurrentPage, hasSavedMatches }).map((action) => ({
      ...action,
      label:
        action.id === "ask-current-page"
          ? t("hybrid.action.askCurrentPage")
          : action.id === "ask-top-matches"
            ? t("hybrid.action.askTopMatches")
            : t("hybrid.action.openDashboard")
    }))

    return { results, actions }
  }, [currentPageContext, sidePanelServices, t])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults([])
      setSearchActionCards([])
      setSearchAnswerBlock(null)
      if (activeView === "search") {
        setActiveView(submittedGhostreaderQuery ? "ask" : null)
      }
      return
    }

    let cancelled = false

    async function syncSearchResults() {
      const { results, actions } = await runHybridRetrieval(query)
      if (cancelled) {
        return
      }

      setSearchResults(results)
      setSearchActionCards(actions)
      setSearchAnswerBlock(null)
    }

    void syncSearchResults()

    return () => {
      cancelled = true
    }
  }, [activeView, runHybridRetrieval, searchQuery, submittedGhostreaderQuery])

  const activeQuery = activeView === "search" ? searchQuery.trim() : submittedGhostreaderQuery
  const activeRankedResults = activeView === "search" ? searchResults : ghostreaderResults
  const activeActionCards = activeView === "search" ? searchActionCards : ghostreaderActionCards
  const activeAnswerBlock = activeView === "search" ? searchAnswerBlock : ghostreaderAnswerBlock
  const shouldShowQueryStream = Boolean(activeView && activeQuery)

  async function loadBookmarks(): Promise<void> {
    setIsLoadingBookmarks(true)

    try {
      const savedBookmarks = await sidePanelServices.bookmarkRepository.list()
      setBookmarks(savedBookmarks)
    } catch (error) {
      setErrorMessage(getLocalizedErrorMessage(displayLanguage, error, "sidepanel.error.loadBookmarks"))
    } finally {
      setIsLoadingBookmarks(false)
    }
  }

  const handleLicenseSubmit = useCallback(async () => {
    setLicenseError(null)
    setIsSubmittingLicense(true)

    try {
      const result = await validateLicenseKey(licenseKeyInput)
      if (result !== "valid") {
        setLicenseError(t("settings.license.invalid"))
        return
      }

      const currentState = await trialRepository.get()
      await trialRepository.save({
        ...(currentState ?? { installedAt: new Date().toISOString(), analysisUsed: 0 }),
        licenseKey: licenseKeyInput,
        licenseStatus: "valid",
        licenseValidatedAt: new Date().toISOString()
      })
      await trial.reload()
      setIsActivationExpanded(false)
      setLicenseKeyInput("")
    } catch (error) {
      setLicenseError(getLocalizedErrorMessage(displayLanguage, error, "sidepanel.error.activateLicense"))
    } finally {
      setIsSubmittingLicense(false)
    }
  }, [licenseKeyInput, t, trial, trialRepository])

  async function handleAnalyzeBookmark(id: string): Promise<void> {
    const settings = await sidePanelServices.settingsRepository.getAppSettings()
    const providers = await sidePanelServices.settingsRepository.getProviders()
    const selectedProvider = providers.find(
      (provider) => provider.enabled && provider.provider === settings.defaultProvider
    )

    if (!selectedProvider?.apiKey.trim()) {
      setErrorMessage(t("sidepanel.apiKeyMissing"))
      return
    }

    const bookmark = bookmarks.find((item) => item.id === id)
    if (!bookmark) return

    setLocalAnalyzingIds((prev) => new Set([...prev, id]))
    setErrorMessage(null)

    try {
      await sidePanelServices.analyzeBookmark({
        bookmark,
        provider: sidePanelServices.createProvider(selectedProvider),
        bookmarkRepository: sidePanelServices.bookmarkRepository
      })
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(getLocalizedErrorMessage(displayLanguage, error, "sidepanel.error.analyzeFailed"))
    } finally {
      setLocalAnalyzingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleUpdateTags(id: string, aiTags: string[], userTags: string[]): Promise<void> {
    const bookmark = bookmarks.find((item) => item.id === id)
    if (!bookmark) return

    try {
      await sidePanelServices.bookmarkRepository.update({
        ...bookmark,
        aiTags,
        userTags,
        updatedAt: new Date().toISOString()
      })
      await loadBookmarks()
    } catch (error) {
      setErrorMessage(getLocalizedErrorMessage(displayLanguage, error, "sidepanel.error.updateTags"))
    }
  }

  async function handleImport(): Promise<void> {
    setIsImporting(true)
    setStatus(t("sidepanel.import.syncing"))
    setErrorMessage(null)

    globalThis.chrome?.runtime?.sendMessage({ type: "IMPORT_BOOKMARKS" }, (response: any) => {
      setIsImporting(false)
      if (response?.success) {
        setStatus(t("sidepanel.import.success").replace("{count}", String(response.count)))
        void loadBookmarks()
      } else {
        setStatus("")
        setErrorMessage(t("sidepanel.error.importFailed"))
      }
    })
  }

  async function handleGhostreaderSubmit(): Promise<void> {
    const query = ghostreaderInput.trim()
    if (isGhostreaderSubmitting || !query) {
      return
    }
    const queryMode = detectGhostreaderQueryMode(query)

    setGhostreaderInput("")
    setSubmittedGhostreaderQuery(query)
    setSubmittedGhostreaderMode(queryMode)
    setActiveView("ask")
    setGhostreaderAnswerBlock(null)
    setErrorMessage(null)
    setIsGhostreaderSubmitting(true)

    try {
      const settings = await sidePanelServices.settingsRepository.getAppSettings()
      const providers = await sidePanelServices.settingsRepository.getProviders()
      const selectedProvider = providers.find(
        (provider) => provider.enabled && provider.provider === settings.defaultProvider
      )

      if (!selectedProvider?.apiKey.trim()) {
        setGhostreaderResults([])
        setGhostreaderActionCards([])
        setGhostreaderAnswerBlock(null)
        setErrorMessage(t("sidepanel.apiKeyMissing"))
        return
      }

      const { results, actions } =
        queryMode === "cross-bookmark"
          ? await runHybridRetrieval(query)
          : { results: [] as RankedHybridResult[], actions: [] as ActionCard[] }
      setGhostreaderResults(results)
      setGhostreaderActionCards(actions)

      const provider = sidePanelServices.createProvider(selectedProvider)
      const analysis = await provider.analyze({
        title: currentPageContext?.title ?? getGhostreaderFallbackTitle(displayLanguage),
        url: currentPageContext?.url ?? "https://tabvault.local/ghostreader",
        content: buildGhostreaderContent({
          language: displayLanguage,
          query,
          currentPageContext,
          rankedResults: results,
          mode: queryMode
        }),
        summaryLanguage: settings.summaryLanguage
      })

      setGhostreaderAnswerBlock({
        text: analysis.summary,
        citations:
          queryMode === "cross-bookmark"
            ? results.slice(0, 3).map((result) => ({
                sourceType: result.document.sourceType,
                title: result.document.title,
                url: result.document.url,
                matchReason: result.matchReason
              }))
            : []
      })
    } catch (error) {
      if (shouldFallbackToLocalGhostreaderAnswer(error)) {
        if (queryMode === "current-only") {
          setGhostreaderResults([])
          setGhostreaderActionCards([])
          setGhostreaderAnswerBlock(
            buildLocalizedAnswerBlock(
              displayLanguage,
              t("hybrid.query.query"),
              query,
              buildCurrentPageFallbackResults(currentPageContext)
            )
          )
          return
        }

        const { results, actions } = await runHybridRetrieval(query)
        setGhostreaderResults(results)
        setGhostreaderActionCards(actions)
        setGhostreaderAnswerBlock(buildLocalizedAnswerBlock(displayLanguage, t("hybrid.query.query"), query, results))
        return
      }

      setErrorMessage(getLocalizedErrorMessage(displayLanguage, error, "sidepanel.error.ghostreaderFailed"))
    } finally {
      setIsGhostreaderSubmitting(false)
    }
  }

  async function handleHybridAction(actionId: ActionCard["id"]): Promise<void> {
    if (actionId === "open-dashboard") {
      await openDashboardTab()
      return
    }

    if (!activeQuery) {
      return
    }

    const setActiveAnswer = (nextAnswer: AnswerBlock) => {
      if (activeView === "search") {
        setSearchAnswerBlock(nextAnswer)
        return
      }

      setGhostreaderAnswerBlock(nextAnswer)
    }

    if (actionId === "ask-current-page") {
      const currentPageResults = activeRankedResults.filter((result) => result.document.sourceType === "current-page")
      setActiveAnswer(buildLocalizedAnswerBlock(displayLanguage, t("hybrid.query.query"), activeQuery, currentPageResults))
      return
    }

    if (actionId === "ask-top-matches") {
      setActiveAnswer(buildLocalizedAnswerBlock(displayLanguage, t("hybrid.query.query"), activeQuery, activeRankedResults.slice(0, 3)))
    }
  }

  function handleSearchQueryChange(value: string): void {
    setSearchQuery(value)
    setActiveView(value.trim() ? "search" : submittedGhostreaderQuery ? "ask" : null)
  }

  function handleSearchQueryClear(): void {
    setSearchQuery("")
    setSearchResults([])
    setSearchActionCards([])
    setSearchAnswerBlock(null)
    setActiveView(submittedGhostreaderQuery ? "ask" : null)
  }

  const pageStyle: React.CSSProperties = {
    backgroundColor: theme.page,
    minHeight: "100vh",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    borderLeft: `1px solid ${theme.border}`
  }

  const headerStyle: React.CSSProperties = {
    padding: spacing.md,
    borderBottom: `1px solid ${theme.border}`,
    backgroundColor: theme.surface,
    display: "flex",
    flexDirection: "column",
    gap: spacing.sm,
    flexShrink: 0
  }

  const searchInputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px 10px 36px",
    border: `1px solid ${theme.border}`,
    borderRadius: radius.medium,
    backgroundColor: theme.page,
    color: theme.textPrimary,
    fontSize: "0.875rem",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
  }

  const importButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}`,
    border: "none",
    borderRadius: radius.large,
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontWeight: 500,
    fontSize: "0.875rem",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
  }

  return (
    <ThemeProvider theme={theme}>
      <main style={pageStyle}>
        <header style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
              <div aria-hidden="true" style={{ width: "28px", height: "28px", backgroundColor: theme.accent, borderRadius: radius.medium, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.875rem" }}>TV</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: theme.textPrimary }}>Ghostreader</div>
                <div style={{ marginTop: 2, fontSize: "0.75rem", color: theme.textMuted }}>{t("sidepanel.header.tagline")}</div>
              </div>
            </div>
            <button
              aria-label={theme.isDark ? t("common.theme.switchToLight") : t("common.theme.switchToDark")}
              data-testid="theme-toggle-button"
              onClick={() => theme.toggle()}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.125rem",
                color: theme.textMuted,
                padding: "4px",
                borderRadius: radius.small,
                lineHeight: 1
              }}
              type="button"
            >
              <span aria-hidden="true">{theme.isDark ? "L" : "D"}</span>
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <label htmlFor="sidepanel-search" style={visuallyHiddenStyle}>{t("sidepanel.search.label")}</label>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: theme.textMuted,
                fontSize: "0.875rem",
                lineHeight: 1
              }}
            >
              S
            </span>
            <input
              id="sidepanel-search"
              onChange={(event) => handleSearchQueryChange(event.target.value)}
              placeholder={t("sidepanel.search.placeholder")}
              style={{ ...searchInputStyle, paddingRight: searchQuery ? "36px" : "12px" }}
              type="search"
              value={searchQuery}
            />
            {searchQuery ? (
              <button
                aria-label={t("sidepanel.search.clear")}
                data-testid="sidepanel-search-clear"
                onClick={handleSearchQueryClear}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  color: theme.textMuted,
                  cursor: "pointer",
                  fontSize: "1rem",
                  lineHeight: 1,
                  padding: 0
                }}
                type="button"
              >
                <span aria-hidden="true">X</span>
              </button>
            ) : null}
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

          {SHOW_TRIAL_PROMOTION_UI && (trialUiStatus === "trial" || trialUiStatus === "expired") ? (
            <div style={{ padding: `0 ${spacing.md} ${spacing.sm}` }}>
              <TrialBanner
                ctaLabel={trialUiStatus === "trial" ? t("sidepanel.trial.activate") : t("sidepanel.trial.unlock")}
                message={trialUiStatus === "trial" ? t("sidepanel.trial.try") : t("sidepanel.trial.locked")}
                onCtaClick={() => setIsActivationExpanded(true)}
                status={trialUiStatus}
                title={trialUiStatus === "trial" ? t("trialBanner.title.trial") : t("trialBanner.title.expired")}
              />
              {isActivationExpanded ? (
                <div style={{ marginTop: spacing.sm }}>
                  <LicenseActivation
                    copy={getLicenseActivationCopy(t)}
                    errorMessage={licenseError}
                    isLicensed={false}
                    isSubmitting={isSubmittingLicense}
                    language={displayLanguage}
                    licenseKey={licenseKeyInput}
                    onLicenseKeyChange={setLicenseKeyInput}
                    onSubmit={handleLicenseSubmit}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? <div style={{ padding: `0 ${spacing.md} ${spacing.sm}` }}><ErrorBanner language={displayLanguage} message={errorMessage} /></div> : null}
          {status ? <p style={{ margin: `0 ${spacing.md} ${spacing.sm}`, fontSize: "0.8125rem", color: theme.textSuccess }}>{status}</p> : null}

          <div style={{ padding: `0 ${spacing.md} ${spacing.sm}` }}>
            <HybridContextBar currentPageTitle={currentPageContext?.title} indexedBookmarkCount={bookmarks.length} language={displayLanguage} />
          </div>

          <section style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: `0 ${spacing.md} ${spacing.md}` }}>
            {shouldShowQueryStream ? (
              <HybridQueryStream
                query={activeQuery}
                rankedResults={activeRankedResults}
                actions={activeActionCards}
                answer={activeAnswerBlock}
                language={displayLanguage}
                showSupportingResults={activeView === "search" || submittedGhostreaderMode === "cross-bookmark"}
                onOpenBookmark={(bookmarkId) => {
                  const bookmark = bookmarks.find((item) => item.id === bookmarkId) ?? null
                  setSelectedBookmark(bookmark)
                }}
                onAction={(actionId) => {
                  void handleHybridAction(actionId)
                }}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                <div style={{
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: radius.xl,
                  borderTopLeftRadius: radius.small,
                  padding: spacing.md,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  maxWidth: "90%"
                }} data-testid="ghostreader-welcome-card">
                  <p style={{ margin: `0 0 ${spacing.sm}`, fontSize: "0.875rem", color: theme.textPrimary, lineHeight: 1.5 }}>
                    {t("sidepanel.welcome.prompt").replace("{title}", formatCurrentPageTitle(currentPageContext?.title))}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.xs }}>
                    <span style={{ fontSize: "0.6875rem", backgroundColor: theme.page, border: `1px solid ${theme.border}`, padding: "4px 8px", borderRadius: radius.pill, color: theme.textSecondary }}>{t("sidepanel.welcome.chip.summarize")}</span>
                    <span style={{ fontSize: "0.6875rem", backgroundColor: theme.page, border: `1px solid ${theme.border}`, padding: "4px 8px", borderRadius: radius.pill, color: theme.textSecondary }}>{t("sidepanel.welcome.chip.codeSnippets")}</span>
                  </div>
                </div>

                {isLoadingBookmarks ? (
                  <p style={{ fontSize: "0.875rem", color: theme.textMuted }}>{t("sidepanel.bookmarks.loading")}</p>
                ) : displayedBookmarks.length > 0 ? (
                  <div style={{ fontSize: "0.75rem", color: theme.textMuted }}>
                    {t("sidepanel.bookmarks.connectedPrefix").replace("{count}", String(displayedBookmarks.length))}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <footer style={{ padding: spacing.md, borderTop: `1px solid ${theme.border}`, backgroundColor: theme.surface }}>
          <div style={{ position: "relative" }}>
            <input
              data-testid="ghostreader-input"
              onChange={(event) => setGhostreaderInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleGhostreaderSubmit()
                }
              }}
              placeholder={t("sidepanel.input.placeholder")}
              style={{ ...searchInputStyle, paddingRight: "42px", borderRadius: radius.large }}
              type="text"
              value={ghostreaderInput}
            />
            <button
              aria-label={t("sidepanel.input.submit")}
              data-testid="ghostreader-submit"
              disabled={isGhostreaderSubmitting}
              onClick={() => void handleGhostreaderSubmit()}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "28px",
                height: "28px",
                border: "none",
                borderRadius: radius.medium,
                backgroundColor: theme.accent,
                color: "#ffffff",
                cursor: "pointer"
              }}
              type="button"
            >
              <span aria-hidden="true">{isGhostreaderSubmitting ? "..." : "->"}</span>
            </button>
          </div>
          <div style={{ marginTop: spacing.sm }}>
            <button data-testid="sidepanel-import-button" disabled={isImporting} onClick={() => void handleImport()} style={importButtonStyle} type="button">
              {isImporting ? t("sidepanel.import.syncing") : t("sidepanel.import.button")}
            </button>
          </div>
        </footer>

        <BookmarkDrawer
          bookmark={selectedBookmark}
          onClose={() => setSelectedBookmark(null)}
          language={displayLanguage}
          onAnalyze={async (id) => {
            setSelectedBookmark(null)
            await handleAnalyzeBookmark(id)
          }}
          onClearAnalysis={async () => {
            setSelectedBookmark(null)
          }}
          onUpdateTags={handleUpdateTags}
        />
      </main>
    </ThemeProvider>
  )
}

const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0
}

