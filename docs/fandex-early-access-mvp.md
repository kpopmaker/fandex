# FANDEX Early Access MVP

Status: static conversion page and CTA flow only. No real application storage,
email sending, CRM, Google Sheet, Supabase, payment, login, entitlement, API
route, server action, `fetch`, or env/API key connection is implemented.

## Purpose

The Early Access MVP gives SNS visitors a clear commercial next step after they
understand FANDEX through free search, sample reports, and subscriber research
category previews.

The goal is not to launch a full paid SaaS product yet. The goal is to make the
beta value proposition concrete enough that high-intent users can see what they
would request from FANDEX research.

## User Flow

```text
SNS content
  -> /
  -> /search
  -> /sample-report
  -> /research
  -> /early-access
```

## Conversion Structure

Free preview:

1. Artist identity and public cumulative point preview.
2. Point band and issue tone.
3. Locked subscriber research categories.

Sample report:

1. Fictionalized preview of report format.
2. Cumulative `pt` examples only.
3. Category-level detail framed as subscriber research.

Research plan:

1. Free / Plus / Pro category boundary.
2. Subscriber value explanation.
3. Early Access operating-condition copy without real checkout.

Early Access:

1. Audience fit.
2. Beta benefit cards.
3. Static application form UI.
4. Links back to `/search`, `/sample-report`, and `/research`.

## Currently Implemented

1. `/early-access` static route.
2. Korean-first hero and conversion copy.
3. Audience cards for marketers, brand teams, fandom content operators, and
   entertainment job seekers.
4. Six beta benefit cards comparing free preview vs Early Access value.
5. Static application form UI with name, email, role, report type, research
   target, and usage purpose.
6. Button uses `type="button"` and does not submit or store data.
7. Existing CTA links now route interested users to `/early-access`.

## Not Implemented Yet

1. Real application storage.
2. Email sending.
3. CRM connection.
4. Google Sheet connection.
5. Supabase connection.
6. Payment.
7. Login.
8. Entitlement or subscriber access control.
9. Admin review UI.
10. API route or server action.

## Public QA Checklist

1. `/early-access` returns 200 in production route checks.
2. The form is visibly a static UX preview.
3. No button submits, stores, sends, or calls an external service.
4. The disclaimer says FANDEX is an experimental entertainment research
   indicator, not financial advice, an investment product, or an official
   certification score.
5. The page links to `/search`, `/sample-report`, and `/research`.
6. Copy does not frame FANDEX as a stock, investment, buy/sell, yield, or
   financial decision product.
7. Copy does not assert real artist legal, contract, controversy, or hiatus
   conditions.
8. Pricing language should use subscription plan, operating condition, or
   Early Access validation language.

## Forbidden Public Copy

Avoid these in user-facing copy:

1. Stock-like framing.
2. Investment decision language.
3. Buy or sell calls.
4. Yield or return language.
5. Price increase language.
6. Real artist controversy claims.
7. Real artist legal claims.
8. Real artist contract dispute claims.
9. Real artist hiatus claims.

Use safer terms:

1. FANDEX cumulative point.
2. FANDEX research signal.
3. Brand-fit analysis.
4. Growth momentum.
5. Issue and news signal summary.
6. Early Access operating conditions.
7. Subscription plan preview.
