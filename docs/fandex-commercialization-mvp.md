# FANDEX Commercialization MVP

Status: phase 1 positioning and landing CTA draft.

## Commercial Positioning

FANDEX should be positioned as a K-pop entertainment marketing insight dashboard
and research MVP. It should not be presented as a real-time K-pop stock service,
financial index product, or investment tool.

The first commercial wedge is:

1. Free public dashboard preview.
2. Paid Early Access weekly report validation.
3. Research-oriented signal summaries for entertainment, marketing, and artist
   monitoring use cases.

## Free Public Area

The public preview can expose lightweight dashboard surfaces:

1. Market issue climate.
2. Artist ranking.
3. Artist detail preview.
4. Compare preview.
5. Issue signal badges.

This area should help visitors understand FANDEX signal coverage without
requiring login, payment, database writes, or a live waitlist flow.

## Early Access Report Area

The paid beta concept is a weekly FANDEX report package:

1. Weekly K-pop FANDEX report.
2. Artist watchlist.
3. Comeback, issue, and brand signal summary.
4. Artist comparison brief.
5. Marketing insight memo.

The report should validate whether users want recurring entertainment research
before a full subscription product is built.

## Implemented Landing CTA

`app/page.tsx` now includes a `FANDEX Early Access` section with:

1. Product positioning as an entertainment marketing insight dashboard.
2. Free public preview card.
3. Early Access Report card.
4. Temporary CTA anchors:
   - Request Early Access
   - View Sample Report
   - Join FANDEX Beta
5. Research disclaimer clarifying that FANDEX is not financial advice or an
   investment product.

The CTA anchors are placeholders only and do not submit data.

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

## Not Implemented

This phase does not implement:

1. Payment.
2. Toss Payments.
3. Login.
4. Database persistence.
5. Email automation.
6. Waitlist submission.
7. New API routes.
8. Actual Naver API collection.
9. Supabase tables or migrations.
10. Live sample report generation.
11. Sample report PDF export.
12. Waitlist form submission.
13. Form validation.
14. Privacy copy and consent checkbox.

## Next TODO

1. Add form validation.
2. Decide between API route and server action for request handling.
3. Add a Supabase waitlist table after schema approval.
4. Add email notification.
5. Design the report request workflow.
6. Add privacy copy and consent checkbox.
7. Validate pricing.
8. Add sample report PDF export.
9. Design weekly report generation workflow.
10. Add payment integration after product and pricing validation.
