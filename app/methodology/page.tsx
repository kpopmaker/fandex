import Link from 'next/link';
import {
  getMethodologyFormulaSummary,
  getMethodologyVariableDefinitions,
  type ArtistIndexCoverageStatus,
  type ArtistIndexDataStatus,
  type ArtistIndexConfidenceLevel,
} from '../data/v4/charts/artistIndexChartData';

const disclaimer =
  'FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가 아닙니다.';

const coverageStatusDescriptions: Array<{
  status: ArtistIndexCoverageStatus;
  label: string;
  description: string;
}> = [
  {
    status: 'tracked',
    label: 'tracked',
    description: '상대적으로 가장 안정적으로 추적 중인 아티스트입니다.',
  },
  {
    status: 'partial',
    label: 'partial',
    description: '일부 지표만 추적 중이거나 확장 중인 아티스트입니다.',
  },
  {
    status: 'preview',
    label: 'preview',
    description: '확장 예정 또는 미리보기 상태의 아티스트입니다.',
  },
];

const dataStatusDescriptions: Array<{
  status: ArtistIndexDataStatus;
  label: string;
  description: string;
}> = [
  {
    status: 'editorial_seed',
    label: 'editorial_seed',
    description: '현재 FANDEX 내부 preview 기준으로 구성한 seed 데이터입니다.',
  },
  {
    status: 'verified_manual',
    label: 'verified_manual',
    description: '수동 검증 데이터가 연결될 때 사용할 수 있는 상태입니다.',
  },
  {
    status: 'partial_public_signal',
    label: 'partial_public_signal',
    description: '일부 공개 신호만 반영된 상태입니다.',
  },
  {
    status: 'preview_only',
    label: 'preview_only',
    description: '확장 후보 또는 미리보기 성격의 데이터 상태입니다.',
  },
];

const confidenceDescriptions: Array<{
  level: ArtistIndexConfidenceLevel;
  label: string;
  description: string;
}> = [
  {
    level: 'high',
    label: 'high',
    description: '데이터 신뢰도 metadata가 충분히 쌓였을 때 사용할 수 있는 단계입니다.',
  },
  {
    level: 'medium',
    label: 'medium',
    description: '현재 tracked 아티스트 다수에 적용된 중간 신뢰도 단계입니다.',
  },
  {
    level: 'low',
    label: 'low',
    description: 'partial 또는 preview 데이터처럼 보수적으로 해석해야 하는 단계입니다.',
  },
];

const chartInterpretationItems = [
  {
    title: '/artists/[artistId] 6개월 FANDEX 주가 차트',
    copy: '단일 아티스트의 최근 6개 시점 FANDEX 주가형 지수 흐름을 보여줍니다.',
  },
  {
    title: '/artists/[artistId] 변수 선택 차트',
    copy: '선택한 변수의 raw/weighted point 흐름을 보여주며 전체 FANDEX 주가와 같은 값이 아닙니다.',
  },
  {
    title: '/compare 여러 아티스트 비교 차트',
    copy: '2~5명 아티스트의 동일 기간 FANDEX 주가 흐름을 함께 비교합니다.',
  },
  {
    title: '/compare 변수별 비교 차트',
    copy: '선택 변수 1~4개에 대해 변수별 compact chart를 분리해 보여줍니다.',
  },
];

const nextSteps = [
  '실제 공개 지표 수집',
  '데이터 업데이트 주기 정의',
  '관리자 데이터 입력 UI',
  '자동 수집 pipeline',
  '신뢰도 metadata 고도화',
];

const ctaLinks = [
  { href: '/charts', label: '주가 차트 보기' },
  { href: '/artists', label: '아티스트 보기' },
  { href: '/compare', label: '여러 아티스트 비교' },
  { href: '/coverage', label: '커버리지 보기' },
];

export default function MethodologyPage() {
  const formula = getMethodologyFormulaSummary();
  const variableDefinitions = getMethodologyVariableDefinitions();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070A12] dark:text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
                FANDEX Methodology
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                K-pop 아티스트 활동성과 반응 지표를 주가형 지수로 해석하는 방식
              </h1>
              <p className="mt-5 max-w-3xl rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                {disclaimer}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {ctaLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            산출 공식 개념
          </p>
          <h2 className="mt-2 text-2xl font-black">FANDEX 주가형 지수 산출방식</h2>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              개념식
            </p>
            <p className="mt-3 break-words font-mono text-lg font-black text-slate-950 dark:text-white">
              {formula.conceptFormula}
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <FormulaCard title="Base Point" copy={formula.basePoint} />
            <FormulaCard title="Variable Score" copy={formula.variableScore} />
            <FormulaCard title="Weight" copy={formula.weight} />
            <FormulaCard title="Risk Adjustment" copy={formula.riskAdjustment} />
            <FormulaCard title="최종값" copy={formula.finalValue} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              Variables
            </p>
            <h2 className="mt-2 text-2xl font-black">7개 산출 변수</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              각 변수는 FANDEX 주가형 지수를 구성하는 개별 흐름입니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {variableDefinitions.map((variable) => (
              <article
                key={variable.variableKey}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <p className="font-mono text-xs font-black text-cyan-700 dark:text-cyan-300">
                  {variable.variableKey}
                </p>
                <h3 className="mt-2 text-xl font-black">{variable.displayName}</h3>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  {variable.weightLabel}
                </p>
                <InfoBlock label="해석 대상" value={variable.description} />
                <InfoBlock label="높아질 때" value={variable.higherMeaning} />
                <InfoBlock label="낮아질 때" value={variable.lowerMeaning} />
                <InfoBlock label="주의사항" value={variable.caution} />
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <DefinitionSection
            eyebrow="coverageStatus"
            title="커버리지 상태"
            items={coverageStatusDescriptions.map((item) => ({
              label: item.label,
              copy: item.description,
            }))}
          />
          <DefinitionSection
            eyebrow="dataStatus"
            title="데이터 상태"
            items={dataStatusDescriptions.map((item) => ({
              label: item.label,
              copy: item.description,
            }))}
          />
          <DefinitionSection
            eyebrow="confidenceLevel"
            title="신뢰도 단계"
            items={confidenceDescriptions.map((item) => ({
              label: item.label,
              copy: item.description,
            }))}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            Chart Reading
          </p>
          <h2 className="mt-2 text-2xl font-black">주가 차트 해석 방법</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {chartInterpretationItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <h3 className="font-black">{item.title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
            6개월 변화 pt는 방향성 확인용이며, coverageStatus와
            confidenceLevel을 함께 확인해야 합니다.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              Limits
            </p>
            <h2 className="mt-2 text-2xl font-black">한계</h2>
            <ul className="mt-5 grid gap-3 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                모든 K-pop 아티스트를 대표하지 않습니다.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                현재 차트는 editorial seed / preview 기반입니다.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                현재 값은 분석용 지수이며 공식 순위나 투자정보가 아닙니다.
              </li>
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              Next Steps
            </p>
            <h2 className="mt-2 text-2xl font-black">다음 단계</h2>
            <ul className="mt-5 grid gap-3 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              {nextSteps.map((step) => (
                <li
                  key={step}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  {step}
                </li>
              ))}
            </ul>
          </section>
        </section>
      </section>
    </main>
  );
}

function FormulaCard({ copy, title }: { copy: string; title: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
        {copy}
      </p>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
        {value}
      </p>
    </div>
  );
}

function DefinitionSection({
  eyebrow,
  items,
  title,
}: {
  eyebrow: string;
  items: Array<{ label: string; copy: string }>;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p className="font-mono text-sm font-black text-slate-950 dark:text-white">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
              {item.copy}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
