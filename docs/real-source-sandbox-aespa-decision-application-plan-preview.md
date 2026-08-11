# AESPA decision application plan preview

## Purpose and boundary

The earlier copied-state simulation correctly stopped because repository history supplies validation and dry-run classification but no authoritative persisted state transformation. v64 converts that limitation into a deterministic readiness and gap-analysis plan. It does not apply a decision. It does not simulate invented state changes. `would_record_*` is an abstract historical effect label and is not automatically a persisted field transition. A `not_ready` result is an expected valid outcome.

No human submission is accepted or created. No AESPA review, decision, source, score, ranking, app, public, or production state changed. No production action occurred.

## Historical provenance and discovered behavior

The inspected evidence is pinned as follows:

| Role | Module | SHA-256 |
|---|---|---|
| Authoritative validator | `validate_human_review_decisions.py` | `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31` |
| Decision template builder | `prepare_human_review_queue.py` | `694b1f541218ae9c6697422319b7966b2985f168bc0bc7d98dc00502f90c5819` |
| v58 dry-run | `preview_aespa_decision_application.py` | `fa4e59b18d1a8bddf50c1244175e358b736569b11aeb5ff2a7434a045a3f4d81` |
| v59 submission preview | `preview_aespa_human_decision_submission.py` | `170247bedeaeff928aec81af50a3d0fa3f076b9a8d51057f025c8e539faca5e0` |
| v60 controlled fixture | `preview_aespa_controlled_human_decision_fixture.py` | `3964f61a9899888bdc0b5f7dfe6afc4efb320454965bfdb531e683f172e24ace` |
| v61 intake | `preview_aespa_human_authored_decision_input.py` | `ad1ba38a4ac37d71445626978e92aae1271383cc10dfd3d90e7ccf40c7bf90aa` |
| v62 staging | `preview_aespa_human_decision_acceptance_staging.py` | `720f13ceb4c75e799e5a41554c6454f0b8b800ab722361b58f7626610eb758ee` |
| v63 authorization gate | `preview_aespa_decision_application_authorization_gate.py` | `7e695faed8673af25e96e80842cabee68d70129b996903c3dc28fdebdec2702f` |
| Input contract | `human_review_decision_contract.preview.json` | `0a3706684c19f4c86589a1ad99039256f9c7d1aa6bc62f8d2d054cdac147a07c` |
| Application dry-run contract | `human_review_decision_application_contract.preview.json` | `d76a820d160916e6b90a8648ced00aee6c879c3c0222c3d2b4f785978e8c4120` |

Historical main routines are not executed. v61's read-only context helper verifies the 1,000-record historical lineage and its hashes.

The exact vocabulary is `not_decided`, `approve_candidate`, `accept_exception`, `reject`, `defer`, and `request_enrichment`. The validator classifies `not_decided` as `no_action`; all other valid intents are `would_require_explicit_application`. Their dry-run effects, in order, are `no_change`, `would_record_approval_decision`, `would_record_exception_acceptance`, `would_record_rejection`, `would_record_deferral`, and `would_record_enrichment_request`.

The application contract explicitly sets `dry_run_only=true` and `production_policy=false`. Historical output sets `production_write_status=not_written`, `approval_snapshot_status=not_created`, `audit_event_status=not_created`, and `score_application_status=not_applied`.

## Semantic coverage matrix

| Intent | Classification | Abstract effect | Concrete transform | Write/schema | Ready |
|---|---|---|---|---|---|
| `not_decided` | `no_action` | `no_change` | not applicable | not applicable | yes, for no-action only |
| `approve_candidate` | explicit application required | `would_record_approval_decision` | not defined | not defined | no |
| `accept_exception` | explicit application required | `would_record_exception_acceptance` | not defined | not defined | no |
| `reject` | explicit application required | `would_record_rejection` | not defined | not defined | no |
| `defer` | explicit application required | `would_record_deferral` | not defined | not defined | no |
| `request_enrichment` | explicit application required | `would_record_enrichment_request` | not defined | not defined | no |

Defined semantics are the input vocabulary, gate-specific validation and metadata requirements, rationale/enrichment validation, no-action behavior, abstract effect labels, classification, deterministic IDs, and dry-run non-effect statuses. These support inspection but do not define application writes.

The seven semantic categories resolve to one `partially_defined` category (decision input versus persisted decision record), three `classification_only` categories (source-state labels, dry-run audit non-creation, and dry-run downstream non-effects), and three `not_defined` categories (queue/review lifecycle, write mechanics, and failure/recovery). No application category is fully defined.

## Blocking requirements and readiness

The deterministic critical blockers are:

- `missing_concrete_decision_transition`
- `missing_queue_transition`
- `missing_persisted_decision_schema`
- `missing_write_target`
- `missing_audit_schema`
- `missing_idempotency_semantics`
- `missing_failure_recovery_semantics`

These cover resulting decision/queue state, metadata persistence, defer/enrichment lifecycle, persisted representation, concrete target and insert/update behavior, snapshots/audit attribution, duplicate/conflict/stale-state protection, atomicity, retry, rollback, partial failure, and already-applied behavior. Source eligibility and any real scoring/ranking/public-data relationship also remain undefined beyond the historical dry-run prohibition.

Accordingly, `application_implementation_readiness` is `not_ready`. Missing semantics are recorded as unresolved requirements rather than inferred field assignments or implementation proposals.

## Execution, determinism, and safety

Run `py scripts/source-sandbox/preview_aespa_decision_application_plan.py` or add `--self-test`. Runtime JSON is written only beneath ignored `tmp/source-sandbox/naver/aespa-decision-application-plan/`, with an independent `-repro` directory. Artifacts contain the canonical coverage plan, validation/count evidence, unresolved requirements, and safe summary.

The self-test passed 31 checks. First/reproduction SHA-256 pairs are:

- canonical plan: `36167c6195403958adebb6341aef20d5dc49768d710abb49a3147699b3894897`
- validation: `b33b4b427fe7efa6009c8b4cfffb11aff97fe38ca00a6b69f68b082a434382ae`
- requirements: `1a01c71d7af78c4d620141509b2d838b1d6be3ad33d10c4a1c9f0720e36901f1`

Historical AESPA state remains 1,000 templates, 1,000 `pending_review`, and 1,000 `not_decided`, with zero actual submissions, approvals, rejections, decided records, staged records, authorization records, and applications. Decision application, source mutation, review-queue mutation, decision-state mutation, production mutation/effect, and external-write counts are zero.

Tracked scope is exactly the v64 contract, plan implementation, and this document. The next stage may propose a separate application-state contract that explicitly distinguishes historical facts from new FANDEX semantics and receives separate review. v64 stops at historical inspection, coverage matrix, missing-requirement extraction, readiness result, and STOP.
