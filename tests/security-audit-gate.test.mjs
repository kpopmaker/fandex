import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { evaluateProductionAuditReport } from '../scripts/security/audit-production.mjs';

test('production audit is eligible only with zero high and critical findings', () => {
  assert.deepEqual(
    evaluateProductionAuditReport({ metadata: { vulnerabilities: { high: 0, critical: 0 } } }),
    { high: 0, critical: 0, eligible: true },
  );
  assert.equal(evaluateProductionAuditReport({ metadata: { vulnerabilities: { high: 1, critical: 0 } } }).eligible, false);
  assert.equal(evaluateProductionAuditReport({ metadata: { vulnerabilities: { high: 0, critical: 1 } } }).eligible, false);
});

test('missing, malformed, or registry-error reports fail closed', () => {
  assert.throws(() => evaluateProductionAuditReport(null), /production_audit_report_error/);
  assert.throws(() => evaluateProductionAuditReport({ error: { summary: 'registry unavailable' } }), /production_audit_report_error/);
  assert.throws(() => evaluateProductionAuditReport({ metadata: {} }), /production_audit_metadata_missing/);
});

test('tracked gate cannot suppress audit failure or use an allowlist', async () => {
  const source = await readFile(new URL('../scripts/security/audit-production.mjs', import.meta.url), 'utf8');
  assert.match(source, /--omit=dev/);
  assert.match(source, /--audit-level=high/);
  assert.doesNotMatch(source, /allowlist|\|\|\s*true/);
  assert.match(source, /result\.status !== 0/);
});
