# TabVault Productization Workstreams Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn TabVault into a clearer, more trustworthy, and easier-to-demo product by improving messaging, first-run clarity, the core save-to-retrieval loop, release assets, and seed-user validation materials.

**Architecture:** This plan does not add major new product modules. It tightens the existing popup, sidepanel, dashboard, options, i18n, and docs layers so they consistently support one product story: save pages, understand them quickly, and find them again later. Work is organized by workstream, but each task is still small, test-first where behavior changes, and grounded in existing files and tests.

**Tech Stack:** Plasmo, React 18, TypeScript, Vitest, IndexedDB, `chrome.storage.sync`, browser extension surfaces (`popup`, `sidepanel`, `options`, `dashboard`)

---

## Execution rules for the engineer

- Start in a dedicated worktree before implementing.
- Use `@superpowers/test-driven-development` before behavior-changing code.
- Use `@superpowers/requesting-code-review` before calling the whole plan done.
- Do not invent a lint step; this repo does not define one in `package.json`.
- Prefer editing existing files over creating new ones.
- Keep scope inside the five workstreams below.
- Run the smallest relevant tests first, then broaden to repo-level verification.

## Locked product direction

Use these as fixed inputs across all workstreams unless the user explicitly changes them:

- **Positioning:** TabVault is a local-first AI bookmark and web memory tool that helps you save pages, understand them quickly, and actually find them again later.
- **Primary target user:** programmers and research-heavy users who save lots of useful web pages and later struggle to recover them.
- **Core scenarios:**
  1. save and summarize a useful page
  2. find a previously saved page again
  3. reuse saved web knowledge during active work
- **Do not emphasize:** team collaboration, enterprise workflows, deep provider differentiation, broad AI-platform framing, or feature breadth as the main story.

---

## Workstream 1: Positioning and trust copy

### Task 1: Audit current messaging against the locked product direction

**Files:**
- Modify: `README.md`
- Modify: `src/lib/i18n/messages.ts`
- Modify: `src/popup.tsx`
- Modify: `src/options.tsx`
- Modify: `src/components/provider-settings-form.tsx`
- Test: `tests/ui/popup-state.test.tsx`
- Test: `tests/ui/options.test.tsx`

**Step 1: Write the failing test**

Add or update assertions in:
- `tests/ui/popup-state.test.tsx`
- `tests/ui/options.test.tsx`

Cover these expectations:
- popup helper text explains the value in user terms, not internal terms
- options page copy exposes local-first storage and user-managed API keys clearly
- settings copy no longer leads with architecture-heavy language such as “Provider & Protocol” / “Retrieval Architecture” when a clearer product term is intended

Example test shape:

```ts
it("shows trust-oriented settings copy for local-first and user-managed keys", async () => {
  await renderOptions()

  expect(container?.textContent).toContain("Stored locally in your browser")
  expect(container?.textContent).toContain("Use your own provider API key")
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/popup-state.test.tsx tests/ui/options.test.tsx
```

Expected: FAIL because current copy still reflects older architecture/MVP wording.

**Step 3: Write minimal implementation**

Update copy in:
- `src/lib/i18n/messages.ts`
- `README.md`
- any render-only wording in `src/popup.tsx`, `src/options.tsx`, `src/components/provider-settings-form.tsx`

Make the wording consistently express:
- what TabVault is
- that data is stored locally by default
- that provider API keys are user-managed
- that saving works even before AI setup

Do not add new flows here; keep this task copy-focused.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/popup-state.test.tsx tests/ui/options.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add README.md src/lib/i18n/messages.ts src/popup.tsx src/options.tsx src/components/provider-settings-form.tsx tests/ui/popup-state.test.tsx tests/ui/options.test.tsx
git commit -m "docs: align TabVault positioning and trust copy"
```

### Task 2: Align README headline, quickstart, and trust framing with the product story

**Files:**
- Modify: `README.md`
- Test: no new automated test file required; verify via doc review and repo-level checks later

**Step 1: Write the failing test**

Write a short checklist at the top of your working notes and treat any missing item as a failing acceptance condition:
- one-line headline matches the locked positioning
- quickstart explains install -> configure -> save -> find-again
- provider section clearly states local-first storage and user-managed keys
- README does not over-sell TabVault as a broad AI platform

**Step 2: Run test to verify it fails**

Open `README.md` and verify at least one acceptance item fails in the current text.

Expected: FAIL because the current README is still MVP/architecture-heavy.

**Step 3: Write minimal implementation**

Update `README.md` to include:
- a stronger one-line headline/subheadline
- a short “who it is for” section
- 3 product value bullets centered on save / understand / find again
- a simplified setup explanation for first users
- a short FAQ or trust section covering local-first storage and API keys

**Step 4: Run test to verify it passes**

Re-read `README.md` against the checklist.

Expected: PASS

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README around productized user story"
```

---

## Workstream 2: First-run onboarding clarity

### Task 3: Strengthen popup first-run guidance and next-step hierarchy

**Files:**
- Modify: `src/popup.tsx:358-489`
- Modify: `src/lib/i18n/messages.ts`
- Test: `tests/ui/popup-state.test.tsx`
- Test: `tests/ui/popup-quick-entry.test.tsx`

**Step 1: Write the failing test**

Add tests for:
- unsynced popup state gives a clear first action
- popup tells users they can save first and configure AI later
- post-save state points users toward the next useful step (sidepanel or dashboard)

Example:

```ts
it("explains that AI setup is optional before the first save", async () => {
  await renderPopup(createServices())

  expect(container?.textContent).toContain("Save first")
  expect(container?.textContent).toContain("AI setup is optional")
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/popup-state.test.tsx tests/ui/popup-quick-entry.test.tsx
```

Expected: FAIL because the current helper state is still generic.

**Step 3: Write minimal implementation**

Update popup copy and layout emphasis in:
- `src/popup.tsx`
- `src/lib/i18n/messages.ts`

Keep changes narrow:
- clarify the unsynced helper card
- improve save button/supporting text hierarchy
- make synced state better at communicating “what next”

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/popup-state.test.tsx tests/ui/popup-quick-entry.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/popup.tsx src/lib/i18n/messages.ts tests/ui/popup-state.test.tsx tests/ui/popup-quick-entry.test.tsx
git commit -m "feat: clarify popup first-run guidance"
```

### Task 4: Make options page easier for first users to understand

**Files:**
- Modify: `src/options.tsx:446-519`
- Modify: `src/components/provider-settings-form.tsx:31-259`
- Modify: `src/lib/i18n/messages.ts`
- Test: `tests/ui/options.test.tsx`
- Test: `tests/ui/options-save-state.test.tsx`

**Step 1: Write the failing test**

Add or update tests asserting:
- first-time settings language explains what to configure first
- provider form labels/help text are user-facing
- saving state still works after copy/layout changes

Example:

```ts
it("guides first users to choose one provider and save settings", async () => {
  await renderOptions()

  expect(container?.textContent).toContain("Choose one provider to start")
  expect(container?.textContent).toContain("Save settings")
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx
```

Expected: FAIL because current page framing is still architecture-heavy.

**Step 3: Write minimal implementation**

Update:
- top-of-page explanatory copy in `src/options.tsx`
- provider helper labels and connection state wording in `src/components/provider-settings-form.tsx`
- related strings in `src/lib/i18n/messages.ts`

Make sure the page tells users:
- choose one provider
- add your API key
- save settings
- saving pages still works without AI auto-analysis enabled

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/options.tsx src/components/provider-settings-form.tsx src/lib/i18n/messages.ts tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx
git commit -m "feat: simplify first-time settings guidance"
```

### Task 5: Improve sidepanel and dashboard empty states for first-use clarity

**Files:**
- Modify: `src/sidepanel.tsx:442-519`
- Modify: `src/features/dashboard/dashboard-results-list.tsx:245-260`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx:136-163`
- Modify: `src/lib/i18n/messages.ts`
- Test: `tests/ui/sidepanel.test.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**

Add tests for:
- sidepanel welcome text clearly explains what Ghostreader is for in product terms
- dashboard empty state explains how to get the first bookmark into the library
- reading pane empty state nudges users toward selecting a saved page

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/sidepanel.test.tsx tests/ui/dashboard-shell.test.tsx
```

Expected: FAIL because current empty states are functional but not optimized for first users.

**Step 3: Write minimal implementation**

Update the empty/welcome strings and any small render-only text wrappers in:
- `src/sidepanel.tsx`
- `src/features/dashboard/dashboard-results-list.tsx`
- `src/features/dashboard/dashboard-reading-pane.tsx`
- `src/lib/i18n/messages.ts`

Do not add new data flow here.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/sidepanel.test.tsx tests/ui/dashboard-shell.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/sidepanel.tsx src/features/dashboard/dashboard-results-list.tsx src/features/dashboard/dashboard-reading-pane.tsx src/lib/i18n/messages.ts tests/ui/sidepanel.test.tsx tests/ui/dashboard-shell.test.tsx
git commit -m "feat: improve first-use empty states across sidepanel and dashboard"
```

---

## Workstream 3: Save -> understand -> find-again loop quality

### Task 6: Improve save success and analysis feedback in the popup flow

**Files:**
- Modify: `src/popup.tsx:155-234`
- Modify: `src/lib/i18n/messages.ts`
- Test: `tests/ui/popup-state.test.tsx`
- Test: `tests/bookmarks/save-current-page.test.ts`

**Step 1: Write the failing test**

Add tests covering:
- save success message emphasizes value, not only completion
- missing AI configuration message still preserves successful save confidence
- metadata failure message is user-friendly

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/popup-state.test.tsx tests/bookmarks/save-current-page.test.ts
```

Expected: FAIL because the current status language is still basic.

**Step 3: Write minimal implementation**

Update `src/popup.tsx` and relevant strings in `src/lib/i18n/messages.ts` so the user can tell:
- the page was saved
- analysis is optional / pending / failed without invalidating the save
- what to do next if they want richer value

Do not change repository behavior unless the test proves it is necessary.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/popup-state.test.tsx tests/bookmarks/save-current-page.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/popup.tsx src/lib/i18n/messages.ts tests/ui/popup-state.test.tsx tests/bookmarks/save-current-page.test.ts
git commit -m "feat: improve popup save and analysis feedback"
```

### Task 7: Make retrieval reasons and result scanning more legible

**Files:**
- Modify: `src/features/bookmarks/search-bookmarks.ts:35-67`
- Modify: `src/features/hybrid-retrieval/retrieve-hybrid-results.ts:5-20`
- Modify: `src/features/dashboard/dashboard-results-list.tsx`
- Modify: `src/lib/i18n/messages.ts`
- Test: `tests/bookmarks/search-bookmarks-with-reasons.test.ts`
- Test: `tests/ui/dashboard-data.test.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**

Add tests that assert:
- match reasons use clearer, user-facing wording
- dashboard result cards expose more useful scanning cues when summaries/tags exist
- retrieval results remain stable for existing query behavior

Example:

```ts
it("returns a user-facing reason for summary matches", () => {
  const results = searchBookmarksWithReasons([bookmark], "caching")
  expect(results[0].matchReason).toContain("summary")
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/bookmarks/search-bookmarks-with-reasons.test.ts tests/ui/dashboard-data.test.tsx tests/ui/dashboard-shell.test.tsx
```

Expected: FAIL because the current reasons and scanning language are still implementation-shaped.

**Step 3: Write minimal implementation**

Update:
- match-reason strings in `src/features/bookmarks/search-bookmarks.ts`
- any result metadata rendering in `src/features/dashboard/dashboard-results-list.tsx`
- if needed, the result composition path in `src/features/hybrid-retrieval/retrieve-hybrid-results.ts`

Keep the ranking algorithm stable unless a test proves otherwise.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/bookmarks/search-bookmarks-with-reasons.test.ts tests/ui/dashboard-data.test.tsx tests/ui/dashboard-shell.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/bookmarks/search-bookmarks.ts src/features/hybrid-retrieval/retrieve-hybrid-results.ts src/features/dashboard/dashboard-results-list.tsx src/lib/i18n/messages.ts tests/bookmarks/search-bookmarks-with-reasons.test.ts tests/ui/dashboard-data.test.tsx tests/ui/dashboard-shell.test.tsx
git commit -m "feat: improve retrieval result clarity and scanability"
```

### Task 8: Strengthen sidepanel “reuse saved knowledge” guidance

**Files:**
- Modify: `src/sidepanel.tsx:365-430`
- Modify: `src/lib/i18n/messages.ts`
- Test: `tests/ui/sidepanel.test.tsx`
- Test: `tests/ui/sidepanel-ghostreader.test.tsx`

**Step 1: Write the failing test**

Add tests proving that:
- sidepanel welcome and composer copy frame Ghostreader as a way to use saved pages, not just chat
- current-page context and saved-library context are both understandable from the UI

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/sidepanel.test.tsx tests/ui/sidepanel-ghostreader.test.tsx
```

Expected: FAIL because current copy still leans on internal naming.

**Step 3: Write minimal implementation**

Update only render/copy paths in:
- `src/sidepanel.tsx`
- `src/lib/i18n/messages.ts`

Keep Ghostreader session behavior unchanged.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/sidepanel.test.tsx tests/ui/sidepanel-ghostreader.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/sidepanel.tsx src/lib/i18n/messages.ts tests/ui/sidepanel.test.tsx tests/ui/sidepanel-ghostreader.test.tsx
git commit -m "feat: clarify Ghostreader as reusable web memory"
```

---

## Workstream 4: Demo and release assets

### Task 9: Rewrite README as the minimum release explainer page

**Files:**
- Modify: `README.md`

**Step 1: Write the failing test**

Use this acceptance checklist as the failing test:
- headline and subheadline communicate the product in one glance
- includes who it is for
- includes 3 core value points
- includes quick setup/use steps
- includes trust FAQ
- includes a short demo-style walkthrough

**Step 2: Run test to verify it fails**

Review the current README against the checklist.

Expected: FAIL because it is still MVP/internals-heavy.

**Step 3: Write minimal implementation**

Expand `README.md` with:
- product headline/subheadline
- target user section
- value bullets
- quickstart for first use
- trust FAQ
- short “demo flow” section

**Step 4: Run test to verify it passes**

Re-read `README.md` against the checklist.

Expected: PASS

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: turn README into minimum release explainer"
```

### Task 10: Upgrade manual testing and QA docs around the demoable core loop

**Files:**
- Modify: `docs/manual-testing.md`
- Modify: `docs/qa-checklist.md`

**Step 1: Write the failing test**

Create an acceptance checklist requiring both docs to cover:
- install/load extension
- first-run provider configuration
- first save
- post-save value check
- find-again flow
- failure-path checks for missing AI setup / failed analysis
- short pre-release regression path

**Step 2: Run test to verify it fails**

Review the current docs against the checklist.

Expected: FAIL because they are broader MVP docs, not productization/demo-first docs.

**Step 3: Write minimal implementation**

Update both docs so they include:
- a short “2-minute demo path” section
- a “first user walkthrough” section
- a smaller release-readiness checklist focused on productization risks

Do not remove useful current coverage; tighten structure.

**Step 4: Run test to verify it passes**

Re-read both docs against the checklist.

Expected: PASS

**Step 5: Commit**

```bash
git add docs/manual-testing.md docs/qa-checklist.md
git commit -m "docs: align manual testing and QA with productization loop"
```

### Task 11: Create screenshot and GIF capture instructions

**Files:**
- Create: `docs/product-assets-checklist.md`
- Modify: `README.md`

**Step 1: Write the failing test**

Define the required asset list:
- popup unsynced view
- popup synced view with summary/tags
- sidepanel with current-page and library context
- dashboard search/find-again view
- options page trust/setup view
- 1-2 GIF flows for save -> result and find-again

**Step 2: Run test to verify it fails**

Check the repo for an existing dedicated asset capture checklist.

Expected: FAIL because none exists.

**Step 3: Write minimal implementation**

Create `docs/product-assets-checklist.md` with:
- exact scenes to capture
- ordering for README/release use
- naming guidance for exported files
- what not to show (internal/debug-heavy screens)

Add one short pointer from `README.md` to the checklist if useful.

**Step 4: Run test to verify it passes**

Read `docs/product-assets-checklist.md` and verify every required asset is covered.

Expected: PASS

**Step 5: Commit**

```bash
git add docs/product-assets-checklist.md README.md
git commit -m "docs: add product screenshot and gif checklist"
```

---

## Workstream 5: Seed-user validation operations

### Task 12: Create the seed-user validation plan

**Files:**
- Create: `docs/seed-user-validation-plan.md`
- Modify: `README.md` (optional, only if adding a feedback pointer)

**Step 1: Write the failing test**

Define required sections:
- who to recruit
- 10-15 seed-user profile suggestions
- guided test flow
- questions to ask
- where to log responses
- what counts as success/failure signals

**Step 2: Run test to verify it fails**

Check whether such a doc already exists.

Expected: FAIL because the repo does not currently contain a dedicated seed-user validation plan.

**Step 3: Write minimal implementation**

Create `docs/seed-user-validation-plan.md` with:
- target user profiles
- outreach/share format suggestions
- guided first-use flow
- structured feedback questionnaire
- response logging template
- synthesis instructions after the first batch

**Step 4: Run test to verify it passes**

Read the document and verify every required section exists.

Expected: PASS

**Step 5: Commit**

```bash
git add docs/seed-user-validation-plan.md README.md
git commit -m "docs: add seed-user validation plan"
```

### Task 13: Create a pricing hypothesis note without building billing

**Files:**
- Create: `docs/pricing-hypothesis.md`

**Step 1: Write the failing test**

Define acceptance criteria:
- includes 2-3 pricing directions
- explains which one is the current hypothesis
- lists what must be true before charging real users
- does not require code changes or payment plumbing

**Step 2: Run test to verify it fails**

Check whether the file already exists.

Expected: FAIL because no dedicated pricing hypothesis note exists.

**Step 3: Write minimal implementation**

Create `docs/pricing-hypothesis.md` documenting:
- candidate pricing directions
- recommended current hypothesis
- interview prompts about willingness to pay
- product readiness gates before monetization

**Step 4: Run test to verify it passes**

Read the file and verify all acceptance criteria are present.

Expected: PASS

**Step 5: Commit**

```bash
git add docs/pricing-hypothesis.md
git commit -m "docs: add pricing hypothesis for first-user validation"
```

### Task 14: Run final repo-level verification for the full productization pass

**Files:**
- Modify: none unless verification finds issues
- Test: `tests/ui/popup-state.test.tsx`
- Test: `tests/ui/popup-quick-entry.test.tsx`
- Test: `tests/ui/options.test.tsx`
- Test: `tests/ui/options-save-state.test.tsx`
- Test: `tests/ui/sidepanel.test.tsx`
- Test: `tests/ui/sidepanel-ghostreader.test.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`
- Test: `tests/ui/dashboard-data.test.tsx`
- Test: `tests/bookmarks/save-current-page.test.ts`
- Test: `tests/bookmarks/search-bookmarks-with-reasons.test.ts`

**Step 1: Write the failing test**

Treat the full verification matrix below as the final acceptance test.

**Step 2: Run test to verify it fails or passes honestly**

Run:
```bash
npm exec vitest run tests/ui/popup-state.test.tsx tests/ui/popup-quick-entry.test.tsx tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx tests/ui/sidepanel.test.tsx tests/ui/sidepanel-ghostreader.test.tsx tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx tests/bookmarks/save-current-page.test.ts tests/bookmarks/search-bookmarks-with-reasons.test.ts
npm run typecheck
npm run build
```

Expected: PASS. If anything fails, fix it before continuing.

**Step 3: Write minimal implementation**

If verification fails, make the smallest necessary fix in the relevant file and rerun only the affected command first.

**Step 4: Run test to verify it passes**

Re-run the failed command, then re-run the full verification matrix.

Expected: PASS

**Step 5: Commit**

```bash
git add README.md docs/manual-testing.md docs/qa-checklist.md docs/product-assets-checklist.md docs/seed-user-validation-plan.md docs/pricing-hypothesis.md src/lib/i18n/messages.ts src/popup.tsx src/options.tsx src/sidepanel.tsx src/components/provider-settings-form.tsx src/features/dashboard/dashboard-results-list.tsx src/features/dashboard/dashboard-reading-pane.tsx src/features/bookmarks/search-bookmarks.ts src/features/hybrid-retrieval/retrieve-hybrid-results.ts tests/ui/popup-state.test.tsx tests/ui/popup-quick-entry.test.tsx tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx tests/ui/sidepanel.test.tsx tests/ui/sidepanel-ghostreader.test.tsx tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx tests/bookmarks/save-current-page.test.ts tests/bookmarks/search-bookmarks-with-reasons.test.ts
git commit -m "feat: productize TabVault core user journey"
```

---

## Manual validation requirements before closing the plan

After implementation, manually verify at least this path in a browser-loaded extension:

1. Load the extension from `build/chrome-mv3-dev` or `build/chrome-mv3-prod`.
2. Open Options and confirm the setup language is understandable.
3. Configure one provider, save settings, and confirm trust copy is visible.
4. Visit a page that has not been saved before and open the popup.
5. Save the page and confirm the success state is understandable.
6. If AI is configured, confirm analysis feedback is understandable.
7. Open the sidepanel and confirm the welcome/query affordances make sense.
8. Open the dashboard and confirm the empty/results/reading states support find-again behavior.
9. Walk through the 2-minute demo script defined in the docs.

## Definition of done

This plan is done only when:
- product copy is consistent across README, popup, sidepanel, options, and dashboard empty states
- the first-run path explains what to do next
- save/analyze/find-again behavior feels legible to a new user
- release/demo docs exist and are internally consistent
- seed-user validation and pricing hypothesis docs exist
- the targeted tests, `npm run typecheck`, and `npm run build` all pass
- manual validation confirms the UI changes work in the actual extension
