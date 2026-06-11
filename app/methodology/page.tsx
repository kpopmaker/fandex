import Link from 'next/link';
import { factorDefinitions, pricePresets } from '../data/mockPrices';

const processSteps = [
  {
    title: '1. Raw Signal 수집',
    description:
      '음원, 앨범, 유튜브, SNS, 검색, 뉴스, 해외 반응, 팬덤 플랫폼, 소속사 데이터를 수집합니다.',
  },
  {
    title: '2. Factor Score 정규화',
    description:
      '서로 단위가 다른 데이터를 0~100점 사이의 요소 점수로 변환합니다.',
  },
  {
    title: '3. Weighted Score 계산',
    description:
      '요소별 기본 가중치 또는 사용자가 선택한 커스텀 가중치로 종합 점수를 계산합니다.',
  },
  {
    title: '4. FANDEX Price 변환',
    description:
      '종합 점수를 주식 가격처럼 보이는 FDX Price로 변환합니다.',
  },
  {
    title: '5. Market Index 반영',
    description:
      '개별 아티스트 가격과 Fan Cap을 기반으로 KMI Composite와 섹터 지수를 계산합니다.',
  },
];

const fastSignals = [
  '유튜브 조회수 증가량',
  '유튜브 좋아요·댓글 증가량',
  '네이버 뉴스 신규 기사량',
  '블로그·카페 신규 언급량',
  '공식 SNS 반응',
  '팬채널·바이럴 반응',
  '해외 뉴스 언급량',
];

const slowSignals = [
  '초동 음반 판매량',
  '음원 차트 순위',
  '네이버 데이터랩 검색 트렌드',
  '음악방송 수상 이력',
  '팬 플랫폼 멤버십',
  '소속사 매출',
  '소속사 영업이익',
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
          >
            ← FANDEX 홈으로
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
            METHODOLOGY
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            FANDEX Price 산출 방식
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
            FANDEX는 K-pop 아티스트의 현재 시장 반응을 여러 데이터 요소로
            나누어 계산하고, 이를 주식 시세처럼 보이는 가격과 등락률로
            변환합니다.
          </p>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <HeroFormulaCard
            title="FANDEX Score"
            formula="Σ Factor Score × Weight"
            description="각 요소 점수에 가중치를 곱해 종합 점수를 계산합니다."
          />

          <HeroFormulaCard
            title="FANDEX Price"
            formula="100 × exp((Score - 50) / 50)"
            description="0~100점 종합 점수를 주식 가격처럼 보이는 FDX Price로 변환합니다."
          />

          <HeroFormulaCard
            title="Fan Cap"
            formula="Price × Synthetic Float"
            description="아티스트의 가상 팬덤 시가총액을 계산합니다."
          />
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-2xl font-black">1. FANDEX 구성요소</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            기본 FANDEX Price는 아래 9개 요소를 모두 반영합니다. 각 요소는
            0~100점으로 정규화된 뒤 기본 가중치에 따라 종합 점수에 반영됩니다.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {factorDefinitions.map((factor) => (
              <div
                key={factor.key}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-white">{factor.label}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {factor.speed === 'fast' ? '빠른 신호' : '느린 신호'}
                    </p>
                  </div>

                  <p className="font-mono text-2xl font-black text-cyan-300">
                    {factor.defaultWeight}%
                  </p>
                </div>

                <p className="text-sm leading-6 text-slate-400">
                  {factor.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
            <h2 className="text-2xl font-black">2. 빠른 신호</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              빠른 신호는 가격의 단기 등락률과 거래량에 강하게 반영됩니다.
              컴백, 티저, MV 공개, 이슈 발생처럼 즉각 반응이 생기는 데이터를
              감지합니다.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {fastSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-200"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
            <h2 className="text-2xl font-black">3. 느린 신호</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              느린 신호는 아티스트의 장기적인 팬덤 가치와 안정성에 반영됩니다.
              단기 급등보다는 종목의 체급과 기본 가치를 설명하는 데이터입니다.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {slowSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-2xl font-black">4. Custom Index Builder</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            사용자는 모든 요소가 반영된 기본 FANDEX Price뿐 아니라, 특정
            요소를 켜고 끄면서 자신만의 커스텀 주가를 만들 수 있습니다.
            선택되지 않은 요소의 가중치는 0이 되고, 남은 요소들의 가중치는
            다시 100% 기준으로 재조정됩니다.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-sm font-bold text-slate-300">
              Custom Score 계산 방식
            </p>

            <div className="mt-3 rounded-xl bg-black/30 p-4 font-mono text-sm leading-7 text-cyan-200">
              <p>1. 사용자가 선택한 요소만 남긴다.</p>
              <p>2. 선택되지 않은 요소의 weight는 0으로 만든다.</p>
              <p>3. 남은 weight의 합을 100%로 재조정한다.</p>
              <p>4. 재조정된 weight로 Custom Score를 계산한다.</p>
              <p>5. Custom Score를 Custom Price로 변환한다.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(pricePresets).map(([presetKey, preset]) => (
              <div
                key={presetKey}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <h3 className="font-black text-white">{preset.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {preset.description}
                </p>

                <p className="mt-3 text-xs font-bold text-cyan-300">
                  사용 요소 {preset.enabledFactors.length}개
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-2xl font-black">5. KMI Composite</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            KMI Composite는 K-pop Market Index Composite의 약자로, FANDEX에
            등록된 아티스트들의 전체 시장 흐름을 보여주는 종합지수입니다.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <FormulaBlock
              label="Synthetic Float"
              formula="아티스트 체급별 가상 유통량"
            />
            <FormulaBlock
              label="Fan Cap"
              formula="FANDEX Price × Synthetic Float"
            />
            <FormulaBlock
              label="KMI Composite"
              formula="Σ Fan Cap / Divisor"
            />
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-400">
            대형 아티스트는 Synthetic Float가 커서 Fan Cap이 안정적으로 크게
            형성되고, 신인 아티스트는 Fan Cap은 작지만 등락률과 모멘텀이 크게
            움직이는 구조를 가집니다.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-2xl font-black">6. 계산 프로세스</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {processSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <h3 className="font-black text-cyan-300">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-6">
          <h2 className="text-2xl font-black text-yellow-200">
            현재 버전의 한계
          </h2>

          <p className="mt-3 text-sm leading-6 text-yellow-100/80">
            현재 FANDEX v2는 실제 API를 연결하기 전 단계입니다. 지금 보이는
            가격, 거래량, 점수는 mock 엔진으로 생성된 예시 데이터입니다.
            다음 단계에서 네이버 검색 API, YouTube API, OpenDART, 글로벌 뉴스
            데이터 등을 연결하면 실제 시장 반응 기반의 가격으로 확장할 수
            있습니다.
          </p>
        </div>
      </section>
    </main>
  );
}

function HeroFormulaCard({
  title,
  formula,
  description,
}: {
  title: string;
  formula: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
      <p className="text-sm font-bold text-cyan-200">{title}</p>
      <p className="mt-3 font-mono text-2xl font-black text-white">
        {formula}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function FormulaBlock({
  label,
  formula,
}: {
  label: string;
  formula: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="mt-3 font-mono text-lg font-black text-cyan-300">
        {formula}
      </p>
    </div>
  );
}