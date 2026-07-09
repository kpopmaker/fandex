import type { ReactNode } from 'react';

import SourcePipelineOverviewSection from './sourcePipelineOverviewSection';
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
      <SourceSignalApplicationPreviewSection />
      <SourceSignalImpactPreviewSection />
      <SourceSignalReviewQueuePreviewSection />
      <SourceSignalReviewActionPreviewSection />
    </>
  );
}
