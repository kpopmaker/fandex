import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ArtistDetailView from '../../components/market/ArtistDetailView';
import DataNotice from '../../components/market/DataNotice';
import DataUnavailable from '../../components/market/DataUnavailable';
import { findArtist } from '../../../lib/market/artists';
import { MarketDataUnavailableError } from '../../../lib/market/dataset';
import { getArtistDetailModel, type ArtistDetailModel } from '../../../lib/market/queries';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ artistId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { artistId } = await params;
  const artist = findArtist(artistId);
  return { title: artist ? `${artist.koreanName} (${artist.ticker}) | FANDEX` : 'FANDEX' };
}

export default async function ArtistPage({ params }: PageProps) {
  const { artistId } = await params;
  if (!findArtist(artistId)) {
    // 예전 주소(stray-kids 등)는 새 주소로 보낸다.
    const compact = artistId.replace(/-/g, '');
    if (compact !== artistId && findArtist(compact)) redirect(`/artists/${compact}`);
    notFound();
  }

  let model: ArtistDetailModel | null;
  try {
    model = await getArtistDetailModel(artistId);
  } catch (error) {
    if (error instanceof MarketDataUnavailableError) return <DataUnavailable />;
    throw error;
  }
  if (!model) notFound();

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/artists" className="text-sm font-medium text-fx-sub hover:text-fx-ink">
          아티스트 목록
        </Link>
        <DataNotice meta={model.meta} />
      </div>
      <div className="mt-4">
        <ArtistDetailView model={model} />
      </div>
    </main>
  );
}
