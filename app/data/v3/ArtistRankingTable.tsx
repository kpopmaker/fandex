'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { ArtistRankingRow } from './artistRanking';

type SortKey = 'rank' | 'price' | 'changeRate' | 'volume';

type ArtistRankingTableProps = {
  artists: ArtistRankingRow[];
};

const allCategory = 'All';

export default function ArtistRankingTable({
  artists,
}: ArtistRankingTableProps) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState(allCategory);
  const [sortKey, setSortKey] = useState<SortKey>('rank');

  const categories = useMemo(() => {
    return [allCategory, ...Array.from(new Set(artists.map((artist) => artist.category)))];
  }, [artists]);

  const filteredArtists = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return artists
      .filter((artist) => {
        const matchesKeyword =
          normalizedKeyword.length === 0 ||
          artist.name.toLowerCase().includes(normalizedKeyword) ||
          artist.nameEn.toLowerCase().includes(normalizedKeyword) ||
          artist.company.toLowerCase().includes(normalizedKeyword) ||
          artist.ticker.toLowerCase().includes(normalizedKeyword);

        const matchesCategory =
          category === allCategory || artist.category === category;

        return matchesKeyword && matchesCategory;
      })
      .sort((a, b) => {
        if (sortKey === 'rank') {
          return a.rank - b.rank;
        }

        return b[sortKey] - a[sortKey];
      });
  }, [artists, keyword, category, sortKey]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Artist ranking</h2>
          <p className="mt-1 text-xs text-slate-500">
            Rank artists by FANDEX price, change rate, and attention volume.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/compare"
            className="rounded-full border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-300 hover:border-cyan-300"
          >
            Compare page
          </Link>

          <span className="w-fit rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            Artist Ranking
          </span>
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Search artist, agency, or ticker"
          className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
        />

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
        >
          <option value="rank">Default rank</option>
          <option value="price">Highest price</option>
          <option value="changeRate">Highest change</option>
          <option value="volume">Highest volume</option>
        </select>
      </div>

      <div className="mb-3 text-xs text-slate-500">
        Showing {filteredArtists.length} artists
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Artist</th>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">FANDEX price</th>
              <th className="px-4 py-3 text-right">Change</th>
              <th className="px-4 py-3 text-right">Volume</th>
              <th className="px-4 py-3 text-right">Detail</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {filteredArtists.map((artist) => (
              <tr key={artist.id} className="hover:bg-slate-800/60">
                <td className="px-4 py-4">
                  <span className="font-bold text-cyan-300">#{artist.rank}</span>
                </td>

                <td className="px-4 py-4">
                  <div>
                    <p className="font-semibold text-white">{artist.nameEn}</p>
                    <p className="text-xs text-slate-500">
                      {artist.category} / {artist.generation} / {artist.debutLabel}
                    </p>
                  </div>
                </td>

                <td className="px-4 py-4 text-slate-300">
                  <div>
                    <p>{artist.company}</p>
                    <p className="text-xs text-slate-500">{artist.ticker}</p>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {artist.status}
                  </span>
                </td>

                <td className="px-4 py-4 text-right font-semibold">
                  {artist.price.toFixed(2)}
                </td>

                <td className="px-4 py-4 text-right">
                  <span
                    className={
                      artist.changeRate >= 0
                        ? 'font-semibold text-emerald-400'
                        : 'font-semibold text-rose-400'
                    }
                  >
                    {artist.changeRate >= 0 ? '+' : ''}
                    {artist.changeRate}%
                  </span>
                </td>

                <td className="px-4 py-4 text-right text-slate-300">
                  {artist.volume.toLocaleString()}
                </td>

                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/artists/${artist.id}`}
                    className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}

            {filteredArtists.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  No matching artists found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
