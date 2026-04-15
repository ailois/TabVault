# Pricing Hypothesis

> **Purpose:** Document candidate pricing directions for TabVault, state the current working hypothesis, and define the product readiness gates that must be satisfied before charging real users. No billing code or payment plumbing is required by this document.

---

## Candidate pricing directions

### Direction A: Free forever, with a usage-based AI tier

**Model:** The core save/tag/find-again loop is permanently free. An optional "AI boost" subscription unlocks higher analysis throughput (batch analysis, automatic re-analysis, priority processing) for users who route analysis through a TabVault-managed key.

**Rationale:** Reduces signup friction. Users who bring their own key never need to pay. Users who want convenience without managing a provider key have a reason to pay. Converts the "bring your own key" expectation into a monetizable option rather than an obstacle.

**Risks:** Most power users already have keys. If the convenience premium is small, conversion rates stay low.

---

### Direction B: One-time purchase / perpetual license

**Model:** A single payment (e.g. $15–$29) for the full extension. No subscription. Buyers get all current features plus updates for one major version. Future major versions require a new purchase or upgrade discount.

**Rationale:** Aligns with how privacy-oriented or developer-first users prefer to pay. No ongoing billing relationship, which reinforces the local-first trust story. Simple to reason about.

**Risks:** Limits MRR and makes sustaining development harder. Harder to fund ongoing AI infrastructure if needed. Requires clear versioning discipline.

---

### Direction C: Freemium with a Pro subscription

**Model:** Free tier covers saving, basic search, and manual analysis (up to N pages/month). Pro ($5–$8/month or $40–$50/year) unlocks unlimited batch analysis, advanced tag management, sidepanel library search history, and any future collaborative or sync features.

**Rationale:** Subscription is the conventional SaaS model. Allows revenue to scale with engagement. The freemium line can be tuned based on what seed users actually use.

**Risks:** "Free with limits" models frustrate users who feel the limit is arbitrary. Must define the free tier carefully so it delivers real value without giving away the product entirely.

---

## Current hypothesis

**Direction C (freemium / Pro subscription)** is the starting hypothesis.

**Why:** The save → analyze → find-again loop has recurring value — users who find it useful return weekly or more. A subscription converts that recurrence into revenue. The free tier can be generous enough to demonstrate real value before asking for payment, while the Pro tier can align with the most engaged users' actual needs.

**Price point to test first:** $6/month or $48/year.

**The free tier line should be:**
- Unlimited manual saves
- Up to 25 AI-analyzed pages per month (reset monthly)
- Full search and sidepanel access

**Pro unlocks:**
- Unlimited AI analysis (using user's own key OR TabVault-managed key)
- Batch analysis
- Export and backup
- Any future sync or multi-device features

---

## What must be true before charging real users

Do not introduce pricing or a paywall until all of the following gates are met:

### Gate 1: The core loop works reliably
- Save → AI analysis → find-again works without intervention in at least 90% of test sessions
- No open P0 bugs in the bookmark save or retrieval path
- `npm run typecheck` and `npm run build` pass clean

### Gate 2: First-run onboarding is understandable
- At least 5 of 7 seed-user participants complete the first save without abandoning
- Provider setup friction has been resolved or has a clear workaround documented
- Options page trust copy is in place (local storage, user-managed keys)

### Gate 3: Willingness to pay is confirmed with real users
- At least 3 of the first 7–10 seed-user participants express a willingness to pay ≥ $5/month
- No participant expresses strong negative reaction to the concept of paying for this
- At least one participant articulates a concrete use case where they would pay today

### Gate 4: Pricing mechanics are legally and technically minimal
- No payment plumbing required before testing — use Stripe Checkout or a waitlist/pre-order model for the first real transactions
- Privacy policy covers what is and isn't stored for free vs. Pro users
- Refund policy is defined before any real payments are taken

### Gate 5: The marketing surface is ready
- README communicates the product clearly (per WS4 / Task 9)
- Screenshots and demo flow exist (per WS4 / Task 11)
- A landing page or extension store listing is draft-ready

---

## Interview prompts for pricing discovery

Use these during seed-user sessions to probe pricing intuitions without anchoring:

1. "What would make this worth paying for — what would have to be true?"
2. "If this were a paid product, would you expect to pay once or monthly?"
3. "What's the most you'd pay per month for something that solved your bookmark problem?"
4. "What free tools do you currently use for saving pages? How does that affect your expectations here?"
5. "If we offered a free tier with limits, what would feel like a fair limit to you?"

---

## Revision notes

Update this document after each round of seed-user sessions. Record:
- which pricing direction got the strongest positive signal
- whether willingness to pay shifted after product changes
- any gates that were unblocked since the last revision
