import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  buildVersionPrOwnerAttestation,
  evaluateVersionPrOwnerAttestations,
} from '../scripts/github/evaluate-version-pr-owner-attestations.mjs';

const workflowPath = new URL('../.github/workflows/codex-version-pr-auto-merge.yml', import.meta.url);
const agentsPath = new URL('../AGENTS.md', import.meta.url);
const evaluatorPath = new URL('../scripts/github/evaluate-version-pr-owner-attestations.mjs', import.meta.url);

const baseSha = 'b'.repeat(40);
const headSha = 'a'.repeat(40);
const owner = 'kpopmaker';

function git(args, cwd, options = {}) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', ...options });
}
function ownerComment({
  id,
  login = owner,
  association = 'OWNER',
  accountType = 'User',
  body = buildVersionPrOwnerAttestation({ baseSha, headSha }),
  createdAt = '2026-08-27T00:00:00Z',
}) {
  return {
    id,
    user: { login, type: accountType },
    body,
    created_at: createdAt,
    author_association: association,
  };
}

test('version PR automation requires explicit label and exact-base/head owner attestation', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(workflow, /pull_request_target:[\s\S]*ready_for_review, converted_to_draft, closed, edited, labeled, unlabeled/);
  assert.match(workflow, /issue_comment:[\s\S]*created, edited, deleted/);
  assert.match(workflow, /github\.event_name == 'pull_request_target'/);
  assert.match(workflow, /github\.event\.pull_request\.state == 'open'/);
  assert.match(workflow, /github\.event\.pull_request\.draft == false/);
  assert.match(workflow, /github\.event\.pull_request\.user\.login == github\.repository_owner/);
  assert.match(workflow, /github\.event\.pull_request\.user\.type == 'User'/);
  assert.match(workflow, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'production-merge-approved'\)/);
  assert.match(workflow, /evaluate-version-pr-owner-attestations\.mjs/);
  assert.match(workflow, /issues\/\$\{PR_NUMBER\}\/comments\?per_page=100/);
  assert.match(workflow, /--base-sha "\$\{BASE_SHA\}"/);
  assert.match(workflow, /--head-sha "\$\{HEAD_SHA\}"/);
  assert.match(workflow, /--pr-author "\$\{PR_AUTHOR\}"/);
  assert.match(workflow, /--repository-owner "\$\{REPOSITORY_OWNER\}"/);
  assert.match(workflow, /--paginate --slurp/);
  assert.match(workflow, /baseRefOid/);
  assert.match(workflow, /baseRefName/);
  assert.match(workflow, /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(workflow, /git merge --no-commit --no-ff "\$\{HEAD_SHA\}"/);
  assert.match(workflow, /needs: \[authorize, validate\]/);
  assert.match(workflow, /PR state, base ref, head, base, draft state, or explicit merge label changed; refusing merge\./);
  assert.match(workflow, /Current solo-owner exact-base\/head attestation is absent; refusing merge\./);
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
  assert.doesNotMatch(workflow, /pulls\/\$\{PR_NUMBER\}\/reviews|evaluate-version-pr-reviews/);
  assert.equal((workflow.match(/issues\/\$\{PR_NUMBER\}\/comments\?per_page=100/g) ?? []).length, 3);
  assert.equal((workflow.match(/actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/g) ?? []).length, 3);
  assert.equal((workflow.match(/actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/g) ?? []).length, 3);
  assert.doesNotMatch(workflow, /uses:\s+actions\/(?:checkout|setup-node)@v\d/);
});

test('PR and owner-comment mutations cancel fail-closed and merge uses least privilege', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const mergeJob = workflow.slice(workflow.indexOf('  merge:'));

  assert.match(workflow, /types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft, closed, edited, labeled, unlabeled\]/);
  assert.match(workflow, /types: \[created, edited, deleted\]/);
  assert.match(workflow, /github\.event\.pull_request\.number \|\| github\.event\.issue\.number/);
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /current_state="\$\(jq -r '\.state'/);
  assert.match(workflow, /current_base_ref="\$\(jq -r '\.baseRefName'/);
  assert.match(workflow, /"\$\{current_state\}" != "OPEN"/);
  assert.match(workflow, /"\$\{current_base_ref\}" != "main"/);
  assert.match(workflow, /"\$\{final_state\}" != "OPEN"/);
  assert.match(workflow, /"\$\{final_base_ref\}" != "main"/);
  assert.match(mergeJob, /permissions:\n      contents: write\n      issues: read\n      pull-requests: read\n      statuses: read/);
  assert.doesNotMatch(mergeJob, /pull-requests: write/);
  assert.doesNotMatch(mergeJob, /issues: write/);
});

test('exact owner attestation authorizes the exact base and head', () => {
  const result = evaluateVersionPrOwnerAttestations([[
    ownerComment({ id: 101 }),
  ]], { baseSha, headSha, prAuthor: owner, repositoryOwner: owner });
  assert.deepEqual(result, {
    authorized: true,
    matchingAttestationCount: 1,
    latestAttestationId: '101',
    latestAttestationCreatedAt: '2026-08-27T00:00:00Z',
  });
});

test('owner attestation is limited to a solo owner-authored PR', () => {
  assert.throws(() => evaluateVersionPrOwnerAttestations(
    [[ownerComment({ id: 1 })]],
    { baseSha, headSha, prAuthor: 'contributor', repositoryOwner: owner },
  ), /owner_author_mismatch/);
});

test('bot, different-user, and non-owner comments cannot attest', () => {
  const result = evaluateVersionPrOwnerAttestations([[
    ownerComment({ id: 1, accountType: 'Bot' }),
    ownerComment({ id: 2, login: 'another-user' }),
    ownerComment({ id: 3, association: 'MEMBER' }),
  ]], { baseSha, headSha, prAuthor: owner, repositoryOwner: owner });
  assert.deepEqual(result, {
    authorized: false,
    matchingAttestationCount: 0,
    latestAttestationId: null,
    latestAttestationCreatedAt: null,
  });
});

test('wrong base, wrong head, and non-exact bodies cannot attest', () => {
  const result = evaluateVersionPrOwnerAttestations([[
    ownerComment({ id: 1, body: buildVersionPrOwnerAttestation({ baseSha: 'c'.repeat(40), headSha }) }),
    ownerComment({ id: 2, body: buildVersionPrOwnerAttestation({ baseSha, headSha: 'd'.repeat(40) }) }),
    ownerComment({ id: 3, body: `${buildVersionPrOwnerAttestation({ baseSha, headSha })}\n` }),
  ]], { baseSha, headSha, prAuthor: owner, repositoryOwner: owner });
  assert.deepEqual(result, {
    authorized: false,
    matchingAttestationCount: 0,
    latestAttestationId: null,
    latestAttestationCreatedAt: null,
  });
});

test('duplicate exact attestations select the latest deterministically', () => {
  const result = evaluateVersionPrOwnerAttestations([[
    ownerComment({ id: 2, createdAt: '2026-08-27T00:01:00Z' }),
    ownerComment({ id: 10, createdAt: '2026-08-27T00:01:00Z' }),
  ]], { baseSha, headSha, prAuthor: owner, repositoryOwner: owner });
  assert.deepEqual(result, {
    authorized: true,
    matchingAttestationCount: 2,
    latestAttestationId: '10',
    latestAttestationCreatedAt: '2026-08-27T00:01:00Z',
  });
});

test('owner-attestation evaluator CLI consumes paginated GitHub JSON', () => {
  const execution = spawnSync(process.execPath, [
    fileURLToPath(evaluatorPath),
    '--base-sha', baseSha,
    '--head-sha', headSha,
    '--pr-author', owner,
    '--repository-owner', owner,
  ], {
    encoding: 'utf8',
    input: JSON.stringify([[ownerComment({ id: 1 })]]),
  });
  assert.equal(execution.status, 0, execution.stderr);
  assert.deepEqual(JSON.parse(execution.stdout), {
    authorized: true,
    matchingAttestationCount: 1,
    latestAttestationId: '1',
    latestAttestationCreatedAt: '2026-08-27T00:00:00Z',
  });
});

test('malformed exact owner attestation fails closed', () => {
  assert.throws(() => evaluateVersionPrOwnerAttestations([[
    ownerComment({ id: 1, createdAt: 'not-a-time' }),
  ]], { baseSha, headSha, prAuthor: owner, repositoryOwner: owner }), /comment_created_at_invalid/);

  const missingId = ownerComment({ id: 2 });
  delete missingId.id;
  assert.throws(() => evaluateVersionPrOwnerAttestations(
    [[missingId]],
    { baseSha, headSha, prAuthor: owner, repositoryOwner: owner },
  ), /comment_id_missing/);
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

test('repository instructions preserve authorized Ready state and keep non-merge work unattested and label-free', async () => {
  const instructions = await readFile(agentsPath, 'utf8');

  assert.match(instructions, /Create a \*\*Draft\*\* PR/);
  assert.match(instructions, /Never add the `production-merge-approved` label without explicit merge authorization for the exact PR base and head/);
  assert.match(instructions, /FANDEX_PRODUCTION_MERGE_ATTESTATION v1/);
  assert.match(instructions, /author_association: OWNER/);
  assert.match(instructions, /post the exact owner-attestation comment, then add the merge-authorization label last/);
  assert.match(instructions, /Preserve any separately authorized Ready state/);
  assert.match(instructions, /do not post the owner attestation or add the merge-authorization label/);
  assert.match(instructions, /exact expected-base `--force-with-lease`/);
  assert.match(instructions, /lease must fail if `main` moves from the authorized base/);
  assert.match(instructions, /including when it moves to the PR head or one of its ancestors/);
  assert.match(instructions, /open,[^\n]*and still targets `main`/);
  assert.match(instructions, /PR and issue-comment metadata read-only/);
});
