# AESPA deterministic enrichment planning policy correction proposal (v79)

## Why v79 is required

V78 successfully closed named schemas and references, but structural completeness did not determine every observable value. Its plan schema allowed several `candidate_source_classes` and `planned_operations` arrays for the same state. The attempted adapter therefore correctly stopped with `v78_closure_validation_failure`.

V79 adds a separate behavioral dimension: a plan is the pure function `PLAN = f(CANONICAL_STATE)`. It cannot depend on call history, insertion order, runtime labels, time, randomness, environment, filesystem, or network. This is a local disposable-adapter planning policy only; it is not adapter implementation, retrieval authorization, production planning, or approval policy.

## Complete field derivation

All twelve `fulfillment_plan_v75` fields now have one derivation. Plan version, authorization status, execution status, and plan status are constants (`v75`, `not_authorized`, `not_attempted`, and derived-only `planned`). Request ID, target identity, and requested fields are canonical copies. Current field states derive from validated evidence under existing completion rules. Safe local evidence is sorted by evidence ID. Missing requirements, candidates, and planned operations follow the policies below.

Planning remains read-only and never persists `planned`, evidence, completion, lifecycle, queue, decision, source, application, or audit state.

## Missing requirements

Requested fields are processed in canonical order. Content requirements place missing title first, followed by one canonical `one_of` group containing summary then bounded excerpt. This does not falsely require both alternatives. Attribution emits exactly one required `author_or_publisher` item when absent. Satisfied fields emit no requirement.

V79 minimally supersedes the flat v78 `missing_contributions` representation with ordered requirement items `{kind, contributions}`. This is supporting structural materialization only: it encodes the already-approved `title AND (summary OR bounded_excerpt)` rule and creates no new satisfaction policy.

## Candidate sources

Candidate classes are filtered in historical priority order. Existing-local is included only when useful valid local evidence contributes to an unsatisfied lifecycle field. Controlled-fixture is included only when at least one compatible missing requirement remains. Provider and direct retrieval never appear while authorization is `not_authorized`. A completed request has no candidates.

`candidate_source_classes` is a deterministic local capability plan, not execution. `controlled_fixture_input` in a real-target read-only plan does not turn fixture data into real evidence, fulfill the historical request, or authorize mutation.

## Planned operations

Only fulfillment-progress operations appear. If controlled evidence is needed, the exact sequence is acceptance then completion evaluation. If evidence already suffices but lifecycle completion still needs derivation, evaluation alone appears. A fully satisfied request has no planned operations.

Inspection, planning, result reading, and separately callable validation are not independent fulfillment-progress steps. Acceptance already performs required validation. Operations are unique and canonically ordered; the plan never invents future fixture values, evidence IDs, or digests.

## State matrix and ambiguity audit

Pure derivation covers no evidence, useful local title, complete local content before evaluation, excerpt without title, title plus excerpt, author-only, controlled evidence before evaluation, content-satisfied attribution states, both evidence-available, fully satisfied, partial, insertion-order equivalents, and explicitly unreachable combinations.

For every reachable canonical state exactly one canonical plan exists. Reordered equivalent evidence, repeated plan calls, and different histories ending in the same canonical state produce identical plans. Candidate, operation, missing-requirement, execution-status, and plan-status ambiguity counters are zero.

V78 structural closure remains passed; its behavioral planning determinism is recorded as incomplete before this correction. After v79, both future-adapter structural and behavioral missing dependency counts are zero.

## Preserved boundaries

V76 duplicate collision ordering and v77 lifecycle evaluation remain unchanged. Completion, evidence identity, retention, local precedence, human re-review, and external authorization are not altered.

V79 does not implement the adapter. V79 does not retrieve the MyDaily article. V79 does not call Naver. V79 does not authorize external retrieval. V79 does not modify historical AESPA state. V79 does not approve or reject anything.

All network, database, semantic persistence, historical, scoring, ranking, chart, public-data, Last.fm, and production effects remain zero. Deterministic first/reproduction artifacts are canonicalized and hash-identical.

When validation passes, v80 may implement the local disposable controlled-fixture adapter directly from v75 through v79. External enrichment and production persistence/execution remain not ready.
