# Seed-User Validation Plan

> **Purpose:** Guide the first batch of real-user testing for TabVault before any wider public release. This document covers who to recruit, how to run a session, what questions to ask, and how to synthesize findings.

---

## Target user profiles

TabVault is built for people who save lots of useful web pages and later struggle to find or reuse them. Prioritize these profiles when recruiting:

| # | Profile | Why they're a good signal |
|---|---------|--------------------------|
| 1 | Software engineer who reads articles/docs while coding | Heavy bookmark use, real retrieval pain, can articulate when "find again" breaks |
| 2 | Academic researcher (grad student, postdoc) | Obsessively saves sources, already annoyed at browser bookmarks |
| 3 | Product manager or designer doing competitive research | Saves inspiration/references constantly, needs to resurface them in documents |
| 4 | Technical writer or documentation author | Curates sources, appreciates structured summaries and tags |
| 5 | Data analyst or quantitative researcher | Saves methodology papers, notebooks, references; bookmark recall is a real bottleneck |
| 6 | Indie developer building a side project | Saves tutorials and SO answers; retrieval matters across multiple coding sessions |
| 7 | Journalist or blogger doing ongoing topic research | Saves many pieces over time, needs topical recall rather than recency-based recall |
| 8 | UX researcher who does desk research | Saves competitor screenshots, user quotes, trend articles |
| 9 | Security researcher or CTF enthusiast | Saves writeups and tool pages; need to find specific steps again later |
| 10 | Law student or paralegal doing case research | Saves statutes, decisions, commentary; recall precision matters |
| 11 | Medical student or clinician reading literature | Saves clinical studies; summary + tags are high-value |
| 12 | Startup founder doing market research | Saves investor commentary, competitor info; needs to recall context in meetings |
| 13 | Freelance consultant preparing reports | Saves many client-relevant sources; retrieval must be fast under deadline |
| 14 | Power user of read-later apps (Pocket, Instapaper) | Direct comparison use case; already values the problem space |
| 15 | Heavy Chrome bookmark user with 200+ bookmarks and known disorganization | High pain, low expectation — ideal for value discovery |

**Avoid for first batch:** users who rarely save pages, users unfamiliar with browser extensions, or users who only read news.

---

## Outreach and share format

Keep the ask short. Suggested outreach message:

> "I'm testing TabVault — a Chrome extension that saves pages locally, summarizes them with AI, and helps you find them again later. Takes 15 minutes. Would you be up for a quick test and feedback chat? You can bring your own OpenAI/Anthropic/Gemini key or I'll share one for the session."

**Channels to try:**
- Direct message to people you know in target profiles above
- Relevant Discord/Slack communities (e.g. developer Discords, research writing communities)
- Twitter/X or Mastodon DM to people who tweet about bookmarking pain
- Post in Indie Hackers or relevant subreddits (r/macapps, r/productivity, r/datahoarder)

**Session format:** 15–20 minutes, async screen recording + written feedback is acceptable. Live session with screen share preferred for the first 5–7 participants.

---

## Guided first-use flow

Walk the user through this path in order. Observe and note friction without helping unless they get completely stuck.

### Step 1: Install
- Load the extension from the provided build or Chrome Web Store link
- Ask: "Did you know what to do next without any help?"

### Step 2: Options / provider setup
- Ask them to open the Options page and configure one AI provider
- Observe: Do they understand what "provider" means? Do they know where to find an API key?
- Do not explain unless they are stuck for more than 2 minutes

### Step 3: First save
- Ask them to visit any page they find interesting right now
- Ask them to save it using the popup
- Observe: Is the action obvious? Does the success state make sense?

### Step 4: AI analysis
- If they configured a provider: observe whether they understand what analysis does and when it finishes
- If they did not configure: observe whether the popup makes it clear saving still worked

### Step 5: Sidepanel
- Ask them to open the sidepanel on the same page or another
- Observe: Does the welcome state explain what to do? Do they understand they can ask about saved pages?

### Step 6: Dashboard
- Ask them to open the dashboard
- Observe: Is the empty or populated state meaningful? Do they try to search?

### Step 7: Find-again
- After saving 2–3 pages, ask: "Can you find the page about [topic] you saved earlier?"
- Observe: Do they use search? Do they look at tags? Do they find it?

---

## Questions to ask (feedback questionnaire)

Ask these after the session ends. Written or verbal.

### Comprehension
1. In your own words, what does TabVault do?
2. What did you think your data was stored when you saved a page? (Prompt: their browser, the cloud, somewhere else?)
3. Did you understand what the AI analysis step was doing?

### Value
4. When, if ever, would you realistically use this in your day-to-day work?
5. What problem does this solve for you — if any?
6. What feature would you miss most if it were removed?

### Friction
7. Where did you get stuck or confused?
8. Was there any moment where you wanted to stop and didn't?
9. What would need to change for you to use this every week?

### Trust and willingness to pay
10. Would you be comfortable using this extension on pages with sensitive content? Why or why not?
11. If this were a paid product, what would make it worth paying for?
12. What would you expect to pay per month for something like this?

### Open
13. What surprised you most — positive or negative?
14. Who else do you know who might have this problem?

---

## Response logging template

Create one row per participant in a shared spreadsheet (Notion table, Airtable, Google Sheets — pick one before the first session).

| Field | Notes |
|-------|-------|
| Participant ID | P01, P02, … |
| Profile type | Match to the 15 profiles above |
| Date | YYYY-MM-DD |
| Session format | Live / async |
| Completed flow? | Yes / partial / abandoned |
| Step where friction was observed | e.g. "Step 2: provider setup" |
| Verbatim quote (most memorable) | Copy exact words |
| Value rating (1–5) | Self-reported after session |
| Confusion points | Free text, bullet list |
| Willingness to pay | Their rough number or "no" |
| Would they refer it | Yes / maybe / no |
| Top requested change | One sentence |

Save raw session recordings or notes alongside the row.

---

## Success and failure signals

### Green signals (keep going)
- User completes Steps 1–7 with one or fewer points of friction requiring intervention
- User articulates a concrete personal use case without prompting
- User expresses surprise that bookmarks are stored locally ("I didn't expect that — that's actually reassuring")
- User recalls a saved page during Step 7 without needing help
- Willingness-to-pay estimate ≥ $5/month from ≥ 3 participants

### Yellow signals (investigate before investing)
- User completes the flow but cannot articulate what TabVault is for after
- Provider setup takes more than 3 minutes for most participants
- Most users skip sidepanel or dashboard entirely without prompting
- Search finds nothing useful — retrieval quality issue

### Red signals (prioritize before outreach expansion)
- Majority of users abandon before completing Step 4
- Multiple participants confused about where their data lives
- No one can articulate a use case for find-again after the session
- Willingness-to-pay is consistently $0 or "free only" across all profiles tested

---

## Synthesis instructions (after first batch of 5–7 sessions)

1. **Friction heatmap**: Tally which step caused friction most often. Any step that blocked ≥ 3 of 7 participants is a priority fix before the next batch.
2. **Quote harvest**: Extract 3–5 strongest verbatim quotes — positive and negative. These become copy/positioning inputs.
3. **Value hypothesis check**: Did the majority of users understand the save → find-again loop without being told? If not, the onboarding copy needs rework.
4. **Willingness-to-pay distribution**: Plot responses. Determine the median and spread. If the range is wide, look for profile patterns.
5. **Next batch decision**: After fixing friction blockers, recruit 5–10 more participants. Expand to profile types that performed best in the first batch.
6. **Document decisions**: Write a one-paragraph summary of what changed and why after each batch, and save it alongside this file.
