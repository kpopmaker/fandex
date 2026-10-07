import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  executeSnsFandomYoutubeBoundedMeasurement,
  type SnsFandomYoutubeApiRequest,
  type SnsFandomYoutubeBoundedMeasurementResult,
} from '../../lib/intelligence/snsFandomPointYoutubeBoundedMeasurement';
import {
  evaluateSnsFandomYoutubeProviderClientIdentity,
} from '../../lib/intelligence/snsFandomPointYoutubeProviderClientIdentity';
import {
  buildSnsFandomYoutubeQuotaMeasurementHandoff,
} from '../../lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff';
import {
  evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3,
  SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_END,
  SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_START,
  SNS_FANDOM_YOUTUBE_NEXT_GENERATION_ROOT,
  SNS_FANDOM_YOUTUBE_REBASELINE_CORRECTION_EVIDENCE_REF,
} from '../../lib/intelligence/snsFandomPointYoutubeWindowRebaselineFutureCutoverV3';
import type {
  SnsFandomYoutubeAuditArtistBindingManifestInput,
} from '../../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';
import type {
  ImmutableTextObjectStore,
} from '../../lib/server/storage/immutableTextObjectStore';
import {
  createProductionVercelBlobImmutableTextObjectStore,
} from '../../lib/server/storage/vercelBlobRuntime';
import {
  runSnsFandomYoutubeRecurringMeasurementSlotV2,
} from './snsFandomYoutubeRecurringMeasurementRunnerV2';

export const SNS_FANDOM_YOUTUBE_RECURRING_ACTIVATED_RUNTIME_VERSION_V2 =
  'sns-fandom-youtube-recurring-activated-runtime-v2' as const;

export const SNS_FANDOM_YOUTUBE_RECURRING_V2_EXECUTION_APPROVAL_ENV =
  'FANDEX_SNS_FANDOM_RECURRING_V2_EXECUTION_APPROVAL' as const;
export const SNS_FANDOM_YOUTUBE_RECURRING_V2_EXECUTION_APPROVAL_VALUE =
  'approved-sns-fandom-v2-rebaseline-provider-scheduler-cutover-v1' as const;
export const SNS_FANDOM_YOUTUBE_RECURRING_V2_CUTOVER_EVIDENCE_ENV =
  'FANDEX_SNS_FANDOM_RECURRING_V2_CUTOVER_EVIDENCE_REF' as const;
export const SNS_FANDOM_YOUTUBE_RECURRING_V2_AUTHORIZED_REVISION_ENV =
  'FANDEX_SNS_FANDOM_RECURRING_V2_AUTHORIZED_REVISION_SHA' as const;

const WINDOW_PATH =
  'sns-fandom/youtube-audit/recurring/v2/canonical-window.json' as const;
const RECEIPT_PREFIX =
  'sns-fandom/youtube-audit/recurring/v2/receipts/' as const;
const CADENCE_EVIDENCE_REF =
  'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631' as const;
const PROVIDER_QUOTA_COST_EVIDENCE_REF =
  'https://developers.google.com/youtube/v3/determine_quota_cost' as const;
const WINDOW_DURATION_MS = 366 * 24 * 60 * 60 * 1_000;

type CanonicalWindowManifest = Readonly<{
  version: 'sns-fandom-youtube-recurring-canonical-window-v2';
  state: 'active';
  priorGeneration: 'v1';
  priorMeasurementWindowStart:
    typeof SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_START;
  priorMeasurementWindowEnd:
    typeof SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_END;
  measurementWindowStart: string;
  measurementWindowEnd: string;
  durationDays: 366;
  reactionSnapshotRunsPerDay: 24;
  cutoverApprovalEvidenceRef: string;
  correctionEvidenceRef:
    typeof SNS_FANDOM_YOUTUBE_REBASELINE_CORRECTION_EVIDENCE_REF;
  authorizedRevisionSha: string;
  cadenceEvidenceRef: typeof CADENCE_EVIDENCE_REF;
  firstSuccessfulSlotStart: string;
  historicalV1ReceiptsReinterpreted: false;
  syntheticBackfillAllowed: false;
  retrospectiveReceiptSynthesisAllowed: false;
  retrospectiveProviderObservationAllowed: false;
}>;

type ReceiptWindowEvidence = Readonly<{
  slotStart: string;
  sourceMainSha: string;
  measurementWindowStart: string;
  measurementWindowEnd: string;
}>;

export type SnsFandomYoutubeRecurringActivatedRuntimeV2Input = Readonly<{
  authorizedRevisionSha: string;
  activationEvidenceRef: string;
  now: string;
}>;

export type SnsFandomYoutubeRecurringActivatedRuntimeV2Dependencies = Readonly<{
  store: ImmutableTextObjectStore;
  executeMeasurement: (
    observationTime: string,
    window: CanonicalWindowManifest,
  ) => Promise<SnsFandomYoutubeBoundedMeasurementResult>;
  collectedAt?: () => string;
}>;

export type SnsFandomYoutubeRecurringActivatedRuntimeV2Result = Readonly<{
  contractVersion: typeof SNS_FANDOM_YOUTUBE_RECURRING_ACTIVATED_RUNTIME_VERSION_V2;
  state:
    | 'completed'
    | 'already-recorded'
    | 'slot-claimed'
    | 'window-complete';
  canonicalWindowPath: typeof WINDOW_PATH;
  measurementWindowStart: string | null;
  measurementWindowEnd: string | null;
  slotStart: string | null;
  receiptPath: string | null;
  providerCallsPerformed: boolean;
  coverage: Readonly<{
    receiptCount: number;
    firstSlotStart: string | null;
    lastSlotStart: string | null;
    totalProviderCallsObserved: number;
    totalQuotaUnitsObserved: number;
    trueZeroReceiptCount: number;
  }> | null;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  productActivationAuthorized: false;
}>;

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function activationEvidence(value: string): boolean {
  return /^github-issue:\/\/kpopmaker\/fandex\/issues\/509#issuecomment-[1-9][0-9]*$/.test(
    value,
  );
}

function floorUtcHour(value: string): string {
  const date = new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function exactUtcHour(value: string): boolean {
  return exactIso(value) && floorUtcHour(value) === value;
}

function object(value: unknown, reason: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(reason);
  }
  return value as Record<string, unknown>;
}

function requiredString(
  row: Record<string, unknown>,
  name: string,
  reason: string,
): string {
  const value = row[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(reason);
  }
  return value;
}

function parseWindow(
  text: string,
  input: Pick<
    SnsFandomYoutubeRecurringActivatedRuntimeV2Input,
    'authorizedRevisionSha' | 'activationEvidenceRef'
  >,
): CanonicalWindowManifest {
  const value = object(
    JSON.parse(text),
    'sns_fandom_recurring_v2_window_manifest_invalid',
  );

  const measurementWindowStart = requiredString(
    value,
    'measurementWindowStart',
    'sns_fandom_recurring_v2_window_start_missing',
  );
  const measurementWindowEnd = requiredString(
    value,
    'measurementWindowEnd',
    'sns_fandom_recurring_v2_window_end_missing',
  );

  if (
    value.version !== 'sns-fandom-youtube-recurring-canonical-window-v2'
    || value.state !== 'active'
    || value.priorGeneration !== 'v1'
    || value.priorMeasurementWindowStart
      !== SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_START
    || value.priorMeasurementWindowEnd
      !== SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_END
    || !exactUtcHour(measurementWindowStart)
    || !exactIso(measurementWindowEnd)
    || Date.parse(measurementWindowEnd)
      !== Date.parse(measurementWindowStart) + WINDOW_DURATION_MS
    || value.durationDays !== 366
    || value.reactionSnapshotRunsPerDay !== 24
    || value.cutoverApprovalEvidenceRef !== input.activationEvidenceRef
    || value.correctionEvidenceRef
      !== SNS_FANDOM_YOUTUBE_REBASELINE_CORRECTION_EVIDENCE_REF
    || value.authorizedRevisionSha !== input.authorizedRevisionSha
    || value.cadenceEvidenceRef !== CADENCE_EVIDENCE_REF
    || value.firstSuccessfulSlotStart !== measurementWindowStart
    || value.historicalV1ReceiptsReinterpreted !== false
    || value.syntheticBackfillAllowed !== false
    || value.retrospectiveReceiptSynthesisAllowed !== false
    || value.retrospectiveProviderObservationAllowed !== false
  ) {
    throw new Error('sns_fandom_recurring_v2_window_manifest_invalid');
  }

  return value as unknown as CanonicalWindowManifest;
}

function manifestBody(
  window: CanonicalWindowManifest,
): string {
  return JSON.stringify(window);
}

function candidateWindow(
  input: SnsFandomYoutubeRecurringActivatedRuntimeV2Input,
): CanonicalWindowManifest {
  const authorization = evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3({
    currentMeasurementWindowStart:
      SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_START,
    currentMeasurementWindowEnd:
      SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_END,
    nextGenerationRoot: SNS_FANDOM_YOUTUBE_NEXT_GENERATION_ROOT,
    correctionEvidenceRef:
      SNS_FANDOM_YOUTUBE_REBASELINE_CORRECTION_EVIDENCE_REF,
    canonicalRebaselineAuthorized: true,
    newGenerationProviderExecutionAuthorized: true,
    schedulerCutoverAuthorized: true,
    newGenerationRuntimeBound: true,
    newGenerationEvidenceStoreBound: true,
    firstSuccessfulNewGenerationSlotStart: null,
    firstSuccessfulNewGenerationReceiptRef: null,
    canonicalMutationPerformed: false,
  });

  if (
    authorization.state
      !== 'authorized-awaiting-first-successful-new-generation-slot'
  ) {
    throw new Error(
      'sns_fandom_recurring_v2_cutover_authorization_blocked:'
      + authorization.blockers.join(','),
    );
  }

  const measurementWindowStart = floorUtcHour(input.now);
  const measurementWindowEnd = new Date(
    Date.parse(measurementWindowStart) + WINDOW_DURATION_MS,
  ).toISOString();

  return Object.freeze({
    version: 'sns-fandom-youtube-recurring-canonical-window-v2' as const,
    state: 'active' as const,
    priorGeneration: 'v1' as const,
    priorMeasurementWindowStart:
      SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_START,
    priorMeasurementWindowEnd:
      SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_END,
    measurementWindowStart,
    measurementWindowEnd,
    durationDays: 366 as const,
    reactionSnapshotRunsPerDay: 24 as const,
    cutoverApprovalEvidenceRef: input.activationEvidenceRef,
    correctionEvidenceRef:
      SNS_FANDOM_YOUTUBE_REBASELINE_CORRECTION_EVIDENCE_REF,
    authorizedRevisionSha: input.authorizedRevisionSha,
    cadenceEvidenceRef: CADENCE_EVIDENCE_REF,
    firstSuccessfulSlotStart: measurementWindowStart,
    historicalV1ReceiptsReinterpreted: false as const,
    syntheticBackfillAllowed: false as const,
    retrospectiveReceiptSynthesisAllowed: false as const,
    retrospectiveProviderObservationAllowed: false as const,
  });
}

function parseReceiptWindowEvidence(
  text: string,
  authorizedRevisionSha: string,
): ReceiptWindowEvidence {
  const value = object(
    JSON.parse(text),
    'sns_fandom_recurring_v2_receipt_recovery_invalid',
  );
  const slotStart = requiredString(
    value,
    'slotStart',
    'sns_fandom_recurring_v2_receipt_recovery_invalid',
  );
  const sourceMainSha = requiredString(
    value,
    'sourceMainSha',
    'sns_fandom_recurring_v2_receipt_recovery_invalid',
  );
  const measurementWindowStart = requiredString(
    value,
    'measurementWindowStart',
    'sns_fandom_recurring_v2_receipt_recovery_invalid',
  );
  const measurementWindowEnd = requiredString(
    value,
    'measurementWindowEnd',
    'sns_fandom_recurring_v2_receipt_recovery_invalid',
  );

  if (
    value.version !== 'sns-fandom-youtube-recurring-receipt-v2'
    || value.state !== 'completed'
    || sourceMainSha !== authorizedRevisionSha
    || !exactUtcHour(slotStart)
    || !exactUtcHour(measurementWindowStart)
    || !exactIso(measurementWindowEnd)
    || Date.parse(measurementWindowEnd)
      !== Date.parse(measurementWindowStart) + WINDOW_DURATION_MS
  ) {
    throw new Error('sns_fandom_recurring_v2_receipt_recovery_invalid');
  }

  return Object.freeze({
    slotStart,
    sourceMainSha,
    measurementWindowStart,
    measurementWindowEnd,
  });
}

async function writeWindow(
  store: ImmutableTextObjectStore,
  window: CanonicalWindowManifest,
  input: Pick<
    SnsFandomYoutubeRecurringActivatedRuntimeV2Input,
    'authorizedRevisionSha' | 'activationEvidenceRef'
  >,
): Promise<CanonicalWindowManifest> {
  const body = manifestBody(window);
  const written = await store.putTextIfAbsent(WINDOW_PATH, body);
  if (written.status === 'conflict') {
    const raced = await store.readText(WINDOW_PATH);
    if (raced === null) {
      throw new Error('sns_fandom_recurring_v2_window_manifest_conflict');
    }
    return parseWindow(raced, input);
  }
  const stored = await store.readText(WINDOW_PATH);
  if (stored === null) {
    throw new Error('sns_fandom_recurring_v2_window_manifest_missing_after_write');
  }
  return parseWindow(stored, input);
}

async function recoverWindow(
  store: ImmutableTextObjectStore,
  input: SnsFandomYoutubeRecurringActivatedRuntimeV2Input,
): Promise<CanonicalWindowManifest | null> {
  const paths = await store.listPathnames(RECEIPT_PREFIX);
  if (paths.length === 0) return null;

  const receipts: ReceiptWindowEvidence[] = [];
  for (const path of paths) {
    const text = await store.readText(path);
    if (text === null) {
      throw new Error('sns_fandom_recurring_v2_receipt_recovery_index_inconsistent');
    }
    receipts.push(parseReceiptWindowEvidence(text, input.authorizedRevisionSha));
  }
  receipts.sort((left, right) => left.slotStart.localeCompare(right.slotStart));
  const first = receipts[0];
  if (!first) return null;

  if (
    first.slotStart !== first.measurementWindowStart
    || receipts.some((receipt) =>
      receipt.measurementWindowStart !== first.measurementWindowStart
      || receipt.measurementWindowEnd !== first.measurementWindowEnd)
  ) {
    throw new Error('sns_fandom_recurring_v2_receipt_recovery_window_conflict');
  }

  const recovered = candidateWindow({
    ...input,
    now: first.measurementWindowStart,
  });
  if (
    recovered.measurementWindowStart !== first.measurementWindowStart
    || recovered.measurementWindowEnd !== first.measurementWindowEnd
  ) {
    throw new Error('sns_fandom_recurring_v2_receipt_recovery_candidate_mismatch');
  }

  return writeWindow(store, recovered, input);
}

export async function runSnsFandomYoutubeRecurringActivatedRuntimeV2(
  input: SnsFandomYoutubeRecurringActivatedRuntimeV2Input,
  dependencies: SnsFandomYoutubeRecurringActivatedRuntimeV2Dependencies,
): Promise<SnsFandomYoutubeRecurringActivatedRuntimeV2Result> {
  if (!validSha(input.authorizedRevisionSha)) {
    throw new Error('sns_fandom_recurring_v2_authorized_revision_invalid');
  }
  if (!activationEvidence(input.activationEvidenceRef)) {
    throw new Error('sns_fandom_recurring_v2_activation_evidence_invalid');
  }
  if (!exactIso(input.now)) {
    throw new Error('sns_fandom_recurring_v2_runtime_now_invalid');
  }

  let windowText = await dependencies.store.readText(WINDOW_PATH);
  let window = windowText === null
    ? await recoverWindow(dependencies.store, input)
    : parseWindow(windowText, input);

  const firstAttempt = window === null;
  if (window === null) {
    window = candidateWindow(input);
  }
  const activeWindow = window;

  const result = await runSnsFandomYoutubeRecurringMeasurementSlotV2(
    {
      currentRevisionSha: input.authorizedRevisionSha,
      now: input.now,
      measurementWindowStart: activeWindow.measurementWindowStart,
      measurementWindowEnd: activeWindow.measurementWindowEnd,
      reactionSnapshotRunsPerDay: 24,
      activation: {
        enabled: true,
        recurringExecutionAuthorized: true,
        schedulerMutationAuthorized: true,
        activationEvidenceRef: input.activationEvidenceRef,
        authorizedRevisionSha: input.authorizedRevisionSha,
      },
    },
    {
      store: dependencies.store,
      executeMeasurement: (observationTime) =>
        dependencies.executeMeasurement(observationTime, activeWindow),
      ...(dependencies.collectedAt
        ? { collectedAt: dependencies.collectedAt }
        : {}),
    },
  );

  if (firstAttempt && result.state === 'completed') {
    window = await writeWindow(dependencies.store, activeWindow, input);
    windowText = manifestBody(window);
  }

  if (
    firstAttempt
    && result.state !== 'completed'
    && result.state !== 'slot-claimed'
  ) {
    throw new Error(
      'sns_fandom_recurring_v2_first_slot_unexpected_state:' + result.state,
    );
  }

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_RECURRING_ACTIVATED_RUNTIME_VERSION_V2,
    state: result.state as
      | 'completed'
      | 'already-recorded'
      | 'slot-claimed'
      | 'window-complete',
    canonicalWindowPath: WINDOW_PATH,
    measurementWindowStart:
      windowText === null && result.state !== 'completed'
        ? null
        : window.measurementWindowStart,
    measurementWindowEnd:
      windowText === null && result.state !== 'completed'
        ? null
        : window.measurementWindowEnd,
    slotStart: result.slotStart,
    receiptPath: result.receiptPath,
    providerCallsPerformed: result.providerCallsPerformed,
    coverage: result.coverage,
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    productActivationAuthorized: false as const,
  });
}

async function youtubeJson(
  apiKey: string,
  request: SnsFandomYoutubeApiRequest,
): Promise<unknown> {
  const methodPath = request.method === 'channels.list'
    ? 'channels'
    : request.method === 'playlistItems.list'
      ? 'playlistItems'
      : 'videos';
  const url = new URL('https://www.googleapis.com/youtube/v3/' + methodPath);
  for (const [name, value] of Object.entries(request.params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set('key', apiKey);

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(
      'sns_fandom_recurring_v2_youtube_request_failed:'
      + request.method
      + ':http_'
      + String(response.status),
    );
  }
  return response.json();
}

async function createLiveMeasurementExecutor(
  environment: Readonly<Record<string, string | undefined>>,
): Promise<SnsFandomYoutubeRecurringActivatedRuntimeV2Dependencies['executeMeasurement']> {
  const apiKey = environment.FANDEX_SNS_FANDOM_YOUTUBE_API_KEY?.trim() ?? '';
  if (apiKey.length === 0) {
    throw new Error('sns_fandom_recurring_v2_youtube_api_key_missing');
  }

  const providerOwner = object(
    JSON.parse(await readFile(
      new URL(
        '../../docs/research/sns-fandom-youtube-provider-client-owner-input-v1.json',
        import.meta.url,
      ),
      'utf8',
    )),
    'sns_fandom_recurring_v2_provider_owner_invalid',
  );
  const manifest = JSON.parse(await readFile(
    new URL(
      '../../data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
      import.meta.url,
    ),
    'utf8',
  )) as SnsFandomYoutubeAuditArtistBindingManifestInput;

  const providerIdentity = evaluateSnsFandomYoutubeProviderClientIdentity({
    providerId: 'youtube-data-api',
    providerClientRef: requiredString(
      providerOwner,
      'providerClientRef',
      'sns_fandom_recurring_v2_provider_client_ref_missing',
    ),
    googleCloudProjectNumber: requiredString(
      providerOwner,
      'googleCloudProjectNumber',
      'sns_fandom_recurring_v2_google_project_number_missing',
    ),
    googleCloudProjectId:
      providerOwner.googleCloudProjectId === null
        ? null
        : requiredString(
          providerOwner,
          'googleCloudProjectId',
          'sns_fandom_recurring_v2_google_project_id_missing',
        ),
    credentialLocatorRef: requiredString(
      providerOwner,
      'credentialLocatorRef',
      'sns_fandom_recurring_v2_credential_locator_missing',
    ),
    evidenceRef: requiredString(
      providerOwner,
      'cloudProjectEvidenceRef',
      'sns_fandom_recurring_v2_cloud_project_evidence_missing',
    ),
    verifiedAt: requiredString(
      providerOwner,
      'verifiedAt',
      'sns_fandom_recurring_v2_provider_verified_at_missing',
    ),
  });

  return async (observationTime, window) => {
    const handoff = buildSnsFandomYoutubeQuotaMeasurementHandoff({
      handoffId:
        'sns-fandom-youtube-recurring:' + floorUtcHour(observationTime),
      preparedAt: observationTime,
      artistBindingManifest: manifest,
      providerClientIdentity: providerIdentity,
      requestedEndpoints: [
        'youtube.channels.list',
        'youtube.playlistItems.list',
        'youtube.videos.list',
      ],
      measurementWindowStart: window.measurementWindowStart,
      measurementWindowEnd: window.measurementWindowEnd,
      reactionSnapshotRunsPerDay: 24,
      cadenceEvidenceRef: CADENCE_EVIDENCE_REF,
      providerBatchLimitEvidenceRef: null,
      providerQuotaCostEvidenceRef: PROVIDER_QUOTA_COST_EVIDENCE_REF,
    });

    if (handoff.state !== 'measurement-handoff-ready') {
      throw new Error(
        'sns_fandom_recurring_v2_measurement_handoff_blocked:'
        + handoff.blockers.join(','),
      );
    }

    return executeSnsFandomYoutubeBoundedMeasurement({
      handoff,
      measurementStartedAt: observationTime,
      requestJson: (request) => youtubeJson(apiKey, request),
    });
  };
}

export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  if (
    environment[SNS_FANDOM_YOUTUBE_RECURRING_V2_EXECUTION_APPROVAL_ENV]
      !== SNS_FANDOM_YOUTUBE_RECURRING_V2_EXECUTION_APPROVAL_VALUE
  ) {
    throw new Error('sns_fandom_recurring_v2_execution_approval_required');
  }

  const activationEvidenceRef =
    environment[SNS_FANDOM_YOUTUBE_RECURRING_V2_CUTOVER_EVIDENCE_ENV]?.trim()
    ?? '';
  const authorizedRevisionSha =
    environment[SNS_FANDOM_YOUTUBE_RECURRING_V2_AUTHORIZED_REVISION_ENV]?.trim()
    ?? '';

  const store = createProductionVercelBlobImmutableTextObjectStore(environment);
  const executeMeasurement = await createLiveMeasurementExecutor(environment);
  const result = await runSnsFandomYoutubeRecurringActivatedRuntimeV2(
    {
      authorizedRevisionSha,
      activationEvidenceRef,
      now: new Date().toISOString(),
    },
    {
      store,
      executeMeasurement,
    },
  );

  process.stdout.write(JSON.stringify(result) + '\n');
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(
      (
        error instanceof Error
          ? error.message
          : 'sns_fandom_recurring_v2_activated_runtime_failed_closed'
      ) + '\n',
    );
    process.exitCode = 1;
  });
}
