import Link from 'next/link';
import type { ReactNode } from 'react';

const subscriberFeatures = [
  {
    titleKo: '음원/음반 신호',
    titleEn: 'Music / Album Signal',
    descriptionKo: '앨범, 컴백, 차트, 발매 흐름을 구독자 리서치 관점으로 해석합니다.',
    descriptionEn: 'Album, comeback, chart, and release momentum context for subscriber research.',
  },
  {
    titleKo: '뉴스/이슈 신호',
    titleEn: 'News / Issue Signal',
    descriptionKo: '무료 이슈 톤을 넘어 반복 보도, 이슈 집중도, 관찰 포인트를 정리합니다.',
    descriptionEn: 'Issue concentration, repeated headline patterns, and watch context beyond the free tone.',
  },
  {
    titleKo: 'SNS/팬덤 신호',
    titleEn: 'SNS / Fandom Signal',
    descriptionKo: '팬덤 반응, 커뮤니티 움직임, SNS 확산 흐름을 추적합니다.',
    descriptionEn: 'Fandom attention, community movement, and social pickup for tracked artists.',
  },
  {
    titleKo: '아티스트 비교',
    titleEn: 'Artist Comparison',
    descriptionKo: '아티스트별 카테고리 신호를 비교해 포지셔닝 판단을 돕습니다.',
    descriptionEn: 'Side-by-side artist category profiles for positioning and research decisions.',
  },
  {
    titleKo: 'AI 해석',
    titleEn: 'AI Interpretation',
    descriptionKo: '아티스트 신호가 왜 중요한지 AI 기반 요약으로 설명합니다.',
    descriptionEn: 'AI-assisted summaries that explain why an artist signal matters.',
  },
  {
    titleKo: '주간 리서치 리포트',
    titleEn: 'Weekly FANDEX Report',
    descriptionKo: '관심 아티스트와 이슈 변화를 주간 리서치 형태로 받아볼 수 있습니다.',
    descriptionEn: 'Receive a weekly K-pop signal digest with artist watchlists and issue movement commentary.',
  },
  {
    titleKo: 'Watchlist 코멘터리',
    titleEn: 'Watchlist & Signal Commentary',
    descriptionKo: '관심 아티스트의 공개 신호가 어떻게 달라졌는지 주간 단위로 해석합니다.',
    descriptionEn: 'Track priority artists and understand what changed across public signals week by week.',
  },
];

const planPreview = [
  {
    nameKo: 'Free Preview',
    nameEn: 'Free Preview',
    unlockKo: '미리보기 카테고리 3개',
    unlockEn: '3 preview categories',
    descriptionKo: 'SNS 콘텐츠를 본 뒤 제한된 신호만 빠르게 확인하려는 사용자를 위한 범위입니다.',
    descriptionEn: 'For visitors who want a limited signal check after seeing SNS content.',
    items: [
      { ko: '개요', en: 'Overview' },
      { ko: 'FANDEX 누적 포인트', en: 'FANDEX cumulative point' },
      { ko: '이슈 톤 미리보기', en: 'Issue tone preview' },
    ],
  },
  {
    nameKo: 'FANDEX Plus',
    nameEn: 'FANDEX Plus',
    unlockKo: '구독자 카테고리 6개',
    unlockEn: '6 subscriber categories',
    descriptionKo: '팬, 마케터, 업계 관찰자가 반복적으로 카테고리 맥락을 확인할 수 있는 구조입니다.',
    descriptionEn: 'For fans, marketers, and industry watchers who need recurring category context.',
    items: [
      { ko: '음원/음반 신호', en: 'Music / Album Signal' },
      { ko: '뉴스/이슈 신호', en: 'News / Issue Signal' },
      { ko: 'SNS/팬덤 신호', en: 'SNS / Fandom Signal' },
      { ko: '아티스트 비교', en: 'Artist Comparison' },
      { ko: 'AI 해석', en: 'AI Interpretation' },
      { ko: '주간 리서치 리포트', en: 'Weekly Research Report' },
    ],
  },
  {
    nameKo: 'FANDEX Pro',
    nameEn: 'FANDEX Pro',
    unlockKo: '심층 리서치 카테고리 6개',
    unlockEn: '6 advanced research categories',
    descriptionKo: '브랜드, 캠페인, 포트폴리오 리서치 목적의 심층 분석 구조입니다.',
    descriptionEn: 'For brand, campaign, and portfolio research use cases.',
    items: [
      { ko: '브랜드 적합도 분석', en: 'Brand-fit Signal' },
      { ko: '이슈 리스크 분석', en: 'Issue Risk Analysis' },
      { ko: '캠페인 앵글 메모', en: 'Campaign Angle Memo' },
      { ko: '맞춤형 아티스트 리서치 요청', en: 'Custom Artist Research Request' },
      { ko: '포트폴리오/면접용 산업 브리프', en: 'Portfolio / Interview-ready Industry Brief' },
      { ko: '관심 아티스트 Watchlist 코멘터리', en: 'Watchlist & Signal Commentary' },
    ],
  },
];

const exampleOutputs = [
  {
    titleKo: '가상 아티스트 A: 컴백 모멘텀이 강한 시나리오',
    titleEn: 'Scenario A: strong comeback momentum brief',
    freePreviewKo: '무료 미리보기에서는 아티스트 점수와 이슈 톤만 확인할 수 있습니다.',
    freePreviewEn: 'Free preview shows artist score, issue tone, and sample signal count.',
    subscriberUnlockKo: '구독자 리서치는 컴백 타이밍, 팬덤 관심 요인, 캠페인 앵글을 추가합니다.',
    subscriberUnlockEn: 'Subscriber research adds comeback timing context, fan attention drivers, and campaign angles.',
    whyItMattersKo: '마케팅 팀은 기대감, 스타일링, 팬덤 참여 중 어떤 메시지를 강조할지 판단할 수 있습니다.',
    whyItMattersEn: 'Marketing teams can decide whether to emphasize anticipation, styling, or fandom activation.',
  },
  {
    titleKo: '가상 아티스트 C: 브랜드 안정성과 팬덤 확산이 균형 잡힌 시나리오',
    titleEn: 'Scenario C: balanced brand stability and fandom growth',
    freePreviewKo: '무료 미리보기에서는 기본 모멘텀과 균형적인 이슈 톤만 확인합니다.',
    freePreviewEn: 'Free preview shows basic momentum and a balanced issue tone.',
    subscriberUnlockKo: '구독자 리서치는 현재 아티스트 신호와 맞는 브랜드 카테고리를 설명합니다.',
    subscriberUnlockEn: 'Subscriber research explains which brand categories match the current artist signal profile.',
    whyItMattersKo: '브랜드 팀은 청량한 퍼포먼스 이미지가 캠페인 목표와 맞는지 비교할 수 있습니다.',
    whyItMattersEn: 'Brand teams can compare youthful performance fit against broader campaign goals.',
  },
  {
    titleKo: '가상 아티스트 B: 뉴스 노출은 높지만 리스크 감점이 큰 시나리오',
    titleEn: 'Scenario B: high news exposure with risk penalty',
    freePreviewKo: '무료 미리보기에서는 주의 톤과 기본 이슈 집중도만 보여줍니다.',
    freePreviewEn: 'Free preview highlights watch tone and basic issue concentration.',
    subscriberUnlockKo: '구독자 리서치는 반복 보도와 가상 리스크 시나리오를 구분하고 모니터링 메모를 제공합니다.',
    subscriberUnlockEn: 'Subscriber research separates repeated headlines from fictional risk scenarios and adds monitoring notes.',
    whyItMattersKo: '업계 관찰자는 노출이 유효한 관심인지 캠페인 변동성인지 판단할 수 있습니다.',
    whyItMattersEn: 'Industry watchers can understand whether visibility is useful attention or campaign volatility.',
  },
];

export default function SubscriberResearchPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
                <LangText en="FANDEX Subscriber Research" ko="FANDEX 구독자 리서치" />
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                <LangText
                  en="From quick search to full artist intelligence"
                  ko="무료 검색에서 심층 아티스트 리서치까지"
                />
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                <LangText
                  en="Free search shows only the surface signal. Subscriber research is structured around paid category unlocks: music, issue, SNS, comparison, AI interpretation, weekly reports, and Pro research memos. Paid access is not live yet."
                  ko="무료 검색은 표면적인 신호만 보여줍니다. 구독자 리서치는 음원/음반, 뉴스/이슈, SNS/팬덤, 아티스트 비교, AI 해석, 주간 리포트, Pro 리서치 메모처럼 유료 카테고리가 열리는 구조로 설계되어 있습니다. 결제 기능은 아직 활성화되어 있지 않습니다."
                />
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/#waitlist-form"
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
              >
                <LangText en="Join Early Access" ko="Early Access 신청하기" />
              </Link>
              <Link
                href="/search"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                <LangText en="Try Limited Free Search" ko="제한된 무료 검색 시작하기" />
              </Link>
              <Link
                href="/sample-report"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                <LangText en="View Sample Report" ko="샘플 리포트 보기" />
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                <LangText en="Formula sanity check preview" ko="산식 Sanity Check Preview" />
              </p>
              <h2 className="mt-2 text-2xl font-black">
                <LangText
                  en="How FANDEX v1 checks point gaps across fictional scenarios"
                  ko="FANDEX v1이 가상 시나리오별 점수 격차를 확인하는 방식"
                />
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <LangText
                  en="FANDEX v1 is not a 0-100 score. It is an unbounded cumulative point model that compares high momentum, stable top tier, brand-safe growth, hiatus risk, and controversy risk scenarios before live data validation."
                  ko="FANDEX v1은 0~100 점수제가 아니라 상한 없는 누적 point 구조입니다. 실제 데이터 검증 전 high momentum, stable top tier, brand-safe growth, hiatus risk, controversy risk 같은 가상 시나리오로 점수 격차를 확인합니다."
                />
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <LangText
                  en="High article volume alone should not produce a high score. Tone, risk, brand fit, growth momentum, and category contribution are compared together so negative or mixed issue visibility can lower net points through risk penalty."
                  ko="단순 기사량이 많다고 높은 점수가 되지 않습니다. tone, risk, brandFit, growthMomentum, category contribution을 함께 비교해 negative/mixed 이슈 노출은 riskPenalty를 통해 netPoint를 낮출 수 있습니다."
                />
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  ko: '무료: 종합 point, 간단한 tone, 포인트 밴드',
                  en: 'Free: total point, simple tone, point band',
                },
                {
                  ko: '구독자: scenario comparison과 point gap',
                  en: 'Subscriber: scenario comparison and point gap',
                },
                {
                  ko: '구독자: category contribution과 risk impact',
                  en: 'Subscriber: category contribution and risk impact',
                },
                {
                  ko: '구독자: benchmark alignment와 analyst review',
                  en: 'Subscriber: benchmark alignment and analyst review',
                },
              ].map((item) => (
                <div
                  key={item.en}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600"
                >
                  <LangText en={item.en} ko={item.ko} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                <LangText en="FANDEX v1 scoring preview" ko="FANDEX v1 산출식 preview" />
              </p>
              <h2 className="mt-2 text-2xl font-black">
                <LangText
                  en="A beta score structure before live data connection"
                  ko="실제 데이터 연결 전의 베타 산식 구조"
                />
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <LangText
                  en="FANDEX v1 is now an unbounded cumulative point model. Each category raw point is multiplied by a coefficient and accumulated, while risk is subtracted as its own raw penalty point x coefficient. Free users see only the total cumulative point, point band, and issue tone; subscribers are planned to see category points, coefficients, contribution, risk detail, validation hints, and AI interpretation."
                  ko="FANDEX v1은 상한 없는 누적 점수제입니다. 각 카테고리 raw point에 coefficient를 곱해 누적하고, 리스크는 별도의 raw penalty point x coefficient로 누적 차감합니다. 무료 이용자는 종합 누적 점수, 포인트 밴드, 이슈 톤만 확인하고, 구독자는 카테고리별 점수, coefficient, 기여도, 리스크 세부 정보, 검증 힌트, AI 해석을 확인하는 구조입니다."
                />
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { ko: '무료: 종합 누적 점수, 포인트 밴드, 이슈 톤', en: 'Free: total cumulative point, point band, issue tone' },
                { ko: '구독자: 카테고리별 breakdown', en: 'Subscriber: category breakdown' },
                { ko: '리스크: 별도 누적 감점 포인트로 차감', en: 'Risk: subtracted as cumulative penalty points' },
                { ko: '현재: preview/mock 기반 베타 산식', en: 'Current: preview/mock based beta formula' },
                { ko: '브랜드 적합도: 광고/협업 가능성과 이미지 안정성 평가', en: 'Brand-fit: commercial usability and image stability' },
                { ko: '성장 모멘텀: 현재 총량이 아닌 최근 상승/하락 속도 평가', en: 'Growth momentum: recent acceleration, not total popularity size' },
              ].map((item) => (
                <div
                  key={item.en}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600"
                >
                  <LangText en={item.en} ko={item.ko} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                <LangText en="News issue seed preview" ko="뉴스/이슈 신호 연결 구조" />
              </p>
              <h2 className="mt-2 text-2xl font-black">
                <LangText
                  en="Manual seed news signals before live Naver News API connection"
                  ko="실제 Naver News API 연결 전 manual seed 기반 뉴스 신호"
                />
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <LangText
                  en="Naver News-style article signals can be converted into FANDEX v1 newsIssue rawPoint and riskPenalty rawPoint candidates. The current beta uses manual seed preview data only; it does not call Naver News, fetch external data, store data, or use API keys."
                  ko="Naver News 기반 기사 신호는 FANDEX v1의 newsIssue rawPoint와 riskPenalty rawPoint 후보로 변환될 수 있습니다. 현재 베타는 실제 Naver News API 연결 전 manual seed preview 단계이며, Naver News 호출, 외부 데이터 fetch, 데이터 저장, API key 사용은 하지 않습니다."
                />
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <LangText
                  en="Subscriber research is planned to add article-level evidence, tone distribution, issue type, risk signal, benchmark alignment, confidence, and analyst review notes. FANDEX remains a verifiable composite research indicator, not an official certification score."
                  ko="구독자 리서치에서는 기사별 근거, tone 분포, issue type, risk signal, benchmark alignment, 신뢰도, 분석가 검수 메모를 함께 제공할 예정입니다. FANDEX는 공식 인증 점수가 아니라 검증 가능한 복합 리서치 지표 구조입니다."
                />
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  ko: 'newsIssue rawPoint 후보: 관련도, 매체 신뢰도, 최신성, 영향도, tone, issue type을 누적',
                  en: 'newsIssue rawPoint candidate: relevance, outlet credibility, recency, impact, tone, and issue type',
                },
                {
                  ko: 'riskPenalty rawPoint 후보: negative/mixed tone, 계약/소속, 논란, 공백 이슈를 별도 누적',
                  en: 'riskPenalty rawPoint candidate: negative/mixed tone, contract/agency, controversy, and hiatus risk',
                },
                {
                  ko: '무료 화면: 종합 누적 점수와 이슈 톤만 제공',
                  en: 'Free screen: total cumulative point and issue tone only',
                },
                {
                  ko: '구독자 화면: 기사별 근거와 검증 힌트 제공 예정',
                  en: 'Subscriber screen: article evidence and validation hints planned',
                },
              ].map((item) => (
                <div
                  key={item.en}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600"
                >
                  <LangText en={item.en} ko={item.ko} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              <LangText en="Validation framework preview" ko="객관성 검증 구조 preview" />
            </p>
            <h2 className="mt-2 text-2xl font-black">
              <LangText
                en="FANDEX is a composite research indicator, not an official score"
                ko="FANDEX는 공식 인증 점수가 아니라 검증 가능한 리서치 지표입니다"
              />
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              <LangText
                en="Subscriber research is designed to pair category breakdown with benchmark alignment, confidence, uncertainty, event backtests, and manual review notes. This is currently a mock/manual seed scaffold before live benchmark sources are connected."
                ko="구독자 리서치는 카테고리별 breakdown에 benchmark alignment, 신뢰도, 불확실성, 이벤트 백테스트, 수동 검수 메모를 함께 제공하는 구조로 설계됩니다. 현재는 실제 benchmark source 연결 전 mock/manual seed 기반 scaffold입니다."
              />
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              {
                ko: '외부 기준 비교',
                en: 'External benchmarks',
                copyKo: '차트, 영상, 검색, 뉴스, 브랜드 이벤트와 방향성을 비교합니다.',
                copyEn: 'Compare direction against chart, video, search, news, and brand events.',
              },
              {
                ko: '이벤트 백테스트',
                en: 'Event backtest',
                copyKo: '컴백, 리스크, 공백, 브랜드 딜 이후 점수 움직임을 확인합니다.',
                copyEn: 'Check score movement after comeback, risk, hiatus, and brand events.',
              },
              {
                ko: '민감도 분석',
                en: 'Sensitivity',
                copyKo: 'coefficient 변경 시 순위 안정성과 리스크 하락폭을 점검합니다.',
                copyEn: 'Review ranking stability and risk impact under coefficient changes.',
              },
              {
                ko: '신뢰도/불확실성',
                en: 'Confidence',
                copyKo: 'sourceCount, 다양성, 최신성, 누락 데이터 경고를 함께 봅니다.',
                copyEn: 'Review source count, diversity, recency, and missing data warnings.',
              },
              {
                ko: '수동 검수 루프',
                en: 'Manual review',
                copyKo: '이상치는 보정하지 않고 analyst note와 flag로 분리합니다.',
                copyEn: 'Outliers are flagged with analyst notes instead of silently adjusted.',
              },
            ].map((item) => (
              <article
                key={item.en}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
              >
                <h3 className="text-sm font-black text-slate-950">
                  <LangText en={item.en} ko={item.ko} />
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  <LangText en={item.copyEn} ko={item.copyKo} />
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              <LangText en="Subscriber categories" ko="구독자 리서치 카테고리" />
            </p>
            <h2 className="mt-2 text-2xl font-black">
              <LangText
                en="What Early Access subscriber research is designed to unlock"
                ko="Early Access 구독자에게 열리는 심층 카테고리"
              />
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              <LangText
                en="Subscriber category access is currently shown as a beta preview. Subscription plans will be validated during Early Access."
                ko="현재 카테고리 잠금 구조는 베타 preview입니다. 구체적인 요금 정책과 구독 플랜은 Early Access 기간에 검증됩니다."
              />
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subscriberFeatures.map((feature) => (
              <article
                key={feature.titleEn}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                  <LangText en="Subscriber Research" ko="구독자 리서치" />
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  <LangText en={feature.titleEn} ko={feature.titleKo} />
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  <LangText en={feature.descriptionEn} ko={feature.descriptionKo} />
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              <LangText en="Category unlock preview" ko="카테고리 unlock 미리보기" />
            </p>
            <h2 className="mt-2 text-2xl font-black">
              <LangText
                en="Free Preview / FANDEX Plus / FANDEX Pro"
                ko="Free Preview / FANDEX Plus / FANDEX Pro"
              />
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              <LangText
                en="Paid access is not live yet. These cards show the planned Free, Plus, and Pro category boundaries without checkout, login, or subscription checks."
                ko="결제 기능은 아직 활성화되어 있지 않습니다. 아래 카드는 checkout, 로그인, 구독 상태 확인 없이 Free, Plus, Pro 카테고리 경계를 보여주는 preview입니다."
              />
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {planPreview.map((plan) => (
              <article
                key={plan.nameEn}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <h3 className="text-xl font-black text-slate-950">
                  <LangText en={plan.nameEn} ko={plan.nameKo} />
                </h3>
                <p className="mt-3 w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                  <LangText en={plan.unlockEn} ko={plan.unlockKo} />
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  <LangText en={plan.descriptionEn} ko={plan.descriptionKo} />
                </p>
                <ul className="mt-4 grid gap-2">
                  {plan.items.map((item) => (
                    <li
                      key={item.en}
                      className="rounded-xl border border-white bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm"
                    >
                      <LangText en={item.en} ko={item.ko} />
                    </li>
                  ))}
                </ul>
                <Link
                  href="/#waitlist-form"
                  className="mt-5 inline-flex rounded-full border border-cyan-200 bg-white px-4 py-2 text-xs font-black text-cyan-700 shadow-sm hover:bg-cyan-50"
                >
                  <LangText en="Join Early Access" ko="Early Access 신청하기" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              <LangText en="Example research output" ko="리서치 결과물 예시" />
            </p>
            <h2 className="mt-2 text-2xl font-black">
              <LangText en="What changes after the free preview" ko="무료 미리보기 이후 달라지는 것" />
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {exampleOutputs.map((output) => (
              <article
                key={output.titleEn}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <h3 className="text-lg font-black text-slate-950">
                  <LangText en={output.titleEn} ko={output.titleKo} />
                </h3>
                <ResearchExampleRow
                label={<LangText en="Free preview shows" ko="무료 미리보기" />}
                  value={<LangText en={output.freePreviewEn} ko={output.freePreviewKo} />}
                />
                <ResearchExampleRow
                label={<LangText en="Subscriber research unlocks" ko="구독자 리서치 제공" />}
                  value={<LangText en={output.subscriberUnlockEn} ko={output.subscriberUnlockKo} />}
                />
                <ResearchExampleRow
                label={<LangText en="Why it matters" ko="활용 포인트" />}
                  value={<LangText en={output.whyItMattersEn} ko={output.whyItMattersKo} />}
                />
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold leading-6 text-slate-500">
            <LangText
              en="FANDEX Subscriber Research is an experimental entertainment research product. It is not financial advice or an investment product. AI interpretation and subscriber reports are planned Early Access features. Data coverage and signal logic may change during beta."
              ko="FANDEX는 실험 단계의 엔터테인먼트 리서치 지표입니다. 금융 조언이나 투자 상품이 아니며, AI 해석과 구독자 리포트는 Early Access 단계에서 검증되는 기능입니다. 베타 기간 동안 데이터 범위와 산출 로직은 변경될 수 있습니다."
            />
          </p>
        </section>
      </section>
    </main>
  );
}

function ResearchExampleRow({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-600">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function LangText({ ko, en }: { ko: string; en: string }) {
  return (
    <>
      <span className="inline [html[data-language='en']_&]:hidden">{ko}</span>
      <span className="hidden [html[data-language='en']_&]:inline">{en}</span>
    </>
  );
}
