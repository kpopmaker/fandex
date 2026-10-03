import {
  FANDEX_PRODUCT_OPERATIONS_CONTRACT_VERSION,
  type FandexProductOperations,
  type FandexProductVersioning,
} from './fandexProductOperations';
import {
  FANDEX_PRODUCT_READ_MODEL_AUDIENCE,
  FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION,
  type FandexProductReadModel,
} from './fandexProductReadModel';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from './fandexVariableProduct';

export const FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION =
  'fandex-historical-validation-v1' as const;

export const FANDEX_HISTORICAL_VALIDATION_PURPOSE =
  'historical-input-integrity' as const;

export type FandexHistoricalTemporalIssueSeverity =
  | 'violation'
  | 'unknown';

export type FandexHistoricalTemporalIssueCode =
  | 'observation-after-evaluation'
  | 'component-as-of-after-evaluation'
  | 'collection-after-knowledge-cutoff'
  | 'observation-time-unknown'
  | 'collection-time-unknown';

export type FandexHistoricalTemporalIssue = Readonly<{
  variableId: FandexVariableProductId;
  severity: FandexHistoricalTemporalIssueSeverity;
  code: FandexHistoricalTemporalIssueCode;
}>;

export type FandexHistoricalTemporalIntegrity = Readonly<{
  status: 'clear' | 'indeterminate' | 'issues-present';
  issues: readonly FandexHistoricalTemporalIssue[];
}>;

export type FandexHistoricalValidationSample = Readonly<{
  contractVersion:
    typeof FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION;
  sampleId: string;
  canonicalArtistId: string;
  evaluationAsOf: string;
  knowledgeCutoff: string;
  reconstructedAt: string;
  readModelGeneratedAt: string;
  purpose: typeof FANDEX_HISTORICAL_VALIDATION_PURPOSE;
  temporalIntegrity: FandexHistoricalTemporalIntegrity;
  readModel: FandexProductReadModel;
  versioning: FandexProductVersioning;
  fandexValue: null;
  fandexCandidateEligible: null;
  methodologyVersion: null;
  scoreFieldsPresent: false;
  rankingFieldsPresent: false;
  outcomeFieldsPresent: false;
}>;

export type FandexHistoricalValidationRunSummary = Readonly<{
  totalSamples: number;
  temporalClearCount: number;
  temporalIndeterminateCount: number;
  temporalIssueCount: number;
  distinctArtistCount: number;
}>;

export type FandexHistoricalValidationRun = Readonly<{
  contractVersion:
    typeof FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION;
  runId: string;
  cohortVersion: string;
  createdAt: string;
  purpose: typeof FANDEX_HISTORICAL_VALIDATION_PURPOSE;
  samples: readonly FandexHistoricalValidationSample[];
  summary: FandexHistoricalValidationRunSummary;
  scoreFieldsPresent: false;
  rankingFieldsPresent: false;
  outcomeFieldsPresent: false;
  normalizationVersion: null;
  fandexMethodologyVersion: null;
}>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function instant(value: string, errorCode: string): number {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new Error(`${errorCode}:offset-required`);
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${errorCode}:invalid-instant`);
  }

  return parsed;
}

function assertReadModelOperationsMatch(
  model: FandexProductReadModel,
  operations: FandexProductOperations,
): void {
  if (
    model.contractVersion !== FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION
    || model.audience !== FANDEX_PRODUCT_READ_MODEL_AUDIENCE
  ) {
    throw new Error(
      'fandex_historical_validation_read_model_invalid',
    );
  }

  if (
    operations.contractVersion
      !== FANDEX_PRODUCT_OPERATIONS_CONTRACT_VERSION
    || operations.audience !== FANDEX_PRODUCT_READ_MODEL_AUDIENCE
  ) {
    throw new Error(
      'fandex_historical_validation_operations_invalid',
    );
  }

  if (
    operations.canonicalArtistId.trim()
      !== model.canonicalArtistId.trim()
    || operations.generatedAt
      !== model.generatedTime.generatedAt
  ) {
    throw new Error(
      'fandex_historical_validation_source_identity_mismatch',
    );
  }

  if (
    model.fandexValue !== null
    || model.fandexCandidateEligible !== null
    || model.methodologyVersion !== null
  ) {
    throw new Error(
      'fandex_historical_validation_methodology_boundary_invalid',
    );
  }

  const lineage = new Map(
    operations.versioning.variableLineage.map((entry) => [
      entry.variableId,
      entry,
    ]),
  );

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    const component = model.byVariable[variableId];
    const version = lineage.get(variableId);

    if (!component || component.variableId !== variableId || !version) {
      throw new Error(
        `fandex_historical_validation_lineage_missing:${variableId}`,
      );
    }

    if (
      component.versions.methodologyVersion
        !== version.methodologyVersion
      || component.versions.sourceVersion !== version.sourceVersion
      || component.versions.productVersion !== version.productVersion
    ) {
      throw new Error(
        `fandex_historical_validation_lineage_mismatch:${variableId}`,
      );
    }
  }
}

function temporalIssues(input: Readonly<{
  model: FandexProductReadModel;
  evaluationAsOfMs: number;
  knowledgeCutoffMs: number;
}>): readonly FandexHistoricalTemporalIssue[] {
  const issues: FandexHistoricalTemporalIssue[] = [];

  const add = (
    variableId: FandexVariableProductId,
    severity: FandexHistoricalTemporalIssueSeverity,
    code: FandexHistoricalTemporalIssueCode,
  ) => {
    issues.push(Object.freeze({ variableId, severity, code }));
  };

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    const component = input.model.byVariable[variableId];
    if (!component || component.variableId !== variableId) {
      throw new Error(
        `fandex_historical_validation_component_missing:${variableId}`,
      );
    }

    const observation = component.time.observationTime;
    if (observation.kind === 'unknown') {
      add(variableId, 'unknown', 'observation-time-unknown');
    } else if (observation.kind === 'instant') {
      if (
        instant(
          observation.observedAt,
          'fandex_historical_validation_observed_at_invalid',
        ) > input.evaluationAsOfMs
      ) {
        add(
          variableId,
          'violation',
          'observation-after-evaluation',
        );
      }
    } else {
      const start = instant(
        observation.start,
        'fandex_historical_validation_observation_start_invalid',
      );
      const end = instant(
        observation.end,
        'fandex_historical_validation_observation_end_invalid',
      );

      if (start > end) {
        throw new Error(
          `fandex_historical_validation_observation_period_invalid:${variableId}`,
        );
      }

      if (end > input.evaluationAsOfMs) {
        add(
          variableId,
          'violation',
          'observation-after-evaluation',
        );
      }
    }

    if (component.time.asOf !== null) {
      if (
        instant(
          component.time.asOf,
          'fandex_historical_validation_component_as_of_invalid',
        ) > input.evaluationAsOfMs
      ) {
        add(
          variableId,
          'violation',
          'component-as-of-after-evaluation',
        );
      }
    }

    if (component.time.collectionTime === null) {
      add(variableId, 'unknown', 'collection-time-unknown');
    } else if (
      instant(
        component.time.collectionTime.collectedAt,
        'fandex_historical_validation_collection_time_invalid',
      ) > input.knowledgeCutoffMs
    ) {
      add(
        variableId,
        'violation',
        'collection-after-knowledge-cutoff',
      );
    }
  }

  const severityOrder:
    Readonly<Record<FandexHistoricalTemporalIssueSeverity, number>> = {
      violation: 0,
      unknown: 1,
    };
  const codeOrder: readonly FandexHistoricalTemporalIssueCode[] = [
    'observation-after-evaluation',
    'component-as-of-after-evaluation',
    'collection-after-knowledge-cutoff',
    'observation-time-unknown',
    'collection-time-unknown',
  ];

  return Object.freeze(
    issues.sort((left, right) => {
      const variable =
        FANDEX_VARIABLE_PRODUCT_IDS.indexOf(left.variableId)
        - FANDEX_VARIABLE_PRODUCT_IDS.indexOf(right.variableId);
      if (variable !== 0) return variable;

      const severity =
        severityOrder[left.severity] - severityOrder[right.severity];
      if (severity !== 0) return severity;

      return codeOrder.indexOf(left.code) - codeOrder.indexOf(right.code);
    }),
  );
}

function temporalIntegrity(
  issues: readonly FandexHistoricalTemporalIssue[],
): FandexHistoricalTemporalIntegrity {
  if (issues.some((issue) => issue.severity === 'violation')) {
    return Object.freeze({
      status: 'issues-present' as const,
      issues,
    });
  }

  if (issues.length > 0) {
    return Object.freeze({
      status: 'indeterminate' as const,
      issues,
    });
  }

  return Object.freeze({
    status: 'clear' as const,
    issues,
  });
}

export function createFandexHistoricalValidationSample(input: Readonly<{
  sampleId: string;
  evaluationAsOf: string;
  knowledgeCutoff: string;
  reconstructedAt: string;
  model: FandexProductReadModel;
  operations: FandexProductOperations;
}>): FandexHistoricalValidationSample {
  if (!isNonEmptyString(input.sampleId)) {
    throw new Error(
      'fandex_historical_validation_sample_id_invalid',
    );
  }

  assertReadModelOperationsMatch(input.model, input.operations);

  const canonicalArtistId = input.model.canonicalArtistId.trim();
  if (!canonicalArtistId) {
    throw new Error(
      'fandex_historical_validation_artist_id_invalid',
    );
  }

  const evaluationAsOfMs = instant(
    input.evaluationAsOf,
    'fandex_historical_validation_evaluation_as_of_invalid',
  );
  const knowledgeCutoffMs = instant(
    input.knowledgeCutoff,
    'fandex_historical_validation_knowledge_cutoff_invalid',
  );
  instant(
    input.reconstructedAt,
    'fandex_historical_validation_reconstructed_at_invalid',
  );

  if (knowledgeCutoffMs > evaluationAsOfMs) {
    throw new Error(
      'fandex_historical_validation_knowledge_cutoff_after_evaluation',
    );
  }

  const issues = temporalIssues({
    model: input.model,
    evaluationAsOfMs,
    knowledgeCutoffMs,
  });

  return Object.freeze({
    contractVersion:
      FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION,
    sampleId: input.sampleId.trim(),
    canonicalArtistId,
    evaluationAsOf: input.evaluationAsOf,
    knowledgeCutoff: input.knowledgeCutoff,
    reconstructedAt: input.reconstructedAt,
    readModelGeneratedAt: input.model.generatedTime.generatedAt,
    purpose: FANDEX_HISTORICAL_VALIDATION_PURPOSE,
    temporalIntegrity: temporalIntegrity(issues),
    readModel: input.model,
    versioning: input.operations.versioning,
    fandexValue: null,
    fandexCandidateEligible: null,
    methodologyVersion: null,
    scoreFieldsPresent: false,
    rankingFieldsPresent: false,
    outcomeFieldsPresent: false,
  });
}

export function createFandexHistoricalValidationRun(input: Readonly<{
  runId: string;
  cohortVersion: string;
  createdAt: string;
  samples: readonly FandexHistoricalValidationSample[];
}>): FandexHistoricalValidationRun {
  if (!isNonEmptyString(input.runId)) {
    throw new Error('fandex_historical_validation_run_id_invalid');
  }
  if (!isNonEmptyString(input.cohortVersion)) {
    throw new Error(
      'fandex_historical_validation_cohort_version_invalid',
    );
  }
  instant(
    input.createdAt,
    'fandex_historical_validation_run_created_at_invalid',
  );

  const sampleIds = new Set<string>();
  const sampleKeys = new Set<string>();

  for (const sample of input.samples) {
    if (
      sample.contractVersion
        !== FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION
      || sample.purpose !== FANDEX_HISTORICAL_VALIDATION_PURPOSE
      || sample.fandexValue !== null
      || sample.fandexCandidateEligible !== null
      || sample.methodologyVersion !== null
      || sample.scoreFieldsPresent !== false
      || sample.rankingFieldsPresent !== false
      || sample.outcomeFieldsPresent !== false
    ) {
      throw new Error(
        'fandex_historical_validation_sample_contract_invalid',
      );
    }

    if (sampleIds.has(sample.sampleId)) {
      throw new Error(
        `fandex_historical_validation_duplicate_sample_id:${sample.sampleId}`,
      );
    }
    sampleIds.add(sample.sampleId);

    const key =
      `${sample.canonicalArtistId}::${sample.evaluationAsOf}::${sample.knowledgeCutoff}`;
    if (sampleKeys.has(key)) {
      throw new Error(
        `fandex_historical_validation_duplicate_sample_key:${key}`,
      );
    }
    sampleKeys.add(key);
  }

  const samples = Object.freeze(
    [...input.samples].sort((left, right) => {
      const evaluation =
        instant(
          left.evaluationAsOf,
          'fandex_historical_validation_evaluation_as_of_invalid',
        )
        - instant(
          right.evaluationAsOf,
          'fandex_historical_validation_evaluation_as_of_invalid',
        );
      if (evaluation !== 0) return evaluation;

      const artist =
        left.canonicalArtistId.localeCompare(right.canonicalArtistId);
      if (artist !== 0) return artist;

      return left.sampleId.localeCompare(right.sampleId);
    }),
  );

  return Object.freeze({
    contractVersion:
      FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION,
    runId: input.runId.trim(),
    cohortVersion: input.cohortVersion.trim(),
    createdAt: input.createdAt,
    purpose: FANDEX_HISTORICAL_VALIDATION_PURPOSE,
    samples,
    summary: Object.freeze({
      totalSamples: samples.length,
      temporalClearCount: samples.filter(
        (sample) => sample.temporalIntegrity.status === 'clear',
      ).length,
      temporalIndeterminateCount: samples.filter(
        (sample) =>
          sample.temporalIntegrity.status === 'indeterminate',
      ).length,
      temporalIssueCount: samples.filter(
        (sample) =>
          sample.temporalIntegrity.status === 'issues-present',
      ).length,
      distinctArtistCount: new Set(
        samples.map((sample) => sample.canonicalArtistId),
      ).size,
    }),
    scoreFieldsPresent: false,
    rankingFieldsPresent: false,
    outcomeFieldsPresent: false,
    normalizationVersion: null,
    fandexMethodologyVersion: null,
  });
}
