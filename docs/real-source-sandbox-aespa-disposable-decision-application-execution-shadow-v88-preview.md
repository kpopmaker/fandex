# AESPA disposable decision application execution shadow v88

v88 executes application semantics only in disposable in-memory state. Its runtime boundary is the v87 public application-preview matrix; it does not read private runtime state from v83–v87.

The authority chain is v87 public preview → v66/v67 executable semantics → v68 atomic interface → v69 `InMemoryAdapter` → v70 `orchestrate` → v88 invocation, comparison, and evidence composition. The exact target already exists in v70's tracked environment, and v70 delegates initial logical state creation to v67 `copied_state`; v88 neither invents a seed nor recreates operation, lifecycle, identity, idempotency, persistence, or post-state rules.

The four public ready cases are `accept_exception`, `reject`, `defer`, and `request_enrichment`. Each receives a fresh adapter for its canonical execution and another fresh adapter for deterministic replay. The v70/v69 same-instance duplicate call returns the authority-defined `idempotent_existing_result`. Fresh instances begin with no application or audit record, proving isolation and disposability.

The authoritative disposable results are: exception accepted/resolved/inactive; rejected/resolved/inactive; deferred/deferred/active; and enrichment requested/enrichment requested/active with enrichment required. Each complete post-state comparison matches v87. The v66-derived application identity produced by actual execution equals the simulation-only identity exposed by v87. v88 additionally derives a canonical SHA-256 `disposable_execution_shadow_id`; it is preview/test-only, non-historical, non-persisted, and non-production.

`not_decided` remains not submitted, and `approve_candidate` remains validator-rejected for `exception_review_required`; neither enters execution. Unknown decisions fail closed. The negative matrix has no retries.

In-memory application, queue, and audit mutations are disposable execution evidence only. They are not historical state, filesystem persistence, database writes, real queue/source/application/audit records, or production effects. The v68 atomic boundary is invoked only through the instance-owned v69 memory adapter.

Historical AESPA state remains `request_enrichment` before and after v88. v88 does not select a real AESPA decision. v88 does not apply any controlled decision historically. v88 does not change historical `request_enrichment`. v88 does not write a real queue/source/application/audit record. v88 does not make synthetic enrichment real. v88 does not claim that real historical enrichment was fulfilled.

All returned evidence is deep-detached. Canonical JSON makes mapping insertion order irrelevant while retaining authority-defined array order. Complete first and reproduction runs use fresh v87 builds and fresh disposable state, contain no current time, randomness, UUID, network, or filesystem-order dependency, and must have identical artifact hashes. Consumed v65–v70, v83–v87, human-review, and Last.fm files are hashed before and after.

Disposable shadow conformance does not establish real-target or production readiness. External verification is still false, real historical enrichment fulfillment is still false, and no new real human decision exists. A future safe stage must resolve those authority gaps explicitly; any human decision must be selected by a human, never by this system.
