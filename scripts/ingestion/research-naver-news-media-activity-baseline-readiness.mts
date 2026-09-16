import { pathToFileURL } from 'node:url';

import {
  runNaverNewsMediaActivityBaselineReadinessResearch,
} from '../../lib/server/ingestion/naverNewsMediaActivityBaselineReadinessResearch';

export {
  evaluateNaverNewsMediaActivityBaselineReadinessResearch,
  parseNaverNewsMediaActivityBaselineReadinessResearchCommand,
  runNaverNewsMediaActivityBaselineReadinessResearch,
} from '../../lib/server/ingestion/naverNewsMediaActivityBaselineReadinessResearch';
export type {
  NaverNewsMediaActivityBaselineCandidate,
  NaverNewsMediaActivityBaselineReadinessResearchCommand,
  NaverNewsMediaActivityBaselineReadinessResearchDependencies,
  NaverNewsMediaActivityBaselineReadinessResearchResult,
  NaverNewsMediaActivityDiurnalReadiness,
  NaverNewsMediaActivityWindowReadiness,
} from '../../lib/server/ingestion/naverNewsMediaActivityBaselineReadinessResearch';

export async function main(
  argv = process.argv.slice(2),
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const result = await runNaverNewsMediaActivityBaselineReadinessResearch(argv, environment);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error(
      'NAVER News media activity baseline readiness research failed closed. No credential, SQL, article content, database detail, Product score, or frozen Product methodology was logged.',
    );
    process.exitCode = 1;
  });
}
