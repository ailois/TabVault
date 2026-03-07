# Provider Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Claude and Gemini provider support to TabVault by extracting provider selection into a shared factory and integrating both providers into the existing bookmark analysis flow.

**Architecture:** Keep `AiProvider` as the only provider-facing contract used by the popup and `analyzeBookmark`. Move provider selection into a factory, implement provider-specific request/response handling in separate classes, and normalize model output/errors so the rest of the app remains provider-agnostic.

**Tech Stack:** TypeScript, React, Plasmo, Vitest, Fetch API

---

### Task 1: Extract provider factory from popup

**Files:**
- Create: `src/lib/providers/provider-factory.ts`
- Modify: `src/popup.tsx`
- Test: `tests/providers/provider-factory.test.ts`

**Step 1: Write the failing test**

`tests/providers/provider-factory.test.ts`
```ts
import { describe, expect, it } from "vitest"
import { createProvider } from "../../src/lib/providers/provider-factory"

describe("createProvider", () => {
  it("creates an OpenAI-compatible provider for openai configs", () => {
    const provider = createProvider({
      provider: "openai",
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      enabled: true
    })

    expect(provider).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/provider-factory.test.ts
```

Expected: FAIL because `provider-factory.ts` does not exist.

**Step 3: Write minimal implementation**

`src/lib/providers/provider-factory.ts`
```ts
import type { ProviderConfig } from "../../types/settings"
import type { AiProvider } from "./provider"
import { OpenAiCompatibleProvider } from "./openai-compatible-provider"

export function createProvider(config: ProviderConfig): AiProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAiCompatibleProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
        model: config.model
      })
    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }
}
```

Update `src/popup.tsx` to import and use `createProvider` instead of directly constructing `OpenAiCompatibleProvider`.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/providers/provider-factory.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/providers/provider-factory.ts src/popup.tsx tests/providers/provider-factory.test.ts
git commit -m "feat: extract provider selection into a shared factory"
```

### Task 2: Add shared provider parsing and error normalization helpers

**Files:**
- Create: `src/lib/providers/provider-errors.ts`
- Create: `src/lib/providers/provider-output.ts`
- Test: `tests/providers/provider-output.test.ts`

**Step 1: Write the failing test**

`tests/providers/provider-output.test.ts`
```ts
import { describe, expect, it } from "vitest"
import { parseAnalyzeResult } from "../../src/lib/providers/provider-output"

describe("parseAnalyzeResult", () => {
  it("parses summary and tags from provider JSON text", () => {
    const result = parseAnalyzeResult('{"summary":"Short","tags":["one","two"]}')

    expect(result.summary).toBe("Short")
    expect(result.tags).toEqual(["one", "two"])
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/provider-output.test.ts
```

Expected: FAIL because helper module does not exist.

**Step 3: Write minimal implementation**

Create `provider-output.ts` to:
- parse plain-text JSON
- validate `summary` as string
- validate `tags` as string array
- throw `bad_model_output`-style errors when invalid

Create `provider-errors.ts` to expose a small normalization helper for provider-specific failures.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/providers/provider-output.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/providers/provider-errors.ts src/lib/providers/provider-output.ts tests/providers/provider-output.test.ts
git commit -m "feat: add provider output parsing and error normalization helpers"
```

### Task 3: Implement Claude provider

**Files:**
- Create: `src/lib/providers/claude-provider.ts`
- Modify: `src/lib/providers/provider-factory.ts`
- Test: `tests/providers/claude-provider.test.ts`
- Test: `tests/providers/provider-factory.test.ts`

**Step 1: Write the failing test**

`tests/providers/claude-provider.test.ts`
```ts
import { describe, expect, it, vi } from "vitest"
import { ClaudeProvider } from "../../src/lib/providers/claude-provider"

describe("ClaudeProvider", () => {
  it("parses Claude Messages API text output into summary and tags", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: '{"summary":"Short","tags":["a","b"]}' }]
      })
    }))

    const provider = new ClaudeProvider({
      apiKey: "test-key",
      model: "claude-sonnet-4-5",
      fetchImpl: fetchMock
    })

    const result = await provider.analyze({
      title: "Example",
      url: "https://example.com",
      content: "Example content"
    })

    expect(result.summary).toBe("Short")
    expect(result.tags).toEqual(["a", "b"])
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/claude-provider.test.ts
```

Expected: FAIL because `claude-provider.ts` does not exist.

**Step 3: Write minimal implementation**

Implement `ClaudeProvider` with:
- configurable `fetchImpl`
- Anthropic endpoint and required headers
- `messages[]` request body
- text extraction from `content[]`
- parsed result via `parseAnalyzeResult`
- normalized errors via shared helper

Update `provider-factory.ts` to return `ClaudeProvider` for `config.provider === "claude"`.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/providers/claude-provider.test.ts tests/providers/provider-factory.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/providers/claude-provider.ts src/lib/providers/provider-factory.ts tests/providers/claude-provider.test.ts tests/providers/provider-factory.test.ts
git commit -m "feat: add Claude provider support"
```

### Task 4: Implement Gemini provider

**Files:**
- Create: `src/lib/providers/gemini-provider.ts`
- Modify: `src/lib/providers/provider-factory.ts`
- Test: `tests/providers/gemini-provider.test.ts`
- Test: `tests/providers/provider-factory.test.ts`

**Step 1: Write the failing test**

`tests/providers/gemini-provider.test.ts`
```ts
import { describe, expect, it, vi } from "vitest"
import { GeminiProvider } from "../../src/lib/providers/gemini-provider"

describe("GeminiProvider", () => {
  it("parses Gemini response text into summary and tags", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"summary":"Short","tags":["x","y"]}' }]
            }
          }
        ]
      })
    }))

    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      fetchImpl: fetchMock
    })

    const result = await provider.analyze({
      title: "Example",
      url: "https://example.com",
      content: "Example content"
    })

    expect(result.summary).toBe("Short")
    expect(result.tags).toEqual(["x", "y"])
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/gemini-provider.test.ts
```

Expected: FAIL because `gemini-provider.ts` does not exist.

**Step 3: Write minimal implementation**

Implement `GeminiProvider` with:
- configurable `fetchImpl`
- Gemini generate-content endpoint
- `x-goog-api-key` header
- `contents[].parts[]` request body
- response parsing from `candidates[0].content.parts[]`
- safety-block normalization when prompt feedback or candidate result indicates blocking

Update `provider-factory.ts` to return `GeminiProvider` for `config.provider === "gemini"`.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/providers/gemini-provider.test.ts tests/providers/provider-factory.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/providers/gemini-provider.ts src/lib/providers/provider-factory.ts tests/providers/gemini-provider.test.ts tests/providers/provider-factory.test.ts
git commit -m "feat: add Gemini provider support"
```

### Task 5: Wire popup through the factory and preserve analysis behavior

**Files:**
- Modify: `src/popup.tsx`
- Modify: `tests/ui/popup-state.test.tsx`
- Test: `tests/ai/analyze-bookmark.test.ts`

**Step 1: Write the failing test**

Add a popup-state test that verifies a `claude` or `gemini` provider config is passed into the factory path and still triggers analysis.

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/popup-state.test.tsx
```

Expected: FAIL because popup wiring does not yet fully exercise the new provider path.

**Step 3: Write minimal implementation**

Update popup as needed so that:
- provider creation is always factory-driven
- provider-specific config reaches the correct implementation
- current save + auto-analyze flow remains intact

Keep UI behavior unchanged aside from using the new provider path.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/popup-state.test.tsx tests/ai/analyze-bookmark.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/popup.tsx tests/ui/popup-state.test.tsx tests/ai/analyze-bookmark.test.ts
git commit -m "feat: route popup analysis through provider factory"
```

### Task 6: Run full verification and document provider support

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Document:
- supported providers now include OpenAI-compatible, Claude, Gemini
- current provider-config shape and model field expectations
- any MVP limitations (settings UI still placeholder)

**Step 2: Run the full test suite**

Run:
```bash
npm exec vitest run
```

Expected: PASS.

**Step 3: Run typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

**Step 4: Run build**

Run:
```bash
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: describe Claude and Gemini provider support"
```
