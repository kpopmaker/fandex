# Real Source Sandbox Artist Mapping

Status: deterministic local-only mapping foundation. This work does not create
or confirm a production artist identity and is not connected to FANDEX scores,
rankings, charts, or artist pages.

## Purpose

The v38 builder maps the 2,000 normalized Naver items validated in v37 to the
local sandbox identity `sandbox:artist:iu`. The input contains 1,000 news items
and 1,000 blog items for the 아이유 sandbox.

`sandbox:artist:iu` is an isolated review key, not a production FANDEX artist
ID. The builder does not modify normalized items, the validation report, or an
application registry.

## Read-Only Registry Investigation

The repository investigation was read-only. It found the primary existing
candidate in `app/data/v4/artistUniverse.ts`, where a `createArtist` record uses
`id: 'iu'`, ticker and name `IU`, the Naver query `아이유 IU`, and aliases that
include `아이유`, `이지은`, `IU`, and `Lee Jieun`.

The identifiers `artistId: 'iu'` or `artistIds: ['iu']` also appear in preview
fixtures under:

- `app/data/v4/scoring/issueSourceFixtures.ts`
- `app/data/v4/scoring/mockIssueSignals.ts`

These are reference candidates only. No existing app file was changed, and the
sandbox mapping does not claim that `iu` is a finalized production identity or
contract.

## Mapping Preconditions

Before writing output, the builder requires:

- A validation report with zero structural errors
- Validation report totals matching the normalized arrays
- Matching artist name and slug on every normalized item
- Naver as the provider and the expected news or blog source type
- A present, globally unique internal source ID
- A present content hash

If any precondition fails, the builder prints the errors, returns exit code 1,
and does not create mapping output.

## Alias Evidence Contract

The builder independently checks `아이유`, `IU`, and `이지은` rather than
copying the v37 classification. English `IU` requires alphanumeric token
boundaries.

- **confirmed:** an alias appears in title or summary; status is `mapped`.
- **weak:** no title or summary alias appears, but an alias appears in
  `author_or_publisher`; status is `review_required`.
- **missing:** no alias appears in the permitted evidence fields; status is
  `review_required`.

An imported `artist_slug` of `iu` is a precondition check, not mapping evidence.
Weak or missing evidence is never automatically mapped. Confirmed evidence is
lexical evidence only and does not resolve namesakes or ambiguous context.

## Mapping Record

Each record contains deterministic mapping and source identifiers, the sandbox
artist key, provider and source type, status and evidence labels, sorted matched
aliases and evidence fields, URL and publication metadata, content hash, and raw
row number.

`mapping_id` is `mapping_` followed by the SHA-256 digest of the sandbox artist
key and internal source ID joined with a newline. Records are sorted by source
type and internal source ID before serialization.

Title and summary text are used for evidence matching but are not copied into
mapping output. The output also contains no score, sentiment, quality,
eligibility, or production artist ID field.

## Local Output

The first execution writes:

- `tmp/source-sandbox/naver/iu/artist-source-mappings.json`
- `tmp/source-sandbox/naver/iu/artist-source-mapping-summary.json`

The reproduction check writes the same filenames below
`tmp/source-sandbox/naver/iu/repro-check/`. All files remain below the ignored
`tmp/source-sandbox/` tree and are not tracked by Git.

## v38 Local Result

| Metric | Result |
| --- | ---: |
| News inputs | 1,000 |
| Blog inputs | 1,000 |
| Total inputs | 2,000 |
| Mapping records | 2,000 |
| Mapped | 2,000 |
| Review required | 0 |
| Confirmed evidence | 2,000 |
| Weak evidence | 0 |
| Missing evidence | 0 |
| Duplicate mapping IDs | 0 |
| Duplicate internal source IDs | 0 |
| Validation report count match | Yes |

The result reflects alias evidence in this local export pair. It is not a
quality, eligibility, relevance, or production-readiness result.

## Determinism Check

The builder was run twice against the same inputs. Both mapping files produced
this SHA-256 digest:

```text
bc20a3069dcce19a487ac2fd31f5f73a5f3e0b49d7ed528aad84c2b62d67d0f9
```

The JSON arrays, record order, mapping IDs, and record contents were identical.
Both files contained 2,000 unique mapping IDs and 2,000 unique internal source
IDs. Summary statistics were identical after excluding `generated_at`, the
intentional execution-time field.

## Usage

From Windows CMD:

```bat
py scripts\source-sandbox\build_artist_source_mappings.py ^
  --sandbox-artist-key "sandbox:artist:iu" ^
  --artist-name "아이유" ^
  --artist-slug "iu" ^
  --artist-alias "아이유" ^
  --artist-alias "IU" ^
  --artist-alias "이지은" ^
  --news-file "tmp\source-sandbox\naver\iu\news.normalized.json" ^
  --blog-file "tmp\source-sandbox\naver\iu\blog.normalized.json" ^
  --validation-report-file "tmp\source-sandbox\naver\iu\validation-report.json" ^
  --output-file "tmp\source-sandbox\naver\iu\artist-source-mappings.json" ^
  --summary-file "tmp\source-sandbox\naver\iu\artist-source-mapping-summary.json"
```

`--artist-alias` may be repeated. A second execution can target the
`repro-check` directory for byte-level comparison.

## Boundaries and Next Step

The builder performs no external fetch, source write, sentiment analysis,
quality evaluation, eligibility decision, FANDEX calculation, or application
publication. No ranking or artist page reads these mappings.

The next step is to use this mapping contract to review quality and eligibility
concepts in a separate local sandbox, without treating lexical mapping as
approval or score application.
