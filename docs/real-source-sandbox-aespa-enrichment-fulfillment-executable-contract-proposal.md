# AESPA enrichment fulfillment executable contract proposal (v75)

## Purpose

The first attempt to implement a disposable enrichment adapter correctly stopped because v74 described the design but did not freeze enough executable semantics. v75 resolves those ten gaps as `proposed_v75` machine-readable contract terms. It does not implement an adapter, retrieve evidence, or mutate any state.

v72 remains authority for `content_context`, `source_attribution`, and their canonical order. v73 remains authority for the human request and selected real target. Explicit v74 completion, source, copyright, authorization, persistence, and human-review boundaries remain intact. Observed v74 Python behavior is labeled `implementation_observation_v74` and is not silently promoted.

## Ten blocker resolutions

1. All six public operations now have closed input/output schemas, statuses, preconditions, postconditions, determinism, and safe-output rules.
2. Initialization is a closed seven-field object with no defaults or environment inference.
3. `request_id` has an exact canonical preimage, SHA-256 algorithm, verification rule, and vector.
4. Evidence identity and exact/conflicting/distinct duplicate behavior are explicit.
5. Lifecycle is an event-driven allowlist; every absent transition is illegal.
6. Validation and acceptance vocabularies are closed and include mutation and retry semantics.
7. Every source class has an exact required locator pattern and execution flag.
8. Requested field, evidence type, semantic field, contribution, retention, and source class form a closed compatibility matrix.
9. `not_attempted`, `unavailable`, and `failed` have distinct causes and controlled-mode reachability.
10. Existing valid local evidence has immutable precedence; controlled fixtures cannot replace it.

All rows are `resolved` in the tracked contract.

## Public interface

The exact operations are:

- `inspect_enrichment_satisfaction`
- `build_enrichment_fulfillment_plan`
- `validate_enrichment_evidence`
- `accept_controlled_enrichment_evidence`
- `evaluate_enrichment_completion`
- `read_shadow_fulfillment_result`

Unknown properties fail closed. No operation has an implicit default. Only acceptance and completion evaluation may mutate future process-local derived state. Validation, inspection, planning, and reading are pure/read operations.

## Initialization and state

Initialization requires exactly:

- `contract_version = v75`
- deterministic `request_id`
- exact seven-field `target_identity`
- canonical `requested_enrichment_fields`
- canonical `existing_local_evidence`
- `authorization_state = not_authorized`
- both initial lifecycle values equal to `requested`

The future adapter state is closed and contains request, target, immutable initial local evidence, accepted controlled evidence, field/request completion, lifecycle, and result metadata. Request, target, and initial local evidence are immutable. Full article bodies, network credentials, and production state are forbidden.

## Request and evidence identities

The request preimage contains contract version, exact target identity, and v72-canonical requested fields. Canonicalization is UTF-8 JSON with sorted keys, compact separators, Unicode preserved, and one trailing LF. The lowercase SHA-256 test vector is:

`4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283`

Target or requested-field changes produce different IDs. A provided mismatch is `invalid_request_id`.

Evidence identity hashes the complete evidence envelope excluding `evidence_id` using the same canonical object scheme. `content_digest` hashes the NFC-normalized, trimmed UTF-8 value without a trailing LF. Both must recompute exactly.

An identical existing ID and preimage is `idempotent_exact_duplicate` with no semantic state change. The same ID with a different preimage is `conflicting_duplicate`. Distinct evidence may supplement the same semantic field, but never replaces local evidence.

## Lifecycle and terminal outcomes

Lifecycle states remain the v74 set: `requested`, `planned`, `not_attempted`, `evidence_available`, `partially_satisfied`, `satisfied`, `unavailable`, and `failed`.

Transitions occur only through listed events such as plan construction, authorization absence, valid evidence acceptance, and completion evaluation. Callers cannot assign a state directly. `satisfied`, `unavailable`, and `failed` are terminal except for read-only result reads.

Evidence absence or missing authorization yields `not_attempted`, never failure. `unavailable` requires an explicit future authorized acquisition outcome of `source_unavailable`; `failed` requires an explicit future authorized `provider_failure`. Neither can be simulated by the controlled v76 adapter.

## Validation and acceptance

The validation vocabulary includes `valid` plus closed errors for type/schema, target/request binding, unknown requested fields, semantic incompatibility, source class/locator, external non-executability, retention/full-body safety, digest/identity, and excerpt length.

Acceptance outcomes are:

- `accepted`
- `idempotent_exact_duplicate`
- `rejected_validation`
- `rejected_local_precedence`
- `conflicting_duplicate`

Every rejected result has zero state change. Acceptance follows validate → deep-copy candidate → apply → recompute → invariant validation → one live in-memory replacement. This is not a database transaction claim.

## Source locator and compatibility

Locators are mandatory and class-specific:

- Local normalized: `local://normalized/<64 lowercase hex>`
- Controlled fixture: `fixture://v75/<lowercase slug>`
- Provider reference: `provider-ref:<provider-key>:<opaque-id>`
- Direct source: restricted HTTPS form without credentials, query, or fragment

The two external classes are schema-representable but non-executable. No URL is contacted.

The closed compatibility matrix permits title, summary, bounded excerpt, `author_or_publisher`, and contextual provider/hostname evidence only in their exact v74 semantic combinations. Unknown combinations return `semantic_field_mismatch`.

## Completion and precedence

`content_context` requires title plus summary or bounded excerpt. One component is `partially_satisfied`; both are `satisfied`. `source_attribution` requires `author_or_publisher`; provider and hostname remain context only. Both requested fields must be satisfied for request-level `satisfied`; one satisfied field yields `partially_satisfied`.

Existing valid local evidence is evaluated first. Fixture replacement is prohibited. A fixture for a semantic field already represented locally is `rejected_local_precedence`; a fixture may supplement only an absent semantic field.

## Excerpt and retention

Values use NFC normalization followed by surrounding-whitespace trimming and must already equal that normalized representation. Bounded excerpts are measured in Unicode code points: 999 and 1,000 pass, while 1,001 returns `excerpt_too_large`.

Allowed retention classes are metadata, title, summary, bounded excerpt, content digest, and retrieval metadata. Full article bodies are prohibited. Safe results omit normalized evidence values and expose only safe evidence identity, type, class, digest, and provenance.

## Human review and real target

Every safe result has `human_re_review_required = true`. Fulfillment never means approval and cannot emit `approve_candidate`, `accept_exception`, or `reject`.

The real initialization example is bound directly to the tracked v73 lineage. It contains no title, summary, excerpt, author, or publisher. Its existing evidence array is empty, authorization is absent, and fabricated content count is zero. The historical queue remains `pending_review`; the decision remains `not_decided`.

## Validation, safety, and next stage

Pure contract validation covers all blocker sections, request/evidence identities, duplicates, legal/illegal lifecycle transitions, locator and compatibility rules, excerpt boundaries, precedence, terminal outcomes, safe result behavior, and controlled completion vectors. First/repro outputs are deterministic.

All real/external effect counters are zero. v75 makes no network, Naver, MyDaily, Supabase, database, v69, or v70 call. Runtime JSON is ignored test evidence and not semantic persistence.

Readiness:

- `enrichment_fulfillment_executable_contract_conformance = passed`
- `future_local_disposable_enrichment_adapter_readiness = ready_for_separate_adapter_implementation`
- `external_enrichment_execution_readiness = not_ready`
- `production_persistence_readiness = not_ready`
- `production_execution_readiness = not_ready`

The next stage may implement a controlled-fixture-only, process-local disposable adapter using v75 as its sole executable semantics authority. It must still make zero network calls and zero historical writes.
