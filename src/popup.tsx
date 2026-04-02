import "./styles/globals.css"
import React, { useEffect, useMemo, useState } from "react"

import { ErrorBanner } from "./components/error-banner"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { saveCurrentPage as defaultSaveCurrentPage } from "./features/bookmarks/save-current-page"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import { extractPage as defaultExtractPage } from "./lib/extraction/extract-page"
import { getMessage } from "./lib/i18n/messages"
import type { AiProvider } from "./lib/providers/provider"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import { openCurrentTabSidePanel, openDashboardTab, openSettingsPage } from "./lib/utils/navigation"
import type { BookmarkRecord } from "./types/bookmark"
import type { ProviderConfig } from "./types/settings"
import { ThemeProvider } from "./ui/theme-context"
import { useGlobalStyles } from "./ui/use-global-styles"
import { useTheme } from "./ui/use-theme"

type PopupProps = {
  services?: Partial<PopupServices>
}

type PopupServices = {
  bookmarkRepository: BookmarkRepository
  settingsRepository: SettingsRepository
  saveCurrentPage: typeof defaultSaveCurrentPage
  analyzeBookmark: typeof defaultAnalyzeBookmark
  extractPage: typeof defaultExtractPage
  queryActiveTab: () => Promise<ChromeTab | undefined>
  createProvider: (config: ProviderConfig) => AiProvider
  themeRepository: ThemeRepository
}

type ChromeTab = {
  id?: number
  title?: string | null
  url?: string | null
}

const DEFAULT_POPUP_SERVICES: PopupServices = {
  bookmarkRepository: new IndexedDbBookmarkRepository(),
  settingsRepository: new ChromeSettingsRepository(),
  saveCurrentPage: defaultSaveCurrentPage,
  analyzeBookmark: defaultAnalyzeBookmark,
  extractPage: defaultExtractPage,
  queryActiveTab: async () => {
    const [activeTab] = await (globalThis.chrome?.tabs?.query({
      active: true,
      currentWindow: true
    }) ?? Promise.resolve([]))

    return activeTab
  },
  createProvider: defaultCreateProvider,
  themeRepository: new ChromeThemeRepository()
}

function formatSavedStatus(title: string, t: (key: Parameters<typeof getMessage>[1]) => string): string {
  return `${t("popup.status.savedPrefix")}${title}`
}

function Popup({ services }: PopupProps) {
  const popupServices = useMemo(() => ({ ...DEFAULT_POPUP_SERVICES, ...services }), [services])
  const theme = useTheme(popupServices.themeRepository)
  useGlobalStyles(theme)

  const [displayLanguage, setDisplayLanguage] = useState<"en" | "zh">("en")
  const t = useMemo(() => (key: Parameters<typeof getMessage>[1]) => getMessage(displayLanguage, key), [displayLanguage])
  const [statusMessage, setStatusMessage] = useState(() => getMessage("en", "popup.status.ready"))
  const [statusTone, setStatusTone] = useState<"info" | "success">("info")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentPageTitle, setCurrentPageTitle] = useState(() => getMessage("en", "popup.currentPage.loading"))
  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null)
  const [savedBookmark, setSavedBookmark] = useState<BookmarkRecord | null>(null)

  useEffect(() => {
    void popupServices.settingsRepository.getAppSettings().then((settings) => {
      setDisplayLanguage(settings.displayLanguage)
      setStatusMessage(getMessage(settings.displayLanguage, "popup.status.ready"))
    })
  }, [popupServices])

  useEffect(() => {
    async function loadCurrentPage(): Promise<void> {
      try {
        const activeTab = await popupServices.queryActiveTab()
        const title = activeTab?.title?.trim() || t("popup.currentPage.unavailable")
        const url = activeTab?.url?.trim() || null
        setCurrentPageTitle(title)
        setCurrentPageUrl(url)

        if (!url) {
          setSavedBookmark(null)
          return
        }

        const bookmarks = await popupServices.bookmarkRepository.list()
        const match = bookmarks.find((bookmark) => bookmark.url === url) ?? null
        setSavedBookmark(match)
      } catch {
        setCurrentPageTitle(t("popup.currentPage.unavailable"))
        setCurrentPageUrl(null)
        setSavedBookmark(null)
      }
    }

    void loadCurrentPage()
  }, [popupServices, t])

  async function handleSaveCurrentPage(): Promise<void> {
    setIsSaving(true)
    setIsAnalyzing(false)
    setErrorMessage(null)
    setStatusTone("info")
    setStatusMessage(t("popup.status.saving"))

    try {
      const activeTab = await popupServices.queryActiveTab()
      const extractedText = typeof activeTab?.id === "number"
        ? await popupServices.extractPage(activeTab.id)
        : undefined
      const saved = await popupServices.saveCurrentPage({
        activeTab: activeTab ?? {},
        extractedText,
        bookmarkRepository: popupServices.bookmarkRepository
      })

      setCurrentPageTitle(saved.title)
      setCurrentPageUrl(saved.url)
      setSavedBookmark(saved)
      setStatusTone("success")
      setStatusMessage(formatSavedStatus(saved.title, t))
      await maybeAnalyzeBookmark(saved)
    } catch (error) {
      setErrorMessage(getSaveErrorMessage(error, t))
      setStatusTone("info")
      setStatusMessage(t("popup.status.ready"))
    } finally {
      setIsSaving(false)
    }
  }

  async function maybeAnalyzeBookmark(bookmark: BookmarkRecord): Promise<void> {
    const settings = await popupServices.settingsRepository.getAppSettings()

    if (!settings.autoAnalyzeOnSave) {
      return
    }

    const providers = await popupServices.settingsRepository.getProviders()
    const selectedProvider = providers.find(
      (provider) => provider.enabled && provider.provider === settings.defaultProvider
    )

    if (!selectedProvider?.apiKey.trim()) {
      setErrorMessage(t("popup.error.apiKeyMissing"))
      return
    }

    setIsAnalyzing(true)
    setStatusTone("info")
    setStatusMessage(t("popup.status.analyzing"))

    try {
      const analyzedBookmark = await popupServices.analyzeBookmark({
        bookmark,
        provider: popupServices.createProvider(selectedProvider),
        bookmarkRepository: popupServices.bookmarkRepository
      })
      setSavedBookmark(analyzedBookmark)
      setStatusTone("success")
      setStatusMessage(formatSavedStatus(bookmark.title, t))
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t("popup.error.analyzeFallback")))
      setStatusTone("success")
      setStatusMessage(formatSavedStatus(bookmark.title, t))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const rootStyle: React.CSSProperties = {
    width: "360px",
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.page,
    color: theme.textPrimary,
    display: "flex",
    flexDirection: "column",
    minHeight: "100%"
  }

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px",
    paddingBottom: "12px",
    backgroundColor: theme.surface,
    borderBottom: `1px solid ${theme.border}`
  }

  const iconButtonStyle: React.CSSProperties = {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    border: "none",
    backgroundColor: theme.page,
    color: theme.textSecondary,
    cursor: "pointer"
  }

  const primaryButtonStyle: React.CSSProperties = {
    width: "100%",
    border: "none",
    borderRadius: "8px",
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 500,
    padding: "10px 16px",
    cursor: "pointer"
  }

  return (
    <ThemeProvider theme={theme}>
      <main aria-labelledby="popup-title" style={rootStyle}>
        <div data-testid="popup-shell">
          <header style={headerStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", backgroundColor: theme.accent, color: "#fff", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✦
              </div>
              <span id="popup-title" style={{ fontWeight: 700, fontSize: "14px" }}>TabVault</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                aria-label={theme.isDark ? "Switch to light mode" : "Switch to dark mode"}
                data-testid="theme-toggle-button"
                onClick={() => theme.toggle()}
                style={iconButtonStyle}
                type="button"
              >
                {theme.isDark ? "☀️" : "🌙"}
              </button>
              <button
                aria-label={t("popup.actions.openSettings")}
                onClick={() => void openSettingsPage()}
                style={iconButtonStyle}
                type="button"
              >
                ⚙️
              </button>
            </div>
          </header>

          {savedBookmark ? (
            <PopupSyncedView
              bookmark={savedBookmark}
              errorMessage={errorMessage}
              onOpenDashboard={() => void openDashboardTab()}
              onOpenSidepanel={() => void openCurrentTabSidePanel()}
              theme={theme}
              t={t}
            />
          ) : (
            <PopupUnsyncedView
              currentPageTitle={currentPageTitle}
              currentPageUrl={currentPageUrl}
              errorMessage={errorMessage}
              isAnalyzing={isAnalyzing}
              isSaving={isSaving}
              onOpenDashboard={() => void openDashboardTab()}
              onOpenSidepanel={() => void openCurrentTabSidePanel()}
              onSave={() => void handleSaveCurrentPage()}
              theme={theme}
              t={t}
            />
          )}

          {statusTone === "success" ? (
            <p aria-live="polite" role="status" style={{ margin: 0, padding: "0 16px 12px", fontSize: "12px", color: theme.textSuccess }}>
              {statusMessage}
            </p>
          ) : null}
        </div>
      </main>
    </ThemeProvider>
  )
}

type PopupViewProps = {
  theme: ReturnType<typeof useTheme>
  t: (key: Parameters<typeof getMessage>[1]) => string
}

function PopupUnsyncedView({
  currentPageTitle,
  currentPageUrl,
  errorMessage,
  isAnalyzing,
  isSaving,
  onOpenDashboard,
  onOpenSidepanel,
  onSave,
  theme,
  t
}: PopupViewProps & {
  currentPageTitle: string
  currentPageUrl: string | null
  errorMessage: string | null
  isAnalyzing: boolean
  isSaving: boolean
  onOpenDashboard: () => void
  onOpenSidepanel: () => void
  onSave: () => void
}) {
  return (
    <div data-testid="popup-unsynced-view">
      <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
        <section style={{ borderRadius: "12px", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, padding: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase" }}>{t("popup.currentPage.label")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "2px 8px", borderRadius: "9999px", border: `1px solid ${theme.border}`, fontSize: "10px", color: theme.textSecondary }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "9999px", border: `1px solid ${theme.textSecondary}` }} />
              尚未收录
            </div>
          </div>
          <div style={{ display: "grid", gap: "4px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>{currentPageTitle}</div>
            <div style={{ fontSize: "10px", color: theme.textSecondary }}>{currentPageUrl}</div>
          </div>
        </section>

        <section style={{ borderRadius: "12px", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, padding: "12px" }}>
          <div style={{ border: `1px dashed ${theme.accent}`, borderRadius: "8px", padding: "20px 12px", backgroundColor: theme.surfaceSubtle, textAlign: "center" }}>
            <div style={{ fontSize: "20px", marginBottom: "8px" }}>✨</div>
            <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "6px" }}>让 AI 帮你阅读这篇文章</div>
            <div style={{ fontSize: "10px", color: theme.textSecondary, lineHeight: 1.6 }}>
              点击下方按钮，TabVault 将自动提取核心要点并生成智能标签，存入你的数字大脑。
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gap: "8px" }}>
          <button data-testid="popup-primary-action" onClick={onSave} style={{ width: "100%", border: "none", borderRadius: "8px", backgroundColor: theme.accent, color: "#fff", padding: "10px 16px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }} type="button">
            {isAnalyzing ? t("popup.primary.analyzing") : isSaving ? t("popup.primary.saving") : t("popup.primary.save")}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button data-testid="popup-open-sidepanel" onClick={onOpenSidepanel} style={{ borderRadius: "8px", border: `1px solid ${theme.border}`, backgroundColor: theme.surface, padding: "8px 12px", fontSize: "12px", color: theme.textPrimary }} type="button">{t("popup.actions.openSidepanel")}</button>
            <button data-testid="popup-open-dashboard" onClick={onOpenDashboard} style={{ borderRadius: "8px", border: `1px solid ${theme.border}`, backgroundColor: theme.surface, padding: "8px 12px", fontSize: "12px", color: theme.textPrimary }} type="button">{t("popup.actions.openDashboard")}</button>
          </div>
        </div>

        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      </div>
    </div>
  )
}

function PopupSyncedView({
  bookmark,
  errorMessage,
  onOpenDashboard,
  onOpenSidepanel,
  theme,
  t
}: PopupViewProps & {
  bookmark: BookmarkRecord
  errorMessage: string | null
  onOpenDashboard: () => void
  onOpenSidepanel: () => void
}) {
  return (
    <div data-testid="popup-synced-view">
      <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase" }}>{t("popup.currentPage.label")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "2px 8px", borderRadius: "9999px", backgroundColor: theme.accentSoft, color: theme.accent, fontSize: "10px", fontWeight: 600 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "9999px", backgroundColor: theme.accent }} />
            In library
          </div>
        </div>

        <section style={{ borderRadius: "12px", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, padding: "12px" }}>
          <div style={{ display: "grid", gap: "4px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>{bookmark.title}</div>
            <div style={{ fontSize: "10px", color: theme.textSecondary }}>{bookmark.url}</div>
          </div>
          {bookmark.summary ? (
            <div style={{ marginTop: "12px", borderRadius: "8px", backgroundColor: theme.surfaceSubtle, border: `1px solid ${theme.border}`, padding: "8px 10px", fontSize: "11px", color: theme.textSecondary, lineHeight: 1.6 }}>
              {bookmark.summary}
            </div>
          ) : null}
          {bookmark.aiTags.length > 0 || bookmark.userTags.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
              {[...bookmark.aiTags, ...bookmark.userTags].map((tag) => (
                <span key={tag} style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "6px", backgroundColor: theme.page, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <div style={{ display: "grid", gap: "8px" }}>
          <button data-testid="popup-primary-action" onClick={onOpenSidepanel} style={{ width: "100%", border: "none", borderRadius: "8px", backgroundColor: theme.accent, color: "#fff", padding: "10px 16px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }} type="button">
            💬 {t("popup.actions.openSidepanel")}
          </button>
          <button data-testid="popup-open-dashboard" onClick={onOpenDashboard} style={{ width: "100%", borderRadius: "8px", border: `1px solid ${theme.border}`, backgroundColor: theme.surface, padding: "8px 12px", fontSize: "12px", color: theme.textPrimary }} type="button">
            {t("popup.actions.openDashboard")}
          </button>
        </div>

        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      </div>
    </div>
  )
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function getSaveErrorMessage(error: unknown, t: (key: Parameters<typeof getMessage>[1]) => string): string {
  const message = getErrorMessage(error, t("popup.error.saveFallback"))

  if (message === "Active tab title is required" || message === "Active tab URL is required") {
    return t("popup.error.saveUnavailableMetadata")
  }

  return message
}

export default Popup
