import Link from 'next/link';

const executiveSummary = [
  '컴백 관련 신호와 숏폼 콘텐츠 반응을 중심으로 팬 관심도가 안정적으로 유지되고 있습니다.',
  '긍정 이슈 톤과 커뮤니티 반응이 브랜드 적합도 평가를 보조합니다.',
  '검색과 뉴스 집중도가 높아 주간 관심 아티스트 후보로 계속 관찰할 필요가 있습니다.',
  '단일 반복 이슈에 뉴스량이 집중될 경우 해석 신뢰도와 리스크 메모를 함께 확인해야 합니다.',
];

const signalSnapshot = [
  {
    label: 'FANDEX 누적 점수 예시',
    value: '4,820pt',
    detail: '실제 데이터가 아닌 beta preview',
    tone: 'cyan',
  },
  {
    label: '이슈 톤',
    value: '긍정 우세',
    detail: '샘플 해석 톤',
    tone: 'emerald',
  },
  {
    label: '브랜드 적합도',
    value: '높음',
    detail: '캠페인 적합도 예시',
    tone: 'violet',
  },
  {
    label: '팬 관심 흐름',
    value: '상승 관찰',
    detail: '주간 변화 흐름 예시',
    tone: 'cyan',
  },
  {
    label: '검수 필요도',
    value: '중간',
    detail: '모니터링 수준 예시',
    tone: 'blue',
  },
];

const issueSignals = [
  {
    group: '긍정 신호',
    title: '컴백 티저 대화량이 공유 가능한 콘텐츠 흐름을 유지',
    meaning:
      '크리에이티브 소재는 기대감, 스타일링 디테일, 팬 참여 포인트를 중심으로 설계할 수 있습니다.',
  },
  {
    group: '긍정 신호',
    title: '브랜드 언급 품질이 정제된 퍼포먼스 이미지와 정합',
    meaning:
      '협업 메시지는 프리미엄 비주얼과 자신감 있는 그룹 정체성을 강조하는 방향이 적합합니다.',
  },
  {
    group: '관찰 신호',
    title: '뉴스량이 소수의 반복 관점에 집중',
    meaning:
      '캠페인 운영자는 관심이 더 넓게 확산되는지, 특정 이슈에 과도하게 좁혀지는지 확인해야 합니다.',
  },
  {
    group: '중립 배경 신호',
    title: '차트와 커뮤니티 언급은 급격한 돌파 없이 안정적',
    meaning:
      '기본 수요는 안정적이지만 다음 콘텐츠 타이밍에는 분명한 확산 계기가 필요할 수 있습니다.',
  },
];

const marketingImplications = [
  {
    title: '콘텐츠 관점',
    copy: '컴백 근거, 비주얼 정체성, 팬이 반복 확산할 수 있는 숏폼 훅을 우선합니다.',
  },
  {
    title: '브랜드 협업 관점',
    copy: 'IVE는 정제된 자신감, 패션 지향 비주얼, 넓은 대중 안전성을 중심으로 포지셔닝할 수 있습니다.',
  },
  {
    title: '커뮤니티 활성화 관점',
    copy: '티저 마일스톤, 랭킹 순간, 멤버 주도 클립을 활용해 팬 참여를 유도합니다.',
  },
  {
    title: '리스크 모니터링 관점',
    copy: '유료 매체 확산 전 토픽 집중도, 반복 헤드라인, 관찰 키워드를 점검합니다.',
  },
];

const comparisonRows = [
  {
    metric: '팬 관심도',
    ive: '높음',
    newJeans: '높음',
    riize: '상승 관찰',
  },
  {
    metric: '이슈 톤',
    ive: '긍정 우세',
    newJeans: '관찰 필요',
    riize: '균형',
  },
  {
    metric: '브랜드 적합도',
    ive: '프리미엄 비주얼',
    newJeans: '라이프스타일 문화',
    riize: '유스 퍼포먼스',
  },
  {
    metric: '검수 필요도',
    ive: '중간',
    newJeans: '높음',
    riize: '낮음',
  },
];

const paidReportItems = [
  '주간 관심 아티스트 코멘터리',
  '컴백 / 이슈 / 브랜드 시그널 요약',
  '아티스트 비교 브리프',
  '마케팅 인사이트 메모',
  '시그널 변화 흐름 코멘터리',
];

export default function SampleReportPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
                <LangText en="FANDEX Sample Report" ko="FANDEX 샘플 리포트" />
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                <LangText
                  en="Weekly K-pop Signal Report Preview"
                  ko="구독자 리서치 결과물 샘플"
                />
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                <LangText
                  en="A preview of how FANDEX translates K-pop entertainment signals into research insight. Free screens provide only the total cumulative point preview, while category-level detail is reserved for subscriber research."
                  ko="이 페이지는 FANDEX 구독자 리서치 결과물의 샘플입니다. 공개 화면에서는 종합 누적 점수만 제공되며, 세부 카테고리별 점수와 AI 해석은 구독자 리서치에서 제공됩니다."
                />
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/#early-access"
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
              >
                <LangText en="Join Early Access" ko="Early Access 신청하기" />
              </Link>
              <Link
                href="/research"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                <LangText en="See Paid Research Categories" ko="유료 리서치 카테고리 보기" />
              </Link>
              <Link
                href="/"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                <LangText en="Home" ko="홈" />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              리서치 요약
            </p>
            <h2 className="mt-2 text-2xl font-black">IVE 시그널 브리프 예시</h2>
            <ul className="mt-5 grid gap-3">
              {executiveSummary.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              시그널 요약
            </p>
            <h2 className="mt-2 text-2xl font-black">주간 리서치 지표 미리보기</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {signalSnapshot.map((signal) => (
                <SignalCard key={signal.label} {...signal} />
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            이슈와 뉴스 신호
          </p>
          <h2 className="mt-2 text-2xl font-black">마케팅 시그널 메모</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {issueSignals.map((signal) => (
              <article
                key={signal.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                  {signal.group}
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  {signal.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {signal.meaning}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              마케팅 활용 관점
            </p>
            <h2 className="mt-2 text-2xl font-black">시그널 활용 방식</h2>
            <div className="mt-5 grid gap-3">
              {marketingImplications.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <h3 className="text-sm font-black text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.copy}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              아티스트 비교 미리보기
            </p>
            <h2 className="mt-2 text-2xl font-black">IVE vs NewJeans vs RIIZE</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-2">항목</th>
                    <th className="px-3 py-2">IVE</th>
                    <th className="px-3 py-2">NewJeans</th>
                    <th className="px-3 py-2">RIIZE</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.metric} className="bg-slate-50">
                      <td className="rounded-l-2xl px-3 py-3 font-black text-slate-700">
                        {row.metric}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-600">
                        {row.ive}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-600">
                        {row.newJeans}
                      </td>
                      <td className="rounded-r-2xl px-3 py-3 font-bold text-slate-600">
                        {row.riize}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                <LangText en="Early Access Report" ko="Early Access 리포트" />
              </p>
              <h2 className="mt-2 text-2xl font-black">
                <LangText
                  en="Subscriber research category examples"
                  ko="구독자 리서치 카테고리 예시"
                />
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <LangText
                  en="This sample shows only part of the planned subscriber research output. It is a FANDEX v1 cumulative point model sample before live data connection. FANDEX v1 is not converted to a 0-100 score; it accumulates category points. Free users see only the total point preview, while subscriber research is planned to show category points and interpretation."
                  ko="이 샘플은 예정된 구독자 리서치 결과물의 일부 예시이며, 실제 데이터 연결 전 FANDEX v1 누적 점수제 샘플입니다. FANDEX v1은 0~100 환산 점수가 아니라 카테고리별 포인트를 누적하는 구조입니다. 공개 화면에서는 종합 누적 점수만 제공하고, 구독자 리서치에서는 카테고리별 누적 점수와 해석을 제공할 예정입니다."
                />
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {paidReportItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              <LangText en="Validation preview" ko="점수 검증 미리보기" />
            </p>
            <h2 className="mt-2 text-2xl font-black">
              <LangText
                en="How subscriber reports can explain score reliability"
                ko="구독자 리포트에서 제공될 점수 신뢰도 구조"
              />
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              <LangText
                en="Full validation detail is planned for subscriber research. Free previews only show the total cumulative point, while subscriber reports can add benchmark alignment, confidence band, event context, and analyst review notes."
                ko="상세 검증 정보는 구독자 리서치에서 제공될 예정입니다. 무료 미리보기는 종합 누적 점수만 보여주고, 구독자 리포트에서는 벤치마크 정합성, 신뢰도 구간, 이벤트 맥락, 분석가 검수 메모를 함께 제공할 수 있습니다."
              />
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                ko: '벤치마크 정합성 미리보기',
                en: 'Benchmark alignment preview',
                copyKo: '외부 기준 지표와 FANDEX 카테고리 방향성이 맞는지 확인합니다.',
                copyEn: 'Checks whether external benchmarks align with FANDEX categories.',
              },
              {
                ko: '신뢰도 구간',
                en: 'Confidence band',
                copyKo: 'sourceCount와 coverage에 따라 High/Medium/Low로 표시합니다.',
                copyEn: 'Marks confidence as High/Medium/Low based on source count and coverage.',
              },
              {
                ko: '이벤트 맥락',
                en: 'Event context',
                copyKo: '컴백, 브랜드 딜, 리스크 이벤트 전후의 점수 움직임을 봅니다.',
                copyEn: 'Reviews score movement around comeback, brand, and risk events.',
              },
              {
                ko: '분석가 검수 메모',
                en: 'Analyst review note',
                copyKo: '이상치와 해석 주의점은 수동 검수 메모로 분리합니다.',
                copyEn: 'Separates outliers and interpretation cautions into review notes.',
              },
            ].map((item) => (
              <article
                key={item.en}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-black text-slate-950">
                  <LangText en={item.en} ko={item.ko} />
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  <LangText en={item.copyEn} ko={item.copyKo} />
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                Early Access
              </p>
              <h2 className="mt-2 text-2xl font-black">
                <LangText en="Want this report every week?" ko="이 리포트를 매주 받아보고 싶다면" />
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                <LangText
                  en="Join FANDEX Early Access to receive weekly K-pop signal briefs, artist watchlists, and marketing insight memos as the report format is validated."
                  ko="FANDEX Early Access에 신청하면 주간 K-pop 시그널 브리프, 관심 아티스트 코멘터리, 마케팅 인사이트 메모 형식의 구독자 리서치를 검증 단계에서 확인할 수 있습니다."
                />
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/research"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
              >
                <LangText en="See Paid Research Categories" ko="유료 리서치 카테고리 보기" />
              </Link>
              <Link
                href="/search"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                <LangText en="Try Limited Free Search" ko="제한된 무료 검색 해보기" />
              </Link>
              <Link
                href="/#waitlist-form"
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
              >
                <LangText en="Join Early Access" ko="Early Access 신청하기" />
              </Link>
              <Link
                href="/"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                <LangText en="Back to Dashboard" ko="대시보드로 돌아가기" />
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold leading-6 text-slate-500">
            <LangText
              en="FANDEX is an experimental K-pop and entertainment research indicator. It is not financial advice, an investment product, or an official certification score. This sample uses preview/mock/manual seed values to explain the cumulative point model; future live data coverage and formula detail may change."
              ko="FANDEX는 K-pop/엔터 산업을 분석하기 위한 실험적 리서치 지표입니다. 금융 조언이나 투자 상품이 아니며, 공식 인증 점수가 아닙니다. 이 샘플 수치는 실제 데이터가 아닌 preview/mock/manual seed 기반 누적 점수제 구조 설명용이며, 실제 데이터 연결과 세부 산식은 고도화될 수 있습니다."
            />
          </p>
        </section>
      </section>
    </main>
  );
}

function SignalCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  const toneClass =
    {
      cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      violet: 'bg-violet-50 text-violet-700 border-violet-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
    }[tone] ?? 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{detail}</p>
    </article>
  );
}

function LangText({ ko, en }: { ko: string; en: string }) {
  return (
    <>
      <span className="inline [html[data-language='en']_&]:hidden">{ko}</span>
      <span className="hidden [html[data-language='en']_&]:inline">{en}</span>
    </>
  );
}
