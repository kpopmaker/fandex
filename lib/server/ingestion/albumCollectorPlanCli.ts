import {
  buildAlbumCollectorPlan,
  type AlbumCollectorPeriodMode,
  type AlbumCollectorProviderSelection,
  type AlbumCollectorTimeframe,
} from './albumCollectorPlan';

const VALUE_FLAGS = Object.freeze(['--provider', '--timeframe', '--period-mode', '--period', '--at']);
const PROVIDERS = new Set<AlbumCollectorProviderSelection>(['primary', 'secondary', 'both']);
const TIMEFRAMES = new Set<AlbumCollectorTimeframe>(['hour', 'day', 'week', 'month', 'year']);
const PERIOD_MODES = new Set<AlbumCollectorPeriodMode>(['current', 'historical']);

export type ParsedAlbumCollectorPlanCommand = Readonly<{
  providerSelection: AlbumCollectorProviderSelection;
  timeframe: AlbumCollectorTimeframe;
  periodMode: AlbumCollectorPeriodMode;
  providerPeriodKey?: string;
  at: string;
}>;

function argumentInvalid(): never {
  throw new Error('album_collector_plan_argument_invalid');
}

function valueAfter(argv: readonly string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) return argumentInvalid();
  return value;
}

function currentIso(now: () => Date): string {
  let current: Date;
  try {
    current = now();
  } catch {
    throw new Error('album_collector_plan_clock_invalid');
  }
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new Error('album_collector_plan_clock_invalid');
  }
  return current.toISOString();
}

export function parseAlbumCollectorPlanCommand(
  argv: readonly string[],
  now: () => Date = () => new Date(),
): ParsedAlbumCollectorPlanCommand {
  const seen = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!VALUE_FLAGS.includes(argument) || seen.has(argument)) return argumentInvalid();
    seen.add(argument);
    values.set(argument, valueAfter(argv, index));
    index += 1;
  }

  const providerSelection = (values.get('--provider') ?? 'primary') as AlbumCollectorProviderSelection;
  const timeframe = values.get('--timeframe') as AlbumCollectorTimeframe | undefined;
  const periodMode = (values.get('--period-mode') ?? 'current') as AlbumCollectorPeriodMode;
  const providerPeriodKey = values.get('--period');
  const at = values.get('--at') ?? currentIso(now);

  if (!PROVIDERS.has(providerSelection) || !timeframe || !TIMEFRAMES.has(timeframe) || !PERIOD_MODES.has(periodMode)) {
    return argumentInvalid();
  }
  if (periodMode === 'historical' && !providerPeriodKey) return argumentInvalid();
  if (periodMode === 'current' && providerPeriodKey) return argumentInvalid();

  return Object.freeze({
    providerSelection,
    timeframe,
    periodMode,
    ...(providerPeriodKey ? { providerPeriodKey } : {}),
    at,
  });
}

export function buildAlbumCollectorPlanReport(command: ParsedAlbumCollectorPlanCommand) {
  const plan = buildAlbumCollectorPlan(command);
  return Object.freeze({
    mode: 'album-collector-plan' as const,
    ...plan,
  });
}
