import type { ReactNode } from 'react';

import SourceSignalApplicationPreviewSection from './sourceSignalApplicationPreviewSection';
import SourceSignalImpactPreviewSection from './sourceSignalImpactPreviewSection';

export default function SourceLabLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <SourceSignalApplicationPreviewSection />
      <SourceSignalImpactPreviewSection />
    </>
  );
}
