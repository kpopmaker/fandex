# AESPA authorized external evidence acceptance v93 preview

This offline sandbox preview consumes the public v92 verification output and derives acceptance records for exactly `content_context` and `source_attribution`. The project-owner authorization is bounded to those two verified records and grants no persistence or production authority.

The content-context acceptance reasons are exact target lineage, exact title, a bounded NFC summary, an allowed title-plus-summary shape, and absence of full-body retention. The source-attribution reasons are exact target lineage, explicit publisher value and semantic role, pinned screenshot provenance, and absence of an inferred author.

Acceptance does not imply field satisfaction. Both field-satisfaction states remain false; historical fulfillment remains false; human re-review and decision/application remain blocked; normalized-record application is not performed; and production remains not ready. Retrieval and human-submission counts are preserved. All network, database, queue, audit, source, scoring, ranking, chart, public/data, persistence, and production-effect counters remain zero.

Run `py -3 scripts/source-sandbox/preview_aespa_authorized_external_evidence_acceptance_v93.py --self-test` for the deterministic first/replay build and fail-closed negative matrix. Generated JSON remains under ignored `tmp/`, and the evidence PNG remains ignored and untracked.
