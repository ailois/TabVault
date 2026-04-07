import type { AnswerBlock } from "./build-answer-block"
import type { RankedHybridResult } from "./rank-hybrid-results"

type GhostreaderLanguage = "en" | "zh"

const GHOSTREADER_PROMPT_COPY = {
  en: {
    fallbackTitle: "Ghostreader question",
    instruction: "Answer the user's Ghostreader question using the current page and saved bookmark context.",
    responseShape: "Return strict JSON with shape {\"summary\":\"string\",\"tags\":[\"string\"]}.",
    userQuestion: "User question",
    currentPageTitle: "Current page title",
    currentPageUrl: "Current page URL",
    currentPageContent: "Current page content",
    currentPageUnavailable: "Current page unavailable",
    savedMatchesHeading: "Saved bookmark matches",
    savedMatchesEmpty: "none",
    savedMatchTitle: (index: number) => `Saved match ${index} title`,
    savedMatchUrl: (index: number) => `Saved match ${index} URL`,
    savedMatchReason: (index: number) => `Saved match ${index} reason`,
    savedMatchContent: (index: number) => `Saved match ${index} content`
  },
  zh: {
    fallbackTitle: "Ghostreader 问题",
    instruction: "请基于当前页面与已保存书签上下文，回答用户的 Ghostreader 问题。",
    responseShape: "请严格返回 JSON，结构为 {\"summary\":\"string\",\"tags\":[\"string\"]}。",
    userQuestion: "用户问题",
    currentPageTitle: "当前页面标题",
    currentPageUrl: "当前页面 URL",
    currentPageContent: "当前页面内容",
    currentPageUnavailable: "当前页面不可用",
    savedMatchesHeading: "已保存的书签匹配",
    savedMatchesEmpty: "无",
    savedMatchTitle: (index: number) => `匹配 ${index} 标题`,
    savedMatchUrl: (index: number) => `匹配 ${index} URL`,
    savedMatchReason: (index: number) => `匹配 ${index} 原因`,
    savedMatchContent: (index: number) => `匹配 ${index} 内容`
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
        ? `${queryLabel}：${query} · ${citations.map((citation) => citation.title).join(" / ")}`
        : `${queryLabel}：${query}`

  return { text, citations }
}

export function buildGhostreaderContent(input: {
  language: GhostreaderLanguage
  query: string
  currentPageContext: { title?: string; url?: string; extractedText?: string } | null
  rankedResults: RankedHybridResult[]
}): string {
  const copy = GHOSTREADER_PROMPT_COPY[input.language]
  const currentPageBlock = input.currentPageContext
    ? [
        `${copy.currentPageTitle}: ${input.currentPageContext.title ?? "Unknown"}`,
        `${copy.currentPageUrl}: ${input.currentPageContext.url ?? "Unknown"}`,
        `${copy.currentPageContent}: ${truncatePromptText(input.currentPageContext.extractedText ?? "", GHOSTREADER_MAX_CURRENT_PAGE_CHARS)}`
      ].join("\n")
    : copy.currentPageUnavailable

  const savedMatchesBlock = input.rankedResults
    .filter((result) => result.document.sourceType === "saved-bookmark")
    .slice(0, GHOSTREADER_MAX_MATCHES)
    .map((result, index) => [
      `${copy.savedMatchTitle(index + 1)}: ${result.document.title}`,
      `${copy.savedMatchUrl(index + 1)}: ${result.document.url}`,
      `${copy.savedMatchReason(index + 1)}: ${result.matchReason}`,
      `${copy.savedMatchContent(index + 1)}: ${truncatePromptText(result.document.summary ?? result.document.bodyText ?? "", GHOSTREADER_MAX_MATCH_CHARS)}`
    ].join("\n"))
    .join("\n\n")

  return [
    copy.instruction,
    copy.responseShape,
    `${copy.userQuestion}: ${input.query}`,
    currentPageBlock,
    savedMatchesBlock ? `${copy.savedMatchesHeading}:\n${savedMatchesBlock}` : `${copy.savedMatchesHeading}: ${copy.savedMatchesEmpty}`
  ].join("\n\n")
}

export function shouldFallbackToLocalGhostreaderAnswer(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const code = (error as { code?: string }).code
  return code !== "auth_error"
}

function truncatePromptText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxChars) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`
}
