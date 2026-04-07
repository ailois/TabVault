# Dashboard Reading Tools Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify dashboard reading-pane formatting controls and AI workspace edit actions so the remaining dashboard UI feels consistent.

**Architecture:** Keep the existing dashboard data flow unchanged and only polish component-level presentation. Reuse the shared `DashboardIcon` helper so reading-pane controls and AI workspace cards share the same icon language and button states.

**Tech Stack:** React, TypeScript, Vitest, existing dashboard theme tokens

---

### Task 1: Unify reading-pane formatting controls

**Files:**
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx`
- Modify: `src/features/dashboard/dashboard-icons.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**
- Extend the reading-pane test to assert formatting buttons render SVG icons.

**Step 2: Run test to verify it fails**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`

**Step 3: Write minimal implementation**
- Add icon glyphs for note formatting.
- Replace text glyph buttons with shared icon buttons.
- Keep existing formatting behavior unchanged.

**Step 4: Run test to verify it passes**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`

**Step 5: Commit**
- Commit after reading-pane polish is verified.

### Task 2: Unify summary and tags card action buttons

**Files:**
- Modify: `src/features/dashboard/editable-summary-card.tsx`
- Modify: `src/features/dashboard/editable-tags-card.tsx`
- Modify: `src/features/dashboard/dashboard-icons.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**
- Add a dashboard AI workspace test that asserts edit/save/cancel actions render icon affordances.

**Step 2: Run test to verify it fails**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`

**Step 3: Write minimal implementation**
- Reuse shared icon buttons for edit/save/cancel states.
- Improve empty-state presentation without changing save semantics.
- Preserve localized labels and current save handlers.

**Step 4: Run test to verify it passes**
- Run: `cmd /c npx -y vitest run tests\ui\dashboard-shell.test.tsx`

**Step 5: Commit**
- Commit after AI workspace card polish is verified.
