import Link from 'next/link';
import {
  getMethodologyFormulaSummary,
  getMethodologyVariableDefinitions,
  type ArtistIndexCoverageStatus,
  type ArtistIndexDataStatus,
  type ArtistIndexConfidenceLevel,
} from '../data/v4/charts/artistIndexChartData';
import { FANDEX_METRIC_DEFINITIONS } from '../data/v4/metrics';

const disclaimer =
  'FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가 아닙니다.';

const coverageStatusDescriptions: Array<{
  status: ArtistIndexCoverageStatus;
  label: string;
  description: string;
}> = [
  {
    status: 'tracked',
    label: '지속 추적',
    description: '상대적으로 가장 안정적으로 추적 중인 아티스트입니다.',
  },
  {
    status: 'partial',
    label: '일부 반영',
    description: '일부 지표만 추적 중이거나 확장 중인 아티스트입니다.',
  },
  {
    status: 'preview',
    label: '미리보기',
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
    label: '에디토리얼 시드',
    description: '현재 FANDEX 내부 미리보기 기준으로 구성한 시드 데이터입니다.',
  },
  {
    status: 'verified_manual',
    label: '수동 검증',
    description: '수동 검증 데이터가 연결될 때 사용할 수 있는 상태입니다.',
  },
  {
    status: 'partial_public_signal',
    label: '일부 공개 지표',
    description: '일부 공개 신호만 반영된 상태입니다.',
  },
  {
    status: 'preview_only',
    label: '미리보기 전용',
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
    label: '높음',
    description: '데이터 신뢰도 metadata가 충분히 쌓였을 때 사용할 수 있는 단계입니다.',
  },
  {
    level: 'medium',
    label: '중간',
    description: '현재 지속 추적 아티스트 다수에 적용된 중간 신뢰도 단계입니다.',
  },
  {
    level: 'low',
    label: '낮음',
    description: '일부 반영 또는 미리보기 데이터처럼 보수적으로 해석해야 하는 단계입니다.',
  },
];

const ctaLinks = [
  { href: '/charts', label: '주가 차트 보기' },
  { href: '/artists', label: '아티스트 보기' },
  { href: '/compare', label: '여러 아티스트 비교' },
  { href: '/coverage', label: '커버리지 보기' },
];

const metricCategoryLabels: Record<string, string> = {
  content: '콘텐츠',
  attention: '관심',
  community: '팬덤',
  commercial: '브랜드',
  activity: '활동',
  quality: '보정',
};

function formatWeight(value: number) {
  return `${value}%`;
}

export default function MethodologyPage() {
  const formula = getMethodologyFormulaSummary();
  const variableDefinitions = getMethodologyVariableDefinitions();
  const metricDefinitions = FANDEX_METRIC_DEFINITIONS;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070A12] dark:text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
                FANDEX 산출방식
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
            쉽게 읽기
          </p>
          <h2 className="mt-2 text-2xl font-black">FANDEX 주가는 이렇게 읽습니다</h2>
          <p className="mt-4 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
            FANDEX 주가는 하나의 숫자로 아티스트의 흐름을 단정하는 점수가
            아닙니다. 음원/음반, SNS/팬덤, 컴백/활동, 브랜드 적합도 같은
            여러 신호를 같은 기준으로 정리해 흐름을 보기 쉽게 만든 리서치
            지수입니다.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <FormulaCard
              title="1단계"
              copy="아티스트별 활동/반응 신호를 변수별로 정리합니다."
            />
            <FormulaCard
              title="2단계"
              copy="변수별 흐름에 가중치를 적용해 같은 기준으로 비교합니다."
            />
            <FormulaCard
              title="3단계"
              copy="데이터 신뢰도와 예외적 변동을 조정해 FANDEX 주가형 지수로 보여줍니다."
            />
          </div>
          <p className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-7 text-yellow-900">
            공식 순위나 투자 판단용 지표가 아닙니다. 같은 기준으로 흐름을
            비교하기 위한 FANDEX 내부 리서치 지수입니다.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            개념식
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
            <FormulaCard title="기준값" copy={formula.basePoint} />
            <FormulaCard title="변수 점수" copy={formula.variableScore} />
            <FormulaCard title="가중치" copy={formula.weight} />
            <FormulaCard title="조정 신호" copy={formula.riskAdjustment} />
            <FormulaCard title="최종값" copy={formula.finalValue} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              산출 변수
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

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              metric schema
            </p>
            <h2 className="mt-2 text-2xl font-black">FANDEX 지표 구조</h2>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              FANDEX는 여러 반응 지표를 합쳐 아티스트의 흐름을 봅니다. 각
              지표는 같은 비중이 아니라, MVP 기준 기본 반영 비중이 다릅니다.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">지표명</th>
                  <th className="px-4 py-3">설명</th>
                  <th className="px-4 py-3">기본 반영 비중</th>
                  <th className="px-4 py-3">카테고리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {metricDefinitions.map((metric) => (
                  <tr key={metric.key} className="font-bold text-slate-700 dark:text-slate-300">
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-950 dark:text-white">
                        {metric.label}
                      </p>
                      <p className="mt-1 font-mono text-xs text-cyan-700 dark:text-cyan-300">
                        {metric.key}
                      </p>
                    </td>
                    <td className="px-4 py-4 leading-6">{metric.description}</td>
                    <td className="px-4 py-4 font-mono font-black">
                      {formatWeight(metric.defaultWeight)}
                    </td>
                    <td className="px-4 py-4">
                      {metricCategoryLabels[metric.category] ?? metric.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
            이 비중은 MVP 기준이며, 실제 데이터가 쌓이면 조정될 수 있습니다.
          </p>
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
              한계
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
                현재 차트는 에디토리얼 시드 / 미리보기 데이터 기반입니다.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                현재 값은 분석용 지수이며 공식 순위나 투자정보가 아닙니다.
              </li>
            </ul>
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
