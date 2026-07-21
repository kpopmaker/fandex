# Real Source Sandbox Pipeline Orchestration

## Purpose and boundary

V44 connects the downstream local sandbox work from V37 through V43 with a manifest-driven orchestrator. It starts from the existing normalized IU Naver source JSON and replays six stages into an isolated run directory. Importing the original CSV is outside this orchestrator's scope.

This remains `local_sandbox_preview_only` with `production_policy: false`. It does not approve, reject, delete, or accept an exception; write to production, a database, or storage; create an approval snapshot or audit event; calculate sentiment, weight, rank, delta, or FANDEX scores; or update ranking and artist pages.

## Read-only CLI review and stage graph

The following existing stage scripts were inspected and invoked without modification:

1. `scripts/source-sandbox/validate_normalized_sources.py` reads canonical news/blog normalized JSON and the import summary, then writes an isolated validation report.
2. `scripts/source-sandbox/build_artist_source_mappings.py` joins canonical normalized records to the new validation report and writes mapping records and summary.
3. `scripts/source-sandbox/preview_source_quality_eligibility.py` reads normalized data, validation, and mapping outputs and writes quality/eligibility records and summary.
4. `scripts/source-sandbox/preview_source_approval_gate.py` additionally reads the canonical attribution audit and tracked `source_type_metadata_contract.preview.json`, then writes gate records and summary.
5. `scripts/source-sandbox/prepare_human_review_queue.py` reads the new mapping, quality, and gate outputs plus the tracked human decision input contract, then writes the active queue, queue summary, and blank decision template.
6. `scripts/source-sandbox/validate_human_review_decisions.py` reads the new queue, blank template, and gate output plus the tracked input/application contracts. It is always called with `--require-all-not-decided` and writes validation, dry-run, and summary output.

Related local pipeline and safety concepts were also reviewed in `docs/real-source-sandbox-validation.md`, `docs/real-source-sandbox-artist-mapping.md`, `docs/real-source-sandbox-quality-eligibility-preview.md`, `docs/real-source-sandbox-approval-gate-preview.md`, `docs/real-source-sandbox-human-review-queue.md`, `docs/real-source-sandbox-decision-validation-dry-run.md`, `docs/production-source-architecture-decision.md`, and `docs/source-signal-pipeline-preview.md`.

The orchestrator calls each CLI through `subprocess.run` with `sys.executable`, a list of arguments, and `shell=False`. Avoiding a shell prevents command-string interpretation and keeps every input and output path an explicit argument. A nonzero stage exit, unreadable JSON output, or failed acceptance assertion stops the pipeline immediately; later stages are not run, and inputs are never auto-corrected.

## Manifest and path safety

`source_sandbox_pipeline_manifest.preview.json` defines artist/provider identity, canonical read-only paths, isolated output filenames, stage dependencies, and expected outputs. Validation rejects absolute and `..` paths, duplicate stages/scripts/output paths, missing dependencies, dependency cycles, missing scripts, non-boolean enablement, and any scope or policy that is not local preview-only.

The run root cannot overlap canonical `tmp/source-sandbox/naver/iu`, escape the repository, or live under `app`, `public`, `docs`, or `scripts`. This prevents accidental replacement of canonical data and prevents generated output from entering product or tracked implementation paths.

Before execution, SHA-256 values are captured for all four canonical inputs and all thirteen canonical comparison outputs. They are recomputed after all stages; any change fails the run without attempting restoration. Outputs are written only below `tmp/source-sandbox/pipeline-runs/iu-v44` or its separate reproducibility root.

`--plan-only` validates the manifest, canonical JSON, graph, and paths and prints the six-stage order plus intended relative outputs. It does not execute a subprocess or create output directories/files.

## Canonical comparison

Seven deterministic record outputs are compared by direct file SHA-256: mapping, quality, approval gate, review queue, decision template, decision validation, and decision dry-run. All seven were exact matches.

Six summary/report outputs are compared as canonical JSON after removing only their generation timestamp. Five scripts call that field `generated_at`; the pre-existing normalized validator calls the equivalent field `validated_at`. The exact excluded field is recorded per comparison in `pipeline-run-summary.json`; no other field is excluded. All six comparisons matched.

Stage summary hashes recorded in the pipeline summary likewise hash canonical JSON after removing only that stage's generation timestamp, while record output hashes are direct file SHA-256. This keeps the two pipeline summaries reproducible without hiding substantive differences.

## Execution result

Both isolated runs completed all six stages with zero failures:

- Normalized inputs: 2,000
- Mapping records: 2,000
- Quality/eligibility preview records: 2,000, blocked 0
- Approval gate records: 2,000 (1,000 approval candidates and 1,000 exception reviews)
- Active review queue: 1,000 news items
- Blank decision template: 1,000
- Valid / invalid decisions: 1,000 / 0
- `not_decided`: 1,000
- Actionable decisions: 0
- `no_change`: 1,000
- Production writes, approval snapshots, audit events, score applications: 0 each

The first and reproducibility runs have identical deterministic record hashes, record order, stage order, canonical comparison results, and pipeline summaries after excluding the top-level `generated_at` and `run_root`. Both deterministic pipeline SHA-256 values are `5c0684b502c8f7c318ad6e3479172f8b83062b9c3d83ffb926cda81eb13cc264`.

Canonical input and comparison-output hashes remained unchanged in both executions. In particular, the canonical blank decision template remained `83d07667b79dfec03c874eb525e9fa40ff2d7dd5232c79db5bbf9fa6dc710176`. Every actual decision remained `not_decided`, and every dry-run effect remained `no_change`.

The synthetic in-memory self-test covers graph validity, duplicate and missing nodes, cycles, missing scripts, scope/policy rejection, absolute/traversal paths, canonical/app run-root overlap, output escape, plan isolation, fail-fast behavior, and `shell=False`. It creates no output files.

All run artifacts are under ignored `tmp/source-sandbox/pipeline-runs/` paths and are not tracked by Git. No existing stage script, canonical JSON, app/public file, ranking, or artist page was changed, and no external API was called.

## Possible next steps

The next separately authorized step can take one of two directions:

- run the same manifest design against a second real artist dataset; or
- design provider ingestion as a separate stage before this normalized-source manifest boundary.

Neither direction should turn this preview orchestrator into an implicit production application path.
