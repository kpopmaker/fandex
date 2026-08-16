# AESPA consecutive evidence acceptance lifecycle correction proposal (v80)

V80 resolves the lifecycle gap that stopped the previous adapter implementation. V76 permits the first accepted item to move a field from `requested` to `evidence_available`, but its table omitted acceptance of another distinct valid item while the field was already `evidence_available`. Because absent transitions are illegal, title followed by summary could not be accumulated before evaluation even though content completion has always required title plus summary or bounded excerpt.

This is a contract correction, not an adapter implementation. V80 adds one narrowly scoped row:

`evidence_available + valid_evidence_accepted -> evidence_available`

The row applies only after the new evidence independently passes every existing schema, binding, compatibility, source, locator, retention, digest, identity, duplicate, and local-precedence rule. The lifecycle value does not change, but the evidence store changes and the acceptance operation therefore mutates semantic state. Acceptance does not evaluate completion. A field with sufficient accumulated evidence remains `evidence_available` until `evaluate_current_evidence` runs.

## Complete acceptance dispositions

The effective controlled acceptance table is closed across all seven persistent lifecycle states:

- `requested`, `not_attempted`, and `partially_satisfied` accept valid new evidence and transition to `evidence_available` under preserved v76 authority.
- `evidence_available` accepts valid new evidence through the v80 self-transition and remains `evidence_available`.
- `satisfied` remains illegal for new controlled acceptance.
- `unavailable` and `failed` remain future-authorized and unreachable in controlled local mode.

Exact duplicates, conflicting duplicates, bad new identities, and local-precedence rejections are outcomes before the lifecycle event. They do not mutate evidence, lifecycle, or completion. V76 collision-first duplicate classification is unchanged.

Lifecycle is field-local. Consecutive title and summary acceptance changes only `content_context`; accepting `author_or_publisher` changes only `source_attribution`. Title plus summary, title plus bounded excerpt, and three distinct compatible content items may accumulate before evaluation. Evaluation then applies the existing completion rule. Acceptance never implicitly evaluates or changes the request to satisfied.

## Preserved authority

The effective precedence for the corrected acceptance clause is v80, then v79, v78, v77, v76, and v75. V80 supersedes only the absent-transition rule for `evidence_available + valid_evidence_accepted`.

V77 evaluation behavior remains unchanged, including legal non-regressing `satisfied -> satisfied` evaluation. V79 deterministic planning remains unchanged. Content completion remains `title AND (summary OR bounded_excerpt)`, attribution remains `author_or_publisher`, and separate human re-review remains mandatory.

The dependency audit covers initialization, planning, first and consecutive acceptance, duplicate and rejected acceptance, evaluation, and safe-result reading. Structural, planning, acceptance-lifecycle, and other behavioral missing-dependency counts are all required to be zero.

## Safety boundary

V80 does not implement the adapter. V80 does not retrieve MyDaily, call Naver, authorize external retrieval, or access a database. It does not mutate historical AESPA state, Last.fm data, queues, decisions, applications, or audits. It does not approve or reject anything. All network, persistence, historical, production, score, ranking, chart, and public-data effect counters remain zero.

The new `evidence_available` self-transition permits local evidence accumulation only after the evidence independently passes all existing acceptance rules.

The validator is deterministic, standard-library only, writes ignored test evidence under the two v80 temporary directories, verifies first/reproduction equality, and checks authority, historical, and Last.fm immutability.

If validation passes, the next separate stage, v81, may implement the local disposable enrichment adapter directly from v75 through v80. V81 remains controlled-fixture-only, process-local, network-free, historically read-only, and subject to human re-review.
