import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateVercelGitDeploymentRequirement,
} from '../scripts/github/evaluate-vercel-pr-head-requirement.mjs';

const vercelConfigUrl = new URL('../vercel.json', import.meta.url);
const mergeWorkflowUrl = new URL(
  '../.github/workflows/codex-version-pr-auto-merge.yml',
  import.meta.url,
);
const policyDocUrl = new URL(
  '../docs/operations/fandex-ci-cd-deployment-policy-v1.md',
  import.meta.url,
);

test('trusted Vercel policy disables automatic integration previews but keeps main enabled', async () => {
  const config = JSON.parse(await readFile(vercelConfigUrl, 'utf8'));

  assert.deepEqual(
    evaluateVercelGitDeploymentRequirement({
      headRef: 'integration/brand-fit-contract-v2',
      config,
    }),
    {
      required: false,
      reason: 'deployment-disabled-wildcard',
      source: 'vercel-json',
    },
  );

  assert.deepEqual(
    evaluateVercelGitDeploymentRequirement({
      headRef: 'main',
      config,
    }),
    {
      required: true,
      reason: 'deployment-enabled-exact-ref',
      source: 'vercel-json',
    },
  );
});

test('unspecified or invalid Vercel deployment policy fails closed', () => {
  for (const config of [
    null,
    {},
    { git: {} },
    { git: { deploymentEnabled: { integration: 'no' } } },
  ]) {
    const result = evaluateVercelGitDeploymentRequirement({
      headRef: 'integration/example',
      config,
    });
    assert.equal(result.required, true);
  }
});

test('exact branch rule overrides wildcard rule', () => {
  const config = {
    git: {
      deploymentEnabled: {
        '*': false,
        'integration/special': true,
      },
    },
  };

  assert.equal(
    evaluateVercelGitDeploymentRequirement({
      headRef: 'integration/special',
      config,
    }).required,
    true,
  );
  assert.equal(
    evaluateVercelGitDeploymentRequirement({
      headRef: 'integration/ordinary',
      config,
    }).required,
    false,
  );
});

test('guarded merge consults trusted base policy before waiting for Vercel status', async () => {
  const source = await readFile(mergeWorkflowUrl, 'utf8');

  assert.match(
    source,
    /evaluate-vercel-pr-head-requirement\.mjs/,
  );
  assert.match(source, /--head-ref "\$\{HEAD_REF\}"/);
  assert.match(source, /--config-path vercel\.json/);

  const evaluatorIndex = source.indexOf(
    'evaluate-vercel-pr-head-requirement.mjs',
  );
  const statusIndex = source.indexOf(
    'commits/${HEAD_SHA}/status',
  );
  assert.ok(evaluatorIndex >= 0);
  assert.ok(statusIndex > evaluatorIndex);

  assert.match(
    source,
    /PR-head Vercel deployment is not required by trusted base policy/,
  );
  assert.match(
    source,
    /failure\|error\)[\s\S]*Vercel check failed/,
  );
});

test('guarded merge retains exact owner authorization and repository-workflow merge authority', async () => {
  const source = await readFile(mergeWorkflowUrl, 'utf8');

  assert.match(source, /production-merge-approved/);
  assert.match(
    source,
    /evaluate-version-pr-owner-attestations\.mjs/,
  );
  assert.match(
    source,
    /git push --force-with-lease="refs\/heads\/main:\$\{BASE_SHA\}"/,
  );
  assert.doesNotMatch(source, /gh pr merge/);
});

test('CI/CD policy documentation matches main-only automatic deployment behavior', async () => {
  const source = await readFile(policyDocUrl, 'utf8');

  assert.match(
    source,
    /\| `integration\/\*` \| required as applicable \| disabled/,
  );
  assert.match(
    source,
    /\| `main` \| required by Production gate \| enabled/,
  );
  assert.match(
    source,
    /automatic Vercel Preview is not required for `integration\/\*`/,
  );
  assert.match(
    source,
    /Production deployment remains bound to `main`/,
  );
});
