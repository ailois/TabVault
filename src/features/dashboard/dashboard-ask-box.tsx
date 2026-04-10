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
import type { GhostreaderBookmarkAddedPayload } from "../../features/ghostreader-session/ghostreader-bookmark-events"
import { buildBookmarkSearchDocument } from "../../features/hybrid-retrieval/search-documents"
import { updateIntentMemory } from "../../features/ghostreader-session/ghostreader-intent-memory"
import { resolveSessionReferences } from "../../features/ghostreader-session/ghostreader-reference-resolution"
import {
  appendAssistantMessage,
  appendUserMessage,
  recordBookmarkAddedEvent,
  replaceWorkingSet,
  updateFollowUpMemory
} from "../../features/ghostreader-session/ghostreader-session-reducer"
import {
  ChromeGhostreaderSessionStore,
  GHOSTREADER_SESSIONS_VERSION,
  type GhostreaderPersistedSessions
} from "../../features/ghostreader-session/ghostreader-session-store"
import {
  createEmptyGhostreaderSession,
  type GhostreaderSession
} from "../../features/ghostreader-session/ghostreader-session-types"
import { getGhostreaderSessionSnapshot } from "../../features/ghostreader-session/ghostreader-session-view"
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
  ghostreaderSessionStore?: Pick<ChromeGhostreaderSessionStore, "loadSessions" | "saveSessions" | "clearActiveSession">
  latestGhostreaderBookmarkEvent?: GhostreaderBookmarkAddedPayload | null
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

function createGhostreaderSessionTitle(): string {
  return "Ghostreader Session"
}

function createGhostreaderSessionId(): string {
  return `ghostreader-session-${Date.now()}`
}

function ensureActiveSession(state: GhostreaderPersistedSessions): GhostreaderSession {
  const activeSession = state.activeSessionId
    ? state.sessions.find((session) => session.id === state.activeSessionId) ?? null
    : null

  return activeSession ?? createEmptyGhostreaderSession({ id: createGhostreaderSessionId(), title: createGhostreaderSessionTitle() })
}

function upsertSession(state: GhostreaderPersistedSessions, session: GhostreaderSession): GhostreaderPersistedSessions {
  const remainingSessions = state.sessions.filter((item) => item.id !== session.id)

  return {
    ...state,
    activeSessionId: session.id,
    sessions: [session, ...remainingSessions]
  }
}

function buildResolvedBookmarkResults(bookmarks: BookmarkRecord[], bookmarkIds: string[]): RankedHybridResult[] {
  const bookmarkMap = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]))

  return bookmarkIds
    .map((bookmarkId) => bookmarkMap.get(bookmarkId))
    .filter((bookmark): bookmark is BookmarkRecord => Boolean(bookmark))
    .map((bookmark, index) => ({
      document: buildBookmarkSearchDocument(bookmark),
      score: 200 - index,
      matchReason: "title" as const
    }))
}

function getMostRecentRestorableSession(
  state: GhostreaderPersistedSessions,
  activeSessionId: string | null
): GhostreaderSession | null {
  return state.sessions.find((session) => session.id !== activeSessionId && session.messages.length > 0) ?? null
}

function buildRecentTurns(session: GhostreaderSession): Array<{ user: string; assistant?: string }> {
  const turns: Array<{ user: string; assistant?: string }> = []
  let pendingUser: string | null = null

  for (const message of session.messages) {
    if (message.role === "user") {
      if (pendingUser) {
        turns.push({ user: pendingUser })
      }
      pendingUser = message.text
      continue
    }

    if (message.role === "assistant" && pendingUser) {
      turns.push({ user: pendingUser, assistant: message.text })
      pendingUser = null
    }
  }

  if (pendingUser) {
    turns.push({ user: pendingUser })
  }

  return turns.slice(-3)
}

function getFollowUpReferencedBookmarkIds(
  resolvedReferenceBookmarkIds: string[],
  referencedBookmarkIds: string[]
): string[] {
  return Array.from(new Set([...resolvedReferenceBookmarkIds, ...referencedBookmarkIds]))
}

function formatFollowUpAnswer(answerText: string): string {
  return answerText.trim()
}

export function DashboardAskBox({
  bookmark,
  bookmarks,
  language = "en",
  settingsRepository,
  createProvider = defaultCreateProvider,
  onOpenBookmark,
  ghostreaderSessionStore,
  latestGhostreaderBookmarkEvent
}: DashboardAskBoxProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const dashboardGhostreaderSessionStore = useMemo(
    () => ghostreaderSessionStore ?? new ChromeGhostreaderSessionStore(),
    [ghostreaderSessionStore]
  )
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [submittedMode, setSubmittedMode] = useState<GhostreaderQueryMode>("current-only")
  const [rankedResults, setRankedResults] = useState<RankedHybridResult[]>([])
  const [actions, setActions] = useState<ActionCard[]>([])
  const [answer, setAnswer] = useState<AnswerBlock | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ghostreaderSessionState, setGhostreaderSessionState] = useState<GhostreaderPersistedSessions>({
    activeSessionId: null,
    sessions: [],
    version: GHOSTREADER_SESSIONS_VERSION
  })
  const [activeGhostreaderSession, setActiveGhostreaderSession] = useState<GhostreaderSession | null>(null)
  const [latestGhostreaderResultIds, setLatestGhostreaderResultIds] = useState<string[]>([])
  const [sessionPersistenceDisabled, setSessionPersistenceDisabled] = useState(false)
  const requestIdRef = useRef(0)
  const bookmarkContext = useMemo(() => buildBookmarkContext(bookmark), [bookmark])
  const availableBookmarks = useMemo(() => {
    if (bookmarks && bookmarks.length > 0) {
      return bookmarks
    }

    return bookmark ? [bookmark] : []
  }, [bookmark, bookmarks])
  const canSubmit = Boolean(bookmark && query.trim()) && !isSubmitting
  const restorableGhostreaderSession = useMemo(
    () => getMostRecentRestorableSession(ghostreaderSessionState, activeGhostreaderSession?.id ?? null),
    [activeGhostreaderSession?.id, ghostreaderSessionState]
  )
  const showContinueGhostreaderSession =
    Boolean(restorableGhostreaderSession) &&
    Boolean(activeGhostreaderSession) &&
    activeGhostreaderSession?.messages.length === 0 &&
    !submittedQuery

  useEffect(() => {
    let cancelled = false

    async function loadGhostreaderSession() {
      try {
        const persisted = await dashboardGhostreaderSessionStore.loadSessions()
        if (cancelled) {
          return
        }

        const activeSession = ensureActiveSession(persisted)
        const nextState = upsertSession(persisted, activeSession)
        setSessionPersistenceDisabled(false)
        setGhostreaderSessionState(nextState)
        setActiveGhostreaderSession(activeSession)
        restoreSessionView(activeSession)
      } catch {
        if (cancelled) {
          return
        }

        const fallbackSession = createEmptyGhostreaderSession({
          id: createGhostreaderSessionId(),
          title: createGhostreaderSessionTitle()
        })
        setGhostreaderSessionState({
          activeSessionId: fallbackSession.id,
          sessions: [fallbackSession],
          version: GHOSTREADER_SESSIONS_VERSION
        })
        setActiveGhostreaderSession(fallbackSession)
        setSessionPersistenceDisabled(true)
        clearSessionView()
      }
    }

    void loadGhostreaderSession()

    return () => {
      cancelled = true
    }
  }, [dashboardGhostreaderSessionStore])

  useEffect(() => {
    requestIdRef.current += 1
    setQuery("")
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

  function clearSessionView(): void {
    setSubmittedQuery("")
    setSubmittedMode("current-only")
    setRankedResults([])
    setActions([])
    setAnswer(null)
    setLatestGhostreaderResultIds([])
  }

  function restoreSessionView(session: GhostreaderSession | null): void {
    const snapshot = getGhostreaderSessionSnapshot(session)
    if (!snapshot) {
      clearSessionView()
      return
    }

    const restoredResults =
      snapshot.mode === "cross-bookmark"
        ? buildResolvedBookmarkResults(availableBookmarks, snapshot.referencedBookmarkIds)
        : []

    setSubmittedQuery(snapshot.query)
    setSubmittedMode(snapshot.mode)
    setRankedResults(restoredResults)
    setActions(snapshot.mode === "cross-bookmark" ? getLocalizedActions(t, restoredResults) : [])
    setAnswer(
      snapshot.answerText
        ? {
            text: snapshot.answerText,
            citations:
              snapshot.mode === "cross-bookmark"
                ? restoredResults.slice(0, 3).map((result) => ({
                    sourceType: result.document.sourceType,
                    title: result.document.title,
                    url: result.document.url,
                    matchReason: result.matchReason
                  }))
                : []
          }
        : null
    )
    setLatestGhostreaderResultIds(snapshot.referencedBookmarkIds)
  }

  async function persistGhostreaderSessions(nextState: GhostreaderPersistedSessions): Promise<void> {
    try {
      await dashboardGhostreaderSessionStore.saveSessions({
        activeSessionId: nextState.activeSessionId,
        sessions: nextState.sessions
      })
      setSessionPersistenceDisabled(false)
    } catch {
      setSessionPersistenceDisabled(true)
    }
  }

  async function handleBookmarkEvent(payload: GhostreaderBookmarkAddedPayload): Promise<void> {
    const baseSession =
      activeGhostreaderSession ??
      createEmptyGhostreaderSession({
        id: createGhostreaderSessionId(),
        title: createGhostreaderSessionTitle()
      })
    const nextSession = recordBookmarkAddedEvent(baseSession, payload)
    const nextState = upsertSession(ghostreaderSessionState, nextSession)
    setGhostreaderSessionState(nextState)
    setActiveGhostreaderSession(nextSession)
    setLatestGhostreaderResultIds((current) =>
      current.includes(payload.bookmarkId) ? current : [payload.bookmarkId, ...current].slice(0, 20)
    )
    await persistGhostreaderSessions(nextState)
  }

  async function handleStartNewSession(): Promise<void> {
    const nextSession = createEmptyGhostreaderSession({
      id: createGhostreaderSessionId(),
      title: createGhostreaderSessionTitle()
    })
    const nextState = upsertSession(ghostreaderSessionState, nextSession)
    setQuery("")
    setErrorMessage(null)
    setGhostreaderSessionState(nextState)
    setActiveGhostreaderSession(nextSession)
    clearSessionView()
    await persistGhostreaderSessions(nextState)
  }

  useEffect(() => {
    if (!latestGhostreaderBookmarkEvent) {
      return
    }

    void handleBookmarkEvent(latestGhostreaderBookmarkEvent)
  }, [latestGhostreaderBookmarkEvent])

  async function handleContinueSession(): Promise<void> {
    if (!restorableGhostreaderSession) {
      return
    }

    const nextState = upsertSession(ghostreaderSessionState, restorableGhostreaderSession)
    setQuery("")
    setErrorMessage(null)
    setGhostreaderSessionState(nextState)
    setActiveGhostreaderSession(restorableGhostreaderSession)
    restoreSessionView(restorableGhostreaderSession)
    await persistGhostreaderSessions(nextState)
  }

  async function handleSubmit(): Promise<void> {
    const trimmedQuery = query.trim()
    if (isSubmitting || !bookmark || !trimmedQuery) {
      return
    }
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const baseSession =
      activeGhostreaderSession ??
      createEmptyGhostreaderSession({
        id: createGhostreaderSessionId(),
        title: createGhostreaderSessionTitle()
      })
    const resolvedReferences = resolveSessionReferences(trimmedQuery, {
      session: baseSession,
      currentBookmarkId: bookmark.id,
      latestResultBookmarkIds: latestGhostreaderResultIds
    })
    const queryMode: GhostreaderQueryMode =
      resolvedReferences.source === "current-bookmark"
        ? "current-only"
        : resolvedReferences.bookmarkIds.length > 0
          ? "cross-bookmark"
          : detectGhostreaderQueryMode(trimmedQuery)
    const recentTurns = buildRecentTurns(baseSession)
    const recentAddedBookmarks = baseSession.bookmarksAddedInSession.slice(-3).map((event) => ({
      title: event.title,
      url: event.url
    }))
    let nextSession = appendUserMessage(baseSession, {
      id: `user-${Date.now()}`,
      text: trimmedQuery,
      queryMode,
      referencedBookmarkIds: resolvedReferences.bookmarkIds
    })
    nextSession = updateIntentMemory(nextSession, {
      latestUserText: trimmedQuery,
      bookmarkEvents: nextSession.bookmarksAddedInSession
    })
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
          ? resolvedReferences.bookmarkIds.length > 0
            ? {
                results: buildResolvedBookmarkResults(availableBookmarks, resolvedReferences.bookmarkIds),
                actions: getLocalizedActions(
                  t,
                  buildResolvedBookmarkResults(availableBookmarks, resolvedReferences.bookmarkIds)
                )
              }
            : await runHybridRetrieval(trimmedQuery)
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
          mode: queryMode,
          sessionContext: {
            intentSummary: nextSession.intentMemory.summary,
            recentTurns,
            followUpMemory: nextSession.followUpMemory,
            recentAddedBookmarks
          }
        }),
        summaryLanguage: settings.summaryLanguage
      })
      if (requestIdRef.current !== requestId) {
        return
      }

      const referencedBookmarkIds = nextState.results
        .filter((result) => result.document.sourceType === "saved-bookmark" && result.document.bookmarkId)
        .map((result) => result.document.bookmarkId as string)
      if (referencedBookmarkIds.length > 0 || resolvedReferences.bookmarkIds.length > 0) {
        nextSession = replaceWorkingSet(nextSession, [
          ...resolvedReferences.bookmarkIds,
          ...referencedBookmarkIds,
          ...nextSession.workingSetBookmarkIds
        ])
      }
      nextSession = appendAssistantMessage(nextSession, {
        id: `assistant-${Date.now()}`,
        text: analysis.summary,
        referencedBookmarkIds
      })
      nextSession = updateFollowUpMemory(nextSession, {
        lastQuery: trimmedQuery,
        lastAnswer: formatFollowUpAnswer(analysis.summary),
        lastReferencedBookmarkIds: getFollowUpReferencedBookmarkIds(
          resolvedReferences.bookmarkIds,
          referencedBookmarkIds
        ),
        lastQueryMode: queryMode
      })
      const persistedState = upsertSession(ghostreaderSessionState, nextSession)
      setGhostreaderSessionState(persistedState)
      setActiveGhostreaderSession(nextSession)
      setLatestGhostreaderResultIds(referencedBookmarkIds)
      await persistGhostreaderSessions(persistedState)

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
          const fallbackAnswer = buildLocalizedAnswerBlock(
            language,
            t("hybrid.query.query"),
            trimmedQuery,
            buildCurrentPageFallbackResults(bookmarkContext)
          )
          nextSession = appendAssistantMessage(nextSession, {
            id: `assistant-fallback-${Date.now()}`,
            text: fallbackAnswer.text,
            referencedBookmarkIds: []
          })
          nextSession = updateFollowUpMemory(nextSession, {
            lastQuery: trimmedQuery,
            lastAnswer: formatFollowUpAnswer(fallbackAnswer.text),
            lastReferencedBookmarkIds: getFollowUpReferencedBookmarkIds(
              resolvedReferences.bookmarkIds,
              []
            ),
            lastQueryMode: queryMode
          })
          const persistedState = upsertSession(ghostreaderSessionState, nextSession)
          setGhostreaderSessionState(persistedState)
          setActiveGhostreaderSession(nextSession)
          setRankedResults([])
          setActions([])
          setLatestGhostreaderResultIds([])
          await persistGhostreaderSessions(persistedState)
          setAnswer(fallbackAnswer)
          return
        }

        if (requestIdRef.current !== requestId) {
          return
        }
        const referencedBookmarkIds = nextState.results
          .filter((result) => result.document.sourceType === "saved-bookmark" && result.document.bookmarkId)
          .map((result) => result.document.bookmarkId as string)
        if (referencedBookmarkIds.length > 0 || resolvedReferences.bookmarkIds.length > 0) {
          nextSession = replaceWorkingSet(nextSession, [
            ...resolvedReferences.bookmarkIds,
            ...referencedBookmarkIds,
            ...nextSession.workingSetBookmarkIds
          ])
        }
        const fallbackAnswer = buildLocalizedAnswerBlock(language, t("hybrid.query.query"), trimmedQuery, nextState.results)
        nextSession = appendAssistantMessage(nextSession, {
          id: `assistant-fallback-${Date.now()}`,
          text: fallbackAnswer.text,
          referencedBookmarkIds
        })
        nextSession = updateFollowUpMemory(nextSession, {
          lastQuery: trimmedQuery,
          lastAnswer: formatFollowUpAnswer(fallbackAnswer.text),
          lastReferencedBookmarkIds: getFollowUpReferencedBookmarkIds(
            resolvedReferences.bookmarkIds,
            referencedBookmarkIds
          ),
          lastQueryMode: queryMode
        })
        const persistedState = upsertSession(ghostreaderSessionState, nextSession)
        setGhostreaderSessionState(persistedState)
        setActiveGhostreaderSession(nextSession)
        setLatestGhostreaderResultIds(referencedBookmarkIds)
        await persistGhostreaderSessions(persistedState)
        setRankedResults(nextState.results)
        setActions(nextState.actions)
        setAnswer(fallbackAnswer)
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" }}>
          <button
            data-testid="dashboard-ask-new-session"
            disabled={isSubmitting}
            onClick={() => void handleStartNewSession()}
            style={{
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surface,
              color: theme.textPrimary,
              borderRadius: radius.medium,
              padding: "6px 10px",
              fontSize: "0.75rem",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1
            }}
            type="button"
          >
            {t("ghostreader.session.new")}
          </button>
          {showContinueGhostreaderSession ? (
            <button
              data-testid="dashboard-ask-continue-session"
              disabled={isSubmitting}
              onClick={() => void handleContinueSession()}
              style={{
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.page,
                color: theme.textSecondary,
                borderRadius: radius.medium,
                padding: "6px 10px",
                fontSize: "0.75rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1
              }}
              type="button"
            >
              {t("ghostreader.session.continue")}
            </button>
          ) : null}
        </div>
        {sessionPersistenceDisabled ? (
          <div
            aria-live="polite"
            data-testid="dashboard-session-persistence-warning"
            style={{ fontSize: "0.75rem", color: theme.textMuted, textAlign: "right", maxWidth: "58%" }}
          >
            {t("ghostreader.session.persistenceDisabled")}
          </div>
        ) : null}
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
