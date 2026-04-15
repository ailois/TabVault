# TabVault Productization Workstreams Design

Date: 2026-04-14
Status: Approved draft
Purpose: Reframe the existing 2-week productization sprint and Day 1 positioning draft into a workstream-oriented execution design that can be translated into an implementation plan.

## 1. Design Goal

Create a single execution-oriented planning structure for TabVault productization work that is easier to run than the existing day-by-day draft.

Instead of organizing the sprint as Day 1 through Day 14, organize it as a small set of focused workstreams that map directly to the current repository, current UI surfaces, current documentation, and current tests.

This design should make it easier to:
- execute work in a practical order
- split work across sessions or subagents later
- keep scope tight around productization rather than feature expansion
- convert strategy language into code/doc/test tasks

## 2. Locked Product Direction

The combined plan should treat the following as fixed inputs for this sprint unless deliberately changed later.

### Default positioning statement

TabVault is a local-first AI bookmark and web memory tool that helps you save pages, understand them quickly, and actually find them again later.

### Primary target user

Programmers and research-heavy users who save lots of useful web pages and later struggle to recover them.

### Core scenarios

1. Save and summarize a useful page.
2. Find a previously saved page again.
3. Reuse saved web knowledge during active work.

### Explicit non-emphasis

This sprint should not center the product story around:
- team collaboration
- enterprise workflows
- deep provider differentiation
- broad AI-platform framing
- feature breadth as the main selling point

## 3. Why a Workstream Structure Is Better Than a Day-by-Day Structure

The original 2-week sprint draft is useful as product direction, but it is not the best execution format for the current repository.

A workstream structure is better because:
- the repo already has the main product surfaces in place
- the likely changes span UI copy, interaction feedback, docs, and validation rather than isolated feature modules
- several parts of the work can be grouped by user outcome instead of by calendar date
- later implementation planning will need exact file and test mappings, which fit better under workstreams than under days

The design still preserves the sprint priorities from the original draft, but it changes the organizing unit from time blocks to execution tracks.

## 4. Workstream Model

The implementation plan should be organized into five workstreams.

### Workstream 1: Positioning and trust copy

**Goal**
Unify how TabVault explains itself and how it establishes trust.

**Why it exists**
The current repo already contains trust-relevant messaging around local-first storage, optional AI setup, and user-managed provider keys, but the productization sprint needs this story to become clearer and more consistent across surfaces.

**Primary files**
- `README.md`
- `src/lib/i18n/messages.ts`
- `src/options.tsx`
- `src/popup.tsx`
- `src/components/provider-settings-form.tsx`

**Expected outcomes**
- one stable product statement
- consistent user-facing terminology
- clear trust statements about local-first behavior, user-managed API keys, and optional AI setup
- less engineering-heavy copy in user-facing entry points

### Workstream 2: First-run onboarding clarity

**Goal**
Make the first-use path understandable without a live explanation.

**Why it exists**
The sprint is trying to optimize the install -> configure -> save -> find-again loop. The current product likely already supports the loop functionally, but the user may still get stuck on what to do next.

**Primary files**
- `src/popup.tsx`
- `src/sidepanel.tsx`
- `src/options.tsx`
- `src/features/dashboard/dashboard-shell.tsx`
- `src/features/dashboard/dashboard-results-list.tsx`
- `src/features/dashboard/dashboard-reading-pane.tsx`
- `src/lib/i18n/messages.ts`

**Expected outcomes**
- clearer first configuration path
- clearer no-AI-configured state
- stronger save success feedback
- clearer empty states and next-step prompts
- clearer division of responsibility between popup, sidepanel, and dashboard

### Workstream 3: Save -> understand -> find-again loop quality

**Goal**
Increase the visible value of the core product loop.

**Why it exists**
The strongest product promise is not just saving pages but helping users recover and reuse them later. This workstream focuses on making the loop feel useful immediately and reliable later.

**Primary files**
- `src/features/bookmarks/save-current-page.ts`
- `src/features/ai/analyze-bookmark.ts`
- `src/features/bookmarks/search-bookmarks.ts`
- `src/features/hybrid-retrieval/retrieve-hybrid-results.ts`
- `src/features/dashboard/dashboard-shell.tsx`
- related UI rendering files used by popup, sidepanel, and dashboard

**Expected outcomes**
- stronger immediate post-save value
- more scannable summary/tags/metadata presentation
- clearer find-again entry points
- stronger confidence that saved content is reusable later

### Workstream 4: Demo and release assets

**Goal**
Make TabVault independently explainable and consistently demoable.

**Why it exists**
Productization requires materials that work even when the author is not present. The sprint needs a compact explanation layer, a stable demo path, and a repeatable release-readiness view.

**Primary files and sources**
- `README.md`
- `docs/manual-testing.md`
- `docs/qa-checklist.md`
- `design/popup-unsync.html`
- `design/popup-sync.html`
- `design/sidepanel.html`
- `design/settings.html`
- `design/dashboard.html`
- `assets/icon.png`

**Expected outcomes**
- a stable 2-minute demo flow
- improved README or equivalent explainer content
- a screenshot/GIF capture checklist
- a smaller set of release-ready visual proof points

### Workstream 5: Seed-user validation operations

**Goal**
Prepare a lightweight but real external validation process.

**Why it exists**
The sprint should end with external learning, not just internal polish. This workstream turns the productization effort into a validation-ready package.

**Primary files**
- `docs/manual-testing.md`
- `docs/qa-checklist.md`
- new validation-oriented docs under `docs/plans/` or `docs/`
- optionally `README.md` if feedback/reporting guidance is added there

**Expected outcomes**
- seed-user profile definitions
- guided user test flow
- feedback questionnaire
- feedback logging template
- pricing hypothesis note for validation only, not payment implementation

## 5. Execution Principles

The later implementation plan should explicitly follow these principles:
- prefer editing existing files over adding new surfaces
- do not expand into new product modules unless required for the core loop
- use TDD where behavior changes are covered by automated tests
- keep steps small and commit-friendly
- favor product clarity over feature breadth
- favor believable messaging over ambitious positioning
- treat docs, copy, tests, and UI feedback as first-class sprint work

## 6. Suggested Execution Order

Even though the plan will be organized by workstream, the recommended execution order is:

1. Positioning and trust copy
2. First-run onboarding clarity
3. Save -> understand -> find-again loop quality
4. Demo and release assets
5. Seed-user validation operations

### Rationale

This order works because:
- messaging and trust framing should be fixed before polishing onboarding
- onboarding should be clarified before optimizing the demo and release story
- the core value loop should be strong before producing external-facing materials
- release assets should exist before structured external validation begins

## 7. Repo-Aware Testing and Verification Model

The later implementation plan should map each workstream to existing verification paths.

### Existing automated test areas
- Popup: `tests/ui/popup-state.test.tsx`, `tests/ui/popup-quick-entry.test.tsx`
- Options/settings: `tests/ui/options-load-state.test.tsx`, `tests/ui/options-save-state.test.tsx`, `tests/ui/options.test.tsx`, `tests/ui/options-architecture-sections.test.tsx`, `tests/ui/knowledge-settings-panel.test.tsx`
- Sidepanel: `tests/ui/sidepanel.test.tsx`, `tests/ui/sidepanel-ghostreader.test.tsx`
- Dashboard: `tests/ui/dashboard-shell.test.tsx`, `tests/ui/dashboard-repository-load.test.tsx`, `tests/ui/dashboard-data.test.tsx`

### Existing repo-level verification commands
- `npm exec vitest run`
- `npm run typecheck`
- `npm run build`

### Existing manual verification docs
- `docs/manual-testing.md`
- `docs/qa-checklist.md`

The implementation plan should require each workstream to specify:
- the exact targeted test files
- the minimum relevant commands to run
- the manual validation path when UI behavior changes
- the expected user-visible outcome after the change

## 8. Definition of Done for the Combined Plan

The future implementation plan should be considered successful if it drives the repo toward the following state:
- a new user can understand what TabVault is in one sentence
- a new user can reach the install -> configure -> save -> find-again path without confusion
- saving a page creates visible value quickly
- trust language around local-first behavior and user-managed keys is easy to find
- the product can be demoed in a short, repeatable flow
- the docs and QA materials are sufficient to support first external validation

## 9. Handoff Requirement

This design is not the implementation plan itself.

The next step should be a dedicated implementation plan document that:
- keeps the workstream structure
- converts each workstream into bite-sized tasks
- lists exact files, tests, commands, and manual checks
- stays tightly scoped to productization rather than feature expansion
