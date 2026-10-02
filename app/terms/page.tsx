import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | FANDEX',
  description:
    'FANDEX Terms of Service, including YouTube API Services terms.',
};

const youtubeTerms = 'https://www.youtube.com/t/terms';
const youtubeApiTerms =
  'https://developers.google.com/youtube/terms/api-services-terms-of-service';
const privacyPolicy = '/privacy';
const repositoryIssues = 'https://github.com/kpopmaker/fandex/issues';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <article className="mx-auto max-w-4xl px-5 py-12 sm:px-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-700">
            FANDEX Legal
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm font-bold text-slate-500">
            Effective date: October 2, 2026
          </p>
          <p className="mt-5 text-sm leading-7 text-slate-600">
            본 약관은 FANDEX 웹 서비스와 FANDEX가 제공하는 데이터 기반
            리서치 기능의 이용 조건을 설명합니다.
          </p>
        </header>

        <div className="mt-6 space-y-6">
          <Section title="1. FANDEX service">
            <p>
              FANDEX는 K-pop 아티스트와 시장 반응에 관한 공개 데이터,
              리서치 지표, 비교 화면 및 관련 근거를 제공하는 preview
              research service입니다.
            </p>
            <p className="mt-3">
              FANDEX의 지표와 화면은 금융상품, 실제 주식 가격, 투자 권유,
              아티스트의 상업적 가치에 대한 공식 평가가 아닙니다.
            </p>
          </Section>

          <Section title="2. YouTube-powered features">
            <p>
              FANDEX가 YouTube API Services를 사용하는 기능을 제공하는
              경우, 해당 기능을 이용함으로써 이용자는 YouTube Terms of
              Service의 적용을 받으며 이에 동의하는 것으로 간주됩니다.
            </p>
            <LinkList
              links={[
                { href: youtubeTerms, label: 'YouTube Terms of Service' },
                {
                  href: youtubeApiTerms,
                  label: 'YouTube API Services Terms of Service',
                },
              ]}
            />
            <p className="mt-3">
              FANDEX는 실제 provider approval 없이 승인 대상 YouTube
              Production collection을 활성화하지 않습니다.
            </p>
          </Section>

          <Section title="3. Data sources and FANDEX-generated metrics">
            <p>
              FANDEX는 제공자 API, 공개 문서, 직접 검증한 공개 자료 등
              다양한 데이터 소스를 사용할 수 있습니다. 제공자에서 직접
              받은 값과 FANDEX가 자체적으로 계산한 값은 가능한 범위에서
              구분해 표시합니다.
            </p>
            <p className="mt-3">
              FANDEX-generated metric은 YouTube 또는 다른 데이터 제공자가
              직접 제공하거나 보증한 지표가 아닙니다.
            </p>
          </Section>

          <Section title="4. Acceptable use">
            <p>이용자는 FANDEX를 다음 목적으로 사용해서는 안 됩니다.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>불법적이거나 기만적인 활동</li>
              <li>서비스 또는 외부 API에 대한 무단 접근·우회</li>
              <li>자동화된 조회수, 좋아요, 댓글 등 플랫폼 조작</li>
              <li>API key, access token, refresh token 등 비밀정보의 공개</li>
              <li>개별 사용자를 식별·감시하거나 보호 특성을 추론하기 위한 사용</li>
            </ul>
          </Section>

          <Section title="5. Accuracy and availability">
            <p>
              FANDEX는 데이터 출처, 수집 시각, 제공자 정책, API 상태에 따라
              값이 변경되거나 일부 기능이 제한될 수 있습니다. 데이터가
              누락된 경우 FANDEX는 이를 임의로 0으로 간주하지 않는 것을
              원칙으로 합니다.
            </p>
            <p className="mt-3">
              서비스는 preview 또는 research 상태로 제공될 수 있으며,
              중단 없는 제공이나 특정 데이터의 영구적 가용성을 보장하지
              않습니다.
            </p>
          </Section>

          <Section title="6. Intellectual property and third-party services">
            <p>
              FANDEX 자체 코드, 인터페이스 및 독자적 분석물에 대한 권리는
              해당 권리자에게 있습니다. YouTube 및 기타 제3자 서비스의
              데이터, 명칭, 상표, 콘텐츠에는 각 제공자의 약관과 권리가
              적용됩니다.
            </p>
          </Section>

          <Section title="7. Privacy">
            <p>
              FANDEX의 데이터 처리와 YouTube API Services 관련 개인정보
              처리 원칙은 Privacy Policy에서 확인할 수 있습니다.
            </p>
            <p className="mt-3">
              <a
                href={privacyPolicy}
                className="font-bold text-cyan-700 underline underline-offset-4"
              >
                FANDEX Privacy Policy
              </a>
            </p>
          </Section>

          <Section title="8. Changes to the service or terms">
            <p>
              서비스 기능, 데이터 사용 범위 또는 관련 provider policy가
              변경될 경우 본 약관을 갱신할 수 있습니다. 중요한 변경은
              적용 시점과 함께 공개 페이지에 반영합니다.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              서비스 또는 약관 관련 문의는 FANDEX GitHub issue tracker를
              통해 전달할 수 있습니다. 공개 issue에는 비밀번호, API key,
              OAuth token 또는 기타 민감정보를 게시하지 마십시오.
            </p>
            <LinkList
              links={[
                {
                  href: repositoryIssues,
                  label: 'FANDEX GitHub issue tracker',
                },
              ]}
            />
          </Section>
        </div>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

function LinkList({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  return (
    <ul className="mt-4 space-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-cyan-700 underline underline-offset-4"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
