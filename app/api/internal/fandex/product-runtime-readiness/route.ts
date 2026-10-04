import 'server-only';

import {
  handleFandexProductRuntimeReadinessProbe,
} from '@/lib/server/product/fandexCurrentRuntimeReadinessProbe';

export const runtime = 'nodejs';
export const preferredRegion = 'sin1';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  return handleFandexProductRuntimeReadinessProbe(
    request,
    process.env,
  );
}
