# 에스파 local human review queue preview

## 범위

이 작업은 기존 worktree의 untracked `public/data` 6개를 보존하기 위해 격리 worktree에서 수행했다. v54 merge commit `27b8aaa`를 기반으로, v54 local approval gate preview를 입력으로 사용했다. 실제 human review, source 승인·거절, production 반영은 수행하지 않았다.

historical builder `scripts/source-sandbox/prepare_human_review_queue.py`의 pure helper를 재사용했으며 module SHA-256은 `694b1f541218ae9c6697422319b7966b2985f168bc0bc7d98dc00502f90c5819`다. `validate_contract`, `validate_inputs`, `build_queue`, `queue_sort_key`, `duplicate_count`, `serialize_json`을 사용했고 builder `main()`은 실행하지 않았다. canonical record schema, deterministic queue ID, 정렬 및 queue semantics를 그대로 유지했다.

## 실제 결과

전체 gate 2,000건 중 approval candidate 1,000건은 제외됐다. exception review required 1,000건만 active queue에 포함됐으며 모두 news다. manual review 및 blocked queue record는 없다.

historical schema가 정의한 실제 queue status는 `pending_review`이며 1,000건이다. 모든 decision status는 `not_decided`이고 decided record는 0이다. 이는 향후 검토 대상을 정리한 preview일 뿐, 검토 실행 또는 승인·거절을 의미하지 않는다.

preview status는 `valid_local_human_review_queue_preview`, active queue preview eligibility는 `eligible`이다. 이 eligibility는 실제 human review 실행 권한이 아니라 별도 후속 preview/decision 단계의 입력 적격성만 뜻한다. production identity와 registry identity는 모두 `not_confirmed`다.

## 안전성과 검증

canonical queue는 ignored local tmp 전용이며 Git에 추적하지 않는다. historical schema에 따라 검토용 metadata가 포함될 수 있지만 validation, safe summary 및 이 문서에는 URL, author, title, summary 원문, raw sample, filename 또는 archive path를 넣지 않았다.

첫 실행과 repro의 canonical SHA-256은 모두 `a8ab70d3b283dbd307fa53ad3f8753d4335d1d57e00b524744bd1de9ea79042b`, validation 파일 SHA-256은 모두 `696adeeb8906968b337cab2d1e03e29445a0a8ba05baac7bb4f43848c338c236`였다. record와 ID 순서, count, status, reason, warning 및 generated time을 제외한 summary가 동일했다. synthetic self-test 63 checks, Python compile, contract 및 output JSON reload를 통과했다.

actual human review, source decision, production effect, DB/storage write, pipeline, score calculation, ranking update 및 artist page update는 모두 0이다. 다음 단계에는 별도 승인을 받은 review decision dry-run 또는 decision preview가 필요하다.
