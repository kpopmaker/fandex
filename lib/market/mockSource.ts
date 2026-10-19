// 결정적(deterministic) mock 데이터 소스.
// 같은 아티스트·같은 시각에는 항상 같은 값이 나오므로 새로고침해도 차트가 흔들리지 않는다.
// 실데이터가 연결되면 같은 MarketDataSource 인터페이스를 구현한 live 소스로 교체한다.

import type { VariableId } from './variables';
import type { MarketDataSource, RawVariablePoints } from './types';
import { SLOTS_PER_DAY } from './time';

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashInt(seed: number, value: number): number {
  let x = (seed ^ Math.imul(value, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967295;
}

/** -1..1 범위의 부드러운 value noise */
function smoothNoise(seed: number, t: number, scale: number): number {
  const position = t / scale;
  const left = Math.floor(position);
  const fraction = position - left;
  const eased = fraction * fraction * (3 - 2 * fraction);
  const a = hashInt(seed, left) * 2 - 1;
  const b = hashInt(seed, left + 1) * 2 - 1;
  return a + (b - a) * eased;
}

function unit(seed: number, salt: number): number {
  return hashInt(seed, salt);
}

type ArtistProfile = {
  seed: number;
  base: Record<VariableId, number>;
  cycleDays: number;
  cyclePhaseDays: number;
  bumpStrength: number;
  float: number;
};

const VARIABLE_SALT: Record<VariableId, number> = {
  musicAlbum: 11,
  newsIssue: 23,
  snsFandom: 37,
  brandFit: 41,
  comebackActivity: 53,
  growthMomentum: 67,
  riskAdjustment: 79,
};

const profileCache = new Map<string, ArtistProfile>();

function getProfile(artistId: string): ArtistProfile {
  const cached = profileCache.get(artistId);
  if (cached) return cached;

  const seed = hashString(artistId);
  const scale = unit(seed, 1); // 0..1 아티스트 체급
  const level = (salt: number, min: number, spread: number) =>
    min + scale * spread * 0.6 + unit(seed, salt) * spread * 0.4;

  const profile: ArtistProfile = {
    seed,
    base: {
      musicAlbum: level(2, 28, 52),
      newsIssue: level(3, 30, 45),
      snsFandom: level(4, 32, 50),
      brandFit: level(5, 25, 50),
      comebackActivity: level(6, 30, 30),
      growthMomentum: 50,
      riskAdjustment: 6 + unit(seed, 7) * 12,
    },
    cycleDays: 110 + Math.round(unit(seed, 8) * 90),
    cyclePhaseDays: Math.round(unit(seed, 9) * 200),
    bumpStrength: 8 + unit(seed, 10) * 10,
    float: Math.round((0.6 + scale * 2.8 + unit(seed, 12) * 0.6) * 100) / 100,
  };

  profileCache.set(artistId, profile);
  return profile;
}

/** 컴백 주기에 따른 상승폭. 컴백 7일 전부터 오르고 컴백 후 서서히 식는다. */
function comebackBump(profile: ArtistProfile, slot: number): number {
  const day = slot / SLOTS_PER_DAY + profile.cyclePhaseDays;
  const dayInCycle = ((day % profile.cycleDays) + profile.cycleDays) % profile.cycleDays;
  const daysUntilNext = profile.cycleDays - dayInCycle;

  if (daysUntilNext <= 7) {
    return profile.bumpStrength * 0.45 * (1 - daysUntilNext / 7);
  }
  if (dayInCycle <= 35) {
    return profile.bumpStrength * Math.exp(-dayInCycle / 18);
  }
  return 0;
}

const BUMP_SENSITIVITY: Record<VariableId, number> = {
  musicAlbum: 1,
  newsIssue: 0.9,
  snsFandom: 0.7,
  brandFit: 0.35,
  comebackActivity: 1.3,
  growthMomentum: 0,
  riskAdjustment: 0,
};

const MARKET_SEED = 0x5eed;

/** 모든 그룹이 함께 움직이는 시장 전체 흐름(지수 움직임용) */
function marketFactor(slot: number): number {
  return (
    smoothNoise(MARKET_SEED, slot, SLOTS_PER_DAY * 45) * 5 +
    smoothNoise(MARKET_SEED + 1, slot, SLOTS_PER_DAY * 6) * 1.5 +
    smoothNoise(MARKET_SEED + 2, slot, SLOTS_PER_DAY / 2) * 0.4
  );
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function baseRaw(profile: ArtistProfile, variable: VariableId, slot: number): number {
  const seed = (profile.seed ^ VARIABLE_SALT[variable]) >>> 0;

  if (variable === 'riskAdjustment') {
    const spike = Math.max(0, smoothNoise(seed, slot, 288) - 0.55) * 36;
    return clamp(profile.base.riskAdjustment + spike + smoothNoise(seed + 1, slot, 16) * 2);
  }

  const drift =
    smoothNoise(seed, slot, SLOTS_PER_DAY * 30) * 9 +
    smoothNoise(seed + 1, slot, SLOTS_PER_DAY * 7) * 3.5 +
    smoothNoise(seed + 2, slot, SLOTS_PER_DAY) * 1.2 +
    smoothNoise(seed + 3, slot, 6) * 0.35;

  return clamp(
    profile.base[variable] +
      drift +
      marketFactor(slot) +
      comebackBump(profile, slot) * BUMP_SENSITIVITY[variable],
  );
}

const POSITIVE_FOR_MOMENTUM: VariableId[] = [
  'musicAlbum',
  'newsIssue',
  'snsFandom',
  'brandFit',
];

function momentum(profile: ArtistProfile, slot: number): number {
  const lookback = SLOTS_PER_DAY * 7;
  const now =
    POSITIVE_FOR_MOMENTUM.reduce((sum, id) => sum + baseRaw(profile, id, slot), 0) /
    POSITIVE_FOR_MOMENTUM.length;
  const before =
    POSITIVE_FOR_MOMENTUM.reduce((sum, id) => sum + baseRaw(profile, id, slot - lookback), 0) /
    POSITIVE_FOR_MOMENTUM.length;
  return clamp(50 + (now - before) * 2.2);
}

export const mockMarketDataSource: MarketDataSource = {
  kind: 'mock',
  getRaw(artistId: string, slot: number): RawVariablePoints {
    const profile = getProfile(artistId);
    return {
      musicAlbum: baseRaw(profile, 'musicAlbum', slot),
      newsIssue: baseRaw(profile, 'newsIssue', slot),
      snsFandom: baseRaw(profile, 'snsFandom', slot),
      brandFit: baseRaw(profile, 'brandFit', slot),
      comebackActivity: baseRaw(profile, 'comebackActivity', slot),
      growthMomentum: momentum(profile, slot),
      riskAdjustment: baseRaw(profile, 'riskAdjustment', slot),
    };
  },
  getFloat(artistId: string): number {
    return getProfile(artistId).float;
  },
  getNewsCount(artistId: string, slot: number): number {
    const raw = baseRaw(getProfile(artistId), 'newsIssue', slot);
    return Math.max(0, Math.round((raw - 20) * 1.6));
  },
};
