# Sidepanel Modernization & Browser Detection Design

## Overview
This document outlines the design for enriching the TabVault Sidepanel. It transitions from a simple "Import" page to a comprehensive bookmark management interface with browser-specific detection and integrated search.

## Goals
1. **Enrich Content**: Add search, recent bookmarks list, and management actions (edit/delete).
2. **Browser Intelligence**: Automatically detect the current browser to personalize the import experience.
3. **UI Modernization**: Align the sidepanel with the flat, minimalist design language of the rest of the app.

## Proposed Design

### 1. Browser Detection Utility
- **Implementation**: A new utility `getBrowserName()` in `src/lib/utils/browser.ts`.
- **Logic**: Uses `navigator.userAgent` to detect:
    - **Chrome**: `Chrome` (but not `Edg`, `OPR`, or `Brave` features)
    - **Edge**: `Edg`
    - **Brave**: `brave` in `navigator` or specific userAgent hints
    - **Opera**: `OPR`
    - **Firefox**: `Firefox`
- **Fallback**: Returns "Browser" if detection is ambiguous.

### 2. Sidepanel Structure
The sidepanel (`src/sidepanel.tsx`) will be reorganized into three main functional areas:

#### A. Sticky Search Header
- A search input at the very top.
- Reuses the `SearchInput` component if available, or implements a borderless minimalist input.
- Real-time filtering of the bookmark list below.

#### B. Bookmark Feed (Main Content)
- Displays a list of bookmarks, sorted by "Recent" by default.
- **Reused Components**: `<BookmarkList>` and `<BookmarkCard>`.
- **Management Actions**:
    - **Inline Edit**: Triggered from the card to update title/tags.
    - **Quick Delete**: One-click removal with a "Deleted" undo state or simple confirmation.

#### C. Personalised Import (Footer/Bottom)
- Located at the bottom or in a dedicated "Settings/Import" section.
- **Dynamic Text**: "Import [Detected Browser] Bookmarks".
- **Action**: Retains the existing background message trigger for `IMPORT_BOOKMARKS`.

### 3. Data Flow
- **Hooks**: Uses `useBookmarks` and `useSettings` to stay in sync with IndexedDB and Chrome Storage.
- **Background Sync**: Listens for updates from the background worker (if active) to refresh the list during/after imports.

## Success Criteria
- [ ] Users see "Import Chrome Bookmarks" on Chrome and "Import Edge Bookmarks" on Edge.
- [ ] Users can search and find bookmarks directly in the sidepanel.
- [ ] Users can delete or edit a bookmark from the sidepanel and see the change reflected in the popup.
- [ ] The layout feels native to the sidepanel (vertical, scrollable, clean).
