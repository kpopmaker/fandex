import { sha256Canonical } from '../shared/canonicalDigest';
import {
  LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_VERSION,
  type LastfmMomentumConstructAlignment,
} from './momentumConstructAlignment';

export const FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_VERSION =
  'v139_fandex_momentum_product_construct_research_v1' as const;

export const FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  variableId: 'momentum' as const,
  construct: 'cross-family-persistence-of-recent-directional-reaction-change' as const,
  outputKind: 'composite-derived-signal' as const,
  directSingleProviderReplacementAllowed: false as const,
  crossFamilyEvidenceRequired: true as const,
  singleFamilySufficient: false as const,
  rawCrossProviderAveragingAllowed: false as const,
  missingComponentAsZeroAllowed: false as const,
  missingComponentAsStableAllowed: false as const,
  eventExposureAsReactionAllowed: false as const,
  sameUnderlyingPhenomenonDoubleCountingAllowed: false as const,
  componentNormalizationMethodFrozen: false as const,
  componentWeightingFrozen: false as const,
  compositeScoreFormulaFrozen: false as const,
  methodologyFreezePerformed: false as const,
  productActivationAllowed: false as const,
  productionEligible: false as const,
});

export const FANDEX_MOMENTUM_COMPONENT_FAMILIES = Object.freeze([
  'audience-consumption',
  'media-attention',
  'video-engagement',
  'search-demand',
  'social-fandom',
] as const);

export type FandexMomentumComponentFamily =
  typeof FANDEX_MOMENTUM_COMPONENT_FAMILIES[number];

export type FandexMomentumComponentState =
  | 'component-research-candidate'
  | 'derivation-research-required'
  | 'source-not-ready'
  | 'excluded-from-core-construct';

export type FandexMomentumComponentDefinition = Readonly<{
  componentId: string;
  family: FandexMomentumComponentFamily | 'activity-exposure' | 'album-purchase-reaction';
  construct: string;
  role: 'reaction-outcome' | 'context-only';
  requiredTemporalProperty:
    | 'repeated-comparable-observations'
    | 'release-relative-event-observations';
  currentState: FandexMomentumComponentState;
  directProductContributionEligible: false;
  blockers: readonly string[];
}>;

export const FANDEX_MOMENTUM_COMPONENT_CATALOG =
  Object.freeze([
    Object.freeze({
      componentId: 'lastfm-audience-consumption-growth-persistence',
      family: 'audience-consumption',
      construct: 'persistence of recent listener/playcount growth',
      role: 'reaction-outcome',
      requiredTemporalProperty: 'repeated-comparable-observations',
      currentState: 'component-research-candidate',
      directProductContributionEligible: false,
      blockers: Object.freeze([
        'component-normalization-not-frozen',
        'cross-family-composite-evidence-not-yet-ready',
      ]),
    }),
    Object.freeze({
      componentId: 'naver-media-attention-change-persistence',
      family: 'media-attention',
      construct: 'persistence of recent change in canonical media attention activity',
      role: 'reaction-outcome',
      requiredTemporalProperty: 'repeated-comparable-observations',
      currentState: 'derivation-research-required',
      directProductContributionEligible: false,
      blockers: Object.freeze([
        'momentum-specific-change-derivation-not-frozen',
        'component-normalization-not-frozen',
      ]),
    }),
    Object.freeze({
      componentId: 'youtube-video-engagement-growth-persistence',
      family: 'video-engagement',
      construct: 'persistence of recent video attention and engagement growth',
      role: 'reaction-outcome',
      requiredTemporalProperty: 'repeated-comparable-observations',
      currentState: 'source-not-ready',
      directProductContributionEligible: false,
      blockers: Object.freeze([
        'canonical-repeated-real-source-series-not-ready',
      ]),
    }),
    Object.freeze({
      componentId: 'search-demand-growth-persistence',
      family: 'search-demand',
      construct: 'persistence of recent search demand growth',
      role: 'reaction-outcome',
      requiredTemporalProperty: 'repeated-comparable-observations',
      currentState: 'source-not-ready',
      directProductContributionEligible: false,
      blockers: Object.freeze([
        'canonical-repeated-real-source-series-not-ready',
      ]),
    }),
    Object.freeze({
      componentId: 'social-fandom-growth-persistence',
      family: 'social-fandom',
      construct: 'persistence of recent social and fandom response growth',
      role: 'reaction-outcome',
      requiredTemporalProperty: 'repeated-comparable-observations',
      currentState: 'source-not-ready',
      directProductContributionEligible: false,
      blockers: Object.freeze([
        'canonical-repeated-real-source-series-not-ready',
      ]),
    }),
    Object.freeze({
      componentId: 'activity-exposure-context',
      family: 'activity-exposure',
      construct: 'comeback, promotion, tour, broadcast, and release exposure context',
      role: 'context-only',
      requiredTemporalProperty: 'repeated-comparable-observations',
      currentState: 'excluded-from-core-construct',
      directProductContributionEligible: false,
      blockers: Object.freeze([
        'exposure-is-not-reaction-outcome',
        'cause-outcome-mixing-risk',
      ]),
    }),
    Object.freeze({
      componentId: 'album-purchase-reaction-context',
      family: 'album-purchase-reaction',
      construct: 'release-relative completed-purchase-class album reaction',
      role: 'context-only',
      requiredTemporalProperty: 'release-relative-event-observations',
      currentState: 'excluded-from-core-construct',
      directProductContributionEligible: false,
      blockers: Object.freeze([
        'event-bounded-cadence-not-continuous-artist-momentum',
        'cross-release-comparability-required',
      ]),
    }),
  ] satisfies readonly FandexMomentumComponentDefinition[]);

export type FandexMomentumProductConstructResearch = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_VERSION;
  state: 'construct-defined-composite-not-ready' | 'blocked';
  variableId: 'momentum';
  construct: 'cross-family-persistence-of-recent-directional-reaction-change';
  semanticRules: Readonly<{
    outputRepresents: 'recent-directional-reaction-change-persistence';
    crossFamilyEvidenceRequired: true;
    singleFamilySufficient: false;
    rawCrossProviderAveragingAllowed: false;
    missingComponentAsZeroAllowed: false;
    missingComponentAsStableAllowed: false;
    observationTimeCollectionTimeInterchangeable: false;
    eventExposureAsReactionAllowed: false;
    sameUnderlyingPhenomenonDoubleCountingAllowed: false;
  }>;
  admittedComponentFamilies: readonly FandexMomentumComponentFamily[];
  currentComponentCatalog: readonly FandexMomentumComponentDefinition[];
  lastfmAlignment: Readonly<{
    sourceVersion: typeof LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_VERSION;
    state: LastfmMomentumConstructAlignment['state'];
    acceptedRole: 'component-input-research';
    directReplacementAllowed: false;
  }>;
  freezeStatus: Readonly<{
    constructSemantics: 'defined-research';
    componentAdmissionRules: 'defined-research';
    componentNormalization: 'not-frozen';
    componentWeighting: 'not-frozen';
    compositeScoreFormula: 'not-frozen';
    temporalAlignmentPolicy: 'not-frozen';
    missingnessAggregationPolicy: 'not-frozen';
  }>;
  blockers: readonly string[];
  digest: string;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
}>;

export function evaluateFandexMomentumProductConstructResearch(
  lastfmAlignment: LastfmMomentumConstructAlignment,
): FandexMomentumProductConstructResearch {
  const hardBlockers: string[] = [];
  if (lastfmAlignment.contractVersion !== LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_VERSION) {
    hardBlockers.push('lastfm-alignment-contract-incompatible');
  }
  if (lastfmAlignment.effects.externalCalls !== 0
      || lastfmAlignment.effects.databaseWrites !== 0
      || lastfmAlignment.effects.masterScoreWrites !== 0
      || lastfmAlignment.effects.websiteWrites !== 0) {
    hardBlockers.push('lastfm-alignment-side-effects-not-read-only');
  }
  if (lastfmAlignment.decision.directReplacementAllowed !== false
      || lastfmAlignment.decision.productionEligible !== false) {
    hardBlockers.push('lastfm-alignment-product-boundary-violated');
  }

  const blockers = Object.freeze([
    ...hardBlockers,
    ...(hardBlockers.length === 0
      ? [
          'cross-family-composite-evidence-not-yet-ready',
          'component-normalization-not-frozen',
          'component-weighting-not-frozen',
          'composite-score-formula-not-frozen',
          'temporal-alignment-policy-not-frozen',
          'missingness-aggregation-policy-not-frozen',
        ]
      : []),
  ]);

  const payload = {
    contractVersion: FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_VERSION,
    state: hardBlockers.length > 0
      ? 'blocked' as const
      : 'construct-defined-composite-not-ready' as const,
    variableId: 'momentum' as const,
    construct: 'cross-family-persistence-of-recent-directional-reaction-change' as const,
    semanticRules: {
      outputRepresents: 'recent-directional-reaction-change-persistence' as const,
      crossFamilyEvidenceRequired: true as const,
      singleFamilySufficient: false as const,
      rawCrossProviderAveragingAllowed: false as const,
      missingComponentAsZeroAllowed: false as const,
      missingComponentAsStableAllowed: false as const,
      observationTimeCollectionTimeInterchangeable: false as const,
      eventExposureAsReactionAllowed: false as const,
      sameUnderlyingPhenomenonDoubleCountingAllowed: false as const,
    },
    admittedComponentFamilies: Object.freeze([
      'audience-consumption',
      'media-attention',
      'video-engagement',
      'search-demand',
      'social-fandom',
    ] as const),
    currentComponentCatalog: FANDEX_MOMENTUM_COMPONENT_CATALOG,
    lastfmAlignment: {
      sourceVersion: lastfmAlignment.contractVersion,
      state: lastfmAlignment.state,
      acceptedRole: 'component-input-research' as const,
      directReplacementAllowed: false as const,
    },
    freezeStatus: {
      constructSemantics: 'defined-research' as const,
      componentAdmissionRules: 'defined-research' as const,
      componentNormalization: 'not-frozen' as const,
      componentWeighting: 'not-frozen' as const,
      compositeScoreFormula: 'not-frozen' as const,
      temporalAlignmentPolicy: 'not-frozen' as const,
      missingnessAggregationPolicy: 'not-frozen' as const,
    },
    blockers,
  };

  return Object.freeze({
    ...payload,
    semanticRules: Object.freeze(payload.semanticRules),
    lastfmAlignment: Object.freeze(payload.lastfmAlignment),
    freezeStatus: Object.freeze(payload.freezeStatus),
    digest: sha256Canonical(payload),
    effects: Object.freeze({
      externalCalls: 0 as const,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      masterScoreWrites: 0 as const,
      websiteWrites: 0 as const,
    }),
  });
}
