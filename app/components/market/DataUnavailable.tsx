export default function DataUnavailable() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-10 lg:px-8">
      <div className="rounded-2xl border border-fx-line bg-fx-surface px-6 py-16 text-center">
        <p className="text-[17px] font-bold text-fx-ink">시세 데이터를 불러오지 못했어요.</p>
        <p className="mt-2 text-sm text-fx-sub">
          데이터 저장소에 연결하지 못했거나 첫 수집이 아직 끝나지 않았어요. 잠시 뒤 새로고침해 주세요.
        </p>
      </div>
    </main>
  );
}
