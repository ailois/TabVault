# Ghostreader Follow-up Memory Design

Date: 2026-04-10
Status: Approved

## Summary

Improve Ghostreader so a second question can continue the first one reliably without forcing every follow-up to contain explicit reference words. The design keeps the current UI, preserves the existing session storage approach, and strengthens conversation continuity by combining structured follow-up memory, richer recent-turn prompt context, and broader reference resolution.

## Problem

The current implementation persists session messages, but the next request only sends a weak summary back to the model:
- flat recent message text instead of paired user/assistant turns
- a lightweight intent summary
- limited reference phrase handling
- runtime-only recent result IDs

Because of that, Ghostreader often behaves as if it forgot the previous turn even though the session was technically saved.

## Goals

- Preserve continuity across 2-3 recent turns
- Support natural follow-up questions such as “这个”, “刚才那个”, “第一个结果”, and short continuations like “为什么？”
- Persist enough structured memory that refresh/reopen does not lose the last referenced result
- Keep sidepanel and dashboard behavior aligned
- Avoid UI redesign or large architectural changes

## Non-goals

- No UI redesign
- No LLM-based follow-up classifier
- No cross-session smart merging
- No long-history prompt packing beyond the latest 2-3 turns

## Recommended Approach

Use a hybrid approach:
1. Add lightweight structured follow-up memory to each Ghostreader session
2. Pass the most recent 2-3 user/assistant turns to the model as structured context
3. Expand reference resolution to support explicit references, ordinal references, and short follow-up questions
4. When no bookmark IDs exist, continue semantic context without inventing bookmark references

## Data Model

Extend `GhostreaderSession` with `followUpMemory`.

Suggested fields:
- `lastQuery: string`
- `lastAnswer: string`
- `lastReferencedBookmarkIds: string[]`
- `lastQueryMode: GhostreaderQueryMode | null`
- `updatedAt: string | null`

This field complements `messages` instead of replacing it. `messages` remains the source of conversation history, while `followUpMemory` stores the most recent structured continuation anchor.

## Follow-up Detection Rules

### 1. Explicit reference
If the query contains clear reference phrases, treat it as a follow-up bound to a bookmark target.

Examples:
- 这个
- 那个
- 刚才那个
- 上面那个
- 这个书签
- 上一个结果
- 这些书签

### 2. Ordinal reference
If the query refers to ranked results by order, resolve against the most recent result set.

Examples:
- 第一个结果
- 第一条
- 第二个
- 最后一个

### 3. Short follow-up
If the query is short and looks like a continuation rather than a new search topic, treat it as a follow-up.

Examples:
- 为什么？
- 具体呢？
- 展开说说
- 值得收藏吗？
- 有什么价值？

Behavior:
- If `followUpMemory.lastReferencedBookmarkIds` exists, continue both object and dialogue context
- If it does not exist, continue dialogue semantics only

### 4. New question
If none of the above conditions apply, handle it as a new question.

## Prompt Context Design

Replace flat recent messages with structured recent turns.

Prompt session context should include:
- `intentSummary`
- `recentTurns` containing the latest 2-3 user/assistant pairs
- `followUpMemory`
- `recentAddedBookmarks`
- any bookmark IDs resolved for the current query

This allows the model to see:
- what the user asked previously
- how Ghostreader answered
- which bookmark targets were involved
- whether the current query is likely a continuation

## No-object Follow-up Behavior

If the last turn did not resolve bookmark IDs but the next query is a short follow-up:
- continue the semantic thread
- do not invent bookmark references
- rely on recent turns, last query, last answer, and intent summary

This avoids both false resets and false object binding.

## Files to Change

### `src/features/ghostreader-session/ghostreader-session-types.ts`
- Add `followUpMemory` type and default initialization

### `src/features/ghostreader-session/ghostreader-session-reducer.ts`
- Add helper to update `followUpMemory`
- Call it after normal assistant responses and fallback responses

### `src/features/ghostreader-session/ghostreader-reference-resolution.ts`
- Expand explicit reference markers
- Add ordinal reference handling
- Add short follow-up detection rules
- Use `followUpMemory` as a continuation source

### `src/features/hybrid-retrieval/ghostreader.ts`
- Change session context shape to include recent paired turns and follow-up memory
- Build a clearer session block for prompts

### `src/sidepanel.tsx`
- Build recent 2-3 turns instead of flat recent message text
- Apply short follow-up continuation rules
- Update `followUpMemory` after responses

### `src/features/dashboard/dashboard-ask-box.tsx`
- Mirror the sidepanel behavior so dashboard and sidepanel stay aligned

### `src/features/ghostreader-session/ghostreader-session-view.ts`
- Continue restoring the latest visible turn
- Prefer `followUpMemory.lastReferencedBookmarkIds` when restoring recent reference context

## Testing Plan

### Unit tests
Update or add tests for:
- explicit references
- ordinal references
- short follow-ups with and without bookmark IDs
- follow-up memory persistence and overwrite behavior
- backward-compatible session loading
- prompt construction with recent paired turns

### Manual verification
Run these scenarios:
1. Find one bookmark, then ask “为什么值得收藏？”
2. Find multiple results, then ask “第一个结果展开说说”
3. Find a result, refresh/reopen, then ask “这个再总结一下”
4. Ask a clearly new topic after a prior result and confirm it does not bind to the old result

## Risks and Mitigations

### Risk: false continuation
Mitigation:
- only auto-continue for explicit references, ordinal references, or short follow-up patterns
- otherwise treat as a new question

### Risk: prompt bloat
Mitigation:
- limit recent turns to 2-3 pairs
- keep `followUpMemory` lightweight

### Risk: state divergence between dashboard and sidepanel
Mitigation:
- apply the same continuation rules and follow-up memory update pattern in both entry points

## Expected Outcome

After this change, Ghostreader should feel like a real short-session conversation system:
- it remembers the last meaningful result
- it handles natural follow-up phrasing
- it survives refresh/reopen better
- it still avoids aggressively binding unrelated new questions to old results
