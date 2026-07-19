# Real Source Sandbox Attribution Recovery

Status: local-only attribution audit and importer mapping update. This work does
not change production quality or eligibility policy and does not approve,
reject, delete, score, or publish a source.

## Purpose

The v39 preview placed 1,000 of 2,000 아이유 Naver sandbox records in
`quality_status: review_required` because `author_or_publisher` was absent. The
v40 audit traces that absence to the original local CSV rows and tests whether a
trusted, explicit attribution field can be recovered without inference.

The audit never treats the search query, URL hostname, or source type label as
attribution. Those values identify search scope or transport location, not a
publisher, author, or reporter supplied by the export.

## Original CSV Audit

The local CSV files were read without modification.

News headers:

```text
query, title, originallink, link, description, pubDate
```

Blog headers:

```text
query, title, link, description, bloggername, bloggerlink, postdate
```

The missing 1,000 records are all news items. The news CSV exposes no supported
author, writer, publisher, press, media, office, journalist, reporter, provider,
or source attribution column. It therefore provides zero safely recoverable
rows and leaves 1,000 unresolved.

The blog CSV exposes `bloggername`, populated on all 1,000 rows. The existing
normalized blog records already contain those values, so no blog recovery is
needed. Both CSVs linked all normalized records by `raw_row_number`; there were
zero linkage failures and zero conflicting candidate values.

This indicates a provider export limitation for this news CSV, not a missed
mapping of an attribution column that exists in the file.

## Audit Tool

`scripts/source-sandbox/audit_naver_attribution.py` normalizes only header
casing and separators when comparing an explicit allowlist of semantically
equivalent attribution names. It reports candidate coverage, recoverability,
conflicts, row linkage, and at most 20 minimal samples per source type.

It does not copy title, summary, or full raw payloads into the local audit
report. The report is written to:

```text
tmp/source-sandbox/naver/iu/attribution-audit.json
```

## Importer Mapping Update

The importer now has explicit source-type attribution priorities.

News aliases, in order, are:

```text
publisher, publisher_name, press, press_name, media, media_name,
office, office_name, provider, journalist, reporter, author,
author_name, writer, writer_name
```

Blog aliases, in order, are:

```text
bloggername, blogger_name, blogname, blog_name, author, author_name,
writer, writer_name, publisher, publisher_name
```

The first non-empty explicit field is cleaned with the existing text handling.
No query, URL hostname, inferred organization, or source-type name is used as a
fallback. If no allowed field is present, attribution remains `null`.

## Staging Reimport Result

The improved importer was run first against ignored staging paths and then
against a separate reproduction path. Each run produced 1,000 news and 1,000
blog records with zero errors and zero duplicates.

| Comparison | News | Blog | Total |
| --- | ---: | ---: | ---: |
| Existing attribution coverage | 0 | 1,000 | 1,000 |
| Staging attribution coverage | 0 | 1,000 | 1,000 |
| Recovered rows | 0 | 0 | 0 |
| Remaining missing attribution | 1,000 | 0 | 1,000 |

Existing and staging internal source ID sets, URL sets, and per-source raw row
sets are identical. Internal source ID changes, content hash changes, and other
core-field changes are all zero. The checked core fields were URL, raw row
number, title, summary, and publication date.

The staging and reproduction records have identical order and content. Their
combined news-plus-blog JSON SHA-256 is:

```text
1eacbc729d7c4b4f0629d3b09e3985abd14be40b53887b08dd01263da458eeed
```

No execution-time normalized field required exclusion: `collected_at` remains
`null`, and the importer output contains no generated timestamp.

## Canonical and Downstream Decision

The canonical local normalized output was not replaced because the audited CSV
contains no recoverable news attribution and staging produced no changed
records. Replacing byte-equivalent local data would add no recovery value.

Because canonical normalized data was not replaced, validation, artist mapping,
and quality/eligibility preview regeneration was intentionally skipped. Their
existing local results remain:

- Validation structural errors: 0
- Mapping records: 2,000
- Quality ready: 1,000
- Quality review required: 1,000
- Eligible candidates: 1,000
- Eligibility review required: 1,000
- Quality blocked and eligibility blocked: 0
- `missing_author_or_publisher`: 1,000

No result worsened, and no canonical or downstream local artifact was changed.

## Boundaries and Next Step

This work makes no external API call and does not change production eligibility,
approve or reject sources, delete records, calculate sentiment or importance,
calculate FANDEX scores, or connect data to ranking or artist pages.

Since the original news export lacks an attribution field, the next step is to
review a source-type-specific attribution requirement contract before a local
approval snapshot preview. Any future recovery must use a provider-supplied,
auditable field rather than inferred metadata.
