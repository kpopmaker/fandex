import Link from 'next/link';

const researchCards = [
  {
    title: '6개월 FANDEX 포인트 흐름',
    copy: '아티스트별 최근 6개 시점의 포인트 지수 흐름과 6개월 변화 pt를 함께 확인합니다.',
    href: '/charts',
    cta: '지수 차트 보기',
  },
  {
    title: '변수별 영향',
    copy: '음원/음반, SNS/팬덤, 브랜드 적합도, 컴백/활동 등 산출 변수의 흐름을 분리해 해석합니다.',
    href: '/methodology',
    cta: '산출방식 보기',
  },
  {
    title: '아티스트 비교',
    copy: '2~5명 아티스트를 같은 기간, 같은 변수 기준으로 비교합니다.',
    href: '/compare',
    cta: '비교 페이지 보기',
  },
];

const nextSteps = [
  '실제 공개 지표 수집 기준 정의',
  '수동 검증 데이터 반영',
  '관리자 데이터 입력 구조 설계',
  'API/DB 자동화',
  '신뢰도 metadata 고도화',
];

export default function ResearchPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">
            FANDEX 리서치
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            FANDEX 리서치 프리뷰
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            FANDEX는 K-pop 아티스트의 활동 흐름을 숫자와 차트로 보여줍니다.
            이 페이지에서는 차트, 아티스트 상세, 비교, 산출방식 화면으로
            바로 이동할 수 있습니다.
          </p>
          <p className="mt-4 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm font-bold leading-6 text-cyan-100">
            FANDEX 포인트는 K-pop 아티스트 활동성과 반응 지표를 해석하기
            위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가
            아닙니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {researchCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <h2 className="text-lg font-black">{card.title}</h2>
              <p className="mt-3 min-h-24 text-sm leading-6 text-slate-300">
                {card.copy}
              </p>
              <Link
                href={card.href}
                className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950"
              >
                {card.cta}
              </Link>
            </article>
          ))}
        </div>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h2 className="text-2xl font-black">현재 범위</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다. 모든
              K-pop 아티스트를 대표하지 않습니다. 현재 차트는 에디토리얼
              시드 / 미리보기 데이터 기반이며, 실제 공개 지표 검증과 자동 수집은
              후속 단계입니다.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              다음 단계
            </h3>
            <ul className="mt-3 space-y-2 text-sm font-bold text-slate-200">
              {nextSteps.map((step) => (
                <li key={step}>- {step}</li>
              ))}
            </ul>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/artists"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white"
          >
            아티스트 목록
          </Link>
          <Link
            href="/coverage"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white"
          >
            커버리지 확인
          </Link>
          <Link
            href="/methodology"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white"
          >
            산출방식 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
