import { normalizeProviderError } from "./provider-errors"
import { buildLanguageInstruction } from "./language-instruction"
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
  headers?: { get(name: string): string | null }
  text?: () => Promise<string>
  json(): Promise<unknown>
}>

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type ResponsesApiResponse = {
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

type ProviderLikeError = Error & {
  code?: string
}

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly fetchImpl: FetchLike
  private readonly timeoutMs: number

  constructor(private readonly config: OpenAiCompatibleProviderConfig) {
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init))
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    if (shouldPreferResponsesApi(this.config.model)) {
      const text = await analyzeViaResponsesApi(this.config, input, this.fetchImpl, this.timeoutMs)
      return parseAnalyzeResult(text)
    }

    try {
      const text = await analyzeViaChatCompletions(this.config, input, this.fetchImpl, this.timeoutMs)
      return parseAnalyzeResult(text)
    } catch (error) {
      if (!shouldFallbackToResponses(error)) {
        throw error
      }

      try {
        const text = await analyzeViaResponsesApi(this.config, input, this.fetchImpl, this.timeoutMs)
        return parseAnalyzeResult(text)
      } catch (fallbackError) {
        if (shouldPreserveOriginalError(error, fallbackError)) {
          throw error
        }

        throw fallbackError
      }
    }
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

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "")
}

async function analyzeViaChatCompletions(
  config: OpenAiCompatibleProviderConfig,
  input: AnalyzeInput,
  fetchImpl: FetchLike,
  timeoutMs: number
): Promise<string> {
  const url = `${normalizeBaseUrl(config.baseUrl)}/chat/completions`
  const body = JSON.stringify({
    model: config.model,
    messages: [
      {
        role: "user",
        content: buildPrompt(input)
      }
    ]
  })

  const response = await performRequest(config, fetchImpl, timeoutMs, url, body)

  if (!response.ok) {
    throw normalizeProviderError(new Error(`OpenAI-compatible request failed with status ${response.status}`), {
      code: getErrorCode(response.status),
      message: getErrorMessage(response.status)
    })
  }

  const contentType = response.headers?.get("content-type") ?? ""

  if (contentType.includes("text/event-stream")) {
    let rawText: string
    try {
      if (!response.text) {
        throw new Error("Response body does not support text()")
      }
      rawText = await response.text()
    } catch (textError) {
      throw normalizeProviderError(textError, {
        code: "invalid_response",
        message: "OpenAI-compatible returned invalid SSE stream"
      })
    }

    return parseSseText(rawText)
  }

  let data: OpenAiCompatibleResponse
  try {
    data = (await response.json()) as OpenAiCompatibleResponse
  } catch (jsonError) {
    throw normalizeProviderError(jsonError, {
      code: "invalid_response",
      message: "OpenAI-compatible returned invalid JSON (possible CORS or network error)"
    })
  }

  return extractChatTextContent(data)
}

async function analyzeViaResponsesApi(
  config: OpenAiCompatibleProviderConfig,
  input: AnalyzeInput,
  fetchImpl: FetchLike,
  timeoutMs: number
): Promise<string> {
  const url = `${normalizeBaseUrl(config.baseUrl)}/responses`
  const body = JSON.stringify({
    model: config.model,
    input: buildPrompt(input)
  })

  const response = await performRequest(config, fetchImpl, timeoutMs, url, body)

  if (!response.ok) {
    throw normalizeProviderError(new Error(`OpenAI-compatible request failed with status ${response.status}`), {
      code: getErrorCode(response.status),
      message: getErrorMessage(response.status)
    })
  }

  let data: ResponsesApiResponse
  try {
    data = (await response.json()) as ResponsesApiResponse
  } catch (jsonError) {
    throw normalizeProviderError(jsonError, {
      code: "invalid_response",
      message: "OpenAI-compatible returned invalid JSON (possible CORS or network error)"
    })
  }

  return extractResponsesTextContent(data)
}

async function performRequest(
  config: OpenAiCompatibleProviderConfig,
  fetchImpl: FetchLike,
  timeoutMs: number,
  url: string,
  body: string
): Promise<Awaited<ReturnType<FetchLike>>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    return await fetchImpl(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`
      },
      body
    })
  } catch (error) {
    throw normalizeProviderError(error, {
      code: "network_error",
      message: "OpenAI-compatible request failed"
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

function extractChatTextContent(data: OpenAiCompatibleResponse): string {
  const text = data.choices?.[0]?.message?.content?.trim()

  if (!text) {
    throw normalizeProviderError(new Error("OpenAI-compatible response did not include text content"), {
      code: "bad_model_output",
      message: "OpenAI-compatible returned no text output"
    })
  }

  return text
}

function extractResponsesTextContent(data: ResponsesApiResponse): string {
  const text = data.output
    ?.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text?.trim() ?? "")
    .filter((item) => item.length > 0)
    .join("\n")

  if (!text) {
    throw normalizeProviderError(new Error("OpenAI-compatible response did not include text content"), {
      code: "bad_model_output",
      message: "OpenAI-compatible returned no text output"
    })
  }

  return text
}

function shouldPreferResponsesApi(model: string): boolean {
  const normalized = model.trim().toLowerCase()
  return normalized === "gpt-5" || normalized.startsWith("gpt-5-") || normalized.startsWith("gpt-5.")
}

function shouldFallbackToResponses(error: unknown): boolean {
  const code = getProviderErrorCode(error)

  if (code === "auth_error" || code === "rate_limit_error" || code === "server_error" || code === "network_error") {
    return false
  }

  return code === "bad_model_output" || code === "invalid_response"
}

function shouldPreserveOriginalError(originalError: unknown, fallbackError: unknown): boolean {
  return getProviderErrorCode(originalError) === "bad_model_output" && getProviderErrorCode(fallbackError) === "invalid_response"
}

function getProviderErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined
  }

  return (error as ProviderLikeError).code
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

type SseChunk = {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
}

function parseSseText(text: string): string {
  const lines = text.split("\n")
  let content = ""

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("data:")) continue
    const payload = trimmed.slice("data:".length).trim()
    if (payload === "[DONE]") break

    let chunk: unknown
    try {
      chunk = JSON.parse(payload)
    } catch {
      continue
    }

    const delta = (chunk as SseChunk)?.choices?.[0]?.delta?.content
    if (delta) {
      content += delta
    }
  }

  if (!content) {
    throw normalizeProviderError(new Error("SSE stream contained no content"), {
      code: "bad_model_output",
      message: "OpenAI-compatible returned no text output"
    })
  }

  return content
}
