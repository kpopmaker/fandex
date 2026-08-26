import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowPath = new URL('../.github/workflows/codex-version-pr-auto-merge.yml', import.meta.url);
const agentsPath = new URL('../AGENTS.md', import.meta.url);

test('version PR automation requires explicit label and exact-head non-author approval', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(workflow, /pull_request_target:[\s\S]*ready_for_review, labeled, unlabeled/);
  assert.match(workflow, /pull_request_review:[\s\S]*submitted, dismissed/);
  assert.match(workflow, /github\.event\.pull_request\.draft == false/);
  assert.match(workflow, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'production-merge-approved'\)/);
  assert.match(workflow, /\.state == \\"APPROVED\\" and \.commit_id == \\"\$\{HEAD_SHA\}\\" and \.user\.login != \\"\$\{PR_AUTHOR\}\\"/);
  assert.match(workflow, /needs: \[authorize, validate\]/);
  assert.match(workflow, /Head, draft state, or explicit merge label changed; refusing merge\./);
  assert.match(workflow, /Exact-head approval is absent or was dismissed; refusing merge\./);
  assert.match(workflow, /Final exact-head authorization check failed; refusing merge\./);
  assert.doesNotMatch(workflow, /\s--auto(?:\s|\\)/);
});

test('untrusted head validation runs read-only and without persisted checkout credentials', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const validateJob = workflow.slice(workflow.indexOf('  validate:'), workflow.indexOf('  merge:'));

  assert.match(workflow, /^permissions: \{\}$/m);
  assert.match(validateJob, /permissions:\n      contents: read/);
  assert.doesNotMatch(validateJob, /contents: write|pull-requests: write/);
  assert.match(validateJob, /persist-credentials: false/);
  assert.match(validateJob, /npm run security:audit:production/);
  for (const script of ['typecheck','lint','test:security','test:persistence','test:role-bootstrap','test:production-bootstrap','test:deployment-readiness','test:merge-safety','db:migrate','db:roles','build']) {
    assert.match(validateJob, new RegExp(`npm run ${script.replace(':', '\\:')}`));
  }
});

test('repository instructions keep non-merge work draft and label-free', async () => {
  const instructions = await readFile(agentsPath, 'utf8');

  assert.match(instructions, /Create a \*\*Draft\*\* PR/);
  assert.match(instructions, /Never add the `production-merge-approved` label without explicit merge authorization/);
  assert.match(instructions, /If merge or Production deployment is excluded, keep the PR Draft/);
});
