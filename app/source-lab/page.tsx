import Link from 'next/link';
import {
  getSourceCandidateArtistSummaries,
  getSourceCandidateMarketSummary,
  getSourceCandidateVariableSummaries,
  getSourceIngestionSummary,
  getSourceProviderAdapters,
  getSourceProviderAdapterSummaries,
  getSourceProviderPreviewImportSummary,
  getSourceVariableSignalCandidates,
  runSourceProviderPreviewImport,
  runSourceProviderPreviewImportShapeCheck,
  runSourceProviderRegistryShapeCheck,
  runSourceCandidateSummaryShapeCheck,
  runSourceIngestionFoundationShapeCheck,
  sourceIngestionFixture,
  type FandexSourceProviderAdapterResult,
  type FandexSourceProviderAdapterSummary,
  type FandexSourceCandidateArtistSummary,
  type FandexSourceCandidateVariableSummary,
  type FandexNormalizedSourceItem,
  type FandexSourceVariableSignalCandidate,
} from '../data/v4/sources';

function formatScore(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
  }).format(value);
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function formatOptionalDateTime(value: string | null) {
  if (!value) {
    return '없음';
  }

  return formatDateTime(value);
}

function formatCountMap(counts: Record<string, number>) {
  const entries = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]));

  if (entries.length === 0) {
    return '없음';
  }

  return entries.map(([key, count]) => `${key} ${count}`).join(' · ');
}

function getSourceTitleMap(items: FandexNormalizedSourceItem[]) {
  return new Map(items.map((item) => [item.sourceId, item.title]));
}

export default function SourceLabPage() {
  const sourceItems = sourceIngestionFixture;
  const candidates = getSourceVariableSignalCandidates(sourceItems);
  const summary = getSourceIngestionSummary(sourceItems);
  const shapeCheck = runSourceIngestionFoundationShapeCheck(sourceItems);
  const candidateSummaryShapeCheck =
    runSourceCandidateSummaryShapeCheck(sourceItems);
  const artistCandidateSummaries =
    getSourceCandidateArtistSummaries(sourceItems);
  const variableCandidateSummaries =
    getSourceCandidateVariableSummaries(sourceItems);
  const marketCandidateSummary = getSourceCandidateMarketSummary(sourceItems);
  const artistCandidateSummaryPreview = artistCandidateSummaries.slice(0, 8);
  const variableCandidateSummaryPreview = variableCandidateSummaries.slice(0, 10);
  const sourceTitleMap = getSourceTitleMap(sourceItems);
  const providerCount = Object.values(summary.providerCounts).filter(
    (count) => count > 0,
  ).length;
  const averageRelevanceScore = getAverage(
    sourceItems.map((item) => item.relevanceScore),
  );
  const averageCandidateScore = getAverage(
    candidates.map((candidate) => candidate.candidateScore),
  );
  const providerAdapters = getSourceProviderAdapters();
  const providerAdapterSummaries = getSourceProviderAdapterSummaries();
  const providerAdapterSummaryPreview = providerAdapterSummaries.slice(0, 8);
  const providerRegistryShapeCheck = runSourceProviderRegistryShapeCheck();
  const providerPreviewImport = runSourceProviderPreviewImport();
  const providerPreviewImportSummary = getSourceProviderPreviewImportSummary();
  const providerPreviewImportShapeCheck =
    runSourceProviderPreviewImportShapeCheck();
  const mockProviderCount = providerAdapters.filter(
    (adapter) => adapter.status === 'mock',
  ).length;
  const providerResultPreview = providerPreviewImport.providerResults.slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                read-only ingestion preview
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                Source Lab
              </h1>
              <p className="mt-4 max-w-4xl text-sm font-bold leading-7 text-slate-600">
                실제 웹 데이터가 FANDEX 변수 후보 신호로 바뀌는 과정을
                fixture 기반으로 확인하는 preview입니다. 외부 API, DB,
                Supabase 연결은 없고 실제 FANDEX 점수에 반영하지 않습니다.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
            >
              홈으로
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SummaryCard
            label="source item"
            value={String(summary.sourceItemCount)}
          />
          <SummaryCard
            label="candidate"
            value={String(summary.candidateCount)}
          />
          <SummaryCard label="연결 아티스트" value={String(summary.artistCount)} />
          <SummaryCard label="provider" value={String(providerCount)} />
          <SummaryCard
            label="평균 relevance"
            value={formatScore(averageRelevanceScore)}
          />
          <SummaryCard
            label="평균 candidate"
            value={formatScore(averageCandidateScore)}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                provider adapter preview
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Provider Adapter Preview
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600">
                실제 API 연결 전, provider adapter가 fixture source item을 import
                pipeline으로 넘기는지 확인하는 영역입니다. 외부 API/DB/Supabase
                연결 없음, fixture 기반 mock provider만 사용, FANDEX 점수
                계산에는 아직 반영하지 않음.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShapeCheckBadge
                isValid={providerRegistryShapeCheck.isValid}
                validLabel="registry valid"
                invalidLabel="registry issue"
              />
              <ShapeCheckBadge
                isValid={providerPreviewImportShapeCheck.isValid}
                validLabel="pipeline valid"
                invalidLabel="pipeline issue"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <SummaryCard
              label="provider"
              value={String(providerPreviewImportSummary.providerCount)}
            />
            <SummaryCard
              label="mock provider"
              value={String(mockProviderCount)}
            />
            <SummaryCard
              label="preview source"
              value={String(providerPreviewImportSummary.sourceItemCount)}
            />
            <SummaryCard
              label="preview candidate"
              value={String(providerPreviewImportSummary.candidateCount)}
            />
            <SummaryCard
              label="warning"
              value={String(providerPreviewImportSummary.warningCount)}
            />
            <SummaryCard
              label="avg candidate"
              value={formatScore(providerPreviewImportSummary.averageCandidateScore)}
            />
            <SummaryCard
              label="avg relevance"
              value={formatScore(providerPreviewImportSummary.averageRelevanceScore)}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">provider adapter 목록</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {providerAdapterSummaryPreview.length} /{' '}
                {providerAdapterSummaries.length}
              </span>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {providerAdapterSummaryPreview.map((adapterSummary) => (
                <ProviderAdapterSummaryCard
                  key={adapterSummary.provider}
                  summary={adapterSummary}
                />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">preview import pipeline 결과</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {formatDateTime(providerPreviewImport.collectedAt)}
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <Mini
                label="providerResults"
                value={String(providerPreviewImport.providerResults.length)}
              />
              <Mini
                label="sourceItems"
                value={String(providerPreviewImport.sourceItems.length)}
              />
              <Mini
                label="candidates"
                value={String(providerPreviewImport.candidates.length)}
              />
              <Mini
                label="artistCount"
                value={String(providerPreviewImportSummary.artistCount)}
              />
              <Mini
                label="variableCount"
                value={String(providerPreviewImportSummary.variableCount)}
              />
              <Mini
                label="warningCount"
                value={String(providerPreviewImportSummary.warningCount)}
              />
            </div>
            <div className="mt-3 grid gap-3">
              {providerResultPreview.map((result) => (
                <ProviderResultCard key={result.provider} result={result} />
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            <ShapeCheckCard
              label="provider registry shape check"
              isValid={providerRegistryShapeCheck.isValid}
              issueCount={providerRegistryShapeCheck.issues.length}
              detail={`${providerRegistryShapeCheck.adapterCount} adapters / ${providerRegistryShapeCheck.previewItemCount} preview items`}
            />
            <ShapeCheckCard
              label="preview import shape check"
              isValid={providerPreviewImportShapeCheck.isValid}
              issueCount={providerPreviewImportShapeCheck.issues.length}
              detail={`${providerPreviewImportShapeCheck.providerCount} providers / ${providerPreviewImportShapeCheck.sourceItemCount} sources / ${providerPreviewImportShapeCheck.candidateCount} candidates`}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                candidate summary preview
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Source candidate 요약
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                source candidate를 artistId와 variableKey 기준으로 묶어 보는
                read-only preview입니다. 외부 API, DB, Supabase 연결은 없고
                FANDEX 계산 반영 전 단계입니다.
              </p>
            </div>
            <span
              className={
                candidateSummaryShapeCheck.isValid
                  ? 'rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700'
                  : 'rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700'
              }
            >
              {candidateSummaryShapeCheck.isValid
                ? 'valid summary shape'
                : 'summary issue'}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="market candidates"
              value={String(marketCandidateSummary.candidateCount)}
            />
            <SummaryCard
              label="market top artist"
              value={marketCandidateSummary.topArtistId ?? '없음'}
            />
            <SummaryCard
              label="market top variable"
              value={marketCandidateSummary.topVariableKey ?? '없음'}
            />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <Mini
              label="market averageCandidateScore"
              value={formatScore(marketCandidateSummary.averageCandidateScore)}
            />
            <Mini
              label="market latestPublishedAt"
              value={formatOptionalDateTime(marketCandidateSummary.latestPublishedAt)}
            />
            <Mini
              label="market providerCounts"
              value={formatCountMap(marketCandidateSummary.providerCounts)}
            />
            <Mini
              label="market sentimentCounts"
              value={formatCountMap(marketCandidateSummary.sentimentCounts)}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">아티스트별 candidate summary</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {artistCandidateSummaryPreview.length} /{' '}
                {artistCandidateSummaries.length}
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              {artistCandidateSummaryPreview.map((artistSummary) => (
                <ArtistCandidateSummaryCard
                  key={artistSummary.artistId}
                  summary={artistSummary}
                />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">변수별 candidate summary</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {variableCandidateSummaryPreview.length} /{' '}
                {variableCandidateSummaries.length}
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              {variableCandidateSummaryPreview.map((variableSummary) => (
                <VariableCandidateSummaryCard
                  key={`${variableSummary.artistId}-${variableSummary.variableKey}`}
                  summary={variableSummary}
                />
              ))}
            </div>
          </div>

          {candidateSummaryShapeCheck.issues.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {candidateSummaryShapeCheck.issues.map((issue) => (
                <article
                  key={`${issue.code}-${issue.artistId ?? 'market'}-${issue.variableKey ?? 'all'}`}
                  className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800"
                >
                  {issue.message}
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                foundation shape check
              </p>
              <h2 className="mt-2 text-2xl font-black">구조 검증 상태</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                중복 sourceId, 비어있는 artistIds, 허용되지 않은 variableKey,
                유효하지 않은 점수 값을 fixture 기준으로 확인합니다.
              </p>
            </div>
            <span
              className={
                shapeCheck.isValid
                  ? 'rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700'
                  : 'rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700'
              }
            >
              {shapeCheck.isValid ? 'valid preview shape' : 'shape issue'}
            </span>
          </div>
          {shapeCheck.issues.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {shapeCheck.issues.map((issue) => (
                <article
                  key={`${issue.code}-${issue.sourceId ?? issue.candidateId}`}
                  className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800"
                >
                  {issue.message}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-800">
              현재 fixture와 candidate shape는 read-only foundation 기준을
              통과했습니다.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                normalized source items
              </p>
              <h2 className="mt-2 text-2xl font-black">Source item 목록</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                실제 수집 전 표준화된 source item 형태를 fixture로 보여줍니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
              {sourceItems.length} items
            </span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {sourceItems.map((item) => (
              <SourceItemCard key={item.sourceId} item={item} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                variable signal candidates
              </p>
              <h2 className="mt-2 text-2xl font-black">후보 신호 목록</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                source item이 어떤 FANDEX 변수 후보 신호로 해석될 수 있는지
                preview score와 함께 보여줍니다. 실제 점수 반영은 없습니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
              {candidates.length} candidates
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.candidateId}
                candidate={candidate}
                sourceTitle={sourceTitleMap.get(candidate.sourceId) ?? 'unknown source'}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function ShapeCheckBadge({
  isValid,
  validLabel,
  invalidLabel,
}: {
  isValid: boolean;
  validLabel: string;
  invalidLabel: string;
}) {
  return (
    <span
      className={
        isValid
          ? 'rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700'
          : 'rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700'
      }
    >
      {isValid ? validLabel : invalidLabel}
    </span>
  );
}

function ShapeCheckCard({
  label,
  isValid,
  issueCount,
  detail,
}: {
  label: string;
  isValid: boolean;
  issueCount: number;
  detail: string;
}) {
  return (
    <article
      className={
        isValid
          ? 'rounded-2xl border border-emerald-200 bg-emerald-50 p-4'
          : 'rounded-2xl border border-rose-200 bg-rose-50 p-4'
      }
    >
      <p
        className={
          isValid
            ? 'text-xs font-black uppercase tracking-[0.12em] text-emerald-700'
            : 'text-xs font-black uppercase tracking-[0.12em] text-rose-700'
        }
      >
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-slate-950">
        {isValid ? '통과' : '확인 필요'}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-600">
        {detail} / issues {issueCount}
      </p>
    </article>
  );
}

function ProviderAdapterSummaryCard({
  summary,
}: {
  summary: FandexSourceProviderAdapterSummary;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-cyan-700">
            {summary.provider}
          </p>
          <h3 className="mt-2 text-lg font-black">{summary.displayName}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {summary.description}
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
          {summary.status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Mini label="trustLevel" value={summary.trustLevel} />
        <Mini label="previewItemCount" value={String(summary.previewItemCount)} />
        <Mini label="capabilities" value={summary.capabilities.join(' 쨌 ')} />
      </div>
    </article>
  );
}

function ProviderResultCard({
  result,
}: {
  result: FandexSourceProviderAdapterResult;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[0.7fr_0.5fr_0.5fr_1.5fr] lg:items-center">
      <Mini label="provider" value={result.provider} />
      <Mini label="status" value={result.status} />
      <Mini label="itemCount" value={String(result.itemCount)} />
      <div className="rounded-xl bg-white p-3">
        <p className="text-xs font-bold text-slate-400">warnings / note</p>
        <p className="mt-1 break-words text-sm font-black leading-6 text-slate-950">
          {result.warnings.length > 0
            ? result.warnings.join(' 쨌 ')
            : 'warning 없음'}
        </p>
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
          {result.note}
        </p>
      </div>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-2xl font-black text-slate-950">
        {value}
      </p>
    </article>
  );
}

function PillList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function SourceItemCard({ item }: { item: FandexNormalizedSourceItem }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700">
            {item.provider} / {item.contentType}
          </p>
          <h3 className="mt-2 text-lg font-black">{item.title}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {item.summary}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
          {item.trustLevel}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Mini label="sourceName" value={item.sourceName} />
        <Mini label="publishedAt" value={formatDateTime(item.publishedAt)} />
        <Mini label="sentiment" value={item.sentiment} />
        <Mini label="relevanceScore" value={formatScore(item.relevanceScore)} />
        <Mini
          label="engagementScore"
          value={formatScore(item.engagementScore)}
        />
        <Mini label="language / country" value={`${item.language} / ${item.country}`} />
      </div>
      <div className="mt-4 space-y-3">
        <PillList values={item.artistIds} />
        <PillList values={item.categories} />
      </div>
      {item.note ? (
        <p className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-3 text-xs font-bold leading-5 text-cyan-800">
          {item.note}
        </p>
      ) : null}
    </article>
  );
}

function ArtistCandidateSummaryCard({
  summary,
}: {
  summary: FandexSourceCandidateArtistSummary;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[0.8fr_0.7fr_0.7fr_0.7fr_0.9fr_1fr] lg:items-center">
      <Mini label="artistId" value={summary.artistId} />
      <Mini label="candidateCount" value={String(summary.candidateCount)} />
      <Mini label="sourceItemCount" value={String(summary.sourceItemCount)} />
      <Mini label="top variable" value={summary.topVariableKey ?? '없음'} />
      <Mini
        label="averageCandidateScore"
        value={formatScore(summary.averageCandidateScore)}
      />
      <Mini
        label="latestPublishedAt"
        value={formatOptionalDateTime(summary.latestPublishedAt)}
      />
      <div className="lg:col-span-6">
        <p className="rounded-xl bg-white p-3 text-sm font-black leading-6 text-slate-700">
          {summary.summaryLabel}
        </p>
      </div>
    </article>
  );
}

function VariableCandidateSummaryCard({
  summary,
}: {
  summary: FandexSourceCandidateVariableSummary;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[0.8fr_0.7fr_0.7fr_0.8fr] lg:items-center">
      <Mini label="artistId" value={summary.artistId} />
      <Mini label="variableKey" value={summary.variableKey} />
      <Mini label="candidateCount" value={String(summary.candidateCount)} />
      <Mini label="sourceItemCount" value={String(summary.sourceItemCount)} />
      <Mini
        label="averageCandidateScore"
        value={formatScore(summary.averageCandidateScore)}
      />
      <Mini label="providerCounts" value={formatCountMap(summary.providerCounts)} />
      <Mini
        label="sentimentCounts"
        value={formatCountMap(summary.sentimentCounts)}
      />
      <Mini
        label="latestPublishedAt"
        value={formatOptionalDateTime(summary.latestPublishedAt)}
      />
    </article>
  );
}

function CandidateCard({
  candidate,
  sourceTitle,
}: {
  candidate: FandexSourceVariableSignalCandidate;
  sourceTitle: string;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr] lg:items-center">
      <div>
        <p className="font-mono text-xs font-black text-cyan-700">
          {candidate.sourceId}
        </p>
        <h3 className="mt-2 font-black">{sourceTitle}</h3>
        <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
          {candidate.reason}
        </p>
      </div>
      <Mini label="artistId" value={candidate.artistId} />
      <Mini label="variableKey" value={candidate.variableKey} />
      <Mini
        label="candidateScore"
        value={`${formatScore(candidate.candidateScore)} / ${candidate.confidence}`}
      />
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}
