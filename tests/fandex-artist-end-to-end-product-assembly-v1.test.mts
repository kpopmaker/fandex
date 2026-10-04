import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assembleFandexArtistProductEndToEnd,
  FANDEX_ARTIST_END_TO_END_PRODUCT_ASSEMBLY_VERSION,
} from '../lib/product/assembly/fandexArtistEndToEndProductAssembly';
import type {
  FandexArtistVariableProductOrchestrationInput,
} from '../lib/product/adapters/fandexArtistVariableProductOrchestrator';
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
import {
  SNS_FANDOM_POINT_CONTRACT_VERSION,
  type SnsFandomPointReadinessResult,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  adaptBrandFitPartnershipEvidence,
  type BrandFitPartnershipEvidence,
  type BrandFitPartnershipObservationInput,
} from '../lib/intelligence/brandFitPointConstruct';
import type {
  ProductActivityExposureEvent,
  ProductActivityExposureProviderCoverage,
} from '../lib/product/contracts/productActivityExposure';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../lib/product/contracts/productActivityExposurePublicRoute';
import {
  MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION,
  type MomentumLiveShadowProductReadinessResult,
} from '../lib/product/readiness/momentumLiveShadowProductReadiness';
import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../lib/product/contracts/productMomentumEvidenceConsensus';
import {
  buildRiskAdjustmentCurrentReadinessReport,
} from '../lib/intelligence/riskAdjustmentCurrentReadinessReport';
import type {
  RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  createRiskAdjustmentProductContractCandidate,
} from '../lib/intelligence/riskAdjustmentProductContractCandidate';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
} from '../lib/intelligence/riskAdjustmentQualitySufficiencyWitness';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
} from '../lib/product/contracts/fandexVariableProduct';

function musicCandidate(): ProductMusicAlbumPointCandidateResult {
  const model = {
    contractVersion: 'product-music-album-point-candidate-v1',
    identity: {
      sourceArtistId: 'iu',
      legacyVariableId: 'musicAlbumPoint',
      constructId: 'musicAlbumEvidencePair',
    },
    construct:
      'Music current-chart presence + physical completed-purchase-class album sales',
    components: {
      music: {
        construct: 'current-chart-presence',
        expectedPlatforms: ['melon', 'genie', 'bugs'],
        rows: [],
        rankSemantic: 'ordinal-chart-position',
        presenceSemantic: 'ranked-or-proven-not-ranked',
        numericAggregationDefined: false,
        freshnessThresholdDefined: false,
        canonicalIdentityIntegration: 'external-binding',
        canonicalIdentityBindingAssessment: null,
        currentness: {
          contractVersion: 'music-chart-currentness-v1',
          methodologyDefined: true,
          expectedCadence: 'daily',
          assessmentAsOf: '2026-10-04T00:00:00.000Z',
          latestObservedAt: null,
          latestCollectionDate: null,
          thresholdApplied: false,
          scoreFieldsPresent: false,
          status: 'unknown',
          observationIds: [],
          evidenceRefs: [],
        },
        state: 'blocked',
        blockers: ['missing:melon'],
      },
      album: {
        construct: 'physical completed-purchase-class sales reaction',
        methodologyVersion: 'album-methodology-v1',
        normalizationMethod: 'unresolved',
        normalizationInput: {
          contractVersion: 'album-normalization-input-v1',
          methodologyDefined: true,
          rawProviderAdditionAllowed: false,
          crossProviderAdditionAllowed: false,
          parentChildAdditionAllowed: false,
          skuAdditionToReleaseAllowed: false,
          numericNormalizationDefined: false,
          normalizedValue: null,
          inputSetUsable: false,
          blockers: [],
          groups: [],
        },
        normalizationCalibrationReview: null,
        normalizationCalibrationEvidenceDerivation: null,
        releaseScopeReviewPacket: {} as never,
        normalizationCalibration: {} as never,
        observations: [],
        providers: [{
          providerId: 'hanteo',
          technicalReadiness: 'adapter-ready',
          currentStage: 'research',
          nativePeriodSalesQualified: true,
          historicalQueriesQualified: true,
          revisionsQualified: true,
          artistIdentityQualified: true,
          releaseIdentityQualified: true,
          editionIdentityQualified: true,
          skuIdentityQualified: true,
          productionAllowed: false,
          productionAuthorizationSatisfied: false,
          authorization: {} as never,
          authorizationReviewPacket: {} as never,
          authorizationReview: null,
          blockers: ['rights-not-authorized'],
        }],
        technicallyQualifiedProviders: ['hanteo'],
        productionAuthorizedProviders: [],
        eligibleObservationIds: [],
        physicalUnitSemantic: 'physical-units',
        numericAggregationDefined: false,
        historyState: 'research-only',
        productionHistory: null,
        state: 'technical-only',
        blockers: ['no-production-authorized-provider'],
      },
    },
    temporalAlignment: {} as never,
    combinationBoundary: {
      rawProviderAdditionAllowed: false,
      rawProviderAverageAllowed: false,
      rankToPhysicalUnitsConversionAllowed: false,
      musicAlbumRawAdditionAllowed: false,
      musicAlbumRawAverageAllowed: false,
      weightingDefined: false,
      normalizationDefined: false,
      temporalAlignmentDefined: true,
      productValue: null,
    },
    readiness: {
      componentEvidenceReady: false,
      productContractCandidateReady: false,
      albumNormalizationMethodologyDesignEligible: false,
      numericProductEligible: false,
      productActivationReady: false,
      productPublicationReady: false,
      previewFallbackAllowed: false,
      componentBlockers: [],
      activationBlockers: [],
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
      'album-normalization-defined' as const,
      'numeric-output-methodology-defined' as const,
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
        description: 'end-to-end-contract-input',
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
        storedEvidenceJobIds: ['e2e-news-job'],
      },
    },
  } as ProductVariableReadModelResult;
}

function snsReadiness(): SnsFandomPointReadinessResult {
  return Object.freeze({
    contractVersion: SNS_FANDOM_POINT_CONTRACT_VERSION,
    state: 'source-evidence-incomplete' as const,
    snsFandomPoint: null,
    numericProductEligible: false as const,
    productActivationReady: false as const,
    productPublicationReady: false as const,
    previewFallbackAllowed: false as const,
    crossPlatformRawAverageAllowed: false as const,
    followerCountAloneAllowedAsFandom: false as const,
    mentionCountAloneAllowedAsSnsFandom: false as const,
    observedReactionEvidenceCount: 0,
    contentLevelReactionEvidenceCount: 0,
    temporalPersistenceEvidenceCount: 0,
    productionReadyProviders: Object.freeze([]),
    providerApprovedProviders: Object.freeze([]),
    artistAuthorizedProviders: Object.freeze([]),
    evidenceEligibleProviders: Object.freeze([
      'youtube-data-api' as const,
    ]),
    blockers: Object.freeze([
      'public-reaction-diffusion-evidence-missing',
      'fandom-activity-persistence-history-missing',
    ]),
  });
}

function brandObservation(): BrandFitPartnershipObservationInput {
  return {
    eventId: 'iu-estee-lauder-2026',
    eventType: 'campaign-launched',
    relationshipType: 'ambassador',
    explicitRelationshipClaim: true,
    identity: {
      canonicalArtistId: 'iu',
      canonicalBrandId: 'estee-lauder',
      canonicalCampaignId: 'estee-lauder-iu-2026',
      identityState: 'resolved',
    },
    source: {
      family: 'official-brand-announcement',
      reliability: 'primary-official',
      sourceUrl: 'https://example.com/e2e-brand-fit-evidence',
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
}

function brandEvidence(): BrandFitPartnershipEvidence {
  const result = adaptBrandFitPartnershipEvidence(brandObservation());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') {
    throw new Error('brand_fit_e2e_evidence_invalid');
  }
  return result.evidence;
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
    eventId: 'e2e-event-1',
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
    sourceEntityId: 'rg-e2e-1',
    canonicalFamilyId: null,
    providerArtistId: 'iu-mb',
    providerArtistCredits: Object.freeze([
      Object.freeze({
        providerArtistId: 'iu-mb',
        creditedName: 'IU',
        canonicalProviderName: 'IU',
      }),
    ]),
    evidenceRef: 'evidence:e2e-event-1',
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

function momentumRuntimeShadow():
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
        observationId: 'obs-e2e-momentum-1',
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

function riskInput(
  variableId: RiskAdjustmentUpstreamInput['variableId'],
): RiskAdjustmentUpstreamInput {
  return {
    variableId,
    lifecycleState: 'production',
    materialClass: 'real',
    confidenceState: 'high',
    availabilityState: 'available',
    identityState: 'resolved',
    coverageState: 'complete',
    freshnessState: 'current',
    conflictState: 'none',
    revisionState: 'stable',
    volatilityState: 'ordinary',
    historyState: 'sufficient',
    evidenceRefs: [`evidence:e2e:${variableId}`],
  };
}

function riskPair() {
  const inputs = [
    riskInput('newsIssuePoint'),
    riskInput('comebackActivityPoint'),
  ];

  return {
    candidate: createRiskAdjustmentProductContractCandidate({
      artistId: 'iu',
      inputs,
    }),
    readiness: buildRiskAdjustmentCurrentReadinessReport(
      deriveRiskAdjustmentQualitySufficiencyWitness(inputs),
    ),
  };
}

function upstreamInput():
  FandexArtistVariableProductOrchestrationInput {
  return {
    canonicalArtistId: 'iu',
    musicAlbumPoint: {
      candidate: musicCandidate(),
      readiness: musicReadiness(),
    },
    newsIssuePoint: newsResult(),
    snsFandomPoint: {
      readiness: snsReadiness(),
    },
    brandFitPoint: {
      evidence: [brandEvidence()],
    },
    comebackActivityPoint: activityResult(),
    growthMomentumPoint: {
      runtimeShadow: momentumRuntimeShadow(),
      readiness: momentumReadiness(),
    },
    riskAdjustmentPoint: riskPair(),
  };
}

test('artist end-to-end assembly invokes all seven common adapters and reaches the internal read model', () => {
  const result = assembleFandexArtistProductEndToEnd({
    ...upstreamInput(),
    universeVersion: 'e2e-artist-universe-v1',
    artists: [{ id: 'iu' }, { id: 'blackpink' }],
    generatedAt: '2026-10-04T02:00:00.000Z',
  });

  assert.equal(
    result.contractVersion,
    FANDEX_ARTIST_END_TO_END_PRODUCT_ASSEMBLY_VERSION,
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(
    result.orchestration.snapshot.records.map(
      (record) => record.variableId,
    ),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );
  assert.deepEqual(
    result.assembly.readModel.components.map(
      (component) => component.variableId,
    ),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );
  assert.equal(result.assembly.api.status, 'ok');
  assert.equal(result.assembly.readModel.canonicalArtistId, 'iu');
  assert.equal(result.assembly.readModel.fandexValue, null);
  assert.equal(result.assembly.readModel.fandexCandidateEligible, null);
  assert.equal(result.assembly.readModel.methodologyVersion, null);

  assert.deepEqual(
    result.assembly.readModel.byVariable.newsIssuePoint.valueRepresentation,
    {
      kind: 'numeric',
      value: 0,
      unit: null,
    },
  );
  assert.deepEqual(
    result.assembly.readModel.byVariable.newsIssuePoint.time.observationTime,
    {
      kind: 'period',
      start: '2026-10-04T00:00:00.000Z',
      end: '2026-10-04T01:00:00.000Z',
    },
  );
  assert.deepEqual(
    result.assembly.readModel.byVariable.newsIssuePoint.time.collectionTime,
    null,
  );
});

test('artist end-to-end assembly fails closed at orchestration when a real adapter input is blocked', () => {
  const input = upstreamInput();
  const result = assembleFandexArtistProductEndToEnd({
    ...input,
    musicAlbumPoint: {
      ...input.musicAlbumPoint,
      candidate: {
        status: 'data-issue',
        issues: [{
          code: 'album-production-history-missing',
        }],
      },
    },
    universeVersion: 'e2e-artist-universe-v1',
    artists: [{ id: 'iu' }],
    generatedAt: '2026-10-04T02:00:00.000Z',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;

  assert.equal(result.stage, 'orchestration');
  if (result.stage !== 'orchestration') return;

  assert.equal(result.orchestration.blocker, 'adapter-output-blocked');
  assert.deepEqual(result.orchestration.failures, [{
    variableId: 'musicAlbumPoint',
    reason: 'adapter-blocked:upstream-candidate-not-ok',
  }]);
  assert.equal(result.api.reason, 'product-candidate-unavailable');
  assert.equal('assembly' in result, false);
});
