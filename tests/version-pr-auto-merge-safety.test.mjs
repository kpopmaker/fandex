import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { evaluateVersionPrReviews } from '../scripts/github/evaluate-version-pr-reviews.mjs';

const workflowPath = new URL('../.github/workflows/codex-version-pr-auto-merge.yml', import.meta.url);
const agentsPath = new URL('../AGENTS.md', import.meta.url);
const evaluatorPath = new URL('../scripts/github/evaluate-version-pr-reviews.mjs', import.meta.url);

const headSha = 'a'.repeat(40);

function git(args, cwd, options = {}) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', ...options });
}
const review = ({ id, login, state, submittedAt, association = 'COLLABORATOR', commitId = headSha, accountType = 'User' }) => ({
  id,
  user: { login, type: accountType },
  state,
  submitted_at: submittedAt,
  author_association: association,
  commit_id: commitId,
});

test('version PR automation requires explicit label, exact base/head, and trusted current approval', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(workflow, /pull_request_target:[\s\S]*ready_for_review, converted_to_draft, closed, edited, labeled, unlabeled/);
  assert.match(workflow, /pull_request_review:[\s\S]*submitted, dismissed/);
  assert.match(workflow, /github\.event\.pull_request\.state == 'open'/);
  assert.match(workflow, /github\.event\.pull_request\.draft == false/);
  assert.match(workflow, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'production-merge-approved'\)/);
  assert.match(workflow, /evaluate-version-pr-reviews\.mjs/);
  assert.match(workflow, /--paginate --slurp/);
  assert.match(workflow, /baseRefOid/);
  assert.match(workflow, /baseRefName/);
  assert.match(workflow, /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(workflow, /git merge --no-commit --no-ff "\$\{HEAD_SHA\}"/);
  assert.match(workflow, /needs: \[authorize, validate\]/);
  assert.match(workflow, /PR state, base ref, head, base, draft state, or explicit merge label changed; refusing merge\./);
  assert.match(workflow, /Current trusted exact-head approval is absent or a trusted changes request is active; refusing merge\./);
  assert.match(workflow, /Final exact-base\/head authorization check failed; refusing merge\./);
  assert.match(workflow, /git ls-remote --exit-code origin refs\/heads\/main/);
  assert.match(workflow, /git commit-tree "\$\{merge_tree\}" -p "\$\{BASE_SHA\}" -p "\$\{HEAD_SHA\}"/);
  assert.match(workflow, /git push --force-with-lease="refs\/heads\/main:\$\{BASE_SHA\}"/);
  assert.match(workflow, /"https:\/\/x-access-token@github\.com\/\$\{REPOSITORY\}\.git"/);
  assert.match(workflow, /"\$\{merge_sha\}:refs\/heads\/main"/);
  assert.doesNotMatch(workflow, /gh pr merge/);
  assert.equal((workflow.match(/--force-with-lease=/g) ?? []).length, 1);
  assert.doesNotMatch(workflow, /git push[^\n]*(?:\s--force(?:\s|$)|\s-f(?:\s|$))/);
  assert.doesNotMatch(workflow, /\s--auto(?:\s|\\)/);
  assert.equal((workflow.match(/actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/g) ?? []).length, 3);
  assert.equal((workflow.match(/actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/g) ?? []).length, 3);
  assert.doesNotMatch(workflow, /uses:\s+actions\/(?:checkout|setup-node)@v\d/);
});

test('closed or retargeted PRs cancel fail-closed and merge uses least privilege', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const mergeJob = workflow.slice(workflow.indexOf('  merge:'));

  assert.match(workflow, /types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft, closed, edited, labeled, unlabeled\]/);
  assert.match(workflow, /current_state="\$\(jq -r '\.state'/);
  assert.match(workflow, /current_base_ref="\$\(jq -r '\.baseRefName'/);
  assert.match(workflow, /"\$\{current_state\}" != "OPEN"/);
  assert.match(workflow, /"\$\{current_base_ref\}" != "main"/);
  assert.match(workflow, /"\$\{final_state\}" != "OPEN"/);
  assert.match(workflow, /"\$\{final_base_ref\}" != "main"/);
  assert.match(mergeJob, /permissions:\n      contents: write\n      pull-requests: read\n      statuses: read/);
  assert.doesNotMatch(mergeJob, /pull-requests: write/);
});

test('trusted approval on the exact head survives later non-decisive comments', () => {
  const result = evaluateVersionPrReviews([[
    review({ id: 1, login: 'reviewer', state: 'APPROVED', submittedAt: '2026-08-26T00:00:00Z' }),
    review({ id: 2, login: 'reviewer', state: 'COMMENTED', submittedAt: '2026-08-26T00:01:00Z' }),
  ]], { headSha, prAuthor: 'author' });
  assert.deepEqual(result, { authorized: true, approvedCount: 1, changesRequestedCount: 0, trustedReviewerCount: 1 });
});

test('a later trusted changes request supersedes the same reviewers older approval', () => {
  const result = evaluateVersionPrReviews([
    [review({ id: 1, login: 'reviewer', state: 'APPROVED', submittedAt: '2026-08-26T00:00:00Z' })],
    [review({ id: 2, login: 'reviewer', state: 'CHANGES_REQUESTED', submittedAt: '2026-08-26T00:01:00Z' })],
  ], { headSha, prAuthor: 'author' });
  assert.deepEqual(result, { authorized: false, approvedCount: 0, changesRequestedCount: 1, trustedReviewerCount: 1 });
});

test('any current trusted changes request blocks another reviewers approval', () => {
  const result = evaluateVersionPrReviews([[
    review({ id: 1, login: 'approver', state: 'APPROVED', submittedAt: '2026-08-26T00:00:00Z', association: 'MEMBER' }),
    review({ id: 2, login: 'blocker', state: 'CHANGES_REQUESTED', submittedAt: '2026-08-26T00:01:00Z', association: 'OWNER' }),
  ]], { headSha, prAuthor: 'author' });
  assert.deepEqual(result, { authorized: false, approvedCount: 1, changesRequestedCount: 1, trustedReviewerCount: 2 });
});

test('outsiders, the PR author, and approvals from an older head cannot authorize', () => {
  const result = evaluateVersionPrReviews([[
    review({ id: 1, login: 'outsider', state: 'APPROVED', submittedAt: '2026-08-26T00:00:00Z', association: 'NONE' }),
    review({ id: 2, login: 'AUTHOR', state: 'APPROVED', submittedAt: '2026-08-26T00:01:00Z', association: 'OWNER' }),
    review({ id: 3, login: 'reviewer', state: 'APPROVED', submittedAt: '2026-08-26T00:02:00Z', commitId: 'b'.repeat(40) }),
  ]], { headSha, prAuthor: 'author' });
  assert.deepEqual(result, { authorized: false, approvedCount: 0, changesRequestedCount: 0, trustedReviewerCount: 0 });
});

test('bot and untyped accounts cannot provide human approval', () => {
  const untypedReview = review({
    id: 2,
    login: 'untyped-reviewer',
    state: 'APPROVED',
    submittedAt: '2026-08-26T00:01:00Z',
  });
  delete untypedReview.user.type;

  const result = evaluateVersionPrReviews([[
    review({
      id: 1,
      login: 'trusted-bot',
      state: 'APPROVED',
      submittedAt: '2026-08-26T00:00:00Z',
      association: 'MEMBER',
      accountType: 'Bot',
    }),
    untypedReview,
  ]], { headSha, prAuthor: 'author' });

  assert.deepEqual(result, { authorized: false, approvedCount: 0, changesRequestedCount: 0, trustedReviewerCount: 0 });
});

test('review evaluator CLI consumes paginated GitHub JSON and emits one bounded decision', () => {
  const execution = spawnSync(process.execPath, [fileURLToPath(evaluatorPath), '--head-sha', headSha, '--pr-author', 'author'], {
    encoding: 'utf8',
    input: JSON.stringify([[review({ id: 1, login: 'reviewer', state: 'APPROVED', submittedAt: '2026-08-26T00:00:00Z' })]]),
  });
  assert.equal(execution.status, 0, execution.stderr);
  assert.deepEqual(JSON.parse(execution.stdout), { authorized: true, approvedCount: 1, changesRequestedCount: 0, trustedReviewerCount: 1 });
});

test('malformed trusted decisive review fails closed', () => {
  assert.throws(() => evaluateVersionPrReviews([[
    review({ id: 1, login: 'reviewer', state: 'APPROVED', submittedAt: 'not-a-time' }),
  ]], { headSha, prAuthor: 'author' }), /review_submitted_at_invalid/);

  const missingId = review({ id: 2, login: 'reviewer', state: 'APPROVED', submittedAt: '2026-08-26T00:00:00Z' });
  delete missingId.id;
  assert.throws(() => evaluateVersionPrReviews([[missingId]], { headSha, prAuthor: 'author' }), /review_id_missing/);
});

test('exact base/head merge-tree validation runs read-only and without persisted checkout credentials', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const validateJob = workflow.slice(workflow.indexOf('  validate:'), workflow.indexOf('  merge:'));

  assert.match(workflow, /^permissions: \{\}$/m);
  assert.match(validateJob, /permissions:\n      contents: read/);
  assert.doesNotMatch(validateJob, /contents: write|pull-requests: write/);
  assert.match(validateJob, /persist-credentials: false/);
  assert.match(validateJob, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(validateJob, /fetch-depth: 0/);
  assert.match(validateJob, /git diff --check --cached/);
  assert.match(validateJob, /npm run security:audit:production/);
  for (const script of ['typecheck','lint','test:security','test:persistence','test:role-bootstrap','test:production-bootstrap','test:deployment-readiness','test:merge-safety','db:migrate','db:roles','build']) {
    assert.match(validateJob, new RegExp(`npm run ${script.replace(':', '\\:')}`));
  }
});

test('an exact-base lease accepts the authorized unchanged main', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fandex-merge-lease-success-'));
  const remote = join(root, 'remote.git');
  const work = join(root, 'work');
  try {
    assert.equal(git(['init', '--bare', remote], root).status, 0);
    assert.equal(git(['init', work], root).status, 0);
    assert.equal(git(['config', 'user.name', 'FANDEX Test'], work).status, 0);
    assert.equal(git(['config', 'user.email', 'fandex-test@example.invalid'], work).status, 0);

    await writeFile(join(work, 'base.txt'), 'base\n');
    assert.equal(git(['add', 'base.txt'], work).status, 0);
    assert.equal(git(['commit', '-m', 'base'], work).status, 0);
    const base = git(['rev-parse', 'HEAD'], work).stdout.trim();
    assert.equal(git(['remote', 'add', 'origin', remote], work).status, 0);
    assert.equal(git(['push', 'origin', `${base}:refs/heads/main`], work).status, 0);

    assert.equal(git(['checkout', '-b', 'feature'], work).status, 0);
    await writeFile(join(work, 'feature.txt'), 'feature\n');
    assert.equal(git(['add', 'feature.txt'], work).status, 0);
    assert.equal(git(['commit', '-m', 'feature'], work).status, 0);
    const head = git(['rev-parse', 'HEAD'], work).stdout.trim();

    assert.equal(git(['checkout', '--detach', base], work).status, 0);
    assert.equal(git(['merge', '--no-commit', '--no-ff', head], work).status, 0);
    const tree = git(['write-tree'], work).stdout.trim();
    const merge = git(['commit-tree', tree, '-p', base, '-p', head], work, { input: 'guarded merge\n' });
    assert.equal(merge.status, 0, merge.stderr);

    const accepted = git(['push', `--force-with-lease=refs/heads/main:${base}`, 'origin', `${merge.stdout.trim()}:refs/heads/main`], work);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.equal(git(['ls-remote', '--exit-code', 'origin', 'refs/heads/main'], work).stdout.split(/\s/)[0], merge.stdout.trim());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('an exact-base lease rejects a divergent moved main', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fandex-merge-cas-'));
  const remote = join(root, 'remote.git');
  const work = join(root, 'work');
  try {
    assert.equal(git(['init', '--bare', remote], root).status, 0);
    assert.equal(git(['init', work], root).status, 0);
    assert.equal(git(['config', 'user.name', 'FANDEX Test'], work).status, 0);
    assert.equal(git(['config', 'user.email', 'fandex-test@example.invalid'], work).status, 0);

    await writeFile(join(work, 'base.txt'), 'base\n');
    assert.equal(git(['add', 'base.txt'], work).status, 0);
    assert.equal(git(['commit', '-m', 'base'], work).status, 0);
    assert.equal(git(['branch', '-M', 'main'], work).status, 0);
    const base = git(['rev-parse', 'HEAD'], work).stdout.trim();

    assert.equal(git(['checkout', '-b', 'feature'], work).status, 0);
    await writeFile(join(work, 'feature.txt'), 'feature\n');
    assert.equal(git(['add', 'feature.txt'], work).status, 0);
    assert.equal(git(['commit', '-m', 'feature'], work).status, 0);
    const head = git(['rev-parse', 'HEAD'], work).stdout.trim();

    assert.equal(git(['checkout', 'main'], work).status, 0);
    await writeFile(join(work, 'moved.txt'), 'moved\n');
    assert.equal(git(['add', 'moved.txt'], work).status, 0);
    assert.equal(git(['commit', '-m', 'move main'], work).status, 0);
    assert.equal(git(['remote', 'add', 'origin', remote], work).status, 0);
    assert.equal(git(['push', 'origin', 'main'], work).status, 0);

    assert.equal(git(['checkout', '--detach', base], work).status, 0);
    assert.equal(git(['merge', '--no-commit', '--no-ff', head], work).status, 0);
    const tree = git(['write-tree'], work).stdout.trim();
    const merge = git(['commit-tree', tree, '-p', base, '-p', head], work, { input: 'guarded merge\n' });
    assert.equal(merge.status, 0, merge.stderr);

    const rejected = git(['push', `--force-with-lease=refs/heads/main:${base}`, 'origin', `${merge.stdout.trim()}:refs/heads/main`], work);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /stale info|rejected/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('an exact-base lease rejects main moving to the PR head', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fandex-merge-head-race-'));
  const remote = join(root, 'remote.git');
  const work = join(root, 'work');
  try {
    assert.equal(git(['init', '--bare', remote], root).status, 0);
    assert.equal(git(['init', work], root).status, 0);
    assert.equal(git(['config', 'user.name', 'FANDEX Test'], work).status, 0);
    assert.equal(git(['config', 'user.email', 'fandex-test@example.invalid'], work).status, 0);

    await writeFile(join(work, 'base.txt'), 'base\n');
    assert.equal(git(['add', 'base.txt'], work).status, 0);
    assert.equal(git(['commit', '-m', 'base'], work).status, 0);
    const base = git(['rev-parse', 'HEAD'], work).stdout.trim();

    assert.equal(git(['checkout', '-b', 'feature'], work).status, 0);
    await writeFile(join(work, 'feature.txt'), 'feature\n');
    assert.equal(git(['add', 'feature.txt'], work).status, 0);
    assert.equal(git(['commit', '-m', 'feature'], work).status, 0);
    const head = git(['rev-parse', 'HEAD'], work).stdout.trim();
    assert.equal(git(['remote', 'add', 'origin', remote], work).status, 0);
    assert.equal(git(['push', 'origin', `${head}:refs/heads/main`], work).status, 0);

    assert.equal(git(['checkout', '--detach', base], work).status, 0);
    assert.equal(git(['merge', '--no-commit', '--no-ff', head], work).status, 0);
    const tree = git(['write-tree'], work).stdout.trim();
    const merge = git(['commit-tree', tree, '-p', base, '-p', head], work, { input: 'guarded merge\n' });
    assert.equal(merge.status, 0, merge.stderr);

    const rejected = git(['push', `--force-with-lease=refs/heads/main:${base}`, 'origin', `${merge.stdout.trim()}:refs/heads/main`], work);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /stale info|rejected/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('repository instructions keep non-merge work draft and label-free', async () => {
  const instructions = await readFile(agentsPath, 'utf8');

  assert.match(instructions, /Create a \*\*Draft\*\* PR/);
  assert.match(instructions, /Never add the `production-merge-approved` label without explicit merge authorization/);
  assert.match(instructions, /If merge or Production deployment is excluded, keep the PR Draft/);
  assert.match(instructions, /exact expected-base `--force-with-lease`/);
  assert.match(instructions, /lease must fail if `main` moves from the authorized base/);
  assert.match(instructions, /including when it moves to the PR head or one of its ancestors/);
  assert.match(instructions, /open and still targets `main`/);
  assert.match(instructions, /pull-request metadata read-only/);
});
