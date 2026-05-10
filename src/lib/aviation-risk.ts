import type { AviationRiskLevel, AviationZoneData } from "./aviation-zone-data";

export type AviationContribution = {
  factor: string;
  value: string;
  normalizedScore: number;
  weight: number;
  contribution: number;
  reason: string;
};

export type AviationMatchedRule = {
  name: string;
  condition: string;
  result: string;
};

export type AviationRiskAssessment = {
  score: number;
  level: AviationRiskLevel;
  summary: string;
  contributions: AviationContribution[];
  matchedRules: AviationMatchedRule[];
};

const aviationWeights = {
  averageWindSpeedMs: 12,
  gustSpeedMs: 14,
  returnWindStatus: 8,
  precipitation: 12,
  visibilityKm: 12,
  fogLevel: 10,
  temperatureC: 8,
  dewPointSpread: 8,
  lightningThunderstorm: 10,
  cloudCeilingAmount: 6,
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function levelFromScore(score: number): AviationRiskLevel {
  if (score >= 70) return "위험";
  if (score >= 40) return "주의";
  return "양호";
}

function scoreAverageWind(value: number) {
  if (value >= 12) return 1;
  if (value >= 8) return 0.75;
  if (value >= 5) return 0.45;
  return 0.15;
}

function scoreGust(value: number) {
  if (value >= 18) return 1;
  if (value >= 12) return 0.8;
  if (value >= 8) return 0.45;
  return 0.1;
}

function scoreReturnWind(value: AviationZoneData["returnWindStatus"]) {
  if (value === "복귀풍 불리") return 1;
  if (value === "측풍 주의") return 0.65;
  return 0.15;
}

function scorePrecipitation(data: AviationZoneData) {
  if (data.snowfallCm >= 1 || data.precipitationMm >= 15) return 1;
  if (data.precipitationMm >= 5) return 0.75;
  if (data.precipitationMm >= 1) return 0.45;
  return 0.1;
}

function scoreVisibility(value: number) {
  if (value <= 1) return 1;
  if (value <= 3) return 0.8;
  if (value <= 5) return 0.5;
  return 0.1;
}

function scoreFog(value: AviationZoneData["fogLevel"]) {
  if (value === "심함") return 1;
  if (value === "발생") return 0.8;
  if (value === "의심") return 0.5;
  return 0.1;
}

function scoreTemperature(value: number) {
  if (value >= 35 || value <= -10) return 1;
  if (value >= 30 || value <= 0) return 0.75;
  if (value >= 28 || value <= 5) return 0.45;
  return 0.2;
}

function scoreDewPointSpread(data: AviationZoneData) {
  const spread = Math.abs(data.temperatureC - data.dewPointC);
  if (spread <= 1 || data.humidityPercent >= 90) return 1;
  if (spread <= 2 || data.humidityPercent >= 80) return 0.75;
  if (spread <= 4 || data.humidityPercent >= 70) return 0.45;
  return 0.1;
}

function scoreLightning(value: AviationZoneData["lightningRisk"] | AviationZoneData["thunderstormRisk"]) {
  if (value === "발생") return 1;
  if (value === "가능") return 0.85;
  if (value === "주의") return 0.55;
  if (value === "낮음") return 0.25;
  return 0.1;
}

function scoreLightningThunderstorm(data: AviationZoneData) {
  return Math.max(scoreLightning(data.lightningRisk), scoreLightning(data.thunderstormRisk));
}

function scoreCloud(data: AviationZoneData) {
  if (data.cloudCeilingFt <= 500 || data.cloudAmountOctas >= 8) return 1;
  if (data.cloudCeilingFt <= 1000 || data.cloudAmountOctas >= 7) return 0.8;
  if (data.cloudCeilingFt <= 2000 || data.cloudAmountOctas >= 6) return 0.5;
  return 0.1;
}

function contribution(
  factor: string,
  value: string,
  normalizedScore: number,
  weight: number,
  reason: string,
): AviationContribution {
  return {
    factor,
    value,
    normalizedScore,
    weight,
    contribution: Number((normalizedScore * weight).toFixed(1)),
    reason,
  };
}

function aviationRules(data: AviationZoneData): AviationMatchedRule[] {
  const rules: AviationMatchedRule[] = [];
  const dewPointSpread = Math.abs(data.temperatureC - data.dewPointC);

  if (data.averageWindSpeedMs >= 8 && data.gustSpeedMs >= 12) {
    rules.push({
      name: "강풍·돌풍 중첩",
      condition: "평균풍속 ≥ 8m/s AND 순간풍속 ≥ 12m/s",
      result: "기체 안정성과 복귀 경로 유지 부담이 증가합니다.",
    });
  }

  if (data.visibilityKm <= 3 || ["발생", "심함"].includes(data.fogLevel)) {
    rules.push({
      name: "시정·운무 제한",
      condition: "시정 ≤ 3km OR 안개/운무 발생 이상",
      result: "육안식별과 영상 판독 가능성이 낮아질 수 있습니다.",
    });
  }

  if (["가능", "발생"].includes(data.lightningRisk) || ["가능", "발생"].includes(data.thunderstormRisk)) {
    rules.push({
      name: "낙뢰·뇌우 즉시위험",
      condition: "낙뢰 또는 뇌우 가능 이상",
      result: "항공 운용을 즉시 제한해야 할 위험기상이 존재합니다.",
    });
  }

  if (data.cloudCeilingFt <= 1000 || data.cloudAmountOctas >= 7) {
    rules.push({
      name: "낮은 운고·높은 운량",
      condition: "구름고도 ≤ 1000ft OR 운량 ≥ 7/8",
      result: "상공 시야와 촬영 여건이 제한될 수 있습니다.",
    });
  }

  if (dewPointSpread <= 2 && data.humidityPercent >= 80) {
    rules.push({
      name: "결로·안개 가능성",
      condition: "기온-이슬점 차 ≤ 2℃ AND 습도 ≥ 80%",
      result: "결로, 렌즈 흐림, 운무 발생 가능성이 높아집니다.",
    });
  }

  if (data.precipitationMm >= 5 || data.snowfallCm > 0) {
    rules.push({
      name: "강수·강설 운용 제한",
      condition: "강수량 ≥ 5mm OR 강설 발생",
      result: "기체 방수, 센서 노이즈, 이착륙 안전 부담이 증가합니다.",
    });
  }

  return rules;
}

export function calculateAviationRisk(data: AviationZoneData): AviationRiskAssessment {
  const dewPointSpread = Math.abs(data.temperatureC - data.dewPointC);
  const contributions = [
    contribution("평균풍속", `${data.averageWindSpeedMs}m/s`, scoreAverageWind(data.averageWindSpeedMs), aviationWeights.averageWindSpeedMs, "평균풍속은 기체 자세 안정성과 경로 유지 부담에 직접 영향을 줍니다."),
    contribution("순간풍속", `${data.gustSpeedMs}m/s`, scoreGust(data.gustSpeedMs), aviationWeights.gustSpeedMs, "돌풍은 이착륙과 저고도 운용 안정성을 급격히 떨어뜨릴 수 있습니다."),
    contribution("풍향", data.returnWindStatus, scoreReturnWind(data.returnWindStatus), aviationWeights.returnWindStatus, "복귀풍 방향이 불리하면 귀환 경로와 잔여 배터리 부담이 증가합니다."),
    contribution("강수/강설", `${data.precipitationMm}mm / ${data.snowfallCm}cm`, scorePrecipitation(data), aviationWeights.precipitation, "강수와 강설은 센서, 기체 방수, 이착륙면 상태에 영향을 줍니다."),
    contribution("시정", `${data.visibilityKm}km`, scoreVisibility(data.visibilityKm), aviationWeights.visibilityKm, "시정이 낮을수록 육안식별과 영상 판독 신뢰도가 낮아집니다."),
    contribution("안개/운무", data.fogLevel, scoreFog(data.fogLevel), aviationWeights.fogLevel, "안개와 운무는 영상·시야 제한을 직접 유발합니다."),
    contribution("기온", `${data.temperatureC}℃`, scoreTemperature(data.temperatureC), aviationWeights.temperatureC, "극한 기온은 배터리 효율과 기체 상태에 부담을 줍니다."),
    contribution("습도/이슬점", `${data.humidityPercent}% / ${data.dewPointC}℃`, scoreDewPointSpread(data), aviationWeights.dewPointSpread, `기온과 이슬점 차가 ${dewPointSpread.toFixed(1)}℃로 작을수록 결로와 운무 가능성이 커집니다.`),
    contribution("낙뢰/뇌우", `${data.lightningRisk} / ${data.thunderstormRisk}`, scoreLightningThunderstorm(data), aviationWeights.lightningThunderstorm, "낙뢰와 뇌우는 항공 운용의 즉시 제한 요인입니다."),
    contribution("구름고도/운량", `${data.cloudCeilingFt}ft / ${data.cloudAmountOctas}/8`, scoreCloud(data), aviationWeights.cloudCeilingAmount, "낮은 운고와 높은 운량은 상공 시야와 촬영 여건을 제한합니다."),
  ];
  const score = Math.round(clamp(contributions.reduce((sum, item) => sum + item.contribution, 0)));
  const level = levelFromScore(score);
  const topFactors = contributions
    .slice()
    .sort((first, second) => second.contribution - first.contribution)
    .slice(0, 4)
    .map((item) => item.factor);

  return {
    score,
    level,
    summary: `${topFactors.join(", ")} 항목 영향이 커서 항공작전 기상위험도가 ${level} 단계로 산정되었습니다.`,
    contributions,
    matchedRules: aviationRules(data),
  };
}
