# Claude and Gemini Real Network Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring Claude and Gemini providers up to the same robustness level as the real OpenAI-compatible provider by tightening network failure boundaries, adding timeout handling, and expanding test coverage.

**Architecture:** Keep provider-specific request/response logic inside `ClaudeProvider` and `GeminiProvider`, but align their failure boundaries with the OpenAI-compatible provider. Only actual fetch/abort failures should become `network_error`; HTTP error mapping, safety blocking, and model-output parsing should remain outside that catch path.

**Tech Stack:** TypeScript, Fetch API, AbortController, Vitest

---

### Task 1: Expand Claude provider tests to cover real-network boundaries

**Files:**
- Modify: `tests/providers/claude-provider.test.ts`

**Step 1: Write the failing tests**

Add coverage for:
- request URL and required headers
- `401/403 -> auth_error`
- `429 -> rate_limit_error`
- `500 -> server_error`
- representative other `4xx -> invalid_request_error`
- fetch rejection -> `network_error`
- timeout abort -> `network_error`
- missing text -> `bad_model_output`
- synchronous pre-fetch throw is not normalized as `network_error`

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/claude-provider.test.ts
```

Expected: FAIL because current Claude implementation and tests do not yet cover those boundaries.

**Step 3: Keep implementation unchanged for now**

Only add the failing tests first.

**Step 4: Run test again**

Run:
```bash
npm exec vitest run tests/providers/claude-provider.test.ts
```

Expected: Still FAIL until the provider implementation is hardened in Task 2.

**Step 5: Commit**

```bash
git add tests/providers/claude-provider.test.ts
git commit -m "test: expand Claude provider real-network coverage"
```

### Task 2: Harden Claude provider network boundaries and timeout behavior

**Files:**
- Modify: `src/lib/providers/claude-provider.ts`
- Modify: `tests/providers/claude-provider.test.ts`

**Step 1: Implement the minimal fix**

Update `src/lib/providers/claude-provider.ts` to:
- accept optional `timeoutMs`
- create `AbortController`
- build prompt/body before the fetch-only `try`
- catch only fetch/abort failures and normalize them to `network_error`
- keep non-OK status handling outside that catch
- keep missing text handling outside that catch
- clear the timeout in `finally`

**Step 2: Run targeted tests**

Run:
```bash
npm exec vitest run tests/providers/claude-provider.test.ts
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
git add src/lib/providers/claude-provider.ts tests/providers/claude-provider.test.ts
git commit -m "feat: harden Claude provider network handling"
```

### Task 3: Expand Gemini provider tests to cover parity gaps

**Files:**
- Modify: `tests/providers/gemini-provider.test.ts`

**Step 1: Write the failing tests**

Add coverage for the remaining parity gaps:
- `429 -> rate_limit_error`
- `500 -> server_error`
- representative other `4xx -> invalid_request_error`
- fetch rejection -> `network_error`
- timeout abort -> `network_error`
- missing text -> `bad_model_output`
- synchronous pre-fetch throw is not normalized as `network_error`

Keep existing request-shape and safety-block tests.

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/gemini-provider.test.ts
```

Expected: FAIL because current Gemini coverage is incomplete and the provider still has a broad catch.

**Step 3: Leave implementation unchanged for now**

Only land the failing tests first.

**Step 4: Run test again**

Run:
```bash
npm exec vitest run tests/providers/gemini-provider.test.ts
```

Expected: Still FAIL until Task 4 is implemented.

**Step 5: Commit**

```bash
git add tests/providers/gemini-provider.test.ts
git commit -m "test: expand Gemini provider real-network coverage"
```

### Task 4: Harden Gemini provider network boundaries and timeout behavior

**Files:**
- Modify: `src/lib/providers/gemini-provider.ts`
- Modify: `tests/providers/gemini-provider.test.ts`

**Step 1: Implement the minimal fix**

Update `src/lib/providers/gemini-provider.ts` to:
- accept optional `timeoutMs`
- create `AbortController`
- build URL/body before the fetch-only `try`
- catch only fetch/abort failures and normalize them to `network_error`
- keep status handling, safety blocking, and missing-text handling outside that catch
- clear the timeout in `finally`

**Step 2: Run targeted tests**

Run:
```bash
npm exec vitest run tests/providers/gemini-provider.test.ts
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
git add src/lib/providers/gemini-provider.ts tests/providers/gemini-provider.test.ts
git commit -m "feat: harden Gemini provider network handling"
```

### Task 5: Update README and run full verification

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Clarify that:
- OpenAI-compatible, Claude, and Gemini all use real network request paths
- provider support remains MVP-level overall despite improved transport robustness
- user-managed client-side keys remain a product tradeoff

**Step 2: Run targeted provider tests**

Run:
```bash
npm exec vitest run tests/providers/claude-provider.test.ts tests/providers/gemini-provider.test.ts
```

Expected: PASS.

**Step 3: Run full test suite**

Run:
```bash
npm exec vitest run
```

Expected: PASS.

**Step 4: Run typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

**Step 5: Run build**

Run:
```bash
npm run build
```

Expected: PASS.

**Step 6: Commit**

```bash
git add README.md
git commit -m "docs: clarify Claude and Gemini network support"
```
