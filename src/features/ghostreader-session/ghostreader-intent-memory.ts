import type { GhostreaderBookmarkEvent, GhostreaderSession } from "./ghostreader-session-types"

type UpdateIntentMemoryInput = {
  latestUserText: string
  bookmarkEvents: GhostreaderBookmarkEvent[]
}

const MAX_INTENT_SUMMARY_CHARS = 120

function truncateSummary(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= MAX_INTENT_SUMMARY_CHARS) {
    return normalized
  }

  return `${normalized.slice(0, MAX_INTENT_SUMMARY_CHARS - 3).trimEnd()}...`
}

function buildGoalSummary(latestUserText: string): string {
  const normalized = latestUserText.trim()
  if (!normalized) {
    return ""
  }

  const subjectMatch = normalized.match(/关于(.+?)的书签/)
  if (subjectMatch?.[1]) {
    return `用户正在收集${subjectMatch[1]}相关资料`
  }

  if (/[?？]$/.test(normalized)) {
    return `用户当前关注：${normalized.replace(/[?？]+$/g, "")}`
  }

  return `用户当前关注：${normalized}`
}

export function updateIntentMemory(
  session: GhostreaderSession,
  input: UpdateIntentMemoryInput
): GhostreaderSession {
  const parts = [buildGoalSummary(input.latestUserText)]

  if (input.bookmarkEvents.length > 0) {
    parts.push(`本会话刚添加了 ${input.bookmarkEvents.length} 个书签`)
  }

  const summary = truncateSummary(parts.filter(Boolean).join("；"))
  const updatedAt = new Date().toISOString()

  return {
    ...session,
    updatedAt,
    intentMemory: {
      summary,
      updatedAt,
      source: "rule-based"
    }
  }
}
