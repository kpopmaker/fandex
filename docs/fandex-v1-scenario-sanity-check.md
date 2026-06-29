# FANDEX v1 Scenario Sanity Check

Status: fictionalized/manual scenario preview only. No live API, Naver News
call, `fetch`, env/API key, Supabase, database write, payment, login,
entitlement check, or actual artist risk assertion is implemented.

The scenario sanity check is a formula validation sample, not an evaluation of
real artists. Scenario labels, descriptions, and analyst notes must stay
fictionalized and must not imply real artist controversy, legal, contract,
hiatus, or risk conditions.

## Why This Exists

FANDEX v1 uses an unbounded cumulative point model, not a 0-100 score. Before
connecting live data, the formula needs a sanity check that verifies whether
different fictionalized artist situations create persuasive point gaps.

The check is designed to answer:

1. Does high momentum create a meaningfully higher net point?
2. Does stable top-tier strength stay high even without explosive growth?
3. Does brand-safe growth show commercial research value?
4. Does a fandom spike look strong but still require retention checks?
5. Do hiatus or controversy risk scenarios lower net points through risk
   penalty?
6. Does high article visibility avoid becoming an automatic positive score?

## Why Not 0-100

A capped 0-100 score compresses the distance between very different situations.
FANDEX v1 instead accumulates category raw points multiplied by coefficients,
then subtracts risk penalty points.

```text
netPoint = positiveCumulativePoint - riskPenaltyPoint
```

Scores can be above 100, in the thousands, or negative. The value is a
risk-adjusted cumulative research point, not a popularity total or official
certification score.

## Scenario List

Current fictionalized scenarios:

1. `highComebackMomentum`
2. `stableTopTier`
3. `brandSafeGrowth`
4. `fandomSpike`
5. `hiatusRisk`
6. `controversyRisk`
7. `weakSignalLowMomentum`

No real artist names are used. These are formula behavior probes only.

## Expected Behavior

`highComebackMomentum`:
Strong music/album, comeback/activity, and growth momentum should produce a
high net point when risk is low.

`stableTopTier`:
Music/album, fandom, and brand-fit strength should keep the scenario high even
when growth momentum is only moderate.

`brandSafeGrowth`:
Brand-fit, fandom, and constructive news/issue signals should show campaign
strength with low risk drag.

`fandomSpike`:
SNS/fandom and news/issue spikes should raise the point, while analyst notes
should still ask whether the spike is durable.

`hiatusRisk`:
Low activity and growth momentum plus meaningful risk penalty should lower the
net point.

`controversyRisk`:
News/issue raw point can be high, but negative or mixed issue tone and large
risk penalty should lower net point. This prevents article volume from being
treated as inherently positive.

`weakSignalLowMomentum`:
Low raw points across categories should remain low and classify as an early
signal rather than a strong artist signal.

## Risk Impact

Risk penalty is modeled as a separate drag:

```text
riskPenaltyPoint = riskPenaltyRawPoint * riskPenaltyCoefficient
```

The scenario helper reports:

1. positive cumulative point.
2. risk penalty point.
3. net point.
4. strongest positive category.
5. strongest drag category.
6. risk level.
7. point gap between highest and lowest scenarios.

## Article Volume Vs Positive Score

Naver News manual seed can make `newsIssue.rawPoint` large when issue visibility
is high. Scenario sanity check exists to confirm that high article visibility is
not automatically interpreted as positive value. Negative or mixed issue tone
should increase risk drag and can reduce net point.

## Free Vs Subscriber Exposure

Free preview can show:

1. Total cumulative point.
2. Point band.
3. Simple issue tone.

Subscriber research can show:

1. Scenario comparison.
2. Point gap.
3. Category contribution.
4. Risk impact.
5. Benchmark alignment.
6. Analyst review.

## Current Limits

1. Scenarios are fictionalized/manual samples.
2. Real data validation is not connected.
3. Coefficient tuning is still required.
4. Scenario coefficients must stay synchronized with the scoring formula.
5. Benchmark alignment is needed before making stronger claims.
6. The helper does not assert anything about actual artists.

## TODO

1. Connect actual manual seed artist cases after review.
2. Build Naver News API server-side connector.
3. Generate coefficient sensitivity report.
4. Add ranking stability test.
5. Add category contribution waterfall.
6. Add subscriber report evidence table.
