import type { ZoneEnvironmentData } from "./zone-data";

export type MatchedRule = {
  name: string;
  condition: string;
  result: string;
  category: "risk" | "limitation";
};

function isNightBand(timeBand: ZoneEnvironmentData["timeBand"]) {
  return timeBand === "night";
}

function isPmBadOrWorse(pmLevel: ZoneEnvironmentData["pmLevel"]) {
  return pmLevel === "나쁨" || pmLevel === "매우나쁨";
}

export function getMatchedRules(data: ZoneEnvironmentData): MatchedRule[] {
  const matchedRules: MatchedRule[] = [];

  if (data.visibilityKm <= 3 && data.waveHeightM <= 0.7) {
    matchedRules.push({
      name: "저시정·저파고 중첩",
      condition: "시정 ≤ 3km AND 파고 ≤ 0.7m",
      result: "감시 취약성과 해상 이동 가능성이 동시에 증가합니다.",
      category: "risk",
    });
  }

  if (data.windSpeedMs <= 5 && isNightBand(data.timeBand)) {
    matchedRules.push({
      name: "야간·저풍속 중첩",
      condition: "풍속 ≤ 5m/s AND 시간대가 야간",
      result: "야간 시간대에 해상 이동 제한 요소가 낮아 주의가 필요합니다.",
      category: "risk",
    });
  }

  if (
    (data.tideStatus === "만조 접근" || data.tideStatus === "만조 전후") &&
    data.currentStatus === "접근 유리"
  ) {
    matchedRules.push({
      name: "조석·조류 접근 여건",
      condition: "만조 접근 또는 만조 전후 AND 조류가 접근 유리",
      result: "해안 접근 여건이 일부 유리하게 형성됩니다.",
      category: "risk",
    });
  }

  if (
    (data.fogLevel === "발생" || data.fogLevel === "심함") &&
    (data.cctvVisibility === "제한" || data.cctvVisibility === "불량")
  ) {
    matchedRules.push({
      name: "운무·감시장비 시정 제한",
      condition: "운무 발생 또는 심함 AND CCTV 시정 제한 또는 불량",
      result: "감시장비를 통한 식별 신뢰도가 낮아질 수 있습니다.",
      category: "risk",
    });
  }

  if (isPmBadOrWorse(data.pmLevel) && data.visibilityKm <= 5) {
    matchedRules.push({
      name: "대기질·시정 저하 중첩",
      condition: "미세먼지 나쁨 이상 AND 시정 ≤ 5km",
      result: "대기질 악화와 시정 저하가 중첩되어 감시 여건이 불리합니다.",
      category: "risk",
    });
  }

  if (data.waveHeightM >= 2 || data.windSpeedMs >= 12) {
    matchedRules.push({
      name: "해상 이동 제한 요소",
      condition: "파고 ≥ 2.0m OR 풍속 ≥ 12m/s",
      result: "해상 이동 제한 요소가 커져 접근 가능성은 낮아질 수 있습니다.",
      category: "limitation",
    });
  }

  return matchedRules;
}

