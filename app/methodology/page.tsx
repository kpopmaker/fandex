import { ENABLED_VARIABLES } from '../../lib/market/variables';

export const metadata = { title: '산정 방식 | FANDEX' };

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-[880px] px-4 pb-20 pt-8 lg:px-8">
      <h1 className="text-[28px] font-bold tracking-[-0.03em] text-fx-ink">산정 방식</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-fx-sub">
        FANDEX 가격은 그룹의 음원, 뉴스, SNS 같은 공개 데이터를 15분마다 모아 계산한 가상의 지수예요.
        실제 주식이나 투자 상품이 아니에요.
      </p>

      <section className="mt-10" aria-labelledby="variables">
        <h2 id="variables" className="text-[20px] font-bold text-fx-ink">7개 변수와 계수</h2>
        <p className="mt-2 text-[15px] text-fx-sub">
          변수마다 0~100점의 원점수를 매기고, 계수를 곱해 더해요. 조정 신호는 가격에서 빼요.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-fx-line bg-fx-surface">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-fx-line text-left text-xs font-semibold text-fx-sub">
                <th scope="col" className="px-5 py-3">변수</th>
                <th scope="col" className="px-5 py-3">무엇을 보나요</th>
                <th scope="col" className="px-5 py-3">데이터 출처</th>
                <th scope="col" className="px-5 py-3 text-right">계수</th>
              </tr>
            </thead>
            <tbody>
              {ENABLED_VARIABLES.map((variable) => (
                <tr key={variable.id} className="border-b border-fx-line last:border-0">
                  <th scope="row" className="px-5 py-3 text-left font-semibold text-fx-ink">{variable.label}</th>
                  <td className="px-5 py-3 text-fx-sub">{variable.description}</td>
                  <td className="px-5 py-3 text-fx-sub">{variable.source}</td>
                  <td className="fx-num px-5 py-3 text-right font-semibold text-fx-ink">
                    {variable.penalty ? '−' : ''}
                    {variable.coefficient.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="formula">
        <h2 id="formula" className="text-[20px] font-bold text-fx-ink">계산식</h2>
        <div className="mt-4 space-y-4 rounded-2xl border border-fx-line bg-fx-surface p-6 text-[15px] leading-relaxed text-fx-ink">
          <p>
            <span className="font-semibold">FANDEX 점수</span>
            <span className="text-fx-sub"> = (Σ 원점수 × 계수 − 조정 신호 × 1.4) ÷ 양(+)의 계수 합</span>
          </p>
          <p>
            <span className="font-semibold">FANDEX 가격</span>
            <span className="text-fx-sub"> = 100 × e^((점수 − 50) ÷ 50). 점수 50점이 가격 100이에요.</span>
          </p>
          <p>
            <span className="font-semibold">팬캡</span>
            <span className="text-fx-sub"> = 가격 × 팬덤 규모. 주식의 시가총액에 해당해요.</span>
          </p>
          <p>
            <span className="font-semibold">KMI 종합지수</span>
            <span className="text-fx-sub"> = 모든 그룹의 팬캡 합 ÷ 제수. 2026년 1월 1일을 1,000으로 놓았어요.</span>
          </p>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="coverage">
        <h2 id="coverage" className="text-[20px] font-bold text-fx-ink">포함 기준</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-fx-sub">
          공식 유튜브 채널이 있고, 최근 2년 안에 발매나 활동 기록이 있으며, 해체하지 않은 K-pop 그룹을 담아요.
          실데이터가 없는 변수는 화면에 표시하지 않고, 데이터가 연결되는 대로 추가해요.
        </p>
      </section>
    </main>
  );
}
