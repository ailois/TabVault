import { normalizeProviderError } from "./provider-errors"
import { parseAnalyzeResult } from "./provider-output"
import type { AiProvider, AnalyzeInput, AnalyzeResult } from "./provider"

type ClaudeProviderConfig = {
  apiKey: string
  model: string
  fetchImpl?: FetchLike
  timeoutMs?: number
}

type ClaudeResponse = {
  content?: Array<{
    type?: string
    text?: string
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

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
const ANTHROPIC_VERSION = "2023-06-01"

export class ClaudeProvider implements AiProvider {
  private readonly fetchImpl: FetchLike
  private readonly timeoutMs: number

  constructor(private readonly config: ClaudeProviderConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const controller = new AbortController()
    const body = JSON.stringify({
      model: this.config.model,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: buildPrompt(input)
        }
      ]
    })
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, this.timeoutMs)

    let response: Awaited<ReturnType<FetchLike>>

    try {
      response = await this.fetchImpl(CLAUDE_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": ANTHROPIC_VERSION
        },
        body
      })
    } catch (error) {
      throw normalizeProviderError(error, {
        code: "network_error",
        message: "Claude request failed"
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      throw normalizeProviderError(new Error(`Claude request failed with status ${response.status}`), {
        code: getErrorCode(response.status),
        message: getErrorMessage(response.status)
      })
    }

    const data = (await response.json()) as ClaudeResponse
    const text = extractTextContent(data)

    return parseAnalyzeResult(text)
  }
}

const DEFAULT_TIMEOUT_MS = 30_000

function buildPrompt(input: AnalyzeInput): string {
  return (
    "Analyze this bookmark and return strict JSON with shape {\"summary\":\"string\",\"tags\":[\"string\"]}. " +
    `Bookmark title: ${input.title}\n` +
    `Bookmark URL: ${input.url}\n` +
    `Bookmark content: ${input.content}`
  )
}

function extractTextContent(data: ClaudeResponse): string {
  const text = data.content
    ?.filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text?.trim() ?? "")
    .filter((item) => item.length > 0)
    .join("\n")

  if (!text) {
    throw normalizeProviderError(new Error("Claude response did not include text content"), {
      code: "bad_model_output",
      message: "Claude returned no text output"
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
    return "Claude authentication failed"
  }

  if (status === 429) {
    return "Claude rate limit exceeded"
  }

  if (status >= 500) {
    return "Claude service failed"
  }

  return "Claude rejected the request"
}
