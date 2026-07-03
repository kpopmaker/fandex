import type { ManualMetricDataPoint } from './manualMetricDataTypes';

// Manual input points stay separate from preview seed until an explicit pipeline
// chooses to merge or prioritize them.
export const MANUAL_METRIC_DATA_POINTS: ManualMetricDataPoint[] = [];
