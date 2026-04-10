# Ghostreader Follow-up Memory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Ghostreader reliably continue short follow-up questions by persisting structured follow-up memory, passing recent paired turns into prompts, and resolving natural references across sidepanel and dashboard flows.

**Architecture:** Extend `GhostreaderSession` with a lightweight `followUpMemory` object that stores the latest structured continuation anchor. Keep the current session store and UI, but upgrade reference resolution and prompt-building so both sidepanel and dashboard can continue the latest 2-3 turns, bind explicit references to bookmark IDs, and fall back to semantic continuation when no bookmark target exists.

**Tech Stack:** React, TypeScript, Chrome extension storage, Vitest

---

### Task 1: Add follow-up memory to session types

**Files:**
- Modify: `src/features/ghostreader-session/ghostreader-session-types.ts`
- Test: `tests/ghostreader-session/ghostreader-session-store.test.ts`

**Step 1: Write the failing test**

Update the session store test so a freshly created session is expected to include an empty `followUpMemory` object after save/load.

```ts
expect(session.followUpMemory).toEqual({
  lastQuery: "",
  lastAnswer: "",
  lastReferencedBookmarkIds: [],
  lastQueryMode: null,
  updatedAt: null
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-session-store.test.ts
```
Expected: FAIL because `followUpMemory` is missing on `GhostreaderSession`.

**Step 3: Write minimal implementation**

Add the new follow-up memory type and initialize it in `createEmptyGhostreaderSession(...)`.

```ts
export type GhostreaderFollowUpMemory = {
  lastQuery: string
  lastAnswer: string
  lastReferencedBookmarkIds: string[]
  lastQueryMode: GhostreaderQueryMode | null
  updatedAt: string | null
}
```

```ts
followUpMemory: {
  lastQuery: "",
  lastAnswer: "",
  lastReferencedBookmarkIds: [],
  lastQueryMode: null,
  updatedAt: null
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-session-store.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ghostreader-session/ghostreader-session-store.test.ts src/features/ghostreader-session/ghostreader-session-types.ts
git commit -m "feat: add ghostreader follow-up session memory"
```

---

### Task 2: Backfill follow-up memory for older persisted sessions

**Files:**
- Modify: `src/features/ghostreader-session/ghostreader-session-store.ts`
- Test: `tests/ghostreader-session/ghostreader-session-store.test.ts`

**Step 1: Write the failing test**

Add a load test where storage returns an older persisted session without `followUpMemory`, and assert the loaded session gets default values.

```ts
await expect(store.loadSessions()).resolves.toMatchObject({
  sessions: [
    expect.objectContaining({
      followUpMemory: {
        lastQuery: "",
        lastAnswer: "",
        lastReferencedBookmarkIds: [],
        lastQueryMode: null,
        updatedAt: null
      }
    })
  ]
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-session-store.test.ts
```
Expected: FAIL because old sessions are returned unchanged.

**Step 3: Write minimal implementation**

Normalize sessions during load/save so missing `followUpMemory` is filled in.

```ts
function normalizeSessionShape(session: GhostreaderSession): GhostreaderSession {
  return {
    ...session,
    followUpMemory: session.followUpMemory ?? {
      lastQuery: "",
      lastAnswer: "",
      lastReferencedBookmarkIds: [],
      lastQueryMode: null,
      updatedAt: null
    }
  }
}
```

Call it from `normalizeSessions(...)` before trimming/sorting.

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-session-store.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ghostreader-session/ghostreader-session-store.test.ts src/features/ghostreader-session/ghostreader-session-store.ts
git commit -m "fix: normalize legacy ghostreader session memory"
```

---

### Task 3: Add reducer support for follow-up memory updates

**Files:**
- Modify: `src/features/ghostreader-session/ghostreader-session-reducer.ts`
- Test: `tests/ghostreader-session/ghostreader-session-reducer.test.ts`

**Step 1: Write the failing test**

Add a reducer test for a new helper that records the latest query, answer, query mode, and referenced bookmark IDs.

```ts
const next = updateFollowUpMemory(session, {
  lastQuery: "这个为什么值得收藏？",
  lastAnswer: "因为它总结了核心观点",
  lastReferencedBookmarkIds: ["bm-1"],
  lastQueryMode: "cross-bookmark"
})

expect(next.followUpMemory).toMatchObject({
  lastQuery: "这个为什么值得收藏？",
  lastAnswer: "因为它总结了核心观点",
  lastReferencedBookmarkIds: ["bm-1"],
  lastQueryMode: "cross-bookmark"
})
```

Also add an overwrite test showing newer values replace older ones.

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-session-reducer.test.ts
```
Expected: FAIL because `updateFollowUpMemory` does not exist.

**Step 3: Write minimal implementation**

Add `updateFollowUpMemory(...)`.

```ts
export function updateFollowUpMemory(session: GhostreaderSession, input: {
  lastQuery: string
  lastAnswer: string
  lastReferencedBookmarkIds: string[]
  lastQueryMode: GhostreaderQueryMode | null
}): GhostreaderSession {
  const updatedAt = nowIso(session.updatedAt)
  return {
    ...touchSession(session, updatedAt),
    followUpMemory: {
      lastQuery: input.lastQuery,
      lastAnswer: input.lastAnswer,
      lastReferencedBookmarkIds: dedupeBookmarkIds(input.lastReferencedBookmarkIds),
      lastQueryMode: input.lastQueryMode,
      updatedAt
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-session-reducer.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ghostreader-session/ghostreader-session-reducer.test.ts src/features/ghostreader-session/ghostreader-session-reducer.ts
git commit -m "feat: add ghostreader follow-up reducer"
```

---

### Task 4: Expand reference resolution for explicit, ordinal, and short follow-ups

**Files:**
- Modify: `src/features/ghostreader-session/ghostreader-reference-resolution.ts`
- Modify: `src/features/ghostreader-session/ghostreader-session-types.ts`
- Test: `tests/ghostreader-session/ghostreader-reference-resolution.test.ts`

**Step 1: Write the failing tests**

Add tests for:
- `刚才那个` resolving to `followUpMemory.lastReferencedBookmarkIds`
- `第一个结果展开说说` resolving to the first latest result ID
- `为什么值得收藏？` being treated as a reference-style follow-up when `followUpMemory.lastReferencedBookmarkIds` exists
- `具体呢？` being treated as a semantic follow-up even when no bookmark IDs exist

Example:

```ts
const session = {
  ...createEmptyGhostreaderSession({ id: "session-1", title: "New session" }),
  followUpMemory: {
    lastQuery: "帮我找一个关于杨幂的书签",
    lastAnswer: "我找到一个采访合集",
    lastReferencedBookmarkIds: ["bm-2"],
    lastQueryMode: "cross-bookmark",
    updatedAt: "2026-04-10T00:00:00.000Z"
  }
}

expect(resolveSessionReferences("刚才那个为什么重要", {
  session,
  latestResultBookmarkIds: ["bm-3", "bm-4"]
})).toMatchObject({
  bookmarkIds: ["bm-2"],
  isReferenceQuery: true
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-reference-resolution.test.ts
```
Expected: FAIL because those expressions are not recognized.

**Step 3: Write minimal implementation**

Add markers and ordinal parsing. Extend the resolution order:
1. recently added markers
2. previous-result markers
3. ordinal result markers
4. singular/plural markers
5. short follow-up markers using `followUpMemory`

Add a semantic-only branch by returning:

```ts
{
  bookmarkIds: [],
  isReferenceQuery: true,
  source: null
}
```

for short follow-ups with no bookmark IDs.

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-reference-resolution.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ghostreader-session/ghostreader-reference-resolution.test.ts src/features/ghostreader-session/ghostreader-reference-resolution.ts src/features/ghostreader-session/ghostreader-session-types.ts
git commit -m "feat: improve ghostreader follow-up reference resolution"
```

---

### Task 5: Build recent paired turns for prompt context

**Files:**
- Modify: `src/features/hybrid-retrieval/ghostreader.ts`
- Create or Modify: `tests/ghostreader-session/ghostreader-prompt-context.test.ts`

**Step 1: Write the failing test**

Add a test for prompt-building that asserts the session block includes:
- recent user/assistant turns
- follow-up memory summary
- recent added bookmarks

Example:

```ts
const content = buildGhostreaderContent({
  language: "zh",
  query: "为什么值得收藏？",
  currentPageContext: null,
  rankedResults: [],
  mode: "current-only",
  sessionContext: {
    intentSummary: "用户当前关注：杨幂采访",
    recentTurns: [
      { user: "帮我找一个相关书签", assistant: "我找到一个采访合集" }
    ],
    followUpMemory: {
      lastQuery: "帮我找一个相关书签",
      lastAnswer: "我找到一个采访合集",
      lastReferencedBookmarkIds: ["bm-1"],
      lastQueryMode: "cross-bookmark",
      updatedAt: "2026-04-10T00:00:00.000Z"
    },
    recentAddedBookmarks: []
  }
})

expect(content).toContain("最近对话")
expect(content).toContain("帮我找一个相关书签")
expect(content).toContain("我找到一个采访合集")
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-prompt-context.test.ts
```
Expected: FAIL because `recentTurns` and `followUpMemory` are not supported.

**Step 3: Write minimal implementation**

Update `GhostreaderSessionContext` and `buildSessionBlock(...)` to accept:

```ts
recentTurns: Array<{ user: string; assistant?: string }>
followUpMemory?: {
  lastQuery: string
  lastAnswer: string
  lastReferencedBookmarkIds: string[]
  lastQueryMode: GhostreaderQueryMode | null
  updatedAt: string | null
}
```

Render the latest 2-3 turns with role labels and include a concise follow-up memory section only when non-empty.

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-prompt-context.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ghostreader-session/ghostreader-prompt-context.test.ts src/features/hybrid-retrieval/ghostreader.ts
git commit -m "feat: add ghostreader prompt follow-up context"
```

---

### Task 6: Use recent paired turns and follow-up memory in sidepanel flow

**Files:**
- Modify: `src/sidepanel.tsx`
- Modify: `src/features/ghostreader-session/ghostreader-session-reducer.ts`
- Test: `tests/ghostreader-session/ghostreader-session-view.test.ts` or `tests/ghostreader-session/ghostreader-prompt-context.test.ts`

**Step 1: Write the failing test**

Add a focused test for a small helper that converts `session.messages` into the latest 2-3 user/assistant turns.

```ts
expect(buildRecentTurns(session.messages)).toEqual([
  { user: "找一个相关书签", assistant: "这是第一个结果" },
  { user: "为什么值得收藏？", assistant: "因为它覆盖面完整" }
])
```

If no helper exists yet, extract one into a session utility module and test it directly.

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-prompt-context.test.ts
```
Expected: FAIL because no recent-turn helper exists.

**Step 3: Write minimal implementation**

In `src/sidepanel.tsx`:
- replace flat `recentMessages` with recent paired turns
- pass `followUpMemory` into `buildGhostreaderContent(...)`
- after successful assistant/fallback response, call `updateFollowUpMemory(...)`
- only bind bookmark IDs when they exist; otherwise keep semantic continuation only

Example call shape:

```ts
sessionContext: {
  intentSummary: nextSession.intentMemory.summary,
  recentTurns,
  followUpMemory: nextSession.followUpMemory,
  recentAddedBookmarks
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-prompt-context.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/sidepanel.tsx src/features/ghostreader-session/ghostreader-session-reducer.ts tests/ghostreader-session/ghostreader-prompt-context.test.ts
git commit -m "feat: add sidepanel ghostreader follow-up context"
```

---

### Task 7: Mirror follow-up behavior in dashboard flow

**Files:**
- Modify: `src/features/dashboard/dashboard-ask-box.tsx`
- Test: `tests/ghostreader-session/ghostreader-prompt-context.test.ts`

**Step 1: Write the failing test**

Add a test covering the dashboard-side prompt/session context builder if it differs from sidepanel, or expand the shared helper test to assert both flows use the same recent-turn/follow-up-memory shape.

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-prompt-context.test.ts
```
Expected: FAIL because dashboard still passes flat recent messages.

**Step 3: Write minimal implementation**

In `src/features/dashboard/dashboard-ask-box.tsx`:
- build the same recent 2-3 turns
- pass `followUpMemory`
- update `followUpMemory` after normal and fallback assistant responses
- preserve the same semantic-only continuation rule when no bookmark IDs exist

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-prompt-context.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-ask-box.tsx tests/ghostreader-session/ghostreader-prompt-context.test.ts
git commit -m "feat: align dashboard ghostreader follow-up context"
```

---

### Task 8: Restore recent reference context after reload

**Files:**
- Modify: `src/features/ghostreader-session/ghostreader-session-view.ts`
- Test: `tests/ghostreader-session/ghostreader-session-view.test.ts`

**Step 1: Write the failing test**

Add a session view test asserting snapshot restoration prefers `followUpMemory.lastReferencedBookmarkIds` when present.

```ts
expect(getGhostreaderSessionSnapshot(session)).toMatchObject({
  referencedBookmarkIds: ["bm-9"]
})
```

where `followUpMemory.lastReferencedBookmarkIds` is `["bm-9"]` and the message-derived IDs are empty.

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-session-view.test.ts
```
Expected: FAIL because snapshot only uses messages and working set.

**Step 3: Write minimal implementation**

Update `getGhostreaderSessionSnapshot(...)` to union in `session.followUpMemory.lastReferencedBookmarkIds` before returning.

```ts
referencedBookmarkIds: Array.from(new Set([
  ...(session.followUpMemory.lastReferencedBookmarkIds ?? []),
  ...(lastAssistantMessage?.referencedBookmarkIds ?? []),
  ...lastUserMessage.referencedBookmarkIds,
  ...session.workingSetBookmarkIds
]))
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-session-view.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ghostreader-session/ghostreader-session-view.test.ts src/features/ghostreader-session/ghostreader-session-view.ts
git commit -m "fix: restore ghostreader follow-up references after reload"
```

---

### Task 9: Run focused verification for all Ghostreader session behavior

**Files:**
- Modify: none
- Test: `tests/ghostreader-session/ghostreader-reference-resolution.test.ts`
- Test: `tests/ghostreader-session/ghostreader-session-reducer.test.ts`
- Test: `tests/ghostreader-session/ghostreader-session-store.test.ts`
- Test: `tests/ghostreader-session/ghostreader-session-view.test.ts`
- Test: `tests/ghostreader-session/ghostreader-prompt-context.test.ts`

**Step 1: Run the focused suite**

Run:
```bash
npm test -- tests/ghostreader-session/ghostreader-reference-resolution.test.ts tests/ghostreader-session/ghostreader-session-reducer.test.ts tests/ghostreader-session/ghostreader-session-store.test.ts tests/ghostreader-session/ghostreader-session-view.test.ts tests/ghostreader-session/ghostreader-prompt-context.test.ts
```
Expected: PASS.

**Step 2: Run one broader safety check**

Run:
```bash
npm test -- tests/ghostreader-session
```
Expected: PASS.

**Step 3: Manual verification**

Verify these flows manually:
1. Ask for one bookmark, then ask “为什么值得收藏？”
2. Ask for multiple results, then ask “第一个结果展开说说”
3. Refresh/reopen, then ask “这个再总结一下”
4. Ask a clearly new topic and verify it does not bind to the old result

**Step 4: Commit final verification notes if needed**

Only commit code/test changes, not ad hoc notes unless explicitly requested.

---

### Task 10: Request code review before merge

**Files:**
- Modify: none

**Step 1: Invoke required review skill**

Use `superpowers:requesting-code-review` after implementation is complete and tests pass.

**Step 2: Address any review findings**

Make only the minimal changes needed.

**Step 3: Re-run focused tests**

Run:
```bash
npm test -- tests/ghostreader-session
```
Expected: PASS.

**Step 4: Commit review fixes**

```bash
git add <changed-files>
git commit -m "fix: address ghostreader follow-up review feedback"
```
