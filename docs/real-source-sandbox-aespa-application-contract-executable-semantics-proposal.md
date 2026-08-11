# AESPA application contract executable semantics proposal

## Purpose and authority

The first v66 simulation correctly stopped because the tracked v65 contract did not pin five executable details: intent/outcome mapping, intent/queue mapping, deterministic `applied_at`, exact SHA-256 serialization, and exact copied-state storage paths. Revised v66 resolves only those specification gaps. It does not simulate decisions. It does not apply decisions. Its executable semantics are proposal-only; v66 is neither historical nor production authority.

Provenance remains explicit: historical vocabulary and validation facts are `historical_existing`; retained v65 policies are `proposed_v65`; executable precision introduced here is `proposed_v66`; unresolved production implementation remains `unresolved`; no-action-only concepts may be `not_applicable`.

Pinned evidence includes v65 contract `a43b6d78b5eda4f490cb2d25dbb3407d408d6ee9403a652688547dc7a5d68fea`, v65 preview `42e81fb3bbd321031913ec7088229cd45eafcdba1dcc1e8d413bd2f493aae033`, v65 documentation `21191e066f9655514b690f331f61cdc74d7a1a1fe57b840fa07cbf67adc7c18e`, v64 plan `4163751ee4510d573985b895a55b4c4b23f67d060a76e579bfee714cc70602c6`, validator `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31`, template builder `694b1f541218ae9c6697422319b7966b2985f168bc0bc7d98dc00502f90c5819`, v58 `fa4e59b18d1a8bddf50c1244175e358b736569b11aeb5ff2a7434a045a3f4d81`, v61 `ad1ba38a4ac37d71445626978e92aae1271383cc10dfd3d90e7ccf40c7bf90aa`, v62 `720f13ceb4c75e799e5a41554c6454f0b8b800ab722361b58f7626610eb758ee`, and v63 `7e695faed8673af25e96e80842cabee68d70129b996903c3dc28fdebdec2702f`.

## Exact transitions

The historical vocabulary remains `not_decided`, `approve_candidate`, `accept_exception`, `reject`, `defer`, and `request_enrichment`.

| Intent | Outcome | Application action | Queue status / active / resolved | Enrichment |
|---|---|---|---|---|
| `not_decided` | `null` | `no_action` | `pending_review` / true / false | false |
| `approve_candidate` | `candidate_approved` | `persist_candidate_approved_outcome` | `resolved` / false / true | false |
| `accept_exception` | `exception_accepted` | `persist_exception_accepted_outcome` | `resolved` / false / true | false |
| `reject` | `rejected` | `persist_rejected_outcome` | `resolved` / false / true | false |
| `defer` | `deferred` | `persist_deferred_outcome` | `deferred` / true / false | false |
| `request_enrichment` | `enrichment_requested` | `persist_enrichment_requested_outcome` | `enrichment_requested` / true / false | true |

Every actionable row requires pre-state `not_decided` plus `pending_review`, context `applied_at`, and produces proposal application status/audit result `applied`. `not_decided` creates no application identity, record, audit event, or timestamp requirement and leaves the queue unchanged.

## Deterministic time and hashing

Future execution context contains only `application_context.applied_at`. It is required for explicit intents and forbidden for `not_decided`. It must exactly match `YYYY-MM-DDTHH:MM:SSZ`; valid input is preserved, and there is no current-time, file-time, Git-time, reviewed-time, or other fallback. Missing/invalid context fails closed.

`sha256_canonical_join` is refined as alias `sha256_canonical_json_array_v1`. Components are an ordered JSON array of strings, nulls, booleans, or integers; lists, objects, and floats as components are forbidden. Strings preserve Unicode code points without trimming or case changes. Serialization uses UTF-8, `ensure_ascii=false`, sorted nested keys (although component objects are forbidden), separators `(',', ':')`, and no trailing newline. Output is lowercase 64-character SHA-256 hex.

Validated vectors include:

- `["alpha","beta"]` → `138bf4722f7ae17122c7282d0eb156499d349940e129bd4cdf27c8ffdcbb3d25`
- `["에스파","결정"]` → `c151adb59df354978ed6a83453d627e296e4156e6b64ddd416419a7562d102a4`
- `[""]` → `055539df4a0b804c58caf46c0cd2941af10d64c1395ddd8e50b5f55d945841e6`
- `["a|b","x,y:{}[]"]` → `02fc2a388dacacb8342b53d2e7d44da7360db11f991ff47e2552f24df8951d39`

Application identity preserves v65’s exact order: contract version, decision input ID, decision preview ID, queue ID, gate ID, internal source ID, decision intent, input hash, historical-state hash. Expected-state fingerprint order is the seven immutable identity values followed by queue status, current decision status, and existing application ID (`null` when absent), using the same canonical algorithm and checked immediately before the logical atomic operation.

## Copied state and record schemas

`copied_state_v1` has fixed sections `/identity`, `/decision`, `/review_queue`, `/source`, and `/application`. Seven identity paths are immutable. Ten proposal-mutable paths cover decision outcome; queue status/flags; and application identity, status, applied time, and contract version. Historical initial state supplies the intent, `pending_review`, and `not_decided`; proposal-only fields start as explicit null/boolean defaults. Source eligibility is `unchanged`.

The application schema pins 20 fields with type, required condition, source, normalization, provenance, and safe-summary visibility. It includes exact lineage, outcome/status, reviewer metadata, hashes, version, and context-sourced `applied_at`. `reviewer_note` remains optional, preserved only in restricted records, and invisible to safe summaries. Enrichment fields exist only for `request_enrichment`.

The audit schema pins 14 fields: application/target identity, reviewer, intent, before/after fingerprints, version, result, and conditional failure reason. Result vocabulary is `applied`, `failed`, `conflict`, `idempotent_existing_result`, and `no_action`. Failure reasons are limited to missing/invalid context, unsupported intent, broken linkage, stale fingerprint, conflicting duplicate, already-applied conflict, and atomic component failure.

## Atomicity, isolation, and readiness

Actionable success requires all four logical components: application record, decision outcome, queue state, and audit event. Failure or conflict changes no mutable copied-state component; partial success is forbidden. This remains specification only—no transaction or simulation runs.

Source eligibility remains unchanged. Scores, rankings, charts, public data, and production state remain disconnected. No AESPA source/review/decision state changed, and no application or audit record was written.

All five executable gaps are resolved with no critical local-simulation semantic left unresolved. Therefore `future_local_simulation_executable_spec_readiness=ready`; `production_application_readiness=not_ready`.

## Validation and boundary

The self-test passed 39 checks. First/reproduction SHA-256 pairs are:

- executable semantics: `d6956c3714bdb58b57b08afd1f21ec6b50ad1cfb0da6553216af6f3333e79ded`
- transition table: `bf22dff06cc32d324fd45d61c3b349008b9a68a4b7f39d6e7d1c31df2331c904`
- hash vectors: `d427cdb4ca38dda4729727757fd474a3f0078ba29f68444182d578e7fa35fdaa`
- schema vector: `1c4b620b818d5ec9aee10f7cff872385fb2368b5fa465861a013752f8ffc65c2`
- validation: `f5fc93dd8ff0202d05fd04eb02f88a51726044813d73dc2ee5b6e132f3cbe95c`

Historical state remains 1,000 templates, 1,000 pending reviews, and 1,000 not-decided records, with zero submissions, approvals, rejections, decided records, applications, and audits. Execution, simulation, copied-state mutation, source/queue/decision mutation, audit writes, production effects, and external writes are zero.

Runtime output stays beneath ignored `tmp/source-sandbox/naver/aespa-application-contract-executable-semantics*`. Tracked scope is exactly the contract, validator/preview script, and this document. A future v67 may use the tracked v66 contract as its sole transition authority plus historical modules only for validation and linkage facts.
