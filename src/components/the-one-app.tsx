"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Cloud,
  CloudRain,
  Compass,
  Database,
  Drone,
  Eye,
  Gauge,
  HardHat,
  Home,
  List,
  Menu,
  Moon,
  Mountain,
  Plane,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Thermometer,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import {
  type OperationType,
  type TheOneOperation,
} from "@/lib/the-one-engine";
import { allOperations, cloneCatalogOperation, defaultOperations, operationConfigs } from "@/lib/the-one-data";

type AppView = "splash" | "mode" | "dashboard" | "list" | "add" | "detail" | "analysis" | "settings";
type AnalysisTab = "summary" | "live" | "week" | "map";
type SimpleIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
type CatalogGroup = {
  name: string;
  items: TheOneOperation[];
};
type MetricItem = {
  label: string;
  value: string;
  helper: string;
  icon: SimpleIcon;
  unit: string;
  trend: number[];
};
type ObjectiveIndicator = {
  label: string;
  value: string;
  level: string;
  tone: RiskToneClass;
  description: string;
  trend: number[];
  unit: string;
};
type RiskToneClass = "very-low" | "low" | "normal" | "high" | "very-high";
type LiveAlertLevel = "info" | "watch" | "warning";
type LiveAlert = {
  id: string;
  type: OperationType | "system";
  level: LiveAlertLevel;
  title: string;
  message: string;
  source: string;
  timestamp: string;
};
type WeatherCachePayload = {
  generatedAt?: string;
  alerts?: LiveAlert[];
  operationUpdates?: Partial<TheOneOperation>[];
};

const KMA_WEATHER_MAP_URL = "https://www.weather.go.kr/wgis-nuri/html/map.html#";
const KMA_MARINE_MAP_URL = "https://marine.kma.go.kr/mmis/?menuId=sig_wh";
const ALERT_HISTORY_STORAGE_KEY = "baekryong-the-one-alert-history-v1";

const OPERATION_TYPES: OperationType[] = ["coastal", "ground", "air"];
const STORAGE_KEY = "baekryong-the-one-operations-v4";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const FORECAST_LABELS = ["18:00", "20:00", "22:00", "00:00", "02:00", "04:00", "06:00"];
const WEEK_LABELS = ["오늘", "수", "목", "금", "토", "일", "월"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function assetUrl(file: string) {
  return `${BASE_PATH}/assets/${file}`;
}

function OperationTypeIcon({ type, size = 24 }: { type: OperationType; size?: number }) {
  if (type === "ground") return <Mountain size={size} />;
  if (type === "air") return <Plane size={size} />;
  return <Waves size={size} />;
}

function ModeMenuIcon({ type }: { type: OperationType }) {
  if (type === "ground") return <HardHat size={66} strokeWidth={1.7} />;
  if (type === "air") return <Drone size={66} strokeWidth={1.7} />;
  return <Compass size={70} strokeWidth={1.55} />;
}

function trend(base: number, spread: number, floor = 0) {
  return [-0.7, -0.25, 0, 0.2, 0.55, 0.12, -0.38].map((delta) => Math.max(floor, Number((base + delta * spread).toFixed(1))));
}

function metricTrend(base: number, spread: number, floor = 0) {
  return [-0.55, -0.24, 0, 0.36, 0.58, 0.2, -0.18].map((delta) => Math.max(floor, Number((base + delta * spread).toFixed(1))));
}

function forecastTrend(base: number, spread: number, floor = 0, ceiling = 100) {
  return [-0.55, -0.2, 0.18, 0.48, 0.22, -0.25, -0.58].map((delta) => Math.min(ceiling, Math.max(floor, Math.round(base + delta * spread))));
}

function clampIndex(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toneFromIndex(value: number): RiskToneClass {
  if (value >= 80) return "very-high";
  if (value >= 60) return "high";
  if (value >= 40) return "normal";
  if (value >= 20) return "low";
  return "very-low";
}

function levelFromIndex(value: number) {
  if (value >= 80) return "매우 높음";
  if (value >= 60) return "높음";
  if (value >= 40) return "보통";
  if (value >= 20) return "낮음";
  return "매우 낮음";
}

function indicatorGauge(indicator: ObjectiveIndicator) {
  const numericValue = Number.parseFloat(indicator.value);
  if (Number.isFinite(numericValue)) return clampIndex(numericValue);

  const middlePoint = indicator.trend[Math.floor(indicator.trend.length / 2)] ?? 0;
  return clampIndex(middlePoint);
}

function isMetricChartable(metric: MetricItem) {
  return metric.unit !== "단계" && metric.trend.every((value) => Number.isFinite(value));
}

function metricDisplayValue(value: number, unit: string) {
  if (unit === "분") return minutesToClock(value);
  if (unit === "%") return `${Math.round(value)}%`;
  if (unit === "지수" || unit === "CAI") return `${Math.round(value)}`;
  if (unit === "ft" || unit === "hPa") return `${Math.round(value)}${unit}`;
  if (unit === "℃") return `${Number(value.toFixed(1))}℃`;
  if (["m/s", "km", "m", "kt", "mm", "초"].includes(unit)) return `${Number(value.toFixed(1))}${unit}`;
  return `${Number(value.toFixed(2))}${unit}`;
}

function clockToMinutes(value = "00:00") {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clockPairToMinutes(value = "00:00 / 12:00") {
  const matches = [...value.matchAll(/(\d{1,2}):(\d{2})/g)].map((match) => Number(match[1]) * 60 + Number(match[2]));
  if (matches.length >= 2) return [matches[0], matches[1]] as const;
  const first = matches[0] ?? 0;
  return [first, first + 720] as const;
}

function minutesToClock(value: number) {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function weeklyTimeValues(baseMinutes: number, step = 7) {
  return WEEK_LABELS.map((_, dayIndex) => baseMinutes + (dayIndex - 2) * step);
}

function dustIndex(level?: string) {
  if (level === "매우나쁨") return 175;
  if (level === "나쁨") return 125;
  if (level === "보통") return 75;
  return 35;
}

function heatStressIndex(temperatureC: number, humidityPercent: number, windSpeedMs: number, wbgtC?: number) {
  const wbgtScore = typeof wbgtC === "number" ? (wbgtC >= 31 ? 92 : wbgtC >= 28 ? 74 : wbgtC >= 25 ? 52 : 22) : 0;
  const thermalScore = clampIndex(temperatureC * 1.7 + humidityPercent * 0.42 - windSpeedMs * 1.6);

  return Math.max(wbgtScore, thermalScore);
}

function getObjectiveIndicators(operation: TheOneOperation): ObjectiveIndicator[] {
  if (operation.type === "coastal" && operation.coastal) {
    const data = operation.coastal;
    const rip = clampIndex(data.waveHeightM * 24 + data.wavePeriodSec * 3.2 + data.currentSpeedKt * 24 + data.windSpeedMs * 2);
    const warningValue = data.waveHeightM >= 3 || data.windSpeedMs >= 14 ? 88 : data.waveHeightM >= 2 || data.windSpeedMs >= 10 ? 64 : 18;
    const fog = clampIndex((data.visibilityKm <= 1 ? 86 : data.visibilityKm <= 3 ? 68 : data.visibilityKm <= 6 ? 42 : 15) + (data.humidityPercent >= 80 ? 12 : 0));
    const marine = clampIndex(data.waveHeightM * 24 + data.windSpeedMs * 4.2 + Math.max(0, 8 - data.visibilityKm) * 7);

    return [
      { label: "이안류 위험지수", value: `${rip}`, level: levelFromIndex(rip), tone: toneFromIndex(rip), description: "파고, 파주기, 조류속도, 풍속을 기준으로 해안 이안류 가능성을 봅니다.", trend: forecastTrend(rip, 18), unit: "지수" },
      { label: "풍랑특보", value: warningValue >= 80 ? "경보" : warningValue >= 60 ? "주의보" : "없음", level: levelFromIndex(warningValue), tone: toneFromIndex(warningValue), description: "풍속과 파고 기준으로 풍랑특보 수준을 표시합니다.", trend: forecastTrend(warningValue, 20), unit: "지수" },
      { label: "해무 위험도", value: `${fog}`, level: levelFromIndex(fog), tone: toneFromIndex(fog), description: "시정과 습도를 기준으로 해상 안개 가능성을 표시합니다.", trend: forecastTrend(fog, 16), unit: "지수" },
      { label: "해상위험지수", value: `${marine}`, level: levelFromIndex(marine), tone: toneFromIndex(marine), description: "파고, 풍속, 시정을 종합해 해상활동 위험도를 표시합니다.", trend: forecastTrend(marine, 16), unit: "지수" },
    ];
  }

  if (operation.type === "ground" && operation.ground) {
    const data = operation.ground;
    const env = operation.groundEnvironment;
    const discomfort = clampIndex(0.81 * data.temperatureC + 0.01 * data.humidityPercent * (0.99 * data.temperatureC - 14.3) + 46.3);
    const apparent = Number((data.temperatureC + 0.04 * data.humidityPercent - data.windSpeedMs * 0.7).toFixed(1));
    const apparentIndex = clampIndex(Math.abs(apparent - 22) * 6);
    const cai = Math.max(dustIndex(env?.pm10Level), dustIndex(env?.pm25Level));
    const fire = clampIndex(data.temperatureC * 1.6 + data.windSpeedMs * 6 - data.humidityPercent * 0.35 + (env?.fireRiskLevel === "높음" ? 20 : env?.fireRiskLevel === "매우높음" ? 32 : 6));
    const heat = heatStressIndex(data.temperatureC, data.humidityPercent, data.windSpeedMs, data.wbgtC);

    return [
      { label: "온열지수", value: `${heat}`, level: levelFromIndex(heat), tone: toneFromIndex(heat), description: "기온, 습도, 풍속, WBGT를 함께 반영한 온열 부담 지표입니다.", trend: forecastTrend(heat, 14), unit: "지수" },
      { label: "불쾌지수", value: `${discomfort}`, level: discomfort >= 80 ? "매우 높음" : discomfort >= 75 ? "높음" : discomfort >= 68 ? "보통" : "낮음", tone: toneFromIndex(discomfort), description: "기온과 습도를 기반으로 체감 불쾌 수준을 표시합니다.", trend: forecastTrend(discomfort, 10), unit: "지수" },
      { label: "체감온도", value: `${apparent}℃`, level: levelFromIndex(apparentIndex), tone: toneFromIndex(apparentIndex), description: "기온, 습도, 풍속을 반영한 실제 체감 온도입니다.", trend: forecastTrend(apparent, 5, -30, 45), unit: "℃" },
      { label: "통합대기환경지수", value: `${cai}`, level: cai >= 150 ? "매우나쁨" : cai >= 100 ? "나쁨" : cai >= 50 ? "보통" : "좋음", tone: cai >= 150 ? "very-high" : cai >= 100 ? "high" : cai >= 50 ? "normal" : "low", description: "미세먼지와 초미세먼지 등 대기질 상태를 종합합니다.", trend: forecastTrend(cai, 22, 0, 200), unit: "CAI" },
      { label: "산불위험지수", value: `${fire}`, level: levelFromIndex(fire), tone: toneFromIndex(fire), description: "기온, 습도, 풍속 기반 산불 발생 가능성을 표시합니다.", trend: forecastTrend(fire, 14), unit: "지수" },
    ];
  }

  if (operation.type === "air" && operation.air) {
    const data = operation.air;
    const env = operation.aviationEnvironment;
    const lowVis = clampIndex(data.visibilityKm <= 1 ? 90 : data.visibilityKm <= 3 ? 72 : data.visibilityKm <= 5 ? 50 : 18);
    const turbulence = clampIndex((data.turbulenceRisk === "강" ? 82 : data.turbulenceRisk === "중" ? 62 : data.turbulenceRisk === "약" ? 35 : 12) + Math.max(0, data.gustSpeedMs - 10) * 2);
    const dewSpread = Math.abs(data.temperatureC - data.dewPointC);
    const icing = clampIndex(data.temperatureC <= 2 && data.humidityPercent >= 75 ? 78 + Math.max(0, 3 - dewSpread) * 5 : data.temperatureC <= 5 && data.humidityPercent >= 70 ? 48 : 12);
    const lightning = clampIndex(env?.lightningRisk === "발생" || env?.thunderstormRisk === "발생" ? 88 : env?.lightningRisk === "가능" || env?.thunderstormRisk === "가능" ? 72 : data.precipitationProbability >= 70 ? 55 : 18);
    const droneOperation = clampIndex(data.windSpeedMs * 5 + data.gustSpeedMs * 3 + Math.max(0, 5 - data.visibilityKm) * 8 + (data.precipitationMm > 0 ? 16 : 0));

    return [
      { label: "드론운용지수", value: `${droneOperation}`, level: levelFromIndex(droneOperation), tone: toneFromIndex(droneOperation), description: "저고도 드론 운용 기준으로 풍속, 돌풍, 강수, 시정을 함께 봅니다.", trend: forecastTrend(droneOperation, 16), unit: "지수" },
      { label: "저시정 위험도", value: `${lowVis}`, level: levelFromIndex(lowVis), tone: toneFromIndex(lowVis), description: "시정거리를 기준으로 항공 시야 제한 수준을 표시합니다.", trend: forecastTrend(lowVis, 18), unit: "지수" },
      { label: "난류·돌풍지수", value: `${turbulence}`, level: levelFromIndex(turbulence), tone: toneFromIndex(turbulence), description: "저고도 난류와 돌풍을 기준으로 드론 안정성을 표시합니다.", trend: forecastTrend(turbulence, 16), unit: "지수" },
      { label: "착빙지수", value: `${icing}`, level: levelFromIndex(icing), tone: toneFromIndex(icing), description: "온도, 습도, 이슬점 차를 기준으로 결빙 가능성을 표시합니다.", trend: forecastTrend(icing, 13), unit: "지수" },
      { label: "낙뢰위험도", value: `${lightning}`, level: levelFromIndex(lightning), tone: toneFromIndex(lightning), description: "낙뢰 또는 뇌우 가능성을 기준으로 즉시 위험성을 표시합니다.", trend: forecastTrend(lightning, 18), unit: "지수" },
    ];
  }

  return [];
}

function objectiveIndicatorIcon(indicator: ObjectiveIndicator, type: OperationType): SimpleIcon {
  if (type === "coastal") {
    if (indicator.label.includes("풍랑")) return Gauge;
    if (indicator.label.includes("해무")) return Eye;
    return Waves;
  }

  if (type === "ground") {
    if (indicator.label.includes("대기")) return Cloud;
    if (indicator.label.includes("산불")) return Zap;
    return Thermometer;
  }

  if (indicator.label.includes("저시정")) return Eye;
  if (indicator.label.includes("낙뢰")) return Zap;
  if (indicator.label.includes("착빙")) return Cloud;
  return Activity;
}

function objectiveMetricCards(operation: TheOneOperation): MetricItem[] {
  return getObjectiveIndicators(operation).map((indicator) => ({
    icon: objectiveIndicatorIcon(indicator, operation.type),
    label: indicator.label,
    value: indicator.value,
    helper: indicator.level,
    unit: indicator.unit,
    trend: indicator.trend,
  }));
}

function getMetricCards(operation: TheOneOperation): MetricItem[] {
  if (operation.type === "coastal" && operation.coastal) {
    const data = operation.coastal;
    const weatherStatus = operation.coastalEnvironment?.weatherStatus ?? "맑음";
    return [
      { icon: Cloud, label: "개황", value: weatherStatus, helper: "기상 상태", unit: "단계", trend: trend(weatherStatus === "맑음" ? 1 : weatherStatus === "흐림" ? 2 : 3, 0.4) },
      { icon: Gauge, label: "기상특보", value: data.weatherAlert, helper: data.weatherAlert === "없음" ? "특보 없음" : "주의 필요", unit: "단계", trend: trend(data.weatherAlert === "없음" ? 1 : 3, 0.5) },
      { icon: Thermometer, label: "기온", value: `${data.temperatureC}℃`, helper: "해상환경", unit: "℃", trend: metricTrend(data.temperatureC, 1.6) },
      { icon: CloudRain, label: "강수확률", value: `${data.precipitationProbability}%`, helper: `${data.precipitationMm}mm`, unit: "%", trend: metricTrend(data.precipitationProbability, 14) },
      { icon: Wind, label: "지상풍", value: `${data.surfaceWindMs}m/s`, helper: data.windDirection, unit: "m/s", trend: metricTrend(data.surfaceWindMs, 1.1) },
      { icon: Wind, label: "상층풍", value: `${data.upperWindSpeedMs}m/s`, helper: data.upperWindDirection, unit: "m/s", trend: metricTrend(data.upperWindSpeedMs, 1.8) },
      { icon: Waves, label: "앞바다 파고", value: `${data.nearshoreWaveHeightM}m`, helper: `${data.wavePeriodSec}초`, unit: "m", trend: metricTrend(data.nearshoreWaveHeightM, 0.35) },
      { icon: Waves, label: "먼바다 파고", value: `${data.offshoreWaveHeightM}m`, helper: data.waveDirection, unit: "m", trend: metricTrend(data.offshoreWaveHeightM, 0.42) },
      { icon: Activity, label: "조류속도", value: `${data.currentSpeedKt}kt`, helper: data.currentDirection, unit: "kt", trend: metricTrend(data.currentSpeedKt, 0.22) },
      { icon: Activity, label: "창조류", value: data.currentDirection, helper: `${data.currentSpeedKt}kt`, unit: "kt", trend: metricTrend(data.currentSpeedKt + 0.15, 0.2) },
      { icon: Activity, label: "낙조류", value: "반전 예상", helper: `${Math.max(0.1, data.currentSpeedKt - 0.1).toFixed(1)}kt`, unit: "kt", trend: metricTrend(Math.max(0.1, data.currentSpeedKt - 0.1), 0.18) },
      { icon: Moon, label: "월광", value: `${data.moonlightPercent}%`, helper: "야간 식별", unit: "%", trend: metricTrend(data.moonlightPercent, 9) },
      { icon: Eye, label: "가시거리", value: `${data.visibilityKm}km`, helper: "식별조건", unit: "km", trend: metricTrend(data.visibilityKm, 1.3) },
      { icon: Gauge, label: "물때", value: data.tideAge, helper: `만조 ${data.highTide}`, unit: "단계", trend: metricTrend(Number.parseInt(data.tideAge, 10) || 4, 1.2) },
      { icon: Gauge, label: "물매", value: `${data.tideRangeM}m`, helper: "조차", unit: "m", trend: metricTrend(data.tideRangeM, 0.6) },
      { icon: Thermometer, label: "해수온도", value: `${data.waterTempC}℃`, helper: "해수면", unit: "℃", trend: metricTrend(data.waterTempC, 0.8) },
      { icon: Waves, label: "파주기", value: `${data.wavePeriodSec}초`, helper: data.waveDirection, unit: "초", trend: metricTrend(data.wavePeriodSec, 0.8) },
      { icon: Gauge, label: "일출", value: data.sunrise, helper: "천문", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.sunrise)) },
      { icon: Gauge, label: "일몰", value: data.sunset, helper: "천문", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.sunset)) },
      { icon: Gauge, label: "BMNT", value: data.bmnt, helper: "아침박명", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.bmnt)) },
      { icon: Gauge, label: "EENT", value: data.eent, helper: "저녁박명", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.eent)) },
      { icon: Moon, label: "월출", value: data.moonrise, helper: "천문", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.moonrise), 16) },
      { icon: Moon, label: "월몰", value: data.moonset, helper: "천문", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.moonset), 16) },
      { icon: Gauge, label: "간조", value: data.lowTide, helper: "1·2차", unit: "분", trend: weeklyTimeValues(clockPairToMinutes(data.lowTide)[0], 12) },
      { icon: Gauge, label: "만조", value: data.highTide, helper: "1·2차", unit: "분", trend: weeklyTimeValues(clockPairToMinutes(data.highTide)[0], 12) },
      ...objectiveMetricCards(operation),
    ];
  }

  if (operation.type === "ground" && operation.ground) {
    const data = operation.ground;
    const env = operation.groundEnvironment;
    return [
      { icon: Cloud, label: "개황", value: env?.weatherStatus ?? "맑음", helper: "기상 상태", unit: "단계", trend: trend(env?.weatherStatus === "맑음" ? 1 : env?.weatherStatus === "흐림" ? 2 : 3, 0.4) },
      { icon: Gauge, label: "기상특보", value: env?.weatherAlert ?? "없음", helper: env?.weatherAlert === "없음" || !env?.weatherAlert ? "특보 없음" : "주의 필요", unit: "단계", trend: trend(env?.weatherAlert === "없음" || !env?.weatherAlert ? 1 : 3, 0.5) },
      { icon: Thermometer, label: "기온", value: `${data.temperatureC}℃`, helper: "인원부담", unit: "℃", trend: metricTrend(data.temperatureC, 2) },
      { icon: Activity, label: "습도", value: `${data.humidityPercent}%`, helper: "체감영향", unit: "%", trend: metricTrend(data.humidityPercent, 8) },
      { icon: CloudRain, label: "강수확률", value: `${data.precipitationProbability}%`, helper: `${data.precipitationMm}mm`, unit: "%", trend: metricTrend(data.precipitationProbability, 16) },
      { icon: CloudRain, label: "강수량", value: `${data.precipitationMm}mm`, helper: "누적", unit: "mm", trend: metricTrend(data.precipitationMm, 4) },
      { icon: Wind, label: "지상풍", value: `${data.surfaceWindMs}m/s`, helper: data.windDirection, unit: "m/s", trend: metricTrend(data.surfaceWindMs, 1.4) },
      { icon: Wind, label: "상층풍", value: `${data.upperWindSpeedMs}m/s`, helper: data.upperWindDirection, unit: "m/s", trend: metricTrend(data.upperWindSpeedMs, 2.1) },
      { icon: Eye, label: "시정", value: `${data.visibilityKm}km`, helper: "관측조건", unit: "km", trend: metricTrend(data.visibilityKm, 1.6) },
      { icon: Cloud, label: "운량", value: `${data.cloudCoverPercent}%`, helper: "기상상태", unit: "%", trend: metricTrend(data.cloudCoverPercent, 12) },
      { icon: Cloud, label: "안개", value: data.fog, helper: "시야제한", unit: "단계", trend: trend(data.fog === "심함" ? 4 : data.fog === "발생" ? 3 : data.fog === "의심" ? 2 : 1, 0.5) },
      { icon: Mountain, label: "지형", value: data.terrain, helper: "이동조건", unit: "지수", trend: trend(data.terrain === "산악" ? 70 : data.terrain === "도심" ? 55 : 35, 8) },
      { icon: Gauge, label: "일출", value: data.sunrise, helper: "천문", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.sunrise)) },
      { icon: Gauge, label: "일몰", value: data.sunset, helper: "천문", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.sunset)) },
      { icon: Gauge, label: "BMNT", value: data.bmnt, helper: "아침박명", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.bmnt)) },
      { icon: Gauge, label: "EENT", value: data.eent, helper: "저녁박명", unit: "분", trend: weeklyTimeValues(clockToMinutes(data.eent)) },
      ...objectiveMetricCards(operation),
    ];
  }

  if (operation.type === "air" && operation.air) {
    const data = operation.air;
    const env = operation.aviationEnvironment;
    return [
      { icon: Cloud, label: "개황", value: env?.weatherStatus ?? "맑음", helper: "항공기상", unit: "단계", trend: trend(env?.weatherStatus === "맑음" ? 1 : env?.weatherStatus === "흐림" ? 2 : 3, 0.4) },
      { icon: Zap, label: "낙뢰", value: env?.lightningRisk ?? "낮음", helper: "즉시위험", unit: "단계", trend: trend(env?.lightningRisk === "발생" ? 4 : env?.lightningRisk === "가능" ? 3 : 1, 0.6) },
      { icon: Wind, label: "평균풍속", value: `${data.windSpeedMs}m/s`, helper: data.windDirection, unit: "m/s", trend: metricTrend(data.windSpeedMs, 1.5) },
      { icon: Zap, label: "순간풍속", value: `${data.gustSpeedMs}m/s`, helper: "돌풍", unit: "m/s", trend: metricTrend(data.gustSpeedMs, 2.3) },
      { icon: CloudRain, label: "강수확률", value: `${data.precipitationProbability}%`, helper: `${data.precipitationMm}mm`, unit: "%", trend: metricTrend(data.precipitationProbability, 15) },
      { icon: Cloud, label: "운고", value: `${data.cloudCeilingFt}ft`, helper: "상공시야", unit: "ft", trend: metricTrend(data.cloudCeilingFt, 420) },
      { icon: Eye, label: "시정", value: `${data.visibilityKm}km`, helper: "영상판독", unit: "km", trend: metricTrend(data.visibilityKm, 1.5) },
      { icon: Activity, label: "난류", value: data.turbulenceRisk, helper: "항로안정", unit: "단계", trend: trend(data.turbulenceRisk === "강" ? 4 : data.turbulenceRisk === "중" ? 3 : data.turbulenceRisk === "약" ? 2 : 1, 0.6) },
      { icon: Gauge, label: "기압", value: `${data.pressureHpa}hPa`, helper: "기상변화", unit: "hPa", trend: metricTrend(data.pressureHpa, 3) },
      { icon: Thermometer, label: "기온", value: `${data.temperatureC}℃`, helper: "장비영향", unit: "℃", trend: metricTrend(data.temperatureC, 2) },
      { icon: Activity, label: "습도", value: `${data.humidityPercent}%`, helper: `이슬점 ${data.dewPointC}℃`, unit: "%", trend: metricTrend(data.humidityPercent, 7) },
      ...objectiveMetricCards(operation),
    ];
  }

  return [];
}

function hydrateStoredOperation(operation: Partial<TheOneOperation>): TheOneOperation | null {
  if (!operation.type) return null;

  const base =
    allOperations.find((item) => item.id === operation.id) ??
    allOperations.find((item) => item.type === operation.type);

  if (!base) return null;

  return {
    ...structuredClone(base),
    id: operation.id ?? base.id,
    name: operation.name ?? base.name,
    area: operation.area ?? base.area,
    datetime: operation.datetime ?? base.datetime,
    imageTone: operation.imageTone ?? base.imageTone,
    center: operation.center ?? base.center,
  };
}

function mergeOperationUpdate(operation: TheOneOperation, update: Partial<TheOneOperation>): TheOneOperation {
  return {
    ...operation,
    ...update,
    coastal: operation.coastal || update.coastal ? { ...operation.coastal, ...update.coastal } as TheOneOperation["coastal"] : undefined,
    coastalEnvironment:
      operation.coastalEnvironment || update.coastalEnvironment
        ? { ...operation.coastalEnvironment, ...update.coastalEnvironment } as TheOneOperation["coastalEnvironment"]
        : undefined,
    ground: operation.ground || update.ground ? { ...operation.ground, ...update.ground } as TheOneOperation["ground"] : undefined,
    groundEnvironment:
      operation.groundEnvironment || update.groundEnvironment
        ? { ...operation.groundEnvironment, ...update.groundEnvironment } as TheOneOperation["groundEnvironment"]
        : undefined,
    air: operation.air || update.air ? { ...operation.air, ...update.air } as TheOneOperation["air"] : undefined,
    aviationEnvironment:
      operation.aviationEnvironment || update.aviationEnvironment
        ? { ...operation.aviationEnvironment, ...update.aviationEnvironment } as TheOneOperation["aviationEnvironment"]
        : undefined,
  };
}

function applyWeatherCacheUpdates(operations: TheOneOperation[], payload: WeatherCachePayload) {
  const updates = Array.isArray(payload.operationUpdates) ? payload.operationUpdates : [];
  if (updates.length === 0) return operations;

  const updateMap = new Map(updates.filter((update) => update.id).map((update) => [update.id, update]));

  return operations.map((operation) => {
    const update = updateMap.get(operation.id);
    return update ? mergeOperationUpdate(operation, update) : operation;
  });
}

function loadStoredOperations() {
  if (typeof window === "undefined") return defaultOperations;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultOperations;

  try {
    const parsed = JSON.parse(stored) as TheOneOperation[];
    if (!Array.isArray(parsed)) return defaultOperations;

    return parsed
      .map((operation) => hydrateStoredOperation(operation))
      .filter((operation): operation is TheOneOperation => Boolean(operation));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return defaultOperations;
  }
}

function fallbackLiveAlerts(activeType: OperationType): LiveAlert[] {
  const timestamp = new Date().toISOString();
  const common: LiveAlert[] = [
    {
      id: `system-${activeType}`,
      type: "system",
      level: "info",
      title: "기상특보 확인",
      message: "현재 표시할 공식 특보가 없습니다.",
      source: "기상청",
      timestamp,
    },
  ];

  if (activeType === "coastal") {
    return [
      {
        id: "coastal-watch-wave",
        type: "coastal",
        level: "watch",
        title: "해상 변동 감시",
        message: "파고·조석·시정 변동이 큰 항구는 실시간 탭에서 윈디와 기상청 지도를 함께 확인하세요.",
        source: "해양기상",
        timestamp,
      },
      ...common,
    ];
  }

  if (activeType === "ground") {
    return [
      {
        id: "ground-watch-heat",
        type: "ground",
        level: "watch",
        title: "온열지수 확인",
        message: "고온·고습 조건에서는 온열지수와 체감온도 카드를 우선 확인하세요.",
        source: "육상기상",
        timestamp,
      },
      ...common,
    ];
  }

  return [
    {
      id: "air-watch-drone",
      type: "air",
      level: "watch",
      title: "드론 운용 기상",
      message: "돌풍·저시정·낙뢰 변동은 드론 운용 제한 요소로 실시간 확인이 필요합니다.",
      source: "공중기상",
      timestamp,
    },
    ...common,
  ];
}

function loadAlertHistory() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ALERT_HISTORY_STORAGE_KEY) ?? "[]") as LiveAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(ALERT_HISTORY_STORAGE_KEY);
    return [];
  }
}

function mergeAlertHistory(current: LiveAlert[], incoming: LiveAlert[]) {
  const map = new Map<string, LiveAlert>();

  [...incoming, ...current].forEach((alert) => {
    map.set(alert.id, alert);
  });

  return [...map.values()]
    .sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime())
    .slice(0, 30);
}

function useLiveAlerts(activeType: OperationType) {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [history, setHistory] = useState<LiveAlert[]>([]);

  useEffect(() => {
    queueMicrotask(() => setHistory(loadAlertHistory()));
  }, []);

  useEffect(() => {
    let isActive = true;

    async function refreshAlerts() {
      let nextAlerts = fallbackLiveAlerts(activeType);

      try {
        const response = await fetch(`${BASE_PATH}/data/weather-cache.json?ts=${Date.now()}`, { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as WeatherCachePayload;
          const cachedAlerts = Array.isArray(payload.alerts) ? payload.alerts : [];
          const filtered = cachedAlerts.filter((alert) => alert.type === "system" || alert.type === activeType);
          if (filtered.length > 0) nextAlerts = filtered;
        }
      } catch {
        nextAlerts = fallbackLiveAlerts(activeType);
      }

      if (!isActive) return;

      setAlerts(nextAlerts);
      setHistory((current) => {
        const merged = mergeAlertHistory(current, nextAlerts);
        window.localStorage.setItem(ALERT_HISTORY_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    }

    refreshAlerts();
    const timer = window.setInterval(refreshAlerts, 60_000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [activeType]);

  return { alerts, history };
}

export function TheOneApp() {
  const [operations, setOperations] = useState<TheOneOperation[]>([]);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [activeType, setActiveType] = useState<OperationType>("coastal");
  const [view, setView] = useState<AppView>("splash");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("summary");
  const [selectedId, setSelectedId] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const storedOperations = loadStoredOperations();
      setOperations(storedOperations);
      setActiveType(storedOperations[0]?.type ?? "coastal");
      setSelectedId(storedOperations[0]?.id ?? defaultOperations[0].id);
      setHasLoadedStorage(true);
    });
  }, []);

  useEffect(() => {
    if (hasLoadedStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
    }
  }, [hasLoadedStorage, operations]);

  useEffect(() => {
    if (!hasLoadedStorage) return;

    let isActive = true;

    async function refreshOperationCache() {
      try {
        const response = await fetch(`${BASE_PATH}/data/weather-cache.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as WeatherCachePayload;
        if (!isActive) return;

        setOperations((current) => applyWeatherCacheUpdates(current, payload));
      } catch {
        // 캐시 호출 실패 시 기존 화면 데이터를 유지합니다.
      }
    }

    refreshOperationCache();
    const timer = window.setInterval(refreshOperationCache, 60_000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [hasLoadedStorage]);

  const activeOperations = useMemo(
    () => operations.filter((operation) => operation.type === activeType),
    [activeType, operations],
  );

  const selectedOperation = useMemo(() => {
    return activeOperations.find((operation) => operation.id === selectedId) ?? activeOperations[0] ?? operations[0];
  }, [activeOperations, operations, selectedId]);

  const config = operationConfigs[activeType];

  function handleModeSelect(type: OperationType) {
    const firstOperation = operations.find((operation) => operation.type === type);
    setActiveType(type);
    setSelectedId(firstOperation?.id ?? "");
    setAnalysisTab("summary");
    setView("dashboard");
  }

  function handleSelectOperation(operation: TheOneOperation, nextView: AppView = "detail") {
    setActiveType(operation.type);
    setSelectedId(operation.id);
    setAnalysisTab("summary");
    setView(nextView);
  }

  function handleAddOperation(operation: TheOneOperation) {
    const nextOperation = cloneCatalogOperation(operation);
    setOperations((current) => [nextOperation, ...current.filter((item) => item.id !== nextOperation.id)]);
    setSelectedId(nextOperation.id);
    setActiveType(nextOperation.type);
    setCatalogQuery("");
    setAnalysisTab("summary");
    setView("dashboard");
  }

  function handleReset() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    setOperations([]);
    setActiveType("coastal");
    setSelectedId("");
    setCatalogQuery("");
    setAnalysisTab("summary");
    setView("dashboard");
  }

  return (
    <div className={cx("one-app", `theme-${config.theme}`)}>
      {view !== "splash" && (
        <AppHeader
          config={config}
          showBack={view === "detail" || view === "analysis"}
          onBack={() => setView("dashboard")}
          onMode={() => setView("mode")}
        />
      )}
      {view !== "splash" && <LiveAlertTicker activeType={activeType} />}
      <main className={cx("one-main", view === "mode" && "is-centered", view === "splash" && "is-splash")}>
        {view === "splash" && <SplashScreen onEnter={() => setView("mode")} />}
        {view === "mode" && <ModeSelect activeType={activeType} onSelect={handleModeSelect} onSettings={() => setView("settings")} />}
        {view === "dashboard" && (
          <DashboardScreen
            activeType={activeType}
            operations={activeOperations}
            selectedOperation={selectedOperation}
            onTypeChange={handleModeSelect}
            onAdd={() => setView("add")}
            onSelect={handleSelectOperation}
          />
        )}
        {view === "list" && <OperationListScreen activeType={activeType} operations={activeOperations} onSelect={handleSelectOperation} onAdd={() => setView("add")} />}
        {view === "add" && (
          <AddOperationScreen
            activeType={activeType}
            operations={operations}
            query={catalogQuery}
            onQueryChange={setCatalogQuery}
            onTypeChange={setActiveType}
            onAdd={handleAddOperation}
          />
        )}
        {view === "detail" && (
          selectedOperation ? (
            <DetailScreen operation={selectedOperation} />
          ) : (
            <EmptyOperationState type={activeType} onAdd={() => setView("add")} />
          )
        )}
        {view === "analysis" && (
          selectedOperation ? (
            <AnalysisScreen
              operation={selectedOperation}
              tab={analysisTab}
              onTabChange={setAnalysisTab}
            />
          ) : (
            <EmptyOperationState type={activeType} onAdd={() => setView("add")} />
          )
        )}
        {view === "settings" && <SettingsScreen operations={operations} onReset={handleReset} />}
      </main>
      {view !== "mode" && view !== "splash" && <BottomNavigation activeView={view} onNavigate={setView} />}
    </div>
  );
}

function SplashScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <button type="button" className="splash-screen" onClick={onEnter} aria-label="시작 화면">
      <img src={assetUrl("baekryong-login.svg")} alt="백룡 작전기상 판단체계" />
      <span className="splash-prompt">
        <em>화면을 클릭하세요</em>
        <b />
      </span>
    </button>
  );
}

function AppHeader({
  config,
  showBack,
  onBack,
  onMode,
}: {
  config: (typeof operationConfigs)[OperationType];
  showBack: boolean;
  onBack: () => void;
  onMode: () => void;
}) {
  return (
    <header className="app-header">
      <button type="button" className="header-button" onClick={showBack ? onBack : onMode} aria-label={showBack ? "뒤로" : "메뉴"}>
        {showBack ? <ArrowLeft size={22} /> : <Menu size={22} />}
      </button>
      <div className="header-title">
        <strong>{config.title}</strong>
      </div>
      <img src={assetUrl("22.svg")} alt="" className="header-mark" />
    </header>
  );
}

function LiveAlertTicker({ activeType }: { activeType: OperationType }) {
  const [isOpen, setIsOpen] = useState(false);
  const { alerts, history } = useLiveAlerts(activeType);
  const visibleAlerts = alerts.length > 0 ? alerts : fallbackLiveAlerts(activeType);
  const leadAlert = visibleAlerts[0];

  return (
    <section className="alert-ticker" aria-live="polite">
      <div className="alert-ticker-strip">
        <span className={cx("alert-dot", `is-${leadAlert?.level ?? "info"}`)} />
        <div className="alert-ticker-summary">
          <strong>{leadAlert?.title ?? "기상특보"}</strong>
          <em>{visibleAlerts.length}건</em>
        </div>
        <button type="button" onClick={() => setIsOpen((current) => !current)}>
          기록
        </button>
      </div>
      <div className="alert-chip-list">
        {visibleAlerts.slice(0, 3).map((alert) => (
          <article key={`${alert.id}-chip`} className={cx("alert-chip", `is-${alert.level}`)}>
            <span>{alert.source}</span>
            <strong>{alert.title}</strong>
            <p>{alert.message}</p>
          </article>
        ))}
      </div>
      {isOpen && (
        <div className="alert-history-panel">
          {(history.length > 0 ? history : visibleAlerts).map((alert) => (
            <article key={`${alert.id}-${alert.timestamp}`} className={cx("alert-history-item", `is-${alert.level}`)}>
              <span>{alert.source}</span>
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
              <time>{new Date(alert.timestamp).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ModeSelect({
  activeType,
  onSelect,
  onSettings,
}: {
  activeType: OperationType;
  onSelect: (type: OperationType) => void;
  onSettings: () => void;
}) {
  return (
    <section className="mode-screen">
      <div className="mode-list">
        {OPERATION_TYPES.map((type) => {
          const config = operationConfigs[type];
          return (
            <button
              key={type}
              type="button"
              className={cx("mode-card", `mode-${config.theme}`, activeType === type && "is-active")}
              onClick={() => onSelect(type)}
            >
              <span className="mode-icon">
                <ModeMenuIcon type={type} />
              </span>
              <strong>{config.title}</strong>
            </button>
          );
        })}
        <button type="button" className="mode-card mode-settings" onClick={onSettings}>
          <span className="mode-icon">
            <Settings size={50} strokeWidth={1.8} />
          </span>
          <strong>설정변경</strong>
        </button>
      </div>
    </section>
  );
}

function DashboardScreen({
  activeType,
  operations,
  selectedOperation,
  onTypeChange,
  onAdd,
  onSelect,
}: {
  activeType: OperationType;
  operations: TheOneOperation[];
  selectedOperation?: TheOneOperation;
  onTypeChange: (type: OperationType) => void;
  onAdd: () => void;
  onSelect: (operation: TheOneOperation, nextView?: AppView) => void;
}) {
  const [dashboardTab, setDashboardTab] = useState<AnalysisTab>("summary");

  return (
    <div className="screen-stack">
      <ModePills activeType={activeType} onTypeChange={onTypeChange} />
      <div className="dashboard-section-head">
        <h2>지역 목록</h2>
        <button type="button" className="round-add-button" aria-label="지역 추가" onClick={onAdd}>
          <Plus size={20} />
        </button>
      </div>
      <div className="operation-list region-rail">
        {operations.map((operation) => (
          <OperationCard
            key={operation.id}
            operation={operation}
            compact
            selected={operation.id === selectedOperation?.id}
            onClick={() => onSelect(operation, "dashboard")}
          />
        ))}
      </div>
      {selectedOperation ? (
        <OperationDetailTabs operation={selectedOperation} tab={dashboardTab} onTabChange={setDashboardTab} />
      ) : (
        <EmptyOperationState type={activeType} onAdd={onAdd} />
      )}
    </div>
  );
}

function EmptyOperationState({ type, onAdd }: { type: OperationType; onAdd: () => void }) {
  const config = operationConfigs[type];

  return (
    <section className="empty-state-card">
      <span className="empty-state-icon">
        <OperationTypeIcon type={type} size={30} />
      </span>
      <div>
        <strong>등록된 지역이 없습니다</strong>
        <p>{config.title}에 사용할 지역을 먼저 추가해 주세요.</p>
      </div>
      <button type="button" className="primary-action" onClick={onAdd}>
        <Plus size={18} />
        지역 추가
      </button>
    </section>
  );
}

function ModePills({ activeType, onTypeChange }: { activeType: OperationType; onTypeChange: (type: OperationType) => void }) {
  return (
    <div className="mode-pills" aria-label="작전 분류">
      {OPERATION_TYPES.map((type) => (
        <button key={type} type="button" className={activeType === type ? "is-active" : ""} onClick={() => onTypeChange(type)}>
          {operationConfigs[type].shortTitle}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({
  title,
  actionLabel,
  iconOnly,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  iconOnly?: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {actionLabel && (
        <button
          type="button"
          className={cx(iconOnly && "is-icon-only")}
          aria-label={actionLabel}
          onClick={() => onAction?.()}
        >
          <Plus size={17} />
          {!iconOnly && actionLabel}
        </button>
      )}
    </div>
  );
}

function OperationCard({
  operation,
  selected,
  compact,
  onClick,
}: {
  operation: TheOneOperation;
  selected?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={cx("operation-card", compact && "is-compact", selected && "is-selected")} onClick={onClick}>
      <span className="operation-symbol">
        <OperationTypeIcon type={operation.type} size={compact ? 20 : 23} />
      </span>
      <span className="operation-copy">
        <strong>{operation.name}</strong>
        <em>{operation.area}</em>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}

function weeklyMetricValues(metric: MetricItem, metricIndex: number) {
  if (metric.unit === "분") {
    return metric.trend.map((value) => Number(value.toFixed(1)));
  }

  return WEEK_LABELS.map((_, dayIndex) => {
    const base = metric.trend[dayIndex % metric.trend.length] ?? 0;
    const direction = metricIndex % 2 === 0 ? 0.22 : -0.14;
    const adjusted = base + (dayIndex - 2) * direction;
    return Number((metric.unit === "℃" ? adjusted : Math.max(0, adjusted)).toFixed(1));
  });
}

function categoricalForecastValues(metric: MetricItem, labels: string[]) {
  const weatherCycle = ["맑음", "흐림", "비", "안개", "눈"];
  const currentWeatherIndex = weatherCycle.indexOf(metric.value);

  return labels.map((_, index) => {
    if (metric.label === "개황" && currentWeatherIndex >= 0) return weatherCycle[(currentWeatherIndex + (index > 3 ? 1 : 0)) % weatherCycle.length];
    if (metric.label === "물때") {
      const baseTideAge = Number.parseInt(metric.value, 10);
      if (Number.isFinite(baseTideAge)) return `${((baseTideAge + index - 1 + 15) % 15) + 1}물`;
    }
    if (metric.label === "기상특보" && metric.value !== "없음") return index < 3 ? metric.value : "해제 예상";
    return metric.value;
  });
}

function isDailyFixedMetric(metric: MetricItem) {
  return ["일출", "일몰", "월출", "월몰", "BMNT", "EENT"].includes(metric.label);
}

function isTideMetric(metric: MetricItem) {
  return ["간조", "만조"].includes(metric.label);
}

function shouldRenderChart(metric: MetricItem, mode: "hourly" | "weekly") {
  if (!isMetricChartable(metric)) return false;
  if (mode === "hourly" && (isDailyFixedMetric(metric) || isTideMetric(metric))) return false;
  return true;
}

function MetricCarousel({ operation, forecastMode = "hourly" }: { operation: TheOneOperation; forecastMode?: "hourly" | "weekly" }) {
  const metrics = useMemo(() => getMetricCards(operation), [operation]);
  const [activeMetricLabel, setActiveMetricLabel] = useState(metrics[0]?.label ?? "");
  const defaultMetric = metrics[0];
  const selectedMetric = metrics.find((metric) => metric.label === activeMetricLabel);
  const activeMetric = selectedMetric ?? defaultMetric;
  const activeMetricIndex = Math.max(0, metrics.findIndex((metric) => metric.label === activeMetric?.label));
  const labels = forecastMode === "weekly" ? WEEK_LABELS : FORECAST_LABELS;
  const values = activeMetric ? (forecastMode === "weekly" ? weeklyMetricValues(activeMetric, activeMetricIndex) : activeMetric.trend) : [];

  return (
    <section className="metric-panel">
      <div className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button
              type="button"
              className={cx("metric-card", activeMetric?.label === metric.label && "is-active")}
              key={metric.label}
              onClick={() => setActiveMetricLabel(metric.label)}
            >
              <Icon size={20} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <em>{metric.helper}</em>
            </button>
          );
        })}
      </div>
      {activeMetric && <MetricTimePanel metric={activeMetric} labels={labels} values={values} mode={forecastMode} />}
    </section>
  );
}

function MetricTimePanel({
  metric,
  labels,
  values,
  mode,
}: {
  metric: MetricItem;
  labels: string[];
  values: number[];
  mode: "hourly" | "weekly";
}) {
  const chartable = shouldRenderChart(metric, mode);

  return (
    <section className="metric-time-card">
      <div className="metric-time-head">
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
        <em>{metric.helper}</em>
      </div>
      {mode === "weekly" && isTideMetric(metric) ? (
        <TideWeeklyPanel metric={metric} />
      ) : null}
      {mode === "weekly" && isTideMetric(metric) ? null : chartable ? (
        <>
          <LineChart values={values} labels={labels} unit={metric.unit} />
          <div className="time-value-strip">
            {values.map((value, index) => (
              <span key={`${metric.label}-${labels[index]}`}>
                <em>{labels[index]}</em>
                <b>{metricDisplayValue(value, metric.unit)}</b>
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="metric-static-panel">
          <strong>{metric.value}</strong>
          <span>{metric.helper}</span>
          {mode === "weekly" && metric.unit === "단계" && (
            <div className="time-value-strip is-categorical">
              {categoricalForecastValues(metric, labels).map((value, index) => (
                <span key={`${metric.label}-${labels[index]}`}>
                  <em>{labels[index]}</em>
                  <b>{value}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TideWeeklyPanel({ metric }: { metric: MetricItem }) {
  const [firstBase, secondBase] = clockPairToMinutes(metric.value);
  const firstValues = weeklyTimeValues(firstBase, 12);
  const secondValues = weeklyTimeValues(secondBase, 12);

  return (
    <div className="tide-weekly-grid">
      <div className="tide-weekly-title">
        <span>{metric.label} 주간예측</span>
        <strong>1차·2차 기준시각</strong>
      </div>
      {[
        { label: "1차", values: firstValues },
        { label: "2차", values: secondValues },
      ].map((series) => (
        <article key={series.label} className="tide-weekly-card">
          <div className="tide-weekly-head">
            <span>{series.label}</span>
            <div>
              <em>{metric.label} 기준</em>
              <strong>{minutesToClock(series.values[2] ?? series.values[0])}</strong>
            </div>
          </div>
          <LineChart values={series.values} labels={WEEK_LABELS} unit="분" compact />
          <div className="time-value-strip">
            {series.values.map((value, index) => (
              <span key={`${metric.label}-${series.label}-${WEEK_LABELS[index]}`}>
                <em>{WEEK_LABELS[index]}</em>
                <b>{minutesToClock(value)}</b>
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function OperationListScreen({
  activeType,
  operations,
  onSelect,
  onAdd,
}: {
  activeType: OperationType;
  operations: TheOneOperation[];
  onSelect: (operation: TheOneOperation, nextView?: AppView) => void;
  onAdd: () => void;
}) {
  return (
    <div className="screen-stack">
      <SectionTitle title="지역 목록" actionLabel="추가" iconOnly onAction={onAdd} />
      {operations.length > 0 ? (
        <div className="operation-list">
          {operations.map((operation) => (
            <OperationCard key={operation.id} operation={operation} onClick={() => onSelect(operation, "dashboard")} />
          ))}
        </div>
      ) : (
        <EmptyOperationState type={activeType} onAdd={onAdd} />
      )}
    </div>
  );
}

function AddOperationScreen({
  activeType,
  operations,
  query,
  onQueryChange,
  onTypeChange,
  onAdd,
}: {
  activeType: OperationType;
  operations: TheOneOperation[];
  query: string;
  onQueryChange: (value: string) => void;
  onTypeChange: (type: OperationType) => void;
  onAdd: (operation: TheOneOperation) => void;
}) {
  const [pendingOperation, setPendingOperation] = useState<TheOneOperation | null>(null);
  const selectedIds = new Set(operations.map((operation) => operation.id));
  const candidates = allOperations
    .filter((operation) => operation.type === activeType)
    .filter((operation) => `${operation.name} ${operation.area}`.includes(query.trim()));
  const groupedCandidates = groupCatalogOperations(candidates);

  function handleConfirmAdd() {
    if (!pendingOperation) return;
    onAdd(pendingOperation);
    setPendingOperation(null);
  }

  return (
    <div className="screen-stack">
      <SectionTitle title="지역 선택" />
      <ModePills activeType={activeType} onTypeChange={onTypeChange} />
      <label className="catalog-search">
        <span>사전 등록 지역 검색</span>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="지역명 또는 권역명 검색" />
      </label>
      <div className="catalog-group-list">
        {groupedCandidates.map((group, index) => (
          <details key={group.name} className="catalog-group" open={query.trim().length > 0 || index < 4}>
            <summary>
              <span>{group.name}</span>
              <em>{group.items.length}</em>
            </summary>
            <div className="operation-list">
              {group.items.map((operation) => (
                <OperationCard
                  key={operation.id}
                  operation={operation}
                  selected={selectedIds.has(operation.id) || pendingOperation?.id === operation.id}
                  onClick={() => {
                    if (!selectedIds.has(operation.id)) setPendingOperation(operation);
                  }}
                />
              ))}
            </div>
          </details>
        ))}
        {candidates.length === 0 && (
          <section className="panel-card">
            <h3>검색 결과 없음</h3>
            <p>다른 지역명이나 관측지점명으로 다시 검색해 주세요.</p>
          </section>
        )}
      </div>
      {pendingOperation && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setPendingOperation(null)}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="add-confirm-title" onClick={(event) => event.stopPropagation()}>
            <span>지역 반영</span>
            <h3 id="add-confirm-title">{pendingOperation.name}</h3>
            <p>이 지역을 메인 화면에 반영할까요?</p>
            <div className="confirm-actions">
              <button type="button" className="secondary-action" onClick={() => setPendingOperation(null)}>
                취소
              </button>
              <button type="button" className="primary-action" onClick={handleConfirmAdd}>
                반영
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function groupCatalogOperations(candidates: TheOneOperation[]): CatalogGroup[] {
  const groups = new Map<string, TheOneOperation[]>();

  candidates.forEach((operation) => {
    const groupName = operation.area.split("·")[0]?.trim() || operationConfigs[operation.type].shortTitle;
    const current = groups.get(groupName) ?? [];
    current.push(operation);
    groups.set(groupName, current);
  });

  return [...groups.entries()]
    .map(([name, items]) => ({
      name,
      items: items.sort((first, second) => first.name.localeCompare(second.name, "ko")),
    }))
    .sort((first, second) => first.name.localeCompare(second.name, "ko"));
}

function DetailScreen({ operation }: { operation: TheOneOperation }) {
  return (
    <div className="screen-stack">
      <div className="page-heading">
        <span>{operation.area}</span>
        <h2>{operation.name}</h2>
        <em>{operation.datetime}</em>
      </div>
      <MetricCarousel operation={operation} />
      {operation.type === "air" && operation.air && <AltitudeLayersCard operation={operation} />}
    </div>
  );
}

function AnalysisScreen({
  operation,
  tab,
  onTabChange,
}: {
  operation: TheOneOperation;
  tab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
}) {
  return (
    <div className="screen-stack">
      <div className="page-heading">
        <span>{operation.area}</span>
        <h2>{operation.name}</h2>
        <em>{operation.datetime}</em>
      </div>
      <OperationDetailTabs operation={operation} tab={tab} onTabChange={onTabChange} />
    </div>
  );
}

function OperationDetailTabs({
  operation,
  tab,
  onTabChange,
}: {
  operation: TheOneOperation;
  tab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
}) {
  const indicators = useMemo(() => getObjectiveIndicators(operation), [operation]);

  return (
    <section className="detail-tabs">
      <div className="tab-row" aria-label="상세 메뉴">
        {[
          ["summary", "개황"],
          ["live", "실시간"],
          ["week", "주간예측"],
          ["map", "AI 브리핑"],
        ].map(([key, label]) => (
          <button key={key} type="button" className={tab === key ? "is-active" : ""} onClick={() => onTabChange(key as AnalysisTab)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "summary" && (
        <div className="screen-stack">
          <MetricCarousel operation={operation} />
        </div>
      )}
      {tab === "live" && <LiveMapPanel operation={operation} />}
      {tab === "week" && <WeeklyForecastPanel operation={operation} />}
      {tab === "map" && <AiBriefingPanel operation={operation} indicators={indicators} />}
    </section>
  );
}

function windyEmbedUrl(operation: TheOneOperation) {
  const [lat, lon] = operation.center ?? [36.5, 126.5];
  const overlay = operation.type === "coastal" ? "waves" : operation.type === "air" ? "wind" : "rain";
  const zoom = operation.type === "coastal" ? "7" : "8";
  const params = new URLSearchParams({
    lat: `${lat}`,
    lon: `${lon}`,
    detailLat: `${lat}`,
    detailLon: `${lon}`,
    zoom,
    level: "surface",
    overlay,
    product: "ecmwf",
    marker: "true",
    message: "true",
    calendar: "now",
    type: "map",
    location: "coordinates",
    metricWind: "m/s",
    metricTemp: "°C",
  });

  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

function windyOpenUrl(operation: TheOneOperation) {
  const [lat, lon] = operation.center ?? [36.5, 126.5];
  const zoom = operation.type === "coastal" ? 7 : 8;

  return `https://www.windy.com/?${lat},${lon},${zoom}`;
}

function kmaMapUrl(operation: TheOneOperation) {
  return operation.type === "coastal" ? KMA_MARINE_MAP_URL : KMA_WEATHER_MAP_URL;
}

function LiveMapPanel({ operation }: { operation: TheOneOperation }) {
  const primaryKmaUrl = kmaMapUrl(operation);
  const quickLinks = [
    { label: "윈디", helper: "파고·바람·강수", href: windyOpenUrl(operation), icon: operation.type === "coastal" ? Waves : Wind },
    { label: operation.type === "coastal" ? "해양기상" : "기상청 지도", helper: operation.type === "coastal" ? "특보·관측·CCTV" : "레이더·특보·관측", href: primaryKmaUrl, icon: Cloud },
    { label: "관측 확인", helper: operation.type === "coastal" ? "항구·해수욕장" : "지역 관측망", href: KMA_WEATHER_MAP_URL, icon: Eye },
  ];

  return (
    <section className="live-map-stack">
      <article className="live-map-card">
        <div className="live-map-head">
          <span>윈디</span>
          <a href={windyOpenUrl(operation)} target="_blank" rel="noreferrer">새창</a>
        </div>
        <div className="live-map-frame is-windy">
          <iframe src={windyEmbedUrl(operation)} title={`${operation.name} 윈디 지도`} loading="lazy" allowFullScreen />
        </div>
      </article>
      <article className="live-map-card">
        <div className="live-map-head">
          <span>{operation.type === "coastal" ? "기상청 해양기상" : "기상청 지도"}</span>
          <a href={primaryKmaUrl} target="_blank" rel="noreferrer">열기</a>
        </div>
        <div className="live-map-frame is-kma">
          <iframe src={primaryKmaUrl} title={`${operation.name} 기상청 지도`} loading="lazy" />
        </div>
      </article>
      <div className="live-action-grid">
        {quickLinks.map((link) => {
          const Icon = link.icon;

          return (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="live-action-card">
              <Icon size={19} />
              <span>{link.label}</span>
              <em>{link.helper}</em>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function WeeklyForecastPanel({ operation }: { operation: TheOneOperation }) {
  return (
    <section className="weekly-panel">
      <MetricCarousel operation={operation} forecastMode="weekly" />
    </section>
  );
}

function generateAiBriefing(operation: TheOneOperation, indicators: ObjectiveIndicator[]) {
  const primary = indicators
    .map((indicator) => ({ ...indicator, gauge: indicatorGauge(indicator) }))
    .sort((first, second) => second.gauge - first.gauge)[0];
  const bullets: string[] = [];

  if (operation.type === "coastal" && operation.coastal) {
    const data = operation.coastal;
    bullets.push(`파고 ${data.waveHeightM}m, 풍속 ${data.windSpeedMs}m/s, 시정 ${data.visibilityKm}km 기준으로 해상 상태를 확인했습니다.`);
    bullets.push(data.weatherAlert === "없음" ? "현재 해상 기상특보는 확인되지 않습니다." : `${data.weatherAlert}가 있어 해상 활동 전 추가 확인이 필요합니다.`);
    if (data.visibilityKm <= 3) bullets.push("시정이 낮아 육안 관측과 영상 판독 여건이 제한될 수 있습니다.");
    if (data.moonlightPercent <= 25) bullets.push(`월광 ${data.moonlightPercent}%로 야간 식별 조건이 낮은 편입니다.`);
  }

  if (operation.type === "ground" && operation.ground) {
    const data = operation.ground;
    const env = operation.groundEnvironment;
    bullets.push(`기온 ${data.temperatureC}℃, 습도 ${data.humidityPercent}%, 시정 ${data.visibilityKm}km 기준으로 육상 기상 상태를 확인했습니다.`);
    if (env?.weatherAlert && env.weatherAlert !== "없음") bullets.push(`${env.weatherAlert}가 있어 야외 활동 전 주의가 필요합니다.`);
    if (data.humidityPercent >= 75 || data.temperatureC >= 30) bullets.push("고온·고습 조건으로 체감 부담과 피로 누적 가능성이 있습니다.");
    if (env?.fireRiskLevel === "높음" || env?.fireRiskLevel === "매우높음") bullets.push(`산불위험등급이 ${env.fireRiskLevel}으로 표시되어 건조·강풍 여부를 같이 확인해야 합니다.`);
  }

  if (operation.type === "air" && operation.air) {
    const data = operation.air;
    const env = operation.aviationEnvironment;
    bullets.push(`드론 기준 평균풍속 ${data.windSpeedMs}m/s, 순간풍속 ${data.gustSpeedMs}m/s, 운고 ${data.cloudCeilingFt}ft, 시정 ${data.visibilityKm}km 기준입니다.`);
    if (env?.lightningRisk && !["없음", "낮음"].includes(env.lightningRisk)) bullets.push(`낙뢰위험이 ${env.lightningRisk} 단계로 표시되어 드론 운용 전 즉시 위험기상 확인이 필요합니다.`);
    if (data.cloudCeilingFt <= 1200) bullets.push("운고가 낮아 저고도 드론 운용과 영상 획득 여건이 제한될 수 있습니다.");
    if (data.gustSpeedMs >= 14) bullets.push("돌풍 값이 높아 기체 자세 안정성과 자동복귀 여유를 확인해야 합니다.");
  }

  return {
    title: primary ? `${primary.label} ${primary.level}` : "기상 상태 확인",
    summary: primary
      ? `${operation.name}은 현재 ${primary.label}가 ${primary.level} 수준으로 표시됩니다.`
      : `${operation.name}의 주요 관측값을 기준으로 브리핑을 구성했습니다.`,
    bullets: bullets.slice(0, 4),
  };
}

function AiBriefingPanel({ operation, indicators }: { operation: TheOneOperation; indicators: ObjectiveIndicator[] }) {
  const briefing = generateAiBriefing(operation, indicators);

  return (
    <section className="ai-briefing-panel">
      <BarChart3 size={28} strokeWidth={1.8} />
      <span>AI 브리핑</span>
      <strong>{briefing.title}</strong>
      <p>{briefing.summary}</p>
      <div className="briefing-list">
        {briefing.bullets.map((item) => (
          <em key={item}>{item}</em>
        ))}
      </div>
    </section>
  );
}

function LineChart({
  values,
  labels,
  unit,
  compact,
}: {
  values: number[];
  labels: string[];
  unit: string;
  compact?: boolean;
}) {
  const safeValues = values.length > 0 ? values.map((value) => (Number.isFinite(value) ? value : 0)) : [0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = Math.max(1, max - min);
  const paddedMin = min - range * 0.18;
  const paddedMax = max + range * 0.18;
  const paddedRange = Math.max(1, paddedMax - paddedMin);
  const points = safeValues.map((value, index) => {
    const x = 30 + (index / Math.max(1, safeValues.length - 1)) * 260;
    const y = 106 - ((value - paddedMin) / paddedRange) * 76;
    return { x, y, value };
  });
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M${points[0]?.x ?? 30},116 L${path} L${points.at(-1)?.x ?? 290},116 Z`;

  return (
    <div className={cx("line-chart", compact && "is-compact")}>
      <svg viewBox="0 0 320 142" role="img" aria-label="시간별 선형 그래프">
        <path d="M30 24H290M30 52H290M30 80H290M30 108H290" className="chart-grid" />
        {!compact && (
          <>
            <text x="18" y="29" className="chart-scale-label">{metricDisplayValue(max, unit)}</text>
            <text x="18" y="112" className="chart-scale-label">{metricDisplayValue(min, unit)}</text>
          </>
        )}
        <path d={areaPath} className="chart-area" />
        <polyline points={path} className="chart-line" />
        {points.map((point, index) => (
          <g key={`${labels[index]}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r="4.2" className="chart-dot" />
          </g>
        ))}
      </svg>
      <div className="line-chart-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {!compact && <p className="muted-copy">범위 {metricDisplayValue(min, unit)} ~ {metricDisplayValue(max, unit)}</p>}
    </div>
  );
}

function AltitudeLayersCard({ operation }: { operation: TheOneOperation }) {
  if (!operation.air) return null;

  return (
    <section className="panel-card">
      <h3>드론 고도별 기상</h3>
      <div className="table-list">
        <div className="table-head">
          <span>고도</span>
          <span>풍속</span>
          <span>풍향</span>
          <span>기온</span>
          <span>난류</span>
        </div>
        {operation.air.altitudeLayers.map((layer) => (
          <div key={layer.label} className="table-row">
            <strong>{layer.label}</strong>
            <span>{layer.windSpeedMs}m/s</span>
            <span>{layer.windDirection}</span>
            <span>{layer.temperatureC}℃</span>
            <em>{layer.turbulence}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsScreen({ operations, onReset }: { operations: TheOneOperation[]; onReset: () => void }) {
  const apiSourceGroups: Array<{ title: string; icon: SimpleIcon; items: string[] }> = [
    {
      title: "기상청",
      icon: Cloud,
      items: ["API허브", "단기·초단기예보", "ASOS 관측", "기상특보", "위험기상 알림"],
    },
    {
      title: "해양",
      icon: Waves,
      items: ["해양기상 관측", "조석·조류 예보", "수온 검증"],
    },
    {
      title: "환경",
      icon: ShieldCheck,
      items: ["에어코리아 대기질", "산림청 산불위험"],
    },
    {
      title: "항공",
      icon: Plane,
      items: ["드론 저고도 기상", "운고·시정", "낙뢰·돌풍"],
    },
  ];
  const creators = ["대위 정동호", "9급 전재문", "병장 김지성", "병장 김준우", "상병 김민규", "일병 임다민", "일병 전호성"];

  return (
    <div className="screen-stack">
      <SectionTitle title="설정" />
      <section className="panel-card">
        <h3>저장 상태</h3>
        <p>현재 브라우저에 {operations.length}개 지역/임무가 저장되어 있습니다.</p>
        <div className="settings-actions">
          <button type="button" className="secondary-action" onClick={onReset}>
            <RotateCcw size={18} />
            전체 초기화
          </button>
        </div>
      </section>
      <section className="panel-card">
        <h3>운용 기준</h3>
        <p>이 화면은 서버 없이 동작합니다. 추가한 지역과 설정값은 현재 기기와 브라우저 LocalStorage 기준으로 저장됩니다.</p>
      </section>
      <section className="panel-card api-source-card">
        <div className="settings-card-head">
          <span>
            <Database size={18} />
          </span>
          <div>
            <h3>데이터 연동 허브</h3>
            <p>공공자료를 JSON으로 변환해 정적 화면에 연결하는 구조</p>
          </div>
        </div>
        <div className="api-source-grid">
          {apiSourceGroups.map((group) => {
            const Icon = group.icon;
            return (
            <article key={group.title}>
              <Icon size={20} />
              <strong>{group.title}</strong>
              <span>{group.items.join(" · ")}</span>
            </article>
            );
          })}
        </div>
        <div className="api-flow">
          <span>공공 API</span>
          <b />
          <span>Actions 변환</span>
          <b />
          <span>JSON 캐시</span>
          <b />
          <span>정적 화면</span>
        </div>
      </section>
      <section className="panel-card creator-card">
        <img src={assetUrl("22.svg")} alt="" />
        <span>32사단 AI TF</span>
        <h3>Baekryong Field AI Lab</h3>
        <p>Think and Make AI for Field Units</p>
        <div className="creator-list">
          {creators.map((creator) => (
            <em key={creator}>{creator}</em>
          ))}
        </div>
      </section>
    </div>
  );
}

function BottomNavigation({ activeView, onNavigate }: { activeView: AppView; onNavigate: (view: AppView) => void }) {
  const items = [
    { view: "dashboard" as const, label: "대시보드", icon: Home },
    { view: "list" as const, label: "지역목록", icon: List },
    { view: "settings" as const, label: "설정", icon: Settings },
  ];

  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.view}
            type="button"
            aria-label={item.label}
            className={cx(activeView === item.view && "is-active")}
            onClick={() => onNavigate(item.view)}
          >
            <Icon size={21} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
