# Dashboard Icon Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace remaining character-based dashboard icons with stable, consistent icon affordances.

**Architecture:** Keep the current dashboard layout and behavior unchanged while swapping raw character placeholders for small inline SVG icons. Centralize the icon rendering in a lightweight dashboard helper so navigation, folder toggles, results, and reading-pane actions use the same visual language and avoid encoding issues.

**Tech Stack:** React, TypeScript, Vitest, jsdom

---

### Task 1: Lock icon behavior with tests

**Files:**
- Modify: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**
- Add a test that asserts dashboard navigation entries and folder toggle buttons render icon elements instead of raw characters.
- Extend the existing reading-pane icon test to assert the action buttons render icon elements.

**Step 2: Run test to verify it fails**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
Expected: FAIL because navigation, folder toggles, and reading actions still render raw characters.

**Step 3: Write minimal implementation**
- Add a tiny dashboard icon helper using inline SVG.
- Update `dashboard-navigation`, `dashboard-results-list`, and `dashboard-reading-pane` to use the helper.

**Step 4: Run test to verify it passes**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
Expected: PASS

### Task 2: Verify dashboard regressions

**Files:**
- Create: `src/features/dashboard/dashboard-icons.tsx`
- Verify: `src/features/dashboard/dashboard-navigation.tsx`
- Verify: `src/features/dashboard/dashboard-results-list.tsx`
- Verify: `src/features/dashboard/dashboard-reading-pane.tsx`

**Step 1: Run typecheck**

Run: `cmd /c npm run typecheck`

**Step 2: Run dashboard regression tests**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx tests\ui\dashboard-persistence.test.tsx tests\ui\dashboard-ask-box.test.tsx`

**Step 3: Commit**

```bash
git add docs/plans/2026-04-07-dashboard-icon-unification.md src/features/dashboard/dashboard-icons.tsx src/features/dashboard/dashboard-navigation.tsx src/features/dashboard/dashboard-results-list.tsx src/features/dashboard/dashboard-reading-pane.tsx tests/ui/dashboard-shell.test.tsx
git commit -m "Unify dashboard icon affordances"
```
