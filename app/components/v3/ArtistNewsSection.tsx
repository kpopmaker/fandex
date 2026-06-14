'use client';

import { useEffect, useState } from 'react';
import type { ArtistNewsItem } from '../../data/v3/types';

type ArtistNewsSectionProps = {
  newsItems: ArtistNewsItem[];
};

export default function ArtistNewsSection({
  newsItems,
}: ArtistNewsSectionProps) {
  const [selectedNews, setSelectedNews] = useState<ArtistNewsItem | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedNews(null);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-5">
        <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
          Recent issue impact
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          Latest news and issue signals
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Open any issue card to inspect the FANDEX impact context.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {newsItems.slice(0, 6).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedNews(item)}
            className="rounded-2xl border-2 border-slate-100 bg-white p-4 text-left transition-[border-color,box-shadow] duration-200 hover:!border-white focus:!border-white focus:outline-none focus-visible:!border-white active:!border-white dark:!border-slate-800 dark:!bg-slate-950/60 dark:hover:!border-white dark:focus:!border-white dark:focus-visible:!border-white dark:active:!border-white [html[data-theme='night']_&]:!border-slate-800 [html[data-theme='night']_&]:!bg-slate-950/60 [html[data-theme='night']_&]:hover:!border-white [html[data-theme='night']_&]:focus:!border-white [html[data-theme='night']_&]:focus-visible:!border-white [html[data-theme='night']_&]:active:!border-white [html[data-theme='night']_&]:hover:!bg-slate-950/60 [html[data-theme='night']_&]:focus:!bg-slate-950/60 [html[data-theme='night']_&]:focus-visible:!bg-slate-950/60 [html[data-theme='night']_&]:active:!bg-slate-950/60"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {item.sourceType}
                </span>

                {item.sourceStatus && (
                  <SourceStatusBadge sourceStatus={item.sourceStatus} />
                )}
              </div>

              <span className="text-xs font-bold text-slate-400">
                {item.publishedAt}
              </span>
            </div>

            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              {item.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {item.summary}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {item.relatedKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {selectedNews && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5"
          role="presentation"
          onClick={() => setSelectedNews(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="artist-news-dialog-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:!border-slate-700 dark:!bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
                    {selectedNews.sourceName}
                  </p>

                  {selectedNews.sourceStatus && (
                    <SourceStatusBadge sourceStatus={selectedNews.sourceStatus} />
                  )}
                </div>

                <h2
                  id="artist-news-dialog-title"
                  className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50"
                >
                  {selectedNews.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-300/40 dark:!bg-slate-800 dark:!text-slate-200 dark:hover:!bg-slate-700 dark:focus:!bg-slate-800 dark:focus:ring-slate-700/40"
              >
                Close
              </button>
            </div>

            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600 dark:!bg-slate-900 dark:!text-slate-300">
              {selectedNews.detail}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoBox label="Importance" value={`${selectedNews.importanceScore}`} />
              <InfoBox label="Published at" value={selectedNews.publishedAt} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {selectedNews.relatedKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 dark:!bg-slate-900 dark:!text-slate-300"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceStatusBadge({ sourceStatus }: { sourceStatus: string }) {
  const isMock = sourceStatus.toLowerCase().includes('mock');
  const className = isMock
    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:!border-amber-500/30 dark:!bg-amber-500/10 dark:!text-amber-200'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:!border-emerald-500/30 dark:!bg-emerald-500/10 dark:!text-emerald-200';

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {sourceStatus}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:!border-slate-700 dark:!bg-slate-900">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-slate-950 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}
