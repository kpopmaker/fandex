# FANDEX Brand Fit — YouTube one-shot Production Operations handoff

This handoff is for the first bounded real observation candidate for:

- artist: `iu`
- brand: `estee-lauder`
- campaign: `estee-lauder-korea-new-night-campaign-2025-iu`
- official Brand channel: `UCUeEq2B8Cx3Sdjj0Zva7uRA`
- source video: `39CUlBDuRSo`

## What this command does

The command performs exactly one YouTube Data API `videos.list` request:

- endpoint: `https://www.googleapis.com/youtube/v3/videos`
- `part=snippet`
- `id=39CUlBDuRSo`

It validates the provider response and can advance the result only to:

`eligible-for-stored-evidence-review`

It does not:

- write to Neon or any other database
- mutate shared collectors or schedulers
- activate `brandFitPoint`
- publish a Product value
- retain the API credential
- retain the raw provider response
- authorize raw provider payload storage
- create a numeric Brand Fit score

## Required operator state

The operator must have an existing YouTube Data API credential. Do not commit it or paste it into any repository file.

The operator must also confirm both reviewed controls:

1. non-authorized YouTube metadata is subject to the required refresh/delete handling
2. FANDEX terms/privacy disclosure requirements for the API client are ready

The one-shot command has no scraping path and no audiovisual download path.

## Command

Run from the repository root on the exact reviewed Brand branch:

```bash
FANDEX_BRAND_FIT_YOUTUBE_API_KEY="<injected-secret>" \
FANDEX_BRAND_FIT_YOUTUBE_METADATA_POLICY_APPROVED="approved-brand-fit-youtube-metadata-policy-v1" \
FANDEX_BRAND_FIT_YOUTUBE_DISCLOSURE_READY="approved-brand-fit-youtube-disclosure-v1" \
npx tsx scripts/operations/brandFitYoutubeObservationV1.mts --execute
```

Do not place the credential in shell history on a shared machine. Use the Production Operations secret-injection mechanism available in the execution environment.

## Success output

A successful run emits sanitized JSON only. The output includes:

- categorical Brand Fit event identity
- canonical Artist / Brand / Campaign identity
- provider source URL
- provider `publishedAt`
- collection time
- revision identity
- rights state

The output deliberately excludes:

- API key
- raw provider payload
- raw video title
- raw video description

Success is not Product activation. It is only evidence eligible for the next stored-evidence review gate.

## Blocked outcomes

The run fails closed when any of the following occurs:

- explicit `--execute` flag missing
- API credential missing/invalid
- metadata-policy approval missing
- disclosure approval missing
- provider request fails
- HTTP response fails
- non-JSON or oversized response
- zero or multiple video results
- video ID mismatch
- invalid or mismatched channel
- non-exact provider publication timestamp
- Artist not explicitly present in provider metadata
- campaign/ambassador/collaboration relationship not explicit
- compliance handoff rejected

Provider failure is not Missing, no-campaign, zero, or negative Brand Fit.

## Post-run handoff

If the command returns `eligible-for-stored-evidence-review`:

1. preserve the sanitized output as execution evidence
2. do not write Product state yet
3. route the evidence to the Brand-specific stored-evidence review
4. keep rights state `restricted`
5. keep numeric eligibility `false`

This handoff does not authorize merge, deployment, recurring collection, scheduler changes, database writes, Product registration, activation, or public cutover.


## Receipt validation

A successful one-shot command now self-validates its sanitized output before printing it.

The receipt contract is:

- `brand-fit-production-observation-receipt-v1`
- implementation: `lib/intelligence/brandFitProductionObservationReceipt.ts`

A success-looking JSON result is rejected unless all of the following remain bound:

- execution status is the expected one-shot success state
- exactly one provider request was made
- no database write or Product activation was performed
- credential is absent
- raw title/description/provider payload fields are absent
- stored-evidence review digest is a valid SHA-256
- immutable body decodes successfully
- immutable payload digest matches
- top-level sanitized evidence matches the immutable evidence projection
- pathname is exactly the reviewed IU / Estée Lauder path
- Artist / Brand / Campaign identity matches the reviewed bindings
- rights remain `restricted`
- numeric eligibility remains false

If self-validation fails, the command exits non-zero and does not emit a success receipt.

This validation still does not authorize storage, activation, publication, recurring collection, or cutover.


## Owner execution authorization

The Production workflow requires explicit owner authorization on GitHub issue #367. A normal status/update comment is not authorization.

After the Brand workflow exists on `main`, and only after explicit execution approval has been given, Production Operations must record one issue comment using this exact schema:

```text
BRAND_FIT_YOUTUBE_PROVIDER_EXECUTION_AUTHORIZED
authorizationId: brand-fit-youtube-execution-YYYYMMDDtHHMMSSz-v1
authorizedMainSha: <exact current main SHA containing the execution workflow>
maximumExecutions: 1
targetVideoId: 39CUlBDuRSo
canonicalArtistId: iu
canonicalBrandId: estee-lauder
canonicalCampaignId: estee-lauder-korea-new-night-campaign-2025-iu
```

The authorization comment must be authored by `kpopmaker`.

The manual workflow inputs must then match the issue evidence exactly:

- `expected_main_sha` = `authorizedMainSha`
- `execution_authorization_id` = `authorizationId`
- `confirm` = `execute-brand-fit-youtube-observation-v1`

The workflow fails closed if the owner authorization is absent, malformed, bound to another main SHA, bound to another authorization ID, or targets another Artist / Brand / Campaign / video.

The authorization is one-shot. It is considered consumed if any earlier dispatch either:

- completed successfully, or
- reached a successful `Execute exactly one bounded Brand Fit provider observation` step even if a later artifact/post-processing step caused the overall workflow to fail.

Therefore an artifact-upload failure after a successful provider call does not authorize another provider call.

This section documents the required evidence format only. It is not itself an execution authorization.
