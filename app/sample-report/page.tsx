import Link from 'next/link';

const executiveSummary = [
  'Fan attention remains strong around comeback-related signals and short-form content pickup.',
  'Brand-fit momentum is supported by a positive issue tone and stable community response.',
  'Search and news concentration suggest the artist should stay on the weekly watchlist.',
  'Watch area: volatility can rise when news volume concentrates around one repeated topic.',
];

const signalSnapshot = [
  {
    label: 'FANDEX Score',
    value: '82.4',
    detail: 'Sample composite signal',
    tone: 'cyan',
  },
  {
    label: 'Issue Signal',
    value: 'Positive',
    detail: 'Preview tone',
    tone: 'emerald',
  },
  {
    label: 'Brand Momentum',
    value: 'High',
    detail: 'Sample campaign fit',
    tone: 'violet',
  },
  {
    label: 'Fan Attention',
    value: '+18%',
    detail: 'Sample weekly lift',
    tone: 'cyan',
  },
  {
    label: 'Watch Risk',
    value: 'Moderate',
    detail: 'Preview monitoring level',
    tone: 'blue',
  },
];

const issueSignals = [
  {
    group: 'Positive signals',
    title: 'Comeback teaser conversation keeps shareable content momentum high',
    meaning:
      'Creative assets can lean into anticipation, styling details, and fandom participation.',
  },
  {
    group: 'Positive signals',
    title: 'Brand mention quality remains aligned with polished performance image',
    meaning:
      'Collaboration messaging can emphasize premium visuals and confident group identity.',
  },
  {
    group: 'Watch signals',
    title: 'News volume is concentrated around a small number of repeated angles',
    meaning:
      'Campaign teams should monitor whether attention broadens or becomes overly narrow.',
  },
  {
    group: 'Neutral/background signals',
    title: 'Chart and community references remain steady without a sharp breakout',
    meaning:
      'Baseline demand is stable, but the next content beat may need a clear trigger.',
  },
];

const marketingImplications = [
  {
    title: 'Content angle',
    copy: 'Prioritize comeback proof points, visual identity, and short-form hooks that fans can repeat.',
  },
  {
    title: 'Brand collaboration angle',
    copy: 'Position IVE around polished confidence, fashion-forward visuals, and broad audience safety.',
  },
  {
    title: 'Community activation angle',
    copy: 'Use fan participation prompts around teaser milestones, ranking moments, and member-led clips.',
  },
  {
    title: 'Risk monitoring angle',
    copy: 'Track topic concentration, repeated headlines, and watch terms before amplifying paid media.',
  },
];

const comparisonRows = [
  {
    metric: 'Fan attention',
    ive: 'High',
    newJeans: 'High',
    riize: 'Rising',
  },
  {
    metric: 'Issue tone',
    ive: 'Positive',
    newJeans: 'Watch',
    riize: 'Balanced',
  },
  {
    metric: 'Brand fit',
    ive: 'Premium visual',
    newJeans: 'Lifestyle culture',
    riize: 'Youth performance',
  },
  {
    metric: 'Volatility watch',
    ive: 'Moderate',
    newJeans: 'Elevated',
    riize: 'Low',
  },
];

const paidReportItems = [
  'Weekly artist watchlist',
  'Comeback / issue / brand signal summary',
  'Artist comparison brief',
  'Marketing insight memo',
  'Signal change commentary',
];

export default function SampleReportPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
                <LangText en="FANDEX Sample Report" ko="FANDEX 샘플 리포트" />
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                <LangText
                  en="Weekly K-pop Signal Report Preview"
                  ko="구독자 리서치 결과물 샘플"
                />
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                <LangText
                  en="A preview of how FANDEX translates K-pop market signals into entertainment marketing insight. This is a sample of subscriber research output; free users only see a limited preview, and full category breakdown is reserved for subscriber research."
                  ko="이 페이지는 FANDEX 구독자 리서치 결과물의 샘플입니다. 무료 사용자는 제한된 미리보기만 확인할 수 있으며, 전체 카테고리 분석과 AI 해석은 구독자 리서치에서 제공됩니다."
                />
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/#early-access"
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
              >
                <LangText en="Join Early Access" ko="Early Access 신청하기" />
              </Link>
              <Link
                href="/research"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                <LangText en="See Paid Research Categories" ko="유료 리서치 카테고리 보기" />
              </Link>
              <Link
                href="/"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                <LangText en="Home" ko="홈" />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Executive Summary
            </p>
            <h2 className="mt-2 text-2xl font-black">IVE Sample Signal Brief</h2>
            <ul className="mt-5 grid gap-3">
              {executiveSummary.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Signal Snapshot
            </p>
            <h2 className="mt-2 text-2xl font-black">Sample weekly readout</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {signalSnapshot.map((signal) => (
                <SignalCard key={signal.label} {...signal} />
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            Issue & News Signals
          </p>
          <h2 className="mt-2 text-2xl font-black">Marketing signal notes</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {issueSignals.map((signal) => (
              <article
                key={signal.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                  {signal.group}
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  {signal.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {signal.meaning}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Marketing Implications
            </p>
            <h2 className="mt-2 text-2xl font-black">How the signal can be used</h2>
            <div className="mt-5 grid gap-3">
              {marketingImplications.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <h3 className="text-sm font-black text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.copy}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Artist Comparison Preview
            </p>
            <h2 className="mt-2 text-2xl font-black">IVE vs NewJeans vs RIIZE</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-2">Metric</th>
                    <th className="px-3 py-2">IVE</th>
                    <th className="px-3 py-2">NewJeans</th>
                    <th className="px-3 py-2">RIIZE</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.metric} className="bg-slate-50">
                      <td className="rounded-l-2xl px-3 py-3 font-black text-slate-700">
                        {row.metric}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-600">
                        {row.ive}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-600">
                        {row.newJeans}
                      </td>
                      <td className="rounded-r-2xl px-3 py-3 font-bold text-slate-600">
                        {row.riize}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                <LangText en="Early Access Report" ko="Early Access 리포트" />
              </p>
              <h2 className="mt-2 text-2xl font-black">
                <LangText
                  en="Subscriber research category examples"
                  ko="구독자 리서치 카테고리 예시"
                />
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <LangText
                  en="This sample shows only part of the planned subscriber research output. Free users see a limited preview; full category breakdowns are reserved for subscriber research."
                  ko="이 샘플은 예정된 구독자 리서치 결과물의 일부 예시입니다. 무료 사용자는 제한된 미리보기만 볼 수 있고, 전체 카테고리 분석은 구독자 리서치에서 제공됩니다."
                />
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {paidReportItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                Early Access
              </p>
              <h2 className="mt-2 text-2xl font-black">
                <LangText en="Want this report every week?" ko="이 리포트를 매주 받아보고 싶다면" />
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                <LangText
                  en="Join FANDEX Early Access to receive weekly K-pop signal briefs, artist watchlists, and marketing insight memos as the report format is validated."
                  ko="FANDEX Early Access에 신청하면 주간 K-pop 신호 브리프, 관심 아티스트 watchlist, 마케팅 인사이트 메모 형식의 구독자 리서치를 검증 단계에서 확인할 수 있습니다."
                />
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/research"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
              >
                <LangText en="See Paid Research Categories" ko="유료 리서치 카테고리 보기" />
              </Link>
              <Link
                href="/search"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                <LangText en="Try Limited Free Search" ko="제한된 무료 검색 해보기" />
              </Link>
              <Link
                href="/#waitlist-form"
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
              >
                <LangText en="Join Early Access" ko="Early Access 신청하기" />
              </Link>
              <Link
                href="/"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                <LangText en="Back to Dashboard" ko="대시보드로 돌아가기" />
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold leading-6 text-slate-500">
            <LangText
              en="FANDEX is an experimental entertainment research index. It is not financial advice or an investment product. Sample values are for product preview and may differ from future live data. Signal logic and data coverage may change during Early Access."
              ko="FANDEX는 실험 단계의 엔터테인먼트 리서치 지표입니다. 금융 조언이나 투자 상품이 아니며, 샘플 값은 제품 preview용입니다. Early Access 기간 동안 데이터 범위와 산출 로직은 변경될 수 있습니다."
            />
          </p>
        </section>
      </section>
    </main>
  );
}

function SignalCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  const toneClass =
    {
      cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      violet: 'bg-violet-50 text-violet-700 border-violet-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
    }[tone] ?? 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{detail}</p>
    </article>
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
