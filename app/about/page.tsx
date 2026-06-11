import Link from 'next/link';

const features = [
  {
    title: 'Artist as Stock',
    description:
      'K-pop 아티스트를 하나의 종목처럼 보고 현재가, 등락률, 거래량, Fan Cap으로 표현합니다.',
  },
  {
    title: 'Multi-Factor Price',
    description:
      '음원, 앨범, 유튜브, SNS, 검색, 해외 반응, 팬덤, 소속사 펀더멘털을 종합해 FANDEX Price를 계산합니다.',
  },
  {
    title: 'Custom Index Builder',
    description:
      '사용자가 음원형, 바이럴형, 글로벌형, 팬덤형처럼 요소를 직접 켜고 끄며 새로운 지표를 만들 수 있습니다.',
  },
  {
    title: 'K-pop Market Index',
    description:
      '개별 아티스트뿐 아니라 KMI Composite, 걸그룹 지수, 보이그룹 지수, 신인 지수 같은 시장 단위 지수를 제공합니다.',
  },
  {
    title: 'Signal Detection',
    description:
      '급등, 급락, 거래량 폭증, 검색량 증가, 해외 반응 상승 같은 시장 신호를 감지합니다.',
  },
  {
    title: 'Content Lab',
    description:
      'FANDEX 데이터를 기반으로 SNS 정보성 콘텐츠 소재를 자동으로 도출하는 방향으로 확장합니다.',
  },
];

const roadmap = [
  {
    phase: 'Phase 1',
    title: 'Mock Market',
    description:
      '아티스트 종목 데이터와 mock 가격 엔진으로 FANDEX의 시장 구조를 먼저 구현합니다.',
  },
  {
    phase: 'Phase 2',
    title: 'Data API',
    description:
      '네이버 검색 API, YouTube API, OpenDART, 글로벌 뉴스 데이터 등을 순차적으로 연결합니다.',
  },
  {
    phase: 'Phase 3',
    title: 'Realtime Signals',
    description:
      '검색량, 조회수, SNS 반응, 뉴스량의 변화량을 기반으로 급등·급락 신호를 감지합니다.',
  },
  {
    phase: 'Phase 4',
    title: 'Content Engine',
    description:
      '오늘의 급등주, 바이럴 종목, 신인 모멘텀 TOP 같은 콘텐츠 소재를 자동 생성합니다.',
  },
];

export default function AboutPage() {
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
            ABOUT FANDEX
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
            K-pop 시장을 주식시장처럼 읽는 팬덤 시세 플랫폼
          </h1>

          <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-400 md:text-lg md:leading-8">
            FANDEX는 K-pop 아티스트의 음원 성적, 콘텐츠 반응, 검색 관심도,
            SNS 반응, 해외 반응, 팬덤 자산, 소속사 펀더멘털을 종합해
            아티스트의 현재 시장 성적을 주식 시세처럼 보여주는 데이터
            플랫폼입니다.
          </p>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
            <p className="text-sm font-bold text-cyan-200">Core Concept</p>
            <h2 className="mt-3 text-2xl font-black">아티스트 = 종목</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              에스파, 아이브, 라이즈 같은 아티스트를 하나의 종목으로 보고,
              시장 반응을 가격·등락률·거래량으로 표현합니다.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
            <p className="text-sm font-bold text-slate-400">Default View</p>
            <h2 className="mt-3 text-2xl font-black">종합 FANDEX Price</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              첫 화면에서는 모든 요소가 반영된 기본 주가를 보여주고,
              사용자는 이를 기준으로 시장 전체 흐름을 볼 수 있습니다.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
            <p className="text-sm font-bold text-slate-400">Custom View</p>
            <h2 className="mt-3 text-2xl font-black">커스텀 지표 빌더</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              음원, SNS, 해외 반응, 팬덤, 펀더멘털 요소를 켜고 끄면서
              사용자가 직접 새로운 아티스트 순위를 만들 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-2xl font-black">왜 FANDEX가 필요한가?</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ReasonCard
              number="01"
              title="인기순위만으로는 부족하다"
              description="K-pop 시장은 음원, 앨범, 유튜브, SNS, 해외 반응, 팬덤 구매력 등 여러 요소가 동시에 움직입니다."
            />

            <ReasonCard
              number="02"
              title="지금 뜨는 이유를 알아야 한다"
              description="단순히 누가 1위인지보다 왜 상승하는지, 어떤 요소가 가격을 끌어올리는지가 중요합니다."
            />

            <ReasonCard
              number="03"
              title="콘텐츠 소재로 연결되어야 한다"
              description="FANDEX는 데이터 분석에서 끝나는 것이 아니라 SNS 정보성 콘텐츠 제작까지 연결되는 것을 목표로 합니다."
            />
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-2xl font-black">핵심 기능</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <h3 className="font-black text-cyan-300">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
            <h2 className="text-2xl font-black">FANDEX가 보는 데이터</h2>

            <div className="mt-5 space-y-3">
              <DataRow label="음원·앨범" value="초동, 스트리밍, 차트 순위" />
              <DataRow label="공식 콘텐츠" value="MV, 티저, 프로모션, 자체 콘텐츠" />
              <DataRow label="공식 SNS" value="인스타그램, X, 틱톡, 유튜브 커뮤니티" />
              <DataRow label="검색·뉴스" value="포털 검색량, 뉴스, 블로그, 카페" />
              <DataRow label="해외 반응" value="글로벌 뉴스, 해외 차트, 글로벌 SNS" />
              <DataRow label="팬덤 자산" value="팬 플랫폼, 팬덤명, 멤버십, 팬채널" />
              <DataRow label="펀더멘털" value="소속사 매출, 영업이익, 시가총액" />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
            <h2 className="text-2xl font-black">주요 사용자</h2>

            <div className="mt-5 space-y-3">
              <UserRow title="K-pop 팬" description="지금 가장 뜨거운 아티스트와 상승 이유를 확인" />
              <UserRow title="SNS 채널 운영자" description="데이터 기반 콘텐츠 소재 발굴" />
              <UserRow title="엔터 마케터" description="팬덤 반응과 시장 흐름을 빠르게 파악" />
              <UserRow title="콘텐츠 기획자" description="바이럴 가능성이 높은 아티스트와 이슈 탐색" />
              <UserRow title="엔터 취업 준비자" description="데이터 기반 포트폴리오 및 산업 분석 자료 확보" />
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-2xl font-black">개발 로드맵</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roadmap.map((item) => (
              <div
                key={item.phase}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <p className="font-mono text-sm font-black text-cyan-300">
                  {item.phase}
                </p>
                <h3 className="mt-3 text-xl font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-6">
          <h2 className="text-2xl font-black text-yellow-200">
            현재 버전 안내
          </h2>

          <p className="mt-3 text-sm leading-6 text-yellow-100/80">
            현재 FANDEX v2는 실제 API를 연결하기 전의 mock market 단계입니다.
            화면에 표시되는 가격, 거래량, 등락률은 서비스 구조를 검증하기 위한
            예시 데이터입니다. 이후 실제 데이터 API를 연결해 실시간 시장 반응
            기반의 FANDEX Price로 확장할 예정입니다.
          </p>
        </div>
      </section>
    </main>
  );
}

function ReasonCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <p className="font-mono text-sm font-black text-cyan-300">{number}</p>
      <h3 className="mt-3 text-xl font-black">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="font-bold text-white">{label}</p>
      <p className="text-right text-sm text-slate-400">{value}</p>
    </div>
  );
}

function UserRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}