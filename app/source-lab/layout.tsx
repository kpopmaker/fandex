import type { ReactNode } from 'react';

import SourcePipelineOverviewSection from './sourcePipelineOverviewSection';
import SourceReadinessDashboardPreviewSection from './sourceReadinessDashboardPreviewSection';
import SourceIngestionDraftPreviewSection from './sourceIngestionDraftPreviewSection';
import SourceProviderSyncPolicyPreviewSection from './sourceProviderSyncPolicyPreviewSection';
import SourceStorageBoundaryPreviewSection from './sourceStorageBoundaryPreviewSection';
import SourceWriteSafetyPreviewSection from './sourceWriteSafetyPreviewSection';
import SourceWriteAuditPreviewSection from './sourceWriteAuditPreviewSection';
import SourceRollbackReadinessPreviewSection from './sourceRollbackReadinessPreviewSection';
import SourceSignalApplicationPreviewSection from './sourceSignalApplicationPreviewSection';
import SourceSignalImpactPreviewSection from './sourceSignalImpactPreviewSection';
import SourceSignalReviewActionPreviewSection from './sourceSignalReviewActionPreviewSection';
import SourceSignalReviewQueuePreviewSection from './sourceSignalReviewQueuePreviewSection';

export default function SourceLabLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <SourcePipelineOverviewSection />
      <SourceReadinessDashboardPreviewSection />
      <SourceSignalApplicationPreviewSection />
      <SourceSignalImpactPreviewSection />
      <SourceSignalReviewQueuePreviewSection />
      <SourceSignalReviewActionPreviewSection />
      <SourceIngestionDraftPreviewSection />
      <SourceProviderSyncPolicyPreviewSection />
      <SourceStorageBoundaryPreviewSection />
      <SourceWriteSafetyPreviewSection />
      <SourceWriteAuditPreviewSection />
      <SourceRollbackReadinessPreviewSection />
    </>
  );
}
