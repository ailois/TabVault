import type { DisplayLanguage, ProviderType } from "../../types/settings"

type ProviderPresentation = {
  label: string
  description: string
}

const PROVIDER_PRESENTATIONS: Record<DisplayLanguage, Record<ProviderType, ProviderPresentation>> = {
  en: {
    openai: {
      label: "OpenAI Chat",
      description: "/v1/chat/completions"
    },
    "openai-response": {
      label: "OpenAI Response",
      description: "/v1/responses"
    },
    claude: {
      label: "Claude",
      description: "Anthropic Messages"
    },
    gemini: {
      label: "Gemini",
      description: "Google AI Studio"
    }
  },
  zh: {
    openai: {
      label: "OpenAI \u804a\u5929\u8865\u5168",
      description: "/v1/chat/completions"
    },
    "openai-response": {
      label: "OpenAI Response",
      description: "/v1/responses"
    },
    claude: {
      label: "Claude",
      description: "Anthropic Messages"
    },
    gemini: {
      label: "Gemini",
      description: "Google AI Studio"
    }
  }
}

export function getProviderPresentation(language: DisplayLanguage, provider: ProviderType): ProviderPresentation {
  return PROVIDER_PRESENTATIONS[language][provider]
}
