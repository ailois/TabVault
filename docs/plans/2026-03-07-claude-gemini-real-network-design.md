# Claude and Gemini Real Network Design

**Date:** 2026-03-07
**Status:** Approved for planning

## Goal
Upgrade TabVault's Claude and Gemini providers to match the robustness level of the new real OpenAI-compatible implementation without changing the higher-level provider abstraction or popup analysis flow.

## Scope

### In Scope
- Add timeout handling with `AbortController` to Claude and Gemini providers
- Narrow catch scope so only actual fetch/network failures become `network_error`
- Preserve provider-specific HTTP error normalization
- Preserve provider-specific response extraction
- Preserve Gemini safety-block handling
- Expand provider tests to cover success, HTTP failures, timeout/network failures, and bad-model-output boundaries
- Update README/docs to reflect provider maturity accurately

### Out of Scope
- Streaming responses
- Retry logic
- Usage/token display
- Provider health checks
- Additional UI work
- Backend proxy architecture changes

## Current State

### Claude
- Already performs a real `POST https://api.anthropic.com/v1/messages`
- Already sends required headers and parses text from `content[]`
- Already maps common HTTP errors
- Current gap: its broad catch converts **all** thrown errors into `network_error`, which is looser than the OpenAI-compatible provider now allows
- Current tests are too shallow: only happy-path parsing is covered

### Gemini
- Already performs a real `POST .../models/{model}:generateContent`
- Already sends `x-goog-api-key`
- Already parses `candidates[0].content.parts[]`
- Already detects safety-blocked responses
- Current gap: broad catch scope still normalizes too much as `network_error`
- Current tests are stronger than Claude's, but still do not cover timeout handling or the boundary between pre-fetch and fetch-time failures

## Recommended Approach

### Option A: Match OpenAI-compatible robustness level (recommended)
- Add timeout handling
- Narrow catch to fetch-only failures
- Add tests for boundary behavior
- Keep provider-specific request/response logic intact

This is the best option because it brings all three providers to a consistent reliability model without expanding the architecture.

### Option B: Minimal patching only
- Add timeout
- Leave broad catch behavior mostly as-is

Not recommended because it preserves inconsistent failure semantics across providers.

### Option C: Full provider refactor into shared base class

Not recommended yet. The providers are still small enough that a shared base class would risk premature abstraction.

## Design Principles

1. **Keep `AiProvider` unchanged**
2. **Keep provider-specific request shape inside each provider**
3. **Match the OpenAI-compatible failure boundary**:
   - request construction errors should not be reclassified as network errors
   - actual fetch/abort failures should become `network_error`
4. **Preserve existing response extractors and provider-specific error messages where correct**

## Claude Design

### Request
- Endpoint stays `POST https://api.anthropic.com/v1/messages`
- Keep:
  - `x-api-key`
  - `anthropic-version`
  - `model`
  - `max_tokens`
  - `messages[]`

### Changes
- Add configurable `timeoutMs`
- Create `AbortController`
- Build request body before the fetch try/catch
- Catch only the actual fetch call
- Handle non-OK HTTP responses outside the fetch catch
- Keep text extraction and `parseAnalyzeResult(...)` outside network-error normalization

### Expected boundary
- fetch rejection / timeout abort -> `network_error`
- 401/403 -> `auth_error`
- 429 -> `rate_limit_error`
- 5xx -> `server_error`
- other 4xx -> `invalid_request_error`
- missing text -> `bad_model_output`

## Gemini Design

### Request
- Endpoint stays `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Keep:
  - `x-goog-api-key`
  - `contents[].parts[]`

### Changes
- Add configurable `timeoutMs`
- Create `AbortController`
- Build URL/body before the fetch try/catch
- Catch only the actual fetch call
- Keep non-OK HTTP handling outside network-error normalization
- Preserve safety-block checks outside the network catch

### Expected boundary
- fetch rejection / timeout abort -> `network_error`
- 401/403 -> `auth_error`
- 429 -> `rate_limit_error`
- 5xx -> `server_error`
- other 4xx -> `invalid_request_error`
- prompt/candidate safety block -> `safety_blocked`
- missing text -> `bad_model_output`

## Testing Strategy

### Claude tests should cover
1. success parse
2. request shape
3. auth/rate/server/invalid-request HTTP mappings
4. fetch rejection -> `network_error`
5. timeout abort -> `network_error`
6. missing text -> `bad_model_output`
7. synchronous pre-fetch error is **not** normalized as `network_error`

### Gemini tests should cover
1. success parse
2. request shape
3. auth/rate/server/invalid-request HTTP mappings
4. fetch rejection -> `network_error`
5. timeout abort -> `network_error`
6. safety-block response -> `safety_blocked`
7. missing text -> `bad_model_output`
8. synchronous pre-fetch error is **not** normalized as `network_error`

## Documentation Expectations

README should reflect:
- OpenAI-compatible, Claude, and Gemini now all use real network calls
- provider UX is still MVP-level
- direct browser-stored user keys remain an intentional product tradeoff

## Risks to Avoid
- Catching too much and collapsing provider/output errors into `network_error`
- Introducing shared abstractions that obscure provider-specific request differences
- Changing popup or `analyzeBookmark` for provider-internal concerns
- Overstating provider maturity in README beyond what tests verify

## Recommended Next Step
Implement Claude and Gemini timeout/failure-boundary hardening separately but symmetrically, with test expansion first for each provider. That yields parity with OpenAI-compatible without unnecessary refactoring.
