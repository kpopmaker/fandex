# FANDEX v1 Scoring Formula

Status: preview scoring structure. This is a deterministic TypeScript helper
for product UI and shape validation. It does not connect to live APIs,
Supabase, auth, payment, entitlement checks, or AI generation.

## Purpose

FANDEX v1 defines a clearer scoring structure for the free search preview and
subscriber category gate. The goal is to separate what free users can see from
the category-level breakdown planned for subscriber research.

Free users should understand the broad artist signal without receiving the full
research logic. Subscriber research can later unlock category scores,
explanations, and AI interpretation.

## Categories

Positive weighted categories:

1. Music / Album Signal.
2. News / Issue Signal.
3. SNS / Fandom Signal.
4. Brand-fit Signal.
5. Comeback / Activity Signal.
6. Growth Momentum.

Subtractive category:

1. Risk Penalty.

## Weights

The v1 preview weights are:

1. Music / Album Signal: 25.
2. News / Issue Signal: 20.
3. SNS / Fandom Signal: 20.
4. Brand-fit Signal: 15.
5. Comeback / Activity Signal: 10.
6. Growth Momentum: 10.

Risk Penalty is not part of the positive weighted total. It is applied as a
subtractive adjustment.

## Risk Penalty

`riskPenaltyScore` is a 0 to 100 input.

The formula converts it into a maximum 12 point deduction:

```text
riskPenaltyApplied = riskPenaltyScore / 100 * 12
overallScore = weightedPositiveScore - riskPenaltyApplied
```

The final score is clamped to 0 to 100 and rounded.

## Score Output

`overallScore` is the internal preview result.

`publicScore` is the rounded score shown to free users.

`scoreBand` is derived from the score:

1. 85 or higher: High Momentum.
2. 70 or higher: Strong Signal.
3. 55 or higher: Watch.
4. Otherwise: Early Signal.

`issueTone` is derived from issue, growth, and risk inputs:

1. Risk Penalty 70 or higher: Risk Watch.
2. News / Issue 70 or higher and Risk Penalty below 40: Active Buzz.
3. Growth Momentum 70 or higher: Momentum Rising.
4. Otherwise: Neutral Preview.

## Free Vs Subscriber Exposure

Free preview can show:

1. Artist name.
2. Ticker or id.
3. Minimal metadata.
4. FANDEX v1 `publicScore`.
5. `scoreBand`.
6. `issueTone`.

Free preview must not show:

1. Category score numbers.
2. Weighted formula details.
3. Risk penalty value.
4. Source-level details.
5. AI interpretation.

Subscriber gate can show locked category names and descriptions, but score
numbers remain hidden until real subscriber access is implemented.

## Current Limits

This phase is limited because:

1. Live data is not connected yet.
2. Search uses mock/manual seed preview inputs.
3. API routes are not connected.
4. Supabase score storage is not implemented.
5. AI interpretation backend is not implemented.
6. Category unlock and entitlement checks are not implemented.

## Next TODO

1. Connect Naver News actual issue signal.
2. Define manual seed data schema.
3. Add Supabase score snapshot table.
4. Add score history.
5. Implement category breakdown unlock.
6. Generate AI interpretation from category breakdown.
