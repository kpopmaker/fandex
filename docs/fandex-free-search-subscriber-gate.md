# FANDEX Free Search And Subscriber Research Gate

Status: static preview. No login, payment, subscriber auth, API, Supabase, or AI
backend is implemented.

## Why Free Search Preview Exists

SNS can create interest, but visitors need a fast website experience before they
join a waitlist. The free search preview gives them a low-friction way to check
an artist signal after seeing FANDEX content on Instagram, X, LinkedIn, or other
channels.

The goal is to make the product structure clear:

1. Free users can check basic artist signal context.
2. Subscriber research unlocks deeper interpretation and comparison.
3. Early Access validates whether this boundary is commercially useful.

## Free Preview Scope

The `/search` route is a local-data preview. It can show:

1. Artist name.
2. Ticker or id.
3. Agency or group metadata.
4. Preview FANDEX score.
5. Issue tone preview.
6. Sample signal summary.
7. Sample report link.
8. Early Access research CTA.

It does not call an API and does not perform a live search against external
sources.

## Subscriber Research Scope

Subscriber research is represented by static locked cards:

1. AI Interpretation.
2. Full Artist Research Brief.
3. Brand-fit Analysis.
4. Issue Risk Analysis.
5. Artist Comparison Report.
6. Weekly FANDEX Report.
7. Watchlist & Signal Commentary.

These cards are not tied to real entitlement logic yet. They clarify what will
be available after subscriber validation.

## Lock UI Strategy

The lock UI should feel like a premium research preview rather than a checkout
wall. CTAs should point to Early Access or the waitlist, not payment.

Current CTA targets:

1. `Unlock subscriber research` -> `/#waitlist-form`
2. `Learn about subscriber research` -> `/research`
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

## Next TODO

1. Expand search result data coverage.
2. Add lock UI click tracking after analytics policy is approved.
3. Connect waitlist storage.
4. Design subscriber auth.
5. Validate payment and pricing.
6. Design AI interpretation backend.
7. Add subscriber research report generation.
