import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-fx-line bg-fx-surface">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-8 text-[13px] text-fx-sub sm:flex-row sm:items-start sm:justify-between lg:px-8">
        <div className="max-w-xl">
          <p className="font-bold text-fx-ink">FANDEX</p>
          <p className="mt-1 leading-relaxed">
            FANDEX 가격과 지수는 공개 데이터로 계산한 가상의 지표예요. 실제 주식, 증권, 투자 상품이 아니며
            투자 판단의 근거가 될 수 없어요.
          </p>
        </div>
        <nav aria-label="약관과 정책" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-fx-ink">개인정보처리방침</Link>
          <Link href="/terms" className="hover:text-fx-ink">이용약관</Link>
          <a href="https://www.youtube.com/t/terms" className="hover:text-fx-ink" rel="noreferrer" target="_blank">
            YouTube 약관
          </a>
          <a href="https://policies.google.com/privacy" className="hover:text-fx-ink" rel="noreferrer" target="_blank">
            Google 개인정보처리방침
          </a>
        </nav>
      </div>
    </footer>
  );
}
