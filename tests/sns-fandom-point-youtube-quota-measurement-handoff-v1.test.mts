import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeAuditArtistBindingManifest,
  type SnsFandomYoutubeAuditArtistBindingManifestInput,
} from '../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';
import {
  evaluateSnsFandomYoutubeProviderClientIdentity,
} from '../lib/intelligence/snsFandomPointYoutubeProviderClientIdentity';
import {
  buildSnsFandomYoutubeQuotaMeasurementHandoff,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff';

async function mergedAuditManifest() {
  return JSON.parse(
    await readFile(
      new URL(
        '../data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as SnsFandomYoutubeAuditArtistBindingManifestInput;
}

function providerClientIdentity() {
  return evaluateSnsFandomYoutubeProviderClientIdentity({
    providerId: 'youtube-data-api',
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    googleCloudProjectNumber: '123456789012',
    googleCloudProjectId: 'fandex-youtube-primary',
    credentialLocatorRef:
      'github-actions-secret://FANDEX_SNS_FANDOM_YOUTUBE_API_KEY',
    evidenceRef: 'external://youtube-audit/cloud-project',
    verifiedAt: '2026-10-02T13:55:00.000Z',
  });
}

test('merged five-member Audit cohort becomes an exact non-authorizing quota measurement handoff', async () => {
  const manifest = await mergedAuditManifest();

  const result = buildSnsFandomYoutubeQuotaMeasurementHandoff({
    handoffId: 'sns-fandom-youtube-quota-measurement-v1',
    preparedAt: '2026-10-02T14:00:00.000Z',
    artistBindingManifest: manifest,
    providerClientIdentity: providerClientIdentity(),
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    measurementWindowStart: '2026-09-01T00:00:00.000Z',
    measurementWindowEnd: '2026-10-01T00:00:00.000Z',
    reactionSnapshotRunsPerDay: 4,
    cadenceEvidenceRef: 'external://youtube-audit/reaction-cadence',
    providerBatchLimitEvidenceRef:
      'external://youtube-audit/provider-batch-limits',
    providerQuotaCostEvidenceRef:
      'external://youtube-audit/provider-quota-costs',
  });

  assert.equal(result.state, 'measurement-handoff-ready');
  assert.equal(result.artistBindingManifestId, 'sns-fandom-youtube-audit-cohort-v1');
  assert.equal(result.artistChannelCount, 5);
  assert.equal(result.tasks.length, 5);
  assert.deepEqual(
    result.tasks.map((task) => task.canonicalArtistId),
    ['blackpink', 'jennie', 'riize', 'rose', 'twice'],
  );
  assert.deepEqual(
    result.tasks.map((task) => task.youtubeChannelId).sort(),
    manifest.members.map((member) => member.youtubeChannelId).sort(),
  );
  assert.equal(result.unresolvedQuotaInputs.uploadManifestPageCountPerReactionRun, null);
  assert.equal(result.unresolvedQuotaInputs.videoCountPerReactionRun, null);
  assert.equal(result.commentPersistenceRunsPerDay, 0);
  assert.equal(result.automaticProviderCallAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.deploymentAuthorized, false);
  assert.equal(result.quotaWorksheetAssemblyAllowed, false);
  assert.equal(result.arbitraryCadenceApplied, false);
  assert.equal(result.arbitraryMeasurementWindowApplied, false);
  assert.deepEqual(result.blockers, []);
});

test('quota measurement handoff refuses artist/channel rows that do not exactly match the validated manifest', async () => {
  const manifest = await mergedAuditManifest();

  const forgedManifest = {
    ...manifest,
    members: manifest.members.map((member, index) =>
      index === 0
        ? { ...member, youtubeChannelId: 'UCaaaaaaaaaaaaaaaaaaaaaa' }
        : member,
    ),
  };

  const result = buildSnsFandomYoutubeQuotaMeasurementHandoff({
    handoffId: 'sns-fandom-youtube-quota-measurement-v1',
    preparedAt: '2026-10-02T14:00:00.000Z',
    artistBindingManifest: forgedManifest,
    providerClientIdentity: providerClientIdentity(),
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    measurementWindowStart: '2026-09-01T00:00:00.000Z',
    measurementWindowEnd: '2026-10-01T00:00:00.000Z',
    reactionSnapshotRunsPerDay: 4,
    cadenceEvidenceRef: 'external://youtube-audit/reaction-cadence',
    providerBatchLimitEvidenceRef:
      'external://youtube-audit/provider-batch-limits',
    providerQuotaCostEvidenceRef:
      'external://youtube-audit/provider-quota-costs',
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.tasks.length, 0);
  assert.ok(
    result.blockers.includes(
      'youtube-quota-measurement-binding-manifest-not-ready',
    ),
  );
});

test('provider client identity is mandatory before quota measurement can be handed off', async () => {
  const manifest = await mergedAuditManifest();

  const result = buildSnsFandomYoutubeQuotaMeasurementHandoff({
    handoffId: 'sns-fandom-youtube-quota-measurement-v1',
    preparedAt: '2026-10-02T14:00:00.000Z',
    artistBindingManifest: manifest,
    providerClientIdentity: null,
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    measurementWindowStart: '2026-09-01T00:00:00.000Z',
    measurementWindowEnd: '2026-10-01T00:00:00.000Z',
    reactionSnapshotRunsPerDay: 4,
    cadenceEvidenceRef: 'external://youtube-audit/reaction-cadence',
    providerBatchLimitEvidenceRef:
      'external://youtube-audit/provider-batch-limits',
    providerQuotaCostEvidenceRef:
      'external://youtube-audit/provider-quota-costs',
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.tasks.length, 0);
  assert.ok(
    result.blockers.includes(
      'youtube-quota-measurement-provider-client-identity-missing',
    ),
  );
});

test('measurement window and cadence must be explicit evidence, never defaults', async () => {
  const manifest = await mergedAuditManifest();

  const result = buildSnsFandomYoutubeQuotaMeasurementHandoff({
    handoffId: 'sns-fandom-youtube-quota-measurement-v1',
    preparedAt: '2026-10-02T14:00:00.000Z',
    artistBindingManifest: manifest,
    providerClientIdentity: providerClientIdentity(),
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    measurementWindowStart: '',
    measurementWindowEnd: '',
    reactionSnapshotRunsPerDay: 0,
    cadenceEvidenceRef: '',
    providerBatchLimitEvidenceRef:
      'external://youtube-audit/provider-batch-limits',
    providerQuotaCostEvidenceRef:
      'external://youtube-audit/provider-quota-costs',
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.tasks.length, 0);
  assert.equal(result.arbitraryCadenceApplied, false);
  assert.equal(result.arbitraryMeasurementWindowApplied, false);
  assert.ok(
    result.blockers.includes('youtube-quota-measurement-window-invalid'),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-quota-measurement-reaction-cadence-invalid',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-quota-measurement-cadenceEvidenceRef-missing',
    ),
  );
});

test('reaction-only audit measurement cannot silently expand into comment endpoints', async () => {
  const manifest = await mergedAuditManifest();

  const result = buildSnsFandomYoutubeQuotaMeasurementHandoff({
    handoffId: 'sns-fandom-youtube-quota-measurement-v1',
    preparedAt: '2026-10-02T14:00:00.000Z',
    artistBindingManifest: manifest,
    providerClientIdentity: providerClientIdentity(),
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
      'youtube.commentThreads.list',
    ],
    measurementWindowStart: '2026-09-01T00:00:00.000Z',
    measurementWindowEnd: '2026-10-01T00:00:00.000Z',
    reactionSnapshotRunsPerDay: 4,
    cadenceEvidenceRef: 'external://youtube-audit/reaction-cadence',
    providerBatchLimitEvidenceRef:
      'external://youtube-audit/provider-batch-limits',
    providerQuotaCostEvidenceRef:
      'external://youtube-audit/provider-quota-costs',
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.tasks.length, 0);
  assert.ok(
    result.blockers.includes(
      'youtube-quota-measurement-endpoint-scope-mismatch',
    ),
  );
});
