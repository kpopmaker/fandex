# Real Source Sandbox: Naver Import

Status: local sandbox import foundation. This is not production ingestion and
does not apply data to FANDEX scores, rankings, charts, or artist pages.

## Purpose

The importer normalizes existing local Naver news and blog exports for 아이유
into a small, reviewable source sandbox. It does not call Naver or any other
external API. The confirmed inputs are local CSV exports collected previously
with the query `아이유`.

Input files remain local-only and are not copied into or committed with the
FANDEX repository. Generated results are written below
`tmp/source-sandbox/`, which is also excluded from Git.

## Confirmed Local Inputs

The v36 validation used these existing exports from the local
`naver_data_collector` archive:

- `naver_news_아이유_20260708_175137.csv`
- `naver_blog_아이유_20260708_175137.csv`

Each file contains 1,000 rows. Both use `아이유` as the query, and every row
contains `아이유` or `IU` in its query or content fields. These facts establish
the sandbox association; they do not prove that every result is relevant to the
artist. Relevance validation remains a later step.

## Usage

From Windows CMD:

```bat
py scripts\source-sandbox\import_naver_exports.py ^
  --artist-name "아이유" ^
  --artist-slug "iu" ^
  --news-file "<local news CSV or JSON path>" ^
  --blog-file "<local blog CSV or JSON path>" ^
  --output-dir "tmp\source-sandbox\naver\iu"
```

Use `python` in place of `py` on systems where the Python executable is
configured directly on `PATH`.

The script uses Python standard-library modules only. It reads existing CSV or
JSON exports and writes:

- `news.normalized.json`
- `blog.normalized.json`
- `import-summary.json`

## Normalized Item Shape

Each normalized item contains:

- Deterministic `internal_source_id`
- `provider_key` (`naver`) and `source_type` (`news` or `blog`)
- `artist_name` and `artist_slug` supplied at import time
- Provider `external_source_id`, or a deterministic URL/fallback hash
- Canonical `source_url`
- Cleaned `title` and `summary`
- `published_at` and `author_or_publisher` when present in the export
- `collected_at`, which remains `null` because the confirmed exports do not
  contain a collection timestamp
- CSV-aware `raw_row_number`
- Deterministic `content_hash`

Missing export values remain `null`. The importer removes HTML tags and
unescapes entities but does not generate article text, infer missing facts,
perform sentiment analysis, calculate quality, or calculate FANDEX scores.

## URL Normalization and Deduplication

URLs are normalized by standardizing scheme and host casing, removing
fragments and non-root trailing slashes, and sorting existing query parameters.
The first row for each canonical URL is retained within its source type.

When a URL is absent, deduplication uses the cleaned title, published date, and
publisher or author. The same fallback is hashed for an external source ID.
The importer reports duplicate, missing URL, missing date, and error counts; it
does not silently invent replacements.

## Boundaries and Next Step

This output is a local sandbox artifact, not a production source store. No
database, Supabase table, file-serving route, provider sync, application write,
or external fetch is involved. Nothing is connected to FANDEX score
calculation, ranking, or artist pages.

The next step is to inspect normalized output quality and define explicit
artist/source mapping rules before considering any broader ingestion design.

## v36 Local Validation

The confirmed import read 1,000 news rows and 1,000 blog rows. It produced
1,000 normalized news items and 1,000 normalized blog items, with no duplicate,
missing URL, missing date, or error rows reported for these two inputs. These
counts describe this local export pair only and are not production coverage
metrics.
