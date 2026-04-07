# Dashboard Results Actions Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the dashboard results bulk action area so it matches the icon-based dashboard affordances added elsewhere.

**Architecture:** Keep results filtering, selection, and analysis messaging unchanged, and only refine the presentation layer of the bulk action controls. Reuse the shared `DashboardIcon` helper and current theme tokens so the results column action card matches reading-pane and bulk-edit patterns.

**Tech Stack:** React, TypeScript, Vitest, existing dashboard theme tokens

---

### Task 1: Add failing UI coverage for results bulk actions

**Files:**
- Modify: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**
- Add a dashboard test that asserts analyze/select/clear bulk action buttons render SVG icon affordances.

**Step 2: Run test to verify it fails**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
- Expected: FAIL because the results bulk action buttons are still text-only.

**Step 3: Verify the failure shape**
- Confirm the test fails because the buttons do not yet contain SVG icons.

**Step 4: Move to implementation**
- Implement the smallest presentational change needed to make the new assertions pass.

**Step 5: Commit**
- Commit after implementation and verification pass.

### Task 2: Unify the results action card UI

**Files:**
- Modify: `src/features/dashboard/dashboard-results-list.tsx`
- Modify: `src/features/dashboard/dashboard-icons.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write minimal implementation**
- Add any missing shared icons needed for the bulk action buttons.
- Render icon + label action buttons for analyze/select/clear actions.
- Keep disabled rules and runtime wiring unchanged.

**Step 2: Run the focused tests**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
- Expected: PASS

**Step 3: Run broader dashboard verification**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx tests\ui\dashboard-persistence.test.tsx`
- Expected: PASS

**Step 4: Run typecheck**
- Run: `cmd /c npm run typecheck`
- Expected: PASS

**Step 5: Commit**
- Commit after all checks pass.
