# AESPA human re-review decision application v87 preview

V87 consumes the merged v86 public controlled decision matrix and its four validated shadow submissions. It excludes v86 `not_decided` because it is not submitted and excludes `approve_candidate` because the tracked validator rejected it for `exception_review_required`. V87 does not reconstruct either submission and has zero private runtime dependencies.

Application semantics come from the v66 executable contract: its transition table, copied-state lifecycle, exact operation/state mappings, application context, deterministic idempotency identity, and atomic boundary. V87 directly reuses v67 `validate_v66` and `simulate` against a fresh detached in-memory copy with fixed preview context `2030-01-02T03:04:06Z`. V68 is inspected as the persistence-interface and atomic-write boundary; no v69 adapter or v70 execution orchestrator is invoked. The simulated application record and ID are labeled simulation-only and discarded.

The primary matrix covers `accept_exception`, `reject`, `defer`, and `request_enrichment`. Operations and next states are read from v66/v67 results, never reimplemented in v87. Each result has a local-only `application_preview_id`, SHA-256 over canonical JSON binding the v86 shadow ID and public lineage to the authority operation and next state. It is not a real application, persistence, audit, or historical identity.

Historical `request_enrichment` and every v86 controlled reviewer, timestamp, rationale, and requested field remain unchanged. Two fresh v86/v87 runs, duplicate deterministic planning, insertion-order invariance, caller-mutation isolation, authority hashes, transitive hashes, Last.fm hashes, and all JSON are verified. Every network, database, application, audit, source, queue, filesystem-semantic, ranking, public-data, and production effect counter remains zero.

V87 does not choose the real AESPA decision. V87 does not change historical `request_enrichment`. V87 does not execute `accept_exception`, `reject`, `defer`, or `request_enrichment`. V87 treats validated decisions only as controlled application-preview data. V87 does not persist an application or audit record. V87 does not access v86/v85/v84/v83/v82/v81 private runtime state.

The next boundary is a separate v88 disposable decision-application execution shadow using fresh in-memory state. V88 is not implemented here and must remain disconnected from production and real persistence.
