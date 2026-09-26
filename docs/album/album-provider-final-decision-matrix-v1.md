# FANDEX Album — Circle vs Hanteo Final Provider Decision Matrix v1.0

## 1. Decision scope

This document finalizes the technical provider decision for FANDEX Album Core.

```text
Metric = Album
Construct = physical album completed-purchase-class sales/reaction
Current Primary = circle-retail
Challenger = hanteo
Decision Stage = final-direct-evidence-review
Commercial Rights = not cleared for both providers
```

Primary means FANDEX's canonical provider evidence source for the Album Core. It does not mean total-market truth.

Hard rules:

```text
Metric != Provider
Provider != Capability
Public != Licensed
API access != Storage right
Storage right != Redistribution right
Rank != Sales
Index != Sales
Missing != Zero
Circle + Hanteo quantities are never raw-summed or averaged
```

## 2. Decision method

The decision uses hard eligibility gates first, then tie-breakers only when more than one provider passes every hard gate.

### Primary eligibility hard gates

```text
H1 native exact-copy quantity field = PASS
H2 provider-native historical exact-copy acquisition = PASS
H3 entity mapping = PASS or bounded CONDITIONAL_PASS
H4 missing/error semantics = PASS
H5 no access-control circumvention required = PASS
H6 revision-aware observation/canonical reconciliation = PASS
```

A provider that does not satisfy every hard gate is not Primary-eligible even if its semantic quality is otherwise strong.

### Tie-breakers

If two providers become Primary-eligible, compare in this order:

1. stable native identity
2. historical period acquisition breadth
3. request/response stability
4. completeness/pagination clarity
5. operational complexity
6. cadence richness
7. provider universe/coverage strength
8. provider-native first-week usefulness

Rights are tracked separately from the technical provider decision. Engineering selection does not clear storage, publication, commercial-use, or redistribution rights.

## 3. Pre-qualified semantic/context matrix

| Dimension | Circle Retail | Hanteo Album | Decision impact |
|---|---|---|---|
| Provider identity | PASS | PASS | both qualified providers |
| Album Core semantic fit | PASS | PASS | both track completed physical-album purchase-class activity |
| Exact copies semantic | PASS | PASS | both expose copy quantities in qualified evidence |
| Quantity unit | copies | copies | compatible normalized unit |
| Sales vs rank/index separation | PASS | PASS | Circle rank is not quantity; Hanteo Album Index is not copies |
| Provider universe | PARTIAL | PARTIAL / stronger current evidence | neither equals total market |
| Native periods | Hour/Day/Week/Month/Year | Day/Week/Month current qualified | Circle materially broader |
| Public historical context | PASS | PASS | both expose historical chart context |
| Historical exact-copy direct acquisition | PASS | UNVERIFIED | decisive Primary gate difference |
| Revision/correction evidence | PASS | PASS at provider evidence level | adapter-level PoC differs |
| Rights status | HIGH RISK / not cleared | HIGH RISK / not cleared | tracked separately |

## 4. Direct implementation evidence matrix

| Direct evidence item | Circle Retail | Hanteo Album |
|---|---|---|
| Working structured endpoint | PASS | PASS current |
| HTTP method | POST | GET |
| Request selector | termGbn + provider period params | timeframe route + required limit |
| Response root | PASS | PASS |
| Chart row location | PASS | PASS |
| Exact native quantity field | `rowSum` | `detail.salesVolume` |
| Quantity cross-check | PASS | PASS |
| Artist field | PASS | PASS |
| Release/title field | PASS | PASS |
| Stable item/SKU candidate | Barcode on non-hour rows | `targetIdx` chart-target candidate |
| Stable artist ID | not provider-qualified | `artistIdx` PASS candidate |
| Stable album/release ID | unresolved | `targetIdx` level unresolved |
| Pagination/completeness | displayed Top 50 reproduced; total universe not claimed | requested `limit`; broader completeness unknown |
| Current Daily | PASS | PASS |
| Historical Daily exact copies | PASS | UNVERIFIED |
| Provider-native Weekly | PASS | PASS current |
| Historical Weekly exact copies | PASS | UNVERIFIED |
| Monthly | PASS | PASS current |
| Historical Monthly exact copies | PASS | UNVERIFIED |
| Hourly/Realtime | PASS Hourly | unqualified |
| Yearly | PASS | unqualified |
| Missing/error semantics | PASS bounded provider-error model | PARTIAL current provider-error contract |
| Schema stability | PASS bounded evidence | PASS current bounded evidence |
| Rate-limit/session contract | conservative FANDEX throttle qualified; provider hard limit unknown | unqualified |
| Revision reconciliation PoC | PASS | not yet qualified |
| Access-control bypass required | NO | NO for qualified current endpoints |

## 5. Circle Retail hard-gate evaluation

### H1 — native exact copies

```text
PASS
native field = rowSum
semantic = retail album sales copies
```

The official Circle Retail renderer maps `rowSum` to displayed Sales / 판매량.

### H2 — historical exact copies

```text
PASS
Day / Week / Month / Year historical exact-copy acquisition qualified
Hourly historical acquisition also qualified through provider helper + retail_hour flow
```

### H3 — entity mapping

```text
PASS / bounded conditional
```

Non-hour rows expose Barcode as `providerSkuId`. FANDEX still requires reviewed Artist + Release reconciliation before emitting a canonical DirectAlbumObservation.

Hourly rows do not expose Barcode and therefore keep `providerSkuId = null`.

### H4 — missing/error semantics

```text
PASS
```

Bounded probes established published success and a coarse provider `ResultStatus=Error` state for invalid/future/prelaunch periods. FANDEX does not convert this state to zero.

### H5 — no circumvention

```text
PASS
```

Qualified public-direct collection does not require login bypass, CAPTCHA bypass, access-control bypass, or anti-bot circumvention.

### H6 — revision reconciliation

```text
PASS
```

`circle-retail-revision-v1` preserves immutable observations, detects changed values for the same logical series, appends a revision observation, and links supersession.

### Circle Primary eligibility

```text
CirclePrimaryEligibility = PASS
```

## 6. Hanteo hard-gate evaluation

### H1 — native exact copies

```text
PASS
native field = detail.salesVolume
```

`row.value` is Album Index and is explicitly prohibited from use as copy quantity.

### H2 — historical exact copies

```text
UNVERIFIED
```

Historical public chart pages are accessible, but bounded inspection found historical pages rendered as rank-only context (`showSales=false`, `rankOnly=true`).

The same-site `/api/chart-sales` helper was discovered, but changing historical Week 30 / Week 29 Referer did not produce period-specific historical sales values. It is therefore not qualified as a historical exact-copy selector.

No date, issue, timestamp, period, or other selector is invented.

Because H2 is a hard gate:

```text
HanteoPrimaryEligibility = NOT_QUALIFIED
```

### H3 — entity mapping

```text
CONDITIONAL_PASS current
```

`artistIdx` is a provider artist identity candidate. `targetIdx` is preserved as a provider target/release candidate, but its exact release-vs-edition-vs-product semantic level remains unresolved.

FANDEX requires reviewed canonical Artist + Release identity before observation emission.

### H4 — missing/error semantics

```text
PARTIAL_PASS current
```

Current success uses provider code 100. Missing required `limit` produced provider code 602. Historical missing/not-published exact-copy semantics remain unqualified.

### H5 — no circumvention

```text
PASS for qualified current acquisition
```

No bypass is needed for the qualified current Daily/Weekly/Monthly endpoints.

Historical exact-copy acquisition is simply unverified; FANDEX will not bypass controls to obtain it.

### H6 — revision reconciliation

```text
NOT_QUALIFIED in adapter path
```

Provider-level correction behavior is evidenced, but a Hanteo adapter-level immutable observation + supersession PoC has not been qualified.

### Hanteo Primary eligibility

```text
HanteoPrimaryEligibility = NOT_QUALIFIED
```

Hanteo remains fully useful as a secondary verification source for current exact-copy evidence.

## 7. Final provider decision

```text
AlbumProviderFinalDecision {
  selectedPrimaryProvider: "circle-retail"
  primaryCapability: "Circle Retail Album Chart"
  secondaryVerificationProvider: "hanteo"
  secondaryCapability: "Hanteo Album Chart"

  circleVerdict: "PASS"
  hanteoVerdict: "CONDITIONAL_PASS_SECONDARY"

  primaryEligibility: {
    circle: "PASS"
    hanteo: "NOT_QUALIFIED"
  }

  selectionConfidence: "HIGH"
  decisionState: "primary-finalized-technical"

  collectorEngineeringAuthorized: true
  productionRuntimeCollectionAuthorized: false
  productionPublicationAuthorized: false
  commercialRightsCleared: false
}
```

### Why Circle is Primary

1. exact retail copies are directly qualified
2. provider-native Hour/Day/Week/Month/Year coverage is directly qualified
3. historical exact-copy acquisition is directly qualified
4. non-hour Barcode identity is available as a stable SKU/product candidate
5. missing/error behavior has bounded direct evidence
6. revision/supersession reconciliation is implemented and validated
7. conservative FANDEX-owned throttling behavior is defined

### Why Hanteo is Secondary

1. current exact copies are directly qualified and valuable for verification
2. `salesVolume` vs Album Index separation is strong
3. provider artist identity is useful
4. provider network/coverage evidence is strong context
5. historical exact-copy public acquisition is not directly qualified
6. adapter-level revision reconciliation is not yet qualified

The decision is therefore not a statement that Circle is universally more accurate than Hanteo. It is the result of applying the same operational Primary gates to both providers.

## 8. Provider role model after decision

```text
Album
│
├─ Primary Evidence
│   └─ Circle Retail Album Chart
│
├─ Secondary Verification
│   └─ Hanteo Album Chart
│
├─ Supply / distribution context
│   └─ Circle Album Chart
│
├─ Milestone context
│   └─ Circle Certification
│
└─ Retail proxy
    └─ YES24
```

Never do:

```text
CircleRetail + Hanteo
(CircleRetail + Hanteo) / 2
CircleRetail + CircleAlbum
Certification threshold -> exact quantity
YES24 rank / SalePoint -> copies
```

Cross-provider comparison may instead produce separate evidence such as:

```text
providerAgreement
providerDivergence
releaseAnomaly
coverageDifference
```

without mutating either provider-native quantity.

## 9. Format / edition aggregation rule

Provider-native rows are ingested as published.

```text
nativeValue
```

If FANDEX later creates a release-family aggregate across CD / platform / POCA / Weverse / other variants, it must be stored separately as:

```text
derivedReleaseAggregate
```

and must never overwrite the provider-native observation.

## 10. Period rule

Provider-native periods remain authoritative evidence records.

```text
providerNativeDaily
providerNativeWeekly
providerNativeMonthly
```

Optional FANDEX-derived windows may coexist separately:

```text
derivedWeeklyFromDaily
```

A derived weekly sum must not replace the provider's official Weekly value.

## 11. Revision and Missing rule

All collection must preserve the distinction between:

```text
ZERO
MISSING
NOT_PUBLISHED
FETCH_FAILED
TEMPORARILY_UNAVAILABLE
REVISED_AWAY
```

Revision flow:

```text
observe
→ compare with current canonical
→ detect revision
→ append immutable observation
→ supersede previous canonical
```

Old provider values must remain recoverable.

## 12. Authorization boundary

This technical decision authorizes continued engineering against the selected public-direct collection strategy.

```text
collectorEngineeringAuthorized = true
implementationAuthorized = true
```

It does not authorize autonomous Production runtime collection or public/commercial publication by itself.

```text
productionRuntimeCollectionAuthorized = false
productionPublicationAuthorized = false
commercialRightsCleared = false
```

Those are separate authorization gates.

Still prohibited:

```text
login bypass
CAPTCHA bypass
credential bypass
403/429 circumvention
anti-bot bypass
raw provider dataset resale
claims that public access equals a license
```

## 13. Re-selection triggers

The Primary decision may be reopened if any of the following becomes true:

```text
Circle exact-copy field fails semantic revalidation
Circle historical acquisition becomes unavailable or unstable
Circle identity becomes operationally unusable
Circle response schema becomes persistently unstable
Hanteo historical exact-copy acquisition becomes directly qualified
Hanteo revision reconciliation becomes directly qualified
Hanteo then materially outperforms Circle on the defined tie-breakers
provider public-access behavior materially changes
```

A Hanteo switch is never automatic merely because a new endpoint is discovered. The full hard-gate matrix must be rerun.

## 14. Evidence references

Circle implementation evidence is represented by the Circle Retail technical qualification work in PR #130.

Hanteo implementation evidence is represented by the Hanteo current discovery / secondary adapter work in PR #131.

Key validation run references:

```text
Circle:
33419496120
33419576107
33420003465
33421361137
33422606710
33422703085
33423012619

Hanteo:
33423596518
33423664416
33423845891
33425415089
33425610457
33425787804
33426524892
```

## 15. Next implementation stage

The Provider Selection phase is now technically complete.

Next artifact:

```text
FANDEX Album — Production Collector Contract v1.0
```

That contract should define, without yet enabling Production runtime:

1. Circle Retail canonical collector interface
2. Hanteo current secondary-verification interface
3. normalized observation persistence boundaries
4. revision/supersession storage contract
5. provider-period scheduling semantics
6. retry/throttle/error policy
7. cross-provider verification logic
8. backfill boundaries
9. runtime feature flags / kill switch
10. explicit Production runtime and publication authorization gates
