import { readFile } from 'node:fs/promises';

import {
  executeSnsFandomYoutubeBoundedMeasurement,
  type SnsFandomYoutubeApiRequest,
} from '../../lib/intelligence/snsFandomPointYoutubeBoundedMeasurement';
import {
  evaluateSnsFandomYoutubeProviderClientIdentity,
} from '../../lib/intelligence/snsFandomPointYoutubeProviderClientIdentity';
import {
  buildSnsFandomYoutubeQuotaMeasurementHandoff,
} from '../../lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff';
import {
  type SnsFandomYoutubeAuditArtistBindingManifestInput,
} from '../../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';

const EXECUTION_CONFIRM =
  'execute-sns-fandom-youtube-bounded-measurement-v1';
const QUOTA_COST_EVIDENCE_REF =
  'https://developers.google.com/youtube/v3/determine_quota_cost';

const providerCallsAttempted = {
  channelsList: 0,
  playlistItemsList: 0,
  videosList: 0,
  total: 0,
};

type ExecutionRequest = Readonly<{
  version: 'sns_fandom_youtube_bounded_measurement_execution_request_v1';
  authorizationState: 'approved';
  expectedMainSha: string;
  executionAuthorizationCommentId: number;
  executionAuthorizationEvidenceRef: string;
  maximumExecutions: 1;
  auditManifestId: 'sns-fandom-youtube-audit-cohort-v1';
  artistChannelCount: 5;
  requestedEndpoints: readonly [
    'youtube.channels.list',
    'youtube.playlistItems.list',
    'youtube.videos.list',
  ];
  requestBatchingStrategy:
    'singleton-only-until-provider-batch-limit-evidence';
  commentEndpointsAllowed: false;
  productionCollectionAuthorized: false;
  providerSubmissionAuthorized: false;
  schedulerMutationAuthorized: false;
  confirm: typeof EXECUTION_CONFIRM;
}>;

function object(value: unknown, reason: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(reason);
  }
  return value as Record<string, unknown>;
}

function executionRequest(value: unknown): ExecutionRequest {
  const row = object(
    value,
    'sns_fandom_bounded_measurement_execution_request_invalid',
  );
  const endpoints = row.requestedEndpoints;
  const expectedEndpoints = [
    'youtube.channels.list',
    'youtube.playlistItems.list',
    'youtube.videos.list',
  ];

  if (
    row.version
      !== 'sns_fandom_youtube_bounded_measurement_execution_request_v1'
    || row.authorizationState !== 'approved'
    || typeof row.expectedMainSha !== 'string'
    || !/^[0-9a-f]{40}$/.test(row.expectedMainSha)
    || !Number.isSafeInteger(row.executionAuthorizationCommentId)
    || (row.executionAuthorizationCommentId as number) <= 0
    || typeof row.executionAuthorizationEvidenceRef !== 'string'
    || row.maximumExecutions !== 1
    || row.auditManifestId !== 'sns-fandom-youtube-audit-cohort-v1'
    || row.artistChannelCount !== 5
    || !Array.isArray(endpoints)
    || JSON.stringify(endpoints) !== JSON.stringify(expectedEndpoints)
    || row.requestBatchingStrategy
      !== 'singleton-only-until-provider-batch-limit-evidence'
    || row.commentEndpointsAllowed !== false
    || row.productionCollectionAuthorized !== false
    || row.providerSubmissionAuthorized !== false
    || row.schedulerMutationAuthorized !== false
    || row.confirm !== EXECUTION_CONFIRM
  ) {
    throw new Error(
      'sns_fandom_bounded_measurement_execution_request_invalid',
    );
  }

  const expectedEvidenceRef =
    'github-issue://kpopmaker/fandex/issues/424#issuecomment-'
    + String(row.executionAuthorizationCommentId);
  if (row.executionAuthorizationEvidenceRef !== expectedEvidenceRef) {
    throw new Error(
      'sns_fandom_bounded_measurement_execution_evidence_ref_mismatch',
    );
  }

  return row as unknown as ExecutionRequest;
}

function stringField(
  row: Record<string, unknown>,
  name: string,
): string {
  const value = row[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('sns_fandom_bounded_measurement_owner_field_missing:' + name);
  }
  return value;
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
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(
      'youtube_data_api_request_failed:'
      + request.method
      + ':http_'
      + String(response.status),
    );
  }
  return response.json();
}

function failureReceipt(
  reason: string,
  requestPath: string | null,
): Record<string, unknown> {
  return {
    version: 'sns_fandom_youtube_bounded_measurement_receipt_v1',
    state: 'blocked',
    reason,
    requestPath,
    providerCallMayHaveOccurred: providerCallsAttempted.total > 0,
    providerCallsAttempted: { ...providerCallsAttempted },
    secretMaterialStored: false,
    productionCollectionAuthorized: false,
    providerSubmissionAuthorized: false,
    schedulerMutationAuthorized: false,
  };
}

async function main(): Promise<void> {
  if (
    process.argv.length !== 4
    || process.argv[2] !== '--request'
  ) {
    throw new Error(
      'sns_fandom_bounded_measurement_explicit_request_path_required',
    );
  }
  const requestPath = process.argv[3];
  const apiKey = process.env.FANDEX_SNS_FANDOM_YOUTUBE_API_KEY ?? '';
  if (apiKey.length === 0) {
    throw new Error('sns_fandom_bounded_measurement_api_key_missing');
  }

  const request = executionRequest(JSON.parse(
    await readFile(requestPath, 'utf8'),
  ));

  if (process.env.GITHUB_SHA === undefined) {
    throw new Error('sns_fandom_bounded_measurement_execution_sha_missing');
  }

  const providerOwner = object(
    JSON.parse(await readFile(
      new URL(
        '../../docs/research/sns-fandom-youtube-provider-client-owner-input-v1.json',
        import.meta.url,
      ),
      'utf8',
    )),
    'sns_fandom_bounded_measurement_provider_owner_invalid',
  );
  const quotaOwner = object(
    JSON.parse(await readFile(
      new URL(
        '../../docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
        import.meta.url,
      ),
      'utf8',
    )),
    'sns_fandom_bounded_measurement_quota_owner_invalid',
  );
  const manifest = JSON.parse(await readFile(
    new URL(
      '../../data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
      import.meta.url,
    ),
    'utf8',
  )) as SnsFandomYoutubeAuditArtistBindingManifestInput;

  const providerClientIdentity =
    evaluateSnsFandomYoutubeProviderClientIdentity({
      providerId: 'youtube-data-api',
      providerClientRef: stringField(providerOwner, 'providerClientRef'),
      googleCloudProjectNumber:
        stringField(providerOwner, 'googleCloudProjectNumber'),
      googleCloudProjectId:
        providerOwner.googleCloudProjectId === null
          ? null
          : stringField(providerOwner, 'googleCloudProjectId'),
      credentialLocatorRef:
        stringField(providerOwner, 'credentialLocatorRef'),
      evidenceRef:
        stringField(providerOwner, 'cloudProjectEvidenceRef'),
      verifiedAt: stringField(providerOwner, 'verifiedAt'),
    });

  const measurementStartedAt = new Date().toISOString();
  const handoff = buildSnsFandomYoutubeQuotaMeasurementHandoff({
    handoffId:
      'sns-fandom-youtube-quota-measurement-v1:'
      + request.executionAuthorizationCommentId,
    preparedAt: measurementStartedAt,
    artistBindingManifest: manifest,
    providerClientIdentity,
    requestedEndpoints: request.requestedEndpoints,
    measurementWindowStart:
      stringField(quotaOwner, 'measurementWindowStart'),
    measurementWindowEnd:
      stringField(quotaOwner, 'measurementWindowEnd'),
    reactionSnapshotRunsPerDay:
      quotaOwner.reactionSnapshotRunsPerDay as number,
    cadenceEvidenceRef:
      stringField(quotaOwner, 'cadenceEvidenceRef'),
    providerBatchLimitEvidenceRef: null,
    providerQuotaCostEvidenceRef: QUOTA_COST_EVIDENCE_REF,
  });

  if (handoff.state !== 'measurement-handoff-ready') {
    throw new Error(
      'sns_fandom_bounded_measurement_handoff_blocked:'
      + handoff.blockers.join(','),
    );
  }

  const result = await executeSnsFandomYoutubeBoundedMeasurement({
    handoff,
    measurementStartedAt,
    requestJson: (apiRequest) => youtubeJson(apiKey, apiRequest),
    onRequestAttempt: (apiRequest) => {
      if (apiRequest.method === 'channels.list') {
        providerCallsAttempted.channelsList += 1;
      } else if (apiRequest.method === 'playlistItems.list') {
        providerCallsAttempted.playlistItemsList += 1;
      } else {
        providerCallsAttempted.videosList += 1;
      }
      providerCallsAttempted.total += 1;
    },
  });
  const measuredAt = new Date().toISOString();

  process.stdout.write(JSON.stringify({
    version: 'sns_fandom_youtube_bounded_measurement_receipt_v1',
    receiptState: 'completed',
    executionAuthorizationEvidenceRef:
      request.executionAuthorizationEvidenceRef,
    executionAuthorizationCommentId:
      request.executionAuthorizationCommentId,
    sourceMainSha: request.expectedMainSha,
    executionRequestCommitSha: process.env.GITHUB_SHA,
    measuredAt,
    ...result,
  }, null, 2) + '\n');
}

const requestPath =
  process.argv.length >= 4 && process.argv[2] === '--request'
    ? process.argv[3]
    : null;

main().catch((error) => {
  const reason = error instanceof Error
    ? error.message
    : 'sns_fandom_bounded_measurement_failed';
  process.stdout.write(
    JSON.stringify(failureReceipt(reason, requestPath), null, 2) + '\n',
  );
  process.exitCode = 1;
});
