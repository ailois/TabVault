import { normalizeProviderError } from "./provider-errors"
import { parseAnalyzeResult } from "./provider-output"
import type { AiProvider, AnalyzeInput, AnalyzeResult } from "./provider"

type OpenAiCompatibleProviderConfig = {
  apiKey: string
  baseUrl: string
  model: string
  fetchImpl?: FetchLike
  timeoutMs?: number
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
}>

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly fetchImpl: FetchLike
  private readonly timeoutMs: number

  constructor(private readonly config: OpenAiCompatibleProviderConfig) {
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init))
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const controller = new AbortController()
    const url = `${normalizeBaseUrl(this.config.baseUrl)}/chat/completions`
    const body = JSON.stringify({
      model: this.config.model,
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
      response = await this.fetchImpl(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`
        },
        body
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "OpenAI-compatible request failed"
      throw normalizeProviderError(error, {
        code: "network_error",
        message
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      throw normalizeProviderError(new Error(`OpenAI-compatible request failed with status ${response.status}`), {
        code: getErrorCode(response.status),
        message: getErrorMessage(response.status)
      })
    }

    const data = (await response.json()) as OpenAiCompatibleResponse
    const text = extractTextContent(data)

    return parseAnalyzeResult(text)
  }
}

const DEFAULT_TIMEOUT_MS = 30_000

function buildPrompt(input: AnalyzeInput): string {
  return (
    'Analyze this bookmark and return strict JSON with shape {"summary":"string","tags":["string"]}. ' +
    `Bookmark title: ${input.title}\n` +
    `Bookmark URL: ${input.url}\n` +
    `Bookmark content: ${input.content}`
  )
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "")
}

function extractTextContent(data: OpenAiCompatibleResponse): string {
  const text = data.choices?.[0]?.message?.content?.trim()

  if (!text) {
    throw normalizeProviderError(new Error("OpenAI-compatible response did not include text content"), {
      code: "bad_model_output",
      message: "OpenAI-compatible returned no text output"
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

  if (status >= 400 && status < 500) {
    return "invalid_request_error"
  }

  return "server_error"
}

function getErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "OpenAI-compatible authentication failed"
  }

  if (status === 429) {
    return "OpenAI-compatible rate limit exceeded"
  }

  if (status >= 500) {
    return "OpenAI-compatible service failed"
  }

  if (status >= 400 && status < 500) {
    return "OpenAI-compatible rejected the request"
  }

  return "OpenAI-compatible request failed"
}
