#!/usr/bin/env node

import process from 'node:process';

const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const DECISIVE_STATES = new Set(['APPROVED', 'CHANGES_REQUESTED']);

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name}_missing`);
  }
  return value;
}

function flattenReviewPages(value) {
  if (!Array.isArray(value)) throw new Error('reviews_not_array');
  if (value.every((entry) => Array.isArray(entry))) return value.flat();
  if (value.some((entry) => Array.isArray(entry))) throw new Error('reviews_mixed_shape');
  return value;
}

function reviewOrder(review) {
  const submittedAt = requireString(review.submitted_at, 'review_submitted_at');
  const timestamp = Date.parse(submittedAt);
  if (!Number.isFinite(timestamp)) throw new Error('review_submitted_at_invalid');
  if (typeof review.id !== 'number' && typeof review.id !== 'string') throw new Error('review_id_missing');
  const id = requireString(String(review.id), 'review_id');
  return { timestamp, id };
}

function isLater(left, right) {
  if (left.timestamp !== right.timestamp) return left.timestamp > right.timestamp;
  return left.id.localeCompare(right.id, 'en', { numeric: true }) > 0;
}

export function evaluateVersionPrReviews(reviewPages, { headSha, prAuthor }) {
  const exactHead = requireString(headSha, 'head_sha');
  const author = requireString(prAuthor, 'pr_author').toLowerCase();
  const latestByReviewer = new Map();

  for (const review of flattenReviewPages(reviewPages)) {
    if (!review || typeof review !== 'object') throw new Error('review_invalid');
    const state = typeof review.state === 'string' ? review.state.toUpperCase() : '';
    if (!DECISIVE_STATES.has(state) || review.commit_id !== exactHead) continue;

    const login = review.user && typeof review.user.login === 'string' ? review.user.login.toLowerCase() : '';
    if (!login || login === author || !TRUSTED_ASSOCIATIONS.has(review.author_association)) continue;

    const order = reviewOrder(review);
    const current = latestByReviewer.get(login);
    if (!current || isLater(order, current.order)) latestByReviewer.set(login, { state, order });
  }

  const effective = [...latestByReviewer.values()];
  const approvedCount = effective.filter((review) => review.state === 'APPROVED').length;
  const changesRequestedCount = effective.filter((review) => review.state === 'CHANGES_REQUESTED').length;
  return {
    authorized: approvedCount >= 1 && changesRequestedCount === 0,
    approvedCount,
    changesRequestedCount,
    trustedReviewerCount: effective.length,
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
    const reviews = JSON.parse(await readStandardInput());
    const decision = evaluateVersionPrReviews(reviews, {
      headSha: readArgument('--head-sha'),
      prAuthor: readArgument('--pr-author'),
    });
    process.stdout.write(`${JSON.stringify(decision)}\n`);
  } catch {
    process.stderr.write('review_authorization_evaluation_failed\n');
    process.exitCode = 1;
  }
}
