import 'server-only';
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { handleNaverBlobReadVerification } from '@/lib/server/ingestion/naverNewsBlobReadVerification';
import { createProductionBlobVerificationReader } from '@/lib/server/ingestion/naverNewsBlobReadVerificationRuntime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  return handleNaverBlobReadVerification(request, process.env, {
    createReader: createProductionBlobVerificationReader,
    resolveOidcToken: () => getVercelOidcToken(),
  });
}
