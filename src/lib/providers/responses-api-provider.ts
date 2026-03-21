import { normalizeProviderError } from "./provider-errors"
import { buildLanguageInstruction } from "./language-instruction"
import { parseAnalyzeResult } from "./provider-output"
import type { AiProvider, AnalyzeInput, AnalyzeResult } from "./provider"

type ResponsesApiProviderConfig = {
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

// POST /v1/responses response shape
type ResponsesApiResponse = {
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

export class ResponsesApiProvider implements AiProvider {
  private readonly fetchImpl: FetchLike
  private readonly timeoutMs: number

  constructor(private readonly config: ResponsesApiProviderConfig) {
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init))
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const controller = new AbortController()
    const baseUrl = this.config.baseUrl.replace(/\/+$/, "")
    const url = `${baseUrl}/responses`
    const body = JSON.stringify({
      model: this.config.model,
      input: buildPrompt(input)
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
      const message = error instanceof Error ? error.message : "Responses API request failed"
      throw normalizeProviderError(error, {
        code: "network_error",
        message
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      throw normalizeProviderError(
        new Error(`Responses API request failed with status ${response.status}`),
        {
          code: getErrorCode(response.status),
          message: getErrorMessage(response.status)
        }
      )
    }

    let data: ResponsesApiResponse
    try {
      data = (await response.json()) as ResponsesApiResponse
    } catch (jsonError) {
      throw normalizeProviderError(jsonError, {
        code: "invalid_response",
        message: "Responses API returned invalid JSON (possible CORS or network error)"
      })
    }

    const text = extractTextContent(data)
    return parseAnalyzeResult(text)
  }
}

const DEFAULT_TIMEOUT_MS = 30_000

function buildPrompt(input: AnalyzeInput): string {
  return (
    'Analyze this bookmark and return strict JSON with shape {"summary":"string","tags":["string"]}.' +
    buildLanguageInstruction(input.summaryLanguage) + "\n" +
    `Bookmark title: ${input.title}\n` +
    `Bookmark URL: ${input.url}\n` +
    `Bookmark content: ${input.content}`
  )
}

function extractTextContent(data: ResponsesApiResponse): string {
  // Find the final_answer message output item
  const text = data.output
    ?.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((c) => c.type === "output_text" && typeof c.text === "string")
    .map((c) => c.text?.trim() ?? "")
    .filter((t) => t.length > 0)
    .join("\n")

  if (!text) {
    throw normalizeProviderError(new Error("Responses API output contained no text"), {
      code: "bad_model_output",
      message: "Responses API returned no text output"
    })
  }

  return text
}

function getErrorCode(status: number): string {
  if (status === 401 || status === 403) return "auth_error"
  if (status === 429) return "rate_limit_error"
  if (status >= 500) return "server_error"
  if (status >= 400) return "invalid_request_error"
  return "server_error"
}

function getErrorMessage(status: number): string {
  if (status === 401 || status === 403) return "Responses API authentication failed"
  if (status === 429) return "Responses API rate limit exceeded"
  if (status >= 500) return "Responses API service failed"
  if (status >= 400) return "Responses API rejected the request"
  return "Responses API request failed"
}
