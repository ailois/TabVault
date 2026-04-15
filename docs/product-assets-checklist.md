# Product Assets Checklist

## Purpose

This document provides a standard checklist and guidelines for capturing screenshots and GIFs of TabVault. These assets are essential for the README, Chrome Web Store listing, and product marketing. Following these guidelines ensures consistency, clarity, and professionalism in how TabVault is presented to users.

---

## Required Screenshots

Capture the following scenes to illustrate TabVault's core capabilities.

### 1. Popup — Unsaved State
- **Description:** The first visit to a new page, showing the popup before saving.
- **Key Elements:** The "Save current page" primary action button, the "Not saved" indicator, and sidepanel/options shortcuts.
- **Goal:** Show how easy it is to save a new page.

### 2. Popup — Saved + Analyzed State
- **Description:** The popup state after a page has been saved and AI analysis is complete.
- **Key Elements:** The "In library" indicator, the AI-generated summary snippet, and tags.
- **Goal:** Demonstrate the immediate value of AI extraction and summarization.

### 3. Options — API Key Configuration
- **Description:** The settings page focusing on provider configuration.
- **Key Elements:** First-run guidance for configuring API keys, the default provider selection, and the "Auto-analyze on save" toggle.
- **Goal:** Highlight the "Bring-Your-Own-Key" (BYOK) privacy and local-first approach.

### 4. Sidepanel — Ghostreader Welcome
- **Description:** The initial state of the Ghostreader sidepanel.
- **Key Elements:** Current page context at the top, welcome copy explaining how to use Ghostreader with the local library, and the empty chat input.
- **Goal:** Show the contextual awareness of the assistant.

### 5. Sidepanel — Ghostreader Result
- **Description:** The sidepanel after the user has asked a question.
- **Key Elements:** The user's query, the AI's generated answer, and source citation cards (action cards) linking back to saved bookmarks.
- **Goal:** Prove the power of hybrid retrieval (current page + local library).

### 6. Dashboard — Results List
- **Description:** The main dashboard view showing the user's library.
- **Key Elements:** A mix of analyzed (with summaries/tags) and unanalyzed bookmarks in the list, search bar, and left navigation.
- **Goal:** Show how TabVault acts as a comprehensive knowledge base.

### 7. Dashboard — Reading Pane
- **Description:** The dashboard with a specific bookmark selected.
- **Key Elements:** The bookmark detail view, full AI summary, tags, and original link.
- **Goal:** Illustrate the reading and review experience.

---

## Required GIFs

Short, focused animations to show flow and interaction.

### 1. Save Flow
- **Description:** The end-to-end process of capturing a page.
- **Action Sequence:** Click the TabVault extension icon → click "Save current page" → show the AI analysis loading state → reveal the final summary and tags.
- **Goal:** Show speed and automation.

### 2. Find-Again Flow
- **Description:** Using Ghostreader to retrieve information.
- **Action Sequence:** Open the sidepanel → type a specific query into the chat input → submit → show the result card appearing with the answer and source links.
- **Goal:** Demonstrate the "find it again" core value proposition.

---

## Capture Guidelines

### Naming Convention
Use descriptive, snake_case filenames with versioning.
- **Format:** `[surface]_[state]_[version].[ext]`
- **Examples:**
  - `popup_unsaved_state_v1.png`
  - `sidepanel_ghostreader_result_v2.png`
  - `flow_save_page_v1.gif`

### What NOT to Capture
- ❌ Internal debug views, console logs, or React DevTools.
- ❌ Loading spinners mid-flight (except in GIFs where it shows progression).
- ❌ `localhost` URLs or local file paths in the browser address bar (use realistic web pages like Wikipedia, a blog, or standard news sites).
- ❌ Personal API keys or sensitive real-world data (use dummy keys or blur them if necessary).
- ❌ Cluttered browser chrome (hide other extension icons and bookmarks bars).

### Ordering for README & Web Store
When assembling assets for presentation, use this general narrative order:
1. **The Hook:** `flow_save_page_v1.gif` (Immediate value).
2. **The Output:** `popup_saved_analyzed_v1.png` (What you get).
3. **The Assistant:** `sidepanel_ghostreader_result_v1.png` (How you use it).
4. **The Library:** `dashboard_reading_pane_v1.png` (Where it lives).
5. **The Privacy:** `options_api_configuration_v1.png` (How it works locally).
