# 에스파 source quality/eligibility preview

이 단계는 v52 local artist/source mapping preview를 입력으로 사용하는 독립 quality/eligibility preview다. 전체 pipeline이나 approval gate가 아니며 production 및 registry identity를 확정하지 않는다.

기존 `preview_source_quality_eligibility.py`의 pure helper인 `validate_inputs`, `quality_preview`, `eligibility_preview`, `build_record`, `reason_counts`, `duplicate_count`, `serialize_json`을 동적으로 로딩해 그대로 재사용했다. 기존 builder의 `main()`과 원본 summary는 실행하거나 저장하지 않았다. 원본 summary의 review sample에는 URL과 author metadata가 포함될 수 있기 때문이다.

canonical output은 기존 `build_record()` schema를 변경하지 않으므로 source URL 및 author metadata 필드를 유지할 수 있다. 이 output은 Git이 무시하는 local tmp 전용이며 내용은 로그로 출력하지 않았다. validation, safe summary, 이 문서에는 해당 원문값과 review sample을 포함하지 않았다.

입력 2,000건과 mapping 2,000건을 정확히 연결해 news 1,000건과 blog 1,000건의 preview를 생성했다. quality는 ready 1,000건, review-required 1,000건, blocked 0건이며 eligibility는 candidate 1,000건, review-required 1,000건, blocked 0건이다. quality reason은 complete-core-metadata와 missing-author-or-publisher가 각각 1,000건이고, eligibility reason은 mapped-confirmed-source와 quality-ready가 각각 1,000건, quality-review-required가 1,000건이다. news attribution 누락은 기존 규칙에 따라 quality review로 전달됐으며 attribution을 추정하지 않았다. blog attribution은 원본 상태로 유지했다.

blocked record와 duplicate preview/internal source ID는 0개다. 실제 preview status는 `valid_local_quality_eligibility_preview`, local approval gate preview eligibility는 `eligible`이다. 이는 approval gate 실행이나 승인을 의미하지 않는다.

첫 실행과 repro의 canonical preview 및 validation hash, record와 ID 순서, status/reason count가 일치했다. synthetic self-test는 45개 이상의 check를 통과했다. v45~v52 output, IU canonical tmp 및 기존 builder·validator·importer는 수정하지 않았다. production, database, storage, pipeline, approval, review, source decision, score, ranking, artist page 효과는 모두 0이다.

다음 단계는 별도 승인이 필요한 에스파 approval gate preview다.
