import Link from 'next/link';
import { factorDefinitionsV3 } from '../data/v3/mockData';

const lifecycleItems = [
  '앨범 발매 주기',
  '컴백 기간',
  '활동 기간',
  '활동 공백기',
  '컴백 반응 강도',
  '활동 효과',
  '공백기 유지력',
];

const sourceRoadmap = [
  'Naver News Search API',
  'Naver DataLab',
  'YouTube Data API',
  'GDELT',
  '공식 발표',
  '소속사 보도자료',
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/"
          className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
        >
          FANDEX 시장으로 돌아가기
        </Link>

        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
            Methodology
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            산정 방식
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-300">
            FANDEX 가격은 실제 주식 가격이 아니라, 팬 반응, 검색량, 영상
            반응, 뉴스량, 해외 반응 등을 종합해 아티스트가 지금 얼마나
            주목받는지를 보여주는 simulated index입니다. 현재 화면의 수치는
            mock 데이터이며 투자 상품이나 금융 조언이 아닙니다.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <InfoCard
            title="실제 주식이 아님"
            description="FANDEX는 K-pop 시장의 관심 흐름을 설명하기 위한 지표입니다. 매매, 수익, 투자 판단을 위한 가격이 아닙니다."
          />
          <InfoCard
            title="절대 반응 수치 기반"
            description="순위만 보지 않고 음원 성과, 앨범 판매, YouTube 조회수, SNS 반응, 검색량, 뉴스량처럼 실제 규모가 있는 수치를 우선 반영합니다."
          />
          <InfoCard
            title="상대 순위는 보조 지표"
            description="아티스트 순위는 비교를 돕는 보조 정보입니다. FANDEX 가격을 백분위나 순위만으로 설명하지 않습니다."
          />
        </div>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">반영 요소</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            아래 항목은 현재 mock 가격을 설명하는 기본 반영 요소입니다. 실제
            서비스에서는 각 요소마다 수집 출처, 수집 시각, 검증 상태를 함께
            저장합니다.
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

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">활동 주기 보정 예정</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              K-pop 반응은 컴백 직후, 활동기, 활동 공백기에 의미가 다릅니다.
              다음 가격 엔진에서는 앨범 발매 주기와 활동 공백기 보정을
              반영할 수 있도록 데이터를 쌓습니다.
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
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">실제 뉴스 데이터 연동 예정</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              현재 이슈와 뉴스는 mock 데이터입니다. 이후에는 실제 뉴스,
              검색량, 영상 반응, 공식 발표 데이터를 연결해 시장 신호의
              근거를 더 명확하게 보여줍니다.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {sourceRoadmap.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-6">
          <h2 className="text-2xl font-black text-yellow-100">
            쉬운 용어 기준
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <TermCard from="Momentum" to="최근 분위기" />
            <TermCard from="Weight" to="반영 비중" />
            <TermCard from="Factor" to="반영 요소" />
            <TermCard from="Signal" to="시장 신호" />
          </div>
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

function TermCard({ from, to }: { from: string; to: string }) {
  return (
    <div className="rounded-2xl border border-yellow-400/20 bg-slate-950/70 p-4">
      <p className="text-xs font-bold text-yellow-100/60">{from}</p>
      <p className="mt-1 text-lg font-black text-yellow-100">{to}</p>
    </div>
  );
}
