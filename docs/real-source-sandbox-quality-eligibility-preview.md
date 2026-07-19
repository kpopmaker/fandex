# Real Source Sandbox Quality and Eligibility Preview

Status: local-only state and reason-code preview. This work does not approve,
reject, delete, score, or publish a source and does not establish production
eligibility.

## Purpose

The v39 builder reviews metadata completeness and mapping evidence for the 2,000
normalized Naver items in the 아이유 sandbox: 1,000 news items and 1,000 blog
items. It joins each item one-to-one with the deterministic v38 mapping before
creating a quality and eligibility preview.

The preview uses categorical states and explicit reason codes rather than a
numeric quality, importance, or confidence score. This keeps missing evidence
visible without inventing thresholds or implying that metadata completeness is
the same as source trust, factual accuracy, or production approval.

## Read-Only Concept Investigation

Existing concepts were reviewed without modifying or importing their rules:

- `app/data/v4/sources/sourceQualityScoringPreview.ts` and
  `sourceQualityScoringTypes.ts` contain fixture/helper quality preview concepts.
- `app/data/v4/sources/sourceEligibilityPreview.ts` and
  `sourceEligibilityTypes.ts` contain fixture/helper eligibility concepts.
- `app/data/v4/sources/sourceSignalApplicationPreview.ts` and its types use
  candidate and review boundaries before application.
- `docs/production-source-storage-schema-adr.md` separates
  `source_quality_evaluations` and `source_eligibility_evaluations` as conceptual
  lifecycle entities.

Those files remain preview or proposal material. Their numeric scores and
thresholds are not production rules and were not copied into this local builder.

## Input Contract

Before output is written, the builder verifies:

- Present and unique normalized and mapping internal source IDs
- A one-to-one normalized-item and mapping-record relationship
- Supported mapping status, provider, and source type
- Matching artist name, slug, and `sandbox:artist:iu` key
- Present content hashes
- Zero structural errors and matching counts in the validation report
- Matching counts and zero duplicate IDs in the mapping summary

Any failure is printed to the console, returns exit code 1, and prevents preview
output creation. The sandbox key remains local and does not confirm a production
artist ID.

## Quality Preview

Quality is classified without a numeric score:

- **ready:** mapped source with present title, summary, valid HTTP(S) URL,
  parseable publication date, author or publisher, and content hash.
- **review_required:** structure is intact, but a ready field is missing or the
  mapping requires review.
- **blocked:** identity linkage is broken, provider or source type is
  unsupported, or required identity/content evidence is absent.

There is no minimum text length, publisher trust ranking, news-over-blog
preference, clickbait classification, or factuality determination. `ready` is a
local metadata state, not an approval state.

## Eligibility Preview

Eligibility is also categorical:

- **eligible_candidate:** quality is ready, mapping is mapped, artist evidence
  is confirmed, and provider/source type is supported.
- **review_required:** quality or mapping needs review, or artist evidence is weak.
- **blocked:** quality is blocked, identity/support boundaries fail, or artist
  evidence is missing.

`eligible_candidate` is not actual eligibility or approval. `review_required`
does not approve or delete a record, and `blocked` does not reject or remove the
underlying source. No production policy is inferred.

## Output Shape and Location

Each record contains deterministic preview/source/mapping identities, sandbox
identity, provider and type, quality and eligibility states with sorted reason
codes, mapping evidence labels, selected publication metadata, content hash,
and raw row number.

`preview_id` is derived with SHA-256 from the sandbox artist key, internal source
ID, and content hash. Title and summary are inspected but not copied. Records do
not contain scores, weights, ranks, deltas, sentiment, or production application
states.

The first run writes:

- `tmp/source-sandbox/naver/iu/quality-eligibility-preview.json`
- `tmp/source-sandbox/naver/iu/quality-eligibility-preview-summary.json`

The reproduction run writes matching filenames below
`tmp/source-sandbox/naver/iu/repro-check/`. The entire sandbox tree is ignored by
Git.

## v39 Local Result

| Metric | Result |
| --- | ---: |
| News inputs | 1,000 |
| Blog inputs | 1,000 |
| Total inputs and preview records | 2,000 |
| Quality ready | 1,000 |
| Quality review required | 1,000 |
| Quality blocked | 0 |
| Eligible candidates | 1,000 |
| Eligibility review required | 1,000 |
| Eligibility blocked | 0 |
| Duplicate preview IDs | 0 |
| Duplicate internal source IDs | 0 |

Quality reason counts are `complete_core_metadata: 1,000` and
`missing_author_or_publisher: 1,000`. Eligibility reason counts are
`mapped_confirmed_source: 1,000`, `quality_ready: 1,000`, and
`quality_review_required: 1,000`.

The 1,000 review-required records are news items whose confirmed normalized
export contains no author or publisher field. This result does not rank blogs
above news or judge publisher trust; it only preserves the stated metadata
contract. Validation and mapping input counts both match the 2,000 records.

## Determinism Check

Both executions produced this preview JSON SHA-256 digest:

```text
9a3cefd31439bfea2acc4dd716e30510d0c752c3b97321f8277ee60354c3deea
```

The 2,000 records, order, preview IDs, internal source IDs, and sorted reason
arrays were identical. Normalized, mapping, and preview internal ID sets match
exactly. Summary statistics match after excluding the intentional
execution-time `generated_at` field.

## Usage

From Windows CMD:

```bat
py scripts\source-sandbox\preview_source_quality_eligibility.py ^
  --sandbox-artist-key "sandbox:artist:iu" ^
  --artist-name "아이유" ^
  --artist-slug "iu" ^
  --news-file "tmp\source-sandbox\naver\iu\news.normalized.json" ^
  --blog-file "tmp\source-sandbox\naver\iu\blog.normalized.json" ^
  --validation-report-file "tmp\source-sandbox\naver\iu\validation-report.json" ^
  --mapping-file "tmp\source-sandbox\naver\iu\artist-source-mappings.json" ^
  --mapping-summary-file "tmp\source-sandbox\naver\iu\artist-source-mapping-summary.json" ^
  --output-file "tmp\source-sandbox\naver\iu\quality-eligibility-preview.json" ^
  --summary-file "tmp\source-sandbox\naver\iu\quality-eligibility-preview-summary.json"
```

## Boundaries and Next Step

The builder makes no external call and performs no sentiment analysis,
importance scoring, FANDEX calculation, source approval, rejection, deletion,
or application write. No ranking or artist page reads these local files.

The next step is to review an approval-gate contract and a local approval
snapshot preview while keeping candidates separate from actual approval and
score application.
