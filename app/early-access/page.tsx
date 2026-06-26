import Link from 'next/link';

const audienceCards = [
  {
    title: '엔터/콘텐츠 마케터',
    copy: '컴백, 캠페인, 팬덤 반응을 콘텐츠 기획 관점에서 빠르게 정리하려는 팀.',
  },
  {
    title: '브랜드 마케터',
    copy: '아티스트와 캠페인 메시지의 브랜드 적합도를 비교하고 싶은 실무자.',
  },
  {
    title: 'K-pop/팬덤 콘텐츠 운영자',
    copy: '이슈 흐름과 팬덤 반응을 안전한 리서치 문맥으로 설명하려는 운영자.',
  },
  {
    title: '엔터 취업/포트폴리오 준비자',
    copy: '산업 흐름을 데이터 기반 리서치 메모로 정리하고 싶은 지원자.',
  },
];

const betaBenefits = [
  {
    title: 'Weekly FANDEX Report',
    free: '무료: 종합 누적 점수와 이슈 톤 미리보기',
    early: 'Early Access: 주간 변화 요약과 관심 아티스트 코멘터리',
  },
  {
    title: 'Artist Research Brief',
    free: '무료: 아티스트 기본 정보와 포인트 밴드',
    early: 'Early Access: 카테고리별 해석과 리서치 메모',
  },
  {
    title: 'Brand-fit Analysis',
    free: '무료: 브랜드 적합도 세부 항목 잠금',
    early: 'Early Access: 캠페인 관점의 적합도와 활용 포인트',
  },
  {
    title: 'Issue & News Signal Summary',
    free: '무료: 간단한 이슈 톤만 표시',
    early: 'Early Access: 뉴스 흐름, tone 분포, 검수 메모',
  },
  {
    title: 'Artist Comparison Brief',
    free: '무료: 단일 아티스트 공개 점수 중심',
    early: 'Early Access: 가상 비교 포맷과 카테고리 차이 해석',
  },
  {
    title: 'Watchlist Commentary',
    free: '무료: 검색한 대상만 확인',
    early: 'Early Access: 관심 대상 목록과 주간 관찰 메모',
  },
];

const reportTypes = [
  'Weekly FANDEX Report',
  'Artist Research Brief',
  'Brand-fit Analysis',
  'Issue & News Signal Summary',
  'Artist Comparison Brief',
  'Watchlist Commentary',
];

const usageGoals = [
  '콘텐츠 기획',
  '브랜드 캠페인 리서치',
  '팬덤/커뮤니티 운영',
  '엔터 산업 포트폴리오',
  '주간 산업 모니터링',
];

export default function EarlyAccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
                FANDEX Early Access
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                K-pop/엔터 산업 이슈를 데이터 기반으로 해석하는 리서치 베타에 참여하세요.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                무료 검색과 샘플 리포트 이후, 더 깊은 아티스트 리서치,
                브랜드 적합도, 이슈 리스크 분석을 원하는 사용자를 위한
                베타 신청 페이지입니다.
              </p>
              <p className="mt-4 max-w-3xl rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
                FANDEX는 실험적 엔터테인먼트 리서치 지표이며, 금융
                조언이나 투자 상품이 아니고 공식 인증 점수가 아닙니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/search"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                무료 검색 먼저 보기
              </Link>
              <Link
                href="/sample-report"
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
              >
                샘플 리포트 보기
              </Link>
              <Link
                href="/research"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                리서치 플랜 보기
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Who it is for
            </p>
            <h2 className="mt-2 text-2xl font-black">이런 사용자에게 맞습니다</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {audienceCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <h3 className="text-lg font-black text-slate-950">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              What you get in beta
            </p>
            <h2 className="mt-2 text-2xl font-black">
              무료 미리보기 이후 열리는 리서치 범위
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {betaBenefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <h3 className="text-lg font-black text-slate-950">
                  {benefit.title}
                </h3>
                <p className="mt-4 rounded-xl bg-white px-3 py-2 text-sm font-bold leading-6 text-slate-600">
                  {benefit.free}
                </p>
                <p className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold leading-6 text-cyan-800">
                  {benefit.early}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                Static application form
              </p>
              <h2 className="mt-2 text-2xl font-black">
                베타 신청서 미리보기
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                실제 제출 기능은 아직 연결하지 않았습니다. 어떤 리서치가
                필요한지 정리해보는 정적 UX 미리보기입니다.
              </p>
              <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold leading-6 text-slate-500">
                현재 이 폼은 베타 신청 UX 미리보기입니다. 실제 신청 수집은
                Early Access 운영 단계에서 연결됩니다.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="이름" placeholder="이름을 입력하세요" />
              <Field label="이메일" placeholder="you@example.com" type="email" />
              <Field label="소속/역할" placeholder="예: 브랜드 마케터" />
              <SelectField label="관심 리포트 유형" options={reportTypes} />
              <div className="md:col-span-2">
                <Field
                  label="가장 분석해보고 싶은 아티스트/이슈"
                  placeholder="예: 특정 컴백 흐름, 브랜드 협업 후보, 팬덤 반응"
                />
              </div>
              <SelectField label="활용 목적" options={usageGoals} />
              <div className="md:col-span-2">
                <button
                  type="button"
                  className="w-full rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400 md:w-auto"
                >
                  신청서 미리 작성하기
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                Conversion path
              </p>
              <h2 className="mt-2 text-2xl font-black">
                무료 검색에서 리서치 베타 신청까지
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                먼저 공개 미리보기로 FANDEX 흐름을 확인하고, 샘플 리포트와
                리서치 플랜을 본 뒤 Early Access 운영 조건을 검토하세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/search"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
              >
                무료 검색 먼저 보기
              </Link>
              <Link
                href="/sample-report"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                샘플 리포트 보기
              </Link>
              <Link
                href="/research"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                리서치 플랜 보기
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({
  label,
  placeholder,
  type = 'text',
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="text-sm font-black text-slate-700">
      {label}
      <input
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="text-sm font-black text-slate-700">
      {label}
      <select
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        defaultValue=""
      >
        <option value="">선택하세요</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
