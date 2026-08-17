# AESPA human re-review decision input preview (v84)

V84 is an input-template stage only. It imports v83, generates a fresh `ready_for_human_re_review` packet, binds that packet's ID, request ID, and seven-field target identity, and returns a deterministic blank human re-review input. It has no submission, application, execution, decision, evidence, or persistence store.

## Authority and blank representation

V83 conformance is `passed` and its decision-input readiness is `ready_for_separate_human_re_review_decision_input_stage`. Packet generation is delegated to v83; v82 orchestration and v81 adapter semantics remain transitively delegated. V84 does not reproduce packet composition or earlier lifecycle, completion, planning, acceptance, or hashing semantics.

The canonical vocabulary comes from `human_review_decision_contract.preview.json::decision_intents`, with v61's human-authored-input contract confirming the same authority order: `not_decided`, `approve_candidate`, `accept_exception`, `reject`, `defer`, `request_enrichment`. V84 adds, removes, ranks, weights, and reorders none of these values.

The tracked v57 `prepare_human_review_queue.py::decision_template` and decision-input contract define blank decision intent as `not_decided`, reviewer and reviewed time as null, and rationale codes as an empty array. Consequently, v84 uses `selected_decision = not_decided` solely as the authority-defined blank placeholder. It is not a submitted decision and `decision_preselected` remains false. Null is rejected for this field because it differs from the exact historical blank authority.

## Closed input and identity

The closed schema contains `decision_input_version`, `decision_input_id`, `status`, `packet_id`, `request_id`, `target_identity`, `allowed_decisions`, `selected_decision`, `reviewer`, `reviewed_at`, `rationale_codes`, `human_input_required`, `decision_submitted`, `decision_boundary`, and `effects`. Status is only `awaiting_human_input` or `failed_closed`.

The new decision-input ID hashes only version, packet ID, request ID, target identity, and authority-ordered vocabulary. It excludes editable human fields and the ID itself. Serialization is UTF-8 JSON with sorted object keys, compact separators, preserved Unicode, one trailing LF, and lowercase SHA-256 hexadecimal. This ID is v84 shadow metadata, not a historical decision, application, audit, or submission ID.

The new reviewer and reviewed-at fields are null and the new rationale array is empty. Historical `jm-reviewer-001`, its tracked timestamp, historical rationale codes, and `request_enrichment` remain read-only context inside the linked v83 packet and are never copied into the new entry fields.

The decision boundary states that human input is required, no decision was submitted or preselected, no automatic decision or execution occurred, the historical decision did not change, and the recommendation value is null. V83's factual boundaries remain intact: controlled evidence is synthetic shadow evidence, external verification was not performed, and the real historical enrichment request remains unfulfilled. Those facts are not ranked or transformed into a decision signal.

## Safety and failure behavior

V84 fails closed without retry or mutation for an unready or incomplete packet; lineage mismatch; altered historical decision; false human-review or synthetic marker; external-verification or real-fulfillment claim; altered vocabulary; any nonblank reviewer, timestamp, or rationale; any selected value other than the authority-defined blank placeholder; a recommendation/default/preference signal; submitted state; or execution state. Negative test doubles are limited to these failure shapes. Primary success, lineage, replay, and readiness use fresh real v83 flows.

Returned inputs and retained packet context are detached copies. Two fresh builds, canonical input hashes, input IDs, and reordered identity-object keys agree. Direct historical authorities, v83 files, transitively loaded v81/v82 files, and Last.fm inputs are byte-identical before and after. Runtime evidence is ignored under the two v84 `tmp/source-sandbox/naver/` directories. All network, retrieval, database, persistence, historical-write, submission, recommendation, execution, scoring, ranking, chart, public-data, and production counters are zero.

V84 does not make a human decision. V84 does not preselect `not_decided` except as explicitly required by the tracked blank-input authority. V84 does not preselect `approve_candidate`. V84 does not preselect `accept_exception`. V84 does not preselect `reject`. V84 does not preselect `defer`. V84 does not preselect `request_enrichment`. V84 does not copy the historical reviewer into the new reviewer field. V84 does not copy the historical timestamp into the new reviewed-at field. V84 does not submit or apply anything.

When every check passes, conformance is `passed` and the separate v85 submission-preview readiness is `ready_for_separate_human_re_review_decision_submission_preview`. External enrichment and production persistence/execution remain `not_ready`. V85 may validate a future explicit controlled human entry but must not apply it to historical state; v85 is not implemented here.
