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
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function getSignalLabel(signal: SignalType) {
  const labels: Record<SignalType, string> = {
    surging: '급등',
    rising: '상승',
    neutral: '중립',
    falling: '하락',
    plunging: '급락',
    volume_spike: '거래량 폭증',
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
      const updateTime = () => {
        setNow(new Date());
      };
    
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
              K-pop Artist Stock Board
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
              아티스트의 음원·콘텐츠·SNS·검색·해외반응·팬덤·소속사 요소를
              종합해 주식 시세처럼 보여주는 FANDEX v2 mock market입니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4">
            <p className="text-xs text-slate-500">Last updated</p>
            <p className="mt-1 font-mono text-sm text-cyan-300">
            {now ? now.toLocaleString('ko-KR') : '동기화 중...'}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
            <p className="text-sm text-cyan-200">KMI Composite</p>
            <p className="mt-2 text-3xl font-black">
              {marketSummary.kmiComposite}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              K-pop Market Index
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">상승 종목</p>
            <p className="mt-2 text-3xl font-black text-red-300">
              {marketSummary.risingCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Rising artists</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">하락 종목</p>
            <p className="mt-2 text-3xl font-black text-blue-300">
              {marketSummary.fallingCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Falling artists</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">총 거래량</p>
            <p className="mt-2 text-3xl font-black">
              {formatLargeNumber(marketSummary.totalVolume)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Attention volume</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">급등주</p>
            <p className="mt-2 text-2xl font-black text-red-300">
              {marketSummary.topGainer?.ticker}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {marketSummary.topGainer?.changeRate}%
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-xl font-black">Custom Index Builder</h2>
              <p className="mt-1 text-sm text-slate-400">
                요소를 켜고 끄면 커스텀 주가 기준으로 테이블이 다시 계산됩니다.
              </p>
            </div>

            <button
              onClick={resetFactors}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:border-cyan-300 hover:text-cyan-300"
            >
              기본값으로 되돌리기
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
                  {preset.label}
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
                    <p className="font-bold">{factor.label}</p>
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
                    {factor.description}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    기본 가중치 {factor.defaultWeight}% · {factor.speed === 'fast' ? '빠른 신호' : '느린 신호'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-xl font-black">Real-time Artist Prices</h2>
            <p className="mt-1 text-sm text-slate-400">
              기본 FANDEX Price와 커스텀 조건이 반영된 Custom Price를 함께 비교합니다.
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
                        <p className="font-bold text-white">
                          {artistPrice.nameKo}
                        </p>
                        <p className="text-xs text-slate-500">
                          {artistPrice.nameEn} · {artistPrice.agency}
                        </p>
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
          <h2 className="text-xl font-black">Market Insight</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            현재 선택된 지표 기준으로 가장 강한 종목은{' '}
            <span className="font-black text-red-300">
              {marketSummary.topGainer?.nameKo}
            </span>
            입니다. 거래량 기준으로는{' '}
            <span className="font-black text-purple-300">
              {marketSummary.topVolume?.nameKo}
            </span>
            가 가장 크게 움직이고 있습니다. 이 문장은 나중에 Content Lab에서
            SNS 콘텐츠 문구로 자동 변환될 수 있습니다.
          </p>
        </div>
      </section>
    </main>
  );
}