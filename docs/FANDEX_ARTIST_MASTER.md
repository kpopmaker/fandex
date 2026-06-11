# FANDEX 아티스트 종목 정의서

## 1. 목적

이 문서는 FANDEX에서 K-pop 아티스트를 하나의 주식 종목처럼 관리하기 위한 기준을 정의한다.

FANDEX에서 아티스트는 단순 이름이 아니라, 하나의 데이터 추적 단위이자 시세 계산 단위다.

각 아티스트는 티커, 소속사, 활동 형태, 검색 키워드, 공식 채널, 데이터 수집 등급을 가진다.

## 2. 아티스트 종목의 기본 개념

FANDEX에서 하나의 아티스트는 하나의 종목이다.

예시:

* AESPA = 에스파 종목
* IVE = 아이브 종목
* RIIZE = 라이즈 종목
* ILLIT = 아일릿 종목
* JUNGKOOK = 정국 솔로 종목

초기 버전에서는 그룹, 솔로, 유닛을 종목으로 본다.

멤버 개인 종목은 추후 확장 기능으로 둔다.

## 3. 종목 코드 규칙

종목 코드는 영어 대문자를 기본으로 한다.

### 기본 규칙

* 공백 제거
* 특수문자 제거
* 영어 대문자 사용
* 가능한 짧고 직관적으로 작성

예시:

| 아티스트명       | 티커       |
| ----------- | -------- |
| aespa       | AESPA    |
| IVE         | IVE      |
| RIIZE       | RIIZE    |
| TWS         | TWS      |
| ILLIT       | ILLIT    |
| LE SSERAFIM | LSF      |
| NewJeans    | NJZ      |
| NCT DREAM   | NCTDREAM |
| BOYNEXTDOOR | BND      |
| BABYMONSTER | BABYMON  |

## 4. 아티스트 마스터 필드

아티스트 마스터 데이터는 아래 필드를 가진다.

| 필드명              | 설명                   |
| ---------------- | -------------------- |
| id               | 시스템 내부에서 사용하는 고유 ID  |
| ticker           | FANDEX에서 사용하는 종목 코드  |
| nameKo           | 한국어 아티스트명            |
| nameEn           | 영어 아티스트명             |
| agency           | 소속사                  |
| agencyTicker     | 소속사 주식 코드 또는 내부 코드   |
| category         | 그룹, 솔로, 유닛 구분        |
| gender           | 보이그룹, 걸그룹, 혼성, 솔로 구분 |
| generation       | 세대 구분                |
| debutDate        | 데뷔일                  |
| status           | 활동 상태                |
| trackingTier     | 데이터 수집 등급            |
| basePrice        | 상장 기준가               |
| aliases          | 검색 별칭                |
| members          | 멤버명                  |
| fandomName       | 팬덤명                  |
| countryFocus     | 주요 시장                |
| sourceAccounts   | 공식 채널 정보             |
| keywords         | 검색 키워드               |
| excludedKeywords | 제외 키워드               |
| notes            | 관리 메모                |

## 5. category 정의

category는 아티스트의 형태를 의미한다.

| 값       | 의미      |
| ------- | ------- |
| group   | 그룹      |
| solo    | 솔로      |
| unit    | 유닛      |
| project | 프로젝트 그룹 |

## 6. gender 정의

gender는 시장 분류를 위한 값이다.

| 값           | 의미    |
| ----------- | ----- |
| girl_group  | 걸그룹   |
| boy_group   | 보이그룹  |
| solo_male   | 남자 솔로 |
| solo_female | 여자 솔로 |
| mixed       | 혼성    |
| unit        | 유닛    |

## 7. generation 정의

generation은 세대별 지수 구분에 사용한다.

| 값      | 의미  |
| ------ | --- |
| gen2   | 2세대 |
| gen3   | 3세대 |
| gen4   | 4세대 |
| gen5   | 5세대 |
| rookie | 신인  |

초기 버전에서는 정확한 세대 논쟁을 피하기 위해 내부 분류용으로만 사용한다.

## 8. status 정의

status는 현재 활동 상태를 의미한다.

| 값           | 의미      |
| ----------- | ------- |
| active      | 정상 활동   |
| hiatus      | 휴식기     |
| military    | 군백기     |
| disbanded   | 해체      |
| predebut    | 데뷔 전    |
| project_end | 프로젝트 종료 |

## 9. trackingTier 정의

trackingTier는 데이터 수집 빈도를 결정한다.

| 값        | 의미           | 갱신 주기   |
| -------- | ------------ | ------- |
| realtime | 실시간 핵심 추적 대상 | 1~5분    |
| hot      | 화제성 높은 추적 대상 | 5~15분   |
| standard | 일반 추적 대상     | 30~60분  |
| archive  | 저빈도 추적 대상    | 하루 1~2회 |

초기 버전에서는 realtime 20팀, hot 30팀, standard 100팀 구조를 목표로 한다.

## 10. aliases 정의

aliases는 검색과 데이터 매칭에 사용되는 별칭 목록이다.

아티스트명은 한글, 영어, 약칭, 멤버명, 팬덤명, 곡명 등 여러 방식으로 언급된다.

따라서 aliases를 잘 관리해야 검색량, 뉴스량, SNS 언급량이 정확하게 연결된다.

예시:

aespa의 aliases:

* aespa
* 에스파
* æspa
* 카리나
* 윈터
* 지젤
* 닝닝
* MY

IVE의 aliases:

* IVE
* 아이브
* 안유진
* 장원영
* 리즈
* 이서
* 레이
* 가을
* DIVE

## 11. excludedKeywords 정의

excludedKeywords는 동명이인이나 불필요한 검색 결과를 제거하기 위한 키워드다.

예시:

NewJeans의 경우 일반 단어와 충돌할 수 있으므로 검색어 조합을 주의해야 한다.

* jeans
* new jeans fashion
* 청바지
* 데님

검색 쿼리에서는 아티스트와 무관한 일반어를 제외하는 규칙이 필요하다.

## 12. sourceAccounts 구조

sourceAccounts는 아티스트별 공식 채널 정보를 관리한다.

| 필드명                      | 설명                   |
| ------------------------ | -------------------- |
| youtubeChannelId         | 공식 유튜브 채널 ID         |
| youtubeUploadsPlaylistId | 공식 유튜브 업로드 플레이리스트 ID |
| instagramUsername        | 공식 인스타그램 계정          |
| xUsername                | 공식 X 계정              |
| tiktokUsername           | 공식 틱톡 계정             |
| spotifyArtistId          | Spotify 아티스트 ID      |
| appleMusicArtistId       | Apple Music 아티스트 ID  |
| melonArtistId            | Melon 아티스트 ID        |
| weverseArtistId          | Weverse 아티스트 ID      |
| bubbleArtistId           | Bubble 아티스트 ID       |
| officialWebsite          | 공식 홈페이지              |

## 13. keywords 구조

keywords는 API 호출이나 검색 수집에 사용하는 실제 검색어 목록이다.

aliases가 넓은 이름 목록이라면, keywords는 실제 수집용 검색어다.

예시:

aespa keywords:

* aespa
* 에스파
* aespa comeback
* 에스파 컴백
* aespa MV
* 에스파 뮤비
* aespa teaser
* 에스파 티저

초기 버전에서는 너무 많은 키워드를 쓰지 않는다.

아티스트당 핵심 키워드 3~5개로 시작한다.

## 14. 아티스트 데이터 예시

```ts
{
  id: 'aespa',
  ticker: 'AESPA',
  nameKo: '에스파',
  nameEn: 'aespa',
  agency: 'SM Entertainment',
  agencyTicker: 'SM',
  category: 'group',
  gender: 'girl_group',
  generation: 'gen4',
  debutDate: '2020-11-17',
  status: 'active',
  trackingTier: 'realtime',
  basePrice: 100,
  aliases: ['aespa', '에스파', 'æspa', '카리나', '윈터', '지젤', '닝닝', 'MY'],
  members: ['카리나', '윈터', '지젤', '닝닝'],
  fandomName: 'MY',
  countryFocus: ['KR', 'JP', 'US', 'GLOBAL'],
  sourceAccounts: {
    youtubeChannelId: '',
    youtubeUploadsPlaylistId: '',
    instagramUsername: '',
    xUsername: '',
    tiktokUsername: '',
    spotifyArtistId: '',
    appleMusicArtistId: '',
    melonArtistId: '',
    weverseArtistId: '',
    bubbleArtistId: '',
    officialWebsite: ''
  },
  keywords: ['aespa', '에스파', 'aespa comeback', '에스파 컴백', 'aespa MV'],
  excludedKeywords: [],
  notes: '초기 realtime 추적 대상'
}
```

## 15. 초기 추적 대상 분류

초기 FANDEX v2에서는 모든 아티스트를 한 번에 수집하지 않는다.

처음에는 50팀 내외로 시작한다.

### Realtime 그룹

실시간 메인 보드에 노출되는 핵심 아티스트다.

갱신 주기: 1~5분

예시:

* aespa
* IVE
* RIIZE
* ILLIT
* TWS
* LE SSERAFIM
* NewJeans
* NMIXX
* BABYMONSTER
* BOYNEXTDOOR

### Hot 그룹

화제성이 높거나 컴백, 티저, 음방, 이슈가 발생한 아티스트다.

갱신 주기: 5~15분

### Standard 그룹

일반 추적 아티스트다.

갱신 주기: 30~60분

### Archive 그룹

활동이 적거나 장기 비활동 상태인 아티스트다.

갱신 주기: 하루 1~2회

## 16. 종목 등록 기준

FANDEX에 아티스트를 등록하려면 아래 조건 중 하나 이상을 충족해야 한다.

1. 공식 데뷔한 K-pop 그룹, 솔로, 유닛이다.
2. 주요 음원 플랫폼 또는 음반 차트에 등록되어 있다.
3. 공식 SNS 또는 유튜브 채널이 존재한다.
4. 네이버 검색, 뉴스, 블로그, 카페 등에서 식별 가능한 검색어가 있다.
5. 해외 뉴스 또는 글로벌 플랫폼에서 추적 가능한 식별자가 있다.

## 17. 종목 제외 기준

아래 경우에는 초기 등록에서 제외한다.

1. 동명이인 구분이 불가능한 경우
2. 공식 활동 정보가 너무 부족한 경우
3. 데이터 수집이 거의 불가능한 경우
4. 비공식 팬 계정만 존재하는 경우
5. 프로젝트 종료 후 장기간 활동 데이터가 없는 경우

## 18. 아티스트 종목 관리 원칙

아티스트 마스터는 FANDEX의 가장 중요한 데이터다.

가격 계산보다 먼저 아티스트 식별이 정확해야 한다.

따라서 아래 원칙을 지킨다.

1. 한 아티스트는 하나의 고유 id를 가진다.
2. 티커는 중복되지 않는다.
3. 한글명과 영어명을 모두 관리한다.
4. 검색 별칭과 제외 키워드를 반드시 관리한다.
5. 공식 채널과 비공식 채널을 분리한다.
6. 수집 빈도는 trackingTier로 관리한다.
7. 동명이인·일반명사 충돌 가능성이 있는 아티스트는 별도 관리한다.

## 19. Custom Index Builder와 아티스트 마스터의 관계

Custom Index Builder는 아티스트 마스터 데이터를 기반으로 작동한다.

예를 들어 사용자가 공식 SNS 요소를 끄면 sourceAccounts 안의 Instagram, X, TikTok 관련 데이터가 가격 산식에서 제외된다.

사용자가 해외 반응 요소만 켜면 countryFocus와 해외 데이터 소스가 중심이 된다.

사용자가 팬덤형 프리셋을 선택하면 fandomName, fan platform, album sales, fan channel 데이터를 중심으로 가격이 다시 계산된다.

따라서 아티스트 마스터는 단순 프로필 정보가 아니라, 커스텀 지표 계산의 기준 데이터다.

## 20. 다음 작업

이 문서를 기준으로 실제 코드 파일을 만든다.

다음에 만들 파일:

* app/data/artists.ts
* app/data/market.ts
* app/data/mockPrices.ts

첫 번째로 만들 파일은 app/data/artists.ts다.

이 파일에는 초기 10팀 정도의 아티스트 종목 데이터를 넣는다.
