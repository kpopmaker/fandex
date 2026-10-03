import type { Metadata } from 'next';

import evidenceRefs from '../../docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json';
import { SnsFandomYoutubeAnalyticsReportingSurfaceView } from '../components/SnsFandomYoutubeAnalyticsReportingSurface';
import {
  evaluateSnsFandomYoutubeAnalyticsReportingSurface,
} from '../../lib/product/presentation/snsFandomYoutubeAnalyticsReportingSurface';

export const metadata: Metadata = {
  title: 'YouTube Analytics Evidence | FANDEX',
  description:
    'Real bounded YouTube Data API analytics evidence for the FANDEX snsFandom audit.',
};

export default function YoutubeAnalyticsEvidencePage() {
  const raw = evidenceRefs as unknown as Record<string, unknown>;
  const surface = evaluateSnsFandomYoutubeAnalyticsReportingSurface(
    raw.currentBoundedMeasurementEvidence,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">
            FANDEX · audit evidence surface
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            실제 YouTube Analytics &amp; Reporting 증거
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            checked-in current bounded measurement evidence만 사용합니다.
            Preview, mock, editorial seed 데이터를 이 화면의 측정값으로
            사용하지 않습니다.
          </p>
          <p className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-6 text-yellow-900">
            현재 366일 측정 창은 진행 중입니다. 이 화면은 실제 provider
            observation을 보여주지만 완료된 full-window quota evidence나
            Product Production/Real 활성화를 의미하지 않습니다.
          </p>
        </header>

        <SnsFandomYoutubeAnalyticsReportingSurfaceView surface={surface} />
      </div>
    </main>
  );
}
