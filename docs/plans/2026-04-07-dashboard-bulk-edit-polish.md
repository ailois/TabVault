# Dashboard Bulk Edit Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the dashboard bulk edit panel so its actions and save feedback match the newer dashboard UI language.

**Architecture:** Keep bulk edit behavior and data flow unchanged, and only refine local presentation. Reuse the shared `DashboardIcon` helper and current theme tokens so bulk-edit controls align with reading-pane and AI workspace affordances.

**Tech Stack:** React, TypeScript, Vitest, existing dashboard theme tokens

---

### Task 1: Add failing UI coverage for bulk edit actions

**Files:**
- Modify: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**
- Add a dashboard test that opens bulk edit mode and asserts the cancel/apply buttons render SVG icon affordances.

**Step 2: Run test to verify it fails**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
- Expected: FAIL because bulk edit action buttons still render text-only buttons.

**Step 3: Write minimal implementation**
- No implementation in this task; move directly to Task 2 after confirming the failure.

**Step 4: Run test to verify it fails correctly**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`

**Step 5: Commit**
- Commit after the panel polish is implemented and verified.

### Task 2: Unify bulk edit panel controls

**Files:**
- Modify: `src/features/dashboard/dashboard-bulk-edit-panel.tsx`
- Modify: `src/features/dashboard/dashboard-icons.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the minimal implementation**
- Reuse shared icon affordances for cancel/apply actions.
- Add a save/loading indicator without changing apply semantics.
- Keep existing localized copy and input behavior unchanged.

**Step 2: Run test to verify it passes**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
- Expected: PASS

**Step 3: Run broader dashboard verification**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx tests\ui\dashboard-persistence.test.tsx`
- Expected: PASS

**Step 4: Run typecheck**
- Run: `cmd /c npm run typecheck`
- Expected: PASS

**Step 5: Commit**
- Commit after all validation commands pass.
