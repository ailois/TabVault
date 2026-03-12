# Design Doc: Bookmark Folder Sync and Recursive Tree View

**Date**: 2026-03-12
**Status**: Approved
**Topic**: Implement real-time synchronization with Chrome bookmarks and a recursive folder tree UI in the Sidepanel.

## 1. Vision
Transform TabVault from a standalone bookmark manager into a "smart layer" over the user's existing Chrome bookmarks. Users should see their familiar folder structure, and any changes in the browser should reflect instantly in the extension.

## 2. Architecture: Mirror Mode (Scheme A)
We will adopt a **Hybrid Data Source** model:
- **Primary Source**: `chrome.bookmarks` API. This is the source of truth for hierarchy, titles, and URLs.
- **Metadata Store**: IndexedDB. This stores AI-generated content (summaries, tags) and analysis status, keyed by the Chrome Bookmark ID.

### Data Flow
1. **Initial Load**: Sidepanel calls `chrome.bookmarks.getTree()` to get the full hierarchy.
2. **Dynamic Updates**: `background.ts` listens to `chrome.bookmarks.onCreated`, `onRemoved`, `onChanged`, and `onMoved`.
3. **State Sync**: When a change occurs, the background script notifies active UI clients (Sidepanel/Popup) to refresh their views.

## 3. UI/UX Design

### Recursive Tree Component
- **`BookmarkTree`**: The root component that renders the top-level nodes.
- **`FolderNode`**:
    - Displays a folder icon, title, and a toggle (expand/collapse).
    - Remembers its toggle state in `localStorage` or `chrome.storage` (user preference).
    - Recursively renders its children.
- **`BookmarkNode`**:
    - A specialized version of `BookmarkCard`.
    - Compact layout optimized for tree indentation.
    - Shows AI status (e.g., a status dot).

### Search Behavior
- **Search Mode**: When a search query is entered, the tree structure is temporarily hidden and replaced by a **Flat Search Results List**. This ensures users can find items quickly regardless of folder depth, matching the native Chrome behavior.

## 4. Sync & Automation Logic
- **Auto-Analysis**: If "Auto-analyze on save" is enabled, the `onCreated` listener in `background.ts` will automatically trigger the analysis queue for the new bookmark.
- **Garbage Collection**: When `onRemoved` is triggered, the corresponding entry in IndexedDB is deleted to prevent orphaned data.

## 5. Implementation Strategy
1. **Refactor `BookmarkRecord`**: Ensure it can handle Chrome IDs.
2. **Update Background Script**: Implement the event listeners and messaging logic.
3. **Create Tree Components**: Build `BookmarkTree`, `FolderNode`, and `BookmarkNode`.
4. **Update Sidepanel**: Replace the flat list with the tree view and implement search switching.

## 6. Testing Plan
- **Unit Tests**: Test the tree traversal logic and event listener callbacks.
- **Integration Tests**: Verify that creating/deleting a bookmark via Chrome API (mocked) triggers the correct updates in the UI.
- **UI Tests**: Ensure the tree expands/collapses correctly and search transitions are smooth.
