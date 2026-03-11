# TabVault UI/UX Redesign Plan

## Context
The goal is to redesign the UI of the TabVault browser extension (Popup, Options, Sidepanel) to be minimalist, modern, and aligned with "AI-Native UI" aesthetics. We will remove heavy borders, shadows, and explicit card boundaries to create a flat, seamless interface that relies on typography, whitespace, and subtle interactive states (like Raycast or Linear).

## Core Design Principles
1. **Unify the Canvas**: Pure white (`#ffffff`) or near-white background across the entire surface to eliminate visual separation.
2. **Eliminate Shadows & Borders**: Remove structural drop shadows (`shadow.medium`, `shadow.soft`). Replace borders with ultra-light dividers or whitespace.
3. **Typography & Hierarchy**: Use font size, weight, and contrast (`slate-900` vs `slate-500` equivalents) for hierarchy.
4. **Interactive States**: Use background color transitions (`#f4f4f5`) on hover to indicate interactivity instead of persistent borders.
5. **Clean Actions**: Make secondary actions (delete/analyze) subtle, low-contrast, or visible only on hover.

## Architecture & Implementation Steps

### 1. Update Design Tokens (`src/ui/design-tokens.ts`)
*   **Colors**:
    *   Set `colors.page`, `colors.surface`, and `colors.surfaceElevated` to `#ffffff`.
    *   Add `colors.surfaceHover` (e.g., `#f4f4f5` or `#f8fafc`).
    *   Soften border colors to `#f1f5f9` or `#e2e8f0`.
*   **Shadows**: Remove `shadow.soft` and `shadow.medium`, or replace them with a single subtle elevation shadow if absolutely necessary.
*   **Radius**: Sharpen corners (e.g., `small: 4px`, `medium: 6px`, `large: 8px`).

### 2. Streamline the Popup (`src/popup.tsx`)
*   **Layout**: Transition to a "Command & Feed" interface.
*   **Search**: Large, borderless search input anchored permanently at the top.
*   **Primary Action**: "Save current page" becomes a full-width, sticky button at the bottom.
*   **Remove Cards**: Strip all container borders (`actionsSectionStyle`).
*   **Feedback**: Integrate status messages (success/error) seamlessly without bordered boxes.

### 3. Flatten the Bookmark Feed (`src/components/bookmark-list.tsx`)
*   **List Items**: Remove borders, border radius, and box shadow from the bookmark cards.
*   **Separation**: Use generous vertical padding and optional subtle 1px bottom borders.
*   **Interactivity**: Add hover state background color (`colors.surfaceHover`).
*   **Actions**: Move "Delete" and "Analyze" actions to the right, using subtle/iconic styles that appear or increase contrast on hover.
*   **Tags**: Remove borders, use a very soft background with slightly smaller, refined typography.

### 4. Clean Up Settings/Options (`src/options.tsx` & `src/components/provider-settings-form.tsx`)
*   **Document Style**: Remove boxed layouts and `sectionCardStyle`. Let content flow vertically with strong typography and whitespace.
*   **Inputs**: Borderless text inputs with soft gray backgrounds (`#f8fafc`). Focus adds subtle outline or slight darkening.
*   **Toggles**: Remove bordered containers around checkboxes/toggles. Align them cleanly next to labels.

### 5. Update the Sidepanel (`src/sidepanel.tsx`)
*   Apply the same continuous layout and borderless styles.
*   Remove bordered cards around the import section.

### 6. Refine Error Banner (`src/components/error-banner.tsx`)
*   Remove harsh borders.
*   Use a soft tinted background (light red) with darker text.

## Testing & Verification
*   Update UI unit tests (e.g., `tests/ui/design-tokens.test.ts`) to match new token values.
*   Run typecheck and standard tests.
*   Manually verify contrast, hover states, and sticky positioning in the Dev environment.