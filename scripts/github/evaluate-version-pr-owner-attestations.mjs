#!/usr/bin/env node

import process from 'node:process';

const HUMAN_ACCOUNT_TYPE = 'User';
const OWNER_ASSOCIATION = 'OWNER';
const ATTESTATION_HEADER = 'FANDEX_PRODUCTION_MERGE_ATTESTATION v1';
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name}_missing`);
  }
  return value;
}

function requireSha(value, name) {
  const sha = requireString(value, name);
  if (!SHA_PATTERN.test(sha)) throw new Error(`${name}_invalid`);
  return sha;
}

function flattenCommentPages(value) {
  if (!Array.isArray(value)) throw new Error('comments_not_array');
  if (value.every((entry) => Array.isArray(entry))) return value.flat();
  if (value.some((entry) => Array.isArray(entry))) throw new Error('comments_mixed_shape');
  return value;
}

function commentOrder(comment) {
  const createdAt = requireString(comment.created_at, 'comment_created_at');
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) throw new Error('comment_created_at_invalid');
  if (typeof comment.id !== 'number' && typeof comment.id !== 'string') {
    throw new Error('comment_id_missing');
  }
  const id = requireString(String(comment.id), 'comment_id');
  return { createdAt, timestamp, id };
}

function isLater(left, right) {
  if (left.timestamp !== right.timestamp) return left.timestamp > right.timestamp;
  return left.id.localeCompare(right.id, 'en', { numeric: true }) > 0;
}

export function buildVersionPrOwnerAttestation({ baseSha, headSha }) {
  const exactBase = requireSha(baseSha, 'base_sha');
  const exactHead = requireSha(headSha, 'head_sha');
  return `${ATTESTATION_HEADER}\nbase_sha=${exactBase}\nhead_sha=${exactHead}`;
}

export function evaluateVersionPrOwnerAttestations(
  commentPages,
  { baseSha, headSha, prAuthor, repositoryOwner },
) {
  const exactBody = buildVersionPrOwnerAttestation({ baseSha, headSha });
  const author = requireString(prAuthor, 'pr_author').toLowerCase();
  const owner = requireString(repositoryOwner, 'repository_owner').toLowerCase();
  if (author !== owner) throw new Error('owner_author_mismatch');

  let matchingAttestationCount = 0;
  let latest = null;

  for (const comment of flattenCommentPages(commentPages)) {
    if (!comment || typeof comment !== 'object') throw new Error('comment_invalid');
    if (comment.body !== exactBody) continue;

    const login = comment.user && typeof comment.user.login === 'string'
      ? comment.user.login.toLowerCase()
      : '';
    const accountType = comment.user && typeof comment.user.type === 'string'
      ? comment.user.type
      : '';
    if (login !== owner || accountType !== HUMAN_ACCOUNT_TYPE
        || comment.author_association !== OWNER_ASSOCIATION) continue;

    const order = commentOrder(comment);
    matchingAttestationCount += 1;
    if (!latest || isLater(order, latest)) latest = order;
  }

  return {
    authorized: latest !== null,
    matchingAttestationCount,
    latestAttestationId: latest ? latest.id : null,
    latestAttestationCreatedAt: latest ? latest.createdAt : null,
  };
}

async function readStandardInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const comments = JSON.parse(await readStandardInput());
    const decision = evaluateVersionPrOwnerAttestations(comments, {
      baseSha: readArgument('--base-sha'),
      headSha: readArgument('--head-sha'),
      prAuthor: readArgument('--pr-author'),
      repositoryOwner: readArgument('--repository-owner'),
    });
    process.stdout.write(`${JSON.stringify(decision)}\n`);
  } catch {
    process.stderr.write('owner_attestation_evaluation_failed\n');
    process.exitCode = 1;
  }
}
