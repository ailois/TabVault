# Settings Dashboard Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the options page into a near-full-width dashboard with left-sidebar navigation, a two-column Settings workspace, and a visually unified three-column Bookmarks workspace without changing save, load, analysis, or storage behavior.

**Architecture:** Keep the existing state and data flow in `src/options.tsx`, but replace the centered shell with a shared sidebar/main-content frame. Reuse `SettingsTabContent`, `BookmarksTab`, `ProviderSettingsForm`, and `BookmarkTree`, then restyle them to consume semantic theme tokens and expose a few stable test selectors for the new dashboard structure.

**Tech Stack:** React, TypeScript, Plasmo, Chrome extension APIs, Vitest, jsdom

---

## Implementation guardrails

- Run this in a dedicated worktree via `@using-git-worktrees` before editing source files.
- Do **not** edit `.plasmo/**` or `build/**`; those are generated artifacts.
- Keep these state variables and flows intact unless a test proves otherwise:
  - `activeTab`
  - `providerEditorSelection`
  - `saveStatus`
  - `loadData()` in `BookmarksTab`
  - provider save logic via `applySingleProviderEnabledState(...)`
- Add these stable selectors as part of the refactor:
  - `data-testid="options-dashboard-shell"`
  - `data-testid="options-sidebar"`
  - `data-testid="options-main-content"`
  - `data-testid="settings-workspace"`
  - `data-testid="provider-rail"`
  - `data-testid="bookmarks-workspace"`
  - `data-testid="bookmark-result-button"`

---

### Task 1: Replace the narrow shell with a shared dashboard frame

**Files:**
- Modify: `src/options.tsx:159-335`
- Modify: `tests/ui/options.test.tsx:46-156`

**Step 1: Write the failing shell test**

Add a new test to `tests/ui/options.test.tsx` that locks down the new page frame:

```tsx
it("renders a sidebar dashboard shell for the options page", async () => {
  await renderOptions()

  expect(container?.querySelector('[data-testid="options-dashboard-shell"]')).toBeTruthy()
  expect(container?.querySelector('[data-testid="options-sidebar"]')).toBeTruthy()
  expect(container?.querySelector('[data-testid="options-main-content"]')).toBeTruthy()
  expect(container?.querySelector('[data-testid="options-nav-settings"]')?.getAttribute("aria-pressed")).toBe("true")
  expect(container?.textContent).toContain("TabVault")
  expect(container?.textContent).toContain("Settings")
  expect(container?.textContent).toContain("Bookmarks")
})
```

Also update the existing shell assertions in the same file so they no longer expect the old centered header/tab strip as the primary page structure.

**Step 2: Run the new test to verify it fails**

Run:
```bash
npx vitest run tests/ui/options.test.tsx -t "renders a sidebar dashboard shell for the options page"
```

Expected: FAIL because `src/options.tsx` still renders the centered `settings-page-shell` with the inline tab switcher.

**Step 3: Write the minimal shell implementation**

In `src/options.tsx`, replace the old centered shell with a two-column dashboard frame. Keep `activeTab` as-is; only move the control into a sidebar.

Use a structure like this:

```tsx
<main
  data-testid="options-dashboard-shell"
  style={{
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "248px minmax(0, 1fr)",
    backgroundColor: theme.page,
    color: theme.textPrimary
  }}
>
  <aside
    data-testid="options-sidebar"
    style={{
      display: "flex",
      flexDirection: "column",
      borderRight: `1px solid ${theme.border}`,
      backgroundColor: theme.surface,
      minWidth: 0
    }}
  >
    <div style={{ padding: spacing.lg, borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>TabVault</h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: theme.textMuted }}>
            Local-first bookmark workspace
          </p>
        </div>
        <button
          aria-label={theme.isDark ? "Switch to light mode" : "Switch to dark mode"}
          data-testid="theme-toggle-button"
          onClick={() => theme.toggle()}
          type="button"
        >
          {theme.isDark ? "☀️" : "🌙"}
        </button>
      </div>
    </div>

    <nav style={{ display: "grid", gap: spacing.xs, padding: spacing.md }}>
      <button
        data-testid="options-nav-settings"
        aria-pressed={activeTab === "settings"}
        onClick={() => setActiveTab("settings")}
        type="button"
      >
        Settings
      </button>
      <button
        data-testid="options-nav-bookmarks"
        aria-pressed={activeTab === "bookmarks"}
        onClick={() => setActiveTab("bookmarks")}
        type="button"
      >
        Bookmarks
      </button>
    </nav>
  </aside>

  <section data-testid="options-main-content" style={{ minWidth: 0, padding: spacing.xl }}>
    {activeTab === "bookmarks" ? <BookmarksTab services={optionsServices} /> : <SettingsTabContent ... />}
  </section>
</main>
```

Important implementation notes:
- Delete the old inline tab switcher in the header instead of keeping both navigation systems.
- Keep the existing `theme.toggle()` behavior; only move the visible button.
- Keep the old `data-testid="settings-page-shell"` only if another passing test still depends on it. Otherwise, remove it and update tests cleanly.

**Step 4: Run the shell-focused test file and make it pass**

Run:
```bash
npx vitest run tests/ui/options.test.tsx
```

Expected: PASS for the new shell test and any updated shell assertions.

**Step 5: Commit the shell slice**

```bash
git add src/options.tsx tests/ui/options.test.tsx
git commit -m "feat: add dashboard shell to options page"
```

---

### Task 2: Turn Settings into a two-column workspace with a provider rail

**Files:**
- Modify: `src/options.tsx:375-674`
- Modify: `src/components/provider-settings-form.tsx:39-208`
- Modify: `tests/ui/options.test.tsx:72-179`
- Modify: `tests/ui/options-load-state.test.tsx:48-89`
- Modify: `tests/ui/options-save-state.test.tsx:112-165`

**Step 1: Write the failing settings-layout tests**

In `tests/ui/options.test.tsx`, add a test for the two-column workspace and provider rail:

```tsx
it("renders settings as a two-column workspace with a provider rail", async () => {
  await renderOptions()

  expect(container?.querySelector('[data-testid="settings-workspace"]')).toBeTruthy()
  expect(container?.querySelector('[data-testid="provider-rail"]')).toBeTruthy()
  expect(container?.querySelector('#provider-editor-selector')).toBeNull()
  expect(container?.textContent).toContain("App Settings")
  expect(container?.textContent).toContain("Maintenance")
})
```

In the same file, replace the old selector-driven test with a provider-rail interaction test:

```tsx
it("clicking a provider rail button shows that provider form", async () => {
  await renderOptions()

  const claudeButton = container?.querySelector<HTMLButtonElement>('[data-testid="provider-rail-claude"]')
  expect(getSectionByHeading("OpenAI-compatible")).toBeTruthy()
  expect(getSectionByHeading("Claude")).toBeUndefined()

  await act(async () => {
    claudeButton?.click()
  })

  expect(getSectionByHeading("OpenAI-compatible")).toBeUndefined()
  expect(getSectionByHeading("Claude")).toBeTruthy()
})
```

Update `tests/ui/options-load-state.test.tsx` so it expects the selected provider to be reflected by a pressed rail button instead of `#provider-editor-selector`.

Update `tests/ui/options-save-state.test.tsx` so the “edit non-default provider” path clicks a provider rail button instead of changing a `<select>`.

**Step 2: Run the settings tests to verify they fail**

Run:
```bash
npx vitest run tests/ui/options.test.tsx tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx
```

Expected: FAIL because the UI still renders the old selector and single-column settings stack.

**Step 3: Write the minimal two-column implementation**

In `src/options.tsx`, refactor `SettingsTabContent` into a left/right workspace:

```tsx
<div
  data-testid="settings-workspace"
  style={{
    display: "grid",
    gridTemplateColumns: "minmax(320px, 380px) minmax(0, 1fr)",
    gap: spacing.lg,
    minWidth: 0,
    alignItems: "start"
  }}
>
  <div style={{ display: "grid", gap: spacing.lg }}>
    {/* App Settings card */}
    {/* Maintenance card */}
  </div>

  <div style={{ display: "grid", gap: spacing.md, minWidth: 0 }}>
    <div
      data-testid="provider-rail"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: spacing.sm
      }}
    >
      {providers.map((provider) => {
        const isActive = providerEditorSelection === provider.provider
        return (
          <button
            key={provider.provider}
            data-testid={`provider-rail-${provider.provider}`}
            aria-pressed={isActive}
            onClick={() => setProviderEditorSelection(provider.provider)}
            type="button"
          >
            {provider.provider === "openai" ? "OpenAI-compatible" : provider.provider === "claude" ? "Claude" : "Gemini"}
          </button>
        )
      })}
    </div>

    {/* Existing provider card, still filtered by providerEditorSelection */}
  </div>
</div>
```

Split the existing “Clear all analysis” / “Clear failed analysis” controls into a dedicated `Maintenance` card instead of leaving them at the bottom of the `App Settings` card.

Then in `src/components/provider-settings-form.tsx`, keep the field IDs and validation wiring exactly the same, but restyle the form as a dashboard panel:

```tsx
<section style={{ display: "grid", gap: spacing.md }}>
  <div style={{ display: "grid", gap: "4px" }}>
    <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: theme.textPrimary }}>
      {providerLabel}
    </h2>
    <p data-testid="provider-description" style={{ margin: 0, color: theme.textMuted }}>
      {providerDescription}
    </p>
  </div>

  {/* keep API key / model / base URL fields unchanged functionally */}
</section>
```

Keep these behaviors unchanged while refactoring:
- `defaultProvider` still controls which provider saves as enabled
- `providerEditorSelection` still controls which form is visible
- field IDs stay stable (`openai-api-key`, `claude-model`, etc.)

**Step 4: Run the updated settings tests and make them pass**

Run:
```bash
npx vitest run tests/ui/options.test.tsx tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx
```

Expected: PASS. In particular:
- the provider rail exists
- the provider `<select>` no longer exists
- clicking a rail button swaps the visible provider form
- saving still persists exactly one enabled provider

**Step 5: Commit the settings workspace slice**

```bash
git add src/options.tsx src/components/provider-settings-form.tsx tests/ui/options.test.tsx tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx
git commit -m "feat: redesign settings workspace as dashboard"
```

---

### Task 3: Keep Bookmarks three-column, but align it with the new dashboard shell

**Files:**
- Modify: `src/options.tsx:676-1352`
- Modify: `src/components/bookmark-tree.tsx:127-306`
- Modify: `tests/ui/options-bookmarks-dashboard.test.tsx:166-213`
- Modify: `tests/ui/options-bookmarks-tag-editing.test.tsx:128-169`

**Step 1: Write the failing bookmarks-shell tests**

In `tests/ui/options-bookmarks-dashboard.test.tsx`, add a test that proves the Bookmarks tab now sits inside the shared shell:

```tsx
it("renders bookmarks inside the shared dashboard shell", async () => {
  await renderBookmarksTab([makeBookmarkRecord()])

  expect(container?.querySelector('[data-testid="options-dashboard-shell"]')).toBeTruthy()
  expect(container?.querySelector('[data-testid="bookmarks-workspace"]')).toBeTruthy()
  expect(container?.querySelector('[data-testid="options-nav-bookmarks"]')?.getAttribute("aria-pressed")).toBe("true")
  expect(container?.textContent).toContain("YOUR FOLDERS")
  expect(container?.textContent).toContain("BOOKMARKS")
  expect(container?.textContent).toContain("DETAILS")
})
```

In `tests/ui/options-bookmarks-tag-editing.test.tsx`, update `renderAndSelectBookmark()` so it clicks the middle-column result button instead of depending on tree-row rendering. Query the result button by the new selector:

```tsx
const bookmarkButton = Array.from(
  listColumn?.querySelectorAll('[data-testid="bookmark-result-button"]') ?? []
).find((button) => button.textContent?.includes("React Docs")) as HTMLElement | null
```

**Step 2: Run the bookmarks test files to verify they fail**

Run:
```bash
npx vitest run tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx
```

Expected: FAIL because the new shell selectors do not exist yet and the tag-editing helper still assumes the old result-selection path.

**Step 3: Write the minimal bookmarks-shell implementation**

In `src/options.tsx`, keep the existing `BookmarksTab` data logic, but add the shared content framing and a stable outer selector:

```tsx
return (
  <div style={{ display: "grid", gap: spacing.md }}>
    <div style={{ display: "grid", gap: "4px" }}>
      <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: theme.textPrimary }}>
        Bookmarks
      </h2>
      <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted }}>
        Browse folders, inspect saved analysis, and manage bookmark metadata.
      </p>
    </div>

    <div
      data-testid="bookmarks-workspace"
      style={{
        display: "grid",
        gap: spacing.md
      }}
    >
      {/* existing toolbar */}
      {/* existing three-column grid */}
    </div>
  </div>
)
```

Add `data-testid="bookmark-result-button"` to each middle-column bookmark button so the tag-editing tests have a stable interaction point.

In `src/components/bookmark-tree.tsx`, replace the remaining hard-coded selected/hover colors with theme tokens. Convert patterns like these:

```ts
border: isHighlighted ? theme.borderFocus : "transparent",
backgroundColor: isHighlighted ? theme.accentSoft : hovered ? theme.surfaceHover : "transparent",
color: isHighlighted ? theme.textPrimary : theme.textSecondary
```

Remove hard-coded values such as:
- `#E0E7FF`
- `#EEF2FF`
- `#F9FAFB`
- light-only indigo border/text literals in the options variant

In `src/options.tsx`, do the same for the selected bookmark list cards and the bookmarks detail surfaces: prefer `theme.accentSoft`, `theme.borderFocus`, `theme.surface`, `theme.surfaceSubtle`, and `theme.textMuted`.

Do **not** change these behaviors:
- default folder selection
- folder tree navigation
- search overriding folder scope
- bookmark detail loading
- tag editing

**Step 4: Run the bookmarks tests and make them pass**

Run:
```bash
npx vitest run tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx
```

Expected: PASS. The middle column remains the interaction point for detail selection, and the three-column dashboard still behaves the same.

**Step 5: Commit the bookmarks alignment slice**

```bash
git add src/options.tsx src/components/bookmark-tree.tsx tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx
git commit -m "feat: unify bookmarks dashboard with options shell"
```

---

### Task 4: Finish token convergence, then verify the whole feature end-to-end

**Files:**
- Modify: `src/options.tsx:846-1352`
- Modify: `src/components/provider-settings-form.tsx:15-204`
- Modify: `src/components/bookmark-tree.tsx:202-247`
- Optional modify: `src/ui/design-tokens.ts:22-62`
- Test: `tests/ui/options.test.tsx`
- Test: `tests/ui/options-load-state.test.tsx`
- Test: `tests/ui/options-save-state.test.tsx`
- Test: `tests/ui/options-bookmarks-dashboard.test.tsx`
- Test: `tests/ui/options-bookmarks-tag-editing.test.tsx`

**Step 1: Search for remaining hard-coded dashboard colors in the touched files**

Run:
```bash
git grep -nE "#(EEF2FF|E0E7FF|6366f1|F9FAFB|F5F3FF|EFF6FF)|rgba\(99,102,241" -- src/options.tsx src/components/provider-settings-form.tsx src/components/bookmark-tree.tsx src/ui/design-tokens.ts
```

Expected: a short list of leftover literals that should either be removed or consciously kept.

**Step 2: Replace leftover literals with semantic theme tokens**

Make one cleanup pass through the touched files:
- prefer `theme.page` for base backgrounds
- prefer `theme.surface` for cards and panels
- prefer `theme.surfaceSubtle` / `theme.surfaceElevated` for input and muted surfaces
- prefer `theme.border` / `theme.borderMuted` / `theme.borderFocus` for separation and active state
- prefer `theme.accent` / `theme.accentSoft` for brand emphasis
- only extend `src/ui/design-tokens.ts` if a real semantic gap remains after trying the existing tokens

A good target for the summary card in `BookmarkDetailPanel` is a token-driven surface like this, not a hard-coded gradient:

```tsx
<div
  style={{
    backgroundColor: theme.accentSoft,
    border: `1px solid ${theme.border}`,
    borderRadius: "18px",
    padding: "22px"
  }}
>
```

Keep hard-coded `#fff` only where it is clearly button text on an accent background and there is no theme token for inverse text.

**Step 3: Run the full relevant verification suite**

Run:
```bash
npx vitest run tests/ui/options.test.tsx tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx && npm run typecheck && npm run build
```

Expected:
- all listed Vitest files PASS
- `npm run typecheck` exits successfully
- `npm run build` completes successfully and regenerates the extension build output

**Step 4: Review the output and fix only real regressions**

If a check fails:
- fix the specific regression
- rerun only the failing command first
- then rerun the full verification command above

Do **not** add unrelated refactors, abstractions, or theme tokens just because the files are open.

**Step 5: Commit the finished feature**

```bash
git add src/options.tsx src/components/provider-settings-form.tsx src/components/bookmark-tree.tsx src/ui/design-tokens.ts tests/ui/options.test.tsx tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx
git commit -m "feat: redesign options dashboard workspace"
```
