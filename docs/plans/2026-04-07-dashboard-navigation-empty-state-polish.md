# Dashboard Navigation Empty State Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make disabled dashboard tag shortcuts communicate “no matching bookmarks” instead of looking like unreleased features.

**Architecture:** Keep dashboard tag counting and disabled behavior unchanged, and only refine the empty-state copy used in navigation tooltips and styling. Reuse the existing navigation structure and i18n messages so the new state is localized and does not affect selection logic.

**Tech Stack:** React, TypeScript, Vitest, existing i18n message tables

---

### Task 1: Add failing coverage for disabled tag shortcuts

**Files:**
- Modify: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**
- Add a dashboard test that renders no tagged bookmarks and asserts the disabled tag buttons no longer use “Coming soon”.

**Step 2: Run test to verify it fails**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`
- Expected: FAIL because the current tooltip still says “Coming soon”.

**Step 3: Verify failure shape**
- Confirm the failure is caused by the old tooltip copy.

**Step 4: Move to implementation**
- Replace the misleading empty-state copy with a localized “no matching bookmarks” message.

**Step 5: Commit**
- Commit after implementation and verification pass.

### Task 2: Localize the navigation empty state

**Files:**
- Modify: `src/features/dashboard/dashboard-navigation.tsx`
- Modify: `src/lib/i18n/messages.ts`
- Test: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write minimal implementation**
- Add localized navigation empty-state messaging.
- Update disabled tag button titles to use the new copy.
- Keep disabled rules and tag counts unchanged.

**Step 2: Run focused tests**
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
