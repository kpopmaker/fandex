# FANDEX Commercialization MVP

Status: SNS-led research funnel positioning draft.

## Commercial Positioning

FANDEX should be positioned as a K-pop and entertainment issue research
platform. It verifies current issues with public signal data and interprets them
from a marketing perspective. It should not be presented as a real-time K-pop
stock service, financial index product, or investment tool.

The commercial wedge is now SNS-led, while SNS channel operation and content
production are handled manually by the operator:

1. Publish FANDEX Signal content on Instagram, X, and LinkedIn.
2. Drive interested readers through profile links to the website.
3. Let visitors use free search preview, ranking snapshots, signal previews,
   and sample reports.
4. Send high-intent readers to `/research` for subscriber research preview.
5. Convert subscriber research interest into the waitlist.
6. Validate subscriber-only research, AI interpretation, artist comparison, and
   weekly report products.

## Free Public Area

The public preview can expose lightweight dashboard surfaces:

1. Artist quick search.
2. Public ranking snapshot.
3. Issue tone preview.
4. Sample report.
5. SNS signal archive preview.

This area should help visitors understand FANDEX signal coverage without
requiring login, payment, database writes, or a live waitlist flow.

## Early Access Report Area

The paid beta concept is a subscriber research package:

1. AI interpretation.
2. Full artist research brief.
3. Brand-fit analysis.
4. Issue risk analysis.
5. Artist comparison report.
6. Weekly FANDEX report.
7. Watchlist and signal commentary.

The report should validate whether users want recurring entertainment research
before a full subscription product is built.

## SNS-Led Research Funnel

`docs/fandex-sns-research-funnel.md` defines the current funnel strategy:

```text
SNS content
  -> profile link
  -> FANDEX free preview
  -> sample report
  -> waitlist
  -> subscriber research validation
```

Commercialization stages:

1. Reposition site for SNS-led research funnel.
2. Add free search preview.
3. Add subscriber research lock UI.
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
  -> website free search preview
  -> sample report
  -> subscriber research lock UI
  -> waitlist
```

Implemented free preview:

1. Artist quick search.
2. Basic artist metadata.
3. Preview FANDEX score.
4. Issue tone preview.
5. Sample signal summary.
6. Links to sample report and Early Access.

Implemented subscriber lock preview:

1. AI Interpretation.
2. Full Artist Research Brief.
3. Brand-fit Analysis.
4. Issue Risk Analysis.
5. Artist Comparison Report.
6. Weekly FANDEX Report.
7. Watchlist & Signal Commentary.

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
without pricing, payment, login, subscriber authorization, AI backend, or report
generation backend. `docs/fandex-subscriber-research-plan.md` documents the
planned package structure.

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
  -> Early Access section
  -> View Sample Report
  -> future Request Early Access form
```

The home CTA `View Sample Report` now links to `/sample-report`. The remaining
request/beta CTAs stay as temporary anchors until a real request flow is
approved.

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
