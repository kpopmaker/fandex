'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

type CompareSelectableArtist = {
  id: string;
  nameKo: string;
  nameEn: string;
  agency: string;
  type: string;
  ticker: string;
};

type CompareArtistSelectorProps = {
  artists: CompareSelectableArtist[];
  selectedIds: string[];
};

export default function CompareArtistSelector({
  artists,
  selectedIds,
}: CompareArtistSelectorProps) {
  const router = useRouter();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedArtists = artists.filter((artist) => selectedSet.has(artist.id));

  function moveToCompare(nextIds: string[]) {
    const uniqueIds = Array.from(new Set(nextIds)).slice(0, 4);

    if (uniqueIds.length === 0) {
      router.push('/compare');
      return;
    }

    router.push(`/compare?artists=${uniqueIds.join(',')}`);
  }

  function toggleArtist(artistId: string) {
    const isSelected = selectedIds.includes(artistId);

    if (isSelected) {
      moveToCompare(selectedIds.filter((id) => id !== artistId));
      return;
    }

    if (selectedIds.length >= 4) {
      return;
    }

    moveToCompare([...selectedIds, artistId]);
  }

  function resetCompare() {
    router.push('/compare');
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black">Select artists to compare</h2>
          <p className="mt-1 text-sm text-slate-400">
            Choose up to four artists. The compare page updates the URL state
            immediately.
          </p>
        </div>

        <button
          type="button"
          onClick={resetCompare}
          className="w-fit rounded-full border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
        >
          Reset to default
        </button>
      </div>

      <div className="mb-5 rounded-2xl bg-slate-950 p-4">
        <p className="mb-3 text-xs font-bold text-slate-500">
          Currently comparing {selectedArtists.length} artists
        </p>

        <div className="flex flex-wrap gap-2">
          {selectedArtists.map((artist) => (
            <span
              key={artist.id}
              className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-slate-950"
            >
              {artist.nameEn}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {artists.map((artist) => {
          const isSelected = selectedSet.has(artist.id);
          const isDisabled = !isSelected && selectedIds.length >= 4;

          return (
            <button
              key={artist.id}
              type="button"
              onClick={() => toggleArtist(artist.id)}
              disabled={isDisabled}
              className={
                isSelected
                  ? 'rounded-2xl border border-cyan-400 bg-cyan-500/10 p-4 text-left'
                  : isDisabled
                    ? 'rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left opacity-40'
                    : 'rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left hover:border-cyan-400'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={
                      isSelected
                        ? 'font-mono text-xs font-black text-cyan-300'
                        : 'font-mono text-xs font-black text-slate-500'
                    }
                  >
                    {artist.ticker}
                  </p>

                  <p className="mt-2 text-lg font-black text-white">
                    {artist.nameEn}
                  </p>

                  <p className="mt-3 text-xs font-bold text-slate-400">
                    {artist.agency} / {artist.type}
                  </p>
                </div>

                <span
                  className={
                    isSelected
                      ? 'rounded-full bg-cyan-400 px-2 py-1 text-xs font-black text-slate-950'
                      : 'rounded-full bg-slate-800 px-2 py-1 text-xs font-bold text-slate-400'
                  }
                >
                  {isSelected ? 'Selected' : 'Select'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
