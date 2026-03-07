import { normalizeProviderError } from "./provider-errors"
import { parseAnalyzeResult } from "./provider-output"
import type { AiProvider, AnalyzeInput, AnalyzeResult } from "./provider"

type GeminiProviderConfig = {
  apiKey: string
  model: string
  fetchImpl?: FetchLike
}

type GeminiResponse = {
  promptFeedback?: {
    blockReason?: string
  }
  candidates?: Array<{
    finishReason?: string
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
}>

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

export class GeminiProvider implements AiProvider {
  private readonly fetchImpl: FetchLike

  constructor(private readonly config: GeminiProviderConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch
  }

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    try {
      const response = await this.fetchImpl(`${GEMINI_API_URL}/${this.config.model}:generateContent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.config.apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildPrompt(input)
                }
              ]
            }
          ]
        })
      })

      if (!response.ok) {
        throw normalizeProviderError(new Error(`Gemini request failed with status ${response.status}`), {
          code: getErrorCode(response.status),
          message: getErrorMessage(response.status)
        })
      }

      const data = (await response.json()) as GeminiResponse

      ensureNotSafetyBlocked(data)

      return parseAnalyzeResult(extractTextContent(data))
    } catch (error) {
      throw normalizeProviderError(error, {
        code: "network_error",
        message: "Gemini request failed"
      })
    }
  }
}

function buildPrompt(input: AnalyzeInput): string {
  return (
    'Analyze this bookmark and return strict JSON with shape {"summary":"string","tags":["string"]}. ' +
    `Bookmark title: ${input.title}\n` +
    `Bookmark URL: ${input.url}\n` +
    `Bookmark content: ${input.content}`
  )
}

function ensureNotSafetyBlocked(data: GeminiResponse): void {
  if (data.promptFeedback?.blockReason === "SAFETY") {
    throw normalizeProviderError(new Error("Gemini prompt was safety blocked"), {
      code: "safety_blocked",
      message: "Gemini blocked the request for safety reasons"
    })
  }

  if (data.candidates?.some((candidate) => candidate.finishReason === "SAFETY")) {
    throw normalizeProviderError(new Error("Gemini candidate was safety blocked"), {
      code: "safety_blocked",
      message: "Gemini blocked the request for safety reasons"
    })
  }
}

function extractTextContent(data: GeminiResponse): string {
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join("\n")

  if (!text) {
    throw normalizeProviderError(new Error("Gemini response did not include text content"), {
      code: "bad_model_output",
      message: "Gemini returned no text output"
    })
  }

  return text
}

function getErrorCode(status: number): string {
  if (status === 401 || status === 403) {
    return "auth_error"
  }

  if (status === 429) {
    return "rate_limit_error"
  }

  if (status >= 500) {
    return "server_error"
  }

  return "invalid_request_error"
}

function getErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Gemini authentication failed"
  }

  if (status === 429) {
    return "Gemini rate limit exceeded"
  }

  if (status >= 500) {
    return "Gemini service failed"
  }

  return "Gemini rejected the request"
}
