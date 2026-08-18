# AESPA authorized external evidence verification v92 preview

This sandbox-only preview consumes the public v91 intake output and independently verifies the two bounded candidates and their provenance. It performs no network reads and grants no historical or production authority.

## Verified boundary

- Request: `4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283`
- Target: `src_40f253cea60253b4f7b8d1e747f9cc87`
- Fields: `content_context`, `source_attribution`
- Candidate collection: `4e941ac6fd1c3010406eedb4403cc8b36413117004435181571310888443859d`
- Readiness matrix: `9fb4189ac32269a3bd0a13967f5c31232152678a0c33a869fcd3bf64a90a1da2`
- Scope: bounded candidate and provenance verification only

`content_context` is verified against the exact local normalized title, the NFC-normalized 121-code-point bounded summary, raw row 991, and the pinned target/archive lineage. No full article body is retained.

`source_attribution` is verified as the explicitly observed publisher against the ignored screenshot’s digest and dimensions, its sealed headline and publication time, and the exact provider locator/article tuple. No author was observed or inferred.

## Non-authority

Evidence acceptance is not performed. Field satisfaction and historical fulfillment remain false. Human re-review and decision/application readiness remain blocked. Production readiness remains not ready. Database, score, ranking, chart, queue, audit, source, public/data, persistence, and production-effect counters remain zero.

Run `python scripts/source-sandbox/preview_aespa_authorized_external_evidence_verification_v92.py --self-test` for the deterministic first/replay build and complete fail-closed negative matrix. Generated JSON stays under ignored `tmp/`.
