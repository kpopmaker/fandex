import 'server-only';

import {
  getNaverNewsIssuePointRealProductVariable,
  getNaverNewsIssuePointRealProductVariableAtLatestOfficialSlot,
} from '@/lib/server/product/naverNewsIssuePointRealProductRead';

export const dynamic = 'force-dynamic';

const CONTRACT_VERSION =
  'momentum-current-naver-frozen-read-v1' as const;
const ALLOWED_BRANCH =
  'integration/momentum-current-dual-source-evaluation-v1';

function previewScopeAllowed(): boolean {
  return (
    process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === ALLOWED_BRANCH
  );
}

function exactIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value
  );
}

export async function GET(request: Request): Promise<Response> {
  if (!previewScopeAllowed()) {
    return Response.json(
      { ok: false, code: 'preview_scope_required' },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const requestedThroughSlotStart =
    url.searchParams.get('throughSlotStart');

  if (
    requestedThroughSlotStart !== null
    && !exactIso(requestedThroughSlotStart)
  ) {
    return Response.json(
      { ok: false, code: 'through_slot_start_invalid' },
      { status: 400 },
    );
  }

  const result = requestedThroughSlotStart === null
    ? await getNaverNewsIssuePointRealProductVariableAtLatestOfficialSlot()
    : await getNaverNewsIssuePointRealProductVariable({
        throughSlotStart: requestedThroughSlotStart,
      });

  if (result.status !== 'ok') {
    return Response.json(
      {
        ok: false,
        contractVersion: CONTRACT_VERSION,
        status: result.status,
        issues: result.issues,
        sourceMetadata: result.sourceMetadata,
      },
      { status: 409 },
    );
  }

  const { model } = result;
  if (
    model.identity.sourceArtistId !== 'iu'
    || model.identity.variableId !== 'newsIssuePoint'
    || model.sourceMetadata.sourceKind
      !== 'naver-news-issue-point-frozen-methodology'
    || model.evidenceTrace.kind
      !== 'naver-news-issue-point-stored-evidence'
  ) {
    return Response.json(
      { ok: false, code: 'real_read_model_scope_mismatch' },
      { status: 409 },
    );
  }

  return Response.json({
    ok: true,
    contractVersion: CONTRACT_VERSION,
    lifecycle: 'research-read-only',
    productActivationPerformed: false,
    productPublicationPerformed: false,
    registryMutationPerformed: false,
    databaseMutationAllowed: false,
    previewFallbackUsed: false,
    canonicalArtistId: model.identity.sourceArtistId,
    variableId: model.identity.variableId,
    requestedThroughSlotStart,
    frozenMethodology: {
      methodologyVersion: model.sourceMetadata.methodologyVersion,
      protocolStart: model.sourceMetadata.officialShadowEpoch,
      throughSlotStart: model.sourceMetadata.throughSlotStart,
      selectedWindowSlotCount:
        model.sourceMetadata.selectedWindowSlotCount,
      normalizationType: model.sourceMetadata.normalizationType,
      baselineReadinessStatus:
        model.sourceMetadata.baselineReadinessStatus,
      score: model.fact.value,
      availability: model.fact.availability,
      currentActivityRate:
        model.sourceMetadata.currentActivityRate,
      priorDefinedWindowCount:
        model.sourceMetadata.priorDefinedWindowCount,
      priorLessThanLatestCount:
        model.sourceMetadata.priorLessThanLatestCount,
      priorEqualToLatestCount:
        model.sourceMetadata.priorEqualToLatestCount,
      priorGreaterThanLatestCount:
        model.sourceMetadata.priorGreaterThanLatestCount,
    },
    evidenceTrace: model.evidenceTrace,
  });
}
