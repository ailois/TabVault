# TabVault 2-Week Productization Sprint Plan

> For Hermes: This is a productization/documentation plan, not a feature-expansion plan. Keep scope tight. Optimize for external validation, not for adding more capabilities.

Date: 2026-04-13
Status: Draft for execution
Owner: TabVault

## Goal

Use the next 14 days to turn TabVault from an already-capable extension into a version that can be clearly explained, smoothly demoed, installed by first users, and validated with real external feedback.

## Sprint Theme

This sprint is not about doing more.
It is about turning what already exists into a product that other people can immediately understand and willingly try.

## Current Stage Assumption

TabVault is already beyond a zero-to-one MVP bootstrap phase. The current codebase and docs indicate that it already has:
- runnable browser extension structure
- local bookmark save flow
- search
- AI analysis
- settings management
- multiple provider support
- sidepanel/dashboard-related UI
- trial/license-related code paths
- tests and basic documentation

Because of that, this sprint should focus on productization, onboarding clarity, user-perceived value, release materials, and first-user validation.

## 14-Day Sprint Outcome

At the end of this sprint, TabVault should have:
1. a clear product positioning statement
2. a smoother first-use experience
3. a stable short demo flow
4. minimum release materials
5. a concrete first-user validation plan

## Success Criteria

This sprint is successful if:
- a new user can install, configure, save, and find a bookmark again within 5 minutes
- the user can explain what TabVault is for in one sentence
- the first-save experience produces visible value quickly
- you can demo the product without hitting confusing UX dead-ends
- you are ready to test with 10-20 seed users

## Explicit Non-Goals

Do not let this sprint expand into:
- major new feature modules
- broad platform expansion
- deep provider-specific enhancements
- ambitious cloud/backend architecture changes
- complex pricing/payment implementation
- polishing every screen equally

## Recommended Core Positioning for This Sprint

Use this as the default positioning statement unless replaced deliberately:

TabVault is a local-first AI bookmark and web memory tool that helps heavy information collectors save, understand, and find previously viewed web content.

## Working Target User

For this sprint, default to a narrow target user instead of a broad one.

Recommended first target:
- programmers and research-heavy users who save lots of web content and often struggle to find it later

## Core User Loop to Optimize

This sprint should optimize one loop above all others:

install extension
-> open welcome/settings flow
-> configure one provider key
-> save current page
-> see summary/tags/content value
-> search and find it again later

If a task does not improve this loop, it should be deprioritized.

## Sprint Structure

Week 1: product clarity and first-use experience
Week 2: release readiness and external validation preparation

---

## Day 1 - Lock the single main value proposition

### Objective
Reduce product narrative sprawl and choose one core story for this sprint.

### Tasks
1. Write 3 candidate positioning lines.
2. Pick exactly 1 as the sprint-level product statement.
3. Define the 1-2 target user types for this version.
4. List exactly 3 core user scenarios.
5. List what TabVault will explicitly not emphasize during this sprint.

### Suggested deliverables
- one-sentence positioning statement
- target user note
- 3 core scenarios
- “not emphasized in this sprint” note

### Example positioning
TabVault is a local-first AI bookmark and web memory tool that helps you save pages, understand them quickly, and actually find them again later.

### Exit criteria
You can explain TabVault in 30 seconds without drifting into too many unrelated product stories.

---

## Day 2 - Define and inspect the first-time user path

### Objective
Compress the first-run experience into the shortest possible path to visible value.

### Tasks
1. Write the ideal first-use flow step by step.
2. Walk through the current product from a new user perspective.
3. Identify where the user may ask “what do I do next?”
4. Check whether no-key and key-configured states are both understandable.
5. Identify whether the “save” action produces a visible success state.
6. Identify whether the “find it again” step is obvious.

### Questions to answer
- Does the user know how to start?
- If AI is not configured, is that state clearly explained?
- Is successful save obvious?
- Is successful AI analysis obvious?
- Is there a clear next action after saving?

### Exit criteria
You have a written first-use journey and a concrete list of friction points.

---

## Day 3 - Create a first-use issue list and prioritize it

### Objective
Turn vague discomfort into a ranked problem list.

### Tasks
1. Run the complete first-use journey 3 times.
2. Capture problems under four categories:
   - blocking
   - understanding
   - trust
   - polish
3. Record severity, affected step, and estimated fix effort.
4. Choose the top 5 issues that must be fixed in this sprint.

### Suggested issue table columns
- issue
- category
- severity
- affected flow step
- probable cause
- fix cost
- must-fix-this-sprint (yes/no)

### Example issue categories
Blocking:
- user cannot tell where to configure provider settings

Understanding:
- popup/sidepanel/dashboard responsibilities feel unclear

Trust:
- users do not know where data is stored

Polish:
- wording sounds internal/technical instead of user-facing

### Exit criteria
You have a ranked list of the 5 highest-priority UX/productization issues.

---

## Day 4 - Fix the top first-use blockers

### Objective
Remove the most dangerous friction in the first-use experience.

### Priority order
P0:
- unclear onboarding path
- unclear settings path
- weak success feedback after save
- weak error feedback after analysis failure
- unclear search/find-again path

P1:
- weak empty states
- overcomplicated provider choice framing
- inconsistent naming across screens
- dense or intimidating UI copy

### Tasks
1. Fix the top 5 ranked issues from Day 3.
2. Prefer clarity improvements over feature additions.
3. Improve empty states, call-to-action hierarchy, and error/success feedback.
4. Re-test the full core loop after each major fix.

### Exit criteria
A first-time user no longer gets lost in the main flow.

---

## Day 5 - Strengthen the immediate value after saving

### Objective
Make the saved result feel useful, not merely stored.

### Tasks
1. Review how summary is displayed after save/analyze.
2. Review whether tags are helpful or noisy.
3. Review whether source/title/time/context are easy to scan.
4. Review whether reading/review panes make saved content feel reusable.
5. Improve whichever result view most strongly affects user-perceived value.

### Value hierarchy to optimize
1. readable summary
2. useful tags
3. clear title/source metadata
4. fast search result recognition
5. confidence that the content can be used again later

### Exit criteria
A user can save one page and quickly feel “this is worth keeping installed.”

---

## Day 6 - Unify product copy and trust language

### Objective
Make the product sound coherent, clear, and trustworthy.

### Areas to review
- popup title
- sidepanel title
- dashboard title
- button labels
- empty states
- error states
- settings explanations
- privacy/local-first language
- API key explanation

### Copy principles
- avoid internal engineering terms
- prefer user outcomes over implementation details
- use the same name for the same thing everywhere
- explain local-first behavior simply
- explain that AI setup is optional for basic save usage

### Three trust statements that should be easy to find
1. Your data is stored locally by default.
2. Your API keys are user-managed.
3. You can save pages even before setting up AI.

### Exit criteria
The product uses one coherent voice and clearly communicates its trust model.

---

## Day 7 - Week 1 review and gate

### Objective
Decide whether product clarity and first-use quality are good enough to move into release preparation.

### Review questions
1. Can TabVault be explained in 30 seconds?
2. Does the install -> configure -> save -> find-again flow feel smooth?
3. Does the product show value immediately after first save?
4. Is the trust model understandable?
5. Are popup/sidepanel/dashboard roles clear enough for this stage?

### Decision rule
If any of the first 3 answers is still “not really,” continue improving product clarity before investing heavily in release assets.

### Exit criteria
You formally decide whether Week 2 can focus on release readiness.

---

## Day 8 - Create a standard 2-minute demo script

### Objective
Produce a short, repeatable demo that shows the product’s value without depending on improvisation.

### Tasks
1. Choose 1-2 high-information demo pages.
2. Define a fixed save flow.
3. Define how to show the result state.
4. Define one search/find-again moment.
5. Add one short explanation of local-first + user-managed key setup.
6. Rehearse until the flow is smooth and stable.

### Recommended demo sequence
1. open a content-rich article/page
2. save it into TabVault
3. show summary/tags/content capture
4. switch to search/dashboard
5. search and retrieve it
6. briefly explain local-first and user-supplied provider keys

### Exit criteria
You can reliably demo TabVault in under 2 minutes.

---

## Day 9 - Create the minimum release explanation page

### Objective
Make sure the product can explain itself even when you are not present.

### Acceptable formats
- stronger GitHub README
- lightweight landing page
- one simple release/explainer page

### Minimum contents
1. one-line headline
2. who it is for
3. 3 core value points
4. screenshots or GIFs
5. quick setup/use explanation
6. short FAQ

### FAQ topics to cover
- where is data stored?
- do I need an API key?
- what providers/models are supported?
- who is this product for?

### Exit criteria
Someone can understand what TabVault is and why it matters without needing a live explanation from you.

---

## Day 10 - Produce screenshots and GIF proof

### Objective
Create visual proof that the product exists and is understandable.

### Tasks
1. Capture 3-5 strong screenshots.
2. Capture 1-2 key GIF flows.
3. Standardize visual order for sharing.
4. Prefer user-value views over engineering/config-heavy screens.

### Best scenes to capture
- save current page entry point
- saved result with summary/tags
- search/find-again view
- settings page showing local-first + provider-key logic

### Exit criteria
You have a compact set of visuals ready for README, landing page, or outreach.

---

## Day 11 - Design the first seed-user test plan

### Objective
Prepare a lightweight but real user validation process.

### Tasks
1. Define 10-15 likely seed users.
2. Group them by profile.
3. Decide how to share the product with them.
4. Write a short guided test flow.
5. Write a feedback questionnaire.
6. Decide how feedback will be logged and reviewed.

### Recommended seed-user mix
- browser-extension users
- heavy bookmark/research users
- programmers or AI-adjacent knowledge workers

### Suggested feedback questions
1. What do you think this product is for?
2. Which step felt easiest?
3. Which step felt most confusing?
4. In what scenario would you keep using it?
5. Why would you stop using it?
6. If it were paid, what pricing model would feel acceptable?

### Exit criteria
You are ready to send TabVault to real people and collect structured feedback.

---

## Day 12 - Write a pricing hypothesis, not a full monetization system

### Objective
Clarify monetization assumptions without derailing the sprint into payment implementation.

### Tasks
1. Write 2-3 candidate pricing directions.
2. Match each to current product maturity.
3. Choose one provisional pricing hypothesis.
4. Write down what must be true before real charging can begin.

### Candidate directions
A. Free + Pro
- free for basic save/search
- paid for stronger AI/retrieval workflows

B. Early one-time purchase
- validate willingness to pay from early supporters

C. Private beta / waitlist / paid interest collection
- validate intent before building full payment plumbing

### Recommended default
Focus on pricing hypothesis and willingness-to-pay validation before spending major energy on a production payment system.

### Exit criteria
You have a simple monetization hypothesis that supports interviews and feedback collection.

---

## Day 13 - Run a release-readiness review

### Objective
Do one complete pre-validation check across product, messaging, assets, and testing readiness.

### Review checklist
Product:
- one-sentence positioning is stable
- 3 core value points are stable
- naming is consistent

Experience:
- installation works
- settings are understandable
- save works smoothly
- find-again flow is obvious
- error states are understandable

Assets:
- README or explainer page is sufficient
- screenshots/GIFs are ready
- FAQ covers main concerns

Validation:
- demo script is stable
- feedback form is ready
- seed-user list exists

### Exit criteria
You have a version that is coherent enough to put in front of first external users.

---

## Day 14 - Start the first real external validation round

### Objective
Stop polishing in isolation and get the product in front of actual target users.

### Tasks
1. Send the product to 5-10 target users.
2. Include the shortest possible explanation.
3. Ask them to follow the core flow.
4. Collect structured feedback.
5. Preserve exact user wording wherever possible.
6. Summarize the main patterns immediately after the first batch.

### What to watch for most
- whether users instantly understand the product
- whether they can complete the core loop
- whether they feel real value after first use
- whether they want to keep it installed
- whether they would recommend it or test again

### Exit criteria
You have real external signals instead of only internal opinions.

---

## Daily Standup Questions

At the end of each sprint day, answer these 5 questions:
1. Did today make the product easier to understand?
2. Did today make the core path smoother?
3. Did today increase visible value after saving?
4. Did today move TabVault closer to real external validation?
5. Did today improve something that affects whether a user would keep using it?

If the answer is “no” to most of these, the day’s work likely drifted away from sprint intent.

## Primary Metrics for This Sprint

Do not optimize for broad growth metrics yet.
Track first-validation metrics instead:

1. First-run completion rate
- can users install, configure, save, and find again?

2. Immediate value perception
- after first save, does the user feel something useful happened?

3. Find-again success
- can users retrieve previously saved content?

4. Product understanding accuracy
- can users accurately explain what TabVault is?

5. Continued-use intent
- would the user keep it installed and test again?

## Top 10 Risks to Prioritize

1. users do not know how to start
2. settings feel intimidating or confusing
3. provider key setup is too long or unclear
4. successful save feedback is weak
5. analysis failure feedback is weak
6. saved-result value feels underwhelming
7. search/find-again path is not obvious
8. popup/sidepanel/dashboard roles feel muddled
9. copy sounds too engineering-heavy
10. local-first trust story is too hidden or weak

## If Time Gets Tight: Only Do These 5 Things

If the full sprint cannot be executed, keep these:
1. lock one positioning statement
2. improve first configuration and first save flow
3. strengthen visible value after saving
4. create README/landing + screenshots/GIFs
5. run the first seed-user validation round

## Recommended Priority Order

Highest priority:
1. positioning clarity
2. first-use experience
3. visible value after save

Second priority:
4. copy consistency
5. README/landing page
6. screenshots/GIFs

Third priority:
7. pricing hypothesis
8. user-testing workflow
9. feedback synthesis

## Expected Sprint Deliverables

By the end of this sprint, the repository/workstream should contain or produce:
- one clear product positioning statement
- one stable first-use path
- one standard demo script
- one minimum explainer/README or landing page
- screenshots/GIFs
- one seed-user validation plan
- one pricing hypothesis note
- one first-round feedback summary template or process

## One-Line Summary

This sprint is about making TabVault legible, demoable, and testable with real people.
Not about building more features.
