import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MOMENTUM_PRODUCT_ACTIVATION_APPROVAL,
  MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE,
} from '../lib/product/activation/momentumProductActivationApproval';

test('Momentum approved activation evidence matches the code-level approval record', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-product/iu_momentum_product_activation_authorization_approved_v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  const evidence = JSON.parse(raw);

  assert.equal(
    evidence.approval.activationAuthorizationId,
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.activationAuthorizationId,
  );
  assert.equal(
    evidence.approval.authorizedAt,
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.authorizedAt,
  );
  assert.equal(
    evidence.approval.authorizationEvidenceCommentId,
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE
      .authorizationEvidenceCommentId,
  );
  assert.equal(
    evidence.approval.authorizedMain,
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE.authorizedMain,
  );
  assert.deepEqual(
    evidence.authorizationDecision,
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE.decision,
  );
  assert.equal(evidence.binding.productionBindingCurrent, false);
  assert.equal(evidence.binding.productionRevalidationRequired, true);
  assert.equal(
    evidence.binding.productionBlockReason,
    'vercel-team-fair-use-block',
  );
  assert.deepEqual(evidence.safetyBoundary, {
    databaseWrites: 0,
    registryMutations: 0,
    productPublications: 0,
    publicRouteCutovers: 0,
    productionVerifierExecutions: 0,
  });
});
