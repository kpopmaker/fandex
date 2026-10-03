import type { Metadata } from 'next';
import {
  getSnsFandomYoutubeAnalyticsReportingEvidence,
} from '../../lib/intelligence/snsFandomPointYoutubeAnalyticsReportingEvidence';

export const metadata: Metadata = {
  title: 'YouTube Analytics Evidence | FANDEX',
  description:
    'Real bounded YouTube Data API analytics evidence for the FANDEX snsFandom audit.',
};

const artistLabels: Record<string, string> = {
  blackpink: 'BLACKPINK',
  jennie: 'JENNIE',
  riize: 'RIIZE',
  rose: 'ROSÉ',
  twice: 'TWICE',
};

function formatKst(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export default function YoutubeAnalyticsEvidencePage() {
  const evidence = getSnsFandomYoutubeAnalyticsReportingEvidence();

  const endpointRows = [
    {
      endpoint: 'youtube.channels.list',
      calls: evidence.providerCallsObserved.channelsList,
      role: '채널별 uploads playlist 확인',
    },
    {
      endpoint: 'youtube.playlistItems.list',
      calls: evidence.providerCallsObserved.playlistItemsList,
      role: 'uploads playlist terminal pagination',
    },
    {
      endpoint: 'youtube.videos.list',
      calls: evidence.providerCallsObserved.videosList,
      role: '측정 창에 포함된 영상 statistics 확인',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 lg:px-8">
        <header className="max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">
            FANDEX · YouTube Analytics &amp; Reporting Evidence
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            실제 YouTube API 관측 증거
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            이 화면은 preview, mock, editorial seed가 아니라 실제 승인된
            YouTube Data API bounded observation의 checked-in evidence를
            직접 표시합니다.
          </p>
          <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-6 text-yellow-900">
            현재 366일 측정 창은 진행 중입니다. 이 화면은 실제 in-window
            snapshot이지만 완료된 전체 기간 집계나 Production 활성화 상태를
            의미하지 않습니다.
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Audit 채널', evidence.artistChannelCount],
            ['Uploads 페이지', evidence.uploadManifestPageCountPerReactionRun],
            ['포함 영상', evidence.videoCountPerReactionRun],
            ['관측 quota units', evidence.quotaUnitsObserved],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                {label}
              </p>
              <p className="mt-3 font-mono text-3xl font-black text-white">
                {formatNumber(Number(value))}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                  Cohort observation
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  아티스트별 bounded observation
                </h2>
              </div>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100">
                실제 provider run
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    <th className="border-b border-white/10 p-3">Artist</th>
                    <th className="border-b border-white/10 p-3">
                      Playlist pages
                    </th>
                    <th className="border-b border-white/10 p-3">
                      Included videos
                    </th>
                    <th className="border-b border-white/10 p-3">Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.perArtist.map((artist) => (
                    <tr key={artist.canonicalArtistId}>
                      <td className="border-b border-white/10 p-3 font-black">
                        {artistLabels[artist.canonicalArtistId]
                          ?? artist.canonicalArtistId}
                      </td>
                      <td className="border-b border-white/10 p-3 font-mono">
                        {formatNumber(artist.playlistItemsPagesTraversed)}
                      </td>
                      <td className="border-b border-white/10 p-3 font-mono">
                        {formatNumber(artist.includedVideoCount)}
                      </td>
                      <td className="border-b border-white/10 p-3 text-slate-300">
                        {artist.includedVideoCount === 0
                          ? '관측된 true zero · Missing 아님'
                          : '현재 측정 창에 포함된 실제 영상 관측'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
              Window status
            </p>
            <h2 className="mt-2 text-2xl font-black">측정 창 상태</h2>
            <dl className="mt-6 space-y-5 text-sm">
              <div>
                <dt className="font-bold text-slate-400">시작</dt>
                <dd className="mt-1 font-mono font-black">
                  {formatKst(evidence.measurementWindowStart)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-400">종료 예정</dt>
                <dd className="mt-1 font-mono font-black">
                  {formatKst(evidence.measurementWindowEnd)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-400">이번 관측 시각</dt>
                <dd className="mt-1 font-mono font-black">
                  {formatKst(evidence.measuredAt)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-400">계획 cadence</dt>
                <dd className="mt-1 font-black">
                  하루 {evidence.reactionSnapshotRunsPerDay}회
                </dd>
              </div>
            </dl>
            <p className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm font-bold leading-6 text-slate-300">
              measurementWindowComplete = false · quotaWorksheetEligible =
              false
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
            Provider request accounting
          </p>
          <h2 className="mt-2 text-2xl font-black">API 호출 관측</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {endpointRows.map((row) => (
              <article
                key={row.endpoint}
                className="rounded-2xl border border-white/10 bg-slate-900 p-5"
              >
                <p className="font-mono text-xs font-black text-cyan-300">
                  {row.endpoint}
                </p>
                <p className="mt-3 font-mono text-3xl font-black">
                  {formatNumber(row.calls)}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {row.role}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-sm font-bold leading-6 text-slate-300">
            총 provider calls {formatNumber(evidence.providerCallsObserved.total)}
            회 · 관측 quota units {formatNumber(evidence.quotaUnitsObserved)}.
            포함 영상 0건은 실제 관측 결과이며 Missing이나 1로 대체하지
            않습니다.
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
            Provenance
          </p>
          <h2 className="mt-2 text-2xl font-black">증거 계보</h2>
          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
            {[
              ['Source', evidence.sourceLabel],
              ['Workflow run', evidence.provenance.workflowRunId],
              ['Artifact ID', evidence.provenance.artifactId],
              ['Authorization comment', evidence.provenance.authorizationCommentId],
              ['Source main SHA', evidence.provenance.sourceMainSha],
              ['Execution commit', evidence.provenance.executionRequestCommitSha],
              ['Artifact digest', evidence.provenance.artifactDigest],
              ['Evidence state', evidence.surfaceState],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-900 p-4"
              >
                <dt className="font-bold text-slate-400">{label}</dt>
                <dd className="mt-2 break-all font-mono text-xs font-black text-slate-100">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-3xl border border-red-400/20 bg-red-400/10 p-6">
          <h2 className="text-xl font-black text-red-300">사용 경계</h2>
          <ul className="mt-4 space-y-2 text-sm font-bold leading-6 text-slate-200">
            <li>· 이 snapshot은 완료된 366일 quota worksheet evidence가 아닙니다.</li>
            <li>· Product Production/Real 활성화나 공개 점수 산출을 의미하지 않습니다.</li>
            <li>· 추가 YouTube provider 실행이나 scheduler activation을 승인하지 않습니다.</li>
            <li>· raw video identifiers / raw statistics / secret material을 표시하지 않습니다.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
