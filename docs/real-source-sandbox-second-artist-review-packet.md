# Real Source Sandbox Second Artist Review Packet

## Purpose and boundary

V45 found four paired Naver candidates but no ready second-artist recommendation. Every candidate had an equal-priority export-pair tie, three non-IU candidates lacked an explicit registry identity match, and two selected blog exports had incomplete attribution. V46 does not force those candidates into import. It turns the evidence into a local-only human review packet and an entirely blank selection template.

No candidate or identity was selected. No registry or sandbox identity was created, no CSV was imported or normalized, and no downstream pipeline ran. No source approval, rejection, deletion, decision mutation, score calculation, ranking update, production write, database/storage write, or external API call occurred.

## Read-only investigation

The following existing files were inspected without modification:

- `scripts/source-sandbox/discover_naver_artist_datasets.py`
- `scripts/source-sandbox/import_naver_exports.py`
- `scripts/source-sandbox/audit_naver_attribution.py`
- `scripts/source-sandbox/source_sandbox_pipeline_manifest.preview.json`
- `app/data/v4/artistUniverse.ts`
- `app/data/v4/scoring/issueSourceFixtures.ts`
- `app/data/v4/scoring/mockIssueSignals.ts`
- `docs/real-source-sandbox-second-artist-discovery.md`

The review builder repeats V45's news/blog header recognition, query normalization, archive-relative `file_id`, timestamp, batch-directory, row-count, attribution, and identity-coverage checks. It locates the exact V45-selected file IDs before interpreting alternates. Existing scripts, contracts, and manifests are not changed.

## Export-pair analysis

Each valid alternate receives two internal content hashes over the stable importer fields for its source type:

- an ordered normalized-row fingerprint, which preserves CSV row order;
- a content-set fingerprint, which sorts normalized rows before hashing and therefore recognizes reordered copies.

These differ from the whole-file SHA-256: byte-level metadata or extra derived columns can change a file while the normalized importer-relevant content remains equivalent. A tied alternate is equivalent only when its row count matches and either normalized fingerprint matches the selected export. `equivalent_duplicate_pair` means equivalent content, not the same physical file.

If any equal-priority alternate has a different row count and/or both fingerprints differ, the result is `unresolved_pair_tie`. The largest row count is not used to choose a winner because size alone cannot show which export is the intended raw dataset rather than a filtered, scored, or derived artifact.

All four real candidates remain `unresolved_pair_tie`. Each equal-priority group contains substantive fingerprint or row-count differences, so none was relabeled as an equivalent duplicate.

## Identity and attribution review

Explicit exact/alias registry matches are reported as `registry_identity_available`; absent matches require `human_identity_input_required`, and ambiguous matches require dedicated identity review. Registry IDs, artist names, slugs, and sandbox keys are never inferred from query substrings. This prevents an archive query from silently becoming a production or sandbox identity.

IU remains visible in the packet for traceability but is `excluded_existing_sandbox_artist` and excluded from the selection template. The other three candidates remain available for an explicit future human decision even though pair resolution takes precedence in their packet status.

News attribution coverage is zero for the standard Naver export because it has no explicit publisher field; this sets `exception_review_expected` and is not independently blocking. Blog attribution uses only supported explicit author/publisher fields. Coverage below 100% remains visible as an attribution review reason.

## Selection contract

`second_artist_selection_contract.preview.json` is a local preview input shape, not production identity policy. Its intents are `not_selected`, `select_existing_registry_identity`, `select_sandbox_identity`, `reject_candidate`, and `defer`. Future selections require explicit reviewer, rationale, identity acknowledgement, and—while a pair is unresolved—explicit news/blog file IDs.

This run creates three non-IU template entries, all with `selection_intent: not_selected`. Reviewer, rationale, note, review time, registry ID, artist name, slug, sandbox key, and selected file IDs remain null or empty. Proposed packet identity is not copied into selection fields.

## Actual packet results

| Display query | Rows (news/blog/total) | Packet status | Pair resolution | Identity resolution | Identity coverage (news/blog) | Attribution coverage (news/blog) |
| --- | ---: | --- | --- | --- | ---: | ---: |
| 보이넥스트도어 | 1,000 / 1,000 / 2,000 | `needs_pair_resolution` | `unresolved_pair_tie` | `human_identity_input_required` | 100% / 100% | 0% / 99.3% |
| 아이유 | 1,000 / 1,000 / 2,000 | `excluded` | `unresolved_pair_tie` | `excluded_existing_sandbox_artist` | 100% / 100% | 0% / 100% |
| 에스파 | 1,000 / 1,000 / 2,000 | `needs_pair_resolution` | `unresolved_pair_tie` | `human_identity_input_required` | 100% / 100% | 0% / 100% |
| 에이티즈 | 1,000 / 1,000 / 2,000 | `needs_pair_resolution` | `unresolved_pair_tie` | `human_identity_input_required` | 100% / 100% | 0% / 99.9% |

Aggregate results:

- Total / active candidates: 4 / 3
- Existing IU excluded: 1
- Selection template entries / `not_selected`: 3 / 3
- Needs pair resolution: 3
- Selectable, needs identity, needs attribution, blocked: 0 each at the primary packet-status level
- Unique / equivalent duplicate / unresolved pairs: 0 / 0 / 4
- Missing / invalid exports: 0 / 0
- Registry identity available / human identity input required / ambiguous: 0 / 3 / 0

`needs_identity_resolution` is zero as a primary packet status because unresolved pair ties have higher priority; the independent identity-resolution count still records three `human_identity_input_required` candidates. Likewise, incomplete attribution remains in reason codes even when pair resolution is the stronger blocker. `selectable_for_human_review` would only mean a human may enter a selection, not that automatic import is safe.

## Determinism and protection

Two executions produced identical packet/template bytes, record order, packet IDs, pair results, and summaries after excluding `generated_at`.

- Packet file SHA-256: `6b1c9cded3587cd01a39f05007d8d1201d5546301ed2cfc45042d0d5e885d3a7`
- Selection template SHA-256: `c36a73083a99ec53b170e873cfb35f0e20f8907aab8718e447a7ffbcb2bbb3a1`
- Deterministic packet SHA-256: `8bc1ef1ccbfaf9c011c023709e3ff66076558fbfaefdd16c329df10874d8fdac`
- Deterministic selection-template SHA-256: `3b2a2a22a94dd06ccaa90568f08293ac4e224da83f21e9567dc8a9a5b57d7d5b`

The in-memory self-test passed 18 cases covering unique, byte/content-equivalent, reordered, differing, missing, and invalid exports; IU exclusion; identity and attribution routing; blank templates; duplicates; deterministic IDs; and content/path redaction. It writes no files.

Archive CSV, v45 discovery JSON, and all IU canonical files retained their hashes. Packet outputs live only under ignored `tmp/source-sandbox/discovery/` paths. Neither raw article fields nor user-local absolute paths appear in tracked files or output.

## Next boundary

The next action must be either an explicit user-authored selection in the template, including manual pair resolution where required, or collection of a new registry-backed dataset. Until then, import, normalization, and pipeline execution remain out of scope.
