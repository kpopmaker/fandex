'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  allFactorKeys,
  factorDefinitions,
  getMockArtistPrices,
  getMockMarketSummary,
  pricePresets,
  type FactorKey,
  type PricePresetKey,
  type SignalType,
} from '../data/mockPrices';

const INITIAL_MARKET_TIME = new Date('2026-01-01T00:00:00.000Z');

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function getSignalLabel(signal: SignalType) {
  const labels: Record<SignalType, string> = {
    surging: 'Surging',
    rising: 'Rising',
    neutral: 'Neutral',
    falling: 'Falling',
    plunging: 'Dropping',
    volume_spike: 'Volume spike',
  };

  return labels[signal];
}

function getSignalClass(signal: SignalType) {
  if (signal === 'surging') return 'bg-red-500/15 text-red-300 border-red-500/30';
  if (signal === 'rising') return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
  if (signal === 'falling') return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  if (signal === 'plunging') return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  if (signal === 'volume_spike') return 'bg-purple-500/15 text-purple-300 border-purple-500/30';

  return 'bg-slate-700/40 text-slate-300 border-slate-600';
}

export default function MarketDashboard() {
  const [now, setNow] = useState<Date | null>(null);
  const renderTime = now ?? INITIAL_MARKET_TIME;
  const [selectedPreset, setSelectedPreset] =
    useState<PricePresetKey>('balanced');
  const [enabledFactors, setEnabledFactors] =
    useState<FactorKey[]>(allFactorKeys);

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    const timer = setInterval(updateTime, 10_000);
    return () => clearInterval(timer);
  }, []);

  const prices = useMemo(() => {
    return getMockArtistPrices({
      enabledFactors,
      now: renderTime,
    });
  }, [enabledFactors, renderTime]);

  const defaultPrices = useMemo(() => {
    return getMockArtistPrices({
      enabledFactors: allFactorKeys,
      now: renderTime,
    });
  }, [renderTime]);

  const defaultPriceMap = useMemo(() => {
    return new Map(defaultPrices.map((item) => [item.artistId, item]));
  }, [defaultPrices]);

  const marketSummary = useMemo(() => {
    return getMockMarketSummary({
      enabledFactors,
      now: renderTime,
    });
  }, [enabledFactors, renderTime]);

  function handlePresetChange(presetKey: PricePresetKey) {
    setSelectedPreset(presetKey);
    setEnabledFactors(pricePresets[presetKey].enabledFactors);
  }

  function handleFactorToggle(factorKey: FactorKey) {
    setSelectedPreset('balanced');

    setEnabledFactors((current) => {
      if (current.includes(factorKey)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((item) => item !== factorKey);
      }

      return [...current, factorKey];
    });
  }

  function resetFactors() {
    setSelectedPreset('balanced');
    setEnabledFactors(allFactorKeys);
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
              FANDEX MARKET
            </p>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              K-pop artist market board
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
              A simulated market dashboard for artist price, momentum,
              attention volume, and fandom value signals.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4">
            <p className="text-xs text-slate-500">Last updated</p>
            <p className="mt-1 font-mono text-sm text-cyan-300">
              {now ? now.toLocaleString('en-US') : 'Loading...'}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="KMI Composite" value={`${marketSummary.kmiComposite}`} subValue="K-pop Market Index" />
          <SummaryCard label="Rising artists" value={`${marketSummary.risingCount}`} subValue="Positive momentum" tone="text-red-300" />
          <SummaryCard label="Falling artists" value={`${marketSummary.fallingCount}`} subValue="Negative momentum" tone="text-blue-300" />
          <SummaryCard label="Total volume" value={formatLargeNumber(marketSummary.totalVolume)} subValue="Attention volume" />
          <SummaryCard label="Top gainer" value={marketSummary.topGainer?.ticker ?? '-'} subValue={`${marketSummary.topGainer?.changeRate ?? '-'}%`} tone="text-red-300" />
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-xl font-black">Custom index builder</h2>
              <p className="mt-1 text-sm text-slate-400">
                Toggle factors to recalculate the simulated artist table.
              </p>
            </div>

            <button
              onClick={resetFactors}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:border-cyan-300 hover:text-cyan-300"
            >
              Reset factors
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {(Object.entries(pricePresets) as [PricePresetKey, typeof pricePresets[PricePresetKey]][]).map(
              ([presetKey, preset]) => (
                <button
                  key={presetKey}
                  onClick={() => handlePresetChange(presetKey)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    selectedPreset === presetKey
                      ? 'bg-cyan-300 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {presetKey}
                </button>
              )
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {factorDefinitions.map((factor) => {
              const isEnabled = enabledFactors.includes(factor.key);

              return (
                <button
                  key={factor.key}
                  onClick={() => handleFactorToggle(factor.key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isEnabled
                      ? 'border-cyan-400/40 bg-cyan-400/10'
                      : 'border-slate-800 bg-slate-900/60 opacity-55'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold capitalize">{factor.key}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-black ${
                        isEnabled
                          ? 'bg-cyan-300 text-slate-950'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Weight {factor.defaultWeight}% / {factor.speed === 'fast' ? 'fast signal' : 'slow signal'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-xl font-black">Real-time artist prices</h2>
            <p className="mt-1 text-sm text-slate-400">
              Compare official FANDEX price with the selected custom price view.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4 text-left">Ticker</th>
                  <th className="px-5 py-4 text-left">Artist</th>
                  <th className="px-5 py-4 text-right">Custom Price</th>
                  <th className="px-5 py-4 text-right">FDX Price</th>
                  <th className="px-5 py-4 text-right">Change</th>
                  <th className="px-5 py-4 text-right">Volume</th>
                  <th className="px-5 py-4 text-right">Fan Cap</th>
                  <th className="px-5 py-4 text-right">Momentum</th>
                  <th className="px-5 py-4 text-center">Signal</th>
                  <th className="px-5 py-4 text-right">Confidence</th>
                </tr>
              </thead>

              <tbody>
                {prices.map((artistPrice) => {
                  const defaultPrice = defaultPriceMap.get(artistPrice.artistId);
                  const isUp = artistPrice.changeRate >= 0;

                  return (
                    <tr
                      key={artistPrice.artistId}
                      className="border-t border-slate-800 hover:bg-slate-900/50"
                    >
                      <td className="px-5 py-4 font-mono font-black text-cyan-300">
                        {artistPrice.ticker}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{artistPrice.nameEn}</p>
                        <p className="text-xs text-slate-500">{artistPrice.agency}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-lg font-black">
                        {artistPrice.price.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-300">
                        {defaultPrice?.price.toFixed(2)}
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono font-black ${
                          isUp ? 'text-red-300' : 'text-blue-300'
                        }`}
                      >
                        {isUp ? '+' : ''}
                        {artistPrice.changeRate.toFixed(2)}%
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-300">
                        {formatNumber(artistPrice.volume)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-300">
                        {formatLargeNumber(artistPrice.fanCap)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-300">
                        {artistPrice.momentum > 0 ? '+' : ''}
                        {artistPrice.momentum.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getSignalClass(
                            artistPrice.signal
                          )}`}
                        >
                          {getSignalLabel(artistPrice.signal)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-300">
                        {artistPrice.confidence.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-xl font-black">Market insight</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Based on the selected index view, the strongest mover is{' '}
            <span className="font-black text-red-300">
              {marketSummary.topGainer?.nameEn}
            </span>
            . By volume,{' '}
            <span className="font-black text-purple-300">
              {marketSummary.topVolume?.nameEn}
            </span>{' '}
            has the largest attention signal.
          </p>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  subValue,
  tone = 'text-white',
}: {
  label: string;
  value: string;
  subValue: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subValue}</p>
    </div>
  );
}
