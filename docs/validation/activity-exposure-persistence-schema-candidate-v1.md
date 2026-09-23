# Activity Exposure persistence schema candidate v1

Status: VALIDATION ONLY  
Authority: no Neon main mutation, no Production merge

This candidate exists to prove that Activity Exposure can be persisted without reusing the NAVER-specific raw evidence tables and without collapsing raw-payload retention into event truth.

Key properties:

- Activity Exposure is stored as an event stream, not a numeric score.
- collection-run coverage is explicit and may be partial/missing/provider-unavailable without becoming zero.
- provider observations are append-only.
- normalized event revisions are append-only.
- collaboration provider artist credits are stored as the full provider credit array.
- raw payload bytes are separated from observation/event lineage.
- YouTube retained raw payload requires a bounded refresh deadline.
- raw payload bytes can be evicted while preserving digest and observation/event lineage.
- direct replacement of an existing raw payload is forbidden; a refresh must create a new provider observation/revision.
- existing NAVER ingestion tables are not altered.

The SQL is intentionally stored under `docs/validation/sql/`, not `database/migrations/`, so it cannot be mistaken for an authorized Production migration.

Neon main application requires explicit user approval and a separate migration gate.
