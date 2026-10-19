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
- **산정 방식 `/methodology`**
- 그 밖의 예전 페이지는 `page.hidden.tsx`로 숨겨 두었다(라우트에서 빠짐). `youtube-analytics-evidence`, `privacy`, `terms`는 Google API 심사·약관용으로 유지.

## 데이터와 계산
- 코드: `lib/market/` (variables, artists, time, engine, queries, mockSource)
- 대상: 아이돌 **그룹만**. 솔로 제외.
- 변수와 계수: 음원/음반 1.25, 뉴스/이슈 1.1, SNS/팬덤 1.1, 브랜드 적합도 0.9, 컴백/활동 0.8, 성장 모멘텀 1.0, 조정 신호 −1.4
- 점수 = (Σ 원점수×계수 − 조정×1.4) ÷ 양의 계수 합, 가격 = 100·e^((점수−50)/50), 팬캡 = 가격×팬덤 규모, KMI = Σ팬캡 ÷ 제수(2026-01-01 = 1,000)
- 갱신 단위: 15분 슬롯.
- **실데이터가 없는 변수는 화면에 내지 않는다** (`variables.ts`의 `enabled`). 데이터가 생기면 켠다.
- 지금은 `mockSource.ts`(결정적 예시 데이터). 실데이터는 같은 `MarketDataSource` 인터페이스로 구현해 `engine.ts`의 `dataSource` 한 줄만 바꾼다. mock일 때 화면에 "예시 데이터" 표시가 나와야 한다.

## 디자인
- PC 우선, 다크 모드 지원(`data-theme="night"`). 레퍼런스: NH투자증권, 토스증권.
- 한국 증시 관례: 상승 빨강(`fx-up`), 하락 파랑(`fx-down`). 색은 `globals.css`의 `--fx-*` 토큰만 쓴다.
- 글꼴 Pretendard, 숫자는 `fx-num`(고정폭 숫자).

## 작업 방식
- 바이브코딩: 작게 고치고, 화면으로 확인하고, main에 바로 커밋·푸시한다. 예전의 승인 게이트·attestation 머지 절차는 쓰지 않는다.
- 푸시 전 `npm run lint`, `npm run typecheck`, `npm run build`가 통과해야 한다.
- 수집 파이프라인 교체 전까지 `app/api/**`와 Render 크론이 부르는 GitHub 워크플로는 지우지 않는다.
