# OpenAI-Compatible Real Network Design

**Date:** 2026-03-07
**Status:** Approved for planning

## Goal
Upgrade TabVault's `OpenAiCompatibleProvider` from an MVP stub into a real network-backed provider while keeping the current provider abstraction and analysis flow unchanged.

## Scope

### In Scope
- Replace local fake summary/tag generation with real HTTP requests
- Use OpenAI-compatible `chat/completions` style requests
- Support configurable `baseUrl`
- Parse model text output into `{ summary, tags }`
- Add timeout handling with `AbortController`
- Normalize network and HTTP errors into existing app-level error codes
- Add provider tests for success and failure cases

### Out of Scope
- Claude/Gemini network upgrades in this phase
- Streaming responses
- Retry logic
- Token usage display
- Advanced structured output APIs
- Prompt builder/editor UI

## Current State
- `OpenAiCompatibleProvider` does not perform any HTTP requests.
- It currently ignores `apiKey`, `baseUrl`, and `model`.
- Claude and Gemini already follow real API-shaped request logic, so OpenAI-compatible is the remaining obvious stub.

## Recommended Approach

### Option A: Minimal real request path (recommended)
- Real fetch request
- Real response parsing
- Timeout
- Existing parse/error helpers reused

This is the best fit now because it proves real provider behavior with minimal risk and preserves the current architecture.

### Option B: Real request + richer infrastructure
- Add retries
- Add usage parsing
- Add more configurable request knobs

Not recommended yet because it expands implementation and test surface before the first real call path is stable.

### Option C: Wait and convert all three providers together

Not recommended because OpenAI-compatible is the one provider most likely to be used first and is clearly still stubbed.

## Request Design

### Endpoint
Default request target:

```text
POST {baseUrl}/chat/completions
```

Base URL should be normalized with trailing slash trimming so this works for:
- OpenAI
- OpenRouter
- DeepSeek (OpenAI-compatible mode)
- other OpenAI-style gateways

### Headers

```http
Authorization: Bearer <apiKey>
Content-Type: application/json
```

### Request body

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "Analyze this bookmark and return strict JSON ..."
    }
  ],
  "temperature": 0.2
}
```

Keep the request body intentionally small and broadly compatible.

## Output Strategy

The model should still be instructed to return a small JSON string as plain text:

```json
{"summary":"...","tags":["...","..."]}
```

Then reuse:
- `parseAnalyzeResult(...)`
- `normalizeProviderError(...)`

This keeps output parsing consistent with the other provider implementations.

## Response Parsing

Expect text content at the common OpenAI-compatible location:

```ts
choices?.[0]?.message?.content
```

If no text content exists, normalize as `bad_model_output`.

## Error Normalization

Map response failures to existing categories:
- `401` / `403` -> `auth_error`
- `429` -> `rate_limit_error`
- `>= 500` -> `server_error`
- other `4xx` -> `invalid_request_error`
- fetch/abort failures -> `network_error`
- invalid JSON model output -> `bad_model_output`

## Timeout Design

Add a provider-local timeout using `AbortController`.

Recommended default:
- 20s or 30s

Requirements:
- abort the request if timeout is reached
- normalize timeout/abort as `network_error`
- clean up the timeout in `finally`

## Testing Strategy

### Required tests
Create `tests/providers/openai-compatible-provider.test.ts` to cover:

1. success path
   - valid API-shaped response
   - parsed `summary` + `tags`

2. auth failure
   - `401` or `403` -> `auth_error`

3. rate limit failure
   - `429` -> `rate_limit_error`

4. server failure
   - `500+` -> `server_error`

5. bad model output
   - missing content or non-JSON text -> `bad_model_output`

6. network/abort failure
   - thrown fetch error or abort -> `network_error`

No popup/factory changes should be necessary beyond the provider itself if the public provider contract remains stable.

## Risks to Avoid
- Using OpenAI-specific features that break OpenAI-compatible gateways
- Skipping timeout handling
- Returning raw provider responses outside the provider layer
- Mixing request-construction concerns into popup or `analyzeBookmark`

## Recommended Next Step
Implement the real OpenAI-compatible provider path first, keep the abstraction stable, and use the result as the reference pattern for later real Claude/Gemini upgrades.
