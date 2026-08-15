# AESPA enrichment fulfillment shadow design (v74)

## Purpose and authority

v72 defined the closed request vocabulary `content_context` and `source_attribution`. v73 proved that one explicit human `request_enrichment` decision could pass the historical decision boundaries and be applied only to disposable shadow state. v74 defines how a future local shadow component could fulfill those fields; it performs no fulfillment.

All lifecycle, evidence, authorization, failure, and adapter semantics introduced here are `proposed_v74`. They are neither historical nor production authority. Historical decision and application contracts remain unchanged, while v72 and v73 are consumed as validated prerequisites.

Verified readiness:

- v72 `enrichment_request_field_contract_conformance`: `passed`
- v73 `explicit_human_shadow_decision_execution_conformance`: `passed`
- v73 `future_enrichment_fulfillment_shadow_readiness`: `ready_for_separate_enrichment_fulfillment_shadow_design`
- Production persistence/execution: `not_ready`
- External enrichment execution: `not_ready`

## Read-only real AESPA design case

The v71 selector was reproduced over 1,000 eligible records. It selected the same seven-field lineage:

- decision input: `00de9317942918a736a24d6790e4c17fb1260b5cc2c2f820b339cf66b07be6f4`
- decision preview: `55f2ac49c067a0f8efbf3e159aac1e523325964e521131dfdeabbb47bd14badc`
- queue: `queue_ef27330d9175d5aa91cba30030992e85168cbcdec18e2fc83699eddf01812b43`
- gate: `gate_17f644959e2a90cdc6d40a2874d47b2d500440052e83078f2122e1784a7c6a64`
- internal source: `src_40f253cea60253b4f7b8d1e747f9cc87`
- artist: `sandbox:artist:aespa`
- source type: `news`

The historical state remains `pending_review`, `not_decided`, and `exception_review_required`. Local context has provider key `naver`, hostname `www.mydaily.co.kr`, and publication time. It lacks title, summary/bounded excerpt, and `author_or_publisher`; therefore neither requested field is currently satisfied.

The deterministic real-target plan reports both fields missing, external authorization `not_authorized`, external operation `not_attempted`, and execution `not_executed`. It does not fabricate content or attribution.

## Field and request lifecycle

The proposed field lifecycle is:

1. `requested`: present in the human request.
2. `planned`: a data-only plan exists.
3. `not_attempted`: acquisition has not occurred.
4. `evidence_available`: candidate evidence exists but is not yet completion-valid.
5. `partially_satisfied`: only part of a field's required semantic evidence validates.
6. `satisfied`: every required component validates.
7. `unavailable`: authorized or local inspection completed without required evidence.
8. `failed`: deterministic validation/acquisition failure prevented evaluation.

Request-level states are `not_attempted`, `unsatisfied`, `partially_satisfied`, `satisfied`, `unavailable`, and `failed`. All fields must be satisfied for request-level `satisfied`. Any mix of satisfied and non-satisfied fields is `partially_satisfied`; partial completion never becomes full success.

## Provider-neutral source classes and priority

The closed source classes are:

- `existing_local_normalized`: existing normalized, canonical, or queue evidence.
- `controlled_fixture_input`: synthetic test-only evidence.
- `authorized_provider_retrieval`: a future provider-mediated request.
- `authorized_direct_source_retrieval`: a future direct-source request.

Priority is exactly the order above. A future implementation must inspect local evidence first and stop when completion is established. External classes are candidates, not authorized sources. There is no arbitrary web-search or alternate-provider fallback.

## `content_context`

v72 requires both:

- a non-empty title; and
- a non-empty summary or bounded excerpt.

Title alone and summary alone are only `partially_satisfied`. Title plus summary, or title plus a valid bounded excerpt, is `satisfied`. A full article body is not required.

No tracked historical numeric excerpt limit was found. v74 therefore proposes—not historically claims—a conservative inclusive maximum of 1,000 Unicode code points after NFC normalization and surrounding-whitespace trimming. An excerpt of 1,000 points validates; 1,001 produces `evidence_invalid`.

Durable full-article retention is prohibited. Only minimum necessary metadata, title, summary, bounded excerpt, content digest, and retrieval metadata may enter a future shadow evidence boundary. Any larger temporary retrieval payload remains outside this contract and may yield only permitted derived evidence.

## `source_attribution`

This field is satisfied only by a non-empty normalized `author_or_publisher` value. Provider key and hostname/domain are contextual evidence only and remain insufficient by themselves. The design does not add probabilistic confidence scores.

An attribution evidence record identifies the observed normalized value, source class, collection method, safe locator, validation result, digest, and provenance. It does not invent provider-specific schema columns.

## Evidence envelope and hashing

The closed envelope binds evidence to a deterministic request and the exact seven-field target lineage. It contains:

- `evidence_id`, `request_id`, and `target_identity`
- `requested_field`, `evidence_type`, and `semantic_field`
- `normalized_value` and `content_digest`
- `source_class`, `source_locator`, and `collection_method`
- `provenance`, `validation_status`, and `safe_retention_class`

Unknown fields, malformed envelopes, target mismatch, semantic-field mismatch, invalid digests, unsafe retention classes, and over-bound excerpts fail closed.

Canonical object hashing uses UTF-8 JSON with sorted keys, compact separators, preserved Unicode, and one trailing LF, followed by SHA-256. Value digests use SHA-256 over the UTF-8 NFC-normalized value. This follows existing FANDEX deterministic canonical SHA-256 practice without changing historical algorithms.

## Fulfillment planning and future interface

A plan is data, not executable behavior. It records target identity, requested fields, current states, available local evidence, missing requirements, candidate source classes, authorization status, planned operations, and `not_executed` status.

The proposed future local interface operations are:

- `inspect_enrichment_satisfaction`
- `build_enrichment_fulfillment_plan`
- `accept_controlled_enrichment_evidence`
- `validate_enrichment_evidence`
- `evaluate_enrichment_completion`
- `read_shadow_fulfillment_result`

v69 stores application, decision, queue, and audit semantics. Its validated interface does not own enrichment evidence. v74 therefore proposes a separate disposable in-memory enrichment evidence adapter for v75 rather than extending v69 implicitly. Runtime JSON remains ignored evidence, not semantic persistence.

## External authorization and network safety

The default external authorization status is `not_authorized`. A future authorization envelope must bind an authorization ID and status to the exact target, allowed source class, allowed host/provider, requested fields, request scope, one-shot behavior, expiry, and provenance. Missing, expired, consumed, mismatched, or invalid authorization leaves external work `not_attempted`.

No provider or URL is contacted merely because it occurs in historical data. A future direct-network implementation would additionally require:

- HTTPS-only authorization;
- exact host binding;
- redirects denied by default and any separately allowed redirect fully revalidated;
- private/local network denial;
- a proposed 2 MiB response limit;
- content type restricted to `text/html` or `application/json`;
- a proposed ten-second timeout;
- no credential forwarding across hosts; and
- no automatic fallback.

These controls are design requirements only; v74 contains no network implementation.

## Failures and retries

The proposed failures cover missing/invalid authorization, target/source mismatch, unavailable/not-found/access-denied/rate-limited sources, timeout, invalid content type, oversized response, prohibited redirect, missing/invalid/partial evidence, and provider failure.

There are no automatic retries, schedulers, or cron jobs. Rate-limit, timeout, and provider failure may be safe candidates for a separately initiated deterministic retry. Authorization failures require renewed authorization. Structural, target, evidence, and policy failures are do-not-retry outcomes until inputs or contract authority change.

## Human and historical boundaries

Fulfillment does not equal approval. Even complete evidence must not transform `request_enrichment` into `accept_exception`, `approve_candidate`, or `reject`. A separate future human review decision remains required.

Evidence must not mutate historical source, queue, decision, application, or audit state. Any future real write requires a separate reviewed contract. The planned v75 boundary is controlled-fixture-only, process-local, disposable, and network-free.

## Controlled validation, effects, and determinism

Controlled fixtures proved title-only partial completion, title-plus-summary completion, bounded-excerpt boundary behavior, provider-only insufficiency, valid attribution completion, both partial combinations, full request completion, malformed/mismatched evidence rejection, and authorization mismatch rejection. Fixture values are `controlled_fixture_only` and are not facts about the MyDaily article.

All 17 zero-effect counters are zero. No article, Naver endpoint, MyDaily page, external provider, Supabase service, or database was contacted. No source, queue, decision, application, audit, score, ranking, chart, or public data changed.

The preview passed 42 checks. First/repro hashes matched for lifecycle, evidence schema, completion matrix, source priority, authorization policy, failure matrix, controlled fixtures, real-target plan, validation, authority verification, and safe summary.

Final readiness:

- `enrichment_fulfillment_shadow_design_conformance`: `passed`
- `future_local_enrichment_fulfillment_adapter_readiness`: `ready_for_separate_local_adapter_implementation`
- `external_enrichment_execution_readiness`: `not_ready`
- `production_persistence_readiness`: `not_ready`
- `production_execution_readiness`: `not_ready`

v74 does not retrieve the MyDaily article. It does not call Naver or any external provider. It does not satisfy the enrichment request. It only defines how a future shadow fulfillment implementation could do so. Historical AESPA state remains unchanged.

The next stage may implement a strictly local disposable enrichment fulfillment adapter using controlled fixtures only. It must not retrieve the real article.
