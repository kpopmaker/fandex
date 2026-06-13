import Link from 'next/link';
import { factorDefinitionsV3 } from '../data/v3/mockData';

const lifecycleItems = [
  'album release cycle',
  'comeback period',
  'activity period',
  'hiatus period',
  'comeback reaction strength',
  'activity effect',
  'hiatus retention',
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/"
          className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
        >
          Back to FANDEX
        </Link>

        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
            산정 방식
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            FANDEX 가격은 어떻게 계산되나요?
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-300">
            FANDEX 가격은 실제 주식 가격이 아니라, 팬들의 반응, 검색량,
            영상 반응, 뉴스량 등을 모아 요즘 얼마나 주목받고 있는지를
            숫자로 바꾼 값입니다. 현재 화면은 mock 데이터 기반이며 실제
            투자 상품이나 금융 조언이 아닙니다.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <InfoCard
            title="절대 지표 우선"
            description="순위나 백분위만 보지 않고 음원 성과, 앨범 판매, YouTube 조회수, SNS 반응, 검색량, 뉴스량, 해외 반응, 팬덤 반응의 실제 규모를 우선 반영합니다."
          />
          <InfoCard
            title="상대 순위는 보조 지표"
            description="아티스트 간 순위는 시장을 읽기 위한 보조 신호입니다. FANDEX 가격 자체를 percentile-only score로 설명하지 않습니다."
          />
          <InfoCard
            title="활동 주기 반영 예정"
            description="컴백, 활동기, 공백기처럼 K-pop 시장에서 반응의 의미가 달라지는 시기를 가격 산정에 반영할 수 있도록 데이터 모델을 확장합니다."
          />
        </div>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">반영 요소</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            아래 항목은 현재 mock 가격에 쓰이는 기본 요소입니다. 다음 단계에서
            각 요소는 실제 API 수집값과 검증 상태를 함께 저장해야 합니다.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {factorDefinitionsV3.map((factor) => (
              <article
                key={factor.key}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <p className="text-xs font-black uppercase text-cyan-300">
                  {factor.label}
                </p>
                <h3 className="mt-2 font-black">{factor.easyLabel}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {factor.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">활동 주기 보정 준비</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            이번 단계에서는 전체 가격 엔진을 구현하지 않습니다. 대신 데이터가
            아래 상태를 저장할 수 있게 준비하고, 실제 수집 데이터가 들어온 뒤
            산식을 검증합니다.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {lifecycleItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-6">
          <h2 className="text-2xl font-black text-yellow-100">
            용어 방향
          </h2>
          <p className="mt-3 text-sm leading-6 text-yellow-50/80">
            앞으로 한국어 화면에서는 Momentum을 "최근 분위기", Weight를
            "반영 비중", Factor를 "반영 요소", Signal을 "시장 신호"처럼 쉬운
            말로 바꿉니다. 전체 UI 번역은 별도 i18n 단계에서 진행합니다.
          </p>
        </section>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}
