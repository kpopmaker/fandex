# 에스파 normalized source local validation

## 범위

이 단계는 v50 local import가 만든 에스파 normalized source를 읽기 전용으로 검증한다. source sandbox 전체 pipeline, artist mapping, quality/eligibility, approval gate 또는 human review queue 실행이 아니다. production import와 pipeline 실행 권한도 부여하지 않는다.

## 기존 validator 재사용

wrapper는 기존 v37 `scripts/source-sandbox/validate_normalized_sources.py`를 importlib로 읽기 전용 로딩하고 `validate_items`, `canonicalize_url`, `add_duplicate_errors`, `compile_alias_patterns`, `empty_source_stats` 등의 helper와 required-field semantics를 직접 재사용한다. 기존 validator와 importer는 수정하지 않았다. 조사한 관련 경로는 다음과 같다.

- `scripts/source-sandbox/validate_normalized_sources.py`
- `scripts/source-sandbox/import_naver_exports.py`
- `scripts/source-sandbox/import_selected_aespa_exports.py`
- `scripts/source-sandbox/build_artist_source_mappings.py`
- `docs/real-source-sandbox-naver-import.md`
- `docs/real-source-sandbox-aespa-local-import.md`

요청된 normalized-source validation 문서는 저장소에 존재하지 않아 실제 v37 구현을 기준으로 검증했다.

## 검증 결과

normalized schema version은 `v36`이다. news 1,000건과 blog 1,000건, 총 2,000건을 검증했다. unique source ID는 2,000개이고 duplicate source ID, malformed record, required-field failure, unsupported source type은 모두 0개다. query identity coverage는 100%이며 날짜 및 URL validation failure도 0개다. production 또는 registry artist ID는 생성되거나 발견되지 않았다.

news attribution은 원본 provider limitation으로 coverage 0%이며 1,000개의 null을 그대로 보존했다. attribution을 추정하지 않았고 이 상태는 `news_attribution_source_limitation` warning으로 기록했다. blog attribution coverage는 100%다. 이 warning은 normalized source validation 실패를 의미하지 않는다.

validation status는 `valid_for_local_mapping_preview`, local mapping preview eligibility는 `eligible`이다. 이는 별도 승인을 받은 다음 artist source mapping preview의 입력으로 사용할 수 있다는 뜻일 뿐 production 또는 pipeline 승인이 아니다.

첫 실행과 repro의 validation JSON SHA-256과 deterministic validation hash가 일치하고, generated_at을 제외한 summary가 동일하다. synthetic self-test는 30개 이상의 case를 통과했다. output은 `tmp/source-sandbox/naver/aespa-validation/`과 repro 전용 validation 경로에만 있으며 Git이 추적하지 않는다.

v45~v50 output과 IU canonical tmp, 기존 validator와 importer는 수정하지 않았다. production, pipeline, mapping, source decision, score, ranking, artist page 효과는 모두 0이다. validation metadata와 이 문서에는 source 원문, raw title·description·URL, filename 또는 archive 경로를 포함하지 않는다.

다음 단계는 별도 승인이 필요한 에스파 artist source mapping preview다.
