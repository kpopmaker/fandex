# AESPA accepted-evidence field-satisfaction v94 preview

This offline sandbox preview consumes the public v93 acceptance boundary and evaluates exactly `content_context` and `source_attribution`. It reuses the public pure v75 `completion` evaluator, whose inherited rules are title plus summary or bounded excerpt for content context, and author or publisher for source attribution.

The accepted content candidate supplies the exact title and a non-empty, 121-code-point NFC summary, uses the allowed component shape, and retains no full article body. The accepted attribution candidate supplies the explicitly observed publisher `마이데일리` with semantic role `publisher`; it is not inferred from a hostname, provider key, or office code, and no author is fabricated.

Both fields are currently satisfied, so historical fulfillment is eligible for a separate next stage. The historical request is not fulfilled or closed. Normalized-record application is not performed; human re-review and decision/application remain blocked; production remains not ready. Retrieval and human-submission counts are unchanged, and every network, persistence, mutation, and production-effect counter remains zero.

Run `py -3 scripts/source-sandbox/preview_aespa_accepted_evidence_field_satisfaction_v94.py --self-test` for the deterministic first/replay build and fail-closed negative matrix. Generated output and the pinned screenshot remain ignored under `tmp/`.
