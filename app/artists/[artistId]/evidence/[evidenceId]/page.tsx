import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getArtistProductEvidence,
  getArtistProductEvidenceStaticParams,
} from '../../../../../lib/product/queries/getArtistProductEvidence';

type PageProps = {
  params: Promise<{
    artistId: string;
    evidenceId: string;
  }>;
};

export function generateStaticParams() {
  return getArtistProductEvidenceStaticParams();
}

export default async function ProductEvidencePage({ params }: PageProps) {
  const { artistId, evidenceId } = await params;
  const result = getArtistProductEvidence({ artistId, evidenceId });

  if (result.status !== 'ok') {
    notFound();
  }

  const { model } = result;
  const variableHref = `/artists/${model.artist.artistId}?variables=${model.relation.relatedVariableId}#variable-chart`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <article className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-8">
          <Link
            href={variableHref}
            className="inline-flex text-sm font-black text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
          >
            ← 변수로 돌아가기
          </Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            Evidence
          </p>
          <h1 className="mt-3 break-words text-3xl font-black leading-tight sm:text-4xl">
            {model.title}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200">
              미리보기
            </span>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">
              합성 데이터
            </span>
          </div>
        </header>

        <div className="grid min-w-0 gap-6 p-5 sm:p-8">
          <section aria-labelledby="evidence-summary-heading">
            <h2 id="evidence-summary-heading" className="text-lg font-black">
              근거 내용
            </h2>
            <p className="mt-3 break-words text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              {model.summary}
            </p>
          </section>

          <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
            <DetailItem label="Evidence ID" value={model.identity.evidenceId} />
            <DetailItem label="관련 아티스트" value={model.artist.displayName} />
            <DetailItem
              href={variableHref}
              label="관련 변수"
              value={model.relation.relatedVariableName}
            />
            <DetailItem label="출처" value={model.source.sourceLabel} />
            <DetailItem label="데이터 기준" value={model.time.sourceTimeLabel} />
            <DetailItem label="관측 시점" value="관측 시점 미확정" />
          </dl>

          <p className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
            이 자료는 연결된 합성 미리보기 근거입니다. 실제 관측 데이터나 공식
            발표 목록으로 해석하지 않습니다.
          </p>
        </div>
      </article>
    </main>
  );
}

function DetailItem({
  href,
  label,
  value,
}: {
  href?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <dt className="text-xs font-black text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-black text-slate-950 dark:text-white">
        {href ? (
          <Link href={href} className="text-cyan-700 hover:text-cyan-500 dark:text-cyan-300">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
