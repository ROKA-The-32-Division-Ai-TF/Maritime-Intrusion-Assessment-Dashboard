export type LandRiskLevel = "양호" | "주의" | "위험";
export type LandAxisKey = "personnelLoad" | "visibility" | "mobility" | "environmentalHazard";
export type LandAxisName = "인원 부담도" | "시야 제한도" | "이동 제한도" | "환경 위험도";
export type LandDustLevel = "매우나쁨" | "나쁨" | "보통" | "좋음";
export type LandWeatherStatus = "맑음" | "흐림" | "비" | "눈" | "안개" | "강풍" | "뇌우";
export type LandFogLevel = "심함" | "발생" | "의심" | "없음";
export type LandUvLevel = "위험" | "매우높음" | "높음" | "보통" | "낮음";
export type LandLightningRisk = "없음" | "낮음" | "주의" | "가능" | "발생";
export type LandIcingRisk = "없음" | "낮음" | "주의" | "높음";
export type LandPressureTrend = "급하강" | "하강" | "유지" | "상승";
export type LandFireRiskLevel = "매우높음" | "높음" | "보통" | "낮음";
export type LandAlertLevel =
  | "없음"
  | "폭염주의보"
  | "폭염경보"
  | "한파주의보"
  | "한파경보"
  | "호우주의보"
  | "호우경보"
  | "대설주의보"
  | "대설경보"
  | "강풍주의보"
  | "강풍경보"
  | "건조주의보"
  | "안개주의보";

export type LandZoneData = {
  temperatureC: number;
  humidityPercent: number;
  apparentTemperatureC?: number;
  wbgtC?: number;
  precipitationMm: number;
  precipitationProbability: number;
  windSpeedMs: number;
  windDirection: string;
  visibilityKm: number;
  weatherStatus: LandWeatherStatus;
  fogLevel: LandFogLevel;
  pm10Level: LandDustLevel;
  pm25Level: LandDustLevel;
  ozoneLevel: LandDustLevel;
  fireRiskLevel: LandFireRiskLevel;
  weatherAlert: LandAlertLevel;
  pressureHpa: number;
  pressureTrend: LandPressureTrend;
  uvIndexLevel: LandUvLevel;
  lightningRisk: LandLightningRisk;
  snowDepthCm: number;
  icingRisk: LandIcingRisk;
};

export type LandRiskContribution = {
  factor: string;
  value: string;
  axis: LandAxisName;
  normalizedScore: number;
  weight: number;
  contribution: number;
  reason: string;
};

export type LandMatchedRule = {
  name: string;
  condition: string;
  result: string;
};

export type LandRiskAssessment = {
  score: number;
  level: LandRiskLevel;
  summary: string;
  axisScores: Record<LandAxisKey, number>;
  contributions: LandRiskContribution[];
  matchedRules: LandMatchedRule[];
};

const axisNames: Record<LandAxisKey, LandAxisName> = {
  personnelLoad: "인원 부담도",
  visibility: "시야 제한도",
  mobility: "이동 제한도",
  environmentalHazard: "환경 위험도",
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(clamp(value));
}

function contributionValue(normalizedScore: number, weight: number) {
  return Number((normalizedScore * weight).toFixed(1));
}

function levelFromScore(score: number): LandRiskLevel {
  if (score >= 70) return "위험";
  if (score >= 40) return "주의";
  return "양호";
}

function apparentTemperature(data: LandZoneData) {
  return data.wbgtC ?? data.apparentTemperatureC ?? data.temperatureC;
}

function apparentTemperatureLabel(data: LandZoneData) {
  if (typeof data.wbgtC === "number") return `WBGT ${data.wbgtC}℃`;
  if (typeof data.apparentTemperatureC === "number") return `${data.apparentTemperatureC}℃`;
  return `${data.temperatureC}℃`;
}

function dustRank(level: LandDustLevel) {
  if (level === "매우나쁨") return 4;
  if (level === "나쁨") return 3;
  if (level === "보통") return 2;
  return 1;
}

function worstDustLevel(first: LandDustLevel, second: LandDustLevel) {
  return dustRank(first) >= dustRank(second) ? first : second;
}

function isDustBadOrWorse(level: LandDustLevel) {
  return level === "나쁨" || level === "매우나쁨";
}

function scoreTemperature(value: number) {
  if (value >= 33) return 1;
  if (value >= 30) return 0.8;
  if (value >= 27) return 0.5;
  if (value > 5) return 0.2;
  if (value > 0) return 0.5;
  return 0.8;
}

function scoreHumidity(value: number) {
  if (value >= 80) return 1;
  if (value >= 70) return 0.8;
  if (value >= 60) return 0.5;
  if (value >= 40) return 0.2;
  return 0.3;
}

function scoreThermal(data: LandZoneData) {
  if (typeof data.wbgtC === "number") {
    if (data.wbgtC >= 31) return 1;
    if (data.wbgtC >= 28) return 0.8;
    if (data.wbgtC >= 25) return 0.5;
    return 0.2;
  }

  const value = apparentTemperature(data);
  if (value >= 35) return 1;
  if (value >= 32) return 0.8;
  if (value >= 29) return 0.5;
  return 0.2;
}

function scorePrecipitation(value: number) {
  if (value >= 30) return 1;
  if (value >= 10) return 0.8;
  if (value >= 1) return 0.5;
  return 0.1;
}

function scorePrecipitationProbability(value: number) {
  if (value >= 80) return 0.8;
  if (value >= 60) return 0.6;
  if (value >= 30) return 0.3;
  return 0.1;
}

function scoreWind(value: number) {
  if (value >= 14) return 1;
  if (value >= 9) return 0.8;
  if (value >= 5) return 0.5;
  return 0.2;
}

function scoreVisibility(value: number) {
  if (value <= 1) return 1;
  if (value <= 3) return 0.8;
  if (value <= 6) return 0.5;
  return 0.1;
}

function scoreFog(value: LandFogLevel) {
  if (value === "심함") return 1;
  if (value === "발생") return 0.8;
  if (value === "의심") return 0.5;
  return 0.1;
}

function scoreDust(value: LandDustLevel) {
  if (value === "매우나쁨") return 1;
  if (value === "나쁨") return 0.7;
  if (value === "보통") return 0.3;
  return 0.1;
}

function scoreFireRisk(value: LandFireRiskLevel) {
  if (value === "매우높음") return 1;
  if (value === "높음") return 0.8;
  if (value === "보통") return 0.4;
  return 0.1;
}

function scoreWeatherAlert(value: LandAlertLevel) {
  if (["폭염경보", "한파경보", "호우경보", "대설경보", "강풍경보"].includes(value)) return 1;
  if (value === "없음") return 0.1;
  return 0.7;
}

function scorePressureTrend(value: LandPressureTrend) {
  if (value === "급하강") return 0.7;
  if (value === "하강") return 0.4;
  if (value === "유지") return 0.2;
  return 0.1;
}

function scoreUv(value: LandUvLevel) {
  if (value === "위험") return 1;
  if (value === "매우높음") return 0.8;
  if (value === "높음") return 0.6;
  if (value === "보통") return 0.3;
  return 0.1;
}

function scoreLightning(value: LandLightningRisk) {
  if (value === "발생") return 1;
  if (value === "가능") return 0.85;
  if (value === "주의") return 0.55;
  if (value === "낮음") return 0.25;
  return 0.1;
}

function scoreSnow(value: number) {
  if (value >= 20) return 1;
  if (value >= 5) return 0.8;
  if (value >= 1) return 0.5;
  return 0.1;
}

function scoreIcing(value: LandIcingRisk) {
  if (value === "높음") return 1;
  if (value === "주의") return 0.7;
  if (value === "낮음") return 0.3;
  return 0.1;
}

function scoreWeatherStatus(value: LandWeatherStatus) {
  if (value === "뇌우" || value === "안개") return 0.9;
  if (value === "비" || value === "눈" || value === "강풍") return 0.7;
  if (value === "흐림") return 0.4;
  return 0.1;
}

function makeContribution(
  factor: string,
  value: string,
  axis: LandAxisName,
  normalizedScore: number,
  weight: number,
  reason: string,
): LandRiskContribution {
  return {
    factor,
    value,
    axis,
    normalizedScore,
    weight,
    contribution: contributionValue(normalizedScore, weight),
    reason,
  };
}

function axisScore(contributions: LandRiskContribution[], axis: LandAxisName) {
  const axisContributions = contributions.filter((item) => item.axis === axis);
  const totalWeight = axisContributions.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;

  return round((axisContributions.reduce((sum, item) => sum + item.contribution, 0) / totalWeight) * 100);
}

function matchedRules(data: LandZoneData): LandMatchedRule[] {
  const rules: LandMatchedRule[] = [];
  const thermalValue = apparentTemperature(data);
  const worstDust = worstDustLevel(data.pm10Level, data.pm25Level);

  if (thermalValue >= 32 && data.humidityPercent >= 70) {
    rules.push({
      name: "온열 부담 중첩",
      condition: "체감온도 ≥ 32℃ AND 습도 ≥ 70%",
      result: "온열손상 및 피로 누적 가능성이 증가합니다.",
    });
  }

  if (data.visibilityKm <= 3 || ["발생", "심함"].includes(data.fogLevel)) {
    rules.push({
      name: "시정 제한",
      condition: "시정 ≤ 3km OR 안개/운무 발생 이상",
      result: "관측 및 이동 간 시야 제한 가능성이 높습니다.",
    });
  }

  if (data.precipitationMm >= 10 || data.precipitationProbability >= 80) {
    rules.push({
      name: "강수 이동 제한",
      condition: "강수량 ≥ 10mm OR 강수확률 ≥ 80%",
      result: "지면 악화, 장비 젖음, 이동속도 저하 가능성이 있습니다.",
    });
  }

  if (data.windSpeedMs >= 9) {
    rules.push({
      name: "강풍 영향",
      condition: "풍속 ≥ 9m/s",
      result: "체감온도 변화, 먼지 확산, 산불 확산, 이동 안정성 저하 가능성이 있습니다.",
    });
  }

  if (["높음", "매우높음"].includes(data.fireRiskLevel) && data.windSpeedMs >= 5) {
    rules.push({
      name: "산불 확산 조건",
      condition: "산불지수 높음 이상 AND 풍속 ≥ 5m/s",
      result: "건조한 환경과 바람이 중첩되어 산불 확산 위험이 증가할 수 있습니다.",
    });
  }

  if (isDustBadOrWorse(worstDust)) {
    rules.push({
      name: "대기질 부담",
      condition: "미세먼지 나쁨 이상 OR 초미세먼지 나쁨 이상",
      result: "장시간 야외활동 시 호흡 부담과 시야 저하 가능성이 있습니다.",
    });
  }

  if (data.weatherAlert !== "없음") {
    rules.push({
      name: "기상특보 존재",
      condition: "기상특보 존재",
      result: "야외활동 및 작전환경에 직접적인 위험 요인이 존재합니다.",
    });
  }

  if (data.pressureTrend === "하강" || data.pressureTrend === "급하강") {
    rules.push({
      name: "기압 하강",
      condition: "기압 추세가 하강 또는 급하강",
      result: "기상 악화 가능성이 있어 후속 기상 변화를 확인해야 합니다.",
    });
  }

  return rules;
}

export function calculateGroundRisk(data: LandZoneData): LandRiskAssessment {
  const worstDust = worstDustLevel(data.pm10Level, data.pm25Level);
  const contributions: LandRiskContribution[] = [
    makeContribution("체감온도", apparentTemperatureLabel(data), axisNames.personnelLoad, scoreThermal(data), 40, "체감온도 또는 WBGT가 높을수록 인원 부담이 증가합니다."),
    makeContribution("기온", `${data.temperatureC}℃`, axisNames.personnelLoad, scoreTemperature(data.temperatureC), 20, "극한 기온은 피로와 장비 운용 부담을 키웁니다."),
    makeContribution("습도", `${data.humidityPercent}%`, axisNames.personnelLoad, scoreHumidity(data.humidityPercent), 20, "습도가 높으면 체온 조절 효율이 낮아집니다."),
    makeContribution("미세먼지", worstDust, axisNames.personnelLoad, scoreDust(worstDust), 10, "대기질 악화는 장시간 야외활동 부담을 키웁니다."),
    makeContribution("자외선", data.uvIndexLevel, axisNames.personnelLoad, scoreUv(data.uvIndexLevel), 10, "자외선 지수는 노출 피로와 온열 부담에 영향을 줍니다."),

    makeContribution("시정", `${data.visibilityKm}km`, axisNames.visibility, scoreVisibility(data.visibilityKm), 35, "시정이 낮을수록 관측과 이동 안전성이 제한됩니다."),
    makeContribution("안개/운무", data.fogLevel, axisNames.visibility, scoreFog(data.fogLevel), 30, "안개와 운무는 육안 식별을 직접 제한합니다."),
    makeContribution("강수량", `${data.precipitationMm}mm`, axisNames.visibility, scorePrecipitation(data.precipitationMm), 15, "강수는 시야와 장비 운용 여건을 악화시킵니다."),
    makeContribution("미세먼지", worstDust, axisNames.visibility, scoreDust(worstDust), 15, "미세먼지는 시정 저하의 보조 지표입니다."),
    makeContribution("날씨", data.weatherStatus, axisNames.visibility, scoreWeatherStatus(data.weatherStatus), 5, "현재 날씨 상태를 시야 제한에 보조 반영합니다."),

    makeContribution("강수량", `${data.precipitationMm}mm`, axisNames.mobility, scorePrecipitation(data.precipitationMm), 30, "강수량 증가는 지면 악화와 이동속도 저하로 이어집니다."),
    makeContribution("강수확률", `${data.precipitationProbability}%`, axisNames.mobility, scorePrecipitationProbability(data.precipitationProbability), 15, "강수 가능성은 후속 이동 계획에 영향을 줍니다."),
    makeContribution("풍속", `${data.windSpeedMs}m/s`, axisNames.mobility, scoreWind(data.windSpeedMs), 20, "강풍은 이동 안정성과 장비 취급에 영향을 줍니다."),
    makeContribution("적설", `${data.snowDepthCm}cm`, axisNames.mobility, scoreSnow(data.snowDepthCm), 15, "적설은 보행과 차량 이동성을 낮춥니다."),
    makeContribution("결빙", data.icingRisk, axisNames.mobility, scoreIcing(data.icingRisk), 15, "결빙 가능성은 이동 안전에 직접 영향을 줍니다."),
    makeContribution("시정", `${data.visibilityKm}km`, axisNames.mobility, scoreVisibility(data.visibilityKm), 5, "시정 저하는 이동 판단에도 보조적으로 반영됩니다."),

    makeContribution("산불지수", data.fireRiskLevel, axisNames.environmentalHazard, scoreFireRisk(data.fireRiskLevel), 30, "산불지수는 환경 위험의 핵심 참고 지표입니다."),
    makeContribution("기상특보", data.weatherAlert, axisNames.environmentalHazard, scoreWeatherAlert(data.weatherAlert), 30, "기상특보는 활동환경의 직접 위험 요인입니다."),
    makeContribution("풍속", `${data.windSpeedMs}m/s`, axisNames.environmentalHazard, scoreWind(data.windSpeedMs), 15, "강한 바람은 먼지와 화재 확산 위험을 키웁니다."),
    makeContribution("낙뢰위험", data.lightningRisk, axisNames.environmentalHazard, scoreLightning(data.lightningRisk), 15, "낙뢰 가능성은 즉시 위험기상으로 취급합니다."),
    makeContribution("기압추세", `${data.pressureHpa}hPa · ${data.pressureTrend}`, axisNames.environmentalHazard, scorePressureTrend(data.pressureTrend), 10, "기압 하강은 후속 기상 악화 가능성을 시사합니다."),
  ];

  const axisScores: Record<LandAxisKey, number> = {
    personnelLoad: axisScore(contributions, axisNames.personnelLoad),
    visibility: axisScore(contributions, axisNames.visibility),
    mobility: axisScore(contributions, axisNames.mobility),
    environmentalHazard: axisScore(contributions, axisNames.environmentalHazard),
  };
  const score = round(
    axisScores.personnelLoad * 0.35 +
      axisScores.visibility * 0.25 +
      axisScores.mobility * 0.25 +
      axisScores.environmentalHazard * 0.15,
  );
  const level = levelFromScore(score);
  const topFactors = [...contributions]
    .sort((first, second) => second.contribution - first.contribution)
    .slice(0, 4)
    .map((item) => item.factor)
    .join(", ");

  return {
    score,
    level,
    axisScores,
    contributions,
    matchedRules: matchedRules(data),
    summary: `${topFactors} 요인이 중첩되어 육상 활동환경 위험도가 ${level} 단계로 산정되었습니다.`,
  };
}
