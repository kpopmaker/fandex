import Link from 'next/link';

const subscriberFeatures = [
  {
    title: 'AI Interpretation',
    description:
      'Expand free preview signals into AI-assisted summaries that explain why an artist signal matters.',
  },
  {
    title: 'Full Artist Research Brief',
    description:
      'Organize fandom, activity, issue, chart, and brand signals into one research-ready artist brief.',
  },
  {
    title: 'Brand-fit Analysis',
    description:
      'Review collaboration, ambassador, and campaign-fit angles from a marketing perspective.',
  },
  {
    title: 'Issue Risk Analysis',
    description:
      'Interpret controversy, rumor, contract, hiatus, and concentration risk signals before campaigns move.',
  },
  {
    title: 'Artist Comparison Report',
    description:
      'Compare fandom, brand, issue, and momentum signals across artists for positioning decisions.',
  },
  {
    title: 'Weekly FANDEX Report',
    description:
      'Receive a weekly K-pop signal digest with artist watchlists and issue movement commentary.',
  },
  {
    title: 'Watchlist & Signal Commentary',
    description:
      'Track priority artists and understand what changed across public signals week by week.',
  },
];

const planPreview = [
  {
    name: 'Free Preview',
    description: 'For visitors who want a quick signal check after seeing SNS content.',
    items: [
      'Artist quick search',
      'Public ranking snapshot',
      'Issue tone preview',
      'Sample report',
      'Limited signal preview',
    ],
  },
  {
    name: 'FANDEX Plus',
    description: 'For fans, marketers, and industry watchers who need recurring context.',
    items: [
      'AI interpretation',
      'Full artist brief',
      'Weekly FANDEX report',
      'Artist comparison brief',
      'Watchlist commentary',
    ],
  },
  {
    name: 'FANDEX Pro',
    description: 'For brand, campaign, and portfolio research use cases.',
    items: [
      'Brand-fit analysis',
      'Issue risk memo',
      'Portfolio/interview-ready industry brief',
      'Custom artist research request',
      'Campaign angle memo',
    ],
  },
];

const exampleOutputs = [
  {
    title: 'IVE comeback signal brief',
    freePreview: 'Free preview shows artist score, issue tone, and sample signal count.',
    subscriberUnlock:
      'Subscriber research adds comeback timing context, fan attention drivers, and campaign angles.',
    whyItMatters:
      'Marketing teams can decide whether to emphasize anticipation, styling, or fandom activation.',
  },
  {
    title: 'RIIZE brand-fit watch',
    freePreview: 'Free preview shows basic momentum and a balanced issue tone.',
    subscriberUnlock:
      'Subscriber research explains which brand categories match the current artist signal profile.',
    whyItMatters:
      'Brand teams can compare youthful performance fit against broader campaign goals.',
  },
  {
    title: 'NewJeans issue risk context',
    freePreview: 'Free preview highlights watch tone and basic issue concentration.',
    subscriberUnlock:
      'Subscriber research separates repeated headlines from material risk and adds monitoring notes.',
    whyItMatters:
      'Industry watchers can understand whether visibility is useful attention or campaign volatility.',
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
                FANDEX Subscriber Research
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                From quick search to full artist intelligence
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                Free search shows the surface signal. Subscriber research
                explains why the signal matters. FANDEX helps turn K-pop issue,
                fandom, chart, and brand signals into marketing insight.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/#waitlist-form"
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
              >
                Join Early Access
              </Link>
              <Link
                href="/search"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                Try Free Search
              </Link>
              <Link
                href="/sample-report"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                View Sample Report
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Subscriber features
            </p>
            <h2 className="mt-2 text-2xl font-black">
              What Early Access research is designed to unlock
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subscriberFeatures.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                  Subscriber Research
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Plan structure preview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Free Preview / FANDEX Plus / FANDEX Pro
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              No pricing is set yet. Pricing will be validated during Early
              Access after report demand and subscriber use cases are clearer.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {planPreview.map((plan) => (
              <article
                key={plan.name}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <h3 className="text-xl font-black text-slate-950">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {plan.description}
                </p>
                <ul className="mt-4 grid gap-2">
                  {plan.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl border border-white bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Example research output
            </p>
            <h2 className="mt-2 text-2xl font-black">
              What changes after the free preview
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {exampleOutputs.map((output) => (
              <article
                key={output.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <h3 className="text-lg font-black text-slate-950">
                  {output.title}
                </h3>
                <ResearchExampleRow
                  label="Free preview shows"
                  value={output.freePreview}
                />
                <ResearchExampleRow
                  label="Subscriber research unlocks"
                  value={output.subscriberUnlock}
                />
                <ResearchExampleRow
                  label="Why it matters"
                  value={output.whyItMatters}
                />
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold leading-6 text-slate-500">
            FANDEX Subscriber Research is an experimental entertainment research
            product. It is not financial advice or an investment product. AI
            interpretation and subscriber reports are planned Early Access
            features. Data coverage and signal logic may change during beta.
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
  label: string;
  value: string;
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
