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

## Next TODO

1. Build a sample report page.
2. Add a waitlist form.
3. Design the report request flow.
4. Validate pricing.
5. Add a Supabase waitlist table after schema approval.
6. Add payment integration after product and pricing validation.
