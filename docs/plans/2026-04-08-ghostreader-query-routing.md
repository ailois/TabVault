# Ghostreader Query Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Route Ghostreader queries between current-only answering and cross-bookmark retrieval so summary-style questions stop surfacing irrelevant bookmarks and produce cleaner, more accurate answers.

**Architecture:** Introduce a lightweight Ghostreader routing mode in the hybrid-retrieval layer, then apply it to both `src/sidepanel.tsx` and `src/features/dashboard/dashboard-ask-box.tsx`. Keep provider integration and fallback behavior intact while preventing current-only questions from running cross-bookmark retrieval or rendering result lists.

**Tech Stack:** React, TypeScript, Vitest, existing hybrid retrieval helpers

---

### Task 1: Define Ghostreader routing expectations in tests

**Files:**
- Modify: `tests/hybrid-retrieval/query-intent.test.ts`
- Modify: `tests/ui/sidepanel-ghostreader.test.tsx`
- Modify: `tests/ui/dashboard-ask-box.test.tsx`

**Step 1: Write the failing test**
- Add intent tests for current-only vs cross-bookmark questions.
- Add sidepanel tests proving “summarize this bookmark” does not surface unrelated saved bookmarks.
- Add dashboard tests proving summary-style ask flow avoids cross-bookmark result noise.

**Step 2: Run test to verify it fails**

Run: `cmd /c npx -y vitest run tests\hybrid-retrieval\query-intent.test.ts tests\ui\sidepanel-ghostreader.test.tsx tests\ui\dashboard-ask-box.test.tsx`

Expected: FAIL because Ghostreader still always performs hybrid retrieval and shows saved bookmark results.

**Step 3: Write minimal implementation**
- No implementation in this task; move to Task 2 after the failure is confirmed.

**Step 4: Re-run failing scope to confirm red state**

Run: `cmd /c npx -y vitest run tests\hybrid-retrieval\query-intent.test.ts tests\ui\sidepanel-ghostreader.test.tsx tests\ui\dashboard-ask-box.test.tsx`

Expected: FAIL

**Step 5: Commit**
- Commit after implementation and verification pass.

### Task 2: Add a reusable Ghostreader query mode

**Files:**
- Modify: `src/features/hybrid-retrieval/query-intent.ts`
- Modify: `src/features/hybrid-retrieval/hybrid-types.ts`

**Step 1: Implement the minimal routing primitive**
- Add a dedicated Ghostreader query mode type.
- Add a helper that classifies Ghostreader prompts as `current-only` or `cross-bookmark`.
- Keep existing `detectQueryIntent(...)` behavior for generic search flows unchanged.

**Step 2: Run focused tests**

Run: `cmd /c npx -y vitest run tests\hybrid-retrieval\query-intent.test.ts`

Expected: PASS

**Step 3: Commit**
- Include the routing primitive in the eventual feature commit.

### Task 3: Apply routing to sidepanel Ghostreader

**Files:**
- Modify: `src/sidepanel.tsx`
- Modify: `src/features/hybrid-retrieval/ghostreader.ts`
- Modify: `src/components/hybrid-query-stream.tsx`
- Test: `tests/ui/sidepanel-ghostreader.test.tsx`

**Step 1: Implement sidepanel routing**
- Skip `retrieveHybridResults(...)` for current-only Ghostreader questions.
- Build prompt content from current-page context only in current-only mode.
- Avoid rendering saved bookmark result cards and action cards in current-only mode.
- Preserve current fallback and provider error behavior.

**Step 2: Run focused tests**

Run: `cmd /c npx -y vitest run tests\ui\sidepanel-ghostreader.test.tsx`

Expected: PASS

**Step 3: Commit**
- Include sidepanel routing in the eventual feature commit.

### Task 4: Apply routing to dashboard Ghostreader

**Files:**
- Modify: `src/features/dashboard/dashboard-ask-box.tsx`
- Modify: `src/features/hybrid-retrieval/ghostreader.ts`
- Modify: `src/components/hybrid-query-stream.tsx`
- Test: `tests/ui/dashboard-ask-box.test.tsx`

**Step 1: Implement dashboard routing**
- Mirror sidepanel routing behavior in dashboard ask flow.
- Prevent current-only questions from showing irrelevant saved bookmark hits.
- Keep cross-bookmark questions working as before.

**Step 2: Run focused tests**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-ask-box.test.tsx`

Expected: PASS

**Step 3: Commit**
- Include dashboard routing in the eventual feature commit.

### Task 5: Run integration verification

**Files:**
- Verify only

**Step 1: Run the targeted regression suite**

Run: `cmd /c npx -y vitest run tests\hybrid-retrieval\query-intent.test.ts tests\ui\sidepanel-ghostreader.test.tsx tests\ui\dashboard-ask-box.test.tsx`

Expected: PASS

**Step 2: Run broader dashboard and sidepanel coverage**

Run: `cmd /c npx -y vitest run tests\ui\sidepanel.test.tsx tests\ui\sidepanel-ghostreader.test.tsx tests\ui\dashboard-ask-box.test.tsx tests\ui\dashboard-shell.test.tsx`

Expected: PASS

**Step 3: Run typecheck**

Run: `cmd /c npm run typecheck`

Expected: PASS

**Step 4: Commit**
- Commit with a message summarizing Ghostreader routing cleanup.
