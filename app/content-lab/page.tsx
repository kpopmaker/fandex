import Link from 'next/link';
import { artistUniverse } from '../data/v3/artistUniverse';
import { getArtistRankingRows } from '../data/v3/artistRanking';
import { trendingIssues } from '../data/v3/mockData';

const platforms = [
  'Instagram Reels',
  'YouTube Shorts',
  'Instagram Feed',
  'Threads',
  'X',
];

const contentGoals = [
  'Educate',
  'Trend reaction',
  'Low-point analysis',
  'Fandom engagement',
  'Controversy summary',
  'Comeback momentum',
];

const workflowStates = ['Draft', 'Needs review', 'Approved', 'Ready to export'];

const roadmapItems = [
  'Image generation',
  'Video rendering',
  'Figma/Photoshop integration',
  'Premiere/CapCut workflow',
  'YouTube/Instagram/Threads/X upload after approval',
];

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default function ContentLabPage() {
  const rankedArtists = getArtistRankingRows();
  const selectedArtist = rankedArtists[0];
  const selectedIssue = trendingIssues[0];
  const relatedArtistNames = selectedIssue.relatedArtistIds
    .map((artistId) => artistUniverse.find((artist) => artist.id === artistId))
    .filter((artist): artist is NonNullable<typeof artist> => Boolean(artist))
    .map((artist) => artist.nameEn);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
                CONTENT LAB
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
                AI SNS Content Studio
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
                Turn FANDEX artist market signals and issue impact data into
                content ideas, captions, scripts, visual direction, and
                upload-ready planning checklists.
              </p>
              <p className="mt-4 max-w-3xl rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm font-bold leading-6 text-yellow-100">
                Private/admin planning workspace. This page is intentionally
                hidden from public navigation and is for internal content
                planning review only.
              </p>
              <p className="mt-4 max-w-3xl rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm font-bold leading-6 text-cyan-100">
                This is a mock planning workflow. FANDEX does not upload,
                publish, or connect to external creative or SNS platforms yet.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/compare?artists=aespa,ive,riize"
                className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-200"
              >
                Compare artists
              </Link>
              <Link
                href="/signals"
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:border-cyan-300 hover:text-cyan-300"
              >
                View issue signals
              </Link>
              <Link
                href="/"
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:border-cyan-300 hover:text-cyan-300"
              >
                Back to market home
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                Content brief builder
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Configure a mock content plan
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                These controls are static in the MVP. They show the workflow
                FANDEX will automate later after user approval.
              </p>
            </div>

            <div className="grid gap-4">
              <MockSelect
                label="Artist"
                value={`${selectedArtist.nameEn} (${selectedArtist.ticker})`}
                options={rankedArtists.slice(0, 5).map((artist) => artist.nameEn)}
              />
              <MockSelect
                label="Issue or market signal"
                value={selectedIssue.headline}
                options={trendingIssues.slice(0, 5).map((issue) => issue.headline)}
              />
              <DataSignal
                label="Related artists"
                value={relatedArtistNames.join(', ') || 'Market-wide'}
              />
              <MockSegment label="Platform" options={platforms} active="Instagram Reels" />
              <MockSegment label="Content goal" options={contentGoals} active="Comeback momentum" />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                Generated preview
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Draft content output
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Mock-generated from FANDEX data. Review before export or upload.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <OutputCard
                label="Content angle"
                value={`${selectedArtist.nameEn}'s comeback signal is gaining momentum across price, search, and fandom reaction.`}
              />
              <OutputCard
                label="Hook"
                value={`Why ${selectedArtist.ticker} is suddenly moving on FANDEX today.`}
              />
              <OutputCard
                label="Caption"
                value={`FANDEX shows ${selectedArtist.nameEn} with ${formatPercent(selectedArtist.changeRate)} simulated price movement and ${formatLargeNumber(selectedArtist.volume)} attention volume. This is a market signal to watch, not financial advice.`}
              />
              <OutputCard
                label="Visual direction"
                value="Fast dashboard intro, ticker overlay, issue headline card, before/after price movement, and closing question for fans."
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <OutputCard
                label="Short-form script"
                value={`Open with the issue headline. Show ${selectedArtist.nameEn}'s FANDEX price movement. Explain that search and SNS reaction may have influenced the signal. End with: Which factor matters most right now?`}
              />
              <OutputCard
                label="Hashtags"
                value={`#${selectedArtist.ticker} #FANDEX #KpopSignals #${selectedIssue.category.replaceAll(' ', '')} #ContentStrategy`}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                Upload checklist
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {[
                  'Verify artist and issue context',
                  'Confirm simulated-market caveat',
                  'Review caption tone',
                  'Add platform-specific thumbnail',
                  'Approve final script',
                  'Export manually',
                ].map((item) => (
                  <div key={item} className="rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Approval workflow
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Human review before anything leaves FANDEX
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {workflowStates.map((state, index) => (
              <div
                key={state}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <p className="text-xs font-black text-cyan-300">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-black">{state}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {state === 'Draft'
                    ? 'FANDEX prepares a first plan from market and issue data.'
                    : state === 'Needs review'
                      ? 'A user checks accuracy, tone, caveats, and platform fit.'
                      : state === 'Approved'
                        ? 'The reviewed content is cleared for manual export.'
                        : 'Future automation starts only after explicit approval.'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Data connection
            </p>
            <h2 className="mt-2 text-2xl font-black">
              How FANDEX feeds content ideas
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The content brief is grounded in FANDEX signals so creators can
              explain what changed, why it matters, and what fans can discuss.
            </p>

            <div className="mt-5 grid gap-3">
              <DataSignal label="Artist market signal" value={`${selectedArtist.ticker} ${formatPercent(selectedArtist.changeRate)}`} />
              <DataSignal label="Issue impact" value={selectedIssue.impact} />
              <DataSignal label="Ranking movement" value={`Rank #${selectedArtist.rank}`} />
              <DataSignal label="Fandom sentiment" value={selectedIssue.issueScore >= 85 ? 'Strong reaction' : 'Active reaction'} />
              <DataSignal label="Suggested content format" value="Short-form explainer plus carousel recap" />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Automation roadmap
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Planned integrations
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              These are placeholders only. No external creative or upload APIs
              are connected in this MVP.
            </p>

            <div className="mt-5 grid gap-3">
              {roadmapItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4"
                >
                  <span className="font-bold text-slate-200">{item}</span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">
                    Planned
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                Next action
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Start with signals, then draft content.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-100">
                Compare artists and review issue impact before turning insights
                into platform-specific content.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/compare?artists=aespa,ive,riize"
                className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200"
              >
                Compare artists
              </Link>
              <Link
                href="/signals"
                className="rounded-full border border-cyan-300/40 px-5 py-3 text-sm font-black text-cyan-100 hover:border-cyan-200"
              >
                View signals
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function MockSelect({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black">{value}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.slice(0, 4).map((option) => (
          <span
            key={option}
            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-400"
          >
            {option}
          </span>
        ))}
      </div>
    </div>
  );
}

function MockSegment({
  label,
  options,
  active,
}: {
  label: string;
  options: string[];
  active: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <span
            key={option}
            className={
              option === active
                ? 'rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-slate-950'
                : 'rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-400'
            }
          >
            {option}
          </span>
        ))}
      </div>
    </div>
  );
}

function OutputCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{value}</p>
    </article>
  );
}

function DataSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}
