# 에스파 local decision input preview

## 범위

기존 worktree의 untracked `public/data` 6개를 보존하기 위해 격리 worktree에서 수행했다. base는 v56 merge commit `9e4963e`이며, v56 local review decision readiness preview를 입력으로 사용했다.

대상 1,000건은 모두 news, `pending_review`, `not_decided`다. 이번 output은 향후 explicit decision submission에 필요한 historical input template와 linkage를 검증하는 readiness preview이며 실제 human review나 decision record가 아니다. approve, reject 및 decided 값은 모두 0이고 reviewer ID, review timestamp 및 note도 모두 비어 있다.

## historical schema 재사용

별도 input builder로 `scripts/source-sandbox/prepare_human_review_queue.py`의 `decision_template` helper를 재사용했다. validator/schema source는 `scripts/source-sandbox/validate_human_review_decisions.py`이며 SHA-256은 `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31`다. `decision_template`, `contract_errors`, `validate_entry`, `canonical_bytes`, `duplicates`를 재사용했고 두 module의 `main()`은 실행하지 않았다.

historical template schema와 `decision_intent=not_decided`, `reviewer_id=None`, 빈 rationale/enrichment, 비어 있는 review note/timestamp semantics를 유지했다. validator의 canonical input SHA-256을 deterministic logical input ID로 검증했으며 canonical schema에 새 ID 필드를 추가하지 않았다.

## 결과와 안전성

source 및 template record는 각각 1,000건이고 제외 record는 0이다. preview status는 `valid_local_decision_input_preview`, eligibility는 `eligible`이다. 이는 실제 결정을 내려도 된다는 뜻이 아니라 별도 explicit submission/application dry-run을 준비할 수 있다는 의미다.

canonical template은 ignored local tmp 전용이며 Git에 추적하지 않는다. validation, safe summary 및 이 문서에는 URL, author, title, summary 원문, raw sample, filename 또는 archive path를 넣지 않았다.

first/repro canonical SHA-256은 모두 `12801c4a5b9af1773d7ea54b1b96c7c330b6a923d7fd53868c879d7e19e82d9c`, validation 파일 SHA-256은 모두 `4c50277862199a14349a9fa3fe9b4bcf13e8a86dd39f535cf26fb0bd3e2ae64d`였다. record와 모든 linkage ID 순서, count/status/reason/warning 및 generated time을 제외한 summary가 동일했다. synthetic self-test 68 checks, Python compile, contract 및 output JSON reload를 통과했다.

production/registry identity는 `not_confirmed`다. actual human review, source decision, decision application, production effect, DB/storage write, pipeline, score, ranking 및 artist page update는 모두 0이다. 다음 단계에는 별도 승인을 받은 explicit decision submission/application dry-run이 필요하다.
