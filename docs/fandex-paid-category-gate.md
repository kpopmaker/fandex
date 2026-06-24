# FANDEX Paid Category Gate

Status: static UI and product-structure preview. No auth, payment, subscription
check, Supabase access table, role-based access control, API route, server
action, external fetch, or live data source is implemented.

## Korean-First Gate Copy

The paid category gate is now presented in Korean by default for domestic
consumer positioning. English remains available through the lightweight KO/EN
toggle, but the default lock copy should use Korean service terms:

1. 제한된 무료 검색.
2. 심층 리서치.
3. 유료 리서치 카테고리.
4. 이슈 톤 미리보기.
5. 브랜드 적합도.
6. AI 해석.
7. 주간 리서치 리포트.
8. Early Access 신청.

The gate should avoid payment-like language such as "buy now", "checkout", or
confirmed pricing. Paid access is still shown as a beta preview.

## Why Free Scope Is Minimal

FANDEX needs the free product to create interest without giving away the full
research value. The free search should confirm that an artist exists in the
FANDEX universe and show a surface signal, then guide high-intent users toward
subscriber research.

Keeping the free scope narrow helps:

1. Preserve paid research value.
2. Make the Plus and Pro category unlock model easier to understand.
3. Avoid presenting static preview data as a complete research product.
4. Validate Early Access demand before building auth, payment, and entitlement
   systems.

## Free Preview Shows

The limited free search preview can show:

1. Artist name.
2. Ticker or id.
3. Minimal agency or group metadata.
4. Basic overall FANDEX preview score.
5. One-line issue tone preview.
6. A subscriber-only research notice.
7. `View Sample Report` CTA.
8. `Explore Subscriber Research` CTA.

## Free Preview Hides

The free preview should not expose:

1. Category-level detailed scores.
2. Signal breakdowns.
3. AI interpretation.
4. Full issue reasoning.
5. Brand-fit analysis.
6. Artist comparison.
7. Weekly report content.
8. Source-level detail.
9. Long summaries that explain the complete research logic.

## Paid Category List

Free or preview categories:

1. 개요 / Overview.
2. 기본 FANDEX 점수 / Basic FANDEX Score.
3. 이슈 톤 미리보기 / Issue Tone Preview.

Locked subscriber categories:

1. 음원/음반 신호 / Music / Album Signal.
2. 뉴스/이슈 신호 / News / Issue Signal.
3. SNS/팬덤 신호 / SNS / Fandom Signal.
4. 브랜드 적합도 / Brand-fit Signal.
5. 컴백/활동 신호 / Comeback / Activity Signal.
6. 아티스트 비교 / Artist Comparison.
7. AI 해석 / AI Interpretation.
8. 주간 리서치 리포트 / Weekly Research Report.

## Plus And Pro Unlock Structure

Free Preview:

1. Overview.
2. Basic FANDEX Score.
3. Issue Tone Preview.

FANDEX Plus:

1. Music / Album Signal.
2. News / Issue Signal.
3. SNS / Fandom Signal.
4. Artist Comparison.
5. AI Interpretation.
6. Weekly Research Report.

FANDEX Pro:

1. Brand-fit Signal.
2. Issue Risk Analysis.
3. Campaign Angle Memo.
4. Custom Artist Research Request.
5. Portfolio / Interview-ready Industry Brief.
6. Watchlist & Signal Commentary.

Pricing will be validated during Early Access. Paid access is not live yet.
Subscriber category access is currently shown as a beta preview.

## Not Implemented

This gate does not implement:

1. Auth.
2. Payment.
3. Toss Payments.
4. Subscription check.
5. Supabase subscription table.
6. Role-based access control.
7. API route.
8. Server action.
9. Real form submit.
10. Actual subscriber detection.
11. External fetch or Naver API calls.

## Next TODO

1. Auth/payment decision.
2. Waitlist validation.
3. Supabase waitlist storage.
4. Paid category access model.
5. Real data source connection.
6. Actual FANDEX v1 scoring formula integration.
