# Activity Exposure provider authorization review v1

Status: VALIDATION / PROVIDER-AUTHORIZATION REVIEW  
Construct: Activity Exposure Event Stream  
Latest main at review: `d7ad96f9a207e35141104882972a97829400862c`

## MusicBrainz

Official MusicBrainz documentation states:

- non-commercial use of the MusicBrainz Web Service is free
- commercial use should use the commercial plans / contact MetaBrainz
- a meaningful User-Agent is required
- client applications must not exceed the documented request-rate boundary
- MusicBrainz database core data is available under CC0, while supplementary data has different licensing
- MetaBrainz offers commercial account tiers, including start-up/public-product tiers

### FANDEX decision

Validation/research use of the current collector:

`AUTHORIZED_FOR_NON_COMMERCIAL_VALIDATION_SCOPE`

Production use of the public MusicBrainz Web Service:

`CONDITIONAL_ON_FANDEX_ACCOUNT_CLASSIFICATION`

If FANDEX remains a non-commercial personal/research project, the documented free non-commercial Web Service path applies.

If FANDEX is operated as a public commercial/start-up product, a MetaBrainz commercial account/tier or equivalent agreement is required before relying on the public Web Service as a Production dependency.

This is an account/service-access gate, not a reason to change Activity Exposure semantics.

### Alternative provider delivery path

MetaBrainz also publishes MusicBrainz database dumps. Commercial use is documented as allowed, with financial support strongly encouraged for commercial users.

Using dumps instead of the live Web Service would be a distinct Production acquisition design and is **not automatically substituted** into Activity Exposure v1 by this review.

No source-contract switch is authorized here.

## YouTube

Current state remains:

`AUTHORIZED_API_CREDENTIAL = MISSING`

No live uploads replay was performed.

No scraping/RSS/HTML substitute is authorized because it would bypass the frozen provider source contract.

## Current authorization gates

- MusicBrainz live validation: PASS
- MusicBrainz Production service access: CONDITIONAL / account-classification dependent
- YouTube live validation: BLOCKED_BY_AUTHORIZED_CREDENTIAL
- YouTube Production access: NOT EVALUABLE UNTIL AUTHORIZED API ACCESS EXISTS
- Neon Production schema: NOT AUTHORIZED
- Production merge/activation/publication: NOT AUTHORIZED

## Official references

- https://musicbrainz.org/doc/MusicBrainz_API
- https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
- https://musicbrainz.org/doc/MusicBrainz_Database
- https://metabrainz.org/supporters/account-type
- https://metabrainz.org/supporters/tiers/2
