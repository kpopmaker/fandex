import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeSubmissionOwnerHandoff,
  type SnsFandomYoutubeSubmissionOwnerHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeSubmissionOwnerHandoff';

function input(
  overrides: Partial<SnsFandomYoutubeSubmissionOwnerHandoffInput> = {},
): SnsFandomYoutubeSubmissionOwnerHandoffInput {
  return {
    applicantIdentityRef:
      'google-drive://file/private-applicant-evidence',
    organizationOrSelfRef:
      'google-drive://file/private-self-application-evidence',
    derivedMetricsAndStorageAmendmentAccepted: true,
    ...overrides,
  };
}

test('empty Phase D owner input stays pending on exactly three deliberate owner values', () => {
  const result = evaluateSnsFandomYoutubeSubmissionOwnerHandoff({
    applicantIdentityRef: null,
    organizationOrSelfRef: null,
    derivedMetricsAndStorageAmendmentAccepted: false,
  });

  assert.equal(result.state, 'awaiting-owner-evidence');
  assert.deepEqual(result.pendingOwnerFields, [
    'applicantIdentityRef',
    'derivedMetricsAndStorageAmendmentAccepted',
    'organizationOrSelfRef',
  ]);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.applicantIdentityRef, null);
  assert.equal(result.organizationOrSelfRef, null);
  assert.equal(result.amendmentAccepted, false);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.productActivationAuthorized, false);
});

test('durable non-secret refs plus explicit amendment acceptance become owner-evidence-ready only', () => {
  const result = evaluateSnsFandomYoutubeSubmissionOwnerHandoff(input());

  assert.equal(result.state, 'submission-owner-evidence-ready');
  assert.deepEqual(result.pendingOwnerFields, []);
  assert.deepEqual(result.blockers, []);
  assert.equal(
    result.applicantIdentityRef,
    'google-drive://file/private-applicant-evidence',
  );
  assert.equal(
    result.organizationOrSelfRef,
    'google-drive://file/private-self-application-evidence',
  );
  assert.equal(result.amendmentAccepted, true);

  assert.equal(result.secretMaterialStored, false);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.providerApprovalGranted, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.productActivationAuthorized, false);
});

test('raw identity text is rejected because owner files must store references, not legal identity contents', () => {
  const result = evaluateSnsFandomYoutubeSubmissionOwnerHandoff(
    input({
      applicantIdentityRef: 'Kim Example',
      organizationOrSelfRef: 'individual self application',
    }),
  );

  assert.equal(result.state, 'awaiting-owner-evidence');
  assert.ok(
    result.blockers.includes(
      'youtube-submission-owner-applicant-identity-ref-not-durable',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-submission-owner-organization-or-self-ref-not-durable',
    ),
  );
});

test('secret-like evidence references fail closed', () => {
  const result = evaluateSnsFandomYoutubeSubmissionOwnerHandoff(
    input({
      applicantIdentityRef:
        'https://example.com/private?access_token=do-not-store',
    }),
  );

  assert.equal(result.state, 'awaiting-owner-evidence');
  assert.ok(
    result.blockers.includes(
      'youtube-submission-owner-applicant-identity-ref-secret-like',
    ),
  );
});

test('checked-in Phase D owner input is ready, reference-only, and secret-free', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-submission-owner-input-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as SnsFandomYoutubeSubmissionOwnerHandoffInput & Record<string, unknown>;

  const result = evaluateSnsFandomYoutubeSubmissionOwnerHandoff(raw);

  assert.equal(raw.state, 'submission-owner-evidence-ready');
  assert.equal(raw.applicantIdentityRef, 'https://docs.google.com/document/d/1Hbv5JP7n0ixYDNwcaJPg2Nx8JN_pK1ultruvf1BBaX4/edit?usp=drivesdk');
  assert.equal(raw.organizationOrSelfRef, 'https://docs.google.com/document/d/1Hbv5JP7n0ixYDNwcaJPg2Nx8JN_pK1ultruvf1BBaX4/edit?usp=drivesdk');
  assert.equal(raw.derivedMetricsAndStorageAmendmentAccepted, true);

  assert.equal(result.state, 'submission-owner-evidence-ready');
  assert.deepEqual(result.pendingOwnerFields, []);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.amendmentAccepted, true);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);

  assert.equal(
    /AIza|access_token|refresh_token|client_secret|api_key=/i.test(
      JSON.stringify(raw),
    ),
    false,
  );
});
