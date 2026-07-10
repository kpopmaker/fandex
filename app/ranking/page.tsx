import { getFandexPythonExportRankingData } from '../data/v4/pythonExportedFandexData';
import RankingExplorer, { type RankingExplorerRow } from './RankingExplorer';

function createRankingRows(): RankingExplorerRow[] {
  return getFandexPythonExportRankingData().rows.sort(
    (a, b) => b.currentFandexPoint - a.currentFandexPoint,
  );
}

export default function RankingPage() {
  const rows = createRankingRows();
  const exportData = getFandexPythonExportRankingData();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600">
            FANDEX ranking
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            K-pop artist ranking explorer
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-600 md:text-base">
            Python export JSON을 읽어 최신 master ranking을 표시합니다.
            웹 화면에서는 FANDEX 점수를 재계산하지 않고, export에 들어있는
            값을 그대로 보여줍니다.
          </p>
          <p className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800">
            최종 점수는 fandexFinalPoint를 사용합니다. 소스별 점수는
            sourcePoints.naver, sourcePoints.youtube,
            sourcePoints.musicChart의 cumulativePoint를 표시하며, 값이 없으면
            대시로 처리합니다.
          </p>
          <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
            version {exportData.version} / manifest {exportData.manifestVersion} /
            reports {exportData.reportCount} / updated {exportData.createdAt || '-'}
          </p>
        </section>

        <RankingExplorer
          activeSources={exportData.activeSources}
          rows={rows}
          scoreMode={exportData.scoreMode}
        />
      </section>
    </main>
  );
}
