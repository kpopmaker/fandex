# FANDEX Naver News Manual Seed

Status: manual seed preview only. No Naver News API call, `fetch`, env/API key,
Supabase, database write, API route, server action, auth, payment, entitlement
check, or external network access is implemented.

## Why Manual Seed Exists

FANDEX v1 needs a way to test how Korean news and issue signals can affect the
unbounded cumulative point model before real Naver News ingestion is approved.
Manual seed data lets the product validate scoring shape, locked evidence
boundaries, and subscriber report copy without pretending that live news data is
connected.

Manual seed is useful because it:

1. Tests `newsIssue` raw point conversion before API credentials exist.
2. Tests `riskPenalty` raw point conversion for negative or mixed issue tone.
3. Keeps article evidence locked for subscriber research.
4. Allows benchmark and report copy QA without external data access.
5. Separates product logic from future Naver API transport concerns.

## Seed Item Schema

`NaverNewsIssueSeedItem` is a local TypeScript shape:

1. `id`
2. `artistId`
3. `artistName`
4. `title`
5. `outlet`
6. `publishedAt`
7. `sourceUrl`
8. `issueType`
9. `tone`
10. `relevanceScore`
11. `outletCredibilityScore`
12. `recencyScore`
13. `impactScore`
14. `riskScore`
15. `noteKo`
16. `noteEn`

The current samples are fictionalized preview seeds. They are not live Naver
articles and should not be shown as actual reporting evidence.

## Issue Types

Supported `issueType` values:

1. `comeback`
2. `chartPerformance`
3. `brandCampaign`
4. `fandomReaction`
5. `contractAgency`
6. `controversyRisk`
7. `hiatusActivity`
8. `awardPerformance`
9. `other`

`contractAgency`, `controversyRisk`, and `hiatusActivity` also feed risk
penalty more strongly because they can change interpretation even when public
attention is high.

## Tone Values

Supported `tone` values:

1. `positive`
2. `neutral`
3. `negative`
4. `mixed`

Positive tone can add more `newsIssue` point. Negative and mixed tone still
contribute to issue visibility, but they also increase `riskPenalty` raw point
more strongly.

## Point Calculation

Article-level issue point:

```text
relevanceScore
  * outletCredibilityScore
  * recencyScore
  * impactScore
  * toneMultiplier
  * issueTypeMultiplier
```

The result is not clamped to `0-100`. It is a cumulative point candidate.

Artist-level `weightedIssuePoint` is the sum of article-level issue points.
This can be used as the FANDEX v1 `newsIssue.rawPoint` candidate.

Artist-level `riskPenaltyRawPoint` is calculated separately from:

1. `riskScore`
2. `relevanceScore`
3. `impactScore`
4. issue-type risk multiplier
5. tone risk multiplier

This can be used as the FANDEX v1 `riskPenalty.rawPoint` candidate. Negative
and mixed tone receive stronger risk multipliers than positive tone.

## Free Vs Subscriber Exposure

Free preview can show:

1. Total FANDEX cumulative point.
2. Point band.
3. Issue tone.
4. A note that news/issue signals are manual seed based preview data.

Free preview must not show:

1. Article-level evidence.
2. Article count.
3. Tone distribution.
4. Source count.
5. Risk signal detail.
6. Category raw points or coefficients.
7. Benchmark validation hints.

Subscriber research can later show:

1. Article evidence.
2. Issue type.
3. Tone distribution.
4. Source count.
5. Risk signal.
6. Benchmark alignment.
7. Analyst review notes.

## Current Limits

1. Real Naver News API is not connected.
2. Data is manually entered and sample based.
3. Article tone is an interim proxy.
4. Outlet credibility is a temporary scoring input and needs calibration.
5. Duplicate article clustering is not implemented in this helper.
6. Manual seed samples are fictionalized preview records.
7. Supabase issue snapshots are not stored.

## Next TODO

1. Naver News API server-side connector.
2. API key and env design.
3. Article deduplication.
4. Outlet credibility table.
5. Tone classifier.
6. Supabase issue snapshot table.
7. Subscriber report evidence table.
