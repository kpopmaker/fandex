'use client';

import { useMemo, useState } from 'react';
import type {
  ArtistPricePoint,
  ChartPoint,
  CustomIndexViewId,
  FactorKey,
  FactorWeights,
} from '../../data/v3/types';
import {
  calculateCustomScore,
  customIndexViews,
  defaultFactorWeightsV3,
  factorDefinitionsV3,
} from '../../data/v3/mockData';
import FandexLineChart from '../FandexLineChart';

type CustomIndexBuilderProps = {
  artistName: string;
  priceHistory: ArtistPricePoint[];
};

const allFactorKeys = factorDefinitionsV3.map((factor) => factor.key);

const perspectiveOrder: CustomIndexViewId[] = [
  'all',
  'buzz',
  'fandomExpansion',
  'contentReaction',
  'globalReaction',
  'businessImpact',
  'organicPublic',
  'custom',
];

const perspectiveLabels: Record<CustomIndexViewId, string> = {
  all: '종합 주가',
  buzz: '화제성 중심',
  fandomExpansion: '팬덤 확장 중심',
  contentReaction: '콘텐츠 반응 중심',
  globalReaction: '해외 반응 중심',
  businessImpact: '사업성 중심',
  organicPublic: '대중 확산 중심',
  custom: '직접 선택',
};

function scoreToPrice(score: number) {
  return Number((100 * Math.exp((score - 50) / 50)).toFixed(2));
}

function getChangeRate(points: ChartPoint[]) {
  const first = points[0];
  const last = points[points.length - 1];

  if (!first || !last || first.value === 0) {
    return 0;
  }

  return ((last.value - first.value) / first.value) * 100;
}

function buildWeights(enabledFactors: FactorKey[]) {
  return factorDefinitionsV3.reduce((acc, factor) => {
    acc[factor.key] = enabledFactors.includes(factor.key)
      ? defaultFactorWeightsV3[factor.key]
      : 0;

    return acc;
  }, {} as FactorWeights);
}

function getAutoReading({
  selectedLabel,
  officialChangeRate,
  selectedChangeRate,
}: {
  selectedLabel: string;
  officialChangeRate: number;
  selectedChangeRate: number;
}) {
  const gap = selectedChangeRate - officialChangeRate;

  if (gap > 1.5) {
    return `${selectedLabel} is moving stronger than the official FANDEX price. The selected factors may be leading the current momentum.`;
  }

  if (gap < -1.5) {
    return `${selectedLabel} is moving weaker than the official FANDEX price. Other factors may be carrying the broader artist index.`;
  }

  return `${selectedLabel} is moving close to the official FANDEX price. Momentum appears distributed across multiple factors.`;
}

export default function CustomIndexBuilder({
  artistName,
  priceHistory,
}: CustomIndexBuilderProps) {
  const [selectedViewId, setSelectedViewId] =
    useState<CustomIndexViewId>('all');
  const [customEnabledFactors, setCustomEnabledFactors] =
    useState<FactorKey[]>(['search', 'news', 'youtube', 'sns']);
  const perspectiveOptions = perspectiveOrder
    .map((id) => customIndexViews.find((view) => view.id === id))
    .filter((view): view is NonNullable<typeof view> => Boolean(view));

  const selectedView =
    customIndexViews.find((view) => view.id === selectedViewId) ??
    customIndexViews[0];
  const selectedPerspectiveLabel = perspectiveLabels[selectedViewId];
  const isCustomMode = selectedViewId === 'custom';
  const activeFactors = isCustomMode
    ? customEnabledFactors
    : selectedView.enabledFactors;

  const selectedWeights = useMemo(() => {
    return buildWeights(activeFactors);
  }, [activeFactors]);

  const officialChartPoints: ChartPoint[] = useMemo(() => {
    return priceHistory.map((point) => ({
      time: point.time,
      value: point.price,
    }));
  }, [priceHistory]);

  const selectedChartPoints: ChartPoint[] = useMemo(() => {
    if (selectedViewId === 'all') {
      return officialChartPoints;
    }

    return priceHistory.map((point) => {
      const selectedScore = calculateCustomScore(point.scores, selectedWeights);

      return {
        time: point.time,
        value: scoreToPrice(selectedScore),
      };
    });
  }, [officialChartPoints, priceHistory, selectedViewId, selectedWeights]);

  const officialChangeRate = getChangeRate(officialChartPoints);
  const selectedChangeRate = getChangeRate(selectedChartPoints);
  const changeGap = selectedChangeRate - officialChangeRate;
  const latestOfficial = officialChartPoints[officialChartPoints.length - 1];
  const latestSelected = selectedChartPoints[selectedChartPoints.length - 1];
  const periodLabel = `${officialChartPoints[0]?.time ?? '-'} - ${
    officialChartPoints[officialChartPoints.length - 1]?.time ?? '-'
  }`;

  function handleViewChange(nextId: CustomIndexViewId) {
    setSelectedViewId(nextId);

    if (nextId === 'custom') {
      setCustomEnabledFactors(
        activeFactors.length > 0 ? activeFactors : allFactorKeys
      );
    }
  }

  function toggleFactor(factorKey: FactorKey) {
    setCustomEnabledFactors((prev) => {
      const isEnabled = prev.includes(factorKey);

      if (isEnabled && prev.length === 1) {
        return prev;
      }

      if (isEnabled) {
        return prev.filter((key) => key !== factorKey);
      }

      return [...prev, factorKey];
    });
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-6">
        <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
          FANDEX v4 perspective builder
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          View {artistName} through a market perspective
        </h2>

        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500 dark:text-slate-400">
          Select a v4 perspective to generate a simulated custom index. Direct
          Selection allows only factor ON/OFF choices, without weight sliders.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <label
              htmlFor="custom-index-view"
              className="text-sm font-black text-slate-700 dark:text-slate-200"
            >
              Perspective
            </label>

            <select
              id="custom-index-view"
              value={selectedViewId}
              onChange={(event) =>
                handleViewChange(event.target.value as CustomIndexViewId)
              }
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {perspectiveOptions.map((view) => (
                <option key={view.id} value={view.id}>
                  {perspectiveLabels[view.id as CustomIndexViewId]}
                </option>
              ))}
            </select>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {selectedPerspectiveLabel}: {selectedView.description}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
            <p className="text-sm font-black text-cyan-700 dark:text-cyan-300">
              Question to answer
            </p>

            <p className="mt-2 text-sm leading-6 text-cyan-800 dark:text-cyan-100">
              {selectedView.question}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                  {isCustomMode ? 'Direct Selection factors' : 'Perspective factors'}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {isCustomMode
                    ? 'Turn factors on or off. Weights stay fixed to the FANDEX v4 default model.'
                    : 'This perspective uses a preset factor group. Choose Direct Selection to edit factors.'}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 dark:bg-slate-950 dark:text-slate-300">
                {activeFactors.length}/{factorDefinitionsV3.length} ON
              </span>
            </div>

            {isCustomMode ? (
              <div className="mt-4 grid gap-3">
                {factorDefinitionsV3.map((factor) => {
                  const isEnabled = activeFactors.includes(factor.key);

                  return (
                    <button
                      key={factor.key}
                      type="button"
                      onClick={() => toggleFactor(factor.key)}
                      className={`rounded-2xl border p-4 text-left transition hover:border-cyan-400 ${
                        isEnabled
                          ? 'border-cyan-300 bg-white dark:border-cyan-300 dark:bg-slate-950'
                          : 'border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950 dark:text-white">
                            {factor.easyLabel}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {factor.helpText}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            isEnabled
                              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-300 dark:text-slate-950'
                              : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {factorDefinitionsV3
                  .filter((factor) => activeFactors.includes(factor.key))
                  .map((factor) => (
                    <span
                      key={factor.key}
                      className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-bold text-cyan-700 dark:border-cyan-400/20 dark:bg-slate-950 dark:text-cyan-300"
                    >
                      {factor.easyLabel}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <CompareCard
              label="Official price"
              value={`${latestOfficial?.value.toFixed(2) ?? '-'} FDX`}
              subValue={`${officialChangeRate >= 0 ? '+' : ''}${officialChangeRate.toFixed(2)}%`}
              tone={officialChangeRate >= 0 ? 'red' : 'blue'}
            />

            <CompareCard
              label={selectedPerspectiveLabel}
              value={`${latestSelected?.value.toFixed(2) ?? '-'} FDX`}
              subValue={`${selectedChangeRate >= 0 ? '+' : ''}${selectedChangeRate.toFixed(2)}%`}
              tone={selectedChangeRate >= 0 ? 'red' : 'blue'}
            />

            <CompareCard
              label="Gap"
              value={`${changeGap >= 0 ? '+' : ''}${changeGap.toFixed(2)}%p`}
              subValue="Selected view minus official price"
              tone={changeGap >= 0 ? 'cyan' : 'blue'}
            />
          </div>

          <FandexLineChart
            title={selectedPerspectiveLabel}
            description={`${artistName} selected perspective index movement`}
            ariaLabel={`${artistName} ${selectedPerspectiveLabel} custom index line chart`}
            period={periodLabel}
            height={390}
            minWidth={720}
            valueLocale="en-US"
            minimumFractionDigits={2}
            maximumFractionDigits={2}
            changeFractionDigits={2}
            series={[
              {
                id: `${selectedViewId}-custom-index`,
                label: selectedPerspectiveLabel,
                points: selectedChartPoints.map((point) => ({
                  label: point.time,
                  value: point.value,
                })),
              },
            ]}
          />

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">
              Auto reading
            </p>

            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {getAutoReading({
                selectedLabel: selectedPerspectiveLabel,
                officialChangeRate,
                selectedChangeRate,
              })}
            </p>

            <p className="mt-3 text-xs leading-5 text-slate-400">
              {selectedView.interpretation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareCard({
  label,
  value,
  subValue,
  tone,
}: {
  label: string;
  value: string;
  subValue: string;
  tone: 'red' | 'blue' | 'cyan';
}) {
  const toneClass = {
    red: 'text-red-500',
    blue: 'text-blue-500',
    cyan: 'text-cyan-600 dark:text-cyan-300',
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className={`mt-2 font-mono text-xl font-black ${toneClass}`}>
        {value}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-400">{subValue}</p>
    </div>
  );
}
