import Link from 'next/link';

const sampleRows = [
  {
    label: '현재 FANDEX 주가',
    value: '미리보기',
    copy: '아티스트 상세 페이지에서 최신 주가형 지수와 6개월 변화 pt를 확인합니다.',
  },
  {
    label: '변수별 영향',
    value: '7개 변수',
    copy: '음원/음반, 뉴스/이슈, SNS/팬덤, 브랜드 적합도, 컴백/활동, 성장 모멘텀, 리스크 감점을 분리해 봅니다.',
  },
  {
    label: '비교 기준',
    value: '2~5명',
    copy: '같은 기간, 같은 변수 기준으로 여러 아티스트의 흐름을 비교합니다.',
  },
];

export default function SampleReportPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600">
            FANDEX 리서치 예시
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            FANDEX 리서치 리포트 예시
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            샘플 리포트는 FANDEX 주가형 지수를 어떻게 읽을지 보여주는
            안내 페이지입니다. 실제 공개 지표 검증과 자동 수집은 후속
            단계이며, 현재 값은 에디토리얼 시드 / 미리보기 데이터 기반입니다.
          </p>
          <p className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
            FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기
            위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가
            아닙니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {sampleRows.map((row) => (
            <article
              key={row.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {row.label}
              </p>
              <p className="mt-3 font-mono text-2xl font-black text-slate-950">
                {row.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {row.copy}
              </p>
            </article>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white">
          <h2 className="text-2xl font-black">해석 기준</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다. 모든
            K-pop 아티스트를 대표하지 않습니다. 전체 FANDEX 주가와
            변수별 그래프는 같은 값이 아니며, 변수별 그래프는 전체 산출에
            영향을 준 개별 변수 흐름입니다.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/charts"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            주가 차트 보기
          </Link>
          <Link
            href="/compare"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-700"
          >
            여러 아티스트 비교
          </Link>
          <Link
            href="/coverage"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-700"
          >
            커버리지 확인
          </Link>
        </div>
      </section>
    </main>
  );
}
