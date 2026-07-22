# 에스파 artist source mapping preview

## 수정된 계약과 범위

직전 v52 시도는 기존 builder schema와 safe metadata 요구가 충돌해 파일이나 output을 만들지 않고 안전하게 중단됐다. 수정된 계약은 기존 canonical mapping schema에 `source_url` 필드가 포함된다는 사실을 인정한다. canonical local output에서는 해당 필드를 삭제하거나 바꾸지 않으며, 파일은 Git이 무시하는 별도 tmp 경로에만 둔다. validation, summary, 문서 및 최종 보고에는 그 값을 노출하지 않는다.

이번 단계는 v51 검증을 통과한 에스파 normalized source를 입력으로 한 독립 local mapping preview다. 전체 pipeline, quality, approval 또는 review 단계가 아니며 production 및 registry identity를 확정하지 않는다.

## builder와 identity 재사용

기존 `build_artist_source_mappings.py`의 `compile_alias_patterns`, `validate_preconditions`, `build_mapping`, `duplicate_count`, `serialize_json` helper를 importlib로 직접 재사용했다. mapping record schema와 deterministic mapping ID semantics, `mapped`/`review_required` status 및 `confirmed`/`weak`/`missing` evidence semantics를 변경하지 않았다.

v51 count를 기존 builder precondition shape로 연결하는 메모리 validation adapter를 사용했다. local sandbox key는 normalized record의 유일한 slug로 `sandbox:artist:{artist_slug}` 규칙에 따라 만들었다. 이는 production 또는 registry artist ID가 아니며 어디에도 등록하지 않는다. local candidate provenance ID는 v49 decision에서 읽었다.

## 결과

입력 2,000건에서 canonical mapping 2,000건을 생성했으며 news와 blog는 각각 1,000건이다. 기존 builder의 실제 결과는 mapped 2,000건, review-required 0건이며 confirmed evidence 2,000건, weak 0건, missing 0건이다. internal source ID와 mapping ID는 각각 2,000개가 고유하며 duplicate는 0개다.

실제 mapping status는 `valid_local_mapping_preview`, 다음 단계 eligibility는 `eligible`이다. news attribution limitation warning은 전달했지만 mapping 판정에는 사용하지 않았고 누락 attribution을 추정하지 않았다. blog attribution 상태도 원본 그대로다.

첫 실행과 repro의 canonical mapping 및 validation SHA-256, record 순서와 ID 순서, status/evidence count가 일치했다. synthetic self-test는 35개 이상의 case를 통과했다. canonical output과 safe metadata output은 별도 tmp 경로에 있고 Git이 추적하지 않는다.

v45~v51 output, IU canonical tmp 및 기존 builder·validator·importer를 수정하지 않았다. production, pipeline, quality, approval, review, source decision, score, ranking, artist page 효과는 모두 0이다. 다음 단계는 별도 승인이 필요한 에스파 quality/eligibility preview다.
