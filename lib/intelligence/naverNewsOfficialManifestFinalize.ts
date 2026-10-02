export type NaverNewsOfficialManifestFinalizeInput = {
  slotStart: string;
  collectionKey: string;
  jobId: string;
  schedulerVersion: string;
  requestContract: string;
  evidenceObjectRef: string;
};

export type NaverNewsOfficialSchedulerManifest =
  NaverNewsOfficialManifestFinalizeInput & {
    schedulerManifestFinalized: true;
    finalizedAt: string;
  };

export type NaverNewsFinalizeResult =
  | { ok: true; manifest: NaverNewsOfficialSchedulerManifest }
  | { ok: false; reason: string };

export function finalizeNaverNewsOfficialManifest(
  input: NaverNewsOfficialManifestFinalizeInput,
  evidenceExists: boolean,
): NaverNewsFinalizeResult {
  if (!evidenceExists) {
    return { ok: false, reason: "missing-evidence-object" };
  }

  if (!input.slotStart || !input.collectionKey || !input.jobId) {
    return { ok: false, reason: "invalid-scheduler-identity" };
  }

  return {
    ok: true,
    manifest: {
      ...input,
      schedulerManifestFinalized: true,
      finalizedAt: new Date().toISOString(),
    },
  };
}
