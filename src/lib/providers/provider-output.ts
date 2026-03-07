import type { AnalyzeResult } from "./provider"
import { normalizeProviderError } from "./provider-errors"

export function parseAnalyzeResult(text: string): AnalyzeResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw normalizeProviderError(error, {
      code: "bad_model_output",
      message: "Provider returned invalid JSON output"
    })
  }

  if (!isAnalyzeResult(parsed)) {
    throw normalizeProviderError(new Error("Invalid analyze result shape"), {
      code: "bad_model_output",
      message: "Provider returned invalid analyze result"
    })
  }

  return {
    summary: parsed.summary,
    tags: [...parsed.tags]
  }
}

function isAnalyzeResult(value: unknown): value is AnalyzeResult {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.summary === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string")
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
