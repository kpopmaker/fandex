# AESPA historical-request fulfillment v95 preview

This offline sandbox preview consumes the public v94 field-satisfaction boundary for request `4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283` and target `src_40f253cea60253b4f7b8d1e747f9cc87`. It evaluates exactly `content_context` and `source_attribution` through the public, pure, non-mutating v75 `completion` evaluator.

The complete request-to-candidate-to-verification-to-acceptance-to-satisfaction-to-aggregate lineage is digest-bound. Both exact satisfaction records are true, the request aggregate is true, and fulfillment eligibility is `eligible`. The bounded project-owner authorization therefore permits one deterministic derived v95 preview record with outcome `fulfilled` and human re-review eligibility `eligible`.

This is not a persistent request-state transition. The historical v90 request remains unfulfilled and unclosed; normalized-record application remains `not_performed`; human-review readiness and decision/application readiness remain `blocked`; production remains `not_ready`. No review packet or decision is created. Retrieval counts remain two automated attempts, zero successes, and one human evidence submission. v95 performs zero source-network reads and every external, persistence, mutation, and production-effect counter is zero.

The exact title, bounded 121-code-point NFC summary shape, explicit publisher attribution, provenance, archive, ignored screenshot, and all predecessor artifacts are revalidated locally. The full article body is neither retained nor printed. The evaluation timestamp is the pinned publication timestamp, never the wall clock.

Run `py -3 scripts/source-sandbox/preview_aespa_historical_request_fulfillment_v95.py --self-test` for compilation-compatible deterministic first/replay output, JSON parsing, digest recomputation, immutability checks, and the complete fail-closed negative matrix.
