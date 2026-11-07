<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FANDEX 작업 기준 (2026-10-20부터)

## 제품
K-pop 아이돌 그룹을 주식처럼 보여주는 플랫폼. 7개 변수로 그룹별 FANDEX 가격을 만들고,
시가총액식 K-pop 종합지수(KMI)를 낸다. 투자 상품이 아니라는 고지를 항상 유지한다.

- **홈 `/`**: KMI 값과 선 차트(기간 선택) → 아래로 주요 뉴스 Top 10, 종합 Top 5, 급상승 Top 5
- **랭킹 `/ranking`**: 1~100위. 기준(종합/급상승/급하락/팬캡/변수별), 기간(1일/1주/1달), 그룹(전체/보이/걸), 오름·내림차순
- **아티스트 `/artists`, `/artists/[id]`**: 검색, 가격 선 차트(기본 1주, 1일~1년), 변수별 분석과 변수 차트
- **비교 `/compare?ids=a,b,c`**: 최대 3팀 수익률·가격 차트와 변수 비교
- 산정 방식(`/methodology`)은 사용자 요청으로 2026-11-07 메뉴와 페이지 모두 숨겼다. 그 밖의 예전 페이지도 `page.hidden.tsx`로 숨겨 두었다(라우트에서 빠짐). `youtube-analytics-evidence`, `privacy`, `terms`는 Google API 심사·약관용으로 유지.

## 데이터와 계산
- 대상: `data/market/universe.json` — 활동 중인 그룹 186팀(솔로 제외, 원본 177팀 + build-universe.mts의 EXTRA_GROUPS 9팀). 원본은 `app/data/v4/artistUniverse.ts`, 다시 만들 때 `npx tsx scripts/market/build-universe.mts`.
- 수집: Render 크론(매시 17분)이 `naver-news-blob-only-recurring-production-v1.yml`을 부르고, 그게 `market-collect.yml`(loop_minutes=44)을 불러 약 45분 동안 15분 구간마다 `scripts/market/collect.ts` 실행(GitHub 스케줄은 자주 건너뛰어 매시 5분 예비용만 둠) → `market-data` 브랜치(latest.json, history.json.gz, run-report.json)를 통째로 새로 올린다. 네이버 뉴스 30분, 벅스 실시간 1시간(Node가 끊기면 curl), Last.fm 하루 1번.
- 진단은 `market-data` 브랜치의 `run-report.json`을 본다(Actions 로그는 이 환경에서 못 읽음). 기준을 다시 잡으려면 collect.ts의 `DATA_EPOCH`를 올린다.
- 사이트: `lib/market/dataset.ts`가 market-data를 읽고(2분 캐시), `engine.ts`/`queries.ts`가 가격·등락률·시리즈를 만든다. 계산식은 `lib/market/formula.ts` 하나뿐(수집기와 공유).
- 원점수: 실제 숫자를 로그 눈금으로 0~100점(SCORE_REF 기준치). 계수: 음원 1.25, 뉴스 1.1, SNS 1.1, 브랜드 0.9, 활동 0.8, 모멘텀 1.0, 조정 −1.4.
- 가격 = 100·e^((점수−50)/50), 팬캡 = 가격×(Last.fm 청취자와 유튜브 구독자 평균/10만), KMI = Σ팬캡÷제수(유튜브 반영 후 다시 잡은 기준 2026-11-07 = 1,000, 팬덤 규모 변경 시 제수 조정).
- 기록이 기간만큼 없으면 등락률은 null('—'). 거짓 숫자를 채우지 않는다.
- **실데이터가 없는 변수는 화면에 내지 않는다** (`variables.ts`의 `enabled`).
- 유튜브: `youtube-resolve.yml`(매일)이 공식 채널 후보를 `youtube-resolve` 브랜치에 쌓는다. 사람이 확인한 채널만 `data/market/youtube-channels.json`에 넣고(171팀, 잘못 잡힌 15팀은 excluded), 수집기는 그 목록의 구독자 수를 하루 1번 받는다. SNS/팬덤 = Last.fm 청취자 점수와 구독자 점수 평균.

## 디자인
- PC 우선, 다크 모드 지원(`data-theme="night"`). 레퍼런스: NH투자증권, 토스증권.
- 한국 증시 관례: 상승 빨강(`fx-up`), 하락 파랑(`fx-down`). 색은 `globals.css`의 `--fx-*` 토큰만 쓴다.
- 글꼴 Pretendard, 숫자는 `fx-num`(고정폭 숫자).

## 작업 방식
- 바이브코딩: 작게 고치고, 화면으로 확인하고, main에 바로 커밋·푸시한다. 예전의 승인 게이트·attestation 머지 절차는 쓰지 않는다.
- 화면 변경은 `work/*` 브랜치에 먼저 올리면 preview-check가 lint·typecheck·build·스크린샷을 돌리고 결과를 `preview-shots` 브랜치에 남긴다. 통과하면 main으로 fast-forward.
- 배포: Vercel은 무료 한도 초과로 차단 상태. 지금은 Render `fandex-product-self-host-v1`(자동 배포 꺼짐)에 수동 배포한다.
- Render 크론 2개는 계속 쓴다: 17분 크론 = 실데이터 수집 트리거. 7분 크론은 예전 SNS 유튜브 측정 워크플로를 부른다(정리 대상). Render 크론이 부르는 워크플로 파일 이름과 입력값은 바꾸지 않는다.
