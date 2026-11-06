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

/** 차트 축 라벨: 실제 데이터 폭이 이틀 이하면 시각, 그 이상이면 날짜 */
export function formatAxis(time: number, dataSpanMs: number): string {
  if (dataSpanMs <= 2 * 24 * 60 * 60 * 1000) return timeFormatter.format(time);
  if (dataSpanMs > 200 * 24 * 60 * 60 * 1000) return fullDateFormatter.format(time).replace(/\.\s?$/, '');
  return dateFormatter.format(time).replace(/\.\s?$/, '');
}

export function formatDate(time: number): string {
  return fullDateFormatter.format(time).replace(/\.\s?$/, '');
}

export function formatRelative(time: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - time) / 60000));
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
}

/**
 * 차트 첫 점 기준 비교 문구. 기록이 기간만큼 쌓이지 않았으면 '수집 시작 이후'.
 */
export function comparisonLabel(firstTime: number, lastTime: number, spanMs: number, periodLabel: string): string {
  return lastTime - firstTime >= spanMs * 0.9 ? `${periodLabel} 전 대비` : '수집 시작 이후';
}

export function changeRateOf(current: number, previous: number): number {
  if (!Number.isFinite(previous) || previous === 0) return 0;
  return current / previous - 1;
}
