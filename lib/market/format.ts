// 서버·클라이언트 공용 숫자/시간 포맷터. 시간은 항상 한국 시간으로 표시한다.

const TIME_ZONE = 'Asia/Seoul';

export function formatPrice(value: number): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatIndex(value: number): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSignedPercent(rate: number): string {
  const percent = rate * 100;
  const sign = percent > 0 ? '+' : percent < 0 ? '−' : '';
  return `${sign}${Math.abs(percent).toFixed(2)}%`;
}

export function formatSignedNumber(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatPoint(value: number): string {
  return value.toFixed(1);
}

/** 팬캡을 읽기 쉬운 단위로 */
export function formatFanCap(value: number): string {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
}

export function direction(value: number): 'up' | 'down' | 'flat' {
  if (value > 0.00001) return 'up';
  if (value < -0.00001) return 'down';
  return 'flat';
}

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  month: 'numeric',
  day: 'numeric',
});

const fullDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

export function formatAsOf(time: number): string {
  return `${dateTimeFormatter.format(time)} 기준`;
}

export function formatDateTime(time: number): string {
  return dateTimeFormatter.format(time);
}

/** 차트 축 라벨: 1일은 시각, 나머지는 날짜 */
export function formatAxis(time: number, period: string): string {
  if (period === '1D') return timeFormatter.format(time);
  if (period === '1Y') return fullDateFormatter.format(time).replace(/\.\s?$/, '');
  return dateFormatter.format(time).replace(/\.\s?$/, '');
}

export function changeRateOf(current: number, previous: number): number {
  if (!Number.isFinite(previous) || previous === 0) return 0;
  return current / previous - 1;
}
