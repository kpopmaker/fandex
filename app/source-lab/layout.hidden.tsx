import type { ReactNode } from 'react';

import SourcePipelineOverviewSection from './sourcePipelineOverviewSection';
import SourceLabSectionNavigation from './sourceLabSectionNavigation';
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
      <div id="source-overview" className="scroll-mt-6"><SourcePipelineOverviewSection /></div>
      <SourceLabSectionNavigation />
      <div id="source-readiness-dashboard" className="scroll-mt-6"><SourceReadinessDashboardPreviewSection /></div>
      <div id="source-signal-application" className="scroll-mt-6"><SourceSignalApplicationPreviewSection /></div>
      <div id="source-signal-impact" className="scroll-mt-6"><SourceSignalImpactPreviewSection /></div>
      <div id="source-signal-review-queue" className="scroll-mt-6"><SourceSignalReviewQueuePreviewSection /></div>
      <div id="source-signal-review-action" className="scroll-mt-6"><SourceSignalReviewActionPreviewSection /></div>
      <div id="source-ingestion-draft" className="scroll-mt-6"><SourceIngestionDraftPreviewSection /></div>
      <div id="source-provider-sync-policy" className="scroll-mt-6"><SourceProviderSyncPolicyPreviewSection /></div>
      <div id="source-storage-boundary" className="scroll-mt-6"><SourceStorageBoundaryPreviewSection /></div>
      <div id="source-write-safety" className="scroll-mt-6"><SourceWriteSafetyPreviewSection /></div>
      <div id="source-write-audit" className="scroll-mt-6"><SourceWriteAuditPreviewSection /></div>
      <div id="source-rollback-readiness" className="scroll-mt-6"><SourceRollbackReadinessPreviewSection /></div>
    </>
  );
}
