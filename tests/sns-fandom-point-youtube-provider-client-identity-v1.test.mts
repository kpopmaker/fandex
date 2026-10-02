import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeProviderClientIdentity,
  type SnsFandomYoutubeProviderClientIdentityInput,
} from '../lib/intelligence/snsFandomPointYoutubeProviderClientIdentity';

function identity(
  overrides: Partial<SnsFandomYoutubeProviderClientIdentityInput> = {},
): SnsFandomYoutubeProviderClientIdentityInput {
  return {
    providerId: 'youtube-data-api',
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    googleCloudProjectNumber: '123456789012',
    googleCloudProjectId: 'fandex-youtube-primary',
    credentialLocatorRef:
      'github-actions-secret://FANDEX_SNS_FANDOM_YOUTUBE_API_KEY',
    evidenceRef: 'external://youtube-audit/cloud-project-console',
    verifiedAt: '2026-10-02T11:30:00.000Z',
    ...overrides,
  };
}

test('non-secret Cloud project binding can become provider-client-identity-ready', () => {
  const result = evaluateSnsFandomYoutubeProviderClientIdentity(identity());

  assert.equal(result.state, 'provider-client-identity-ready');
  assert.equal(result.providerId, 'youtube-data-api');
  assert.equal(
    result.providerClientRef,
    'gcp-project-fandex-youtube-primary',
  );
  assert.equal(result.googleCloudProjectNumber, '123456789012');
  assert.equal(result.googleCloudProjectId, 'fandex-youtube-primary');
  assert.equal(
    result.credentialLocatorRef,
    'github-actions-secret://FANDEX_SNS_FANDOM_YOUTUBE_API_KEY',
  );
  assert.equal(result.secretMaterialStored, false);
  assert.equal(result.submissionEvidenceEligible, true);
  assert.deepEqual(result.blockers, []);
});

test('Cloud project number is required and must remain non-secret project metadata', () => {
  const result = evaluateSnsFandomYoutubeProviderClientIdentity(
    identity({
      googleCloudProjectNumber: 'project-number-unknown',
    }),
  );

  assert.equal(result.state, 'blocked');
  assert.equal(result.googleCloudProjectNumber, null);
  assert.ok(
    result.blockers.includes(
      'youtube-client-cloud-project-number-invalid',
    ),
  );
});

test('credential value cannot be embedded in the identity artifact', () => {
  const result = evaluateSnsFandomYoutubeProviderClientIdentity(
    identity({
      credentialLocatorRef:
        'external://credential?key=AIza-do-not-store-this',
    }),
  );

  assert.equal(result.state, 'blocked');
  assert.equal(result.credentialLocatorRef, null);
  assert.ok(
    result.blockers.includes(
      'youtube-client-credential-locator-secret-like',
    ),
  );
});

test('credential locator must name a secret store, not an arbitrary URL', () => {
  const result = evaluateSnsFandomYoutubeProviderClientIdentity(
    identity({
      credentialLocatorRef: 'https://example.com/youtube-api-key',
    }),
  );

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-client-credential-locator-invalid',
    ),
  );
});

test('identity evidence cannot contain secret-like material', () => {
  const result = evaluateSnsFandomYoutubeProviderClientIdentity(
    identity({
      evidenceRef:
        'external://youtube-audit?access_token=do-not-store-this',
    }),
  );

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-client-identity-evidence-secret-like',
    ),
  );
});

test('optional Google Cloud project id must use the provider project-id shape', () => {
  const result = evaluateSnsFandomYoutubeProviderClientIdentity(
    identity({
      googleCloudProjectId: 'INVALID PROJECT ID',
    }),
  );

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-client-cloud-project-id-invalid',
    ),
  );
});

test('verification timestamp must be exact ISO evidence time', () => {
  const result = evaluateSnsFandomYoutubeProviderClientIdentity(
    identity({
      verifiedAt: '2026-10-02',
    }),
  );

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-client-identity-verified-at-invalid',
    ),
  );
});
