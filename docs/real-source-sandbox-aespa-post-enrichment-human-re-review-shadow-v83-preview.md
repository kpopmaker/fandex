# AESPA post-enrichment human re-review shadow preview (v83)

V83 is packet-only. It binds the tracked v73 human `request_enrichment` context to a fresh, successful v82 controlled shadow fulfillment and prepares one deterministic safe packet for future human re-review. It makes no new decision and leaves the historical decision unchanged.

## Authority and reuse

The prerequisite is v82 conformance `passed` with readiness `ready_for_separate_human_re_review_shadow_stage`. V83 imports the real v82 module and invokes `LocalEnrichmentFulfillmentOrchestrator.run_controlled` for every primary build. V82 continues to delegate evidence schema, identity, planning, acceptance, lifecycle, completion, and safe-result behavior to v81. V83 does not duplicate those semantics or inspect private v81/v82 state.

The historical authority is the tracked v73 explicit-human-decision contract. It records request `4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283`, reviewer `jm-reviewer-001`, reviewed time `2026-08-15T16:16:00Z`, rationale codes `enrichment_required`, `attribution_enrichment_required`, and `insufficient_evidence`, and canonical requested fields `content_context`, then `source_attribution`. Its seven-field target lineage must exactly equal the public v82 safe-result lineage.

## Packet and identity

The closed packet contains `packet_version`, `packet_id`, `status`, `request_id`, `target_identity`, `original_human_review`, `original_enrichment_request`, `shadow_fulfillment_summary`, `requested_field_review_summary`, `decision_boundary`, `human_re_review_required`, `real_historical_enrichment_request_fulfilled`, and `effects`. Status is only `ready_for_human_re_review` or `failed_closed`.

The packet ID is SHA-256 over the complete safe packet with `packet_id` excluded. Serialization is UTF-8 canonical JSON with sorted keys, compact separators, preserved Unicode, and one trailing LF. Each top-level field is traced to historical authority, the v82 public result, or v83-derived metadata.

The historical-review section preserves the existing decision, reviewer, timestamp, rationale codes, and requested fields. The original-request section carries only request and target lineage. The shadow section carries safe orchestration status, completion/lifecycle metadata, safe provenance classes, `synthetic_shadow = true`, and `external_verification_performed = false`. Each requested-field summary reports only completion, lifecycle, safe evidence presence/provenance, and that real-world verification was not performed. It contains no raw synthetic fixture values or article body.

## Decision and evidence boundary

`request = satisfied` means only that the controlled synthetic shadow fulfillment contract is satisfied. It does not mean that a source is accepted, the historical review is resolved, or an article is externally verified. The machine-readable boundary keeps `historical_decision = request_enrichment`, `historical_decision_changed = false`, `automatic_decision_performed = false`, `recommended_decision = null`, and `human_re_review_required = true`. The real historical enrichment request remains unfulfilled.

V83 does not retrieve MyDaily. V83 does not call Naver. V83 does not externally verify the synthetic evidence. V83 does not fulfill the real historical enrichment request. V83 does not change the historical `request_enrichment` decision. V83 does not recommend a human decision. V83 does not approve or reject anything. V83 only prepares a deterministic safe packet for future human re-review.

## Fail-closed safety

The builder fails closed, without retry or mutation, for a wrong historical decision; request, target, or requested-field mismatch; unsuccessful, unsatisfied, partial, or read-only-real-target v82 output; a false human-review flag; a real-request-fulfilled claim; any prohibited effect; missing public lineage; unsafe evidence dependency; or a requested recommendation. Negative test doubles are confined to these impossible/error shapes. Primary success, replay, lineage, and readiness use fresh real v82 executions.

Returned packets are deep detached copies. Two fresh runs, reordered historical dictionary keys, packet IDs, and canonical packet hashes must agree. Historical inputs, directly consumed v75/v73 authority, v81/v82 code/contracts/docs, and Last.fm files are hashed before and after. Runtime evidence is ignored under the two v83 `tmp/source-sandbox/naver/` directories. All network, external retrieval, database, persistence, historical-write, decision, scoring, ranking, chart, public-data, and production counters are zero.

When every check passes, conformance is `passed` and future readiness is `ready_for_separate_human_re_review_decision_input_stage`. External enrichment and production persistence/execution remain `not_ready`. A separate v84 may pair this packet with a blank human decision input, but it must not preselect or execute a decision; v84 is outside this stage.
