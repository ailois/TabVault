# Provider Expansion Design

**Date:** 2026-03-07
**Status:** Approved for planning

## Goal
Extend TabVault's current OpenAI-compatible analysis flow to also support Claude and Gemini without changing the higher-level bookmark analysis workflow.

## Scope

### In Scope
- Add `ClaudeProvider`
- Add `GeminiProvider`
- Extract provider selection into a shared factory
- Keep `AiProvider` as the common abstraction
- Normalize summary/tag output across all providers
- Normalize provider-specific errors into app-level categories
- Update popup integration to use the provider factory
- Add provider/factory tests

### Out of Scope
- Full provider settings UI
- Streaming responses
- Advanced structured output APIs
- Provider-specific UX customization
- Backend relay/proxy services

## Current State
- `AiProvider` already abstracts analysis through `analyze(input)`.
- `analyzeBookmark.ts` is provider-agnostic and can remain unchanged or nearly unchanged.
- `settings.ts` already supports `openai | claude | gemini`.
- `popup.tsx` is the main coupling point because it still instantiates `OpenAiCompatibleProvider` directly.

## Recommended Architecture

```text
src/lib/providers/
├── provider.ts
├── provider-factory.ts
├── openai-compatible-provider.ts
├── claude-provider.ts
└── gemini-provider.ts
```

### Provider flow
1. Popup loads the enabled provider config from settings storage.
2. Popup calls `createProvider(config)`.
3. Factory returns the correct `AiProvider` implementation.
4. `analyzeBookmark` calls `provider.analyze(...)`.
5. Provider returns normalized `{ summary, tags }`.

This keeps provider-specific API differences out of the popup and preserves a single analysis workflow.

## Shared Abstraction

The existing provider contract stays simple:

```ts
type AnalyzeInput = {
  title: string
  url: string
  content: string
}

type AnalyzeResult = {
  summary: string
  tags: string[]
}

interface AiProvider {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>
}
```

No provider-specific types should leak into `analyzeBookmark.ts` or the popup.

## Provider Implementations

### OpenAI-compatible
- Keep existing provider
- Move provider selection logic away from popup into the factory

### ClaudeProvider
- Endpoint: `POST /v1/messages`
- Headers:
  - `x-api-key`
  - `anthropic-version`
- Request shape uses `messages[]`
- Response text is parsed from `content[]`

### GeminiProvider
- Endpoint: `POST /v1/models/{model}:generateContent`
- Header:
  - `x-goog-api-key`
- Request shape uses `contents[].parts[]`
- Response text is parsed from `candidates[0].content.parts[]`

## Output Strategy

All providers should be asked to return a very small JSON payload as plain text:

```json
{"summary":"...","tags":["...","..."]}
```

Why this approach:
- works across providers
- avoids relying on provider-specific structured output features
- keeps parsing logic centralized and predictable

If parsing fails, return a normalized `bad_model_output` error.

## Error Normalization

Normalize provider-specific failures into these categories:
- `auth_error`
- `rate_limit_error`
- `quota_error`
- `invalid_request_error`
- `safety_blocked`
- `server_error`
- `network_error`
- `bad_model_output`

### Notes
- Claude has explicit auth/rate/overloaded style errors.
- Gemini may surface safety blocking in response metadata instead of only transport-layer errors.
- The popup and higher-level analysis flow should only consume normalized errors.

## Factory Design

Create a provider factory module:

```ts
createProvider(config: ProviderConfig): AiProvider
```

Responsibilities:
- switch on `config.provider`
- construct the correct provider instance
- keep popup free from provider-specific imports

The popup should depend on the factory, not on concrete provider classes.

## Testing Strategy

### Required tests
1. `provider-factory.test.ts`
   - returns OpenAI-compatible provider for `openai`
   - returns Claude provider for `claude`
   - returns Gemini provider for `gemini`

2. `claude-provider.test.ts`
   - builds correct request
   - parses successful response
   - normalizes common errors

3. `gemini-provider.test.ts`
   - builds correct request
   - parses successful response
   - normalizes safety-blocked and common errors

4. popup/provider integration test
   - verifies popup uses the factory-driven provider path rather than hardcoded OpenAI construction

## Risks to Avoid
- Keeping provider creation logic inside popup
- Introducing provider-specific branching inside `analyzeBookmark.ts`
- Designing a discriminated union config model before it is actually needed
- Implementing streaming or advanced output formats before plain JSON text is stable

## Recommended Next Step
Implement Claude and Gemini providers together in one provider-expansion phase, with a factory extraction first. This gives TabVault a complete multi-provider code path while keeping settings UI work separate.
