import type { AiProvider, AnalyzeInput, AnalyzeResult } from "./provider"

type OpenAiCompatibleProviderConfig = {
  apiKey: string
  baseUrl: string
  model: string
}

export class OpenAiCompatibleProvider implements AiProvider {
  constructor(private readonly config: OpenAiCompatibleProviderConfig) {}

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const summarySource = [input.title.trim(), input.content.trim()]
      .filter((value) => value.length > 0)
      .join(": ")
    const summary = summarySource.slice(0, 280)
    const tags = createTags(input)

    void this.config.apiKey
    void this.config.baseUrl
    void this.config.model

    return {
      summary: summary || input.url,
      tags
    }
  }
}

function createTags(input: AnalyzeInput): string[] {
  const url = new URL(input.url)
  const hostnameTag = url.hostname.replace(/^www\./, "")
  const titleTag = input.title
    .trim()
    .toLocaleLowerCase()
    .split(/[^a-z0-9]+/i)
    .find((segment) => segment.length >= 4)

  return [hostnameTag, titleTag]
    .filter((value): value is string => Boolean(value))
    .slice(0, 2)
}
