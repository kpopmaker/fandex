# AESPA human re-review decision submission v97 preview

This offline sandbox preview consumes the exact ready v96 packet and reuses the public v84 decision vocabulary plus public v86 validation behavior. The corrected project-owner decision is `request_enrichment` for the `exception_review_required` gate; the previously rejected `approve_candidate` value is never submitted.

The exact NFC human-authored rationale is preserved separately from the canonical `enrichment_required` classification and from system-derived lineage facts. Only the role-based actor identifier `project_owner` is retained. No personal identity or fabricated timestamp is present.

Public v86 validates one detached decision input and produces one structurally valid submission preview. Human review, capture, and preview submission are true, while enrichment-request creation remains only eligible: no request is created, queued, persisted, retrieved, or executed.

Decision application, candidate approval, exception acceptance, persistent historical fulfillment, request closure, normalized-record application, and production readiness remain false, open, `not_performed`, or `not_ready` as applicable. All network, retrieval, queue, persistence, mutation, application, and production-effect counters remain zero.

Run `py -3 scripts/source-sandbox/preview_aespa_human_re_review_decision_submission_v97.py --self-test` for deterministic replay, public-v86 validation, rationale and privacy checks, lineage digest recomputation, immutability, UTF-8 JSON parsing, and the complete fail-closed negative matrix.
