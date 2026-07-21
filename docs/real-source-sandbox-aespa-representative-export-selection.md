# 에스파 representative export selection dry-run

## 선택의 의미

사용자는 에스파의 유일한 shortlisted news group과 blog group을 선택하고, 각 group의 결정론적 `representative_file_id`를 local source sandbox 입력 후보로 확정하는 방식을 명시했다. 이는 v48의 “에스파를 분석 대상으로 선택”한 상태에서 한 단계 나아간 local export 선택 기록이지만, production artist identity나 production source를 선택한 것은 아니다. 실제 import, normalization 또는 pipeline 실행 승인도 아니다.

resolution intent는 `select_representative_exports`다. reviewer ID `project_owner`는 개인 실명·이메일·GitHub 계정이 아닌 local role label이다. 실제 인간 검토 시각을 시스템이 추측하지 않도록 `reviewed_at`은 null로 유지했다.

## 선택 근거

선택한 news group은 member 5개가 동일 content 결과를 나타내는 유일한 non-dominated shortlist group이다. 1,000행과 고유 1,000행을 포함한다. 선택한 blog group은 member 9개, 1,000행, 고유 1,000행인 유일한 non-dominated shortlist group이다. 각 representative file ID는 group member ID를 결정론적으로 정렬했을 때 첫 값이며, 동일 group의 다른 파일과 content-set 결과가 같다.

고정 rationale은 다음 순서다.

1. `equivalent_exports_collapsed`
2. `safely_dominated_subset_excluded`
3. `maximal_content_group_selected`
4. `identity_coverage_confirmed`
5. `representative_file_confirmed`

news attribution coverage는 0%, blog는 100%다. news attribution gap은 기존 source limitation으로 남아 있다. 전체 pair attribution이 완전하다는 오해를 막기 위해 `attribution_coverage_confirmed` rationale은 사용하지 않았다. attribution은 자동 선택, score 또는 ranking에 사용하지 않았다.

## Local decision과 dry-run

새 decision JSON은 기존 blank resolution template을 메모리에서 deep copy해 생성했다. 원본 template은 수정하지 않았다. 유일한 shortlisted group과 그 representative member, 유일한 pair 조합의 membership을 모두 검증했다.

- local sandbox selection status: `selected_representative_exports`
- production selection status: `not_selected`
- import authorization: `not_authorized`
- pipeline authorization: `not_authorized`
- valid decision: 1
- invalid decision: 0
- production effect: 0

database, storage, archive write와 import, normalization, pipeline, source decision, score calculation, ranking update, artist page update count는 모두 0이다. dry-run은 다음 단계에서 별도의 에스파 local sandbox import 승인이 필요하다는 사실만 표시한다.

## 결정론 및 보호 검증

첫 실행과 repro의 decision, validation, dry-run JSON SHA-256이 각각 동일했다. 선택 group/file ID, rationale 순서, authorization 상태도 동일했고 `generated_at`을 제외한 summary가 일치했다.

- deterministic decision SHA-256: `d8f3075adc23380a707f5b27cd8aced5a57505a33683a4ae99f81c3468dc704e`
- deterministic validation SHA-256: `6e0fa0a47f533fa180dc4da2d80b8c2b559ee8dd809ba3c950afb4a34abfeb0d`
- deterministic dry-run SHA-256: `6dd40f6148357a4444f3aca7ad2897d667fc7829e2e83c724cb36984303ba37e`

27개 synthetic self-test, Python compile, contract JSON과 모든 output JSON 재로딩을 통과했다. archive CSV, v45~v48 output, IU canonical output의 실행 전후 집계 hash가 동일했다. local output은 `tmp` 아래에만 있으며 Git에 추적하지 않는다.

기사 원문, filename, archive 경로, URL, 개인 정보는 output과 문서에 복제하지 않았다. app/public 수정, 외부 API 호출, source 승인·거절·삭제, 감성·중요도·FANDEX 점수 계산, ranking 및 artist page 반영도 수행하지 않았다.

## 다음 단계

다음 단계는 별도의 사용자 승인 아래 에스파 local sandbox import를 설계·실행하는 것이다. 이번 decision과 dry-run 자체는 import 또는 pipeline 권한을 부여하지 않는다.

