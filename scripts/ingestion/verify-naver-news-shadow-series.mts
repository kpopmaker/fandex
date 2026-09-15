import { pathToFileURL } from 'node:url';
import {
  runNaverNewsShadowSeriesVerification,
} from '../../lib/server/ingestion/naverNewsShadowSeriesVerifier';

export {
  parseNaverNewsShadowSeriesVerificationCommand,
  runNaverNewsShadowSeriesVerification,
  summarizeNaverNewsShadowSeriesVerification,
} from '../../lib/server/ingestion/naverNewsShadowSeriesVerifier';
export type {
  NaverNewsShadowSeriesVerificationCommand,
  NaverNewsShadowSeriesVerifierDependencies,
  NaverNewsShadowSeriesVerifierPoolConfig,
} from '../../lib/server/ingestion/naverNewsShadowSeriesVerifier';

export async function main(
  argv = process.argv.slice(2),
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const result = await runNaverNewsShadowSeriesVerification(argv, environment);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('NAVER News shadow series verification failed closed. No credential, SQL, article content, or database detail was logged.');
    process.exitCode = 1;
  });
}
