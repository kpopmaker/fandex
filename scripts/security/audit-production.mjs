import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function evaluateProductionAuditReport(report) {
  if (!report || typeof report !== 'object' || report.error) {
    throw new Error('production_audit_report_error');
  }
  const counts = report.metadata?.vulnerabilities;
  if (!counts || !Number.isInteger(counts.high) || !Number.isInteger(counts.critical)) {
    throw new Error('production_audit_metadata_missing');
  }
  return {
    high: counts.high,
    critical: counts.critical,
    eligible: counts.high === 0 && counts.critical === 0,
  };
}

export function runProductionAudit() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('production_audit_npm_execpath_missing');
  const result = spawnSync(
    process.execPath,
    [npmCli, 'audit', '--omit=dev', '--audit-level=high', '--json'],
    { encoding: 'utf8', shell: false, maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error) throw new Error('production_audit_process_failed');

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error('production_audit_json_invalid');
  }
  const evaluation = evaluateProductionAuditReport(report);
  if (result.status !== 0 || !evaluation.eligible) {
    throw new Error(`production_audit_blocked_high_${evaluation.high}_critical_${evaluation.critical}`);
  }
  process.stdout.write(`${JSON.stringify({ gate: 'production_dependency_security', ...evaluation })}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  try {
    runProductionAudit();
  } catch (error) {
    const code = error instanceof Error ? error.message : 'production_audit_failed';
    process.stderr.write(`${JSON.stringify({ gate: 'production_dependency_security', eligible: false, code })}\n`);
    process.exitCode = 1;
  }
}
