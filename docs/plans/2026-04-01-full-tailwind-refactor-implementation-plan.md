# TabVault Full Tailwind Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild TabVault’s entire front-end surface to match the `design/` HTML prototypes, replacing the custom TS-token/CSS-in-JS theme system with TailwindCSS + semantic CSS variables + `data-theme` while preserving the underlying repository/provider/storage capability layer.

**Architecture:** Keep the existing extension entrypoints (`src/popup.tsx`, `src/options.tsx`, `src/sidepanel.tsx`, `src/tabs/dashboard.tsx`) but move them onto a new shared Tailwind-based UI layer with feature-level view components and a lightweight theme application mechanism. Reuse repositories, provider wiring, bookmark persistence, extraction, trial/license logic, and navigation helpers; replace only the presentation layer, theme persistence shape, and tests that currently assert the old inline-style system.

**Tech Stack:** React 18, TypeScript, Plasmo, TailwindCSS, PostCSS/Autoprefixer, Vitest + jsdom, Chrome extension APIs, existing repository/provider/storage modules.

---

### Task 1: Add Tailwind build pipeline and global stylesheet entry

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/styles/globals.css`
- Modify: the root entry files that need global style import: `src/popup.tsx`, `src/options.tsx`, `src/sidepanel.tsx`, `src/tabs/dashboard.tsx`
- Test: `tests/config/manifest-permissions.test.ts`

**Step 1: Write the failing test**

Add a focused config test that asserts the project declares the Tailwind toolchain dependencies in `package.json` and that the entry surfaces import the shared global stylesheet.

```ts
import { describe, expect, it } from "vitest"
import packageJson from "../../package.json"
import popupSource from "../../src/popup.tsx?raw"

describe("tailwind toolchain", () => {
  it("declares tailwind and postcss dependencies", () => {
    expect(packageJson.devDependencies).toMatchObject({
      tailwindcss: expect.any(String),
      postcss: expect.any(String),
      autoprefixer: expect.any(String)
    })
  })

  it("imports shared globals from app entry surfaces", () => {
    expect(popupSource).toContain("./styles/globals.css")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/config/manifest-permissions.test.ts`

Expected: FAIL because Tailwind/PostCSS dependencies and global style imports do not exist.

**Step 3: Write minimal implementation**

- Add `tailwindcss`, `postcss`, and `autoprefixer` to `devDependencies` in `package.json`.
- Create `tailwind.config.js` with `content` pointing at `src/**/*.{ts,tsx}`, `tests/**/*.{ts,tsx}`, and `design/**/*.html`.
- Create `postcss.config.js` wiring Tailwind and Autoprefixer.
- Create `src/styles/globals.css` with:
  - `@tailwind base;`
  - `@tailwind components;`
  - `@tailwind utilities;`
- Import `globals.css` once per extension entry surface.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/config/manifest-permissions.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add package.json tailwind.config.js postcss.config.js src/styles/globals.css src/popup.tsx src/options.tsx src/sidepanel.tsx src/tabs/dashboard.tsx tests/config/manifest-permissions.test.ts
git commit -m "build: add tailwind frontend pipeline"
```

---

### Task 2: Define the semantic CSS-variable theme system

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `tailwind.config.js`
- Test: `tests/ui/design-tokens.test.ts` (replace or repurpose)

**Step 1: Write the failing test**

Replace the old token test with a new CSS/theme config expectation that asserts:
- `globals.css` contains all six `[data-theme="..."]` blocks
- `tailwind.config.js` exposes semantic colors backed by CSS variables

```ts
import { describe, expect, it } from "vitest"
import fs from "node:fs"

const css = fs.readFileSync("src/styles/globals.css", "utf8")
const config = fs.readFileSync("tailwind.config.js", "utf8")

describe("semantic theme system", () => {
  it("defines all supported theme datasets", () => {
    expect(css).toContain('[data-theme="cloud"]')
    expect(css).toContain('[data-theme="obsidian"]')
    expect(css).toContain('[data-theme="sage"]')
    expect(css).toContain('[data-theme="breeze"]')
    expect(css).toContain('[data-theme="taro"]')
    expect(css).toContain('[data-theme="vanilla"]')
  })

  it("maps tailwind colors to CSS variables", () => {
    expect(config).toContain("accent-primary")
    expect(config).toContain("var(--bg-base)")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/design-tokens.test.ts`

Expected: FAIL because the new theme datasets and semantic mapping are not yet implemented.

**Step 3: Write minimal implementation**

In `src/styles/globals.css`:
- Define `@layer base` with the six theme datasets from `design/Tailwind主题系统开发规范.md`
- Set base element styles for `html, body` using the semantic variables
- Add shared utility rules that design HTML relied on, such as:
  - `.no-scrollbar`
  - `.line-clamp-2`
  - `.line-clamp-3`
- Add restrained focus rings and shared box-sizing rules

In `tailwind.config.js`:
- Map semantic colors:
  - `base`, `surface`, `primary`, `secondary`, `subtle`
  - `accent-primary`, `accent-hover`, `accent-muted`
  - optionally `danger`, `danger-muted`, `success`, `success-muted`
- Add shadows like `soft`, `soft-hover`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/design-tokens.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/styles/globals.css tailwind.config.js tests/ui/design-tokens.test.ts
git commit -m "feat(theme): add semantic tailwind css variable themes"
```

---

### Task 3: Replace light/dark theme persistence with named design themes

**Files:**
- Modify: `src/lib/config/theme-repository.ts`
- Modify: `src/ui/use-theme.ts`
- Modify: `src/types/settings.ts`
- Modify: `src/features/settings/default-settings.ts`
- Modify: `src/lib/config/chrome-settings-repository.ts`
- Test: `tests/lib/config/theme-repository.test.ts`
- Test: `tests/ui/use-theme.test.ts`
- Test: `tests/config/default-settings.test.ts`

**Step 1: Write the failing test**

Update tests to assert:
- theme repository persists one of `cloud | obsidian | sage | breeze | taro | vanilla`
- default app settings include `theme: "sage"`
- `useTheme` (or replacement hook) returns the active theme name and can set `document.documentElement.dataset.theme`

```ts
it("writes named theme values", async () => {
  const repo = new ChromeThemeRepository()
  await repo.setTheme("sage")
  expect(chrome.storage.local.set).toHaveBeenCalledWith({ themeOverride: "sage" })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/config/theme-repository.test.ts tests/ui/use-theme.test.ts tests/config/default-settings.test.ts`

Expected: FAIL because the current theme model only supports `light`/`dark` and no default `theme` setting exists.

**Step 3: Write minimal implementation**

- Change `ThemeOverride` / repository types to the six named themes.
- Add `theme` to `AppSettings` with default `"sage"`.
- Decide one source of truth:
  - preferred: keep the selected theme in app settings
  - optionally still mirror via theme repository for cross-surface convenience
- Rewrite `useTheme` so it:
  - reads the current named theme
  - exposes a setter, not just `toggle`
  - applies `document.documentElement.dataset.theme = themeName`
  - stops deriving token objects from `design-tokens.ts`
- Remove OS `prefers-color-scheme` dependency from the product theme decision, because the design system is explicit and user-selected.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/config/theme-repository.test.ts tests/ui/use-theme.test.ts tests/config/default-settings.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/config/theme-repository.ts src/ui/use-theme.ts src/types/settings.ts src/features/settings/default-settings.ts src/lib/config/chrome-settings-repository.ts tests/lib/config/theme-repository.test.ts tests/ui/use-theme.test.ts tests/config/default-settings.test.ts
git commit -m "feat(theme): persist named design themes"
```

---

### Task 4: Add shared Tailwind UI primitives and helpers

**Files:**
- Create: `src/ui/utils/cn.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/switch.tsx`
- Create: `src/components/ui/radio-card.tsx`
- Create: `src/components/brand/app-logo.tsx`
- Test: `tests/ui/toggle-switch.test.tsx`
- Test: `tests/ui/section-card.test.tsx`

**Step 1: Write the failing test**

Add or update tests asserting the new primitives render semantic Tailwind classes instead of inline styles.

```tsx
it("renders a semantic primary button", () => {
  render(<Button variant="primary">Save</Button>)
  expect(screen.getByRole("button")).toHaveClass("bg-accent-primary")
  expect(screen.getByRole("button")).toHaveClass("text-white")
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/toggle-switch.test.tsx tests/ui/section-card.test.tsx`

Expected: FAIL because the new primitives do not yet exist.

**Step 3: Write minimal implementation**

Create small reusable components that encapsulate the common design language:
- buttons with `primary`, `secondary`, `ghost`, `danger`
- cards with `bg-surface border border-subtle shadow-soft rounded-xl`
- inputs/selects/textareas with semantic focus classes
- a switch component matching the settings and knowledge prototypes
- `AppLogo` for repeated TabVault brand blocks
- `cn.ts` for conditional class composition

Do not overbuild a design system; only create pieces repeated across the prototypes.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/toggle-switch.test.tsx tests/ui/section-card.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/utils/cn.ts src/components/ui src/components/brand/app-logo.tsx tests/ui/toggle-switch.test.tsx tests/ui/section-card.test.tsx
git commit -m "feat(ui): add shared tailwind primitives"
```

---

### Task 5: Rebuild the settings shell and left-nav structure to match `design/settings.html` and `design/setting-knowledge.html`

**Files:**
- Modify: `src/options.tsx`
- Create: `src/features/settings/settings-root.tsx`
- Create: `src/features/settings/settings-provider-panel.tsx`
- Create: `src/features/settings/settings-knowledge-panel.tsx`
- Test: `tests/ui/options-architecture-sections.test.tsx`
- Test: `tests/ui/options-load-state.test.tsx`

**Step 1: Write the failing test**

Update the settings UI test to assert:
- left sidebar with two nav entries: architecture + knowledge
- page title/subtitle match the design references
- switching nav shows the correct panel content
- the root surface uses shared shell data-testid values

```tsx
expect(screen.getByTestId("settings-sidebar")).toBeTruthy()
expect(screen.getByTestId("settings-nav-architecture")).toHaveAttribute("aria-current", "page")
expect(screen.getByText("管理")).toBeTruthy()
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/options-architecture-sections.test.tsx tests/ui/options-load-state.test.tsx`

Expected: FAIL because the current settings page is still the old inline-style structure.

**Step 3: Write minimal implementation**

- Create a new `SettingsRoot` shell using Tailwind classes.
- Add a left sidebar matching the design.
- Keep one `src/options.tsx` entry but render two panels:
  - architecture settings panel
  - knowledge management panel
- Preserve current settings load/save state wiring.
- Move inline layout markup out of `src/options.tsx` into feature components.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/options-architecture-sections.test.tsx tests/ui/options-load-state.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/options.tsx src/features/settings/settings-root.tsx src/features/settings/settings-provider-panel.tsx src/features/settings/settings-knowledge-panel.tsx tests/ui/options-architecture-sections.test.tsx tests/ui/options-load-state.test.tsx
git commit -m "refactor(settings): rebuild settings shell from design"
```

---

### Task 6: Implement the architecture/provider panel UI with real settings binding

**Files:**
- Modify: `src/features/settings/settings-provider-panel.tsx`
- Modify: `src/components/provider-settings-form.tsx`
- Modify: `src/features/settings/provider-form-state.ts`
- Modify: `src/features/settings/settings-validation.ts`
- Test: `tests/ui/options.test.tsx`
- Test: `tests/ui/options-save-state.test.tsx`
- Test: `tests/ui/provider-connection-test.test.tsx`

**Step 1: Write the failing test**

Add tests that assert the panel renders:
- provider radio-card choices for OpenAI Chat / OpenAI Response / Claude / Gemini
- API key / model / base URL fields
- theme picker section
- display language and summary language controls
- auto analyze and auto retry switches
- save button and connection-test action

Also assert save writes back to the repository.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx tests/ui/provider-connection-test.test.tsx`

Expected: FAIL because the new design-aligned panel is not implemented.

**Step 3: Write minimal implementation**

- Convert the provider panel to Tailwind components matching `design/settings.html`.
- Keep real binding to existing app settings and providers repository.
- Add a real visual theme picker for the six themes.
- Keep display language separate from summary language.
- Keep connection-test behavior.
- Do not add new backend behavior beyond what already exists.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx tests/ui/provider-connection-test.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/settings/settings-provider-panel.tsx src/components/provider-settings-form.tsx src/features/settings/provider-form-state.ts src/features/settings/settings-validation.ts tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx tests/ui/provider-connection-test.test.tsx
git commit -m "feat(settings): implement architecture panel ui"
```

---

### Task 7: Implement the knowledge-management panel shell and wire only the real actions that already exist

**Files:**
- Modify: `src/features/settings/settings-knowledge-panel.tsx`
- Modify: `src/options.tsx`
- Inspect/Reuse: bookmark repository methods and any existing clear-analysis helpers
- Test: `tests/ui/options-bookmarks-dashboard.test.tsx`
- Test: `tests/ui/options-bookmarks-tag-editing.test.tsx`

**Step 1: Write the failing test**

Update or replace old bookmark-management settings tests so they now assert:
- storage overview card renders
- danger-zone cards render
- retrieval/vector architecture form shell renders
- privacy blocklist textarea renders
- any currently supported destructive action is still callable through the real repository/service hooks

```tsx
expect(screen.getByText("存储概览")).toBeTruthy()
expect(screen.getByText("数据清理 (Danger Zone)")).toBeTruthy()
expect(screen.getByLabelText(/忽略域名列表/i)).toBeTruthy()
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx`

Expected: FAIL because the old settings bookmark dashboard UI has been removed or no longer matches.

**Step 3: Write minimal implementation**

Implement the new knowledge-management panel matching `design/setting-knowledge.html`:
- storage overview card
- import/export block shell
- danger zone cards
- vector/retrieval panel shell
- privacy blocklist area

Wire only existing real actions and settings. For parts not yet implemented in the backend (e.g. full vector strategy), render clear non-destructive placeholder copy consistent with the design document.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/settings/settings-knowledge-panel.tsx src/options.tsx tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx
git commit -m "feat(settings): add knowledge management panel"
```

---

### Task 8: Rebuild popup into synced/unsynced prototype states

**Files:**
- Modify: `src/popup.tsx`
- Create: `src/features/popup/popup-root.tsx`
- Create: `src/features/popup/popup-synced-view.tsx`
- Create: `src/features/popup/popup-unsynced-view.tsx`
- Reuse: `src/lib/utils/navigation.ts`, `src/features/bookmarks/save-current-page.ts`, `src/features/ai/analyze-bookmark.ts`
- Test: `tests/ui/popup-state.test.tsx`
- Test: `tests/ui/popup-quick-entry.test.tsx`

**Step 1: Write the failing test**

Update popup tests to assert:
- unsynced state matches the unsynced prototype structure
- synced state shows summary/tags card, synced badge, and sidepanel CTA
- popup no longer renders legacy shell content
- navigation buttons still call the existing helpers

```tsx
expect(screen.getByTestId("popup-unsynced-view")).toBeTruthy()
expect(screen.getByText("收藏并深度分析")).toBeTruthy()
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/popup-state.test.tsx tests/ui/popup-quick-entry.test.tsx`

Expected: FAIL because popup currently uses the old quick-entry layout and does not branch on synced/unsynced prototype views.

**Step 3: Write minimal implementation**

- Move popup orchestration into `popup-root.tsx`.
- Query the current page and check if its URL already exists in the bookmark repository.
- Render:
  - `PopupUnsyncedView` when the current page is not saved
  - `PopupSyncedView` when it is saved
- Use Tailwind classes matching `design/popup-unsync.html` and `design/popup-sync.html`.
- Preserve save/analyze behavior and navigation actions.
- Reuse stored summary/tags in the synced view.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/popup-state.test.tsx tests/ui/popup-quick-entry.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/popup.tsx src/features/popup/popup-root.tsx src/features/popup/popup-synced-view.tsx src/features/popup/popup-unsynced-view.tsx tests/ui/popup-state.test.tsx tests/ui/popup-quick-entry.test.tsx
git commit -m "refactor(popup): rebuild synced and unsynced views"
```

---

### Task 9: Rebuild sidepanel into the `design/sidepanel.html` Ghostreader layout

**Files:**
- Modify: `src/sidepanel.tsx`
- Create: `src/features/sidepanel/sidepanel-root.tsx`
- Reuse: `src/features/hybrid-retrieval/*`, `src/lib/utils/navigation.ts`, trial/license components or replacements
- Test: `tests/ui/sidepanel.test.tsx`
- Test: `tests/ui/sidepanel-ghostreader.test.tsx`

**Step 1: Write the failing test**

Update sidepanel tests to assert:
- compact header with Ghostreader branding
- current-page context bar beneath header
- assistant-thread body layout
- bottom omnibox input/footer matching the design prototype
- hybrid retrieval still drives answer blocks and action cards
- trial/license UI remains available without breaking the new shell

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/sidepanel.test.tsx tests/ui/sidepanel-ghostreader.test.tsx`

Expected: FAIL because the current sidepanel still relies heavily on inline theme styles and old layout assumptions.

**Step 3: Write minimal implementation**

- Move orchestration into `sidepanel-root.tsx`.
- Use Tailwind layout matching `design/sidepanel.html`.
- Keep current page extraction, bookmark loading, hybrid retrieval, action cards, answer blocks, import action, and trial/license behavior.
- Replace old theme toggle and inline style blocks with the new named-theme selector model.
- Ensure the input remains the interaction center for ask/query flows.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/sidepanel.test.tsx tests/ui/sidepanel-ghostreader.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/sidepanel.tsx src/features/sidepanel/sidepanel-root.tsx tests/ui/sidepanel.test.tsx tests/ui/sidepanel-ghostreader.test.tsx
git commit -m "refactor(sidepanel): rebuild ghostreader layout"
```

---

### Task 10: Rebuild dashboard shell to support browse mode and bulk-edit mode

**Files:**
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Create: `src/features/dashboard/dashboard-root.tsx`
- Create: `src/features/dashboard/dashboard-browse-view.tsx`
- Create: `src/features/dashboard/dashboard-bulk-edit-view.tsx`
- Modify: `src/features/dashboard/dashboard-navigation.tsx`
- Modify: `src/features/dashboard/dashboard-results-list.tsx`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx`
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`
- Test: `tests/ui/dashboard-data.test.tsx`
- Test: `tests/ui/dashboard-repository-load.test.tsx`

**Step 1: Write the failing test**

Update dashboard tests to assert:
- browse mode matches the three-pane prototype
- selecting one or more bookmarks switches inspector into bulk-edit mode
- search, result cards, reading pane, and right inspector all render Tailwind-driven design structure
- folder-tree filtering still works

```tsx
expect(screen.getByTestId("dashboard-browse-view")).toBeTruthy()
expect(screen.getByPlaceholderText("搜索标题、全文、标签或你的笔记...")).toBeTruthy()
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx tests/ui/dashboard-repository-load.test.tsx`

Expected: FAIL because the current dashboard shell has the old inline layout and no real bulk-edit prototype mode.

**Step 3: Write minimal implementation**

- Refactor dashboard into stateful views:
  - browse mode
  - bulk-edit mode when `selectedItems.length >= 1`
- Match `design/dashboard.html` and `design/dashboard-bulk-edit.html`:
  - left navigation rail
  - center search + result list
  - right inspector with tabs or bulk edit tools
- Preserve bookmark loading, folder-tree navigation, active bookmark reading, summary/tag editing, and repository updates.
- Keep resizable columns only if they do not conflict with the prototype; otherwise simplify toward the design.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx tests/ui/dashboard-repository-load.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-shell.tsx src/features/dashboard/dashboard-root.tsx src/features/dashboard/dashboard-browse-view.tsx src/features/dashboard/dashboard-bulk-edit-view.tsx src/features/dashboard/dashboard-navigation.tsx src/features/dashboard/dashboard-results-list.tsx src/features/dashboard/dashboard-reading-pane.tsx src/features/dashboard/dashboard-ai-sidebar.tsx tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx tests/ui/dashboard-repository-load.test.tsx
git commit -m "refactor(dashboard): rebuild browse and bulk edit workspace"
```

---

### Task 11: Preserve inline bookmark editing and persistence in the new dashboard inspector

**Files:**
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx`
- Modify: `src/features/dashboard/editable-summary-card.tsx`
- Modify: `src/features/dashboard/editable-tags-card.tsx`
- Modify: `src/lib/storage/update-bookmark-metadata.ts`
- Test: `tests/ui/dashboard-editing.test.tsx`
- Test: `tests/ui/dashboard-persistence.test.tsx`
- Test: `tests/storage/update-bookmark-metadata.test.ts`

**Step 1: Write the failing test**

Add tests asserting:
- summary saves on blur in the new inspector
- tags save on change/remove in the new inspector
- bulk-edit actions update selected bookmarks correctly
- `updatedAt` is refreshed on every metadata save

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-persistence.test.tsx tests/storage/update-bookmark-metadata.test.ts`

Expected: FAIL if the new dashboard inspector has not yet retained the persistence behavior.

**Step 3: Write minimal implementation**

- Keep the shared metadata update path.
- Port the inline edit behavior into the new Tailwind inspector.
- Implement the bulk-edit panel actions from the design:
  - append tags
  - remove tags
  - re-run analysis action shell
  - append note shell if supported
- Use `onBlur` autosave where the design doc explicitly calls for seamless editing.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-persistence.test.tsx tests/storage/update-bookmark-metadata.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-ai-sidebar.tsx src/features/dashboard/editable-summary-card.tsx src/features/dashboard/editable-tags-card.tsx src/lib/storage/update-bookmark-metadata.ts tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-persistence.test.tsx tests/storage/update-bookmark-metadata.test.ts
git commit -m "feat(dashboard): preserve inline editing and bulk metadata actions"
```

---

### Task 12: Update navigation helpers and cross-surface language/theme cohesion

**Files:**
- Modify: `src/lib/utils/navigation.ts`
- Modify: `src/lib/i18n/messages.ts`
- Modify: `src/popup.tsx`
- Modify: `src/options.tsx`
- Modify: `src/sidepanel.tsx`
- Modify: `src/tabs/dashboard.tsx`
- Test: `tests/lib/utils/navigation.test.ts`
- Test: `tests/lib/i18n/messages.test.ts`
- Test: `tests/ui/cohesion-smoke.test.tsx`

**Step 1: Write the failing test**

Update cohesion tests to assert:
- popup, settings, sidepanel, and dashboard all mount under the new shared theme system
- root `data-theme` is applied for all surfaces
- localized strings still resolve according to `displayLanguage`
- navigation helpers still open dashboard/settings/sidepanel correctly

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/utils/navigation.test.ts tests/lib/i18n/messages.test.ts tests/ui/cohesion-smoke.test.tsx`

Expected: FAIL until all surfaces are on the new system.

**Step 3: Write minimal implementation**

- Ensure all entry surfaces initialize the shared theme application and global CSS.
- Update translations for any new design-driven text.
- Keep the navigation helpers stable.
- Make the cohesion smoke test mount the new root structures rather than the old `ThemeProvider` token objects.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/utils/navigation.test.ts tests/lib/i18n/messages.test.ts tests/ui/cohesion-smoke.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/utils/navigation.ts src/lib/i18n/messages.ts src/popup.tsx src/options.tsx src/sidepanel.tsx src/tabs/dashboard.tsx tests/lib/utils/navigation.test.ts tests/lib/i18n/messages.test.ts tests/ui/cohesion-smoke.test.tsx
git commit -m "refactor(ui): unify cross-surface theme and language behavior"
```

---

### Task 13: Remove the legacy theme/token system from active use

**Files:**
- Delete or stop importing: `src/ui/design-tokens.ts`
- Delete or stop importing: `src/ui/theme-context.tsx`
- Delete or stop importing: `src/ui/use-global-styles.ts`
- Modify: any remaining files under `src/` or `tests/` that still import the legacy system
- Test: `tests/ui/cohesion-smoke.test.tsx`
- Test: `tests/ui/use-theme.test.ts`

**Step 1: Write the failing test**

Add a final codebase-level test or narrow assertion that no app entry surface imports the retired theme-token modules.

```ts
expect(popupSource).not.toContain("./ui/design-tokens")
expect(optionsSource).not.toContain("./ui/theme-context")
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/cohesion-smoke.test.tsx tests/ui/use-theme.test.ts`

Expected: FAIL until the legacy theme system is fully removed from imports.

**Step 3: Write minimal implementation**

- Remove all imports of `design-tokens`, `theme-context`, and `use-global-styles` from production surfaces.
- Delete those files if they are no longer referenced.
- Update tests to use the new theme application mechanism.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/cohesion-smoke.test.tsx tests/ui/use-theme.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src tests
git commit -m "refactor(theme): remove legacy token styling system"
```

---

### Task 14: Run final verification and document manual QA states

**Files:**
- Modify: `docs/manual-testing.md`
- Modify: `docs/plans/2026-04-01-full-tailwind-refactor-design.md` if any implementation deltas must be noted
- Optionally create or modify: a dedicated smoke-test file if gaps remain in automated coverage

**Step 1: Write or update verification checklist**

Update `docs/manual-testing.md` with explicit checks for:
- popup synced state
- popup unsynced state
- settings architecture panel
- settings knowledge panel
- sidepanel ghostreader shell
- dashboard browse mode
- dashboard bulk-edit mode
- all six themes switching correctly
- zh/en display-language verification

**Step 2: Run automated verification**

Run:

```bash
npm run typecheck
npm run build
npm test
```

Expected:
- typecheck passes
- build passes
- vitest suite passes

**Step 3: Perform manual extension QA**

Open the extension surfaces and verify:
- popup unsynced URL shows the unsynced prototype state
- saving moves to synced state with summary/tags presentation
- sidepanel layout matches the design and still responds to queries
- settings nav and forms match both HTML references
- dashboard switches into bulk-edit mode when items are selected
- `data-theme` changes update all surfaces correctly

**Step 4: Record any small deltas**

If a design detail had to differ for functional reasons, document it precisely in `docs/manual-testing.md` or the design doc.

**Step 5: Commit**

```bash
git add docs/manual-testing.md docs/plans/2026-04-01-full-tailwind-refactor-design.md tests
 git commit -m "test: verify full tailwind refactor"
```

---

## Notes for the implementing engineer

- Use `npm`, not `pnpm` or `yarn`, because `package-lock.json` is present.
- Treat `design/*.html` and the two design markdown files as canonical UI references.
- Do not port the HTML verbatim into one giant JSX file. Break repeated patterns into small components.
- Do not add speculative backend functionality for vector settings or knowledge management panels. If the backend capability does not exist yet, render a clearly bounded design-aligned shell.
- Prefer replacing old tests over preserving assertions for obsolete inline styles.
- Keep commits small and sequential. Do not skip the failing-test step.
