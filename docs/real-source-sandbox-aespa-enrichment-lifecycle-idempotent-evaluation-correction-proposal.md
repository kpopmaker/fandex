# AESPA enrichment lifecycle idempotent-evaluation correction proposal (v77)

## Why this correction exists

The attempted adapter correctly stopped on one remaining machine-readable lifecycle omission. After content evidence makes `content_context` satisfied, accepting attribution leaves content satisfied and moves `source_attribution` to evidence-available. A final multi-field evaluation must preserve content while satisfying attribution. V76 provided no `satisfied + evaluate_current_evidence → satisfied` row, while declaring every absent transition illegal.

Tracked v76 already describes idempotent evaluation and includes explicit no-change evaluation for `not_attempted` and `partially_satisfied`. Its completion model makes a satisfied field remain satisfied while its evidence is unchanged. The missing satisfied row is therefore corrected narrowly as table completeness, not as a new business concept.

## Narrow correction

`satisfied` remains terminal against evidence-driven regression but becomes explicitly idempotently evaluable:

`satisfied + evaluate_current_evidence → satisfied`

The field state, completion, and evidence do not change, so this field transition has no semantic mutation. That does not make the whole operation read-only: another requested field may legally change in the same evaluation.

One evaluation recomputes all requested fields from validated evidence in canonical v72 field order. It derives every proposed transition, verifies every row before applying anything, builds a candidate derived state, validates request completion, and replaces live process-local state once only when at least one semantic field changes. A mixture of a legal self-transition and a changing transition is successful. No hidden terminal-field skipping is permitted.

The required vector is now explicit: content performs `satisfied → satisfied` while attribution performs `evidence_available → satisfied`; the operation changes attribution and finishes with both fields and the request satisfied. Repeating evaluation after both fields are satisfied returns the existing `evaluated` response with no semantic state change.

## Reachable-state audit

Fresh `requested` evaluation already transitions under v76 to not-attempted, partial, or satisfied according to recomputed evidence. `not_attempted → not_attempted` and `partially_satisfied → partially_satisfied` were already explicit idempotent rows. `evidence_available` already covers not-attempted for context-only evidence, partial, and satisfied. Only the reachable satisfied self-evaluation was missing.

Unavailable and failed remain future-authorized external outcomes that controlled local mode cannot create. Evaluation is not authorized in those terminal states; their existing safe behavior is read-only result access. Unsupported rows remain illegal.

With unchanged local evidence, accepted evidence, and requested fields, evaluation cannot regress a satisfied field. Satisfied cannot transition to partial, evidence-available, requested, or not-attempted through evaluation.

## Authority and boundaries

Future executable authority is v75 baseline plus v76 corrections plus this narrow v77 correction, with the newest authority winning only for explicitly superseded evaluation-completeness clauses. Planning remains read-only, planned remains derived-only, direct acceptance from requested remains valid, and duplicate ordering, identities, digest, locators, compatibility, retention, local precedence, excerpt bounds, completion, and human re-review remain unchanged.

No adapter was implemented. No enrichment was executed. No article was retrieved. No historical state changed. No network, database, semantic persistence, approval, rejection, application, audit, scoring, ranking, chart, public-data, or production effect occurred.

When deterministic pure validation passes with every controlled reachable evaluation row explicit, the next stage may separately implement the process-local controlled-fixture adapter. External enrichment and production persistence/execution remain not ready.
