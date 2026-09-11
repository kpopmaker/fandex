# Circle Retail Conservative Throttling Evidence v1

## Decision

```text
provider = circle-chart
providerHardLimitState = unknown
technicalThrottlingPolicyQualified = true
liveCallsAllowed = false
productionAllowed = false
```

This packet does **not** claim that Circle has no rate limit and does not infer a provider requests-per-second or requests-per-day quota.

## Bounded probe evidence

Initial low-frequency probe:

```text
workflow run = 33422606710
requests = 3
spacing = 3 seconds
job result = SUCCESS
```

The first run was intentionally tiny and was not used to manufacture a 429 response.

A second artifact-producing probe was then used only to capture exact bounded evidence:

```text
workflow run = 33422703085
requests = 2
spacing = 3 seconds
```

Observed for both requests:

```text
HTTP = 200
ResultStatus = OK
rows = 50
```

Selected response headers showed no observed:

```text
Retry-After
X-RateLimit-*
RateLimit-*
```

The artifact contained only request status, provider status, row count, and selected headers; raw chart rows were not retained in the artifact.

## Interpretation boundary

The correct interpretation is:

```text
Two low-frequency requests succeeded
!=
Circle has no rate limit
```

Therefore:

```text
providerHardLimitState = unknown
observed429 = false
explicitRateLimitHeadersObserved = false
retryAfterObserved = false
```

No attempt is made to discover a hard limit by increasing pressure.

## FANDEX self-imposed policy

`circle-retail-throttling-v1` defines a FANDEX-owned conservative policy rather than a claimed provider policy:

```text
maxConcurrency = 1
minimumIntervalMs = 3000
maxRequestsPerBoundedRun = 20
maxServerErrorRetries = 2
serverErrorBackoffMs = [10000, 30000]
fallbackRetryAfterMs = 60000
```

These are internal safety limits. They are not Circle quotas.

## Response behavior

```text
2xx
  -> wait at least 3000 ms before the next request

429
  -> halt the current run
  -> honor Retry-After when present
  -> otherwise retain a 60000 ms fallback advisory wait
  -> do not automatically continue the current run

403
  -> halt immediately
  -> do not retry or bypass

5xx
  -> at most two bounded retries
  -> 10 s then 30 s
  -> halt after retries are exhausted

other 4xx
  -> halt the current run
```

## Authorization boundary

Technical throttling qualification does not change authorization:

```text
acquisitionState = review-required
automationState = review-required
rawStorageState = review-required
normalizedStorageState = review-required
commercialUseState = contract-required
derivedPublicationState = review-required
rawRedistributionState = blocked

enabled = false
liveCallsAllowed = false
productionAllowed = false
```

## Provider evidence impact

The previous technical blocker:

```text
rate-limit-qualification-required
```

is satisfied by the conservative collector policy while the provider hard limit remains explicitly unknown.

The independent remaining blocker is:

```text
storage-and-publication-rights-review-required
```

This means the Circle Retail collector path is technically qualified for bounded research design, but recurring live collection and Production remain disabled.
