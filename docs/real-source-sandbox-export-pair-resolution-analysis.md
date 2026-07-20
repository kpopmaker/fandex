# Real Source Sandbox Export Pair Resolution Analysis

## Scope

V46 left all three active second-artist candidates as `unresolved_pair_tie`. V47 compares their Naver alternate exports through hashes and set relationships without exposing raw articles or selecting a candidate/export. IU remains an excluded control record.

No CSV was imported or normalized, no pipeline ran, and no identity, source decision, score, ranking, or product surface changed. Archive, v45/v46 outputs, and IU canonical files remained read-only.

## Read-only foundations

The analysis follows `discover_naver_artist_datasets.py`, `prepare_second_artist_review_packet.py`, `import_naver_exports.py`, `audit_naver_attribution.py`, `second_artist_selection_contract.preview.json`, and the v45/v46 discovery documents. Existing files were inspected but not modified.

Each row is reduced to the source-type importer fields with null-to-empty conversion, outer whitespace trimming, and whitespace collapsing. HTML, entities, URLs, and dates are not rewritten. The canonical row is hashed and then discarded from output.

- Ordered fingerprint hashes the row-fingerprint array in CSV order.
- Content-set fingerprint hashes sorted unique row fingerprints, so reordered content compares equal.
- Whole-file SHA equality yields `byte_identical`.
- Equal ordered hashes yield `identical_ordered_content`.
- Equal content sets with different order yield `equivalent_reordered_content`.
- Proper set containment yields left/right strict subset; remaining shared data is `partial_overlap`, and no shared rows is `disjoint`.

An objectively dominant export must uniquely contain every other valid export's unique rows, strictly contain at least one, preserve matching query identity, and have no worse identity coverage (or blog attribution coverage). Row count, timestamp, or date range alone cannot establish dominance.

## Resolution meanings

Source types resolve as unique, equivalent duplicates, objectively dominant, unresolved differing, missing, or invalid. A candidate gets `pair_preference_available` only when both sides resolve objectively; this is evidence availability, not selection. Any unresolved side requires manual selection. Missing/invalid sides block analysis.

The local contract permits future explicit resolution, but all three real template entries remain `not_resolved`. Selected file IDs, reviewer, rationale, note, and acknowledgements remain empty. Evidence-supported IDs are not copied into selected fields.

## Actual results

| Query | News/blog exports | News resolution | Blog resolution | Pair evidence | Supported IDs (news/blog) |
| --- | ---: | --- | --- | --- | ---: |
| 보이넥스트도어 | 12 / 14 | `unresolved_differing_exports` | `unresolved_differing_exports` | `manual_pair_selection_required` | 0 / 0 |
| 아이유 | 48 / 44 | `unresolved_differing_exports` | `unresolved_differing_exports` | `excluded_existing_sandbox_artist` | 0 / 0 |
| 에스파 | 12 / 14 | `unresolved_differing_exports` | `unresolved_differing_exports` | `manual_pair_selection_required` | 0 / 0 |
| 에이티즈 | 12 / 14 | `unresolved_differing_exports` | `unresolved_differing_exports` | `manual_pair_selection_required` | 0 / 0 |

The counts include recognized query-bearing alternates so incomplete export variants remain visible; resolution itself uses valid, non-malformed exports. No candidate has one uniquely dominant superset across every valid alternate.

Aggregate results:

- Candidates: 4 total, 1 excluded, 3 active
- Pair preference / manual / blocked: 0 / 3 / 0
- Unique, equivalent, dominant resolutions: 0 for news and blog
- Unresolved differing: 4 news and 4 blog
- Missing or invalid-only source types: 0
- Exports: 84 news, 86 blog
- Pairwise comparisons: 1,326 news, 1,219 blog
- Relations: 204 byte-identical, 314 identical ordered, 669 strict-subset directions, 414 partial-overlap, and 944 disjoint

The mixture proves that some archive artifacts are duplicates while others are subsets or distinct datasets. Consequently, largest-row or latest-export heuristics would hide material differences.

## Determinism and safeguards

Two runs produced identical analysis/template bytes, candidate/export/comparison order, IDs, statuses, supported-ID lists, and summaries excluding `generated_at`. Deterministic analysis SHA-256 is `d3d9257304c63a739cfa56bb7e691bca1e881e6f7cdd3c154a9d4dc366ab07f6`; deterministic template SHA-256 is `6d63996e10bb30228283d52a1f6fcbdb08ec1a752f691b6631cf8f177a24f28d`.

The in-memory self-test passed 22 cases covering byte, ordered, reordered, subset, overlap, disjoint, dominance safeguards, blocked/excluded routing, and blank templates. Outputs are ignored under `tmp/source-sandbox/discovery/`; no paths, filenames, raw rows, titles, descriptions, or URLs are emitted.

Next, a human may inspect evidence-supported pairs when available, while these three manual candidates require explicit news/blog file IDs. Candidate identity remains a separate decision in the unchanged v46 selection template.
