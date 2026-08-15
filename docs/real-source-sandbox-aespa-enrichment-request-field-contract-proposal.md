# AESPA enrichment-request field contract proposal (v72)

## Purpose and blocker

The explicit-human AESPA shadow-decision preparation exposed a real contract gap. The historical decision vocabulary supports `request_enrichment`, and the historical validator requires `requested_enrichment_fields` to be a non-empty duplicate-free array. It does not define or enforce a closed vocabulary for the array elements. Consequently, the human statement “I want to check the article content and source information further before deciding” could not be translated into authoritative field names without inventing semantics.

v72 proposes that missing semantic layer. It is proposed authority only for future controlled validation of enrichment field names. It has `historical_authority = false` and `production_authority = false`; historical decision intent, rationale, lineage, and review validation remain authoritative and unchanged.

## Existing source-model inventory

The proposal is grounded in tracked source stages rather than fixture spelling:

| Concept | Existing fields | Existing stage and behavior |
| --- | --- | --- |
| Human-readable title | `normalized_source.title`, `review_queue.title` | Normalized for news/blog and projected into the historical review queue. |
| Human-readable summary | `normalized_source.summary`, `review_queue.summary_excerpt` | Normalized for news/blog; the queue deliberately exposes a cleaned bounded excerpt. |
| Author/publisher attribution | `normalized_source.author_or_publisher`, `review_queue.author_or_publisher` | Attribution field used by quality and gate semantics. Missing news attribution causes review. |
| Provider identity | `provider_key` | Provider context, present on the selected target, but not sufficient attribution. |
| Source location | `source_url` and its hostname/domain | Location context, present on the selected target, but not sufficient attribution. |
| Publication time | `published_at` | Existing temporal context, present on the selected target. |
| Artist relevance evidence | mapping `matched_aliases`, `evidence_fields`, `evidence_level` | Separate mapping evidence; it is not part of this human request. |

The selected real target `src_40f253cea60253b4f7b8d1e747f9cc87` has provider key, URL/domain, publication time, mapped artist identity, and confirmed mapping evidence. It lacks title, summary/snippet, `author_or_publisher`, and detailed attribution recovery. Its tracked gate reasons include `missing_author_or_publisher`, `provider_attribution_unavailable`, and `attribution_recovery_unavailable`.

## Minimal proposed closed vocabulary

The exact `allowed_requested_enrichment_fields` are:

1. `content_context`
2. `source_attribution`

These are semantic requests describing what a reviewer needs, not provider APIs, database columns, retrieval strategies, or temporary fixtures.

### `content_context`

This requests enough locally represented human-readable content to understand what the item is about. It maps to `title`, `summary`, and the queue’s bounded `summary_excerpt`. Completion requires both a non-empty title and a non-empty summary or bounded excerpt. A URL, hash, or title alone is insufficient. A full article body is not required and must not be dumped when title plus bounded summary/excerpt is sufficient.

### `source_attribution`

This requests enough attribution to identify who authored, published, or otherwise bears responsibility for the item. It maps primarily to `author_or_publisher`, with `provider_key` and source URL hostname/domain as contextual evidence. Completion requires a non-empty `author_or_publisher`; provider key and domain alone cannot complete the request because the tracked gate classified the selected target’s attribution as insufficient despite both being present.

## Validation and canonicalization

The pure v72 proposal validator accepts an array of exact strings and does not modify the historical validator.

- Multiple proposed keys may be requested together.
- Exact strings are used: no trimming or case folding.
- Valid values are reordered to `content_context`, then `source_attribution`.
- An empty array returns `invalid_empty`.
- A duplicate returns `invalid_duplicate`.
- An unknown value returns `invalid_unknown_enrichment_field`.
- A non-array or non-string element returns `invalid_type`.
- A valid request returns `valid` plus its canonical field array.

The historical behavior is deliberately distinguished: it accepts arbitrary non-empty unique values and has no unknown-key failure. v72 proposes a future closed vocabulary; it does not claim that this vocabulary existed historically.

## Fixture examples

The discovered strings `author` and `provider_attribution` occur only in synthetic/self-test fixtures. Both are classified `controlled_fixture_only`; neither is promoted into the v72 vocabulary. The proposed keys are independently justified by the source model and review semantics.

## Human requirement mapping

The actual human needs map deterministically as follows:

- Article/content information → `content_context`
- Source/attribution information → `source_attribution`
- Combined canonical request → `["content_context", "source_attribution"]`

No identity, duplicate, score, ranking, or sentiment request is implicitly added. This mapping defines contract semantics only and does not populate the ignored operator submission.

## Validation evidence and determinism

The standard-library preview performs 26 checks covering preflight/provenance, reproduction of the historical arbitrary-string gap, fixture classification, source inventory and field metadata, unique keys and canonical order, valid single/multiple requests, all four failure categories, selected-target expressibility, unrelated-field exclusion, input immutability, operator-template immutability, zero execution/effects, and first/repro determinism.

First/reproduction SHA-256 pairs match:

| Evidence | SHA-256 (first = repro) |
| --- | --- |
| Source-model inventory | `31289ef4450c233ce0fe4b4264ad96193427f179096d4be0895363ababd8620e` |
| Canonical vocabulary | `07e5d9c7212090a544c40cf41507f8f7d5c88e1ae3c64ae56531218d35ca76dd` |
| Human requirement mapping | `c7de7b014bdbd14fdb5168fb158ae1adb1d51f67265ed899200f948ea4772e9a` |
| Validation cases | `b82164af90536fc09757444d2cba827e0a2558e9810036eb6744f03b1d300600` |
| Validation summary | `758c7f33ccd9c28e625b3572a4263f185dd3dafa152a39b28025a467cefe612a` |
| Safe summary | `7fff26cb7b2b95fdf9c0252d2ab62fb91af7c3d36c35ae2a2c7154298e6df813` |
| Fixture classification | `bfae86f33bc0b25f81111a6899123d0c5a3de8b86c7a50c88726037aff078411` |

All human-decision, v70, v69 atomic-apply, application-record, audit-record, queue-transition, decision-transition, source-mutation, real-effect, and production-effect counters are zero. Historical tracked artifacts and both ignored operator templates remain byte-identical.

## Safety boundaries

v72 does not perform a human decision. v72 does not modify the historical human-review validator. v72 does not change existing historical decisions. v72 does not retrieve external article data. v72 does not persist enrichment requests. v72 does not execute v70 or v69. It creates only deterministic ignored validation evidence and the three allowed tracked proposal files.

## Readiness and next stage

- `enrichment_request_field_contract_conformance`: `passed`
- `future_explicit_human_shadow_decision_readiness`: `ready_with_v72_enrichment_contract`
- `production_persistence_readiness`: `not_ready`
- `production_execution_readiness`: `not_ready`

After this proposal is merged, v73 may return to the explicit human-authored local shadow decision. The existing human intent remains `request_enrichment`, with content and attribution insufficiency as its rationale. v73 may map it to `["content_context", "source_attribution"]`, but must still obtain explicit `reviewer_id`, `reviewer_note`, `reviewed_at`, and `application_context.applied_at`. v72 does not perform v73.
