# Dashboard Details Restoration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the dashboard bookmark detail experience so clicking a bookmark opens a default `details` tab that shows editable tags, summary, and notes, while keeping the AI workspace in its own tab.

**Architecture:** Keep `DashboardShell` as the owner of bookmark state and save callbacks. Move `EditableTagsCard` and `EditableSummaryCard` out of `DashboardAiSidebar` and into `DashboardReadingPane`’s default tab, rename the reading-pane tab model from `notes|ai` to `details|ai`, and leave Ghostreader ask behavior isolated inside the AI tab.

**Tech Stack:** React, TypeScript, Vitest, jsdom

---

## Preconditions

- If `npm exec vitest ...` fails because `vitest` is missing locally, run `npm install` once before executing the rest of this plan.
- Do **not** add storage migrations, feature flags, or Ghostreader logic changes.
- `src/features/dashboard/dashboard-shell.tsx` should remain unchanged unless TypeScript forces a mechanical prop cleanup elsewhere (it should not).

### Task 1: Make the reading pane default to a real details tab

**Files:**
- Modify: `tests/ui/dashboard-shell.test.tsx:575-630`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx:30-31`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx:48-56`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx:243-376`
- Modify: `src/lib/i18n/messages.ts:182-196`
- Modify: `src/lib/i18n/messages.ts:418-432`
- Modify: `src/lib/i18n/messages.ts:650-664`

**Step 1: Write the failing test**

Update the existing tab-semantics test so it expects a `details` tab instead of a `notes` tab, and expects summary/tags edit affordances to be visible immediately after selecting a bookmark.

```tsx
it("uses details/ai tab semantics and shows detail actions by default", async () => {
  await renderDashboard([
    createBookmark({ id: "1", title: "React Docs", extractedText: "React lets you build UIs." })
  ])

  await act(async () => {
    container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")?.click()
  })

  const detailsTab = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-details-tab']")
  const aiTab = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ai-tab']")

  expect(detailsTab?.getAttribute("aria-selected")).toBe("true")
  expect(aiTab?.getAttribute("aria-selected")).toBe("false")
  expect(container?.querySelector("[data-testid='dashboard-summary-edit']")).not.toBeNull()
  expect(container?.querySelector("[data-testid='dashboard-tags-edit']")).not.toBeNull()
  expect(container?.querySelector("[data-testid='dashboard-format-bold']")).not.toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run tests/ui/dashboard-shell.test.tsx -t "uses details/ai tab semantics and shows detail actions by default"`

Expected: FAIL because `dashboard-details-tab` does not exist yet and the default view still uses `notes`.

**Step 3: Write minimal implementation**

In `src/features/dashboard/dashboard-reading-pane.tsx`, rename the tab model and make `details` the default.

```tsx
type ReadingTab = "details" | "ai"

const [activeTab, setActiveTab] = useState<ReadingTab>("details")
const detailsTabId = "dashboard-reading-tab-details"
const aiTabId = "dashboard-reading-tab-ai"
const detailsPanelId = "dashboard-reading-panel-details"
const aiPanelId = "dashboard-reading-panel-ai"
```

Replace the first tab button so it uses the new ids and test id.

```tsx
<button
  aria-controls={detailsPanelId}
  aria-selected={activeTab === "details"}
  data-testid="dashboard-details-tab"
  id={detailsTabId}
  onClick={() => setActiveTab("details")}
  role="tab"
  style={tabStyle("details")}
  type="button"
>
  {t("dashboard.reading.tab.details")}
</button>
```

In `src/lib/i18n/messages.ts`, replace the old key with a details key in the `MessageKey` union and both language dictionaries.

```ts
| "dashboard.reading.tab.details"
| "dashboard.reading.tab.ai"
```

```ts
"dashboard.reading.tab.details": "Details",
"dashboard.reading.tab.ai": "AI workspace",
```

```ts
"dashboard.reading.tab.details": "详情",
"dashboard.reading.tab.ai": "AI 工作区",
```

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run tests/ui/dashboard-shell.test.tsx -t "uses details/ai tab semantics and shows detail actions by default"`

Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ui/dashboard-shell.test.tsx src/features/dashboard/dashboard-reading-pane.tsx src/lib/i18n/messages.ts
git commit -m "$(cat <<'EOF'
test: restore dashboard details tab semantics

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 2: Move tags and summary editing into the default details surface

**Files:**
- Modify: `tests/ui/dashboard-persistence.test.tsx:27-121`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx:12`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx:269-376`

**Step 1: Write the failing test**

Update the summary and tags persistence tests so they no longer switch to the AI workspace before editing. Keep the notes persistence test as-is.

```tsx
it("saves edited summary through updateBookmark from the details tab", async () => {
  await renderDashboard(bookmarks, updateBookmark)
  await selectBookmark("React Docs")

  const editButton = container?.querySelector<HTMLButtonElement>("[aria-label='Edit summary']")
  await act(async () => {
    editButton?.click()
  })

  // existing textarea/edit/save assertions stay the same
})
```

```tsx
it("saves edited tags through updateBookmark from the details tab", async () => {
  await renderDashboard(bookmarks, updateBookmark)
  await selectBookmark("React Docs")

  const editButton = container?.querySelector<HTMLButtonElement>("[aria-label='Edit tags']")
  await act(async () => {
    editButton?.click()
  })

  // existing input/edit/save assertions stay the same
})
```

Delete the `await switchToAiWorkspace()` call from those two tests. Leave AI-specific coverage to Task 3.

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run tests/ui/dashboard-persistence.test.tsx -t "saves edited summary through updateBookmark from the details tab" -t "saves edited tags through updateBookmark from the details tab"`

Expected: FAIL because the edit buttons are still only rendered inside `DashboardAiSidebar`.

**Step 3: Write minimal implementation**

Import the reusable cards into `DashboardReadingPane` and render them in the default details tab, above the notes editor.

```tsx
import { EditableSummaryCard } from "./editable-summary-card"
import { EditableTagsCard } from "./editable-tags-card"
```

Replace the current read-only tags/summary sections with the editable cards.

```tsx
{activeTab === "details" ? (
  <div aria-labelledby={detailsTabId} id={detailsPanelId} role="tabpanel" style={{ display: "grid", gap: "28px" }}>
    <EditableTagsCard
      aiTags={bookmark.aiTags}
      language={language}
      userTags={bookmark.userTags}
      onSave={onSaveTags}
    />
    <EditableSummaryCard
      language={language}
      summary={bookmark.summary}
      onSave={onSaveSummary}
    />

    <section style={{ display: "flex", flexDirection: "column" }}>
      {/* keep the existing notes editor exactly here */}
    </section>
  </div>
) : (
  // existing AI tab branch
)}
```

Do **not** change the notes autosave logic. Reuse the existing `onSaveSummary`, `onSaveTags`, and `onSaveNotes` callbacks unchanged.

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run tests/ui/dashboard-persistence.test.tsx -t "saves edited summary through updateBookmark from the details tab" -t "saves edited tags through updateBookmark from the details tab"`

Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ui/dashboard-persistence.test.tsx src/features/dashboard/dashboard-reading-pane.tsx
git commit -m "$(cat <<'EOF'
feat: restore dashboard detail editing surface

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 3: Narrow the AI sidebar to AI-only responsibility and retarget editing tests

**Files:**
- Modify: `tests/ui/dashboard-editing.test.tsx:7-179`
- Modify: `tests/ui/dashboard-shell.test.tsx:602-630`
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx:11-12`
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx:18-19`
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx:31-32`
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx:51-52`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx:362-374`

**Step 1: Write the failing tests**

Retarget `tests/ui/dashboard-editing.test.tsx` to `DashboardReadingPane` instead of `DashboardAiSidebar`. The file should now verify that summary/tags editing is available on the default details tab.

```tsx
import { DashboardReadingPane } from "../../src/features/dashboard/dashboard-reading-pane"
```

```tsx
it("renders summary in read mode on the default details tab and switches to edit mode", async () => {
  await renderReadingPane(createBookmark({ summary: "Original summary" }), {
    onSaveSummary: vi.fn(async () => undefined),
    onSaveTags: vi.fn(async () => undefined),
    onSaveNotes: vi.fn(async () => undefined)
  })

  expect(container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-details-tab']")?.getAttribute("aria-selected")).toBe("true")
  expect(container?.textContent).toContain("Original summary")
})
```

Add an AI-scope regression assertion in `tests/ui/dashboard-shell.test.tsx` that the AI tab still renders the ask UI but no longer renders summary/tags edit buttons.

```tsx
it("keeps summary and tags out of the ai workspace", async () => {
  await renderDashboard([
    createBookmark({ id: "1", title: "React Docs", summary: "React summary", userTags: ["frontend"] })
  ])

  await act(async () => {
    container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")?.click()
    container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ai-tab']")?.click()
  })

  expect(container?.querySelector("[data-testid='dashboard-ask-input']")).not.toBeNull()
  expect(container?.querySelector("[data-testid='dashboard-summary-edit']")).toBeNull()
  expect(container?.querySelector("[data-testid='dashboard-tags-edit']")).toBeNull()
})
```

**Step 2: Run tests to verify they fail**

Run: `npm exec vitest run tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-shell.test.tsx -t "keeps summary and tags out of the ai workspace"`

Expected: FAIL because `DashboardAiSidebar` still renders `EditableSummaryCard` and `EditableTagsCard`.

**Step 3: Write minimal implementation**

Remove summary/tags imports and props from `DashboardAiSidebar`, leaving only the ask UI.

```tsx
import { DashboardAskBox } from "./dashboard-ask-box"

type DashboardAiSidebarProps = {
  bookmark: BookmarkRecord | null
  bookmarks?: BookmarkRecord[]
  language?: DisplayLanguage
  settingsRepository?: SettingsRepository
  createProvider?: (config: ProviderConfig) => AiProvider
  onOpenBookmark?: (bookmarkId: string) => void
  ghostreaderSessionStore?: Pick<ChromeGhostreaderSessionStore, "loadSessions" | "saveSessions" | "clearActiveSession">
  latestGhostreaderBookmarkEvent?: GhostreaderBookmarkAddedPayload | null
}
```

```tsx
return (
  <aside ...>
    <DashboardAskBox
      bookmark={bookmark}
      bookmarks={bookmarks}
      createProvider={createProvider}
      language={language}
      onOpenBookmark={onOpenBookmark}
      settingsRepository={settingsRepository}
      ghostreaderSessionStore={ghostreaderSessionStore}
      latestGhostreaderBookmarkEvent={latestGhostreaderBookmarkEvent}
    />
  </aside>
)
```

Then remove `onSaveSummary` and `onSaveTags` from the `DashboardAiSidebar` call site in `DashboardReadingPane`.

```tsx
<DashboardAiSidebar
  bookmark={bookmark}
  bookmarks={bookmarks}
  createProvider={createProvider}
  language={language}
  onOpenBookmark={onOpenBookmark}
  settingsRepository={settingsRepository}
  ghostreaderSessionStore={ghostreaderSessionStore}
  latestGhostreaderBookmarkEvent={latestGhostreaderBookmarkEvent}
/>
```

**Step 4: Run tests to verify they pass**

Run: `npm exec vitest run tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-shell.test.tsx -t "keeps summary and tags out of the ai workspace"`

Expected: PASS.

**Step 5: Commit**

```bash
git add tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-shell.test.tsx src/features/dashboard/dashboard-ai-sidebar.tsx src/features/dashboard/dashboard-reading-pane.tsx
git commit -m "$(cat <<'EOF'
refactor: limit dashboard ai tab to ask workspace

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 4: Run the focused regression suite for the dashboard detail flow

**Files:**
- No code changes expected.
- Verify only: `tests/ui/dashboard-shell.test.tsx`
- Verify only: `tests/ui/dashboard-persistence.test.tsx`
- Verify only: `tests/ui/dashboard-editing.test.tsx`

**Step 1: Run the focused suite**

Run: `npm exec vitest run tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-persistence.test.tsx tests/ui/dashboard-editing.test.tsx`

Expected: PASS.

**Step 2: Run the broader dashboard UI suite**

Run: `npm exec vitest run tests/ui/dashboard-*.test.tsx`

Expected: PASS. If anything fails outside the three edited files, fix only regressions caused by the details/AI tab change.

**Step 3: Commit the verified state**

```bash
git add tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-persistence.test.tsx tests/ui/dashboard-editing.test.tsx src/features/dashboard/dashboard-reading-pane.tsx src/features/dashboard/dashboard-ai-sidebar.tsx src/lib/i18n/messages.ts
git commit -m "$(cat <<'EOF'
feat: restore dashboard bookmark details view

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Task 5: Manually verify the dashboard interaction in the extension UI

**Files:**
- No file edits.
- Reference only: `docs/manual-testing.md`
- Reference only: `docs/qa-checklist.md`

**Step 1: Start the extension dev build**

Run: `npm run dev`

Expected: a successful Plasmo dev build producing `build/chrome-mv3-dev`.

**Step 2: Open the dashboard and verify the golden path**

Manual checklist:
- Load the unpacked extension from `build/chrome-mv3-dev`.
- Open the dashboard.
- Click a bookmark.
- Confirm the default tab is `details`.
- Confirm tags, summary, and notes are visible without switching tabs.
- Edit tags and summary from the default tab and verify the UI updates immediately.
- Confirm notes autosave still works.
- Switch to the AI tab and confirm the ask input still works.

**Step 3: Verify edge cases**

Manual checklist:
- Open a bookmark with no summary and no tags; verify empty states still render.
- Select multiple bookmarks; verify bulk edit still replaces the reading pane.
- Switch between bookmarks and confirm the details tab remains the initial surface for each selection.

**Step 4: Commit if manual verification required follow-up fixes**

```bash
git add <only-files-changed-during-manual-fix>
git commit -m "$(cat <<'EOF'
fix: address dashboard details regression follow-ups

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

## Notes for the executor

- Keep `DashboardShell`’s save callbacks exactly as they are today; they already update persistence and refresh `activeBookmark` correctly.
- Do not change the bookmark data shape.
- Do not move Ghostreader logic into the details tab.
- Prefer updating existing tests over adding redundant new ones.
- If you need one extra assertion, add it to an existing dashboard test instead of creating a new file.
