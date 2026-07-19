# Real Source Sandbox Validation

Status: local-only normalized data validation. This step does not change source
items or connect them to FANDEX scores, rankings, charts, or artist pages.

## Purpose

The validator checks the 2,000 normalized Naver items produced for the 아이유
source sandbox in v36: 1,000 news items and 1,000 blog items. It verifies
structure, identifiers, URL and content duplication, import counts, and lexical
artist-alias evidence without calling an external API.

The output report is written to
`tmp/source-sandbox/naver/iu/validation-report.json`. The `tmp/source-sandbox/`
tree is local-only and excluded from Git.

## Structure Validation

Each item is checked for the full v36 normalized field set:

- Source identity, provider, and source type
- Artist name and slug supplied to the sandbox import
- External source identity and URL
- Title, summary, publication metadata, and collection metadata
- Raw row number and content hash

The validator also checks that:

- News and blog JSON files contain top-level arrays.
- Provider, source type, artist name, and artist slug match the requested target.
- Internal source IDs are present and unique across both files.
- Raw row numbers are positive integers and content hashes are present.
- Present URLs are valid HTTP(S) URLs.
- Canonical URLs and content hashes do not repeat.
- Actual array counts match the v36 import summary.

Missing title, summary, URL, or publication date values are counted as data
quality observations rather than structural errors. Structural errors are
written to the report and cause the validator to return exit code 1.

## Artist Alias Evidence

The validation uses three explicit aliases: `아이유`, `IU`, and `이지은`.
English `IU` matching requires English token boundaries so it is not accepted
inside another alphanumeric word.

Items are classified as:

- **confirmed:** an alias appears in the title or summary.
- **weak:** no title or summary alias appears, but an alias appears in
  `author_or_publisher`.
- **needs_review:** no alias appears in those evidence fields.

The imported `artist_name` and `artist_slug` fields are not evidence. A
`needs_review` result is a manual-review candidate, not deletion, rejection, or
an eligibility decision.

Likewise, `confirmed` means lexical alias evidence is present. It does not
automatically resolve namesakes, product names, ambiguous uses, or actual
artist relevance. The validator performs no entity-resolution decision.

## v37 Local Result

| Metric | News | Blog | Total |
| --- | ---: | ---: | ---: |
| Items | 1,000 | 1,000 | 2,000 |
| Confirmed | 1,000 | 1,000 | 2,000 |
| Weak | 0 | 0 | 0 |
| Needs review | 0 | 0 | 0 |
| Missing title | 0 | 0 | 0 |
| Missing summary | 0 | 0 | 0 |
| Missing URL | 0 | 0 | 0 |
| Missing published date | 0 | 0 | 0 |
| Structural errors | 0 | 0 | 0 |

Confirmed rate is 100.00%; weak and needs-review rates are both 0.00%. There
are no duplicate internal IDs, canonical URLs, or content hashes. The news and
blog array counts match the import summary.

These counts describe this local export pair only. They are not source quality,
eligibility, coverage, or production-readiness metrics.

## Usage

From Windows CMD:

```bat
py scripts\source-sandbox\validate_normalized_sources.py ^
  --artist-name "아이유" ^
  --artist-slug "iu" ^
  --artist-alias "아이유" ^
  --artist-alias "IU" ^
  --artist-alias "이지은" ^
  --news-file "tmp\source-sandbox\naver\iu\news.normalized.json" ^
  --blog-file "tmp\source-sandbox\naver\iu\blog.normalized.json" ^
  --import-summary-file "tmp\source-sandbox\naver\iu\import-summary.json" ^
  --output-file "tmp\source-sandbox\naver\iu\validation-report.json"
```

`--artist-alias` may be repeated. The report contains aggregate statistics and
at most 20 minimal samples each for needs-review items and structural errors; it
does not copy full original payloads.

## Boundaries and Next Step

The validator does not modify normalized JSON, calculate sentiment, calculate a
quality or FANDEX score, approve sources, or publish ranking data. No report or
source result is served by the application.

The next step is to examine ambiguous alias contexts and define an explicit
artist/source mapping contract. That contract should distinguish lexical alias
evidence from verified artist relevance before any eligibility or application
work is considered.
