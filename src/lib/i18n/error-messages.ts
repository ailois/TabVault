import type { DisplayLanguage } from "../../types/settings"
import { getMessage, type MessageKey } from "./messages"

const INTERNAL_FALLBACK_MESSAGES = new Set([
  "Analysis failed",
  "Trial not initialized",
  "Trial expired",
  "Built-in key not configured",
  "Failed to open bookmark database",
  "IndexedDB request failed",
  "IndexedDB transaction failed",
  "IndexedDB transaction aborted"
])

type FixedMessageKeyMap = Partial<Record<string, MessageKey>>
type ProviderCode =
  | "auth_error"
  | "rate_limit_error"
  | "server_error"
  | "invalid_request_error"
  | "network_error"
  | "invalid_response"
  | "bad_model_output"
  | "safety_blocked"
type ProviderName = "OpenAI-compatible" | "Claude" | "Gemini"

const KNOWN_LOCALIZED_MESSAGES: Record<string, Record<DisplayLanguage, string>> = {
  "OpenAI-compatible authentication failed": {
    en: "OpenAI-compatible authentication failed",
    zh: "OpenAI-compatible \u8eab\u4efd\u9a8c\u8bc1\u5931\u8d25"
  },
  "OpenAI-compatible rate limit exceeded": {
    en: "OpenAI-compatible rate limit exceeded",
    zh: "OpenAI-compatible \u8bf7\u6c42\u9891\u7387\u8d85\u9650"
  },
  "OpenAI-compatible service failed": {
    en: "OpenAI-compatible service failed",
    zh: "OpenAI-compatible \u670d\u52a1\u5f02\u5e38"
  },
  "OpenAI-compatible rejected the request": {
    en: "OpenAI-compatible rejected the request",
    zh: "OpenAI-compatible \u62d2\u7edd\u4e86\u8bf7\u6c42"
  },
  "OpenAI-compatible request failed": {
    en: "OpenAI-compatible request failed",
    zh: "OpenAI-compatible \u8bf7\u6c42\u5931\u8d25"
  },
  "OpenAI-compatible returned invalid SSE stream": {
    en: "OpenAI-compatible returned invalid SSE stream",
    zh: "OpenAI-compatible \u8fd4\u56de\u4e86\u65e0\u6548\u7684 SSE \u6d41"
  },
  "OpenAI-compatible returned invalid JSON (possible CORS or network error)": {
    en: "OpenAI-compatible returned invalid JSON (possible CORS or network error)",
    zh: "OpenAI-compatible \u8fd4\u56de\u4e86\u65e0\u6548 JSON\uff08\u53ef\u80fd\u662f CORS \u6216\u7f51\u7edc\u9519\u8bef\uff09"
  },
  "OpenAI-compatible returned no text output": {
    en: "OpenAI-compatible returned no text output",
    zh: "OpenAI-compatible \u672a\u8fd4\u56de\u6587\u672c\u7ed3\u679c"
  },
  "Claude authentication failed": {
    en: "Claude authentication failed",
    zh: "Claude \u8eab\u4efd\u9a8c\u8bc1\u5931\u8d25"
  },
  "Claude rate limit exceeded": {
    en: "Claude rate limit exceeded",
    zh: "Claude \u8bf7\u6c42\u9891\u7387\u8d85\u9650"
  },
  "Claude service failed": {
    en: "Claude service failed",
    zh: "Claude \u670d\u52a1\u5f02\u5e38"
  },
  "Claude rejected the request": {
    en: "Claude rejected the request",
    zh: "Claude \u62d2\u7edd\u4e86\u8bf7\u6c42"
  },
  "Claude request failed": {
    en: "Claude request failed",
    zh: "Claude \u8bf7\u6c42\u5931\u8d25"
  },
  "Claude returned invalid JSON (possible CORS or proxy error)": {
    en: "Claude returned invalid JSON (possible CORS or proxy error)",
    zh: "Claude \u8fd4\u56de\u4e86\u65e0\u6548 JSON\uff08\u53ef\u80fd\u662f CORS \u6216\u4ee3\u7406\u9519\u8bef\uff09"
  },
  "Claude returned no text output": {
    en: "Claude returned no text output",
    zh: "Claude \u672a\u8fd4\u56de\u6587\u672c\u7ed3\u679c"
  },
  "Gemini authentication failed": {
    en: "Gemini authentication failed",
    zh: "Gemini \u8eab\u4efd\u9a8c\u8bc1\u5931\u8d25"
  },
  "Gemini rate limit exceeded": {
    en: "Gemini rate limit exceeded",
    zh: "Gemini \u8bf7\u6c42\u9891\u7387\u8d85\u9650"
  },
  "Gemini service failed": {
    en: "Gemini service failed",
    zh: "Gemini \u670d\u52a1\u5f02\u5e38"
  },
  "Gemini rejected the request": {
    en: "Gemini rejected the request",
    zh: "Gemini \u62d2\u7edd\u4e86\u8bf7\u6c42"
  },
  "Gemini request failed": {
    en: "Gemini request failed",
    zh: "Gemini \u8bf7\u6c42\u5931\u8d25"
  },
  "Gemini blocked the request for safety reasons": {
    en: "Gemini blocked the request for safety reasons",
    zh: "Gemini \u56e0\u5b89\u5168\u7b56\u7565\u62e6\u622a\u4e86\u8bf7\u6c42"
  },
  "Gemini returned no text output": {
    en: "Gemini returned no text output",
    zh: "Gemini \u672a\u8fd4\u56de\u6587\u672c\u7ed3\u679c"
  },
  "Provider returned invalid JSON output": {
    en: "Provider returned invalid JSON output",
    zh: "\u6a21\u578b\u670d\u52a1\u8fd4\u56de\u4e86\u65e0\u6548 JSON"
  },
  "Provider returned invalid analyze result": {
    en: "Provider returned invalid analyze result",
    zh: "\u6a21\u578b\u670d\u52a1\u8fd4\u56de\u4e86\u65e0\u6548\u5206\u6790\u7ed3\u679c"
  }
}

const PROVIDER_CODE_MESSAGES: Record<ProviderCode, Record<ProviderName, Record<DisplayLanguage, string>>> = {
  auth_error: {
    "OpenAI-compatible": {
      en: "OpenAI-compatible authentication failed",
      zh: "OpenAI-compatible \u8eab\u4efd\u9a8c\u8bc1\u5931\u8d25"
    },
    Claude: {
      en: "Claude authentication failed",
      zh: "Claude \u8eab\u4efd\u9a8c\u8bc1\u5931\u8d25"
    },
    Gemini: {
      en: "Gemini authentication failed",
      zh: "Gemini \u8eab\u4efd\u9a8c\u8bc1\u5931\u8d25"
    }
  },
  rate_limit_error: {
    "OpenAI-compatible": {
      en: "OpenAI-compatible rate limit exceeded",
      zh: "OpenAI-compatible \u8bf7\u6c42\u9891\u7387\u8d85\u9650"
    },
    Claude: {
      en: "Claude rate limit exceeded",
      zh: "Claude \u8bf7\u6c42\u9891\u7387\u8d85\u9650"
    },
    Gemini: {
      en: "Gemini rate limit exceeded",
      zh: "Gemini \u8bf7\u6c42\u9891\u7387\u8d85\u9650"
    }
  },
  server_error: {
    "OpenAI-compatible": {
      en: "OpenAI-compatible service failed",
      zh: "OpenAI-compatible \u670d\u52a1\u5f02\u5e38"
    },
    Claude: {
      en: "Claude service failed",
      zh: "Claude \u670d\u52a1\u5f02\u5e38"
    },
    Gemini: {
      en: "Gemini service failed",
      zh: "Gemini \u670d\u52a1\u5f02\u5e38"
    }
  },
  invalid_request_error: {
    "OpenAI-compatible": {
      en: "OpenAI-compatible rejected the request",
      zh: "OpenAI-compatible \u62d2\u7edd\u4e86\u8bf7\u6c42"
    },
    Claude: {
      en: "Claude rejected the request",
      zh: "Claude \u62d2\u7edd\u4e86\u8bf7\u6c42"
    },
    Gemini: {
      en: "Gemini rejected the request",
      zh: "Gemini \u62d2\u7edd\u4e86\u8bf7\u6c42"
    }
  },
  network_error: {
    "OpenAI-compatible": {
      en: "OpenAI-compatible request failed",
      zh: "OpenAI-compatible \u8bf7\u6c42\u5931\u8d25"
    },
    Claude: {
      en: "Claude request failed",
      zh: "Claude \u8bf7\u6c42\u5931\u8d25"
    },
    Gemini: {
      en: "Gemini request failed",
      zh: "Gemini \u8bf7\u6c42\u5931\u8d25"
    }
  },
  invalid_response: {
    "OpenAI-compatible": {
      en: "OpenAI-compatible returned invalid JSON (possible CORS or network error)",
      zh: "OpenAI-compatible \u8fd4\u56de\u4e86\u65e0\u6548 JSON\uff08\u53ef\u80fd\u662f CORS \u6216\u7f51\u7edc\u9519\u8bef\uff09"
    },
    Claude: {
      en: "Claude returned invalid JSON (possible CORS or proxy error)",
      zh: "Claude \u8fd4\u56de\u4e86\u65e0\u6548 JSON\uff08\u53ef\u80fd\u662f CORS \u6216\u4ee3\u7406\u9519\u8bef\uff09"
    },
    Gemini: {
      en: "Gemini request failed",
      zh: "Gemini \u8bf7\u6c42\u5931\u8d25"
    }
  },
  bad_model_output: {
    "OpenAI-compatible": {
      en: "OpenAI-compatible returned no text output",
      zh: "OpenAI-compatible \u672a\u8fd4\u56de\u6587\u672c\u7ed3\u679c"
    },
    Claude: {
      en: "Claude returned no text output",
      zh: "Claude \u672a\u8fd4\u56de\u6587\u672c\u7ed3\u679c"
    },
    Gemini: {
      en: "Gemini returned no text output",
      zh: "Gemini \u672a\u8fd4\u56de\u6587\u672c\u7ed3\u679c"
    }
  },
  safety_blocked: {
    "OpenAI-compatible": {
      en: "OpenAI-compatible rejected the request",
      zh: "OpenAI-compatible \u62d2\u7edd\u4e86\u8bf7\u6c42"
    },
    Claude: {
      en: "Claude rejected the request",
      zh: "Claude \u62d2\u7edd\u4e86\u8bf7\u6c42"
    },
    Gemini: {
      en: "Gemini blocked the request for safety reasons",
      zh: "Gemini \u56e0\u5b89\u5168\u7b56\u7565\u62e6\u622a\u4e86\u8bf7\u6c42"
    }
  }
}

export function getLocalizedErrorMessage(
  language: DisplayLanguage,
  error: unknown,
  fallbackKey: MessageKey,
  fixedMessageKeys: FixedMessageKeyMap = {}
): string {
  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : null

  if (!rawMessage) {
    return getMessage(language, fallbackKey)
  }

  const fixedMessageKey = fixedMessageKeys[rawMessage]

  if (fixedMessageKey) {
    return getMessage(language, fixedMessageKey)
  }

  const localizedKnownMessage = localizeKnownErrorText(language, rawMessage)

  if (localizedKnownMessage !== rawMessage) {
    return localizedKnownMessage
  }

  if (error instanceof Error) {
    const localizedFromCode = localizeProviderErrorCode(language, error)

    if (localizedFromCode) {
      return localizedFromCode
    }
  }

  if (INTERNAL_FALLBACK_MESSAGES.has(rawMessage)) {
    return getMessage(language, fallbackKey)
  }

  return rawMessage
}

export function localizeKnownErrorText(language: DisplayLanguage, message: string): string {
  const exactMatch = KNOWN_LOCALIZED_MESSAGES[message]

  if (exactMatch) {
    return exactMatch[language]
  }

  for (const [knownMessage, translations] of Object.entries(KNOWN_LOCALIZED_MESSAGES)) {
    if (message.startsWith(`${knownMessage}: `)) {
      return `${translations[language]}: ${message.slice(knownMessage.length + 2)}`
    }
  }

  return message
}

function localizeProviderErrorCode(language: DisplayLanguage, error: Error): string | null {
  const code = (error as Error & { code?: unknown }).code

  if (typeof code !== "string") {
    return null
  }

  const provider = detectProviderName(error.message)

  if (!provider) {
    return null
  }

  return PROVIDER_CODE_MESSAGES[code as ProviderCode]?.[provider]?.[language] ?? null
}

function detectProviderName(message: string): ProviderName | null {
  if (message.startsWith("OpenAI-compatible")) {
    return "OpenAI-compatible"
  }

  if (message.startsWith("Claude")) {
    return "Claude"
  }

  if (message.startsWith("Gemini")) {
    return "Gemini"
  }

  return null
}
