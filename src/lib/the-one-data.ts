import { aviationZones } from "@/lib/aviation-zone-data";
import { groundZones } from "@/lib/ground-zone-data";
import { zones } from "@/lib/zone-data";
import type { AviationZone, AviationZoneData } from "@/lib/aviation-zone-data";
import type { GroundZone } from "@/lib/ground-zone-data";
import type { ZoneEnvironmentData } from "@/lib/zone-data";
import type { AirData, CoastalData, GroundData, OperationType, TheOneOperation } from "@/lib/the-one-engine";

export type OperationConfig = {
  type: OperationType;
  title: string;
  code: string;
  shortTitle: string;
  theme: "coastal" | "ground" | "air";
  icon: string;
  lead: string;
};

export const operationConfigs: Record<OperationType, OperationConfig> = {
  coastal: {
    type: "coastal",
    title: "해안기상",
    code: "",
    shortTitle: "해안",
    theme: "coastal",
    icon: "mode-coastal.svg",
    lead: "파고, 풍속, 조석, 시정 조건을 종합합니다.",
  },
  ground: {
    type: "ground",
    title: "육상기상",
    code: "",
    shortTitle: "육상",
    theme: "ground",
    icon: "mode-land.svg",
    lead: "인원 부담, 시야 제한, 이동 제한, 환경 위험을 평가합니다.",
  },
  air: {
    type: "air",
    title: "공중기상",
    code: "",
    shortTitle: "공중",
    theme: "air",
    icon: "mode-air.svg",
    lead: "풍속, 돌풍, 운고, 시정, 낙뢰 위험을 판단합니다.",
  },
};

function timeFromBand(timeBand: ZoneEnvironmentData["timeBand"]) {
  if (timeBand === "night") return "23:00";
  if (timeBand === "evening") return "20:00";
  if (timeBand === "dawn") return "05:00";
  return "14:00";
}

function tideAgeFromStatus(status: ZoneEnvironmentData["tideStatus"]) {
  if (status === "만조 전후") return "8물";
  if (status === "만조 접근") return "7물";
  if (status === "간조 전후") return "조금";
  return "4물";
}

function currentSpeedFromStatus(status: ZoneEnvironmentData["currentStatus"]) {
  if (status === "접근 유리") return 0.3;
  if (status === "보통") return 0.8;
  return 1.4;
}

function precipitationFromWeather(status: ZoneEnvironmentData["weatherStatus"]) {
  if (status === "폭우" || status === "악천후") return { probability: 85, amount: 18 };
  if (status === "비" || status === "눈") return { probability: 65, amount: 5 };
  if (status === "흐림" || status === "안개") return { probability: 35, amount: 0 };
  return { probability: 10, amount: 0 };
}

function coastalDataFromEnvironment(data: ZoneEnvironmentData): CoastalData {
  const precipitation = precipitationFromWeather(data.weatherStatus);

  return {
    temperatureC: data.temperatureC,
    weatherAlert: data.windSpeedMs >= 12 || data.waveHeightM >= 2 ? "강풍주의보" : "없음",
    precipitationProbability: precipitation.probability,
    precipitationMm: precipitation.amount,
    humidityPercent: data.fogLevel === "없음" ? 62 : data.fogLevel === "의심" ? 72 : 86,
    windDirection: "서북서",
    windSpeedMs: data.windSpeedMs,
    sunrise: "05:32",
    sunset: "19:31",
    moonrise: "21:18",
    moonset: "06:42",
    moonlightPercent: data.timeBand === "night" ? 18 : data.timeBand === "evening" ? 34 : 62,
    lowTide: data.tideStatus === "간조 전후" ? "03:18 / 15:42" : "04:05 / 16:18",
    highTide: data.tideStatus === "만조 전후" || data.tideStatus === "만조 접근" ? "09:36 / 22:08" : "10:20 / 23:01",
    tideAge: tideAgeFromStatus(data.tideStatus),
    waveHeightM: data.waveHeightM,
    waveDirection: "서남서",
    wavePeriodSec: data.waveHeightM >= 1.5 ? 6.2 : 4.8,
    waterTempC: data.temperatureC - 1,
    currentDirection: data.currentStatus === "접근 유리" ? "남동" : data.currentStatus === "보통" ? "남서" : "북서",
    currentSpeedKt: currentSpeedFromStatus(data.currentStatus),
    visibilityKm: data.visibilityKm,
    currentTime: timeFromBand(data.timeBand),
  };
}

function groundDataFromZone(zone: GroundZone): GroundData {
  return {
    temperatureC: zone.data.temperatureC,
    precipitationProbability: zone.data.precipitationProbability,
    precipitationMm: zone.data.precipitationMm,
    humidityPercent: zone.data.humidityPercent,
    windSpeedMs: zone.data.windSpeedMs,
    windDirection: zone.data.windDirection,
    visibilityKm: zone.data.visibilityKm,
    cloudCoverPercent: zone.data.weatherStatus === "맑음" ? 22 : zone.data.weatherStatus === "흐림" ? 65 : 86,
    fog: zone.data.fogLevel,
    terrain: zone.terrain,
    sunrise: "05:28",
    sunset: "19:36",
    currentTime: zone.data.weatherAlert === "없음" ? "21:30" : "23:00",
  };
}

function turbulenceFromAviation(data: AviationZoneData): AirData["turbulenceRisk"] {
  if (data.gustSpeedMs >= 18 || data.averageWindSpeedMs >= 12) return "강";
  if (data.gustSpeedMs >= 12 || data.averageWindSpeedMs >= 8) return "중";
  if (data.gustSpeedMs >= 8 || data.averageWindSpeedMs >= 5) return "약";
  return "없음";
}

function airDataFromEnvironment(data: AviationZoneData): AirData {
  const turbulence = turbulenceFromAviation(data);

  return {
    temperatureC: data.temperatureC,
    precipitationProbability: data.precipitationMm >= 5 ? 75 : data.precipitationMm > 0 ? 45 : 15,
    precipitationMm: data.precipitationMm,
    windSpeedMs: data.averageWindSpeedMs,
    windDirection: data.windDirection,
    gustSpeedMs: data.gustSpeedMs,
    cloudCeilingFt: data.cloudCeilingFt,
    visibilityKm: data.visibilityKm,
    turbulenceRisk: turbulence,
    pressureHpa: data.averageWindSpeedMs >= 9 ? 1001 : 1012,
    humidityPercent: data.humidityPercent,
    dewPointC: data.dewPointC,
    altitudeLayers: [
      { label: "FL050", windSpeedMs: Math.max(2, data.averageWindSpeedMs - 1), windDirection: "230°", temperatureC: data.temperatureC - 1, turbulence },
      { label: "FL150", windSpeedMs: data.averageWindSpeedMs + 4, windDirection: "240°", temperatureC: data.temperatureC - 12, turbulence },
      { label: "FL250", windSpeedMs: data.averageWindSpeedMs + 9, windDirection: "250°", temperatureC: data.temperatureC - 28, turbulence: turbulence === "강" ? "강" : "중" },
      { label: "FL350", windSpeedMs: data.averageWindSpeedMs + 16, windDirection: "260°", temperatureC: data.temperatureC - 45, turbulence: turbulence === "없음" ? "약" : turbulence },
    ],
  };
}

function coastalOperation(zone: (typeof zones)[number]): TheOneOperation {
  return {
    id: `coastal-${zone.id}`,
    type: "coastal",
    name: zone.name,
    area: zone.seaArea === "offshore" ? "원해 관측" : "연안 관측",
    datetime: "2026.05.11 23:00 기준",
    imageTone: "blue",
    center: [zone.center[0], zone.center[1]],
    coastal: coastalDataFromEnvironment(zone.data),
    coastalEnvironment: zone.data,
  };
}

const extraCoastalOperations: TheOneOperation[] = [
  {
    id: "coastal-dalian",
    type: "coastal",
    name: "중국 황해 대련항",
    area: "황해 북부 실험구역",
    datetime: "2026.05.11 00:30 기준",
    imageTone: "red",
    center: [38.92, 121.64],
    coastalEnvironment: {
      waveHeightM: 0.3,
      windSpeedMs: 2.6,
      visibilityKm: 0.9,
      tideStatus: "만조 접근",
      currentStatus: "접근 유리",
      timeBand: "night",
      weatherStatus: "비",
      temperatureC: 12,
      pmLevel: "보통",
      fireRiskLevel: "낮음",
      fogLevel: "심함",
      cctvVisibility: "불량",
    },
    coastal: coastalDataFromEnvironment({
      waveHeightM: 0.3,
      windSpeedMs: 2.6,
      visibilityKm: 0.9,
      tideStatus: "만조 접근",
      currentStatus: "접근 유리",
      timeBand: "night",
      weatherStatus: "비",
      temperatureC: 12,
      pmLevel: "보통",
      fireRiskLevel: "낮음",
      fogLevel: "심함",
      cctvVisibility: "불량",
    }),
  },
  {
    id: "coastal-weihai",
    type: "coastal",
    name: "중국 산둥 위해 연안",
    area: "황해 중부 실험구역",
    datetime: "2026.05.11 01:00 기준",
    imageTone: "red",
    center: [37.5, 122.12],
    coastalEnvironment: {
      waveHeightM: 0.6,
      windSpeedMs: 4.4,
      visibilityKm: 2.8,
      tideStatus: "만조 접근",
      currentStatus: "보통",
      timeBand: "night",
      weatherStatus: "흐림",
      temperatureC: 14,
      pmLevel: "보통",
      fireRiskLevel: "낮음",
      fogLevel: "발생",
      cctvVisibility: "제한",
    },
    coastal: coastalDataFromEnvironment({
      waveHeightM: 0.6,
      windSpeedMs: 4.4,
      visibilityKm: 2.8,
      tideStatus: "만조 접근",
      currentStatus: "보통",
      timeBand: "night",
      weatherStatus: "흐림",
      temperatureC: 14,
      pmLevel: "보통",
      fireRiskLevel: "낮음",
      fogLevel: "발생",
      cctvVisibility: "제한",
    }),
  },
  {
    id: "coastal-china-east-sea",
    type: "coastal",
    name: "중국 동해 연안 실험구역",
    area: "동중국해 참고구역",
    datetime: "2026.05.11 02:00 기준",
    imageTone: "blue",
    center: [31.23, 121.5],
    coastalEnvironment: {
      waveHeightM: 1.2,
      windSpeedMs: 6.8,
      visibilityKm: 5.2,
      tideStatus: "중간",
      currentStatus: "보통",
      timeBand: "night",
      weatherStatus: "흐림",
      temperatureC: 18,
      pmLevel: "보통",
      fireRiskLevel: "낮음",
      fogLevel: "의심",
      cctvVisibility: "보통",
    },
    coastal: coastalDataFromEnvironment({
      waveHeightM: 1.2,
      windSpeedMs: 6.8,
      visibilityKm: 5.2,
      tideStatus: "중간",
      currentStatus: "보통",
      timeBand: "night",
      weatherStatus: "흐림",
      temperatureC: 18,
      pmLevel: "보통",
      fireRiskLevel: "낮음",
      fogLevel: "의심",
      cctvVisibility: "보통",
    }),
  },
];

function groundOperation(zone: GroundZone): TheOneOperation {
  return {
    id: `ground-${zone.id}`,
    type: "ground",
    name: zone.name,
    area: zone.sector,
    datetime: "2026.05.11 21:30 기준",
    imageTone: "green",
    center: zone.center,
    ground: groundDataFromZone(zone),
    groundEnvironment: zone.data,
  };
}

function airOperation(zone: AviationZone): TheOneOperation {
  return {
    id: `air-${zone.id}`,
    type: "air",
    name: zone.name,
    area: zone.sector,
    datetime: "2026.05.11 22:00 기준",
    imageTone: "cyan",
    center: zone.center,
    air: airDataFromEnvironment(zone.data),
    aviationEnvironment: zone.data,
  };
}

export const allOperations: TheOneOperation[] = [
  ...zones.map(coastalOperation),
  ...extraCoastalOperations,
  ...groundZones.map(groundOperation),
  ...aviationZones.map(airOperation),
];

export const defaultOperations: TheOneOperation[] = [
  ...allOperations.filter((operation) => operation.type === "coastal").slice(0, 4),
  ...allOperations.filter((operation) => operation.type === "ground").slice(0, 4),
  ...allOperations.filter((operation) => operation.type === "air").slice(0, 4),
];

export function cloneCatalogOperation(operation: TheOneOperation): TheOneOperation {
  return structuredClone(operation);
}

export function createOperationFromTemplate(type: OperationType, name: string, area: string): TheOneOperation {
  const seed = allOperations.find((operation) => operation.type === type);
  if (!seed) throw new Error("지원하지 않는 작전 유형입니다.");

  return {
    ...structuredClone(seed),
    id: `${type}-${Date.now()}`,
    name: name.trim() || `${operationConfigs[type].shortTitle} 신규 지역`,
    area: area.trim() || "사용자 지정",
    datetime: "LocalStorage 저장 항목",
    imageTone: type === "ground" ? "green" : type === "air" ? "cyan" : "blue",
  };
}
