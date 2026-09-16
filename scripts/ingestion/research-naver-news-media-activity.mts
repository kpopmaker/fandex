import { pathToFileURL } from 'node:url';

import {
  runNaverNewsMediaActivityMethodResearch,
} from '../../lib/server/ingestion/naverNewsMediaActivityMethodResearch';

export {
  evaluateNaverNewsMediaActivityMethodResearch,
  parseNaverNewsMediaActivityMethodResearchCommand,
  runNaverNewsMediaActivityMethodResearch,
  summarizeNaverNewsMediaActivityMethodResearch,
} from '../../lib/server/ingestion/naverNewsMediaActivityMethodResearch';
export type {
  NaverNewsMediaActivityMethodResearchCommand,
  NaverNewsMediaActivityMethodResearchDependencies,
  NaverNewsMediaActivityMethodResearchPoolConfig,
  NaverNewsMediaActivityMethodResearchResult,
  NaverNewsMediaActivityResearchCandidate,
  NaverNewsMediaActivityResearchWindow,
} from '../../lib/server/ingestion/naverNewsMediaActivityMethodResearch';

export async function main(
  argv = process.argv.slice(2),
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const result = await runNaverNewsMediaActivityMethodResearch(argv, environment);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error(
      'NAVER News media activity methodology research failed closed. No credential, SQL, article content, database detail, or Product score was logged.',
    );
    process.exitCode = 1;
  });
}
