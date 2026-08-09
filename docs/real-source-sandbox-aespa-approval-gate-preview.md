# 에스파 local approval gate preview

## 범위와 격리

기존 worktree의 `public/data` 오염을 보존하기 위해 별도 `fandex-v54` worktree에서 실행했다. 기존 worktree의 untracked `public/data` 6개 및 v49~v53 ignored input은 수정·복사하지 않았고, 검증된 v53 quality/eligibility preview를 CLI 경로로 직접 읽었다. 이번 결과는 전체 pipeline이나 실제 승인 절차가 아니라 독립적인 local gate preview다.

기존 `preview_source_approval_gate.py`의 pure helper와 gate semantics를 재사용했다. 해당 module의 `main()`과 원본 summary 생성은 실행하지 않았다. 기존 `audit_naver_attribution.py` helper로 선택된 export 2개만 read-only audit했으며 raw audit, raw header, sample, detected value는 저장하지 않았다. 기존 source-type rule contract도 수정하지 않았다.

## 안전성과 결과

기존 `build_record()`의 canonical schema를 유지했다. canonical output에는 URL 및 author/publisher metadata가 포함될 수 있으나 ignored local tmp 전용이며 Git에 추적하지 않는다. validation, safe summary, 이 문서에는 URL·author·title·summary·filename·archive path 등 원문 metadata를 넣지 않았다. attribution을 추정하거나 보완하지 않았다.

- 입력 및 gate record: 2,000 (news 1,000 / blog 1,000)
- approval candidate: 1,000
- exception review required: 1,000
- manual review required: 0
- blocked: 0
- attribution present: 1,000
- attribution provider limitation: 1,000
- attribution missing unverified: 0
- 모든 `decision_status`: `not_decided`

news audit는 candidate column 0, recoverable 0, link failure 0, conflict 0으로 provider limitation이 검증됐다. blog는 attribution present 1,000, candidate column 1, link failure 0, conflict 0이었다. 결과 상태는 `valid_local_approval_gate_preview`, 다음 local human review queue preview eligibility는 `eligible`이다. 이는 실제 승인이나 거절을 뜻하지 않으며 exception review도 실제 거절 상태가 아니다.

## 검증

첫 실행과 repro의 canonical SHA-256은 모두 `b0894ceb983c6234df8e9bca9607515cd1741a215a668f0202c4c252facd8e7b`, validation 파일 SHA-256은 모두 `e312a29cf439e30b766ea9a8acfd2ad1bccf93af55919c17c5d9ade27e9486a7`였다. record 순서, ID, status/attribution/reason/rule 분포, warning 순서, preview status, eligibility 및 generated time을 제외한 summary가 동일했다. synthetic self-test 63 checks, Python compile, contract JSON 검증을 통과했다.

production identity와 registry identity는 모두 `not_confirmed`다. 실제 source 승인/거절, human review queue 생성, pipeline 실행, production/DB/storage write, score 계산, ranking 및 artist page 반영은 모두 0이다. 다음 단계는 별도 승인을 받은 human review queue preview다.
