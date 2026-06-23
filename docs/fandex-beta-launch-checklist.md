# FANDEX Beta Launch Checklist

Status: pre-launch checklist for using FANDEX as an SNS profile link beta site.

## A. Launch Goal

FANDEX is not launching as a complete paid SaaS product yet. The current beta
goal is to be a research site that can receive traffic from SNS profiles and
help visitors understand the FANDEX value proposition.

The beta site should:

1. Provide a free search preview.
2. Provide a sample report.
3. Explain the value of subscriber research.
4. Guide interested users toward Early Access.
5. Make clear that FANDEX is an entertainment research product, not an
   investment product.

## B. Public Route Checklist

### `/`

Check that:

1. The service positioning is clear.
2. The SNS-led research funnel is explained.
3. The Search Preview CTA is visible.
4. The Sample Report CTA is visible.
5. The Subscriber Research CTA is visible.
6. The waitlist preview form is visible.

### `/search`

Check that:

1. Free artist search preview works.
2. Only basic signal preview is shown.
3. Subscriber research lock UI is visible.
4. The `/research` CTA is connected.
5. The `/#waitlist-form` CTA is connected.

### `/sample-report`

Check that:

1. The sample report feels persuasive as a product preview.
2. The difference between free preview and paid research is visible.
3. `/search`, `/research`, and `/#waitlist-form` CTAs are connected.
4. A disclaimer is present.

### `/research`

Check that:

1. Free / Plus / Pro preview is clear.
2. The page does not look like a real pricing or payment page.
3. Subscriber research features are understandable.
4. The Early Access CTA is visible.
5. A disclaimer is present.

## C. Free Vs Subscriber Checklist

Free Preview:

1. Artist quick search.
2. Public ranking snapshot.
3. Issue tone preview.
4. Sample report.
5. Limited signal preview.

Subscriber Research:

1. AI interpretation.
2. Full artist brief.
3. Brand-fit analysis.
4. Issue risk analysis.
5. Artist comparison report.
6. Weekly FANDEX report.
7. Watchlist commentary.

## D. Not Implemented Yet

The beta site does not yet include:

1. Real login.
2. Real payment.
3. Real subscription access control.
4. Supabase waitlist storage.
5. API route or server action.
6. AI interpretation backend.
7. Naver API live collection.
8. Email automation.
9. PDF export.

## E. SNS Profile Link Readiness

Before using FANDEX as an SNS profile link, confirm:

1. The first viewport explains what FANDEX is within five seconds.
2. `/search` works as the free trial destination.
3. `/sample-report` explains the report product.
4. `/research` explains subscriber value.
5. All CTAs resolve without dead ends.
6. Primary CTAs are visible on mobile.
7. Disclaimers are visible enough for a beta research product.

## F. Manual QA Checklist

Manually check:

1. Desktop layout.
2. Mobile width layout.
3. Dark/light mode behavior.
4. Internal links.
5. CTA anchors.
6. Route 404 status.
7. Build output route generation.
8. No unexpected external links.
9. No accidental payment or login wording.

## G. First Launch Operating Checklist

Before SNS operation:

1. Prepare Instagram, X, and LinkedIn profile descriptions.
2. Add the FANDEX URL to the profile link.
3. Prepare the first 5 to 10 content posts.
4. Decide the destination route for each content type:
   - General introduction: `/`
   - Artist search prompt: `/search`
   - Report example: `/sample-report`
   - Subscriber research value: `/research`
5. Define how early reactions will be recorded.
6. Define how manual report requests will be managed.

## H. Next Implementation Priorities

1. Waitlist form validation and consent copy.
2. Supabase waitlist storage.
3. Subscriber auth/payment decision.
4. AI interpretation backend design.
5. Report generation workflow.
6. Pricing validation.
7. Production domain and metadata QA.
