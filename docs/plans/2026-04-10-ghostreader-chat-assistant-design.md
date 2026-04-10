# Ghostreader Chat Assistant Design

Date: 2026-04-10
Status: Approved

## Summary

Evolve Ghostreader from a last-turn Q&A surface into a chat-style assistant backed by the bookmark knowledge base. The UI should preserve full multi-turn history, keep session boundaries visible, and still carry useful context across sessions through lightweight automatic memory.

## Problem

Ghostreader already persists session messages, but the sidepanel currently restores and renders only the latest snapshot rather than the full transcript. In practice this makes a second question appear to replace the first one, so Ghostreader feels like a single-turn answer card instead of a conversational assistant.

Relevant current behavior:
- `src/sidepanel.tsx` centers the view around `submittedGhostreaderQuery`, `ghostreaderResults`, `ghostreaderActionCards`, and `ghostreaderAnswerBlock`
- `src/features/ghostreader-session/ghostreader-session-view.ts` returns only the latest user query and latest assistant answer snapshot
- `src/features/ghostreader-session/ghostreader-session-reducer.ts` already persists a bounded `messages` array per session

## Goals

- Preserve complete multi-turn conversation history inside a session
- Make Ghostreader feel like a standard chat assistant rather than a single-turn answer surface
- Keep bookmark knowledge-base retrieval active on every turn
- Keep visible session boundaries in the UI
- Allow new sessions to inherit recent useful context automatically so the assistant feels continuous across sessions
- Preserve old sessions so the user can reopen and review the full transcript

## Non-goals

- No removal of the session concept
- No cross-session transcript merging into one endless visible thread
- No unlimited prompt packing of all historical messages
- No fully autonomous long-term memory system beyond recent conversation summary and related bookmark context

## Recommended Approach

Use the existing Ghostreader session model as the persistence backbone, but change the UI and view model from “latest snapshot” to “message transcript”.

1. Render the current session from `session.messages` instead of from a single derived snapshot
2. Treat each submit as a new chat turn: append one user message, then one assistant message
3. Attach retrieval metadata to assistant turns so citations and supporting bookmarks remain tied to the turn that produced them
4. Keep sessions separate in the UI, but when a new session starts, inject lightweight inherited memory from recent sessions
5. Use recent raw turns plus compressed older context when constructing prompt context so the assistant remains coherent without runaway prompt growth

## Architecture and State Model

Ghostreader should move from a “current answer block” state model to a “chat transcript” state model.

### Current model
The sidepanel primarily derives Ghostreader UI from single-turn state:
- `submittedGhostreaderQuery`
- `submittedGhostreaderMode`
- `ghostreaderResults`
- `ghostreaderActionCards`
- `ghostreaderAnswerBlock`

### New model
The primary source of truth becomes the active session transcript:
- `GhostreaderSession.messages` is the canonical visible history
- derived state exists only for the currently rendering turn or for convenience
- assistant turns carry the retrieval evidence for that turn
- session-level memory continues to hold working-set and follow-up summaries

This preserves the existing storage model while changing what the UI considers authoritative.

## UI and Component Design

### Main conversation area
The sidepanel body should become a chat transcript area:
- user message bubbles
- assistant message bubbles
- per-assistant-turn citations / supporting bookmarks / action controls
- welcome card only when there are no messages yet

Once a user starts chatting, Ghostreader should remain in transcript mode instead of swapping the whole body to a latest-answer card.

### Composer
Keep the current bottom composer interaction:
- text input remains persistent
- Enter submits
- submit button remains at the bottom

### Session controls
Keep session controls visible:
- new session starts a fresh visible thread
- continue session restores the full prior transcript, not only the last turn

## Data Flow

For each submitted question:

1. User enters a question in the composer
2. Append a `user` message to the active session immediately
3. Build retrieval/generation context from:
   - current user query
   - recent turns from the current session
   - current session working set bookmark ids
   - inherited cross-session memory summary
   - current page context
   - local bookmark corpus
4. Run retrieval and answer generation
5. Append an `assistant` message for the result
6. Persist session updates

Each assistant turn should retain enough metadata to explain the answer later:
- referenced bookmark ids
- retrieval summary
- citations
- supporting results and actions

## Cross-session Continuity

The UI should continue to show sessions as separate threads, but Ghostreader should feel like a longer-lived assistant.

### Behavior when starting a new session
A new session should:
- start with an empty visible transcript
- automatically inherit a lightweight continuation context from recent sessions

### Inherited memory should include
- recent topic summary
- recently referenced bookmark ids
- stable recent intent/context hints

### Inherited memory should exclude
- raw full transcript from old sessions
- failed turns
- temporary noise and irrelevant short exchanges

This keeps the interface clean while preserving conversational continuity.

## Memory and Context Boundaries

To prevent context pollution, prompt construction should be layered:

- recent raw turns: highest priority
- older session content: compressed summary only
- working set bookmark ids: retrieval hints
- cross-session memory: lightweight continuation anchor only

Ghostreader should not blindly stuff every prior message into every prompt. It should prefer recency, relevance, and referenced bookmarks.

## Error Handling

If retrieval or answer generation fails for a turn:
- keep the submitted user message in the transcript
- append an assistant-style error message for that turn
- do not clear earlier messages
- do not overwrite earlier answers
- do not feed failed turns into cross-session inherited memory

This ensures conversation history remains stable even when a single turn fails.

## Key File Changes

### `src/sidepanel.tsx`
- Replace latest-snapshot rendering with transcript rendering
- Restore whole-session conversation state instead of only the last visible turn
- Move turn rendering and session restoration toward a message-list model
- Use inherited memory when creating a new session

### `src/features/ghostreader-session/ghostreader-session-view.ts`
- Replace the current last-turn snapshot helper with transcript-oriented view helpers
- Support full-history restoration and derived recent-turn context

### `src/features/ghostreader-session/ghostreader-session-types.ts`
- Extend assistant-turn metadata if needed so each response can carry its own citations and retrieval context cleanly
- Add or refine session-level inherited-memory structures

### `src/features/ghostreader-session/ghostreader-session-reducer.ts`
- Keep append behavior centered on full transcript growth
- Support any needed session-memory summary updates after successful turns

### `src/features/hybrid-retrieval/ghostreader.ts`
- Accept richer conversational context built from recent turns, summaries, and bookmark working set

### `src/features/dashboard/dashboard-ask-box.tsx`
- Mirror the sidepanel continuity rules so dashboard and sidepanel Ghostreader behavior stay aligned

## Testing Strategy

### UI tests
Update `tests/ui/sidepanel-ghostreader.test.tsx` to cover:
- asking two or more questions preserves all prior turns in the DOM
- starting a new session clears visible transcript but not inherited continuation context
- continuing an older session restores the full transcript
- failures append an error turn without wiping prior history

### Session/view-model tests
Update `tests/ghostreader-session/` to cover:
- transcript-oriented session view helpers
- inherited memory construction from recent sessions
- exclusion of failed turns from inherited memory
- trimming rules that do not break visible conversation restoration

### Retrieval/prompt-context tests
Update relevant Ghostreader retrieval tests to confirm:
- current query still drives retrieval
- recent turns and inherited memory are included appropriately
- bookmark references remain attached to the correct turn

## Acceptance Criteria

The feature is correct when all of the following are true:

- Asking three consecutive Ghostreader questions preserves the earlier two in the visible transcript
- Ghostreader looks and behaves like a chat stream rather than a single replaced answer card
- Each turn still uses the bookmark knowledge base and current page context when relevant
- Starting a new session shows a fresh thread but still benefits from recent useful context automatically
- Returning to an older session restores the full multi-turn transcript
- A failed turn does not erase prior conversation history

## Risks and Mitigations

### Risk: context pollution across sessions
Mitigation:
- inherit summaries and bookmark references, not full raw old transcripts
- exclude failed and noisy turns

### Risk: prompt growth
Mitigation:
- keep recent raw turns bounded
- summarize older context instead of replaying it verbatim

### Risk: sidepanel/dashboard divergence
Mitigation:
- mirror the continuity and inherited-memory rules in both surfaces

## Expected Outcome

After this change, Ghostreader should feel like a bookmark-aware chat assistant:
- it keeps visible conversation history
- it answers with retrieval-backed context each turn
- it preserves session structure
- it carries useful recent context across sessions without feeling like a single fragile answer card
