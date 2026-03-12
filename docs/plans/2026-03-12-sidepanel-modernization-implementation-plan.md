# Sidepanel Modernization & Browser Detection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the TabVault Sidepanel with browser detection, search, and bookmark management features.

**Architecture:** Restructure `src/sidepanel.tsx` into a searchable list view with management actions, moving the "Import" button to the footer. Implement a `getBrowserName()` utility to personalize the import experience.

**Tech Stack:** React, TypeScript, IndexedDB (via Repository pattern), Chrome Side Panel API.

---

### Task 1: Browser Detection Utility

**Files:**
- Create: `src/lib/utils/browser.ts`
- Test: `tests/lib/utils/browser.test.ts`

**Step 1: Write the failing test**

```typescript
import { expect, it, describe } from "vitest"
import { getBrowserName } from "../../../src/lib/utils/browser"

describe("getBrowserName", () => {
  it("detects Chrome", () => {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    expect(getBrowserName(userAgent)).toBe("Chrome")
  })

  it("detects Edge", () => {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
    expect(getBrowserName(userAgent)).toBe("Edge")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/utils/browser.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
export function getBrowserName(userAgent: string = navigator.userAgent): string {
  if (userAgent.includes("Edg/")) return "Edge"
  if (userAgent.includes("OPR/") || userAgent.includes("Opera/")) return "Opera"
  if (userAgent.includes("Brave") || (navigator as any).brave) return "Brave"
  if (userAgent.includes("Firefox/")) return "Firefox"
  if (userAgent.includes("Chrome")) return "Chrome"
  return "Browser"
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/utils/browser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/utils/browser.ts tests/lib/utils/browser.test.ts
git commit -m "feat: add browser detection utility"
```

---

### Task 2: Search and List UI in Sidepanel

**Files:**
- Modify: `src/sidepanel.tsx`
- Test: `tests/ui/sidepanel.test.tsx`

**Step 1: Update sidepanel to include search and recent list**

Modify `src/sidepanel.tsx` to:
1. Import `useBookmarks` (or equivalent hook for fetching).
2. Add a `searchTerm` state.
3. Render a search input at the top.
4. Render a list of bookmarks below the search.

**Step 2: Verify rendering in tests**

Update `tests/ui/sidepanel.test.tsx` to check for search input presence.

**Step 3: Commit**

```bash
git add src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat: add search and list UI to sidepanel"
```

---

### Task 3: Management Actions (Delete/Edit)

**Files:**
- Modify: `src/sidepanel.tsx`

**Step 1: Wire up delete/edit in BookmarkCard**

Ensure the `BookmarkCard` components rendered in the sidepanel have their `onDelete` and `onEdit` callbacks connected to the repository.

**Step 2: Add dynamic browser text to Import button**

Update the import button to use `getBrowserName()` to show "Import Chrome Bookmarks", "Import Edge Bookmarks", etc.

**Step 3: Commit**

```bash
git add src/sidepanel.tsx
git commit -m "feat: add management actions and personalized import text to sidepanel"
```
