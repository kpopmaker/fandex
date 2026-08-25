# Public historical-request closure boundary v110 preview

V110 adds an additive public pure boundary with the reusable APIs `validate_input`, `derive_authorization`, and `apply_closure`. Its closed vocabularies are request state `open|closed`, closure authorization `not_authorized|authorized`, and outcome `closed|idempotent_existing_result|rejected`. It uses v67 copied-state pointer, exact-diff, and canonical-digest primitives; queue status `resolved` is never treated as request closure.

The AESPA fixture preserves v109's historical `request_closure_authorized: false` and adds a distinct later authorization from actor role `project_owner`, intent `authorize_closure`, and the exact NFC human rationale `두 요청 필드가 충족되고 승인된 정규화 적용이 완료됨` (29 code points). Personal identity is absent, and the human rationale remains separate from system-derived closure predicates.

The first pure copied-state application closes the derived request by changing only `request_state`, `derived_request_closed`, and `closure_record_reference`. Exact replay returns `idempotent_existing_result` with no diff; conflicting replay is rejected. The normalized copied record remains unchanged.

Derived fulfillment and closure are true, while persistent fulfillment and closure remain false. Sandbox normalization lifecycle completion makes production-persistence readiness evaluation eligible, but that evaluation is not performed. No store, database, queue, retrieval, network, persistence, or production effect occurs.

Run `py -3 -B scripts/source-sandbox/preview_historical_request_closure_boundary_v110.py` for compilation-compatible deterministic first/replay output, JSON parsing, exact closure-diff and authorization checks, idempotency, immutability, and the fail-closed negative matrix.
