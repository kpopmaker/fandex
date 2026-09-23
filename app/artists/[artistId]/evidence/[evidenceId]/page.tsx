import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getArtistProductEvidence,
  getArtistProductEvidenceStaticParams,
} from '../../../../../lib/product/queries/getArtistProductEvidence';
import { getProductEvidencePresentation } from '../../../../../lib/product/presentation/productEvidencePresentation';
import { getStoredEvidenceFailurePresentation } from '../../../../../lib/product/presentation/storedEvidenceFailurePresentation';
import {
  getNaverNewsIssuePointRealProductStoredEvidenceJobAtLatestOfficialSlot,
} from '../../../../../lib/server/product/naverNewsIssuePointRealProductRead';

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

  if (artistId === 'iu' && /^[0-9a-f]{64}$/.test(evidenceId)) {
    const storedEvidence =
      await getNaverNewsIssuePointRealProductStoredEvidenceJobAtLatestOfficialSlot({
        jobId: evidenceId,
      });

    if (storedEvidence.status !== 'ok') {
      const failure = getStoredEvidenceFailurePresentation(storedEvidence.issues);
      if (failure.kind === 'not-found') {
        notFound();
      }

      return <StoredEvidenceFailureDetail presentation={failure} />;
    }

    return <StoredEvidenceDetail model={storedEvidence.model} />;
  }

  const result = getArtistProductEvidence({ artistId, evidenceId });

  if (result.status !== 'ok') {
    notFound();
  }

  const { model } = result;
  const evidencePresentation = getProductEvidencePresentation(model);
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
              {evidencePresentation.presentationLabel}
            </span>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">
              {evidencePresentation.dataOriginLabel}
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
            {evidencePresentation.disclosureText}
          </p>
        </div>
      </article>
    </main>
  );
}

function StoredEvidenceFailureDetail({
  presentation,
}: {
  presentation: ReturnType<typeof getStoredEvidenceFailurePresentation>;
}) {
  const variableHref =
    '/artists/iu?variables=newsIssuePoint#variable-chart';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <article className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-8">
          <Link
            href={variableHref}
            className="inline-flex text-sm font-black text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
          >
            ← newsIssuePoint로 돌아가기
          </Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
            Stored Evidence · Verify
          </p>
          <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
            {presentation.title}
          </h1>
        </header>
        <div className="p-5 sm:p-8">
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            {presentation.description}
          </p>
        </div>
      </article>
    </main>
  );
}

type StoredEvidenceModel = Extract<
  Awaited<
    ReturnType<
      typeof getNaverNewsIssuePointRealProductStoredEvidenceJobAtLatestOfficialSlot
    >
  >,
  { status: 'ok' }
>['model'];

function StoredEvidenceDetail({
  model,
}: {
  model: StoredEvidenceModel;
}) {
  const variableHref =
    '/artists/iu?variables=newsIssuePoint#variable-chart';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <article className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-8">
          <Link
            href={variableHref}
            className="inline-flex text-sm font-black text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
          >
            ← newsIssuePoint로 돌아가기
          </Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
            Stored Evidence · Verify
          </p>
          <h1 className="mt-3 break-words font-mono text-2xl font-black leading-tight sm:text-3xl">
            {model.identity.jobId}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
              Observed
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Evidence lineage · Shadow
            </span>
          </div>
        </header>

        <div className="grid min-w-0 gap-6 p-5 sm:p-8">
          <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
            <DetailItem label="관련 아티스트" value="IU" />
            <DetailItem label="관련 변수" value="newsIssuePoint" href={variableHref} />
            <DetailItem label="slotStart" value={model.lineage.slotStart} />
            <DetailItem label="throughSlotStart" value={model.lineage.throughSlotStart} />
            <DetailItem label="methodology" value={model.lineage.methodologyVersion} />
            <DetailItem label="official Shadow epoch" value={model.lineage.officialShadowEpoch} />
            <DetailItem label="Collection lifecycle" value="Shadow" />
          </dl>

          <section>
            <h2 className="text-lg font-black">Window membership</h2>
            <div className="mt-3 grid gap-3">
              {model.lineage.windowMemberships.map((membership) => (
                <div
                  key={`${membership.role}-${membership.startSlotStart}-${membership.endSlotStart}`}
                  className="rounded-2xl bg-slate-50 p-4 text-sm font-bold dark:bg-slate-950"
                >
                  {membership.role} · {membership.startSlotStart} → {membership.endSlotStart}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black">
              Canonical observations ({model.storedEvidence.canonicalObservations.length})
            </h2>
            <div className="mt-3 grid gap-4">
              {model.storedEvidence.canonicalObservations.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold dark:bg-slate-950">
                  이 job에는 canonical observation이 없습니다. 0은 점수 0과 동일한 의미가 아닙니다.
                </p>
              ) : model.storedEvidence.canonicalObservations.map((observation) => (
                <article
                  key={observation.observationId}
                  className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <a
                    href={observation.canonicalSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
                  >
                    {observation.title}
                  </a>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                    {observation.summary}
                  </p>
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <DetailItem label="observedAt" value={observation.observedAt} />
                    <DetailItem label="collectedAt" value={observation.collectedAt} />
                    <DetailItem label="observationId" value={observation.observationId} />
                    <DetailItem
                      label="rawEvidenceIds"
                      value={observation.rawEvidenceIds.join(', ') || '없음'}
                    />
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black">Stored lineage</h2>
            <p className="mt-3 break-words rounded-2xl bg-slate-50 p-4 font-mono text-xs font-bold dark:bg-slate-950">
              normalizedRecordIds: {model.storedEvidence.eligibleNormalizedRecordIds.join(', ') || '없음'}
            </p>
          </section>

          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
            Product publication은 Production이지만 Stored Evidence의 원천 수집
            lineage는 Shadow epoch를 유지합니다. Observation Time과 Collection
            Time은 별도 필드로 표시하며 서로 대체하지 않습니다.
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
