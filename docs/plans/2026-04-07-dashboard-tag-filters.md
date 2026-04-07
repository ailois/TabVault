# Dashboard Tag Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the dashboard tag shortcuts into real filters without expanding into a full tag browser.

**Architecture:** Keep the existing dashboard navigation structure and add one lightweight `activeTagFilter` state in `dashboard-shell`. Tag buttons in `dashboard-navigation` become toggle filters with real counts, and the existing search/filter pipeline applies the tag scope before text search and status filters.

**Tech Stack:** React, TypeScript, Vitest, jsdom

---

### Task 1: Lock tag button behavior with tests

**Files:**
- Modify: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**
- Add a test that renders bookmarks tagged with `frontend` and `ai`.
- Assert the left tag buttons are enabled with real counts.
- Click each tag button and assert the results list filters correctly.
- Click the same tag button again and assert the normal list returns.

**Step 2: Run test to verify it fails**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
Expected: FAIL because tag buttons are still disabled placeholders.

**Step 3: Write minimal implementation**
- Add toggleable tag button props in `dashboard-navigation`.
- Add `activeTagFilter` state and tag count derivation in `dashboard-shell`.
- Apply tag filtering ahead of the existing search/filter pipeline.

**Step 4: Run test to verify it passes**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
Expected: PASS

### Task 2: Verify dashboard regressions

**Files:**
- Verify: `src/features/dashboard/dashboard-navigation.tsx`
- Verify: `src/features/dashboard/dashboard-shell.tsx`

**Step 1: Run typecheck**

Run: `cmd /c npm run typecheck`

**Step 2: Run dashboard regression tests**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx tests\ui\dashboard-persistence.test.tsx tests\ui\dashboard-ask-box.test.tsx`

**Step 3: Commit**

```bash
git add docs/plans/2026-04-07-dashboard-tag-filters.md tests/ui/dashboard-shell.test.tsx src/features/dashboard/dashboard-navigation.tsx src/features/dashboard/dashboard-shell.tsx
git commit -m "Add dashboard tag filters"
```
