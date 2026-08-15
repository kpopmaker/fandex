# AESPA explicit human shadow decision execution preview (v73)

## Purpose and authority chain

v73 executes one explicitly operator-confirmed decision against one deterministically selected real AESPA review target, but only inside the validated disposable local shadow pipeline. v72 was required because the historical validator required enrichment fields without defining a closed vocabulary; the merged v72 proposal supplies `content_context` and `source_attribution` for additive controlled validation.

The historical decision contracts and validator remain authoritative for decision intent, rationale, metadata, and lineage. v61, v62, and v63 remain the intake, staging, and local authorization boundaries. v66 owns transition and application/audit semantics, v68 owns the atomic request interface, v70 owns orchestration, and v69 owns process-local in-memory persistence. v71 owns deterministic real-target selection. v72 owns only the proposed enrichment-field vocabulary.

Prerequisites were verified as follows:

- v70 `local_end_to_end_orchestrator_conformance`: `passed`
- v70 shadow readiness: `ready_for_separate_shadow_execution`
- v71 `real_source_shadow_execution_conformance`: `passed`
- v71 explicit-human readiness: `ready_for_separate_explicit_human_shadow_run`
- v72 `enrichment_request_field_contract_conformance`: `passed`
- v72 explicit-human readiness: `ready_with_v72_enrichment_contract`
- Production persistence and execution readiness: `not_ready`

## Operator-confirmed human decision

The human chose `request_enrichment` because they want only additional article content and source/attribution information before deciding. The confirmed input is:

- `reviewer_id`: `jm-reviewer-001`
- `reviewer_note`: present; SHA-256 `29a513531f76605c68ec4f1c37c1c10008a066194f063150e3ca00026d705ff0`
- `reviewed_at`: `2026-08-15T16:16:00Z`
- `application_context.applied_at`: `2026-08-15T16:16:00Z`
- `decision_intent`: `request_enrichment`
- `rationale_codes`: `enrichment_required`, `attribution_enrichment_required`, `insufficient_evidence`
- `requested_enrichment_fields`: `content_context`, `source_attribution`

Both timestamps are independently operator-confirmed fixed inputs. No identity-uncertainty rationale or additional enrichment field was introduced. The confirmed submission and context raw-byte hashes are respectively `2c05d40f213404c5027347d1668f81e09dc18cfe41e82f6d03dab07371dddd6f` and `66b27191d2191aebdf5b557ad6ddf2a09fdcb2a598d770b79ffecf2c561d4d8e` before and after execution.

## Real target and historical state

The exact v71 algorithm sorted all 1,000 eligible records by the seven-field immutable lineage tuple and selected index zero. The resulting target is:

- `decision_input_id`: `00de9317942918a736a24d6790e4c17fb1260b5cc2c2f820b339cf66b07be6f4`
- `decision_preview_id`: `55f2ac49c067a0f8efbf3e159aac1e523325964e521131dfdeabbb47bd14badc`
- `queue_id`: `queue_ef27330d9175d5aa91cba30030992e85168cbcdec18e2fc83699eddf01812b43`
- `gate_id`: `gate_17f644959e2a90cdc6d40a2874d47b2d500440052e83078f2122e1784a7c6a64`
- `internal_source_id`: `src_40f253cea60253b4f7b8d1e747f9cc87`
- `sandbox_artist_key`: `sandbox:artist:aespa`
- `source_type`: `news`

The real historical target was and remains `pending_review` with decision `not_decided` and gate `exception_review_required`. Local safe context confirms provider `naver`, hostname `www.mydaily.co.kr`, publication time `2026-06-19T00:10:00+09:00`, mapped artist status, and confirmed mapping evidence. Title, summary excerpt, and author-or-publisher remain absent.

## Validation and execution

The exact historical validator returned valid with effect classification `would_record_enrichment_request`. The merged v72 pure validator returned `valid` and preserved canonical order `["content_context", "source_attribution"]`. v61 intake, v62 actionable staging, and v63 local-shadow authorization all passed.

The exact v66 `request_enrichment` row resolved to:

- Decision outcome: `enrichment_requested`
- Queue status: `enrichment_requested`
- Queue active: `true`
- Review resolved: `false`
- Enrichment required: `true`
- Application status: `applied`
- Audit result: `applied`
- Source behavior: `unchanged`
- Downstream behavior: `disconnected`
- Required context: `applied_at`

v73 called the hash-pinned public v70 `orchestrate` surface. v70 built the exact v68 request and initialized a fresh v69 adapter. The primary atomic apply returned `applied`. Its deterministic application ID is `120e53844eab4ae5529114d188237b24a964712b4ceeda743cff1b6249be40d1`.

The application and audit conform exactly to the v66 field schemas. The audit result is `applied`; the shadow decision outcome is `enrichment_requested`; the shadow queue status is `enrichment_requested`. The before and after fingerprints are `55b340d3a8edbd2e50cffbdd15e967e9f5b63c2be6fb409281bd0f2ab2d08151` and `7537727be630d8a9b4f0f3c70843c67ae9c6588326e81a35ee9be8dd58a05d84`.

Read-after-write verified the application digest, audit digest, v66 decision and queue state, exact enrichment and rationale arrays, reviewer identity, note hash, reviewed timestamp, applied timestamp, unchanged source state, unchanged identity, recomputed fingerprint, and exactly one in-memory application plus audit.

## Human-decision fidelity and safety tests

All operator-confirmed semantic fields were preserved exactly. Requested enrichment fields remained in v72 canonical order, and no extra rationale or enrichment field appeared. General safe summaries contain only reviewer-note presence and SHA-256 rather than repeating the note.

An exact retry on the same adapter returned `idempotent_existing_result` with no duplicate application or audit. A copied-shadow conflicting request returned `conflicting_duplicate` / `conflicting_application_identity`. A fresh copied-state request with a stale fingerprint returned `stale_state_conflict` / `stale_state_fingerprint_mismatch`. No real historical state was altered for these tests.

## Real versus shadow

- Historical before: decision `not_decided`, queue `pending_review`, zero application/audit records.
- Shadow after: decision outcome `enrichment_requested`, queue `enrichment_requested`, one process-local application and audit.
- Historical after: independently rebuilt as decision `not_decided`, queue `pending_review`, zero application/audit records; byte hashes equal historical before.

The shadow transition is not a historical decision application. All semantic shadow state exists only in fresh v69 process memory and disappears with process exit. Ignored JSON files are execution evidence, not semantic persistence.

## Zero effects and external boundary

Every real counter is zero, including human submission/decision writes, enrichment-request persistence, application/audit writes, queue/source mutations, database/storage/external writes, score/ranking/chart/public-data changes, and production effects. No Supabase or database persistence occurs. No article content or source attribution is retrieved in v73, and no external URL, Naver, or enrichment provider is called.

## Determinism

Independent first/reproduction hashes match:

| Evidence | SHA-256 |
| --- | --- |
| Operator input fidelity | `1e347764bfa03907bcc45d891afc85b94768e78f75b6a38097ae1035a069e080` |
| Selected target | `cab461a5d7b3ae5aa934482c7fe08ce9c44e6603fc6546926e9ceeb42d23b209` |
| Historical before/after | `d23c6df8b46cebb166b6f34270c4e2eb00489919bf04fb6b01f4925d84c41b56` |
| v72 validation | `c113d8b120b3620a691fc1061741987b69dedbfca9da61b8df8bd84e1fe9b5f6` |
| Pipeline trace | `2b63db5d9f809787d6447dbb5ea22c087a7de5c66fc7badd07557534f53f07e8` |
| Shadow application | `f84f6861d34246048e419b15d2041e7fa1e043e3df51d314610bb28196f20238` |
| Shadow audit | `e774c3a065bd3520d388d3649296597a93dbc7f812ec22d6c3cce67001b9bf83` |
| Shadow after | `2644051009557da08d6164b860dfc14d53f864c6e414535dfc18e330d7950e86` |
| Real-versus-shadow comparison | `36f91251e8e18544601af4e79dc09e31cbee5066dd64aec24b7ce4a5c817d51f` |
| Historical immutability | `0ee18ef0d2e22576ccef4a125b253797f8ec2fdc0315a3fe2f0550b3220ecbcc` |
| Validation summary | `03274c7db58a4857eefc36856e112e67f60f34934e1424fa71febdcce28f6061` |

The standard-library self-test passes all 41 required checks.

## Readiness and next-stage boundary

- `explicit_human_shadow_decision_execution_conformance`: `passed`
- `future_enrichment_fulfillment_shadow_readiness`: `ready_for_separate_enrichment_fulfillment_shadow_design`
- `production_persistence_readiness`: `not_ready`
- `production_execution_readiness`: `not_ready`

The next stage may separately design enrichment fulfillment for `content_context` and `source_attribution`, but must first define allowed providers, retrieval authorization and boundaries, evidence/provenance schema, copyright-safe capture, attribution recovery, partial/failure handling, and historical write boundaries. v73 does not retrieve or fulfill enrichment and does not proceed automatically.

v73 executes an explicitly operator-confirmed human decision only in a disposable local shadow environment. The real AESPA target is not changed. The real queue remains `pending_review`; the real decision remains `not_decided`. No FANDEX score, ranking, chart, or public data changes.
