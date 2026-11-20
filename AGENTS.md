<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FANDEX 작업 기준 (2026-10-20부터)

## 제품
K-pop 아이돌 그룹을 주식처럼 보여주는 플랫폼. 7개 변수로 그룹별 FANDEX 가격을 만들고,
시가총액식 K-pop 종합지수(KMI)를 낸다. 투자 상품이 아니라는 고지를 항상 유지한다.

- **홈 `/`**: KMI 값과 선 차트(기간 선택) → 아래로 주요 뉴스 Top 10, 종합 Top 5, 급상승 Top 5
- **랭킹 `/ranking`**: 1~100위. 드롭다운으로 기준(종합/급상승/급하락/팬캡/변수별), 기간(1일/1주/1달), 그룹(전체/보이/걸/혼성), 세대(1~5세대), 오름·내림차순
- **아티스트 `/artists`, `/artists/[id]`**: 검색, 가격 선 차트(기본 1주, 1일~1년), 변수별 분석과 변수 차트
- **비교 `/compare?ids=a,b,c`**: 최대 3팀 수익률·가격 차트와 변수 비교
- 산정 방식(`/methodology`)은 사용자 요청으로 2026-11-07 메뉴와 페이지 모두 숨겼다. 그 밖의 예전 페이지도 `page.hidden.tsx`로 숨겨 두었다(라우트에서 빠짐). `youtube-analytics-evidence`, `privacy`, `terms`는 Google API 심사·약관용으로 유지.

## 데이터와 계산
- 대상: `data/market/universe.json` — 활동 중인 그룹 188팀(솔로 제외, 원본 177팀 + build-universe.mts의 EXTRA_GROUPS 11팀). 세대는 데뷔연도로 1(~2002)·2(2003~2011)·3(2012~2017)·4(2018~2022)·5(2023~). 원본은 `app/data/v4/artistUniverse.ts`, 다시 만들 때 `npx tsx scripts/market/build-universe.mts`.
- 수집: Render 크론(매시 17분)이 `naver-news-blob-only-recurring-production-v1.yml`을 부르고, 그게 `market-collect.yml`(loop_minutes=52)을 불러 약 52분 동안 15분 구간마다 `scripts/market/collect.ts` 실행(그동안 4분마다 사이트 `/api/health`를 불러 Render 무료 서버가 잠들지 않게 함 — 잠들면 깨어나지 못하고 멈추는 일이 2026-11-07·08 두 번 있었다)(GitHub 스케줄은 자주 건너뛰어 매시 5분 예비용만 둠) → `market-data` 브랜치(latest.json, history.json.gz, run-report.json)를 통째로 새로 올린다. 네이버 뉴스 30분, 멜론 TOP100 1시간(Node가 끊기면 curl), Last.fm·유튜브 하루 1번.
- 과거 복원: 새 기준(DATA_EPOCH 변경)으로 처음 도는 실행이 그룹별 기사를 깊게(복원 기간+31일, 최대 1,000건) 받고 지난 90일(BACKFILL_DAYS, 2026-11-08 사용자 요청) 일별 마감 기록을 만든다. 과거 음원은 멜론 주간 TOP100(`music-archive` 브랜치, 그 날이 속한 주 차트)으로 실시간 멜론과 기준을 맞춘다(2026-11-12, 벅스 일간은 429로 막혀 기록을 못 받을 때만 대체). 청취자·구독자·누적 재생·조회는 현재 값. 더보기의 '1주 전 곡'은 7일 전 실시간 기록이 없으면 지난주 멜론 주간 차트. 기사가 너무 많아 거슬러 가지 못한 날의 24시간 기사 수는 가장 가까운 날 값. 결과 요약은 run-report.json의 backfill. 복원 구간의 90일 집계는 앞쪽 기록이 모자라면 받은 기간의 하루 평균으로 늘려 추정한다(2026-11-20: 구간 계산이 음수로 잘려 앞 60일이 0이었다가 10/18에 지수가 +3% 튀던 것을 고침).
- 브랜드·활동·조정 집계는 그룹별 기사 범위(state.coverageFrom)보다 기간이 길면 하루 평균으로 늘려 추정한다. 기사 범위보다 앞선 복원 날짜는 **집계 기간이 다 덮이는 가장 이른 날**(없으면 오늘) 값을 쓴다 — 2026-11-20: 예전엔 '기록 시작 +6일'이라 기사가 많아 기록이 며칠뿐인 그룹(BTS 등)이 그 값에 고정됐다가 실제 데이터와 만나는 날 지수가 −2.7% 튀었다. 처음 보는 그룹은 자동으로 깊게 받는다.
- 뉴스/이슈 점수는 최근 7일 관련 기사 수의 하루 평균(하루 300건 = 100점). 24시간 기사 수로 하면 하루 한두 건에 가격이 크게 출렁여서 2026-11-08 바꿨다(하루 10% 넘는 변동 20%→약 4%). 모멘텀은 그 점수들로 7일 전과 비교. 홈 '주요 뉴스'와 대표 기사는 여전히 24시간 기준.
- 아티스트 상세 '더보기'(2026-11-12 '원인' 중심으로): `lib/market/explain.ts`가 점수가 어떤 곡(멜론 곡별 순위·1주 전 대비 신규/상승/차트 아웃, `tracksWeekAgo`)·이슈(최근 7일 비슷한 제목끼리 묶은 `stories`)·기사(키워드 꼬리표가 붙은 `examples`) 때문에 나왔는지 먼저 보여주고, 계산 방법은 접어 둔다. 근거 숫자는 history daily의 `m`(METRIC_ORDER). 과거 복원 기록은 `b: 1`.
- 차트·등락률은 데뷔일부터(`artists.ts`의 debutAt, 날짜가 없으면 데뷔연도 1월 1일). 데뷔 전 기록은 숨긴다.
- 장기 음원 기록: `music-archive.yml`(매일 + `music-archive-run` 브랜치 푸시)이 `scripts/market/music-archive.ts`로 멜론 주간 TOP100을 모아 `music-archive` 브랜치(melon-weekly.json.gz 원본, music-history.json.gz 그룹별 주간 차트 점수, report.json)에 쌓는다. 2026-11-09 사용자 요청으로 벅스 대신 멜론 기준. 멜론은 `chart/week/index.htm?startDay=&endDay=`로 2016-12-26 주부터만 주고, 지난 일간 차트(`chart/day`는 날짜를 무시)와 차트 파인더(`chart/search`, 406)는 막혀 있다. 30년 전 기록은 출처가 없고(네이버 뉴스 API는 최근 1,000건, 팬덤은 과거 기록 없음) 그래서 FANDEX 가격은 90일, 음원만 장기로 보여준다. 네이버 데이터랩(2016~ 검색 추이)은 앱에 권한이 없어 401.
- 뉴스: 제목에 그룹명이 없고 3팀 이상 나열된 기사(라인업·수상 명단)는 빼고, 대표 기사는 제목에 그룹명이 있는 기사만 쓴다.
- 데이터 점검(2026-11-20 전수 점검에서 고친 것): ①멜론 차트에서 '진영 (GOT7)'처럼 **괄호 안에만 그룹명이 있는 표기는 멤버 솔로 곡**이라 `charts.ts`의 matchChartArtist가 걸러낸다(유닛 '소녀시대-효리수 …'는 앞에 그룹명이 있어 그대로 포함). ②이름이 일상어인 그룹은 `TITLE_ONLY_IDS`에 넣어 제목에 이름이 든 기사만 센다(hori7on: '뉴 호라이즌' 등으로 30일 290건이 잡혔으나 제목 일치 0건). ③Last.fm이 엉뚱한 아티스트로 잡히는 그룹은 `LASTFM_NAME_OVERRIDES`로 검색 이름을 바꾼다(nowadays: 'NOWZ' → 우크라이나 밴드 'Noїz'가 잡혀 '나우즈'로). ④Last.fm이 같은 그룹을 철자만 다른 두 페이지로 가진 경우(autocorrect=1이 기록 적은 쪽으로 보냄: BABYMONSTER 60만→3.8만, tripleS 46만→1.1만) `resolveLastfm`이 autocorrect 0·1을 모두 받아 K-pop 태그로 확인된 쪽과 같은 이름인 페이지 중 기록이 많은 쪽을 쓴다. 동명이인(테크노 'Lucy')은 태그로 계속 걸러진다. 고른 페이지 자체에 태그가 없을 수 있어 `korean: true`로 돌려준다 — 2026-11-21 이 처리가 없어서 BABYMONSTER·tripleS·STAYC·에이핑크·템페스트·FT아일랜드·씨엔블루가 아예 빈 값이 됐다. 하루 1번만 받으므로 값이 빈 그룹은 다음 실행에서 다시 받는다(안 그러면 다음 날까지 비어 있다).
- **남은 한계**: 멤버 솔로 기사가 그룹 기사로 집계된다(소녀시대 30일 749건 중 제목에 이름이 든 건 9.5%, 동방신기 4.7%). 음원은 솔로 곡을 빼는데 뉴스는 포함해 기준이 다르다. 바꾸려면 사용자 확인 필요.
- 진단은 `market-data` 브랜치의 `run-report.json`을 본다(Actions 로그는 이 환경에서 못 읽음). 기준을 다시 잡으려면 collect.ts의 `DATA_EPOCH`를 올린다.
- 사이트: `lib/market/dataset.ts`가 market-data를 읽고(2분 캐시), `engine.ts`/`queries.ts`가 가격·등락률·시리즈를 만든다. 계산식은 `lib/market/formula.ts` 하나뿐(수집기와 공유).
- 원점수: 실제 숫자를 **두 기준점 로그 눈금**(`band`, SCORE_BAND의 [아래값→15점, 위값→88점], 위값을 넘으면 100점 초과)으로 환산한다. 2026-11-08 100점 상한 제거, 2026-11-12 0점 그룹 없애기(최소 1점 MIN_RAW), 2026-11-12 점수가 좁고 낮다는 요청으로 기준점을 실제 분포의 10~90% 지점에서 다시 잡았다. 음원 = 누적 소비(Last.fm 재생·유튜브 조회) + 차트 점수×0.6 — 차트 밖 160팀도 소비로 퍼진다. 뉴스 = 하루 평균(7일 45%+30일 35%+90일 20%). 브랜드·활동·조정 = 30일 60% + 90일 40%(30일 환산). 모멘텀 폭 MOMENTUM_GAIN=3. 기사 보관은 91일(LONG_DAYS+1). 계수: 음원 1.25, 뉴스 1.1, SNS 1.1, 브랜드 0.9, 활동 0.8, 모멘텀 1.0, 조정 −1.4.
- 가격 = 100·e^((점수−50)/50), 팬캡 = 가격×(Last.fm 청취자와 유튜브 구독자 평균/10만), KMI = Σ팬캡÷제수(과거 복원 첫날 마감 = 1,000, 팬덤 규모·종목 변경 시 제수 조정). 등락률은 전일·7일 전·30일 전 마감 대비.
- 기록이 기간만큼 없으면 등락률은 null('—'). 거짓 숫자를 채우지 않는다.
- **실데이터가 없는 변수는 화면에 내지 않는다** (`variables.ts`의 `enabled`).
- 유튜브: `youtube-resolve.yml`(매일)이 공식 채널 후보를 `youtube-resolve` 브랜치에 쌓는다. 사람이 확인한 채널만 `data/market/youtube-channels.json`에 넣고(173팀, 잘못 잡힌 15팀은 excluded), 수집기는 그 목록의 구독자 수를 하루 1번 받는다. SNS/팬덤 = Last.fm 청취자 점수와 구독자 점수 평균.

## 디자인
- PC 우선, 다크 모드 지원(`data-theme="night"`). 레퍼런스: NH투자증권, 토스증권.
- 한국 증시 관례: 상승 빨강(`fx-up`), 하락 파랑(`fx-down`). 색은 `globals.css`의 `--fx-*` 토큰만 쓴다.
- 글꼴 Pretendard, 숫자는 `fx-num`(고정폭 숫자).

## 작업 방식
- 바이브코딩: 작게 고치고, 화면으로 확인하고, main에 바로 커밋·푸시한다. 예전의 승인 게이트·attestation 머지 절차는 쓰지 않는다.
- 화면 변경은 `work/*` 브랜치에 먼저 올리면 preview-check가 lint·typecheck·build·스크린샷을 돌리고 결과를 `preview-shots` 브랜치에 남긴다. 통과하면 main으로 fast-forward.
- 배포: Vercel은 무료 한도 초과로 차단 상태. Render `fandex-product-self-host-v1`에 배포한다. 2026-11-12부터 `deploy.yml`이 main 푸시마다 lint·typecheck·build를 돌리고 통과하면 `RENDER_DEPLOY_HOOK_URL` 시크릿의 Deploy Hook으로 자동 배포한다(시크릿이 없으면 검사만 하고 건너뛴다). Render 대시보드의 Auto-Deploy는 꺼 둔 채로 둔다 — 켜면 검사 없이 두 번 배포된다.
- Render 크론 2개는 계속 쓴다: 17분 크론 = 실데이터 수집 트리거. 7분 크론은 예전 SNS 유튜브 측정 워크플로를 부른다(정리 대상). Render 크론이 부르는 워크플로 파일 이름과 입력값은 바꾸지 않는다.
