import type { AnswerBlock } from "./build-answer-block"
import { buildCurrentPageDocument } from "./current-page-context"
import type { GhostreaderQueryMode } from "./hybrid-types"
import type { RankedHybridResult } from "./rank-hybrid-results"

type GhostreaderRecentTurn = {
  user: string
  assistant?: string
}

type GhostreaderFollowUpMemoryContext = {
  lastQuery: string
  lastAnswer: string
  lastReferencedBookmarkIds: string[]
  lastQueryMode: GhostreaderQueryMode | null
  updatedAt: string | null
}

type GhostreaderLanguage = "en" | "zh"
type GhostreaderPromptCopy = (typeof GHOSTREADER_PROMPT_COPY)[GhostreaderLanguage]

type GhostreaderSessionContext = {
  intentSummary?: string
  recentTurns?: GhostreaderRecentTurn[]
  followUpMemory?: GhostreaderFollowUpMemoryContext
  recentAddedBookmarks?: Array<{ title: string; url: string }>
}

const GHOSTREADER_PROMPT_COPY = {
  en: {
    fallbackTitle: "Ghostreader question",
    currentOnlyInstruction: "Answer the user's Ghostreader question using only the current page context.",
    crossBookmarkInstruction: "Answer the user's Ghostreader question using the current page and saved bookmark context.",
    responseShape: "Return strict JSON with shape {\"summary\":\"string\",\"tags\":[\"string\"]}.",
    userQuestion: "User question",
    currentPageTitle: "Current page title",
    currentPageUrl: "Current page URL",
    currentPageContent: "Current page content",
    currentPageUnavailable: "Current page unavailable",
    savedMatchesHeading: "Saved bookmark matches",
    savedMatchesEmpty: "none",
    sessionHeading: "Session context",
    sessionIntent: "Current session goal",
    sessionRecentMessages: "Recent turns",
    sessionFollowUpMemory: "Follow-up memory",
    sessionRecentAddedBookmarks: "Recently added bookmarks",
    savedMatchTitle: (index: number) => `Saved match ${index} title`,
    savedMatchUrl: (index: number) => `Saved match ${index} URL`,
    savedMatchReason: (index: number) => `Saved match ${index} reason`,
    savedMatchContent: (index: number) => `Saved match ${index} content`
  },
  zh: {
    fallbackTitle: "Ghostreader 问题",
    currentOnlyInstruction: "请仅基于当前页面或当前书签内容回答用户的 Ghostreader 问题。",
    crossBookmarkInstruction: "请基于当前页面与已保存书签上下文回答用户的 Ghostreader 问题。",
    responseShape: "请严格返回 JSON，格式为 {\"summary\":\"string\",\"tags\":[\"string\"]}。",
    userQuestion: "用户问题",
    currentPageTitle: "当前页面标题",
    currentPageUrl: "当前页面 URL",
    currentPageContent: "当前页面内容",
    currentPageUnavailable: "当前页面内容不可用",
    savedMatchesHeading: "已保存书签匹配",
    savedMatchesEmpty: "无",
    sessionHeading: "会话上下文",
    sessionIntent: "当前会话目标",
    sessionRecentMessages: "最近对话",
    sessionFollowUpMemory: "follow-up",
    sessionRecentAddedBookmarks: "最近新增书签",
    savedMatchTitle: (index: number) => `匹配书签 ${index} 标题`,
    savedMatchUrl: (index: number) => `匹配书签 ${index} URL`,
    savedMatchReason: (index: number) => `匹配书签 ${index} 原因`,
    savedMatchContent: (index: number) => `匹配书签 ${index} 内容`
  }
} as const

const GHOSTREADER_MAX_CURRENT_PAGE_CHARS = 3_000
const GHOSTREADER_MAX_MATCH_CHARS = 900
const GHOSTREADER_MAX_MATCHES = 3

export function getGhostreaderFallbackTitle(language: GhostreaderLanguage): string {
  return GHOSTREADER_PROMPT_COPY[language].fallbackTitle
}

export function buildLocalizedAnswerBlock(
  language: GhostreaderLanguage,
  queryLabel: string,
  query: string,
  rankedResults: RankedHybridResult[]
): AnswerBlock {
  const citations = rankedResults.slice(0, 3).map((result) => ({
    sourceType: result.document.sourceType,
    title: result.document.title,
    url: result.document.url,
    matchReason: result.matchReason
  }))

  const text =
    language === "en"
      ? citations.length > 0
        ? `Based on ${citations.map((citation) => citation.title).join(", ")}, here are the most relevant local results for: ${query}`
        : `No local results found for: ${query}`
      : citations.length > 0
        ? `${queryLabel}：${query}。当前最相关内容来自 ${citations.map((citation) => citation.title).join(" / ")}`
        : `${queryLabel}：${query}。未找到本地结果。`

  return { text, citations }
}

export function buildGhostreaderContent(input: {
  language: GhostreaderLanguage
  query: string
  currentPageContext: { title?: string; url?: string; extractedText?: string } | null
  rankedResults: RankedHybridResult[]
  mode?: GhostreaderQueryMode
  sessionContext?: GhostreaderSessionContext
}): string {
  const copy = GHOSTREADER_PROMPT_COPY[input.language]
  const mode = input.mode ?? "cross-bookmark"
  const currentPageBlock = input.currentPageContext
    ? [
        `${copy.currentPageTitle}: ${input.currentPageContext.title ?? "Unknown"}`,
        `${copy.currentPageUrl}: ${input.currentPageContext.url ?? "Unknown"}`,
        `${copy.currentPageContent}: ${truncatePromptText(input.currentPageContext.extractedText ?? "", GHOSTREADER_MAX_CURRENT_PAGE_CHARS)}`
      ].join("\n")
    : copy.currentPageUnavailable
  const sessionBlock = buildSessionBlock(copy, input.sessionContext)

  if (mode === "current-only") {
    return [
      copy.currentOnlyInstruction,
      copy.responseShape,
      `${copy.userQuestion}: ${input.query}`,
      sessionBlock,
      currentPageBlock
    ]
      .filter(Boolean)
      .join("\n\n")
  }

  const savedMatchesBlock = input.rankedResults
    .filter((result) => result.document.sourceType === "saved-bookmark")
    .slice(0, GHOSTREADER_MAX_MATCHES)
    .map((result, index) =>
      [
        `${copy.savedMatchTitle(index + 1)}: ${result.document.title}`,
        `${copy.savedMatchUrl(index + 1)}: ${result.document.url}`,
        `${copy.savedMatchReason(index + 1)}: ${result.matchReason}`,
        `${copy.savedMatchContent(index + 1)}: ${truncatePromptText(result.document.summary ?? result.document.bodyText ?? "", GHOSTREADER_MAX_MATCH_CHARS)}`
      ].join("\n")
    )
    .join("\n\n")

  return [
    copy.crossBookmarkInstruction,
    copy.responseShape,
    `${copy.userQuestion}: ${input.query}`,
    sessionBlock,
    currentPageBlock,
    savedMatchesBlock ? `${copy.savedMatchesHeading}:\n${savedMatchesBlock}` : `${copy.savedMatchesHeading}: ${copy.savedMatchesEmpty}`
  ]
    .filter(Boolean)
    .join("\n\n")
}

export function shouldFallbackToLocalGhostreaderAnswer(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const code = (error as { code?: string }).code
  return code !== "auth_error"
}

export function buildCurrentPageFallbackResults(currentPageContext: {
  title?: string
  url?: string
  extractedText?: string
} | null): RankedHybridResult[] {
  const document = buildCurrentPageDocument(currentPageContext ?? {})

  if (!document) {
    return []
  }

  return [
    {
      document,
      score: 120,
      matchReason: "current page"
    }
  ]
}

function truncatePromptText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxChars) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`
}

function buildSessionBlock(
  copy: GhostreaderPromptCopy,
  sessionContext?: GhostreaderSessionContext
): string {
  if (!sessionContext) {
    return ""
  }

  const sections: string[] = []

  if (sessionContext.intentSummary?.trim()) {
    sections.push(`${copy.sessionIntent}: ${sessionContext.intentSummary.trim()}`)
  }

  if (sessionContext.recentTurns && sessionContext.recentTurns.length > 0) {
    sections.push(
      `${copy.sessionRecentMessages}:\n${sessionContext.recentTurns
        .slice(-3)
        .map((turn, index) => {
          const lines = [`${index + 1}. user: ${turn.user}`]
          if (turn.assistant?.trim()) {
            lines.push(`   assistant: ${turn.assistant.trim()}`)
          }
          return lines.join("\n")
        })
        .join("\n")}`
    )
  }

  if (
    sessionContext.followUpMemory &&
    (sessionContext.followUpMemory.lastQuery.trim() ||
      sessionContext.followUpMemory.lastAnswer.trim() ||
      sessionContext.followUpMemory.lastReferencedBookmarkIds.length > 0)
  ) {
    sections.push(
      `${copy.sessionFollowUpMemory}:\n- lastQuery: ${sessionContext.followUpMemory.lastQuery || ""}\n- lastAnswer: ${sessionContext.followUpMemory.lastAnswer || ""}\n- lastReferencedBookmarkIds: ${sessionContext.followUpMemory.lastReferencedBookmarkIds.join(", ") || "none"}\n- lastQueryMode: ${sessionContext.followUpMemory.lastQueryMode ?? "none"}`
    )
  }

  if (sessionContext.recentAddedBookmarks && sessionContext.recentAddedBookmarks.length > 0) {
    sections.push(
      `${copy.sessionRecentAddedBookmarks}:\n${sessionContext.recentAddedBookmarks
        .slice(-3)
        .map((bookmark, index) => `${index + 1}. ${bookmark.title} (${bookmark.url})`)
        .join("\n")}`
    )
  }

  if (sections.length === 0) {
    return ""
  }

  return `${copy.sessionHeading}:\n${sections.join("\n\n")}`
}
