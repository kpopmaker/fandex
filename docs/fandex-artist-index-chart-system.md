# FANDEX Artist Index Chart System v1

## 목적

FANDEX Artist Index Chart System v1은 FANDEX 등록/추적 아티스트 기준으로 지수 흐름을 비교하고, 콘텐츠 주제 후보를 발굴하기 위한 내부 preview 도구다. 외부 콘텐츠에 FANDEX를 직접 출처처럼 표기하기보다, 내부 기획 단계에서 아티스트별 흐름과 공통 신호를 비교하는 용도로 사용한다.

## 왜 랭킹보다 차트 흐름/유사 흐름 분석이 중요한가

단일 시점의 순위는 누가 더 위에 있는지만 보여준다. 콘텐츠 기획에는 “무엇이 먼저 움직였는지”, “어떤 신호가 같은 방향으로 반복되는지”, “비슷한 구간을 가진 아티스트가 누구인지”가 더 중요하다.

지수 차트는 최근 8개 시점의 누적 포인트 흐름을 보여준다. 유사 흐름 분석은 기준 아티스트와 비슷하게 움직인 아티스트를 찾아 공통 주제를 뽑는 데 집중한다. 이 방식은 공식 평가처럼 보이는 단정 대신, 콘텐츠 발굴을 위한 관찰 프레임을 제공한다.

## 데이터 구조

현재 구현은 `app/data/v4/charts/artistIndexChartData.ts`에 있다.

- `ArtistIndexHistoryPoint`: 시점별 FANDEX 지수, 카테고리 포인트, 차감 포인트, 데이터 상태, 신뢰도, 메모를 담는다.
- `ArtistIndexChartProfile`: 아티스트별 식별자, 표시명, ticker, 그룹 타입, coverage 상태, 업데이트 일자, history를 담는다.
- 지수는 0~100 환산 점수가 아니라 누적 포인트 구조다.
- 공개 UI에는 변화율을 노출하지 않고 pt 변화와 trend band 중심으로 표시한다.

## 현재 coverage 한계

현재 coverage는 모든 K-pop 아티스트를 대표하지 않고 FANDEX 등록/추적 아티스트 기준이다. v1 seed는 베타 editorial seed이며, 실제 자동 수집 데이터나 DB 저장 데이터가 아니다.

coverage 상태는 다음 세 가지다.

- `tracked`: FANDEX 내부 추적 우선순위가 있는 seed
- `partial`: 일부 공개 신호 기반 preview seed
- `preview`: 추후 검증을 전제로 둔 preview seed

## 유사도 계산 방식

현재 구현은 `app/data/v4/charts/artistIndexSimilarity.ts`에 있다.

1. 각 아티스트의 `fandexPoint` history를 0~1 범위로 normalize한다.
2. normalize된 series의 delta series를 만든다.
3. 기준 아티스트와 비교 아티스트의 방향 일치율, 평균 delta 차이, trend band 일치 여부, 전체 delta 방향을 조합한다.
4. 내부용 `similarityScore`는 0~1 값으로 계산한다.
5. 공개 UI는 score 대신 `very_high`, `high`, `medium`, `low` band를 한국어로 표시한다.

band 기준:

- `>= 0.82`: very_high
- `>= 0.68`: high
- `>= 0.52`: medium
- 그 외: low

## Day 2 사용성 개선 내용

Day 2에서는 `/charts`를 실제 콘텐츠 발굴에 참고하기 쉬운 화면으로 개선했다.

- query param 기반 기준 아티스트 선택
- query param 기반 비교 대상 지정
- 기준 아티스트 요약 강화
- 비교 차트 하단의 비교 해석 추가
- 유사 흐름 카드에 latest point, delta point, 비교 추가 링크 추가
- 콘텐츠 angle builder v1 추가
- coverage/trust notice 강화

## query param 기반 아티스트 선택 구조

`/charts`는 Next.js `searchParams` 기반 서버 페이지로 동작한다.

지원 예시:

- `/charts`
- `/charts?artist=aespa`
- `/charts?artist=ive`
- `/charts?artist=aespa&compare=ive,riize,seventeen`

구현 helper:

- `parseChartSearchParams()`
- `getSelectedChartContext()`
- `getCompareArtistIds()`
- `buildChartHref()`

`artist` query가 없거나 잘못된 경우 `aespa` 또는 첫 번째 tracked artist로 fallback한다. 기준 아티스트 선택 UI는 링크 기반이며, client-side selector state를 만들지 않는다.

## 비교 대상 선택 방식

`compare` query가 있으면 해당 값을 우선 사용한다.

- 존재하지 않는 artistId는 제거한다.
- 기준 아티스트와 중복되는 compare artist는 제거한다.
- 중복 compare artist는 제거한다.
- compare 대상은 최대 4명으로 제한한다.
- `compare` query가 없으면 `findSimilarIndexMovements()` 결과 상위 3명을 자동 추천한다.

Similar Movement Card의 “비교에 추가” 링크는 현재 `compare` query에 해당 아티스트를 추가하는 방식이다. 이미 비교 중인 아티스트는 “비교 중”으로 표시한다.

## 콘텐츠 angle builder 구조

`createContentAngleSuggestions(baseProfile, similarResults)`는 기준 아티스트와 유사 흐름 결과를 바탕으로 4~6개 콘텐츠 주제 후보를 만든다.

각 angle은 다음 구조를 가진다.

- `title`
- `hook`
- `whyItWorks`
- `artistsToCompare`
- `factCheckChecklist`
- `formatSuggestion`
- `caution`

format suggestion은 다음 네 가지를 사용한다.

- `carousel`
- `short_form`
- `thread`
- `newsletter`

## 콘텐츠 발행 전 fact-check checklist

콘텐츠 발행 전에는 FANDEX 내부 지표만 사용하지 않고 외부 공개 지표를 1회 이상 확인한다.

기본 확인 항목:

- 공식 영상 반응 확인
- 최근 뉴스량 확인
- SNS 확산 게시물 확인
- 활동 일정 확인
- 브랜드 캠페인 노출 시점 확인
- 음원/앨범 공개 일정 확인

외부 콘텐츠에는 시스템 신뢰도 구축 전까지 FANDEX 직접 언급을 보류한다.

## 콘텐츠 제작 활용 방식

이 시스템은 콘텐츠 작성 전 주제 후보를 좁히는 데 사용한다.

- 활동 전부터 팬덤 반응이 먼저 움직인 팀들
- 브랜드 노출 이후 지표 흐름이 비슷해진 팀들
- 뉴스 노출보다 SNS 반응이 먼저 상승한 팀들
- 안정적인 팬덤 기반 위에 대중 노출이 붙은 팀들
- 활동 직전 모멘텀이 재상승한 팀들

콘텐츠 발행 전에는 외부 플랫폼에서 수치를 1회 이상 재확인한다.

## 공개 표현 가드레일

- “FANDEX 지수”, “지수 차트”, “모멘텀 차트”, “지표 흐름”, “누적 포인트”를 사용한다.
- 모든 K-pop 아티스트를 대표한다고 말하지 않고 “FANDEX 등록/추적 아티스트 기준”이라고 표시한다.
- 공식 순위, 공식 평가처럼 보이는 문장은 피한다.
- 실제 아티스트와 민감한 사안을 연결하지 않는다.
- 공개 UI에는 변화율을 노출하지 않는다.

## FANDEX 직접 언급을 보류하는 이유

현재 시스템은 신뢰도 구축 전 preview 도구다. 외부 콘텐츠에서 FANDEX를 직접 출처처럼 노출하면 공식 평가나 공식 순위로 오해될 수 있다. 따라서 당분간 FANDEX는 내부 콘텐츠 기획 도구로 사용하고, 외부 콘텐츠에서는 외부 플랫폼에서 확인 가능한 신호와 일반적인 콘텐츠 주제 중심으로 표현한다.

## 현재 구현된 것

- `/charts` 내부 preview route
- 28명 아티스트의 editorial seed 기반 지수 history
- coverage summary helper
- pt 변화 계산 helper
- trend band helper
- 유사 흐름 계산 helper
- 공통 dominant signal 추출
- query param 기반 기준 아티스트 선택
- query param 기반 비교 대상 지정
- 콘텐츠 angle builder v1
- 사용 가드레일 UI

## 아직 미구현

- 실제 client-side interactive selector
- 관리자 UI
- 실제 API/DB 연결
- 모든 K-pop 아티스트 커버리지
- 신뢰도 metadata 자동화
- 콘텐츠 초안 자동 생성
- 실시간 업데이트
- 로그인/권한관리
- 결제

## 다음 단계

- Evidence Metadata v1
- Artist Coverage Pool
- 실제 반응지표 수동 검증 데이터 추가
