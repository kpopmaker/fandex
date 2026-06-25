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
6. Present the core public experience in Korean by default.
7. Offer a lightweight KO/EN language toggle.

## B. Public Route Checklist

### `/`

Check that:

1. The service positioning is clear.
2. The SNS-led research funnel is explained.
3. The Search Preview CTA is visible.
4. The Sample Report CTA is visible.
5. The Subscriber Research CTA is visible.
6. The waitlist preview form is visible.
7. The first viewport reads naturally in Korean.
8. Home copy does not frame FANDEX as a stock, market index, price, or
   investment decision product.
9. The disclaimer clearly says FANDEX is an experimental entertainment research
   indicator, not financial advice, an investment product, or an official
   certification score.

### `/search`

Check that:

1. Free artist search preview works.
2. Only basic signal preview is shown.
3. Paid category gate is visible below results.
4. The `/research` CTA is connected.
5. The `/#waitlist-form` CTA is connected.
6. Free search and locked category copy are Korean by default.
7. FANDEX v1 public score, score band, and issue tone are visible.
8. Category score numbers and risk penalty values are not visible to free users.
9. The page does not imply that the preview score is live-data based.
10. The score is clearly shown as cumulative `pt`, not a 0-100 percentage.
11. Category raw point, coefficient, contribution, and risk detail stay locked.
12. Validation detail is not overexposed in the free screen.

### `/sample-report`

Check that:

1. The sample report feels persuasive as a product preview.
2. The difference between free preview and paid research is visible.
3. `/search`, `/research`, and `/#waitlist-form` CTAs are connected.
4. A disclaimer is present.
5. The page is framed as a subscriber research output sample in Korean.
6. No sample value looks like a capped 0-100 score such as `82.4`.
7. Sample scoring copy uses cumulative `pt` notation only.
8. The primary cards, table headings, CTA copy, and descriptions are Korean by
   default.
9. Financial or investment-style wording such as stock, price, market cap,
   percent change, or investment signal is absent from public sample copy.
10. The page says sample values are preview/mock/manual seed examples and not
    live connected data.

### `/research`

Check that:

1. Free / Plus / Pro preview is clear.
2. The page does not look like a real pricing or payment page.
3. Free, Plus, and Pro category unlocks are understandable.
4. The Early Access CTA is visible.
5. A disclaimer is present.
6. Pricing/payment inactive copy is clear in Korean.
7. FANDEX v1 formula copy says the current structure is beta preview/mock based.
8. Formula copy explains the unbounded cumulative point model.
9. The page does not describe a maximum score or maximum fixed risk deduction.
10. FANDEX is described as a verifiable research indicator, not an official certified score.
11. Subscriber value includes category breakdown plus benchmark validation.

## C. Language Checklist

Check that:

1. KO is the default visible language.
2. The KO/EN toggle is visible near the theme toggle.
3. Clicking the toggle switches core hero, CTA, category, lock, and disclaimer
   copy to English where supported.
4. Clicking again returns to Korean.
5. The selected language is remembered through `fandex-language` localStorage.
6. The toggle remains usable on mobile width.
7. The toggle does not interfere with the day/night theme toggle.

## D. Free Vs Subscriber Checklist

Free Preview:

1. Overview.
2. FANDEX cumulative point preview.
3. Issue Tone Preview.

Subscriber Research:

1. Music / Album Signal.
2. News / Issue Signal.
3. SNS / Fandom Signal.
4. Brand-fit Signal.
5. Comeback / Activity Signal.
6. Artist Comparison.
7. AI Interpretation.
8. Weekly Research Report.

Confirm that locked paid categories:

1. Show a clear lock badge.
2. Link to `/research` for plan/category explanation.
3. Link to `/#waitlist-form` for Early Access interest.
4. Do not show pricing or payment CTAs.
5. Do not imply that paid access is already live.

## E. Not Implemented Yet

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
10. Real paid category unlock logic.
11. Full i18n routing.
12. Locale-specific URL handling.
13. External i18n package.
14. Live FANDEX v1 data connection.
15. Subscriber category score entitlement.

## F. SNS Profile Link Readiness

Before using FANDEX as an SNS profile link, confirm:

1. The first viewport explains what FANDEX is within five seconds.
2. `/search` works as the free trial destination.
3. `/sample-report` explains the report product.
4. `/research` explains subscriber value.
5. All CTAs resolve without dead ends.
6. Primary CTAs are visible on mobile.
7. Disclaimers are visible enough for a beta research product.
8. Korean default copy is clear on first load.
9. Preview scoring disclaimers prevent confusion with actual live data.
10. Cumulative point model disclaimer is visible enough for beta users.
11. Copy does not imply official certification or completed objective validation.

## G. Manual QA Checklist

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
10. KO/EN toggle behavior.
11. Mobile language toggle layout.

## H. First Launch Operating Checklist

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

## I. Next Implementation Priorities

1. Waitlist form validation and consent copy.
2. Supabase waitlist storage.
3. Subscriber auth/payment decision.
4. AI interpretation backend design.
5. Report generation workflow.
6. Pricing validation.
7. Production domain and metadata QA.
8. Korean metadata and OG copy.
9. Full component-level i18n cleanup.
10. Naver News issue signal connection.
11. FANDEX v1 score snapshot and history design.
12. Validation benchmark table for chart, search, video, news, and brand events.
13. Subscriber report validation detail QA.
