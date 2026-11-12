import { SCORE_REF } from '../../lib/market/formula';
import { ENABLED_VARIABLES } from '../../lib/market/variables';

export const metadata = { title: '산정 방식 | FANDEX' };

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-[880px] px-4 pb-20 pt-8 lg:px-8">
      <h1 className="text-[28px] font-bold tracking-[-0.03em] text-fx-ink">산정 방식</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-fx-sub">
        FANDEX 가격은 활동 중인 K-pop 그룹의 음원 차트, 뉴스, 해외 청취자 같은 공개 데이터를 모아 15분마다
        계산하는 가상의 지수예요. 실제 주식이나 투자 상품이 아니에요.
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
            <span className="font-semibold">원점수</span>
            <span className="text-fx-sub">
              {' '}= 실제 숫자를 로그 눈금으로 0~100점에 놓아요. 0건이면 0점, 기준치 이상이면 100점이에요. 기준치는
              7일 하루 평균 기사 {SCORE_REF.newsDaily}건, 30일 브랜드 기사 {SCORE_REF.brand30d}건, 14일 활동 기사{' '}
              {SCORE_REF.comeback30d}건, 30일 부정 기사 {SCORE_REF.risk30d}건, 차트 점수 {SCORE_REF.chartPoints}점,
              Last.fm 청취자 500만 명(1만 명 이하는 0점)이에요. 순위가 아니라 절대 규모라서 시장 전체가 조용하면
              모두 함께 낮아져요.
            </span>
          </p>
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
            <span className="text-fx-sub"> = 가격 × 팬덤 규모(Last.fm 청취자 10만 명 = 1). 주식의 시가총액에 해당해요.</span>
          </p>
          <p>
            <span className="font-semibold">KMI 종합지수</span>
            <span className="text-fx-sub">
              {' '}= 모든 그룹의 팬캡 합 ÷ 제수. 수집을 시작한 2026년 11월 6일을 1,000으로 놓았어요. 팬덤 규모가
              바뀌거나 그룹이 추가될 때는 주가지수처럼 제수를 조정해 지수가 갑자기 튀지 않게 해요.
            </span>
          </p>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="coverage">
        <h2 id="coverage" className="text-[20px] font-bold text-fx-ink">포함 기준</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-fx-sub">
          지금 활동 중인 K-pop 그룹 177팀을 담아요(솔로 제외). 뉴스는 같은 보도자료가 여러 매체에 실려도 한 건으로
          세고, 사진만 있는 기사는 빼요. 갱신 주기는 뉴스 30분, 음원 차트 1시간, Last.fm 하루 1번이에요.
          유튜브 구독자는 공식 채널 확인이 끝나는 대로 SNS/팬덤과 팬덤 규모에 더해요.
        </p>
      </section>
    </main>
  );
}
