import Link from 'next/link';

const previewItems = [
  '69팀 coverage 기반 아티스트 목록',
  '아티스트별 6개월 FANDEX 주가 차트',
  '변수 1~4개 선택 그래프',
  '2~5명 아티스트 비교',
  '산출방식 / 커버리지 안내',
];

export default function EarlyAccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600">
            FANDEX 미리보기
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            FANDEX 1차 MVP 안내
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            FANDEX는 아티스트의 활동 흐름을 숫자와 차트로 보여주는
            서비스입니다. 지금은 1차 MVP에서 볼 수 있는 핵심 화면만
            정리했습니다.
          </p>
          <p className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
            FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기
            위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가
            아닙니다.
          </p>
        </div>

        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">현재 가능한 기능</h2>
            <ul className="mt-5 space-y-3 text-sm font-bold leading-6 text-slate-600">
              {previewItems.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">신뢰 고지</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다. 모든
              K-pop 아티스트를 대표하지 않습니다. 현재 차트는 에디토리얼
              시드 / 미리보기 데이터 기반이며, 실제 공개 지표 검증과 자동 수집은
              후속 단계입니다.
            </p>
          </article>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/charts"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            주가 차트 보기
          </Link>
          <Link
            href="/artists"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-700"
          >
            아티스트 목록
          </Link>
          <Link
            href="/compare"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-700"
          >
            비교 페이지
          </Link>
          <Link
            href="/methodology"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-700"
          >
            산출방식
          </Link>
        </div>
      </section>
    </main>
  );
}
