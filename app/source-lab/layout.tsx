import type { ReactNode } from 'react';

import SourceSignalApplicationPreviewSection from './sourceSignalApplicationPreviewSection';

export default function SourceLabLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <SourceSignalApplicationPreviewSection />
    </>
  );
}
