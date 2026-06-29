import { artistUniverse } from './artistUniverse';
import { getArtistPriceHistory } from './mockData';

export type ArtistRankingRow = {
  rank: number;
  id: string;
  ticker: string;
  name: string;
  nameEn: string;
  company: string;
  category: string;
  generation: string;
  debutLabel: string;
  fandomName: string;
  status: string;
  price: number;
  changeRate: number;
  priceChange: number;
  volume: number;
  fanSizeValue: number;
};

export function getArtistRankingRows(): ArtistRankingRow[] {
  const rows = artistUniverse.map((artist) => {
    const history = getArtistPriceHistory(artist.id);
    const first = history[0];
    const latest = history[history.length - 1];

    const priceChange = Number((latest.price - first.price).toFixed(2));
    const changeRate = Number(((priceChange / first.price) * 100).toFixed(2));

    return {
      id: artist.id,
      ticker: artist.ticker,
      name: artist.nameKo,
      nameEn: artist.nameEn,
      company: artist.agency,
      category: artist.type,
      generation: artist.generation,
      debutLabel: artist.debutDate,
      fandomName: artist.fandomName ?? 'Not registered',
      status: artist.status,
      price: latest.price,
      changeRate,
      priceChange,
      volume: latest.volume,
      fanSizeValue: latest.fanSizeValue,
    };
  });

  return rows
    .sort((a, b) => b.price - a.price)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}
