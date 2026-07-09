# Source Signal Pipeline Preview

## 목적

Source Signal Pipeline Preview는 외부 source가 실제 FANDEX 점수에 반영되기 전까지 거치는 검토 흐름을 fixture/helper 기반으로 점검하기 위한 read-only preview 문서입니다.

현재 v7~v15 단계는 실제 ingestion, 저장, 승인, 점수 계산을 수행하지 않습니다. 각 단계는 source item이 candidate, quality, eligibility, application, impact, review queue, review action 후보로 이어지는 구조를 확인하기 위한 미리보기입니다.

## 전체 흐름

```text
source item / candidate preview
-> provider adapter / import pipeline preview
-> snapshot history / diff preview
-> source quality scoring preview
-> source/candidate eligibility preview
-> source signal application preview
-> source signal impact preview
-> review queue preview
-> review action preview
-> future ingestion / storage / score application
```

## 단계별 요약

| Version | Stage | 목적 | 실제 FANDEX 반영 |
| --- | --- | --- | --- |
| v7 | Source Item / Candidate Preview | source item과 variable signal candidate 구조를 확인합니다. | 반영 안 함 |
| v8 | Provider Adapter / Import Pipeline Preview | mock provider adapter와 import pipeline 결과를 fixture 기반으로 확인합니다. | 반영 안 함 |
| v9 | Snapshot History / Diff Preview | provider snapshot history와 snapshot diff를 read-only로 비교합니다. | 반영 안 함 |
| v10 | Source Quality Scoring Preview | source item과 candidate의 quality scoring 후보를 확인합니다. | 반영 안 함 |
| v11 | Eligibility Preview | source/candidate가 application 후보가 될 수 있는지 eligibility를 확인합니다. | 반영 안 함 |
| v12 | Source Signal Application Preview | eligible candidate를 FANDEX 변수에 연결할 application plan 후보로 정리합니다. | 반영 안 함 |
| v13 | Source Signal Impact Preview | application plan을 기반으로 score 반영 전 impact 후보를 확인합니다. | 반영 안 함 |
| v14 | Review Queue Preview | impact 후보 중 사람이 검토해야 할 review queue 항목을 정리합니다. | 반영 안 함 |
| v15 | Review Action Preview | review queue를 바탕으로 approve/hold/limit/reject/skip action 후보를 미리 봅니다. | 반영 안 함 |

## 현재까지 완료된 것

- Fixture 기반 source item과 candidate preview를 구성했습니다.
- Mock provider adapter와 import pipeline preview를 구성했습니다.
- Snapshot history와 diff preview를 구성했습니다.
- Source quality scoring preview를 구성했습니다.
- Eligibility preview를 구성했습니다.
- Application plan preview를 구성했습니다.
- Impact preview를 구성했습니다.
- Review queue preview를 구성했습니다.
- Review action preview를 구성했습니다.
- `/source-lab`에서 각 단계를 read-only preview로 확인할 수 있습니다.

## 아직 하지 않은 것

- 실제 외부 source ingestion은 하지 않았습니다.
- 실제 외부 API/fetch 연결은 하지 않았습니다.
- DB/Supabase 저장은 하지 않았습니다.
- 실제 파일 저장은 하지 않았습니다.
- 실제 승인/거절/보류 상태 저장은 하지 않았습니다.
- 실제 FANDEX score delta 계산은 하지 않았습니다.
- ranking/chart/artist score 계산에 연결하지 않았습니다.
- review action을 실제 운영 플로우에 연결하지 않았습니다.

## 다음 단계 후보

- Ingestion draft 설계
- Provider adapter 강화
- Storage/sync policy 설계
- 제한적 실제 source 연결 검토
- 별도 PR에서 score 반영 정책 검토
- 운영자 review workflow와 audit log 정책 설계

## 안전 조건

- FANDEX 계산 로직을 변경하지 않습니다.
- 실제 score delta를 계산하지 않습니다.
- 실제 승인/거절/보류 상태를 저장하지 않습니다.
- ranking/chart/artist score에 연결하지 않습니다.
- 외부 API/fetch를 호출하지 않습니다.
- DB/Supabase에 연결하지 않습니다.
- `process.env`를 사용하지 않습니다.
- 실제 파일 저장을 하지 않습니다.
- 기존 source helper 로직을 수정하지 않습니다.
- 현재 pipeline은 fixture/helper 기반 read-only preview입니다.
