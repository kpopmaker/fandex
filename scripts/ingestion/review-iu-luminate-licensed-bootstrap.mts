import { pathToFileURL } from 'node:url';

import { runIuLuminateLicensedBootstrapReview } from '../../lib/alternative-evidence/iuLuminateLicensedBootstrapCommandResearch';

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const summary = await runIuLuminateLicensedBootstrapReview(argv);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = summary.status === 'ready-for-licensed-extraction-review' ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('IU Luminate licensed bootstrap review failed closed. No credential, provider payload, database detail, or licensed quantity was logged.');
    process.exitCode = 1;
  });
}
