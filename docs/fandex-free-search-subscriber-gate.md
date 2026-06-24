# FANDEX Free Search And Subscriber Research Gate

Status: static preview. No login, payment, subscriber auth, API, Supabase, or AI
backend is implemented.

## Why Free Search Preview Exists

SNS can create interest, but visitors need a fast website experience before they
join a waitlist. The free search preview gives them a low-friction way to check
an artist signal after seeing FANDEX content on Instagram, X, LinkedIn, or other
channels.

The goal is to make the product structure clear:

1. Free users can check only a limited artist overview.
2. Subscriber research unlocks category-level interpretation and comparison.
3. Early Access validates whether this boundary is commercially useful.

## Free Preview Scope

The `/search` route is a local-data preview. It can show:

1. Artist name.
2. Ticker or id.
3. Agency or group metadata.
4. Preview FANDEX score.
5. Issue tone preview.
6. Subscriber-only research notice.
7. Sample report link.
8. Subscriber research CTA.

It should not expose category-level detailed scores, signal breakdowns, AI
interpretation, full issue reasoning, brand-fit analysis, artist comparison,
weekly reports, source-level detail, or long summaries. It does not call an API
and does not perform a live search against external sources.

## Paid Category Gate Scope

The `/search` route now shows a static paid category gate below the limited
preview results.

Free or preview categories:

1. Overview.
2. Basic FANDEX Score.
3. Issue Tone Preview.

Locked subscriber categories:

1. Music / Album Signal.
2. News / Issue Signal.
3. SNS / Fandom Signal.
4. Brand-fit Signal.
5. Comeback / Activity Signal.
6. Artist Comparison.
7. AI Interpretation.
8. Weekly Research Report.

These cards are not tied to real entitlement logic yet. They clarify what will
be available after subscriber validation and link users to `/research` or the
Early Access waitlist.

## Lock UI Strategy

The lock UI should feel like a premium research preview rather than a checkout
wall. CTAs should point to Early Access or the waitlist, not payment.

Current CTA targets:

1. `Explore Subscriber Research` -> `/research`
2. `See Research Plans` -> `/research`
3. `Join Early Access` -> `/#waitlist-form`
3. `View Sample Report` -> `/sample-report`

The `/research` route is the subscriber research explanation destination. It
previews Free Preview, FANDEX Plus, and FANDEX Pro feature boundaries without
implementing pricing, payment, login, or entitlement checks.

## Not Implemented

This step does not implement:

1. Login.
2. Payment.
3. Toss Payments.
4. Subscriber entitlement checks.
5. Supabase user or subscription tables.
6. AI interpretation backend.
7. Actual Naver API.
8. External search API.
9. Server-side submission flow.
10. Real category unlock state.

## Next TODO

1. Connect waitlist storage.
2. Design subscriber auth.
3. Validate payment and pricing.
4. Define paid category access model.
5. Design AI interpretation backend.
6. Add subscriber research report generation.
