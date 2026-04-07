# Dashboard Ask Box Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the dashboard AI workspace ask box so its submit control matches the rest of the dashboard icon system.

**Architecture:** Keep the current ask-box behavior and retrieval flow unchanged. Replace the raw submit character and loading ellipsis with icon-based affordances by reusing the existing dashboard icon helper and validating the UI through focused ask-box tests first.

**Tech Stack:** React, TypeScript, Vitest, jsdom

---

### Task 1: Lock ask-box icon behavior with tests

**Files:**
- Modify: `tests/ui/dashboard-ask-box.test.tsx`

**Step 1: Write the failing test**
- Add a test that asserts the submit button renders an SVG icon at rest.
- Add a test that submits a delayed request and asserts the loading icon is shown while the request is in flight.

**Step 2: Run test to verify it fails**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-ask-box.test.tsx`
Expected: FAIL because the button still renders raw text characters.

**Step 3: Write minimal implementation**
- Extend the dashboard icon helper with send/loading icons.
- Update `dashboard-ask-box` to render icon-based button states.

**Step 4: Run test to verify it passes**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-ask-box.test.tsx`
Expected: PASS

### Task 2: Verify dashboard regressions

**Files:**
- Modify: `src/features/dashboard/dashboard-ask-box.tsx`
- Modify: `src/features/dashboard/dashboard-icons.tsx`

**Step 1: Run typecheck**

Run: `cmd /c npm run typecheck`

**Step 2: Run dashboard regression tests**

Run: `cmd /c npx -y vitest run tests\ui\dashboard-ask-box.test.tsx tests\ui\dashboard-shell.test.tsx tests\ui\dashboard-persistence.test.tsx`

**Step 3: Commit**

```bash
git add docs/plans/2026-04-07-dashboard-ask-box-polish.md src/features/dashboard/dashboard-ask-box.tsx src/features/dashboard/dashboard-icons.tsx tests/ui/dashboard-ask-box.test.tsx
git commit -m "Polish dashboard ask box actions"
```
