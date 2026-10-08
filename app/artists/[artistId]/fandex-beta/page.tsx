import Link from 'next/link';
import { notFound } from 'next/navigation';
import approvedIuReleaseBinding from '../../../../data/fandex-cloud-v10/product/iu_music_album_current_release_binding_v1.json';
import {
  buildMusicAlbumVerifiedReleaseIdentity,
} from '../../../../lib/product/presentation/musicAlbumVerifiedReleaseIdentity';
import {
  getFandexCurrentRuntimeAssemblyReadinessForIU,
} from '../../../../lib/server/product/fandexCurrentRuntimeAssemblyReadiness';
import {
  createFandexBetaArtistPresentation,
  type FandexBetaArtistComponentPresentation,
} from '../../../../lib/product/presentation/fandexBetaArtistPresentation';

export const runtime = 'nodejs';
export const preferredRegion = 'sin1';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{
    artistId: string;
  }>;
};

const lifecycleLabels: Record<string, string> = {
  production: 'Production',
  shadow: 'Shadow',
  research: 'Research',
  preview: 'Preview',
};

const readinessLabels: Record<string, string> = {
  production: 'Production',
  'production-ready': 'Production 준비',
  'building-history': '히스토리 축적 중',
  'preview-only': 'Preview',
  'research-only': 'Research',
  blocked: 'Blocked',
};

function stateLabel(value: string | null) {
  if (!value) return '확인 필요';
  return value.replaceAll('-', ' ');
}

function readinessLabel(value: string | null) {
  if (!value) return '확인 필요';
  return readinessLabels[value] ?? stateLabel(value);
}

function lifecycleLabel(value: string | null) {
  if (!value) return '확인 필요';
  return lifecycleLabels[value] ?? stateLabel(value);
}

function formatDateTime(value: string | null) {
  if (!value) return '관측시각 없음';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

function statusTone(component: FandexBetaArtistComponentPresentation) {
  if (
    component.lifecycleState === 'production'
    && component.materialClass === 'real'
    && component.readinessState === 'production'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (component.adapterState === 'ok') {
    return 'border-cyan-200 bg-cyan-50 text-cyan-800';
  }

  return 'border-amber-200 bg-amber-50 text-amber-800';
}

function VariableCard({
  component,
}: {
  component: FandexBetaArtistComponentPresentation;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {component.variableId}
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            {component.label}
          </h2>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone(component)}`}
        >
          {component.adapterState === 'ok'
            ? readinessLabel(component.readinessState)
            : '확인 필요'}
        </span>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
        <p className="text-xs font-bold text-slate-400">현재 표현값</p>
        <p className="mt-2 break-words text-lg font-black">
          {component.displayValue}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <div>
          <dt className="font-bold text-slate-400">Lifecycle</dt>
          <dd className="mt-1 font-black text-slate-800">
            {lifecycleLabel(component.lifecycleState)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-400">Material</dt>
          <dd className="mt-1 font-black text-slate-800">
            {stateLabel(component.materialClass)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-400">Confidence</dt>
          <dd className="mt-1 font-black text-slate-800">
            {stateLabel(component.confidence)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-400">Coverage</dt>
          <dd className="mt-1 font-black text-slate-800">
            {stateLabel(component.coverage)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-400">Freshness</dt>
          <dd className="mt-1 font-black text-slate-800">
            {stateLabel(component.freshness)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-400">Evidence</dt>
          <dd className="mt-1 font-black text-slate-800">
            {component.evidenceCount} refs
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-400">데이터 기준</p>
        <p className="mt-1 text-sm font-bold text-slate-700">
          {formatDateTime(component.asOf)}
        </p>
        {component.statusReason ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-900">
            현재 제한: {component.statusReason}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default async function FandexBetaArtistPage({ params }: PageProps) {
  const { artistId } = await params;

  if (artistId !== 'iu') {
    notFound();
  }

  const generatedAt = new Date().toISOString();
  const readiness = await getFandexCurrentRuntimeAssemblyReadinessForIU({
    generatedAt,
  });
  const presentation = createFandexBetaArtistPresentation({
    readiness,
    generatedAt,
  });
  // This exposes reviewed release *identity*, not unqualified Hanteo copies.
  const releaseIdentity = buildMusicAlbumVerifiedReleaseIdentity({
    binding: approvedIuReleaseBinding,
    expectedCanonicalArtistId: artistId,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <header className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-950 px-6 py-7 text-white sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                  FANDEX Beta · Live Runtime
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">
                  IU Artist Intelligence
                </h1>
              </div>
              <Link
                href="/artists/iu"
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-black text-white hover:bg-white/10"
              >
                기존 Artist 상세
              </Link>
            </div>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-300">
              현재 Production 환경에서 읽을 수 있는 7개 FANDEX 변수의 실제
              runtime 상태를 한 화면에 표시합니다. Research·Shadow·Production을
              구분하며, 최종 점수와 순위는 methodology 확정 전까지 계산하지
              않습니다.
            </p>
          </div>

          <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4 sm:p-8">
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs font-black text-slate-400">Runtime</p>
              <p className="mt-2 text-2xl font-black">
                {presentation.resolvedVariableCount}/{presentation.totalVariableCount}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">resolved variables</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-black text-emerald-600">Real Production</p>
              <p className="mt-2 text-2xl font-black text-emerald-950">
                {presentation.productionVariableCount}/{presentation.totalVariableCount}
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">
                lifecycle=production · material=real
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-black text-amber-600">Blocked</p>
              <p className="mt-2 text-2xl font-black text-amber-950">
                {presentation.blockedVariableCount}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-700">
                runtime / adapter blocker
              </p>
            </div>
            <div className="rounded-2xl bg-cyan-50 p-4">
              <p className="text-xs font-black text-cyan-600">FANDEX Score</p>
              <p className="mt-2 text-2xl font-black text-cyan-950">산정 보류</p>
              <p className="mt-1 text-xs font-bold text-cyan-700">
                normalization · weights · ranking 미확정
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                Product state
              </p>
              <p className="mt-1 text-lg font-black text-cyan-950">
                {presentation.runtimeStatus === 'assembly-ready'
                  ? '7-variable assembly가 현재 runtime에서 구성됩니다.'
                  : '일부 runtime source가 아직 Product assembly를 막고 있습니다.'}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-800 shadow-sm">
              {formatDateTime(presentation.generatedAt)}
            </span>
          </div>
        </section>

        {releaseIdentity.status === 'verified-identity-only' ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Music Album · Reviewed release identity (not sales Production)
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              {releaseIdentity.releaseTitle} · 꽃갈피 셋
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              실물 발매일: {releaseIdentity.physicalReleaseDate} ·
              앨범 단위 식별 검토 완료
            </p>
            <p className="mt-3 text-sm font-bold text-amber-800">
              초동 판매량: 적격 증빙 대기 · 점수 미산정 · Production 미활성화
            </p>
            <p className="mt-2 text-xs text-slate-500">
              발매 정보 검증은 한터 초동 수량, 집계기간, 이용권한의 검증을 대신하지 않습니다.
            </p>
            <Link
              href="https://www.makestar.com/product/10531"
              className="mt-3 inline-block text-sm font-bold text-cyan-700 underline underline-offset-4"
            >
              실물 발매 정보 출처
            </Link>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {presentation.components.map((component) => (
            <VariableCard key={component.variableId} component={component} />
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">이 Beta가 의미하는 것</h2>
          <div className="mt-4 grid gap-4 text-sm font-bold leading-7 text-slate-600 md:grid-cols-3">
            <p className="rounded-2xl bg-slate-50 p-4">
              <strong className="block text-slate-950">실제 runtime</strong>
              저장된 evidence와 현재 서버 read path에서 얻은 상태만 표시합니다.
            </p>
            <p className="rounded-2xl bg-slate-50 p-4">
              <strong className="block text-slate-950">상태 분리</strong>
              Production, Shadow, Research를 같은 확정값으로 취급하지 않습니다.
            </p>
            <p className="rounded-2xl bg-slate-50 p-4">
              <strong className="block text-slate-950">점수 미정</strong>
              최종 normalization, weight, eligibility, risk 적용과 ranking이
              확정되기 전에는 임의의 FANDEX 점수를 만들지 않습니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
