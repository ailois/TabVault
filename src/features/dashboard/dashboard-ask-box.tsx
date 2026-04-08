import React, { useEffect, useMemo, useRef, useState } from "react"

import { HybridQueryStream } from "../../components/hybrid-query-stream"
import { buildActionCards, type ActionCard } from "../../features/hybrid-retrieval/build-action-cards"
import type { AnswerBlock } from "../../features/hybrid-retrieval/build-answer-block"
import {
  buildCurrentPageFallbackResults,
  buildGhostreaderContent,
  buildLocalizedAnswerBlock,
  getGhostreaderFallbackTitle,
  shouldFallbackToLocalGhostreaderAnswer
} from "../../features/hybrid-retrieval/ghostreader"
import type { GhostreaderQueryMode } from "../../features/hybrid-retrieval/hybrid-types"
import { detectGhostreaderQueryMode } from "../../features/hybrid-retrieval/query-intent"
import { retrieveHybridResults } from "../../features/hybrid-retrieval/retrieve-hybrid-results"
import type { RankedHybridResult } from "../../features/hybrid-retrieval/rank-hybrid-results"
import { DEFAULT_APP_SETTINGS } from "../../features/settings/default-settings"
import type { SettingsRepository } from "../../lib/config/settings-repository"
import { getLocalizedErrorMessage } from "../../lib/i18n/error-messages"
import { getMessage } from "../../lib/i18n/messages"
import type { AiProvider } from "../../lib/providers/provider"
import { createProvider as defaultCreateProvider } from "../../lib/providers/provider-factory"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage, ProviderConfig } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import { DashboardIcon } from "./dashboard-icons"

type DashboardAskBoxProps = {
  bookmark: BookmarkRecord | null
  bookmarks?: BookmarkRecord[]
  language?: DisplayLanguage
  settingsRepository?: SettingsRepository
  createProvider?: (config: ProviderConfig) => AiProvider
  onOpenBookmark?: (bookmarkId: string) => void
}

function getLocalizedActions(
  t: (key: Parameters<typeof getMessage>[1]) => string,
  results: RankedHybridResult[]
): ActionCard[] {
  const hasCurrentPage = results.some((result) => result.document.sourceType === "current-page")
  const hasSavedMatches = results.some((result) => result.document.sourceType === "saved-bookmark")

  return buildActionCards({ hasCurrentPage, hasSavedMatches })
    .filter((action) => action.id !== "open-dashboard")
    .map((action) => ({
      ...action,
      label:
        action.id === "ask-current-page"
          ? t("hybrid.action.askCurrentPage")
          : t("hybrid.action.askTopMatches")
    }))
}

function buildBookmarkContext(bookmark: BookmarkRecord | null) {
  if (!bookmark) {
    return null
  }

  const extractedText = [bookmark.summary ?? "", bookmark.userNotes ?? "", bookmark.extractedText ?? ""]
    .filter(Boolean)
    .join("\n\n")
  return {
    title: bookmark.title,
    url: bookmark.url,
    extractedText
  }
}

export function DashboardAskBox({
  bookmark,
  bookmarks,
  language = "en",
  settingsRepository,
  createProvider = defaultCreateProvider,
  onOpenBookmark
}: DashboardAskBoxProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [submittedMode, setSubmittedMode] = useState<GhostreaderQueryMode>("current-only")
  const [rankedResults, setRankedResults] = useState<RankedHybridResult[]>([])
  const [actions, setActions] = useState<ActionCard[]>([])
  const [answer, setAnswer] = useState<AnswerBlock | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const requestIdRef = useRef(0)
  const bookmarkContext = useMemo(() => buildBookmarkContext(bookmark), [bookmark])
  const availableBookmarks = useMemo(() => {
    if (bookmarks && bookmarks.length > 0) {
      return bookmarks
    }

    return bookmark ? [bookmark] : []
  }, [bookmark, bookmarks])
  const canSubmit = Boolean(bookmark && query.trim()) && !isSubmitting

  useEffect(() => {
    requestIdRef.current += 1
    setQuery("")
    setSubmittedQuery("")
    setSubmittedMode("current-only")
    setRankedResults([])
    setActions([])
    setAnswer(null)
    setErrorMessage(null)
    setIsSubmitting(false)
  }, [bookmark?.id])

  async function runHybridRetrieval(nextQuery: string) {
    const nextResults = await retrieveHybridResults({
      query: nextQuery,
      currentPage: bookmarkContext ?? {},
      listBookmarks: async () => availableBookmarks
    })
    return {
      results: nextResults,
      actions: getLocalizedActions(t, nextResults)
    }
  }

  async function handleSubmit(): Promise<void> {
    const trimmedQuery = query.trim()
    if (isSubmitting || !bookmark || !trimmedQuery) {
      return
    }
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const queryMode = detectGhostreaderQueryMode(trimmedQuery)
    let nextState: { results: RankedHybridResult[]; actions: ActionCard[] } = {
      results: [],
      actions: []
    }

    setQuery("")
    setSubmittedQuery(trimmedQuery)
    setSubmittedMode(queryMode)
    setAnswer(null)
    setErrorMessage(null)
    setIsSubmitting(true)
    setRankedResults([])
    setActions([])

    try {
      const repository =
        settingsRepository ??
        ({
          getAppSettings: async () => DEFAULT_APP_SETTINGS,
          saveAppSettings: async () => {},
          getProviders: async () => [],
          saveProviders: async () => {}
        } satisfies SettingsRepository)
      const settings = await repository.getAppSettings()
      const providers = await repository.getProviders()
      if (requestIdRef.current !== requestId) {
        return
      }
      const selectedProvider = providers.find(
        (provider) => provider.enabled && provider.provider === settings.defaultProvider
      )

      if (!selectedProvider?.apiKey.trim()) {
        setErrorMessage(t("sidepanel.apiKeyMissing"))
        setRankedResults([])
        setActions([])
        return
      }

      nextState =
        queryMode === "cross-bookmark"
          ? await runHybridRetrieval(trimmedQuery)
          : { results: [] as RankedHybridResult[], actions: [] as ActionCard[] }
      if (requestIdRef.current !== requestId) {
        return
      }
      setRankedResults(nextState.results)
      setActions(nextState.actions)

      const analysis = await createProvider(selectedProvider).analyze({
        title: bookmark.title ?? getGhostreaderFallbackTitle(language),
        url: bookmark.url ?? "https://tabvault.local/dashboard-ghostreader",
        content: buildGhostreaderContent({
          language,
          query: trimmedQuery,
          currentPageContext: bookmarkContext,
          rankedResults: nextState.results,
          mode: queryMode
        }),
        summaryLanguage: settings.summaryLanguage
      })
      if (requestIdRef.current !== requestId) {
        return
      }

      setAnswer({
        text: analysis.summary,
        citations:
          queryMode === "cross-bookmark"
            ? nextState.results.slice(0, 3).map((result) => ({
                sourceType: result.document.sourceType,
                title: result.document.title,
                url: result.document.url,
                matchReason: result.matchReason
              }))
            : []
      })
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return
      }
      if (shouldFallbackToLocalGhostreaderAnswer(error)) {
        if (queryMode === "current-only") {
          setRankedResults([])
          setActions([])
          setAnswer(
            buildLocalizedAnswerBlock(
              language,
              t("hybrid.query.query"),
              trimmedQuery,
              buildCurrentPageFallbackResults(bookmarkContext)
            )
          )
          return
        }

        if (requestIdRef.current !== requestId) {
          return
        }
        setRankedResults(nextState.results)
        setActions(nextState.actions)
        setAnswer(buildLocalizedAnswerBlock(language, t("hybrid.query.query"), trimmedQuery, nextState.results))
        return
      }

      setErrorMessage(getLocalizedErrorMessage(language, error, "sidepanel.error.ghostreaderFailed"))
    } finally {
      if (requestIdRef.current === requestId) {
        setIsSubmitting(false)
      }
    }
  }

  function handleAction(actionId: ActionCard["id"]): void {
    if (!submittedQuery) {
      return
    }

    if (actionId === "ask-current-page") {
      const currentPageResults = rankedResults.filter((result) => result.document.sourceType === "current-page")
      setAnswer(buildLocalizedAnswerBlock(language, t("hybrid.query.query"), submittedQuery, currentPageResults))
      return
    }

    if (actionId === "ask-top-matches") {
      setAnswer(buildLocalizedAnswerBlock(language, t("hybrid.query.query"), submittedQuery, rankedResults.slice(0, 3)))
    }
  }

  return (
    <div data-testid="dashboard-ask-card" style={{ border: `1px solid ${theme.border}`, borderRadius: radius.xl, padding: "20px", backgroundColor: theme.page, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em", marginBottom: spacing.sm }}>
        {t("dashboard.ask.title")}
      </div>
      <div style={{ position: "relative" }}>
        <input
          aria-label={t("dashboard.ask.title")}
          data-testid="dashboard-ask-input"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void handleSubmit()
            }
          }}
          placeholder={t("dashboard.ask.placeholder")}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 40px 10px 12px",
            border: `1px solid ${theme.border}`,
            borderRadius: radius.medium,
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            fontSize: "0.875rem"
          }}
          type="text"
          value={query}
        />
        <button
          aria-label={t("dashboard.ask.submit")}
          data-testid="dashboard-ask-submit"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "28px",
            height: "28px",
            border: `1px solid ${theme.accent}`,
            borderRadius: radius.medium,
            backgroundColor: theme.accent,
            color: "#ffffff",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.7
          }}
          title={t("dashboard.ask.submit")}
          type="button"
        >
          {isSubmitting ? (
            <span
              data-testid="dashboard-ask-submit-loading"
              style={{ display: "inline-flex", animation: "dashboard-ask-spin 0.8s linear infinite" }}
            >
              <DashboardIcon name="loading" />
            </span>
          ) : (
            <DashboardIcon name="send" testId="dashboard-ask-submit-icon" />
          )}
        </button>
      </div>
      {errorMessage ? (
        <div aria-live="polite" style={{ marginTop: spacing.sm, color: theme.textDanger, fontSize: "0.8125rem", lineHeight: 1.5 }}>
          {errorMessage}
        </div>
      ) : null}
      {submittedQuery ? (
        <div style={{ marginTop: spacing.sm }}>
          <HybridQueryStream
            actions={actions}
            answer={answer}
            language={language}
            onAction={handleAction}
            onOpenBookmark={onOpenBookmark}
            query={submittedQuery}
            rankedResults={rankedResults}
            showSupportingResults={submittedMode === "cross-bookmark"}
          />
        </div>
      ) : null}
    </div>
  )
}
