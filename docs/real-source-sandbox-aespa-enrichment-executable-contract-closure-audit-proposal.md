# AESPA enrichment executable-contract closure audit proposal (v78)

## Purpose

Repeated adapter attempts correctly stopped as structural omissions became visible: first contradictory planning and duplicate ordering, then incomplete idempotent evaluation, and finally the undefined `fulfillment_plan_v75` output type. V78 performs a complete closure audit instead of patching only that latest symbol.

A structural gap is a missing machine representation for semantics already reviewed—for example, an undefined alias, nested schema, ordering rule, or closed-object policy. V78 may materialize those facts without changing policy. A business gap would require choosing evidence precedence, fulfillment meaning, trust, approval, or a new lifecycle concept; such a gap would stop this stage. The audit found no remaining business-policy gap.

## Inventory and completeness method

The audit recursively inventories named schemas, aliases, operation inputs/outputs, statuses, events, hashes, arrays, and nested references across v75, v76, and v77. Before closure, 45 executable symbols comprised 17 fully defined, 23 partial, and five undefined symbols. Each receives one classification and a resolution. A second complete reference pass then verifies that no alias or nested reference remains unresolved.

An object is complete only when its required, optional, allowed, and typed fields; nested schemas; nullability; unknown-field policy; default behavior; failure behavior; and relevant ordering are machine-readable. All adapter-facing objects are closed and reject unknown fields. No input has an implicit default. All deterministic arrays have explicit ordering.

Every public operation is closed over an input schema, success and failure outputs, statuses, preconditions, postconditions, mutation/state/lifecycle interaction, determinism, and safe-output rule. The dry execution audit covers initialization/inspection, read-only planning, direct acceptance from requested, content evaluation, mixed satisfied/attribution evaluation, repeated satisfied evaluation, both duplicate branches, bad identity, local precedence, safe result reading, and the real-target initialization fixture.

## Structural materializations

`fulfillment_plan_v75` now uses the exact v74 plan field terminology: plan version, request and target identity, requested fields, current field states, safe local-evidence summaries, missing requirements, candidate source classes, authorization status, planned operations, and execution status. V76 contributes the derived-only plan status. The object is closed, has deterministic nested-array ordering, is read-only, never persists `planned`, and exposes no normalized evidence value, credentials, or article body.

The safe-result schema retains precisely the v75 fields and now resolves its completion map, request status, lifecycle map, and safe-evidence item array to closed schemas. `human_re_review_required` remains constant true and returned results remain detached deep copies.

Initialization resolves its target, requested-field array, local-evidence array, authorization value, and initial lifecycle. Target identity contains only the seven historical lineage fields. Local authorization is the closed value `not_authorized`; no external authorization or credential semantics are invented.

The evidence envelope now resolves every field type, locator discriminator, source class, evidence/semantic field, retention class, provenance, validation status, and SHA-256 alias. It preserves v76: validation is stateless about duplicates; acceptance classifies a stored-ID collision before strict new-evidence identity validation.

Completion maps, request completion, inspection/evaluation outputs, lifecycle states, derived plan status, and event payloads are closed. V76 keeps planning read-only and `planned` non-persistent. V77 keeps `satisfied → satisfied` as an explicit legal non-regressing evaluation and preserves mixed multi-field evaluation.

Request ID, evidence ID, and content digest each have explicit preimages, normalization, Unicode treatment, JSON serialization where applicable, array order, newline behavior, SHA-256, and lowercase hex. No plan or result ID was invented.

## Registries and authority

The executable schema registry is the unique source for each named type; the alias registry maps historical names to canonical registry keys and contains no dangling alias. Status, event, hash, array-ordering, default, closed-object, operation, and authority-precedence registries remove prose-only dependencies.

Precedence is narrow: v78 structural materialization wins only for listed structural clauses, then v77 explicit lifecycle correction, v76 explicit correction, and v75 baseline. V78 does not override business semantics.

The future-adapter dependency walk resolves initialization, inspection, planning, validation, duplicate classification, controlled acceptance, evaluation, and result reading with zero missing dependencies. All after-closure unresolved counters are zero.

## Safety and boundary

The unrelated Last.fm base files are hashed before and after validation and remain byte-identical. Their presence in the base grants no Last.fm scope.

V78 does not implement the adapter. V78 does not retrieve the MyDaily article. V78 does not call Naver. V78 performs no external retrieval. V78 does not modify historical AESPA state. V78 does not approve or reject anything. V78 does not modify Last.fm cloud history. V78 exists to make the executable contract structurally complete before implementation.

All network, external enrichment, database, semantic persistence, historical mutation, scoring, ranking, chart, public-data, and production counters remain zero. First/reproduction artifacts use sorted canonical JSON and matching SHA-256 hashes.

When validation passes, v79 may implement the controlled-fixture-only, process-local adapter directly from v75 + v76 + v77 + this closure registry. External enrichment and production persistence/execution remain not ready.
