import type { RiskLevel, ZoneEnvironmentData } from "./zone-data";
import { getMatchedRules, type MatchedRule } from "./xai-rules";

export type RiskContribution = {
  factor: string;
  value: string;
  normalizedScore: number;
  weight: number;
  contribution: number;
  reason: string;
};

export type RiskAssessment = {
  score: number;
  level: RiskLevel;
  summary: string;
  contributions: RiskContribution[];
  matchedRules: MatchedRule[];
};

type FactorKey =
  | "visibilityKm"
  | "waveHeightM"
  | "windSpeedMs"
  | "timeBand"
  | "tideStatus"
  | "currentStatus"
  | "weatherStatus"
  | "temperatureC"
  | "pmLevel"
  | "fogLevel"
  | "cctvVisibility";

const weights: Record<FactorKey, number> = {
  visibilityKm: 20,
  waveHeightM: 15,
  windSpeedMs: 15,
  timeBand: 10,
  tideStatus: 10,
  currentStatus: 10,
  weatherStatus: 5,
  temperatureC: 3,
  pmLevel: 4,
  fogLevel: 5,
  cctvVisibility: 10,
};

function rounded(value: number) {
  return Number(value.toFixed(1));
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) {
    return "위험";
  }

  if (score >= 40) {
    return "주의";
  }

  return "양호";
}

function scoreVisibility(value: number) {
  if (value <= 2) return 1;
  if (value <= 5) return 0.8;
  if (value <= 8) return 0.4;
  return 0.1;
}

function scoreWave(value: number) {
  if (value <= 0.5) return 1;
  if (value <= 1) return 0.7;
  if (value <= 1.5) return 0.4;
  return 0.1;
}

function scoreWind(value: number) {
  if (value <= 5) return 1;
  if (value <= 8) return 0.7;
  if (value <= 12) return 0.4;
  return 0.1;
}

function scoreTimeBand(value: ZoneEnvironmentData["timeBand"]) {
  if (value === "night") return 1;
  if (value === "evening") return 0.7;
  if (value === "dawn") return 0.6;
  return 0.2;
}

function scoreTide(value: ZoneEnvironmentData["tideStatus"]) {
  if (value === "만조 전후") return 1;
  if (value === "만조 접근") return 0.8;
  if (value === "중간") return 0.5;
  return 0.3;
}

function scoreCurrent(value: ZoneEnvironmentData["currentStatus"]) {
  if (value === "접근 유리") return 1;
  if (value === "보통") return 0.5;
  return 0.2;
}

function scoreWeather(value: ZoneEnvironmentData["weatherStatus"]) {
  if (["안개", "비", "눈", "폭우", "악천후"].includes(value)) return 0.8;
  if (value === "흐림") return 0.5;
  return 0.2;
}

function scoreTemperature(value: number) {
  return value <= 0 || value >= 33 ? 0.4 : 0.2;
}

function scorePm(value: ZoneEnvironmentData["pmLevel"]) {
  if (value === "매우나쁨") return 0.8;
  if (value === "나쁨") return 0.6;
  if (value === "보통") return 0.3;
  return 0.1;
}

function scoreFog(value: ZoneEnvironmentData["fogLevel"]) {
  if (value === "심함") return 1;
  if (value === "발생") return 0.8;
  if (value === "의심") return 0.5;
  return 0.1;
}

function scoreCctvVisibility(value: ZoneEnvironmentData["cctvVisibility"]) {
  if (value === "불량") return 1;
  if (value === "제한") return 0.7;
  if (value === "보통") return 0.4;
  return 0.1;
}

function timeBandLabel(value: ZoneEnvironmentData["timeBand"]) {
  if (value === "night") return "야간";
  if (value === "evening") return "저녁";
  if (value === "dawn") return "새벽";
  return "주간";
}

function makeContribution(
  factor: string,
  value: string,
  normalizedScore: number,
  weight: number,
  reason: string,
): RiskContribution {
  return {
    factor,
    value,
    normalizedScore,
    weight,
    contribution: rounded(normalizedScore * weight),
    reason,
  };
}

function buildSummary(
  level: RiskLevel,
  contributions: RiskContribution[],
  matchedRules: MatchedRule[],
) {
  const topFactors = [...contributions]
    .sort((first, second) => second.contribution - first.contribution)
    .slice(0, 4)
    .map((item) => item.factor)
    .join(", ");
  const hasLimitation = matchedRules.some((rule) => rule.category === "limitation");
  const suffix = hasLimitation
    ? " 다만 해상 이동 제한 요소도 함께 확인되어 현장 판단 시 병행 검토가 필요합니다."
    : "";

  return `${topFactors} 요인이 중첩되어 해안경계 위험도가 ${level} 단계로 산정되었습니다.${suffix}`;
}

export function calculateRisk(data: ZoneEnvironmentData): RiskAssessment {
  const contributions = [
    makeContribution(
      "시정",
      `${data.visibilityKm}km`,
      scoreVisibility(data.visibilityKm),
      weights.visibilityKm,
      "시정이 낮을수록 감시 여건이 제한됩니다.",
    ),
    makeContribution(
      "파고",
      `${data.waveHeightM}m`,
      scoreWave(data.waveHeightM),
      weights.waveHeightM,
      "파고가 낮을수록 소형 선박 이동 여건이 양호합니다.",
    ),
    makeContribution(
      "풍속",
      `${data.windSpeedMs}m/s`,
      scoreWind(data.windSpeedMs),
      weights.windSpeedMs,
      "풍속이 낮을수록 해상 이동 제한 요소가 줄어듭니다.",
    ),
    makeContribution(
      "시간대",
      timeBandLabel(data.timeBand),
      scoreTimeBand(data.timeBand),
      weights.timeBand,
      "야간과 새벽 시간대는 감시 취약성이 증가합니다.",
    ),
    makeContribution(
      "조석",
      data.tideStatus,
      scoreTide(data.tideStatus),
      weights.tideStatus,
      "만조 전후 또는 만조 접근 시 해안 접근 여건이 달라질 수 있습니다.",
    ),
    makeContribution(
      "조류",
      data.currentStatus,
      scoreCurrent(data.currentStatus),
      weights.currentStatus,
      "조류 방향과 세기는 접근 유불리에 영향을 줍니다.",
    ),
    makeContribution(
      "날씨",
      data.weatherStatus,
      scoreWeather(data.weatherStatus),
      weights.weatherStatus,
      "안개, 강수, 악천후는 식별과 감시에 영향을 줍니다.",
    ),
    makeContribution(
      "온도",
      `${data.temperatureC}℃`,
      scoreTemperature(data.temperatureC),
      weights.temperatureC,
      "온도는 환경 보조 지표로 낮은 가중치로 반영합니다.",
    ),
    makeContribution(
      "미세먼지",
      data.pmLevel,
      scorePm(data.pmLevel),
      weights.pmLevel,
      "미세먼지는 시정 보조 지표로 반영합니다.",
    ),
    makeContribution(
      "운무",
      data.fogLevel,
      scoreFog(data.fogLevel),
      weights.fogLevel,
      "운무는 감시 취약성과 직접 관련됩니다.",
    ),
    makeContribution(
      "CCTV 시정",
      data.cctvVisibility,
      scoreCctvVisibility(data.cctvVisibility),
      weights.cctvVisibility,
      "감시장비 화면의 식별 가능 상태를 반영합니다.",
    ),
  ];

  const rawScore = contributions.reduce((total, item) => total + item.contribution, 0);
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  const level = getRiskLevel(score);
  const matchedRules = getMatchedRules(data);

  return {
    score,
    level,
    summary: buildSummary(level, contributions, matchedRules),
    contributions,
    matchedRules,
  };
}
