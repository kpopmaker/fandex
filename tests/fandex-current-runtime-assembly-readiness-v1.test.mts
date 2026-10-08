import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptBrandFitPartnershipEvidence,
  type BrandFitPartnershipObservationInput,
} from '../lib/intelligence/brandFitPointConstruct';
import {
  evaluateSnsFandomPointReadiness,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  buildFandexCurrentRuntimeAssemblyReadiness,
} from '../lib/product/runtime/fandexCurrentRuntimeAssemblyReadiness';
import type {
  ProductMusicAlbumPointCandidateReadModel,
  ProductMusicAlbumPointCandidateResult,
} from '../lib/product/contracts/productMusicAlbumPointCandidate';
import {
  MUSIC_ALBUM_POINT_PRODUCT_READINESS_VERSION,
  type MusicAlbumPointProductReadiness,
} from '../lib/product/readiness/musicAlbumPointProductReadiness';
import type {
  ProductVariableReadModelResult,
} from '../lib/product/contracts/productVariable';
import type {
  ProductActivityExposureEvent,
  ProductActivityExposureProviderCoverage,
} from '../lib/product/contracts/productActivityExposure';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../lib/product/contracts/productActivityExposurePublicRoute';
import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../lib/product/contracts/productMomentumEvidenceConsensus';
import {
  MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION,
  type MomentumLiveShadowProductReadinessResult,
} from '../lib/product/readiness/momentumLiveShadowProductReadiness';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
} from '../lib/product/contracts/fandexVariableProduct';
import {
  createFandexBetaArtistPresentation,
} from '../lib/product/presentation/fandexBetaArtistPresentation';

function musicCandidate(): ProductMusicAlbumPointCandidateResult {
  const model = {
    contractVersion: 'product-music-album-point-candidate-v1',
    identity: {
      sourceArtistId: 'iu',
      legacyVariableId: 'musicAlbumPoint',
      constructId: 'musicAlbumEvidencePair',
    },
    components: {
      music: {
        currentness: {
          contractVersion: 'music-chart-currentness-v1',
          status: 'current',
        },
      },
      album: {
        methodologyVersion: 'album-methodology-v1',
        providers: [],
        observations: [],
        historyState: 'research-only',
      },
    },
    combinationBoundary: {
      productValue: null,
    },
    dataOrigin: 'observed',
    publication: 'shadow',
    presentation: 'standard',
    previewFallbackUsed: false,
    productMetricReadPerformed: false,
    numericProductEligible: false,
  } as unknown as ProductMusicAlbumPointCandidateReadModel;

  return Object.freeze({
    status: 'ok' as const,
    model,
  });
}

function musicReadiness(): MusicAlbumPointProductReadiness {
  return Object.freeze({
    contractVersion: MUSIC_ALBUM_POINT_PRODUCT_READINESS_VERSION,
    target: Object.freeze({
      legacyVariableId: 'musicAlbumPoint' as const,
      constructId: 'musicAlbumEvidencePair' as const,
    }),
    status: 'blocked' as const,
    checks: {} as MusicAlbumPointProductReadiness['checks'],
    blockers: Object.freeze([
      'album-rights-authorized' as const,
    ]),
    productActivationAuthorized: false as const,
    productPublicationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    productValue: null,
    numericProductEligible: false as const,
    previewFallbackAllowed: false as const,
    directProductionContributionEligible: false as const,
  });
}

function newsResult(): ProductVariableReadModelResult {
  return {
    status: 'ok',
    model: {
      identity: {
        sourceArtistId: 'iu',
        variableId: 'newsIssuePoint',
        sourceVariableKey: 'newsIssuePoint',
      },
      definition: {
        variableId: 'newsIssuePoint',
        sourceKey: 'newsIssuePoint',
        displayName: '뉴스/이슈',
        description: 'runtime-readiness-test',
        relatedSourceMetricKeys: [],
        evidenceRelation: {
          kind: 'legacy-issue-signal-key',
          sourceKey: 'newsIssuePoint',
        },
      },
      fact: {
        availability: 'available',
        value: 0,
      },
      series: [],
      observationTime: {
        kind: 'period',
        start: '2026-10-04T00:00:00.000Z',
        end: '2026-10-04T01:00:00.000Z',
      },
      presentation: 'standard',
      dataOrigin: 'observed',
      publication: 'production',
      sourceMetadata: {
        sourceKind: 'naver-news-issue-point-frozen-methodology',
        sourceArtistId: 'iu',
        sourceVariableKey: 'newsIssuePoint',
        sourceTimeLabel: '2026-10-04T01:00:00.000Z',
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-01T00:00:00.000Z',
        throughSlotStart: '2026-10-04T01:00:00.000Z',
        selectedWindowSlotCount: 8,
        normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
        baselineReadinessStatus: 'replicated_cycle_history',
        currentActivityRate: 0,
        priorDefinedWindowCount: 12,
        priorLessThanLatestCount: 0,
        priorEqualToLatestCount: 12,
        priorGreaterThanLatestCount: 0,
      },
      evidenceTrace: {
        kind: 'naver-news-issue-point-stored-evidence',
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-01T00:00:00.000Z',
        throughSlotStart: '2026-10-04T01:00:00.000Z',
        currentWindow: null,
        eligiblePriorWindows: [],
        storedEvidenceJobIds: ['runtime-news-job'],
      },
    },
  } as ProductVariableReadModelResult;
}

const activityCoverage: readonly ProductActivityExposureProviderCoverage[] =
  Object.freeze([
    Object.freeze({
      provider: 'musicbrainz' as const,
      providerArtistId: 'iu-mb',
      collectionStatus: 'succeeded' as const,
      coverageState: 'covered' as const,
      collectedAt: '2026-10-04T01:00:00.000Z',
    }),
    Object.freeze({
      provider: 'youtube' as const,
      providerArtistId: 'iu-yt',
      collectionStatus: 'succeeded' as const,
      coverageState: 'covered' as const,
      collectedAt: '2026-10-04T01:00:00.000Z',
    }),
  ]);

function activityEvent(): ProductActivityExposureEvent {
  return Object.freeze({
    artistId: 'iu',
    eventId: 'runtime-event-1',
    eventFamily: 'release',
    eventType: 'confirmed_release',
    lifecycleState: 'observed',
    participationScope: 'solo',
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt: '2026-10-04',
    occurredAtPrecision: 'day',
    sourcePublishedAt: '2026-10-04T00:00:00.000Z',
    collectedAt: '2026-10-04T01:00:00.000Z',
    sourceProvider: 'musicbrainz',
    sourceEntityType: 'release-group',
    sourceEntityId: 'runtime-rg-1',
    canonicalFamilyId: null,
    providerArtistId: 'iu-mb',
    providerArtistCredits: Object.freeze([
      Object.freeze({
        providerArtistId: 'iu-mb',
        creditedName: 'IU',
        canonicalProviderName: 'IU',
      }),
    ]),
    evidenceRef: 'evidence:runtime-event-1',
    identityState: 'resolved',
    missingState: 'covered',
    evidenceState: 'observed',
    conflictState: 'none',
    timeZoneState: 'not-applicable',
    revisionId: 'rev-1',
    supersedesRevisionId: null,
    storedEvidenceTrace: Object.freeze({
      eventRecordId: 'a'.repeat(64),
      sourceObservationId: 'b'.repeat(64),
    }),
  });
}

function activityResult(): ProductActivityExposurePublicRouteResult {
  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      contractVersion: 'product-activity-exposure-v1' as const,
      identity: Object.freeze({
        sourceArtistId: 'iu',
        constructId: 'activityExposure' as const,
      }),
      construct: 'Activity Exposure Event Stream' as const,
      events: Object.freeze([activityEvent()]),
      providerCoverage: activityCoverage,
      dataOrigin: 'observed' as const,
      publication: 'production' as const,
      presentation: 'standard' as const,
    }),
  });
}

function momentumShadow():
  ProductMomentumEvidenceConsensusReadModelResult {
  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      contractVersion: 'product-momentum-evidence-consensus-v1' as const,
      identity: Object.freeze({
        sourceArtistId: 'iu',
        constructId: 'momentumEvidenceConsensus' as const,
      }),
      construct: 'Momentum Evidence Consensus' as const,
      evidence: Object.freeze({
        alignmentCutoffAt: '2026-10-04T01:00:00.000Z',
        directionalConsensus: 'direction-conflicted' as const,
        persistenceConsensus: 'persistence-not-applicable' as const,
        qualitativeDirectionEvidenceUsable: false,
        conflictState: 'detected' as const,
      }),
      requiredFamilies: Object.freeze([
        'audience-consumption',
        'media-attention',
      ] as const),
      sourceCarrier: Object.freeze({
        variableId:
          'momentum.cross-family-evidence-state.research' as const,
        lifecycleState: 'research' as const,
        materialClass: 'real' as const,
      }),
      storedEvidenceTrace: Object.freeze({
        carrierRecordId: 'c'.repeat(64),
        observationId: 'obs-runtime-momentum',
        sourceV143Digest: 'd'.repeat(64),
        observationDigest: 'e'.repeat(64),
      }),
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    }),
  });
}

function momentumReadiness():
  MomentumLiveShadowProductReadinessResult {
  return Object.freeze({
    contractVersion: MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION,
    state: 'current-categorical-evaluation-required' as const,
    productActivationReady: false as const,
    productPublicationReady: false as const,
    publicRouteDesignReady: false,
    productMomentumScore: null,
    numericProductEligible: false as const,
    previewFallbackAllowed: false as const,
    runtimeShadowReadVerified: true,
    currentCarrier: Object.freeze({
      carrierRecordId: 'c'.repeat(64),
      alignmentCutoffAt: '2026-10-04T01:00:00.000Z',
      directionalConsensus: 'direction-conflicted',
      persistenceConsensus: 'persistence-not-applicable',
      historicalOnly: true,
    }),
    sourceCurrentness: Object.freeze({
      lastfmSourceAdvancedBeyondCarrierCutoff: true,
      naverSchedulerObservedAfterCarrierCutoff: true,
      naverCurrentStoredEvidenceReproducedForReadiness: false,
      sourceAdvancementObserved: true,
    }),
    freshnessPolicy: Object.freeze({
      arbitraryAgeThresholdAllowed: false as const,
      maximumAgeDays: null,
      currentCategoricalEvaluationRequiredAfterSourceAdvancement:
        true as const,
      newHistoryObservationRequiredBeforeEvaluation: false as const,
      historyAppendDecision:
        'defer-until-current-evaluation' as const,
    }),
    currentEvaluation: Object.freeze({
      performed: false,
      currentCarrierProduced: false,
      currentNoOpEvaluationAttested: false,
      satisfiesFreshness: false,
      evaluatedAlignmentCutoffAt: null,
      directionalConsensus: null,
      persistenceConsensus: null,
      attestationPath: null,
      attestationDigest: null,
    }),
    blockers: Object.freeze([
      'current-dual-source-categorical-evaluation-not-performed',
      'historical-carrier-not-current-activation-evidence',
    ]),
  });
}

function brandEvidence() {
  const observation: BrandFitPartnershipObservationInput = {
    eventId: 'iu-estee-lauder-runtime',
    eventType: 'campaign-launched',
    relationshipType: 'ambassador',
    explicitRelationshipClaim: true,
    identity: {
      canonicalArtistId: 'iu',
      canonicalBrandId: 'estee-lauder',
      canonicalCampaignId: 'estee-lauder-iu-runtime',
      identityState: 'resolved',
    },
    source: {
      family: 'official-brand-announcement',
      reliability: 'primary-official',
      sourceUrl: 'https://example.com/runtime-brand-evidence',
      sourcePublishedAt: '2026-09-02T00:00:00.000Z',
      rightsState: 'restricted',
    },
    time: {
      activityStartAt: '2026-09-05T00:00:00.000Z',
      activityEndAt: null,
      collectedAt: '2026-09-03T12:00:00.000Z',
    },
    revision: {
      revisionId: 'rev-1',
      supersedesRevisionId: null,
    },
  };

  const result = adaptBrandFitPartnershipEvidence(observation);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') {
    throw new Error('runtime_brand_evidence_invalid');
  }
  return result.evidence;
}

function baseSources() {
  return {
    musicAlbumPoint: {
      status: 'ok' as const,
      candidate: musicCandidate(),
      readiness: musicReadiness(),
    },
    newsIssuePoint: newsResult(),
    snsFandomPoint: {
      status: 'ok' as const,
      readiness: evaluateSnsFandomPointReadiness({
        canonicalArtistId: 'iu',
        observations: [],
        providerApprovals: [],
        artistEntitlements: [],
      }),
    },
    brandFitPoint: {
      status: 'unavailable' as const,
      reason:
        'durable-stored-evidence-reader-not-implemented' as const,
    },
    comebackActivityPoint: activityResult(),
    growthMomentumPoint: {
      runtimeShadow: momentumShadow(),
      readiness: momentumReadiness(),
    },
  };
}

test('current runtime readiness resolves six common Product records and isolates brandFit as the only missing runtime source', () => {
  const result = buildFandexCurrentRuntimeAssemblyReadiness({
    sources: baseSources(),
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    generatedAt: '2026-10-04T07:10:00.000Z',
  });

  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.blockedVariableIds, ['brandFitPoint']);
  assert.deepEqual(result.resolvedVariableIds, [
    'musicAlbumPoint',
    'newsIssuePoint',
    'snsFandomPoint',
    'comebackActivityPoint',
    'growthMomentumPoint',
    'riskAdjustmentPoint',
  ]);
  assert.equal(result.records.length, 6);
  assert.equal(result.assembly, null);

  const brand = result.variableStates.find(
    (entry) => entry.variableId === 'brandFitPoint',
  );
  assert.deepEqual(brand, {
    variableId: 'brandFitPoint',
    sourceState: 'runtime-source-unavailable',
    adapterState: 'not-run',
    reason: 'durable-stored-evidence-reader-not-implemented',
  });

  const risk = result.variableStates.find(
    (entry) => entry.variableId === 'riskAdjustmentPoint',
  );
  assert.equal(risk?.sourceState, 'derived');
  assert.equal(risk?.adapterState, 'ok');

  const news = result.records.find(
    (entry) => entry.variableId === 'newsIssuePoint',
  );
  assert.deepEqual(news?.valueRepresentation, {
    kind: 'numeric',
    value: 0,
    unit: null,
  });
});

test('adding durable brandFit evidence makes the same runtime builder reach full seven-variable assembly without defining a score', () => {
  const sources = baseSources();
  const result = buildFandexCurrentRuntimeAssemblyReadiness({
    sources: {
      ...sources,
      brandFitPoint: {
        status: 'ok',
        evidence: [brandEvidence()],
      },
    },
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    generatedAt: '2026-10-04T07:10:00.000Z',
  });

  assert.equal(result.status, 'assembly-ready');
  assert.deepEqual(result.blockedVariableIds, []);
  assert.deepEqual(result.resolvedVariableIds, FANDEX_VARIABLE_PRODUCT_IDS);
  assert.equal(result.records.length, 7);

  const brandFitRecord = result.records.find(
    (record) => record.variableId === 'brandFitPoint',
  );
  assert.ok(brandFitRecord);
  assert.equal(brandFitRecord?.lifecycleState, 'production');
  assert.equal(brandFitRecord?.materialClass, 'real');
  assert.equal(brandFitRecord?.readinessState, 'production');
  assert.equal(brandFitRecord?.availability, 'available');
  assert.equal(
    brandFitRecord?.evidenceRefs.includes(
      'brand-fit-lifecycle-cutover-executed:true',
    ),
    true,
  );
  assert.equal(
    brandFitRecord?.evidenceRefs.includes(
      'brand-fit-publication-authorized:true',
    ),
    false,
  );
  assert.equal(
    brandFitRecord?.evidenceRefs.includes(
      'brand-fit-risk-consumption-authorized:true',
    ),
    false,
  );

  assert.equal(result.assembly?.status, 'ok');

  if (result.assembly?.status !== 'ok') return;
  assert.equal(result.assembly.readModel.canonicalArtistId, 'iu');
  assert.equal(result.assembly.readModel.fandexValue, null);
  assert.equal(result.assembly.readModel.fandexCandidateEligible, null);
  assert.equal(result.assembly.readModel.methodologyVersion, null);
  assert.equal(result.scoreCalculated, false);
  assert.equal(result.methodologyFinalized, false);
  assert.equal(result.publicRouteActivated, false);
});


test('Momentum readiness failures preserve exact upstream blocker codes without resolving or scoring the variable', () => {
  const sources = baseSources();
  const result = buildFandexCurrentRuntimeAssemblyReadiness({
    sources: {
      ...sources,
      brandFitPoint: {
        status: 'ok',
        evidence: [brandEvidence()],
      },
      growthMomentumPoint: {
        runtimeShadow: sources.growthMomentumPoint.runtimeShadow,
        readiness: {
          ...sources.growthMomentumPoint.readiness,
          state: 'blocked',
          blockers: [
            'current-lastfm-source-advanced-beyond-audit',
            'historical-carrier-not-current-activation-evidence',
          ],
        },
      },
    },
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    generatedAt: '2026-10-08T00:17:00.000Z',
  });

  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.blockedVariableIds, ['growthMomentumPoint']);
  assert.equal(result.resolvedVariableIds.length, 6);
  assert.equal(result.assembly, null);
  assert.equal(result.scoreCalculated, false);
  assert.equal(result.publicRouteActivated, false);

  const momentum = result.variableStates.find(
    (entry) => entry.variableId === 'growthMomentumPoint',
  );
  assert.equal(momentum?.adapterState, 'blocked');
  assert.equal(
    momentum?.reason,
    'upstream-readiness-blocked'
      + '|current-lastfm-source-advanced-beyond-audit'
      + '|historical-carrier-not-current-activation-evidence',
  );
  assert.equal(
    result.records.some((record) => record.variableId === 'growthMomentumPoint'),
    false,
  );

  const presentation = createFandexBetaArtistPresentation({
    readiness: result,
    generatedAt: '2026-10-08T00:17:00.000Z',
  });
  const momentumCard = presentation.components.find(
    (entry) => entry.variableId === 'growthMomentumPoint',
  );
  assert.equal(momentumCard?.statusReason, momentum?.reason);
  assert.equal(momentumCard?.displayValue, '런타임 확인 필요');
  assert.equal(presentation.scoreStatus, 'not-defined');
  assert.equal(presentation.fandexValue, null);
});

test('Momentum diagnosis preserves generic fallback when no upstream blocker details exist', () => {
  const sources = baseSources();
  const result = buildFandexCurrentRuntimeAssemblyReadiness({
    sources: {
      ...sources,
      brandFitPoint: {
        status: 'ok',
        evidence: [brandEvidence()],
      },
      growthMomentumPoint: {
        runtimeShadow: sources.growthMomentumPoint.runtimeShadow,
        readiness: {
          ...sources.growthMomentumPoint.readiness,
          state: 'blocked',
          blockers: [],
        },
      },
    },
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    generatedAt: '2026-10-08T00:17:00.000Z',
  });
  const momentum = result.variableStates.find(
    (entry) => entry.variableId === 'growthMomentumPoint',
  );
  assert.equal(momentum?.reason, 'upstream-readiness-blocked');
  assert.equal(result.assembly, null);
});
