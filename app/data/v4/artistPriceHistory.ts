import type { ChartPoint } from '../v3/types';
import {
  getArtistChartPointsV4Compatible,
  getArtistPriceHistoryV4Compatible,
} from './scoring/compatibleHistory';
import type { ArtistPriceHistoryPointV4 } from './scoring/types';

export type { ArtistPriceHistoryPointV4 } from './scoring/types';

export function getArtistPriceHistoryV4(
  artistId: string,
): ArtistPriceHistoryPointV4[] {
  return getArtistPriceHistoryV4Compatible(artistId);
}

export function getArtistChartPointsV4(artistId: string): ChartPoint[] {
  return getArtistChartPointsV4Compatible(artistId);
}

export {
  getArtistChartPointsV4Compatible,
  getArtistPriceHistoryV4Compatible,
};
