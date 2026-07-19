# Source Lab Milestone Closeout

Status: read-only preview milestone covering v7 through v32. This document does
not describe a production-ready source pipeline.

## Purpose

Source Lab is a fixture/helper-based workspace for validating source pipeline
concepts before any production integration. It makes the proposed flow from
source ingestion through readiness review visible without collecting external
data, persisting state, or applying results to FANDEX.

The `/source-lab` route is therefore a review surface, not an operational
dashboard. Its labels, counts, statuses, and actions describe preview output
only.

## Completed Preview Scope

The milestone organizes the following read-only concepts:

| Area | Preview coverage |
| --- | --- |
| Source intake | Ingestion draft, provider adapter, provider sync policy |
| Source history | Snapshot history and diff |
| Evaluation | Quality scoring and eligibility |
| Signal planning | Signal application and impact |
| Human review | Review queue and review action |
| Persistence boundaries | Storage boundary and write safety |
| Operational safeguards | Audit preview and rollback readiness |
| Readiness overview | Readiness dashboard across the proposed pipeline stages |
| Source Lab usability | Section navigation, mobile and desktop polish, and final UI review |
| Manual guidance | Manual QA smoke note and preview release note |

These items establish vocabulary, fixture shapes, helper output, and UI review
flows. They do not establish production infrastructure or runtime behavior.

## Safety Boundaries

The v7–v32 milestone intentionally includes none of the following:

- Database or Supabase persistence
- File storage
- Live source ingestion or provider synchronization
- Write, update, upsert, or delete operations
- Persisted audit logs
- Rollback or revert execution
- External API or `fetch` calls
- `process.env` access
- Real score delta calculation
- Ranking, chart, or artist score integration
- Changes to FANDEX calculation logic

Review actions, write states, audit entries, rollback states, dashboard status,
and release notes remain explanatory previews. They are not detected production
state and do not execute pipeline steps.

## Not Implemented

The following production capabilities remain outside this milestone:

- Production source ingestion
- Provider authentication and credential handling
- Scheduler or cron execution
- Persistent source and pipeline storage
- Runtime audit logging
- Rollback execution
- Real score application
- Production monitoring and alerts
- Production QA automation

No production readiness claim should be inferred from the completed preview
scope.

## Next-Step Candidates

These are planning candidates only and are not commitments or implementations:

1. Decide the production architecture and operating boundaries.
2. Set provider priorities and verification requirements.
3. Design the persistent storage schema.
4. Design an ingestion worker and its failure handling.
5. Define a real-source sandbox or expand fixtures for controlled evaluation.
6. Design an approval gate before any real FANDEX application.

Each candidate should be reviewed in a separate scope with explicit decisions
for data rights, authentication, persistence, observability, failure recovery,
and human approval.

## Closeout Summary

Source Lab now provides a coherent read-only representation of the proposed
source preview pipeline, its review stages, and its safety boundaries. The
milestone is complete as a concept and UI preview. Moving beyond it requires a
separate production architecture decision; no production source collection,
storage, mutation, rollback, or FANDEX application is part of this closeout.
