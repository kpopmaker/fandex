# AESPA decision application dry-run

This work was produced in the isolated `fandex-v54` worktree from base `d86ef3a`. It consumes the v57 decision input preview: 1,000 local records, all `pending_review` and `not_decided`, with zero actual decision values.

The historical human-review application implementation is reused through pure helpers from the decision validator module (SHA-256 `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31`). The reused helpers are `contract_errors`, `linkage_errors`, `validate_entry`, `build_outputs`, `canonical_bytes`, `digest`, and `duplicates`; its `main()` is not executed. Its existing no-op semantics classify every undecided input as `no_change` and `no_action`, while retaining the historical canonical application schema.

The result contains 1,000 deterministic dry-run inspection records, zero actual application candidates, and zero actual application executions. The first and reproduction runs produce identical canonical and validation hashes; the self-test covers at least 70 checks. Canonical outputs remain ignored local temporary artifacts. Validation, summary, and this document contain no raw source metadata.

Production and registry identities remain `not_confirmed`. Human review, source decisions, production mutation/effect, database or storage writes, pipeline execution, score calculation, ranking updates, and artist-page updates are all zero. This dry-run is readiness evidence only; the next step requires a separate explicit human-decision submission or controlled decision-application stage.
