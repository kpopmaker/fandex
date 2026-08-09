# 에스파 local review decision preview

## 범위

기존 worktree의 untracked `public/data` 6개를 보존하기 위해 격리 worktree에서 수행했다. base는 v55 merge commit `533a21d`이며, v55 local human review queue preview를 입력으로 사용했다.

입력 active queue는 1,000건이며 모두 news, `pending_review`, `not_decided`다. 실제 human review, approve/reject, decision 저장 또는 application은 수행하지 않았다.

## historical 구현 재사용

historical decision builder `scripts/source-sandbox/validate_human_review_decisions.py`의 pure helper를 재사용했다. module SHA-256은 `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31`이다. `contract_errors`, `linkage_errors`, `validate_entry`, `build_outputs`, `canonical_bytes`, `digest`, `duplicates`를 사용했으며 builder `main()`은 실행하지 않았다.

기존 input/application contract와 dry-run schema를 유지했다. 모든 preview record는 `decision_intent=not_decided`, `dry_run_effect=no_change`, `actionability_status=no_action`이다. approved, rejected 또는 decided record는 없다.

## 결과와 안전성

decision input adapter와 decision preview는 각각 1,000건이며 제외 record는 0이다. preview status는 `valid_local_review_decision_preview`, decision preview eligibility는 `eligible`이다. 이 eligibility는 실제 승인·거절 권한이 아니라 별도 explicit decision input/application preview의 입력 적격성만 뜻한다.

production identity와 registry identity는 `not_confirmed`다. canonical preview는 ignored local tmp 전용이며 Git에 추적하지 않는다. validation, safe summary 및 이 문서에는 URL, author, title, summary 원문, raw sample, filename 또는 archive path를 넣지 않았다.

첫 실행과 repro의 canonical SHA-256은 모두 `a1f4830381867ff2d7846c2bfd6ec75e4e585364ec07392d9fb6a4e9b1678124`, validation 파일 SHA-256은 모두 `b08a27aa765b9e6dd6d8b0f2d6b13e5a0b43625b5cff33752810452291badbac`였다. record/preview/queue/gate/source ID 순서, count/status/reason/warning 및 generated time을 제외한 summary가 동일했다. synthetic self-test 67 checks, Python compile, contract 및 output JSON reload를 통과했다.

actual human review, source decision, decision application, production effect, DB/storage write, pipeline, score calculation, ranking 및 artist page update는 모두 0이다. 다음 단계에는 별도 승인을 받은 explicit decision input 또는 decision application preview가 필요하다.
