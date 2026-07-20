# Real Source Sandbox Second Artist Discovery

## Purpose and safety boundary

V45 performs local-only, read-only discovery of a second real artist dataset after IU. It inventories the existing Naver collector archive, identifies news/blog export pairs, compares query identity against the FANDEX artist registry, and reports readiness. It does not import CSV, create normalized JSON, run quality/eligibility, approval, review, decision, or pipeline stages, or change the IU canonical sandbox.

No source was approved, rejected, or deleted. No production, database, storage, or API write occurred. No sentiment, importance, rank, weight, delta, or FANDEX score was calculated, and nothing was connected to ranking or artist pages.

## Read-only implementation review

The following files were inspected without modification:

- `scripts/source-sandbox/import_naver_exports.py` for supported news/blog fields, UTF-8-SIG CSV handling, and normalized source requirements.
- `scripts/source-sandbox/audit_naver_attribution.py` for explicit publisher/author candidate fields and the rule against inferring attribution from URLs.
- `scripts/source-sandbox/source_sandbox_pipeline_manifest.preview.json` and `scripts/source-sandbox/run_source_sandbox_pipeline.py` for the normalized-input boundary of the downstream sandbox.
- `app/data/v4/artistUniverse.ts` for registry IDs, names, tickers, and explicit aliases.
- `app/data/v4/scoring/issueSourceFixtures.ts` and `app/data/v4/scoring/mockIssueSignals.ts` as read-only fixture references only; their scores and signals were not used.

## Inventory and pairing

The archive is traversed recursively in deterministic relative-path order. A CSV is a news or blog candidate when its filename identifies a Naver export or its header fully matches the known export structure. Header order is irrelevant. Candidate files with missing required headers are counted as invalid without copying any rows into output.

For each valid export, discovery reads only the header, row count, query counts, malformed-row count, explicit attribution coverage, content identity match counts, file hash, filename timestamp, and relative parent identity. The tracked code and documentation contain no archive absolute path, raw CSV, title, description, or URL list. Output identifies a file only through a SHA-256 of its archive-relative path.

Exports are grouped by normalized query. Exact query agreement is preferred, followed by the same archive directory, the smallest export timestamp distance, and deterministic relative-path ordering. Only one news/blog pair is selected per query; other valid exports are counted as alternates. A tie at the directory/timestamp priority is retained as `multiple_export_pair_tie` and requires review.

Query normalization trims outer whitespace, collapses repeated whitespace, and case-folds English for comparison while retaining the display spelling. Empty query values remain empty and block readiness; filenames never substitute for query identity.

## Identity and attribution evidence

A registry exact match requires equality with an artist name, ticker, or registry ID used as the slug candidate. An alias match requires equality with an explicit `aliases`, `koreanAliases`, or `englishAliases` value. Partial substrings do not establish identity, and multiple matches block the candidate.

Content coverage checks each row's query, title, and description for the normalized query or the registry artist's exact name/ticker. It records only match counts and coverage. Single-character terms are rejected as evidence, and one- or two-character ASCII tickers require word boundaries rather than substring matches.

News attribution uses only explicit importer-supported publisher/press/media/author columns. The standard Naver news export lacks such a column, so this is recorded as `exception_review_expected: true`; it is not by itself a blocked condition. Blog attribution uses explicit `bloggername` or other importer-supported author/publisher fields and requires 100% coverage for ready status. Attribution is never inferred from a hostname, link, or query.

## Readiness rules

- `ready` requires both export types, matching non-empty queries, non-empty rows, complete headers, zero malformed rows, one exact/alias registry match, 100% news/blog identity coverage, and 100% blog attribution coverage. IU is not eligible for the second-artist recommendation.
- `review_required` covers missing registry identity, incomplete identity or blog attribution coverage, and ambiguous export pairing that does not invalidate the underlying files.
- `blocked` covers a missing side of the pair, empty/mismatched query, missing required headers, malformed or empty rows, or ambiguous registry identity.

The recommendation is selected only from `ready` non-IU candidates. A `review_required` candidate is never promoted merely to return a result.

## Actual inventory result

- Archive files: 948
- CSV files: 635
- Valid news exports: 64
- Valid blog exports: 74
- Invalid Naver CSV candidates: 180 (100 news-header and 80 blog-header failures)
- Distinct query candidates / paired candidates: 4 / 4
- Ready / review-required / blocked: 0 / 4 / 0
- Existing IU candidates: 1
- Exact / alias / ambiguous / no registry match: 0 / 1 / 0 / 3

IU matched an explicit registry alias but is marked `existing_sandbox_artist` and excluded from recommendation. The three new query identities did not exactly match a registry name, ticker, slug candidate, or explicit alias. They were not linked through partial-string inference. All four selected pairs also had an equal-priority directory/timestamp tie among archived exports, and two pairs had incomplete blog attribution coverage.

There is therefore no ready candidate: `recommendation` is `null`. Before a second artist can proceed, the registry needs explicit identity/alias evidence for an archived query, the intended raw export must be distinguished from equal-priority derived exports, and any incomplete blog attribution must be reviewed. No production artist identity has been asserted.

## Determinism and protection results

Two read-only executions produced identical candidate order, candidate IDs, recommendation, and summaries after excluding `generated_at`. Both candidate JSON files have SHA-256 `03697e2ddfe74e7fbed7e66a0aa131bd68db0bfd87177f2b75114229f87e17aa`; both deterministic discovery values are `f418f20610aa8b813c6bfc81c485b57f67820f2b27583df1289a3d3e3adc64ef`.

The in-memory self-test passed 16 synthetic cases covering ready and missing pairs, query/header/row failures, registry ambiguity and absence, coverage and attribution review, the news attribution exception, IU exclusion, recommendation priority, deterministic IDs/order, path redaction, and no file output.

Every explored CSV hash and every IU canonical file hash remained unchanged across both runs. Discovery JSON is generated only below ignored `tmp/source-sandbox/discovery/` and is not tracked. Raw archive CSV and user-local absolute paths were not added to Git.

## Next boundary

V46 should perform an isolated import and normalization only if a future discovery run yields a genuinely ready recommendation, using a run root separate from IU. Until the registry evidence, export-pair ambiguity, and attribution blockers are resolved, no candidate should enter normalization or the downstream pipeline.
