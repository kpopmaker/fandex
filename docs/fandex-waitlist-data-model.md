# FANDEX Waitlist Data Model Draft

Status: draft only. No database, API route, server action, or form submission is
implemented.

## Why This Model Exists

FANDEX now has an Early Access waitlist preview UI, but the UI does not store or
send requests. Before connecting the form to Supabase, the project needs a clear
data model for what should be collected, how requests should be reviewed, and
which consent and privacy boundaries apply.

The first storage goal is to understand:

1. Who is requesting Early Access.
2. Which report formats are most useful.
3. Which roles or use cases are appearing.
4. Which users should be prioritized for beta review.
5. Which pricing and report-package assumptions should be validated next.

## Current UI Status

The home waitlist form is a preview UI only. It has no `action`, no submit
handler, no API call, no Supabase connection, no email automation, and no
payment flow.

`app/data/v4/commercialization/waitlistDataModel.ts` provides pure TypeScript
types and helper functions for a future storage layer. It is not imported by the
UI yet.

## Field Draft

Planned fields:

1. `name`: requester's display name.
2. `email`: requester email as entered.
3. `normalizedEmail`: trimmed lowercase email for dedupe and lookup.
4. `role`: role or use case category.
5. `reportInterest`: preferred report format.
6. `source`: where the request came from.
7. `status`: operational review status.
8. `priority`: review priority.
9. `consentState`: consent capture state.
10. `message`: optional requester note.
11. `notes`: internal admin note.
12. `metadata`: small structured context for campaign or UI source data.
13. `createdAt`: creation timestamp supplied by the future submission layer.
14. `updatedAt`: last update timestamp supplied by the future storage layer.
15. `contactedAt`: contact timestamp supplied by the future admin workflow.

## Enumerations

Roles:

1. `entertainment_marketer`
2. `kpop_fan_community_operator`
3. `brand_marketer`
4. `job_seeker_portfolio_research`
5. `investor_market_watcher`
6. `other`

Report interests:

1. `weekly_kpop_fandex_report`
2. `artist_watchlist`
3. `comeback_issue_brand_signal_summary`
4. `artist_comparison_brief`
5. `marketing_insight_memo`

Sources:

1. `home_early_access`
2. `sample_report`
3. `manual_admin`
4. `future_campaign`

Statuses:

1. `preview_only`
2. `pending_review`
3. `approved_beta`
4. `contacted`
5. `rejected`
6. `unsubscribed`

Consent states:

1. `not_requested`
2. `requested`
3. `accepted`
4. `declined`

Default draft values:

1. `status`: `preview_only`
2. `priority`: `normal`
3. `consentState`: `not_requested`
4. `role`: `other`
5. `reportInterest`: `weekly_kpop_fandex_report`
6. `source`: `home_early_access`

## Consent And Privacy Copy Draft

Draft copy:

Early Access request information will be used only to contact users about
FANDEX beta access and report testing. FANDEX does not collect payment
information through this form. Do not submit sensitive personal information.
Users may request deletion of their waitlist information.

Before storage is implemented, this copy should be reviewed and reflected in the
UI with an explicit consent checkbox.

## Supabase Table Draft

Table name: `fandex_waitlist`

Column draft only:

1. `id`: text or uuid, primary key.
2. `name`: text, not null.
3. `email`: text, not null.
4. `normalized_email`: text, indexed.
5. `role`: text.
6. `report_interest`: text.
7. `source`: text.
8. `status`: text.
9. `priority`: text.
10. `consent_state`: text.
11. `message`: text, nullable.
12. `notes`: text, nullable.
13. `metadata`: jsonb, nullable.
14. `created_at`: timestamptz.
15. `updated_at`: timestamptz.
16. `contacted_at`: timestamptz, nullable.

No SQL migration is created in this step.

## API Route Vs Server Action

API route candidate:

1. Pros: explicit endpoint, easier external testing, clear boundary for future
   rate limiting and admin tooling.
2. Cons: more boilerplate and separate request parsing.

Server action candidate:

1. Pros: colocates form handling with the route, simpler for a first-party form,
   and can reduce client code.
2. Cons: tighter coupling to the App Router page and less obvious as a public
   integration boundary.

Decision status: undecided. This step only defines the model.

## Current Shape Check

`runWaitlistDataModelShapeCheck()` validates local sample submissions only:

1. Entertainment marketer / weekly report.
2. Job seeker / artist comparison brief.
3. Brand marketer / marketing insight memo.
4. Invalid email sample.

It returns sample count, valid sample count, warning count, role coverage,
report interest coverage, source coverage, status coverage, and whether blocking
errors exist.

## Next TODO

1. Finalize privacy copy.
2. Add consent checkbox UI.
3. Add client-side validation.
4. Create Supabase migration.
5. Implement the chosen API route or server action.
6. Add admin review workflow.
7. Add email notification.
8. Validate pricing.
