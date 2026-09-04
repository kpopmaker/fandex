import Link from 'next/link';
import type { ProductVariableEvidenceCollectionResult } from '../../../lib/product/contracts/productEvidence';

export default function ProductEvidenceList({
  collection,
}: {
  collection: ProductVariableEvidenceCollectionResult;
}) {
  if (collection.status === 'data-issue') {
    return (
      <section className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-400/10">
        <h4 className="text-sm font-black text-amber-900 dark:text-amber-100">
          관련 근거
        </h4>
        <p className="mt-2 text-sm font-bold text-amber-800 dark:text-amber-200">
          관련 근거를 불러올 수 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`evidence-${collection.variableId}-heading`}
      className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4
          id={`evidence-${collection.variableId}-heading`}
          className="text-sm font-black text-slate-950 dark:text-white"
        >
          관련 근거 {collection.items.length}건
        </h4>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          연결된 미리보기 자료
        </span>
      </div>

      <div className="mt-3 grid min-w-0 gap-3">
        {collection.items.map((evidence) => (
          <article
            key={evidence.identity.evidenceId}
            className="min-w-0 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60"
          >
            <h5 className="break-words text-sm font-black leading-6 text-slate-950 dark:text-white">
              {evidence.title}
            </h5>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-black text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200">
                미리보기
              </span>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-black text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">
                합성 데이터
              </span>
            </div>
            <p className="mt-3 break-words text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
              {evidence.source.sourceLabel} · {evidence.time.sourceTimeLabel}
            </p>
            <Link
              href={`/artists/${evidence.identity.artistId}/evidence/${evidence.identity.evidenceId}`}
              className="mt-3 inline-flex text-sm font-black text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
            >
              근거 보기
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
