import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeProviderClientOwnerHandoff,
  type SnsFandomYoutubeProviderClientOwnerHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeProviderClientOwnerHandoff';

function input(
  overrides: Partial<SnsFandomYoutubeProviderClientOwnerHandoffInput> = {},
): SnsFandomYoutubeProviderClientOwnerHandoffInput {
  return {
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    googleCloudProjectNumber: '123456789012',
    googleCloudProjectId: 'fandex-youtube-primary',
    credentialLocatorRef:
      'github-actions-secret://FANDEX_SNS_FANDOM_YOUTUBE_API_KEY',
    cloudProjectEvidenceRef:
      'external://youtube-audit/cloud-project-console',
    verifiedAt: '2026-10-02T15:00:00.000Z',
    ...overrides,
  };
}

test('empty owner handoff stays blocked and reports exact required fields', () => {
  const result = evaluateSnsFandomYoutubeProviderClientOwnerHandoff({
    providerClientRef: null,
    googleCloudProjectNumber: null,
    googleCloudProjectId: null,
    credentialLocatorRef: null,
    cloudProjectEvidenceRef: null,
    verifiedAt: null,
  });

  assert.equal(result.state, 'awaiting-owner-evidence');
  assert.deepEqual(result.missingOwnerFields, [
    'cloudProjectEvidenceRef',
    'credentialLocatorRef',
    'googleCloudProjectNumber',
    'providerClientRef',
    'verifiedAt',
  ]);
  assert.equal(result.providerClientIdentity, null);
  assert.equal(result.providerApprovalGranted, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('complete non-secret owner evidence canonicalizes through provider identity contract', () => {
  const result = evaluateSnsFandomYoutubeProviderClientOwnerHandoff(input());

  assert.equal(result.state, 'provider-client-identity-ready');
  assert.deepEqual(result.missingOwnerFields, []);
  assert.equal(
    result.providerClientIdentity?.state,
    'provider-client-identity-ready',
  );
  assert.equal(
    result.providerClientIdentity?.googleCloudProjectNumber,
    '123456789012',
  );
  assert.equal(
    result.providerClientIdentity?.credentialLocatorRef,
    'github-actions-secret://FANDEX_SNS_FANDOM_YOUTUBE_API_KEY',
  );
  assert.equal(result.secretMaterialStored, false);
  assert.equal(result.providerApprovalGranted, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('owner handoff rejects embedded API key material', () => {
  const result = evaluateSnsFandomYoutubeProviderClientOwnerHandoff(
    input({
      cloudProjectEvidenceRef:
        'external://youtube-audit?api_key=AIza-do-not-store-this',
    }),
  );

  assert.equal(result.state, 'awaiting-owner-evidence');
  assert.equal(result.providerClientIdentity, null);
  assert.ok(
    result.blockers.includes(
      'youtube-client-owner-handoff-cloudProjectEvidenceRef-secret-like',
    ),
  );
});

test('invalid project metadata stays blocked by the canonical identity contract', () => {
  const result = evaluateSnsFandomYoutubeProviderClientOwnerHandoff(
    input({
      googleCloudProjectNumber: 'not-a-project-number',
      googleCloudProjectId: 'INVALID PROJECT',
    }),
  );

  assert.equal(result.state, 'awaiting-owner-evidence');
  assert.equal(result.providerClientIdentity, null);
  assert.ok(
    result.blockers.includes('youtube-client-cloud-project-number-invalid'),
  );
  assert.ok(
    result.blockers.includes('youtube-client-cloud-project-id-invalid'),
  );
});

test('owner-input template remains intentionally unresolved and secret-free', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-provider-client-owner-input-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Record<string, unknown>;

  assert.equal(raw.state, 'awaiting-owner-evidence');
  assert.equal(raw.providerClientRef, null);
  assert.equal(raw.googleCloudProjectNumber, null);
  assert.equal(raw.googleCloudProjectId, null);
  assert.equal(raw.credentialLocatorRef, null);
  assert.equal(raw.cloudProjectEvidenceRef, null);
  assert.equal(raw.verifiedAt, null);
  assert.equal(raw.providerApprovalGranted, false);
  assert.equal(raw.productionCollectionAuthorized, false);
  assert.equal(raw.providerSubmissionAuthorized, false);
  assert.equal(
    /AIza|access_token|refresh_token|client_secret|api_key=/i.test(
      JSON.stringify(raw),
    ),
    false,
  );
});
