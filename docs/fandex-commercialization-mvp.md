# FANDEX Commercialization MVP

Status: SNS-led research funnel positioning draft.

## Korean-First Consumer Positioning

FANDEX now defaults the core public experience to Korean so the service reads
as a domestic consumer-facing K-pop and entertainment research product. English
is available through a lightweight KO/EN toggle, but KO is the default language
for first-view positioning, free search explanation, paid category gate copy,
sample report framing, Early Access CTA, and disclaimers.

The toggle is an MVP UI layer only. It does not add `/ko` or `/en` routes,
middleware, external i18n packages, or locale-specific SEO handling.

## Commercial Positioning

FANDEX should be positioned as a K-pop and entertainment issue research
platform. It verifies current issues with public signal data and interprets them
from a marketing perspective. It should not be presented as a real-time K-pop
stock service, financial index product, or investment tool.

The commercial wedge is now SNS-led, while SNS channel operation and content
production are handled manually by the operator:

1. Publish FANDEX Signal content on Instagram, X, and LinkedIn.
2. Drive interested readers through profile links to the website.
3. Let visitors use limited free search and inspect sample reports.
4. Show locked paid categories below the free preview.
5. Send high-intent readers to `/research` for the subscriber category unlock
   explanation.
6. Convert subscriber research interest into the Early Access waitlist.
7. Validate subscriber-only research, AI interpretation, artist comparison, and
   weekly report products.

## Free Public Area

The public preview should expose only lightweight surfaces:

1. Artist overview.
2. Basic FANDEX Score.
3. Issue tone preview.
4. Sample report CTA.

This area should help visitors understand FANDEX signal coverage without
requiring login, payment, database writes, or a live waitlist flow.

## Early Access Report Area

The paid beta concept is a subscriber research package:

1. Music / Album Signal.
2. News / Issue Signal.
3. SNS / Fandom Signal.
4. Brand-fit Signal.
5. Artist Comparison.
6. AI Interpretation.
7. Weekly Research Report.
8. Pro memos such as campaign angle, issue risk, and portfolio briefs.

The report should validate whether users want recurring entertainment research
before a full subscription product is built.

## SNS-Led Research Funnel

`docs/fandex-sns-research-funnel.md` defines the current funnel strategy:

```text
SNS content
  -> profile link
  -> FANDEX limited free search
  -> locked paid categories
  -> sample report
  -> subscriber research plan
  -> waitlist
  -> subscriber research validation
```

Commercialization stages:

1. Reposition site for SNS-led research funnel.
2. Add free search preview.
3. Add locked paid category gate UI.
4. Add subscriber research plan preview.
5. Build a Content Hub or SNS Signal archive.
6. Connect waitlist storage.
7. Produce SNS content batches.
8. Validate the first paid report.

## Implemented Landing CTA

`app/page.tsx` now includes a `FANDEX Early Access` section with:

1. Product positioning as an SNS-led K-pop and entertainment research platform.
2. Free public preview card.
3. Subscriber research card.
4. Temporary CTA anchors:
   - Request Early Access
   - View Sample Report
   - Join FANDEX Beta
5. Research disclaimer clarifying that FANDEX is not financial advice or an
   investment product.

The CTA anchors are placeholders only and do not submit data.

## Free Search Preview And Subscriber Gate

`app/search/page.tsx` adds a static `/search` route for free artist signal
preview. It uses local project data only and does not call external APIs.

The current website role is now:

```text
SNS content managed by the operator
  -> website limited free search
  -> locked paid categories
  -> sample report
  -> subscriber research plan
  -> waitlist
```

Implemented free preview:

1. Artist name and ticker/id.
2. Minimal artist metadata.
3. Preview FANDEX score.
4. Issue tone preview.
5. Subscriber-only research notice.
6. Links to sample report and subscriber research.

Implemented paid category gate preview:

1. Overview.
2. Basic FANDEX Score.
3. Issue Tone Preview.
4. Music / Album Signal.
5. News / Issue Signal.
6. SNS / Fandom Signal.
7. Brand-fit Signal.
8. Comeback / Activity Signal.
9. Artist Comparison.
10. AI Interpretation.
11. Weekly Research Report.

`docs/fandex-free-search-subscriber-gate.md` defines the free versus subscriber
research boundary. No login, payment, entitlement check, Supabase storage, API,
or AI backend is implemented.

## Subscriber Research Plan Preview

`app/research/page.tsx` adds a static `/research` route that explains the
planned subscriber research product.

Current site flow:

```text
SNS content
  -> /search free preview
  -> /sample-report
  -> /research subscriber research preview
  -> /#waitlist-form
```

The page previews Free Preview, FANDEX Plus, and FANDEX Pro feature boundaries
as category unlock boundaries without pricing, payment, login, subscriber
authorization, AI backend, or report generation backend.
`docs/fandex-subscriber-research-plan.md` documents the planned package
structure.

## Sample Report Page

`app/sample-report/page.tsx` adds a static sample report preview at
`/sample-report`.

The page exists to show what a FANDEX Early Access report could look like before
building payment, login, database storage, email automation, or live data
collection. It uses static preview values and frames the product as a K-pop
entertainment marketing insight report, not an investment report.

The current conversion flow is:

```text
Home
  -> Limited Free Search
  -> Locked Paid Categories
  -> Sample Report
  -> Paid Research Categories
  -> Early Access waitlist
```

The home CTA `View Sample Report` now links to `/sample-report`. The remaining
request/beta CTAs stay as temporary anchors until a real request flow is
approved.

The sample report is framed as a sample of subscriber research output. Free
users only see a limited preview, and full category breakdown is reserved for
subscriber research.

## Waitlist Form UI

`app/page.tsx` now includes a static waitlist preview card at
`/#waitlist-form`.

The waitlist UI includes:

1. Name.
2. Email.
3. Role / use case.
4. Interested report type.
5. A `type="button"` preview CTA.

The current CTA flow is:

```text
Home Early Access
  -> Request Early Access / Join FANDEX Beta
  -> #waitlist-form

Sample Report
  -> Request Early Access
  -> Home #waitlist-form
```

The form is intentionally static. It has no submit handler, no `action`, no
storage, no email automation, no API route, and no Supabase connection.

## Waitlist Data Model Draft

`app/data/v4/commercialization/waitlistDataModel.ts` and
`docs/fandex-waitlist-data-model.md` define the draft storage model for future
Early Access requests.

This step adds pure TypeScript types, constants, normalization helpers,
validation warnings, record draft creation, and a local shape check. It does not
connect the waitlist UI to the data model.

Current commercialization MVP flow:

```text
Home Early Access section
  -> Free Search Preview
  -> Subscriber Research Preview
  -> Waitlist preview form
  -> Sample Report
  -> Waitlist data model draft
```

Still not implemented:

1. Supabase connection.
2. Supabase migration.
3. API route.
4. Server action.
5. Real form submission.
6. Email notification.
7. UI wiring between the preview form and the data model.
8. Subscriber auth or payment logic.
9. AI interpretation backend.
10. Subscriber report generation backend.

## Beta Launch Checklist

`docs/fandex-beta-launch-checklist.md` is the final pre-launch checklist before
using FANDEX as an SNS profile link destination.

FANDEX is now close to a beta-site structure for SNS traffic:

1. Home explains the SNS-led research funnel.
2. `/search` provides a free artist signal preview.
3. `/sample-report` demonstrates the report product.
4. `/research` explains subscriber research value.
5. `/#waitlist-form` previews Early Access demand capture.
6. Core pages default to Korean with a KO/EN toggle in the navigation.

The checklist should be reviewed before publishing FANDEX in Instagram, X, or
LinkedIn profile links. The next implementation step is waitlist validation and
consent UI, followed by Supabase waitlist storage.

## Not Implemented

This phase does not implement:

1. Actual SNS channel URLs.
2. Instagram, X, or LinkedIn API integration.
3. Content Hub.
4. Free search limitation or real usage limits.
5. Subscriber-only feature implementation.
6. Payment.
7. Toss Payments.
8. Login.
9. Supabase storage.
10. Actual AI interpretation backend.
11. Database persistence.
12. Email automation.
13. Waitlist submission.
14. New API routes.
15. Actual Naver API collection.
16. Supabase tables or migrations.
17. Live sample report generation.
18. Sample report PDF export.
19. Form validation.
20. Privacy copy and consent checkbox.
21. Waitlist UI to data model wiring.
22. Subscriber entitlement checks.
23. Subscriber research route backend.
24. Real paid category unlock logic.

## Next TODO

1. Define SNS channel launch plan.
2. Produce the first SNS content batch.
3. Expand free search result data coverage.
4. Refine Plus and Pro package boundaries.
5. Add Content Hub or SNS Signal archive.
6. Add lock UI click tracking after analytics policy is approved.
7. Connect waitlist storage.
8. Add consent and privacy copy UI.
9. Add validation UI.
10. Decide subscriber auth and payment approach.
11. Design AI interpretation backend.
12. Design the full research report generation workflow.
13. Validate first paid report pricing.
14. Connect real data sources.
15. Apply the actual FANDEX v1 scoring formula.
