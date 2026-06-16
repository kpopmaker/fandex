import { artistUniverseV4 } from './artistUniverse';
import { getArtistPriceHistoryV4Compatible } from './scoring/compatibleHistory';

export type ArtistRankingRowV4 = {
  artistId: string;
  ticker: string;
  nameKo: string;
  nameEn: string;
  agency: string;
  price: number;
  priceChange: number;
  changeRate: number;
  volume: number;
  fanCap: number;
};

export function getArtistRankingRowsV4(): ArtistRankingRowV4[] {
  return artistUniverseV4.map((artist) => {
    const history = getArtistPriceHistoryV4Compatible(artist.id);
    const first = history[0];
    const latest = history[history.length - 1];
    const priceChange = Number((latest.price - first.price).toFixed(2));
    const changeRate = Number(((priceChange / first.price) * 100).toFixed(2));

    return {
      artistId: artist.id,
      ticker: artist.ticker,
      nameKo: artist.nameKo,
      nameEn: artist.nameEn,
      agency: artist.agency,
      price: latest.price,
      priceChange,
      changeRate,
      volume: latest.volume,
      fanCap: latest.fanSizeValue,
    };
  });
}
