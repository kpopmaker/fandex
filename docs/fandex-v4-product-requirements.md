# FANDEX v4 Product Requirements

Last updated: 2026-06-13

## Positioning

FANDEX is moving toward a Korean-first K-pop market intelligence platform.
The public product should help users understand which K-pop artists and issues
are gaining attention, why they are moving, and how those signals affect a
simulated FANDEX price.

FANDEX prices are not stock prices, securities, investment products, or
financial advice.

## Public Product Scope

1. K-pop composite index
2. Artist FANDEX price/index
3. Artist search
4. Artist ranking
5. Artist detail pages
6. Issue impact signals integrated into home and artist pages
7. Clear methodology explaining how FANDEX prices are calculated

## Private/Admin Product Scope

1. SNS content planning lab
2. AI draft generation workflow
3. Human review before publishing
4. Future API-based publishing automation

`/content-lab` remains accessible for now, but it should not be promoted in
public navigation or public marketing CTAs.

## FANDEX Price Methodology Direction

FANDEX price must not be based only on current reaction volume.

Future pricing should account for:

1. Absolute reaction scale
2. Album release cycle
3. Comeback period
4. Activity period
5. Hiatus period
6. Comeback reaction strength
7. Activity effect
8. Hiatus retention

Absolute metrics should be primary:

1. Music performance
2. Album sales
3. YouTube views
4. SNS reactions
5. Search volume
6. News volume
7. Overseas response
8. Fandom response

Relative ranking is a secondary indicator only. FANDEX price should not be
described as a percentile-only score.

## Artist Database Direction

The system should prepare for 100+ K-pop idol groups without inventing
unverified facts. Current records may remain small, but the model should support:

1. Korean name
2. English name
3. Ticker
4. Agency
5. Debut date
6. Members
7. Fandom name
8. Generation
9. Activity status
10. Keywords
11. Official channels
12. Album release dates
13. Latest comeback date
14. Hiatus/activity metadata
15. Representative songs
16. Main markets
17. Official SNS channels

Every expanded record should carry `sourceStatus` such as `Verified`,
`Partially verified`, or `Mock needs verification`.

## Korean-First Copy Direction

Default language should become Korean. English can remain as an optional
language after the i18n layer is introduced.

Initial label direction:

| English | Korean |
| --- | --- |
| Market | 시장 |
| Artists | 아티스트 |
| Ranking | 순위 |
| Methodology | 산정 방식 |
| About | 소개 |

Methodology should use easy Korean. Example:

> FANDEX 가격은 실제 주식 가격이 아니라, 팬들의 반응, 검색량, 영상 반응,
> 뉴스량 등을 모아 요즘 얼마나 주목받고 있는지를 숫자로 바꾼 값입니다.

Future terminology replacements:

| Current term | Korean copy direction |
| --- | --- |
| Momentum | 최근 분위기 |
| Weight | 반영 비중 |
| Factor | 반영 요소 |
| Signal | 시장 신호 |

Do not mass-translate the full app until a safe i18n plan and mojibake scan are
part of the workflow.

## Theme Roadmap

The final UI should support both day mode and night mode, with day mode as the
eventual default.

Likely affected files and components:

1. `app/globals.css`
2. `app/layout.tsx`
3. `app/components/Navbar.tsx`
4. `app/page.tsx`
5. `app/components/v3/LineChartCard.tsx`
6. `app/components/v3/CustomIndexBuilder.tsx`
7. `app/components/v3/ArtistNewsSection.tsx`
8. Route pages under `app/artists`, `app/compare`, `app/ranking`, `app/signals`

Do not redesign the whole theme in step 6.5.

## Chart Requirements

All major index and price areas should eventually use standardized line charts:

1. K-pop composite index
2. Artist FANDEX price
3. Custom index
4. Selected market signals

Required chart features:

1. Minute/day/month/year range controls
2. Hover tooltip
3. Vertical hover guide line
4. Selected point marker
5. Current value
6. Change rate
7. High value
8. Low value
9. Period label

Current chart surfaces to consolidate later:

1. `app/components/v3/LineChartCard.tsx`
2. `app/components/v3/ComparePriceChart.tsx`
3. Inline `MarketLineChart` in `app/page.tsx`

## Homepage Direction

The homepage should eventually focus on:

1. K-pop composite index at the top
2. Line chart
3. Real-time issue ranking top 10
4. Issue detail popup
5. Artist search
6. Search over Korean name, English name, member names, agency, ticker, and keywords

Do not rebuild the homepage in step 6.5 unless public links need correction.

## Artist Detail Direction

Artist detail pages should eventually show:

1. Artist introduction
2. Official FANDEX price graph
3. Custom index builder near the main graph
4. Recent real news 6 items
5. News detail modal
6. Actual official news/source-driven content

## Custom Index Builder Direction

The builder should not encourage users to manipulate raw variable values.
It should let users choose an analysis perspective:

1. 종합 주가
2. 화제성 중심
3. 팬덤 확장 중심
4. 콘텐츠 반응 중심
5. 해외 반응 중심
6. 사업성 중심
7. 대중 확산 중심
8. 직접 선택

Existing slider or raw variable editing UX should be replaced in a later UI/UX
step.

## Signals Direction

`/signals` is experimental. It should either be absorbed into home/artist pages
as signal badges or become a real market alert system.

Future signal types:

1. 상승 경보
2. 검색 급등
3. 뉴스 급증
4. 해외 반응 상승
5. 팬덤 반응 상승
6. 과열 주의
7. 하락 주의

Each signal should eventually include related artist, time, source data,
confidence, related news, and graph impact.
