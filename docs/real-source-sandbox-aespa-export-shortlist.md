# 에스파 export shortlist preview

## 목적과 범위

사용자는 두 번째 source sandbox의 상세 분석 대상을 에스파로 명시했다. 이는 분석 범위를 한 후보로 제한한 것이며 production artist identity, registry ID, sandbox identity, news/blog export를 확정한 결정이 아니다. import, normalization, pipeline 실행 승인도 아니다.

v47에서 에스파의 news export 12개와 blog export 14개는 모두 identity coverage 100%였지만 서로 다른 content set이 있어 `manual_pair_selection_required`로 남았다. 이번 local-only preview는 원문 기사 없이 row fingerprint set을 비교해 사람이 검토할 non-dominated shortlist를 만든다.

## 분석 방법

동일 source type에서 `content_set_fingerprint_sha256`가 같은 export를 equivalent group으로 묶었다. file SHA까지 같으면 byte-identical, ordered fingerprint가 같으면 identical-ordered, row 순서만 다르면 reordered-equivalent로 구분한다. representative file ID는 정렬상 첫 member로 정한 group 식별용 값이며 실제 선택이 아니다.

group 간 고유 row fingerprint set을 비교해 strict subset, partial overlap, disjoint 관계를 판정했다. strict superset이 header와 malformed 조건을 충족하고 identity coverage가 낮지 않을 때만 news subset을 safely dominated로 표시했다. blog에는 attribution coverage가 낮지 않아야 한다는 조건도 추가했다. 따라서 row 수, 최신 timestamp, 날짜 범위만으로 제거하지 않으며 attribution이 낮아지는 blog superset도 dominance로 처리하지 않는다. partial overlap과 disjoint group은 모두 유지한다.

shortlist에는 임의 개수 제한, score, rank, weight, recommendation을 사용하지 않았다. timestamp의 24시간 이내 여부는 evidence 표시일 뿐 선택에 사용하지 않는다.

## 실제 결과

| 항목 | News | Blog |
| --- | ---: | ---: |
| source export | 12 | 14 |
| equivalent group | 3 | 2 |
| single-export group | 0 | 0 |
| byte-identical group | 1 | 1 |
| identical-ordered group | 2 | 1 |
| reordered-equivalent group | 0 | 0 |
| mixed-equivalent group | 0 | 0 |
| shortlisted non-dominated group | 1 | 1 |
| safely dominated group | 2 | 1 |
| invalid group | 0 | 0 |
| group relation | 3 | 1 |

전체 group comparison 관계는 `left_strict_subset` 1건, `right_strict_subset` 3건이다. partial overlap과 disjoint 관계는 실제 입력에서 0건이었다.

shortlisted news group은 identical-ordered group 1개로 member 5개, row 1,000개, unique row 1,000개이며 attribution coverage 범위는 0%~0%다. shortlisted blog group은 identical-ordered group 1개로 member 9개, row 1,000개, unique row 1,000개이며 attribution coverage 범위는 100%~100%다. 두 group 모두 `non_dominated` 사유로 유지됐다.

news/blog shortlist 조합은 1건이다. 같은 batch evidence가 있는 조합은 1건이며 24시간 이내 timestamp evidence 조합은 0건이다. pair를 추천하거나 선택하지 않았다.

`actual_candidate_selection_status`는 `user_selected_for_analysis_only`, `actual_export_selection_status`는 `not_selected`다. 빈 resolution template의 `resolution_intent`는 `not_resolved`이고 selected group/file ID는 모두 null이다. reviewer와 rationale도 생성하지 않았다.

## 검증과 보호

첫 실행과 repro 실행에서 shortlist JSON, group/relation/pair 순서, group ID, pair ID, representative ID와 resolution template이 동일했다. `generated_at`을 제외한 summary도 동일하며 deterministic shortlist SHA-256은 `ca4cd61132aab66b729c8caad97bf6a523dcee8a2e557f68aeb5ce6016011607`, deterministic resolution template SHA-256은 `aa1a9daf8d4d14dfcf67498b75f65995c8991fc487b6da1528236d85fedde16d`이다.

synthetic self-test 29건과 Python compile, contract JSON 검증을 통과했다. local output은 `tmp` 아래에만 생성되어 Git 추적되지 않는다. archive CSV, v45 discovery, v46 packet/template, v47 analysis/template, IU canonical output은 수정하지 않았다. app, public, ranking, artist page도 수정하지 않았고 외부 API 호출, import, normalization, pipeline 실행, source 승인·거절·삭제, decision 입력, 감성·중요도·FANDEX 점수 계산을 수행하지 않았다.

## 다음 단계

사람이 shortlist의 news group 1개와 blog group 1개를 검토한 뒤 각 group의 representative 후보 중 file ID 1개씩을 명시적으로 선택해야 한다. identity 선택은 별도 절차이며 이 preview가 production 선택을 완료하지 않는다.

관련 구현은 다음을 읽기 전용으로 조사했다.

- `scripts/source-sandbox/discover_naver_artist_datasets.py`
- `scripts/source-sandbox/prepare_second_artist_review_packet.py`
- `scripts/source-sandbox/analyze_second_artist_export_pairs.py`
- `scripts/source-sandbox/import_naver_exports.py`
- `scripts/source-sandbox/audit_naver_attribution.py`
- `scripts/source-sandbox/second_artist_selection_contract.preview.json`
- `scripts/source-sandbox/second_artist_pair_resolution_contract.preview.json`
- `docs/real-source-sandbox-second-artist-discovery.md`
- `docs/real-source-sandbox-second-artist-review-packet.md`
- `docs/real-source-sandbox-export-pair-resolution-analysis.md`
