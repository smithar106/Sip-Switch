# Sip Switch Onboarding Gap Analysis vs Research Rubric

**Date:** 2026-07-02
**App:** Sip Switch (Expo SDK 53, React Native)
**Rubric:** `docs/onboarding_research.md`

---

## Actual Flow Trace (first-time user)

| Step | Screen | File | What happens |
|------|--------|------|-------------|
| 1 | Splash | `app/index.tsx:23-27` | 🍋 emoji, 100ms, no interaction |
| 2 | Welcome | `app/onboarding/welcome.tsx` | Emotional pain headline, 4 value rows, fixed CTA "Find my drink →" |
| 3 | Quiz Q1 | `app/onboarding/quiz.tsx:21` | "What do you usually drink?" 4 options, auto-advance 180ms |
| 4 | Quiz Q2 | `app/onboarding/quiz.tsx:29` | "When do you most want a drink?" 4 options |
| 5 | Quiz Q3 | `app/onboarding/quiz.tsx:41` | "What flavour notes do you love?" 2x2 grid |
| 6 | Quiz Q4 | `app/onboarding/quiz.tsx:52` | "What does the perfect drink feel like?" 2x2 grid |
| 7 | Quiz Q5 | `app/onboarding/quiz.tsx:64` | "What are you looking for right now?" 2x2 grid |
| 8 | Archetype Reveal | `app/onboarding/archetype-reveal.tsx` | Archetype name + emoji + description + 1 unlocked drink + 2 locked + CTA |
| 9 | Paywall | `app/paywall.tsx` | 3-tier (weekly/monthly/annual), annual default, 7-day trial, hard |
| 10 | Feed | `app/(tabs)/feed.tsx` | Mock drink cards with love/skip actions |

---

## Flow-Step Scoring (9-step rubric)

### Step 1: Open with an identity/goal question that can't fail
**Score:** 🟡 PARTIAL

The welcome screen (`welcome.tsx:19-21`) leads with an emotional pain statement ("You've probably ordered a sparkling water..."), which is good outcome framing, but it's a passive read, not an interactive first step. The first *active* input is the quiz Q1 "What do you usually drink?" (`quiz.tsx:21-27`), which IS interactive and has 4 low-stakes options. However, there's no "I haven't decided" escape hatch (Noom pattern) and no stated "why we ask" per question.

### Step 2: Collect a meaningful taste profile (5-10 questions)
**Score:** ✅ PRESENT

5 questions (`quiz.tsx:19-71`), each mapped to scoring dimensions (`archetypes.ts:84-105`). Progress bar present (`quiz.tsx:135-137`). Questions cover drink type, occasion, flavour, texture, goal — all relevant. Good.

### Step 3: Deliver a personalized result in first session, seconds-to-minute
**Score:** 🟡 PARTIAL

The archetype reveal (`archetype-reveal.tsx`) shows the user's profile name, emoji, description — this IS personalized. But the **drink recommendations are mostly locked** — only 1 unlocked example + 2 locked blur cards. The unlocked card shows a real brand name (`archetype.examples[0]`), which is partial value. The user cannot interact with this recommendation or see it in context of other drinks. The "aha" is more "here's your label" than "here's a drink picked FOR you that you can taste/explore." Compare to Adapty's survey-plus-lesson that beat survey-only by +78% ARPU — this app delivers personalization but not an interactive quick-win.

### Step 4: Reframe the competition visually
**Score:** ❌ MISSING

No visual "before/after" or competitive reframing exists. The welcome headline implies the pain but never visualizes it. The archetype reveal focuses on the positive label, never contrasts "before Sip Switch" vs "now."

### Step 5: Place the paywall right after the aha
**Score:** ✅ PRESENT

Paywall (`paywall.tsx`) follows the archetype reveal (`archetype-reveal.tsx:66-69`) with no intermediate screens. The CTA "Unlock my full match list →" directly gates the continuation. This is correct placement.

### Step 6: Paywall framing — short, benefit headline, price-anchored
**Score:** 🟡 PARTIAL

**Good:** Short paywall (1 scrollView), annual default anchored as "$2.49/mo" (`paywall.tsx:32`), benefit list (`paywall.tsx:39-43`), explicit trial timeline ("Free for 7 days, then $29.99/yr", `paywall.tsx:33`).

**Missing:** No App Store reviews/social proof, no trial toggle (opt-in vs forced), no "SAVE X%" anchor, no use of onboarding answers in the paywall headline. The headline "Make the switch for good" (`paywall.tsx:145`) is benefit-adjacent but generic — it doesn't reference the archetype the user just unlocked.

### Step 7: Trial structure — 5-9 days, consider reverse trial
**Score:** 🟡 PARTIAL

Annual plan has a 7-day trial (`paywall.tsx:32`), which falls in the 5-9 day sweet spot. **No reverse trial implemented** — this is a hard paywall with no free exploration before gating. Given the endowment potential of the taste profile (principles #8/#9), reverse trial could be a major lever.

### Step 8: Post-conversion retention — compound taste profile
**Score:** 🟡 PARTIAL

The taste profile DOES compound — ratings feed into `tasteStore.scores` (`tasteStore.ts:62-68`) and the Taste Meter displays evolving scores (`profile.tsx:43-86`). However, there's no "your saved items" tab anymore (removed in commit `c3ee0f3`), and the taste profile's compounding value isn't communicated to the user — they'd need to find the Profile tab and notice the meter rising. No in-context feature education.

### Step 9: Instrument Day 0
**Score:** ❌ MISSING

No analytics instrumentation beyond `console.log` stubs in the old Next.js version. No PostHog events tracked (despite `posthog-react-native` being in `package.json`). No conversion funnel tracking, no time-to-aha measurement, no A/B infra. The `/api/submit` route from Next.js is gone; `saveQuizResult` in `supabase.ts:30-43` exists but is never called.

---

## 10 Principles Scoring

### #1: Win Day 0 — first session decides convert AND stay
**Score:** 🟡 PARTIAL

The welcome + quiz + reveal flow delivers value within minutes. But the **paywall comes before any interactive use** of a recommendation — the user sees their archetype but never taps, explores, or tastes a recommendation before being asked to pay. The "unlocked" drink card is a static label, not an experience.

### #2: Personalization upfront — measured conversion lever
**Score:** 🟡 PARTIAL

Personalization exists (5 questions → archetype). But the Adapty benchmark (+8.5% trial starts, +17% paying, +22% ARPU) was driven by personalization PLUS a "customizing your experience" loading screen that reinforced the value of the data. This app has no equivalent — the quiz auto-advances silently without any "processing your taste..." bridging screen.

### #3: Sell the outcome, not features
**Score:** ✅ PRESENT

Welcome screen (`welcome.tsx:19-21`): "You've probably ordered a sparkling water at the bar and felt completely left out." This is pure outcome framing — the pain of social exclusion, not a feature list. The CTA "Find my drink →" is benefit-first. Good.

### #4: Paywall AFTER a value/aha moment, not cold open
**Score:** ✅ PRESENT

Paywall follows archetype reveal + 1 free match. Not a cold open. The user has invested 5 answers and seen a personalized result before hitting the gate.

### #5: Length governed by value-per-step — long can win
**Score:** ✅ PRESENT

5 quiz questions is concise. Every step feeds the archetype calculation. No filler screens. The value density is high — each question maps to a scoring dimension (`archetypes.ts:84-105`).

### #6: Hard paywall — converts ~5x better short-term
**Score:** ✅ PRESENT

Hard paywall implemented (`paywall.tsx`), no freemium path. `presentation: 'fullScreenModal'` with `gestureEnabled: false` (`_layout.tsx:41-47`) ensures it can't be dismissed.

### #7: Longer trials convert better — 17-32 day window
**Score:** 🟡 PARTIAL

7-day trial on annual (`paywall.tsx:32`) is in the 5-9 day sweet spot but below the 17-32 day optimum. Weekly and monthly plans have no trial. The 7-day is closer to Duolingo's experimental velocity rationale than to the conversion-optimal length.

### #8: Reverse trial — loss aversion works
**Score:** ❌ MISSING

No reverse trial. The hard paywall gates everything. The endowment potential (taste profile built by user) is never leveraged — the user builds their profile, then MUST pay before experiencing any recommendations in context.

### #9: IKEA effect — manufactured ownership through investment
**Score:** 🟡 PARTIAL

The taste profile IS user-built (5 answers + ongoing ratings), which creates endowment. But this isn't communicated — the user can't see their profile "filling in" during onboarding. The Taste Meter only appears in Profile tab, which the user hasn't seen at this point. The compounding value isn't visible until post-paywall.

### #10: Clarity beats persuasion at paywall
**Score:** ✅ PRESENT

The paywall is short, clearly structured, with explicit billing terms (`paywall.tsx:33`) and a cancellation note. The 🔔 reminder text (`paywall.tsx:202`) builds trust. However, the CTA text conflates trial with purchase — "Start my 14-day free trial" in `paywall.tsx:149` (note: the 14-day text in `ctaTxt` doesn't match the 7-day plan — this is an inconsistency bug at `paywall.tsx:149`).

---

## TOP 5 GAPS ranked by conversion leverage

### GAP 1 (Principle #8, #2): No reverse trial — biggest missed lever
**Leverage:** 0.4% → 4.5% freemium conversion (11x improvement) cited in SOSA 2026.  
**Current state:** Hard paywall, no free exploration. User builds profile then hits a wall.  
**Fix:** After archetype reveal, let the user explore the feed for 7 days with a countdown banner ("3 days left in your trial"). Don't ask for payment until Day 7 or a premium feature tap (save, unlimited swaps). The taste profile they've built IS the endowment they won't want to lose.

### GAP 2 (Principle #3, #6): Paywall doesn't reference the user's archetype
**Leverage:** Paywall headline framing drives 5-20% lift per Superwall.  
**Current state:** Paywall says "Make the switch for good" — generic, never mentions the archetype the user just unlocked ("The Botanical Seeker").  
**Fix:** Dynamic paywall headline: "Your Botanical Seeker recommendations are ready — unlock the full list." Use the stored archetype name from `useSessionStore.archetypeId`. Bonus: show the unlocked drink card on the paywall itself as social proof of personalization.

### GAP 3 (Principle #2): No "processing your taste" bridging screen
**Leverage:** Adapty's personalization + loading screen drove +27% paying conversions (US).  
**Current state:** Quiz auto-advances silently to archetype reveal with no transition.  
**Fix:** Insert a 1.5-2s bridging screen between Q5 and reveal: 🍋 emoji, "Building your taste profile..." with a subtle progress animation. Reinforces that the quiz answers mattered and something was computed for them.

### GAP 4 (Principle #9, #8): Taste profile invisible during onboarding
**Leverage:** IKEA effect — visible, meaningful customization drives retention.  
**Current state:** The taste meter only exists in the Profile tab, which the user can't access during onboarding. The user never sees a visualization of their taste "taking shape."  
**Fix:** Show a mini taste meter (2-3 dimensions) on the archetype reveal screen, below the name, with a "see your full taste meter after you unlock" teaser. The half-glass rendering is already built (`profile.tsx:97`) — reuse it.

### GAP 5 (Principle #1, #10): No Day-0 instrumentation
**Leverage:** Cal AI ran 123 experiments → +31% trial-to-paid, 3x revenue. Can't optimize what you don't measure.  
**Current state:** Zero analytics. PostHog in `package.json` but never initialized. No conversion funnel tracking.  
**Fix:** Initialize PostHog in `_layout.tsx`. Track: `onboarding_started`, `quiz_completed`, `archetype_revealed`, `paywall_viewed`, `trial_started`, `trial_converted`. Pre-register the metric (D30 ARPU), hash-assign A/B groups, run ≥14 days.

---

## What Sip Switch already does WELL

| Strength | Evidence |
|----------|----------|
| **Emotional pain-led welcome** | `welcome.tsx:19-21` — "felt completely left out" is textbook outcome framing |
| **Quiz is tight and purposeful** | 5 questions, every answer maps to a scoring dimension, progress bar, auto-advance |
| **Paywall AFTER personalization** | Archetype reveal → 1 free drink → then paywall — correct placement per principle #4/#5 |
| **Locked preview creates want** | 1 unlocked + 2 locked drink cards (`archetype-reveal.tsx:40-62`) shows value before asking for payment |
| **Hard paywall integrity** | `gestureEnabled: false` prevents swipe-dismiss; 4s timeout prevents infinite spinner |
| **Annual anchoring** | "$2.49/mo · 7 days free" (`paywall.tsx:32`) follows price-anchoring best practice |
| **Taste profile compounds** | `tasteStore.ts` scores accumulate from ratings; half-glass resolution on meter |
| **Clarity over pressure** | Explicit billing terms, cancellation note, reminder text — no dark patterns |
