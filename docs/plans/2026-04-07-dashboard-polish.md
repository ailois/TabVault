# Dashboard Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the remaining dashboard placeholder UI in navigation, results, and reading pane without expanding feature scope.

**Architecture:** Keep behavior changes minimal and localized to existing dashboard components. Drive the work with focused UI tests first, then update the display copy, heading selection, and placeholder glyphs with the smallest possible code changes.

**Tech Stack:** React, TypeScript, Vitest, jsdom

---

### Task 1: Lock dashboard polish behavior with tests

**Files:**
- Modify: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**
- Add a test that switches dashboard navigation to `Recents` and `Highlights` and asserts the results heading updates with the active mode.
- Add a test that asserts the search affordance and reading-pane open button no longer render raw placeholder letters.

**Step 2: Run test to verify it fails**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
Expected: FAIL because the heading stays on the default label and placeholder letters are still rendered.

**Step 3: Write minimal implementation**
- Pass a derived heading from `dashboard-shell` into `dashboard-results-list`.
- Replace placeholder glyphs in dashboard search and reading actions with stable icon-like symbols.

**Step 4: Run test to verify it passes**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
Expected: PASS

### Task 2: Verify dashboard regression coverage

**Files:**
- Verify: `src/features/dashboard/dashboard-shell.tsx`
- Verify: `src/features/dashboard/dashboard-results-list.tsx`
- Verify: `src/features/dashboard/dashboard-reading-pane.tsx`

**Step 1: Run focused verification**

Run: `cmd /c npm run typecheck`

**Step 2: Run dashboard regression tests**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx tests\ui\dashboard-persistence.test.tsx tests\ui\dashboard-ask-box.test.tsx`

**Step 3: Commit**

```bash
git add docs/plans/2026-04-07-dashboard-polish.md tests/ui/dashboard-shell.test.tsx src/features/dashboard/dashboard-shell.tsx src/features/dashboard/dashboard-results-list.tsx src/features/dashboard/dashboard-reading-pane.tsx
git commit -m "Polish dashboard visual affordances"
```
