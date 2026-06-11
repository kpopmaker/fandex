# FANDEX

**K-pop Artist Stock-style Market Index Platform**

FANDEX는 K-pop 아티스트의 현재 시장 반응을 주식 시세처럼 표현하는 데이터 기반 팬덤 시세 플랫폼입니다.

Live Demo: https://fandex-eta.vercel.app/
GitHub Repository: https://github.com/kpopmaker/fandex

---

## Overview

FANDEX는 K-pop 아티스트를 하나의 “종목”처럼 정의하고, 음원·앨범 성적, 콘텐츠 반응, SNS 반응, 검색·뉴스 반응, 해외 반응, 팬덤 자산, 소속사 펀더멘털 등을 종합해 가상의 FANDEX Price로 표현하는 프로젝트입니다.

단순 인기 순위가 아니라, “지금 K-pop 시장에서 어떤 아티스트가 상승 중인지”, “어떤 요소가 가격을 움직이는지”, “SNS 콘텐츠로 활용할 만한 시장 신호가 무엇인지”를 보여주는 것을 목표로 합니다.

현재 버전은 실제 API 연결 전 단계의 mock market입니다. 실제 데이터 수집 구조와 UI를 검증하기 위해 mock price engine을 기반으로 동작합니다.

---

## Key Features

### 1. K-pop Artist Stock Board

아티스트를 주식 종목처럼 보여주는 메인 대시보드입니다.

* FANDEX Price
* 등락률
* 거래량
* Fan Cap
* Momentum
* Confidence
* Signal

### 2. Custom Index Builder

사용자가 가격 산식에 반영할 요소를 직접 켜고 끌 수 있습니다.

지원 프리셋:

* 종합형
* 음원형
* 바이럴형
* 글로벌형
* 팬덤형
* 펀더멘털형

이를 통해 “전체 성적 기준 순위”뿐 아니라 “SNS 반응만 반영한 순위”, “해외 반응 중심 순위”, “팬덤 자산 중심 순위”처럼 다양한 관점의 K-pop 시장 지표를 확인할 수 있습니다.

### 3. Artist Detail Page

각 아티스트의 상세 종목 페이지입니다.

* 현재가
* 등락률
* 거래량
* Fan Cap
* Momentum
* Confidence
* 요소별 점수
* Mock 1-Min Price Chart
* 아티스트 마스터 데이터
* 공식 채널 정보

### 4. Ranking

아티스트를 여러 기준으로 정렬해 보여줍니다.

* 급등률 TOP
* 거래량 TOP
* Fan Cap TOP

### 5. Signals

K-pop 시장에서 감지되는 주요 신호를 보여주는 페이지입니다.

* 급등 신호
* 거래량 폭증
* 검색·뉴스 강세
* 해외 반응 강세
* 급락 주의

### 6. Content Lab

FANDEX 데이터를 SNS 콘텐츠 소재로 변환하는 페이지입니다.

* 오늘의 K-pop 급등주
* 거래량 터진 종목
* 해외 반응 강세 종목
* 검색량 상승 종목
* 바이럴 후보 종목
* 카드뉴스 제목 후보
* 짧은 포스트 문구

---

## FANDEX Price Model

FANDEX Price는 아래 요소를 기반으로 계산됩니다.

| Factor   | Weight | Description                |
| -------- | -----: | -------------------------- |
| 음원·앨범    |    22% | 초동, 음원 순위, 스트리밍 성적         |
| 공식 콘텐츠   |    12% | MV, 티저, 앨범 프로모션, 자체 웹예능 반응 |
| 공식 SNS   |    16% | 인스타그램, X, 틱톡 등 공식 채널 반응    |
| 검색·뉴스    |     8% | 포털 검색량, 뉴스, 블로그, 카페글 반응    |
| 해외 반응    |    14% | 글로벌 뉴스, 해외 차트, 글로벌 SNS 반응  |
| 소속사 펀더멘털 |    12% | 매출, 영업이익, 시가총액, 회사 규모      |
| 음악방송·수상  |     6% | 음악방송 1위, 시상식, 공식 수상 이력     |
| 팬 플랫폼    |     6% | 팬 소통 플랫폼, 멤버십, 공식 팬덤 자산    |
| 팬채널·바이럴  |     4% | 팬채널, 바이럴 채널, 2차 확산 콘텐츠     |

기본 산식:

```text
FANDEX Score =
Σ Factor Score × Weight

FANDEX Price =
100 × exp((FANDEX Score - 50) / 50)
```

---

## KMI Composite

FANDEX는 개별 아티스트 가격뿐 아니라 K-pop 시장 전체 흐름을 보여주는 KMI Composite도 제공합니다.

```text
Fan Cap =
FANDEX Price × Synthetic Float

KMI Composite =
Σ Fan Cap / Divisor
```

KMI Composite는 K-pop Market Index Composite의 약자로, K-pop 시장 전체의 가상 종합지수 역할을 합니다.

---

## Pages

| Page          | Path              | Description          |
| ------------- | ----------------- | -------------------- |
| Market        | `/`               | FANDEX 메인 시장 대시보드    |
| Artists       | `/artists`        | 아티스트 종목 목록           |
| Artist Detail | `/artists/[slug]` | 아티스트 상세 종목 페이지       |
| Ranking       | `/ranking`        | 급등률, 거래량, Fan Cap 랭킹 |
| Signals       | `/signals`        | 시장 시그널 페이지           |
| Content Lab   | `/content-lab`    | SNS 콘텐츠 소재 생성 페이지    |
| Methodology   | `/methodology`    | FANDEX 산식 설명         |
| About         | `/about`          | 서비스 소개               |

---

## Tech Stack

* Next.js
* React
* TypeScript
* Tailwind CSS
* Vercel
* GitHub

---

## Getting Started

```bash
npm install
npm run dev
```

Local development server:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

---

## Project Structure

```text
app
├─ about
├─ artists
├─ components
├─ content-lab
├─ data
├─ methodology
├─ ranking
├─ signals
├─ layout.tsx
└─ page.tsx

docs
├─ FANDEX_V2_PLAN.md
└─ FANDEX_ARTIST_MASTER.md
```

---

## Current Status

현재 버전은 FANDEX v2 mock market입니다.

완료된 항목:

* 서비스 정의서 작성
* 아티스트 마스터 데이터 구조 설계
* Mock price engine 구현
* Market dashboard 구현
* Custom Index Builder 구현
* Artist list/detail 구현
* Ranking 페이지 구현
* Signals 페이지 구현
* Content Lab 페이지 구현
* Methodology/About 페이지 구현
* GitHub 업로드
* Vercel 배포

---

## Roadmap

향후 고도화 방향:

1. 네이버 검색 API 연결
2. YouTube Data API 연결
3. OpenDART 기반 소속사 펀더멘털 연결
4. 글로벌 뉴스 및 해외 반응 데이터 연결
5. 실제 1분봉/5분봉 가격 히스토리 저장
6. Supabase 기반 데이터베이스 구축
7. 급등·급락 알림 자동화
8. SNS 콘텐츠 자동 생성 기능 고도화

---

## Portfolio Point

이 프로젝트는 단순한 웹 페이지가 아니라, K-pop 시장 데이터를 “주식 시세”라는 익숙한 형식으로 재해석한 데이터 서비스 기획·개발 프로젝트입니다.

강조할 수 있는 역량:

* 데이터 기반 서비스 기획
* K-pop 시장 구조 분석
* 지표 설계 및 가중치 모델링
* React/Next.js 기반 프론트엔드 구현
* TypeScript 데이터 모델링
* 대시보드 UI 설계
* GitHub/Vercel 배포 경험
* SNS 콘텐츠 확장 전략 설계

---

## Disclaimer

FANDEX Price는 실제 주식 가격이나 투자 지표가 아닙니다.

현재 버전의 가격, 거래량, 등락률은 서비스 구조 검증을 위한 mock 데이터이며, 실제 아티스트의 상업적 가치나 투자 판단을 의미하지 않습니다.
