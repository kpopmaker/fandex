import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | FANDEX',
  description:
    'FANDEX privacy policy, including YouTube API Services data handling.',
};

const youtubeTerms = 'https://www.youtube.com/t/terms';
const googlePrivacy = 'https://policies.google.com/privacy';
const googleSecurity = 'https://security.google.com/settings/security/permissions';
const repositoryIssues = 'https://github.com/kpopmaker/fandex/issues';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <article className="mx-auto max-w-4xl px-5 py-12 sm:px-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-700">
            FANDEX Legal
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm font-bold text-slate-500">
            Effective date: October 2, 2026
          </p>
          <p className="mt-5 text-sm leading-7 text-slate-600">
            이 개인정보처리방침은 FANDEX가 서비스 운영 과정에서 처리하는
            정보와 YouTube API Services를 사용하는 경우의 데이터 처리 원칙을
            설명합니다.
          </p>
        </header>

        <div className="mt-6 space-y-6">
          <Section title="1. Service scope">
            <p>
              FANDEX는 K-pop 아티스트 관련 공개 시장 데이터를 분석하고
              리서치 지표와 근거를 제공하는 서비스입니다. 현재 YouTube
              연동은 Analytics &amp; Reporting 목적의 read-only 데이터
              사용을 준비하는 단계이며, 필요한 provider approval 없이
              Production 수집을 활성화하지 않습니다.
            </p>
          </Section>

          <Section title="2. YouTube API Services">
            <p>
              FANDEX는 승인된 범위에서 YouTube API Services를 사용할 수
              있습니다. YouTube 기반 기능을 사용하는 경우 이용자는
              YouTube Terms of Service와 Google Privacy Policy의 적용을
              받을 수 있습니다.
            </p>
            <p className="mt-3">
              YouTube API Services를 사용하는 사용자 기능을 활성화하기
              전에는 이용자가 이 Privacy Policy를 확인하고 동의할 수 있는
              절차를 제공하며, 그 절차가 구현·검증되기 전에는 해당 기능을
              Production에서 활성화하지 않습니다.
            </p>
            <LinkList
              links={[
                { href: youtubeTerms, label: 'YouTube Terms of Service' },
                { href: googlePrivacy, label: 'Google Privacy Policy' },
              ]}
            />
          </Section>

          <Section title="3. YouTube data we access">
            <p>
              현재 준비 중인 public-reaction 분석 범위는 공개 공식 채널과
              공식 업로드를 대상으로 하며, 승인된 경우 다음과 같은 공개
              API 데이터를 조회할 수 있습니다.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>공식 채널 식별 및 공개 채널 통계</li>
              <li>공식 채널 uploads playlist의 공개 업로드 목록과 게시 시각</li>
              <li>공식 영상의 공개 view, like, comment 통계</li>
            </ul>
            <p className="mt-3">
              현재 public-reaction 범위는 YouTube 로그인 자격증명이나
              OAuth Authorized Data를 요구하지 않습니다. 별도의
              authorized-account 기능을 도입할 경우, 해당 기능을
              활성화하기 전에 이 정책과 사용자 동의 절차를 갱신합니다.
            </p>
          </Section>

          <Section title="4. How YouTube data is used">
            <p>
              YouTube API Data는 공식 콘텐츠 집합 확인, 공개 반응의 시간별
              관측, 데이터 품질 검증 및 Analytics &amp; Reporting 목적의
              리서치에 사용될 수 있습니다.
            </p>
            <p className="mt-3">
              FANDEX가 자체적으로 계산한 지표는 YouTube가 제공한 공식
              지표와 구분해 FANDEX-generated metric으로 표시합니다.
              FANDEX는 YouTube API Data를 이용해 개별 팬의 보호 특성을
              추론하거나 개별 사용자를 프로파일링하는 것을 목적으로 하지
              않습니다.
            </p>
          </Section>

          <Section title="5. Storage, refresh, and deletion">
            <p>
              공개 Non-Authorized YouTube API Data는 적용되는 YouTube
              정책 또는 FANDEX에 명시적으로 적용되는 별도 provider 승인에
              더 짧거나 다른 기간이 정해져 있지 않는 한 30 calendar days를
              넘겨 그대로 보관하지 않습니다. 30일 이내에 삭제하거나
              최신 API Data로 refresh하며, 승인 대기 상태를 보관 연장
              승인으로 간주하지 않습니다.
            </p>
            <p className="mt-3">
              통계 데이터 또는 FANDEX-derived metric의 연장 보관이 필요한
              경우, 실제 provider grant에 명시된 범위와 기간만 적용하며
              제출 또는 승인 대기 상태를 승인으로 간주하지 않습니다.
            </p>
            <p className="mt-3">
              public-comment persistence 기능이 별도로 승인되는 경우에도
              snsFandom 후보 adapter는 raw comment text, raw comment ID,
              raw public commenter channel ID를 장기 저장하는 것을 전제로
              하지 않습니다.
            </p>
          </Section>

          <Section title="6. Local device preferences">
            <p>
              FANDEX는 화면 테마와 언어 설정을 기억하기 위해 브라우저의
              localStorage를 사용할 수 있습니다. 이 설정은 YouTube 로그인
              자격증명이나 OAuth token이 아닙니다.
            </p>
          </Section>

          <Section title="7. Authorized data and revocation">
            <p>
              현재 public-reaction 범위는 YouTube Authorized Data를
              사용하지 않습니다. 향후 OAuth 또는 authorized-account
              기능을 도입하는 경우 사용자가 권한을 취소하고 관련 저장
              데이터를 삭제할 수 있는 절차를 제공하며, Google 계정의
              연결 권한은 아래 Google Security Settings에서 관리할 수
              있도록 안내합니다.
            </p>
            <LinkList
              links={[
                {
                  href: googleSecurity,
                  label: 'Google Security Settings — connected permissions',
                },
              ]}
            />
          </Section>

          <Section title="8. Questions and privacy requests">
            <p>
              개인정보 또는 YouTube API 데이터 처리에 관한 문의는 FANDEX
              GitHub issue tracker를 통해 운영자에게 전달할 수 있습니다.
              공개 issue에는 비밀번호, API key, OAuth token, 개인 식별
              정보 등 민감한 정보를 게시하지 마십시오.
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

          <Section title="9. Policy changes">
            <p>
              FANDEX의 데이터 사용 범위나 YouTube API 기능이 변경되면
              관련 provider policy 및 실제 서비스 동작에 맞게 이
              개인정보처리방침을 갱신합니다. 필요한 경우 새로운 데이터
              사용 목적이 적용되기 전에 추가 동의를 요청합니다.
            </p>
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
