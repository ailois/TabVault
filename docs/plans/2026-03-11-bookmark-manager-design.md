# TabVault Bookmark Manager & Import Sync Design

## Overview
This document outlines the design for migrating TabVault's primary bookmark management interface from a constrained popup to a persistent Chrome Side Panel. It also introduces the ability to import native Chrome bookmarks and perform bulk AI analysis in the background.

## Goals
1. Provide a full-page, persistent Web UI for managing bookmarks via the Chrome Side Panel API.
2. Implement a one-click import feature for native Chrome bookmarks.
3. Enable robust bulk AI analysis using a background Service Worker.
4. Maintain local-first data storage (IndexedDB) with future extensibility for centralized sync.

## Architecture & Data Flow

### 1. The Side Panel (`src/sidepanel.tsx`)
The Side Panel serves as the new "control center" for TabVault.
- **Permissions**: Requires `"sidePanel"` and `"bookmarks"` in `manifest.json`.
- **UI Layout**: A standard list view with a sticky header.
  - **Header**: Global search bar, status/progress banners, and primary actions (Import Chrome Bookmarks, Analyze Pending).
  - **Content**: Reuses the existing `<BookmarkList>` and `<BookmarkCard>` components.
- **State Management**:
  - Fetches bookmarks from IndexedDB on load.
  - Listens to background messages (via `chrome.runtime.onMessage`) for real-time progress updates during bulk imports/analysis.

### 2. The Background Service Worker (`src/background.ts`)
Handles long-running tasks that shouldn't be interrupted if the user closes the Side Panel or Popup.
- **Message Listener**: Intercepts `IMPORT_BOOKMARKS` and `ANALYZE_ALL` commands from the Side Panel.
- **Bulk Import**:
  - Uses `chrome.bookmarks.getTree()` to fetch all native bookmarks.
  - Flattens the tree, filters out folders, and checks against IndexedDB to prevent duplicates.
  - Saves new entries with status `"saved"`.
- **Asynchronous AI Analysis Queue**:
  - Iterates through pending bookmarks sequentially.
  - **Content Extraction**: Since `activeTab` cannot be used in the background for arbitrary URLs, the worker uses a simple `fetch(url)` to retrieve the raw HTML and extracts plain text. This is a deliberate tradeoff for bulk, silent processing.
  - **AI Processing**: Instantiates the selected AI provider (OpenAI, Claude, Gemini) and calls `.analyze()`.
  - **Storage Update**: Updates the bookmark record in IndexedDB (`"analyzing"` -> `"done"` or `"error"`).
  - **Progress Reporting**: Broadcasts `ANALYSIS_PROGRESS` messages back to the Side Panel.

## Component Design (UI)

- **Sticky Header**: Contains the search input and a new filter group (All, Analyzed, Pending, Errors).
- **Progress Banner**: A dedicated notification area showing current background activity (e.g., "Importing...", "Analyzing 5/150...").
- **BookmarkList & BookmarkCard**: Fully reused from the Popup implementation to ensure visual consistency. The cards will naturally expand to fit the wider Side Panel layout.

## Trade-offs & Considerations
- **Content Extraction Quality**: Fetching raw HTML in the background bypasses client-side rendering (SPA) and authentication walls. While this may result in lower-quality summaries for certain sites, it is the most reliable and unobtrusive method for bulk processing hundreds of imported bookmarks.
- **Local-First Sync**: Syncing is currently deferred. The focus remains on robust local storage and AI analysis. Future iterations can introduce a backend sync service using the solid foundation of the background worker and IndexedDB.

## Implementation Steps
1. **Scaffold Side Panel**: Update manifest, create `src/sidepanel.tsx`, and render the basic list and search UI.
2. **Implement Native Import**: Add the import button and logic to fetch `chrome.bookmarks`.
3. **Setup Background Worker**: Create `src/background.ts` and establish message passing.
4. **Build the Analysis Queue**: Implement the sequential `fetch` and AI analysis logic in the background.
5. **Wire Progress UI**: Connect the Side Panel's progress banner to background messages.
