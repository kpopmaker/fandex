import 'server-only';
import { getVercelOidcToken } from '@vercel/functions/oidc';

import {
  handleNaverNewsBlobCurrentEvidenceRead,
} from '@/lib/server/ingestion/naverNewsBlobCurrentEvidenceRead';
import {
  createProductionNaverNewsBlobEvidenceReadStore,
} from '@/lib/server/ingestion/naverNewsBlobMirrorRuntime';

export const runtime = 'nodejs';
export const preferredRegion = 'sin1';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  return handleNaverNewsBlobCurrentEvidenceRead(
    request,
    process.env,
    {
      resolveOidcToken: () => getVercelOidcToken(),
      createReadStore:
        createProductionNaverNewsBlobEvidenceReadStore,
    },
  );
}
