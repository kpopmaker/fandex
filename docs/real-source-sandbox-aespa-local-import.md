# 에스파 representative export local sandbox import

## 승인과 범위

프로젝트 소유자는 v49에서 선택된 에스파 news 대표 export 1개와 blog 대표 export 1개의 local sandbox import를 명시적으로 승인했다. 이 승인은 production import, source sandbox pipeline 실행, source 승인·거절, FANDEX 점수·ranking·artist page 반영 승인이 아니다.

import wrapper는 v49 decision을 입력으로 사용하며 선택된 news/blog file ID를 decision JSON에서 읽는다. file ID는 코드나 contract에 선택값으로 하드코딩하지 않고, 사용자 승인 범위를 벗어난 입력을 막는 실행 전 기대값 safety check에만 사용한다. 대표 파일의 selected group membership과 selected pair membership도 v49 validation evidence로 검증한다.

## 기존 importer 재사용

`scripts/source-sandbox/import_naver_exports.py`의 `clean_text`, `load_rows`, `normalize_row`, `normalize_export` helper를 importlib로 직접 불러온다. 따라서 v36의 HTML entity/markup 정리, 날짜 및 URL normalization, attribution null 처리, normalized source ID·content hash·deduplication 규칙, record field shape와 row ordering을 그대로 사용한다. 기존 importer 및 다른 source sandbox script는 수정하지 않았다.

조사한 경로는 다음과 같다.

- `scripts/source-sandbox/import_naver_exports.py`
- `scripts/source-sandbox/audit_naver_attribution.py`
- `scripts/source-sandbox/validate_normalized_sources.py`
- `scripts/source-sandbox/discover_naver_artist_datasets.py`
- `scripts/source-sandbox/analyze_second_artist_export_pairs.py`
- `docs/real-source-sandbox-naver-import.md`
- v36~v49의 `docs/real-source-sandbox-*.md` 관련 문서

## 결과와 제한

local output은 `tmp/source-sandbox/naver/aespa/`와 결정론 재실행용 `tmp/source-sandbox/naver/aespa-repro/` 아래에만 생성되며 Git이 추적하지 않는다. news 1,000건과 blog 1,000건, 총 2,000건을 import했고 unique source ID는 2,000개, duplicate와 malformed record는 각각 0개다. query identity coverage는 100%다.

news attribution coverage는 원본 source limitation 때문에 0%이며 누락값 1,000개를 null로 보존했다. URL, title, domain 등에서 언론사나 provider를 추정하지 않았다. blog attribution은 원본 `bloggername` 규칙으로 보존되어 coverage가 100%다. 이 coverage는 점수나 ranking에 사용하지 않았다.

normalized JSON에는 기존 schema가 요구하는 source title, summary, URL 등의 필드가 포함되지만 이 문서에는 원문을 노출하지 않는다. authorization, validation, summary metadata에는 archive 경로와 filename 및 raw title·description·URL을 기록하지 않았다.

첫 실행과 repro 실행의 authorization, normalized output, validation SHA-256이 각각 일치했다. source ID 집합과 record/source type 순서, attribution null/present 상태가 같았으며 generated_at을 제외한 summary도 일치했다. synthetic self-test 33개와 Python compile, contract/output JSON 재로딩을 통과했다.

archive CSV와 v45~v49 output, IU canonical tmp는 실행 전후 hash가 같았다. archive, production, database, storage write와 pipeline/source decision/score calculation/ranking/artist page 효과는 모두 0이다.

다음 단계는 에스파 normalized source validation이다. source sandbox pipeline 실행에는 별도 사용자의 승인이 필요하다.
