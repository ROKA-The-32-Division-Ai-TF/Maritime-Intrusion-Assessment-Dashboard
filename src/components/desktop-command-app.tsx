"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Cloud,
  Compass,
  Copyright,
  Database,
  Eye,
  KeyRound,
  ListChecks,
  LineChart,
  LockKeyhole,
  Map as MapIcon,
  Moon,
  ExternalLink,
  Settings,
  Shield,
  Thermometer,
  Users,
  Waves,
  Wind,
} from "lucide-react";
import { allOperations, defaultOperations, operationConfigs } from "@/lib/the-one-data";
import type { OperationType, TheOneOperation } from "@/lib/the-one-engine";

type DesktopMenu = "region" | "weather" | "access" | "live" | "weekly" | "settings";
type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
type LiveAlertLevel = "info" | "watch" | "warning";
type LiveAlert = {
  id: string;
  type: OperationType | "system";
  level: LiveAlertLevel;
  title: string;
  message: string;
  source: string;
  timestamp: string;
  regions?: string[];
  regionText?: string;
  targetIds?: string[];
  rawTitle?: string;
};
type RoadCctvWeather = {
  id: string;
  stationName: string;
  roadName?: string;
  observedAt?: string;
  weatherLabel: string;
  fogLabel?: string;
  rainLabel?: string;
  snowLabel?: string;
  lat?: number;
  lon?: number;
  nearestOperationIds?: string[];
  source?: string;
};
type WeatherCachePayload = {
  alerts?: LiveAlert[];
  operationUpdates?: Partial<TheOneOperation>[];
  roadCctv?: RoadCctvWeather[];
};
type DesktopMetric = {
  label: string;
  value: string;
  helper: string;
  icon: IconType;
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const VWORLD_API_KEY = process.env.NEXT_PUBLIC_VWORLD_API_KEY ?? "";
const DESKTOP_SELECTION_KEY = "baekryong-desktop-selection-v1";
const DESKTOP_TYPE_KEY = "baekryong-desktop-type-v1";
const DESKTOP_ADMIN_PIN_KEY = "baekryong-desktop-admin-pin-v1";
const MENUS: Array<{ id: DesktopMenu; label: string; icon: IconType }> = [
  { id: "region", label: "작전지역 기상", icon: MapIcon },
  { id: "weather", label: "기상분석표", icon: CalendarDays },
  { id: "access", label: "밀입국 가능성", icon: ListChecks },
  { id: "live", label: "실시간 상황", icon: MapIcon },
  { id: "weekly", label: "주간 상황", icon: LineChart },
  { id: "settings", label: "관리자 설정", icon: Settings },
];
const TYPES: OperationType[] = ["coastal", "ground", "air"];
const MAP_ZOOM_MIN = 4;
const MAP_ZOOM_MAX = 11;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeAlertMatchText(value: string) {
  return value.replace(/[\s·ㆍ,./_()[\]{}-]/g, "").toLowerCase();
}

function alertKeywordsForOperation(operation: TheOneOperation) {
  const baseText = `${operation.name} ${operation.area ?? ""}`;
  const regionKeywords = ["서산", "당진", "태안", "보령", "공주", "대전", "충주"].filter((keyword) => baseText.includes(keyword));
  const tokens = baseText
    .split(/[·\s]+/g)
    .map((token) => token.replace(/(권역|일대|연안|기상|관측권|공역|회랑|시|군)$/g, ""))
    .filter((token) => token.length >= 2);
  const seaKeywords = operation.type === "coastal" && regionKeywords.some((keyword) => ["서산", "당진", "태안", "보령"].includes(keyword))
    ? ["서해중부", "서해중부앞바다", "서해중부먼바다", "충남북부앞바다", "충남남부앞바다"]
    : [];

  return [...new Set([...regionKeywords, ...tokens, ...seaKeywords])]
    .map(normalizeAlertMatchText)
    .filter((keyword) => keyword.length >= 2);
}

function alertMatchesOperation(alert: LiveAlert, activeType: OperationType, operation?: TheOneOperation) {
  if (alert.type !== "system" && alert.type !== activeType) return false;
  if (!operation) return alert.type !== "system";
  if (alert.targetIds?.includes(operation.id)) return true;
  if (alert.targetIds && alert.targetIds.length > 0) return false;
  if (alert.type === "system") return false;

  const alertText = normalizeAlertMatchText([
    alert.title,
    alert.message,
    alert.source,
    alert.regionText ?? "",
    ...(alert.regions ?? []),
  ].join(" "));

  return !alert.regionText || alertKeywordsForOperation(operation).some((keyword) => alertText.includes(keyword));
}

function filterAlertsForOperation(alerts: LiveAlert[], activeType: OperationType, operation?: TheOneOperation) {
  return alerts.filter((alert) => alertMatchesOperation(alert, activeType, operation));
}

function alertsForOperation(alerts: LiveAlert[], operation: TheOneOperation) {
  return alerts.filter((alert) => alertMatchesOperation(alert, operation.type, operation));
}

function assetUrl(file: string) {
  return `${BASE_PATH}/assets/${file}`;
}

function weatherCacheUrl() {
  return `${BASE_PATH}/data/weather-cache.json?ts=${Date.now()}`;
}

function operationIcon(type: OperationType): IconType {
  if (type === "ground") return Shield;
  if (type === "air") return Compass;
  return Waves;
}

function cleanName(operation: TheOneOperation) {
  return operation.name.replace(/^.*?·\s*/, "").replace(/\s*(일대|권역|관측권|기상 권역)$/g, "");
}

const REGION_KEYWORDS = [
  "서산", "당진", "태안", "보령", "대전", "세종", "서울", "인천", "김포", "수원", "파주", "용인",
  "철원", "춘천", "원주", "강릉", "속초", "양양", "태백", "청주", "충주", "공주", "천안", "아산",
  "군산", "전주", "광주", "무안", "여수", "목포", "대구", "부산", "김해", "울산", "포항", "사천",
  "제주", "서귀포", "성산", "백령", "대련", "위해", "동중국해", "동해",
];

function displayRegionName(operation: TheOneOperation) {
  const text = `${operation.name} ${operation.area}`;
  const keyword = REGION_KEYWORDS.find((region) => text.includes(region));
  if (keyword) {
    if (["대련", "위해", "동중국해"].includes(keyword)) return `중국 · ${keyword}`;
    if (keyword === "동해" && text.includes("일본")) return "일본 · 동해";
    return keyword;
  }

  return cleanName(operation).replace(/^(A|B|C|D)권역\s*·\s*/, "").split(/\s|·/)[0] || operationConfigs[operation.type].title;
}

function catalogLocationParts(operation: TheOneOperation) {
  const text = `${operation.name} ${operation.area}`;
  const city = displayRegionName(operation);

  const provinceRules: Array<[string, string[]]> = [
    ["국외 · 중국", ["중국", "대련", "위해", "동중국해"]],
    ["국외 · 일본", ["일본"]],
    ["서울특별시", ["서울", "강남"]],
    ["인천광역시", ["인천", "백령", "을왕리", "영종"]],
    ["경기도", ["김포", "수원", "파주", "용인", "성남", "오산", "평택"]],
    ["강원특별자치도", ["철원", "춘천", "원주", "강릉", "속초", "양양", "태백", "삼척", "동해"]],
    ["충청북도", ["청주", "충주"]],
    ["충청남도", ["서산", "당진", "태안", "보령", "공주", "천안", "아산", "서천", "홍성", "만리포", "꽃지", "대천", "장항", "홍원", "마량", "남당", "대산", "해미"]],
    ["대전광역시", ["대전", "유성"]],
    ["세종특별자치시", ["세종"]],
    ["전라북도", ["군산", "전주"]],
    ["광주광역시", ["광주"]],
    ["전라남도", ["무안", "여수", "목포", "완도", "순천", "광양"]],
    ["대구광역시", ["대구"]],
    ["부산광역시", ["부산", "해운대"]],
    ["울산광역시", ["울산"]],
    ["경상북도", ["포항", "울릉", "경주", "안동", "영주", "울진"]],
    ["경상남도", ["김해", "사천", "통영", "거제", "창원"]],
    ["제주특별자치도", ["제주", "서귀포", "성산", "한림", "협재"]],
  ];
  const matched = provinceRules.find(([, keywords]) => keywords.some((keyword) => text.includes(keyword) || city.includes(keyword)));

  if (matched) return { province: matched[0], city, detail: operation.area };

  const [lat, lon] = operation.center ?? [36.7, 126.6];
  if (lon < 123 || (lon > 130 && lat < 36)) return { province: "국외 · 참고해역", city, detail: operation.area };
  if (lat >= 37.2 && lon < 127.8) return { province: "경기도", city, detail: operation.area };
  if (lat >= 37.0 && lon >= 127.8) return { province: "강원특별자치도", city, detail: operation.area };
  if (lat >= 36.0 && lon < 127.2) return { province: "충청남도", city, detail: operation.area };
  if (lat >= 36.0 && lon < 128.2) return { province: "충청북도", city, detail: operation.area };
  if (lat >= 35.2 && lon < 127.7) return { province: "전라북도", city, detail: operation.area };
  if (lat < 35.2 && lon < 127.9) return { province: "전라남도", city, detail: operation.area };
  if (lon >= 128.2 && lat >= 35.7) return { province: "경상북도", city, detail: operation.area };
  if (lon >= 127.8 && lat < 35.7) return { province: "경상남도", city, detail: operation.area };
  return { province: "제주특별자치도", city, detail: operation.area };
}

function alertTickerText(alert: LiveAlert) {
  const area = alert.regionText || alert.source.replace(/^기상청\s*·?\s*/, "");
  return `${area} · ${alert.rawTitle ?? alert.message}`;
}

function alertTimestampMs(alert: LiveAlert) {
  const value = Date.parse(alert.timestamp);
  return Number.isFinite(value) ? value : 0;
}

function isDailyAlert(alert: LiveAlert) {
  const timestamp = alertTimestampMs(alert);
  if (!timestamp) return false;
  const ageMs = Date.now() - timestamp;
  return ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1000;
}

function alertIsEnded(alert: LiveAlert) {
  return /해제|취소/.test([alert.rawTitle, alert.title, alert.message].filter(Boolean).join(" "));
}

function shouldShowAlert(alert: LiveAlert) {
  return alertIsEnded(alert) ? isDailyAlert(alert) : true;
}

function dailyAlerts(alerts: LiveAlert[]) {
  return alerts
    .filter(shouldShowAlert)
    .sort((a, b) => alertTimestampMs(b) - alertTimestampMs(a));
}

function clockToMinutes(value = "00:00") {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToClock(value: number) {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function shiftClock(value: string, minutes: number) {
  return minutesToClock(clockToMinutes(value) + minutes);
}

function kstDateParts(date = new Date()) {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return {
    year: kstDate.getUTCFullYear(),
    month: kstDate.getUTCMonth() + 1,
    day: kstDate.getUTCDate(),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

function datePartsToUtcDate(parts: { year: number; month: number; day: number }) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
}

function daysBetweenParts(from: { year: number; month: number; day: number }, to: { year: number; month: number; day: number }) {
  return Math.round((datePartsToUtcDate(to).getTime() - datePartsToUtcDate(from).getTime()) / 86_400_000);
}

function formatLunarDate(year: number, month: number, day: number) {
  try {
    return new Intl.DateTimeFormat("ko-KR-u-ca-chinese", { month: "numeric", day: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
  } catch {
    return "-";
  }
}

function splitClockPair(value?: string) {
  const matches = [...String(value ?? "").matchAll(/(\d{1,2}):(\d{2})/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
  if (matches.length >= 2) return [matches[0], matches[1]];
  return [matches[0] ?? "-", "-"];
}

function shiftedClockPair(value: string | undefined, dayOffset: number, minuteStep = 12) {
  return splitClockPair(value).map((time) => (time === "-" ? "-" : shiftClock(time, dayOffset * minuteStep))).join(" / ");
}

function dateAdjustedNumber(value: number, dayOffset: number, spread: number, min: number, max: number) {
  const wave = Math.sin(dayOffset * 0.83) * spread;
  const drift = ((dayOffset % 5) - 2) * spread * 0.16;
  return Number(Math.max(min, Math.min(max, value + wave + drift)).toFixed(1));
}

function dateAdjustedWeather(base: string, dayOffset: number) {
  if (base !== "맑음" && Math.abs(dayOffset) % 3 !== 1) return base;
  const sequence = ["맑음", "구름많음", "흐림", "맑음", "비"];
  return sequence[((dayOffset % sequence.length) + sequence.length) % sequence.length];
}

function dateAdjustedAlert(base: string, dayOffset: number) {
  if (base !== "없음") return base;
  return Math.abs(dayOffset) % 9 === 0 && dayOffset !== 0 ? "기상변동 확인" : "없음";
}

function dateAdjustedTideAge(value: string, dayOffset: number) {
  const base = Number.parseInt(value, 10);
  if (Number.isNaN(base)) return value;
  return `${((base + dayOffset - 1) % 15 + 15) % 15 + 1}물`;
}

const WEEK_LABELS = ["오늘", "내일", "3일", "4일", "5일", "6일", "7일"];

function weeklyNumberValues(base: number, spread: number, floor = 0, ceiling = 100) {
  return WEEK_LABELS.map((_, index) => {
    const wave = Math.sin((index / Math.max(1, WEEK_LABELS.length - 1)) * Math.PI * 1.2);
    const drift = (index - 3) * spread * 0.07;
    return Number(Math.max(floor, Math.min(ceiling, base + wave * spread + drift)).toFixed(1));
  });
}

function weeklyTimeValues(baseMinutes: number, step = 7) {
  return WEEK_LABELS.map((_, index) => baseMinutes + index * step);
}

function weeklyLinePoints(values: number[]) {
  const width = 320;
  const height = 128;
  const padX = 20;
  const padY = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);

  return values.map((value, index) => {
    const x = padX + (index / Math.max(1, values.length - 1)) * (width - padX * 2);
    const y = height - padY - ((value - min) / span) * (height - padY * 2);
    return { x, y, value };
  });
}

function metricNumber(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function metricUnit(value: string) {
  const match = value.match(/-?\d+(?:\.\d+)?\s*([^\d\s].*)?$/);
  return match?.[1]?.trim() ?? "";
}

function operationAstronomy(operation: TheOneOperation) {
  if (operation.coastal) {
    return {
      sunrise: operation.coastal.sunrise,
      sunset: operation.coastal.sunset,
      bmnt: operation.coastal.bmnt,
      eent: operation.coastal.eent,
      moonrise: operation.coastal.moonrise,
      moonset: operation.coastal.moonset,
      moonlightPercent: operation.coastal.moonlightPercent,
    };
  }

  if (operation.ground) {
    return {
      sunrise: operation.ground.sunrise,
      sunset: operation.ground.sunset,
      bmnt: operation.ground.bmnt,
      eent: operation.ground.eent,
      moonrise: operation.ground.moonrise,
      moonset: operation.ground.moonset,
      moonlightPercent: operation.ground.moonlightPercent,
    };
  }

  if (operation.air) {
    return {
      sunrise: operation.air.sunrise,
      sunset: operation.air.sunset,
      bmnt: operation.air.bmnt,
      eent: operation.air.eent,
      moonrise: operation.air.moonrise,
      moonset: operation.air.moonset,
      moonlightPercent: operation.air.moonlightPercent,
    };
  }

  return null;
}

function weatherLabel(operation: TheOneOperation) {
  return operation.coastalEnvironment?.weatherStatus
    ?? operation.groundEnvironment?.weatherStatus
    ?? operation.aviationEnvironment?.weatherStatus
    ?? "맑음";
}

function weatherEmoji(operation: TheOneOperation, alerts: LiveAlert[] = []) {
  if (alertsForOperation(alerts, operation).length > 0) return "⚠️";
  const weather = weatherLabel(operation);
  if (weather.includes("비") || weather.includes("폭우")) return "🌧";
  if (weather.includes("눈")) return "❄";
  if (weather.includes("안개")) return "🌫";
  if (weather.includes("흐림")) return "☁";
  return "☀";
}

function mercatorPixel(lat: number, lon: number, zoom: number) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const scale = 256 * 2 ** zoom;
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function latLonFromMercatorPixel(x: number, y: number, zoom: number): [number, number] {
  const scale = 256 * 2 ** zoom;
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [Math.max(-85, Math.min(85, lat)), lon];
}

function vworldTileUrl(x: number, y: number, zoom: number) {
  const max = 2 ** zoom;
  if (y < 0 || y >= max) return "";
  const wrappedX = ((x % max) + max) % max;
  if (!VWORLD_API_KEY) return "";
  return `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_API_KEY}/Base/${zoom}/${y}/${wrappedX}.png`;
}

function mapCenter(operations: TheOneOperation[], fallback?: TheOneOperation): [number, number] {
  const centers = operations.map((operation) => operation.center).filter(Boolean) as [number, number][];
  if (centers.length === 0) return fallback?.center ?? ([36.7, 126.6] as [number, number]);
  return [
    centers.reduce((sum, center) => sum + center[0], 0) / centers.length,
    centers.reduce((sum, center) => sum + center[1], 0) / centers.length,
  ] as [number, number];
}

function fittedMapView(operations: TheOneOperation[], fallback?: TheOneOperation) {
  const centers = operations.map((operation) => operation.center).filter(Boolean) as [number, number][];
  if (centers.length === 0) return { center: fallback?.center ?? ([36.7, 126.6] as [number, number]), zoom: 7 };

  const latitudes = centers.map((center) => center[0]);
  const longitudes = centers.map((center) => center[1]);
  const latSpan = Math.max(...latitudes) - Math.min(...latitudes);
  const lonSpan = Math.max(...longitudes) - Math.min(...longitudes);
  const span = Math.max(latSpan * 1.45, lonSpan);
  let zoom = 9;

  if (span > 18) zoom = 4;
  else if (span > 9) zoom = 5;
  else if (span > 4.5) zoom = 6;
  else if (span > 2.2) zoom = 7;
  else if (span > 1.1) zoom = 8;

  return { center: mapCenter(operations, fallback), zoom };
}

function applyOperationUpdates(operations: TheOneOperation[], payload: WeatherCachePayload) {
  const updates = Array.isArray(payload.operationUpdates) ? payload.operationUpdates : [];
  if (updates.length === 0) return operations;
  const updateMap = new Map(updates.filter((update) => update.id).map((update) => [update.id, update]));

  return operations.map((operation) => {
    const update = updateMap.get(operation.id);
    if (!update) return operation;

    return {
      ...operation,
      ...update,
      coastal: operation.coastal || update.coastal ? { ...operation.coastal, ...update.coastal } as TheOneOperation["coastal"] : undefined,
      ground: operation.ground || update.ground ? { ...operation.ground, ...update.ground } as TheOneOperation["ground"] : undefined,
      air: operation.air || update.air ? { ...operation.air, ...update.air } as TheOneOperation["air"] : undefined,
      coastalEnvironment:
        operation.coastalEnvironment || update.coastalEnvironment
          ? { ...operation.coastalEnvironment, ...update.coastalEnvironment } as TheOneOperation["coastalEnvironment"]
          : undefined,
      groundEnvironment:
        operation.groundEnvironment || update.groundEnvironment
          ? { ...operation.groundEnvironment, ...update.groundEnvironment } as TheOneOperation["groundEnvironment"]
          : undefined,
      aviationEnvironment:
        operation.aviationEnvironment || update.aviationEnvironment
          ? { ...operation.aviationEnvironment, ...update.aviationEnvironment } as TheOneOperation["aviationEnvironment"]
          : undefined,
    };
  });
}

function windyEmbedUrl(operation: TheOneOperation) {
  const [lat, lon] = operation.center ?? [36.5, 126.5];
  const overlay = operation.type === "coastal" ? "waves" : "wind";
  const zoom = operation.type === "coastal" ? "7" : operation.type === "ground" ? "9" : "8";
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
    message: "false",
    calendar: "now",
    type: "map",
    location: "coordinates",
    metricWind: "m/s",
    metricTemp: "°C",
  });

  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

function windyPageUrl(operation: TheOneOperation) {
  const [lat, lon] = operation.center ?? [36.5, 126.5];
  const zoom = operation.type === "coastal" ? "7" : operation.type === "ground" ? "9" : "8";
  return `https://www.windy.com/?${lat},${lon},${zoom}`;
}

function desktopMetrics(operation: TheOneOperation): DesktopMetric[] {
  if (operation.type === "coastal" && operation.coastal) {
    const data = operation.coastal;
    const weather = operation.coastalEnvironment?.weatherStatus ?? "맑음";
    return [
      { label: "개황", value: weather, helper: data.weatherAlert, icon: Cloud },
      { label: "기온", value: `${data.temperatureC}℃`, helper: "해상환경", icon: Thermometer },
      { label: "앞바다", value: `${data.nearshoreWaveHeightM}m`, helper: `${data.wavePeriodSec}초`, icon: Waves },
      { label: "먼바다", value: `${data.offshoreWaveHeightM}m`, helper: data.waveDirection, icon: Waves },
      { label: "지상풍", value: `${data.surfaceWindMs}m/s`, helper: data.windDirection, icon: Wind },
      { label: "상층풍", value: `${data.upperWindSpeedMs}m/s`, helper: data.upperWindDirection, icon: Wind },
      { label: "월광", value: `${data.moonlightPercent}%`, helper: `${data.moonrise}/${data.moonset}`, icon: Moon },
      { label: "BMNT", value: data.bmnt, helper: "아침박명", icon: Moon },
      { label: "EENT", value: data.eent, helper: "저녁박명", icon: Moon },
      { label: "시정", value: `${data.visibilityKm}km`, helper: "가시거리", icon: Eye },
      { label: "간조", value: data.lowTide, helper: "1차/2차", icon: Activity },
      { label: "만조", value: data.highTide, helper: "1차/2차", icon: Activity },
      { label: "물매", value: `${data.tideRangeM}m`, helper: data.tideAge, icon: Activity },
      { label: "수온", value: `${data.waterTempC}℃`, helper: "해수면", icon: Thermometer },
    ];
  }

  if (operation.type === "ground" && operation.ground) {
    const data = operation.ground;
    return [
      { label: "개황", value: operation.groundEnvironment?.weatherStatus ?? "맑음", helper: operation.groundEnvironment?.weatherAlert ?? "특보 없음", icon: Cloud },
      { label: "기온", value: `${data.temperatureC}℃`, helper: `체감 ${data.apparentTemperatureC}℃`, icon: Thermometer },
      { label: "습도", value: `${data.humidityPercent}%`, helper: "온열 영향", icon: Activity },
      { label: "강수", value: `${data.precipitationProbability}%`, helper: `${data.precipitationMm}mm`, icon: Cloud },
      { label: "지상풍", value: `${data.surfaceWindMs}m/s`, helper: data.windDirection, icon: Wind },
      { label: "상층풍", value: `${data.upperWindSpeedMs}m/s`, helper: data.upperWindDirection, icon: Wind },
      { label: "월광", value: `${data.moonlightPercent}%`, helper: `${data.moonrise}/${data.moonset}`, icon: Moon },
      { label: "BMNT", value: data.bmnt, helper: "아침박명", icon: Moon },
      { label: "EENT", value: data.eent, helper: "저녁박명", icon: Moon },
      { label: "시정", value: `${data.visibilityKm}km`, helper: data.fog, icon: Eye },
      { label: "WBGT", value: `${data.wbgtC}℃`, helper: "온열지수", icon: Thermometer },
    ];
  }

  if (operation.type === "air" && operation.air) {
    const data = operation.air;
    return [
      { label: "개황", value: operation.aviationEnvironment?.weatherStatus ?? "맑음", helper: "드론기상", icon: Cloud },
      { label: "평균풍", value: `${data.windSpeedMs}m/s`, helper: data.windDirection, icon: Wind },
      { label: "순간풍", value: `${data.gustSpeedMs}m/s`, helper: "돌풍", icon: Wind },
      { label: "시정", value: `${data.visibilityKm}km`, helper: "영상판독", icon: Eye },
      { label: "BMNT", value: data.bmnt, helper: "아침박명", icon: Moon },
      { label: "EENT", value: data.eent, helper: "저녁박명", icon: Moon },
      { label: "운고", value: `${data.cloudCeilingFt}ft`, helper: "저고도", icon: Cloud },
      { label: "난류", value: data.turbulenceRisk, helper: "항로안정", icon: Activity },
      { label: "습도", value: `${data.humidityPercent}%`, helper: `이슬점 ${data.dewPointC}℃`, icon: Activity },
      { label: "기온", value: `${data.temperatureC}℃`, helper: "배터리", icon: Thermometer },
    ];
  }

  return [];
}

function weeklyMetricsForOperation(operation: TheOneOperation) {
  return desktopMetrics(operation).filter((metric) => {
    if (metric.label === "개황") return false;
    if (metricNumber(metric.value) !== null) return true;
    return /(\d{1,2}):(\d{2})/.test(metric.value);
  });
}

function statusText(operation: TheOneOperation) {
  if (operation.type === "coastal" && operation.coastal) {
    const data = operation.coastal;
    if (data.weatherAlert !== "없음") return "특보 확인";
    if (data.visibilityKm <= 3) return "저시정";
    if (data.waveHeightM >= 2 || data.windSpeedMs >= 10) return "해상주의";
    return "관측양호";
  }

  if (operation.type === "ground" && operation.ground) {
    const data = operation.ground;
    if ((operation.groundEnvironment?.weatherAlert ?? "없음") !== "없음") return "특보 확인";
    if (data.visibilityKm <= 3 || data.fog !== "없음") return "시정주의";
    if (data.temperatureC >= 30 || data.wbgtC >= 28) return "온열주의";
    return "관측양호";
  }

  if (operation.type === "air" && operation.air) {
    const data = operation.air;
    if (data.gustSpeedMs >= 12 || data.turbulenceRisk === "강") return "돌풍주의";
    if (data.visibilityKm <= 3 || data.cloudCeilingFt <= 1200) return "비행주의";
    return "운용양호";
  }

  return "확인";
}

function buildBriefing(operation: TheOneOperation) {
  if (operation.type === "coastal" && operation.coastal) {
    const data = operation.coastal;
    return [
      `파고 ${data.waveHeightM}m, 풍속 ${data.windSpeedMs}m/s, 시정 ${data.visibilityKm}km입니다.`,
      `만조 ${data.highTide}, 간조 ${data.lowTide}, 월광 ${data.moonlightPercent}%입니다.`,
      data.weatherAlert === "없음" ? "현재 선택 지역 특보 표시는 없습니다." : `${data.weatherAlert} 상태입니다.`,
    ];
  }

  if (operation.type === "ground" && operation.ground) {
    const data = operation.ground;
    return [
      `기온 ${data.temperatureC}℃, 습도 ${data.humidityPercent}%, WBGT ${data.wbgtC}℃입니다.`,
      `강수확률 ${data.precipitationProbability}%, 시정 ${data.visibilityKm}km, 풍속 ${data.windSpeedMs}m/s입니다.`,
      `${operation.groundEnvironment?.weatherAlert ?? "특보 없음"} 상태입니다.`,
    ];
  }

  if (operation.type === "air" && operation.air) {
    const data = operation.air;
    return [
      `드론 기준 평균풍 ${data.windSpeedMs}m/s, 순간풍 ${data.gustSpeedMs}m/s입니다.`,
      `운고 ${data.cloudCeilingFt}ft, 시정 ${data.visibilityKm}km, 난류 ${data.turbulenceRisk}입니다.`,
      `습도 ${data.humidityPercent}%, 이슬점 ${data.dewPointC}℃입니다.`,
    ];
  }

  return ["선택 지역의 관측값을 확인하세요."];
}

function useDesktopData() {
  const [catalog, setCatalog] = useState(allOperations);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [roadCctv, setRoadCctv] = useState<RoadCctvWeather[]>([]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch(weatherCacheUrl(), { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as WeatherCachePayload;
        if (!active) return;

        setCatalog((current) => applyOperationUpdates(current, payload));
        setAlerts(Array.isArray(payload.alerts) ? payload.alerts : []);
        setRoadCctv(Array.isArray(payload.roadCctv) ? payload.roadCctv : []);
      } catch {
        if (active) {
          setAlerts([]);
          setRoadCctv([]);
        }
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 60_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { catalog, alerts, roadCctv };
}

function useKstClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return {
    date: now.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }),
    time: now.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour12: false }),
  };
}

export function DesktopCommandApp() {
  const { catalog, alerts } = useDesktopData();
  const clock = useKstClock();
  const [activeMenu, setActiveMenu] = useState<DesktopMenu>("region");
  const [activeType, setActiveType] = useState<OperationType>("coastal");
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultOperations.map((operation) => operation.id));
  const [selectedId, setSelectedId] = useState(defaultOperations[0]?.id ?? "");
  const [adminPin, setAdminPin] = useState("0000");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const storedIds = JSON.parse(window.localStorage.getItem(DESKTOP_SELECTION_KEY) ?? "null") as string[] | null;
        const storedType = window.localStorage.getItem(DESKTOP_TYPE_KEY) as OperationType | null;
        const storedPin = window.localStorage.getItem(DESKTOP_ADMIN_PIN_KEY);

        if (Array.isArray(storedIds)) {
          setSelectedIds(storedIds);
          setSelectedId(storedIds[0] ?? "");
        }

        if (storedType && TYPES.includes(storedType)) setActiveType(storedType);
        if (storedPin && /^\d{4}$/.test(storedPin)) setAdminPin(storedPin);
      } catch {
        window.localStorage.removeItem(DESKTOP_SELECTION_KEY);
      } finally {
        setLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(DESKTOP_SELECTION_KEY, JSON.stringify(selectedIds));
    window.localStorage.setItem(DESKTOP_TYPE_KEY, activeType);
  }, [activeType, loaded, selectedIds]);

  const selectedOperations = useMemo(
    () => catalog.filter((operation) => selectedIds.includes(operation.id)),
    [catalog, selectedIds],
  );
  const activeOperations = useMemo(
    () => selectedOperations.filter((operation) => operation.type === activeType),
    [activeType, selectedOperations],
  );
  const alertsForToday = useMemo(() => dailyAlerts(alerts), [alerts]);
  const selectedOperation = activeOperations.find((operation) => operation.id === selectedId) ?? activeOperations[0] ?? selectedOperations[0];
  const selectedAlerts = useMemo(
    () => filterAlertsForOperation(alertsForToday, activeType, selectedOperation),
    [activeType, alertsForToday, selectedOperation],
  );

  function handleTypeChange(type: OperationType) {
    const first = selectedOperations.find((operation) => operation.type === type) ?? catalog.find((operation) => operation.type === type);
    setActiveType(type);
    setSelectedId(first?.id ?? "");
  }

  function handleToggle(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setSelectedId(id);
  }

  function handleDefault() {
    const ids = defaultOperations.map((operation) => operation.id);
    setSelectedIds(ids);
    setSelectedId(ids[0] ?? "");
    setActiveType("coastal");
  }

  function handleHome() {
    const firstCoastal = selectedOperations.find((operation) => operation.type === "coastal")
      ?? catalog.find((operation) => operation.type === "coastal");
    setActiveMenu("region");
    setActiveType("coastal");
    setSelectedId(firstCoastal?.id ?? "");
  }

  function handleAdminPinChange(nextPin: string) {
    setAdminPin(nextPin);
    window.localStorage.setItem(DESKTOP_ADMIN_PIN_KEY, nextPin);
  }

  return (
    <div className="desktop-app">
      <aside className="desktop-sidebar">
        <button type="button" className="desktop-brand" onClick={handleHome} aria-label="처음 화면으로 이동">
          <img src={assetUrl("22.svg")} alt="" />
          <div>
            <span>제32보병사단</span>
            <strong>작전기상분석체계</strong>
            <em>Operational Weather Analysis</em>
          </div>
        </button>
        <div className="desktop-clock">
          <span>KST</span>
          <strong suppressHydrationWarning>{clock.time}</strong>
          <em suppressHydrationWarning>{clock.date}</em>
        </div>
        <nav className="desktop-menu" aria-label="데스크톱 메뉴">
          {MENUS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={activeMenu === item.id ? "is-active" : ""} onClick={() => setActiveMenu(item.id)}>
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className={cx("desktop-main", activeMenu === "settings" && "is-settings")}>
        <DesktopNewsTicker alerts={alertsForToday} />
        <div className="desktop-content">
          {activeMenu === "region" && (
            <OperationRegionStatus
              activeType={activeType}
              operations={activeOperations}
              allSelectedOperations={selectedOperations}
              selectedOperation={selectedOperation}
              alerts={alertsForToday}
              onTypeChange={handleTypeChange}
              onSelect={(operation) => setSelectedId(operation.id)}
            />
          )}
          {activeMenu === "weather" && <WeatherAnalysisSheet operations={selectedOperations} />}
          {activeMenu === "access" && <AccessAssessmentSheet operations={selectedOperations} />}
          {activeMenu === "live" && (
            <LiveSituation
              activeType={activeType}
              operations={activeOperations}
              selectedOperation={selectedOperation}
              alerts={selectedAlerts}
              onTypeChange={handleTypeChange}
              onSelect={(operation) => setSelectedId(operation.id)}
            />
          )}
          {activeMenu === "weekly" && (
            <WeeklySituation
              activeType={activeType}
              operations={activeOperations}
              selectedOperation={selectedOperation}
              onTypeChange={handleTypeChange}
              onSelect={(operation) => setSelectedId(operation.id)}
            />
          )}
          {activeMenu === "settings" && (
            adminUnlocked ? (
              <DesktopSettings
                catalog={catalog}
                selectedIds={selectedIds}
                activeType={activeType}
                adminPin={adminPin}
                onTypeChange={setActiveType}
                onToggle={handleToggle}
                onClear={() => {
                  if (!window.confirm("선택한 지역을 모두 초기화할까요?")) return;
                  setSelectedIds([]);
                  setSelectedId("");
                }}
                onDefault={handleDefault}
                onSelectAllType={() => {
                  const ids = catalog.filter((operation) => operation.type === activeType).map((operation) => operation.id);
                  setSelectedIds((current) => [...new Set([...current, ...ids])]);
                  setSelectedId(ids[0] ?? "");
                }}
                onChangePin={handleAdminPinChange}
                onLock={() => setAdminUnlocked(false)}
              />
            ) : (
              <DesktopAdminPinGate adminPin={adminPin} onUnlock={() => setAdminUnlocked(true)} />
            )
          )}
        </div>
      </main>
    </div>
  );
}

function DesktopNewsTicker({ alerts }: { alerts: LiveAlert[] }) {
  const [open, setOpen] = useState(false);
  const visibleAlerts = alerts.slice(0, 14);
  const activeAlerts = alerts.filter((alert) => !alertIsEnded(alert));
  const endedAlerts = alerts.filter(alertIsEnded);
  const latestAlert = alerts[0];
  const alertModal = open && typeof document !== "undefined"
    ? createPortal(
      <div className="desktop-alert-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
        <section className="desktop-alert-modal" role="dialog" aria-modal="true" aria-label="최근 24시간 특보현황" onClick={(event) => event.stopPropagation()}>
          <header>
            <div>
              <span>진행 중 특보 + 최근 24시간 해제 이력</span>
              <h2>실시간 속보 현황</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="닫기">×</button>
          </header>
          <div className="desktop-alert-modal-summary">
            <article className={activeAlerts.length > 0 ? "is-active" : ""}>
              <span>진행 중</span>
              <strong>{activeAlerts.length}건</strong>
            </article>
            <article>
              <span>최근 해제</span>
              <strong>{endedAlerts.length}건</strong>
            </article>
            <article>
              <span>최근 갱신</span>
              <strong>{latestAlert ? new Date(latestAlert.timestamp).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "대기"}</strong>
            </article>
          </div>
          <div className="desktop-alert-modal-grid">
            <AlertModalColumn title="현재 발효/변경" alerts={activeAlerts} empty="현재 표시할 발효 특보가 없습니다." />
            <AlertModalColumn title="최근 24시간 해제" alerts={endedAlerts} empty="최근 24시간 이내 해제 특보가 없습니다." />
          </div>
        </section>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <section className="desktop-news-ticker" aria-label="전국 실시간 특보현황">
        <button type="button" className="desktop-news-title" onClick={() => setOpen(true)}>
          <Bell size={16} />
          <strong>실시간 속보</strong>
        </button>
        <div className="desktop-news-window">
          <div className={cx("desktop-news-track", visibleAlerts.length === 0 && "is-static")}>
            {(visibleAlerts.length > 0 ? [...visibleAlerts, ...visibleAlerts] : []).map((alert, index) => (
              <span key={`${alert.id}-news-${index}`}>{alertTickerText(alert)}</span>
            ))}
            {visibleAlerts.length === 0 && <span>최근 24시간 이내 신규 특보현황은 없습니다.</span>}
          </div>
        </div>
      </section>
      {alertModal}
    </>
  );
}

function AlertModalColumn({ title, alerts, empty }: { title: string; alerts: LiveAlert[]; empty: string }) {
  return (
    <div className="desktop-alert-modal-column">
      <h3>{title}</h3>
      <div>
        {alerts.length > 0 ? alerts.map((alert) => (
          <article key={`modal-${title}-${alert.id}`}>
            <strong>{alert.regionText || alert.source}</strong>
            <span>{alert.rawTitle ?? alert.title}</span>
            <p>{alert.message}</p>
            <em>{new Date(alert.timestamp).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}</em>
          </article>
        )) : (
          <p>{empty}</p>
        )}
      </div>
    </div>
  );
}

function DesktopTypeSwitch({ activeType, onTypeChange }: { activeType: OperationType; onTypeChange: (type: OperationType) => void }) {
  return (
    <div className="desktop-type-switch">
      {TYPES.map((type) => (
        <button key={type} type="button" className={activeType === type ? "is-active" : ""} onClick={() => onTypeChange(type)}>
          {operationConfigs[type].title}
        </button>
      ))}
    </div>
  );
}

function OperationRail({
  operations,
  selectedId,
  onSelect,
}: {
  operations: TheOneOperation[];
  selectedId?: string;
  onSelect: (operation: TheOneOperation) => void;
}) {
  if (operations.length === 0) {
    return (
      <section className="desktop-empty">
        <Database size={24} />
        <strong>선택된 지역이 없습니다</strong>
      </section>
    );
  }

  return (
    <div className="desktop-operation-rail">
      {operations.map((operation) => {
        const Icon = operationIcon(operation.type);
        return (
          <button key={operation.id} type="button" className={selectedId === operation.id ? "is-active" : ""} onClick={() => onSelect(operation)}>
            <Icon size={20} />
            <span>{cleanName(operation)}</span>
            <em>{statusText(operation)}</em>
          </button>
        );
      })}
    </div>
  );
}

function OperationRegionStatus({
  activeType,
  operations,
  allSelectedOperations,
  selectedOperation,
  alerts,
  onTypeChange,
  onSelect,
}: {
  activeType: OperationType;
  operations: TheOneOperation[];
  allSelectedOperations: TheOneOperation[];
  selectedOperation?: TheOneOperation;
  alerts: LiveAlert[];
  onTypeChange: (type: OperationType) => void;
  onSelect: (operation: TheOneOperation) => void;
}) {
  const [popupId, setPopupId] = useState<string | null>(selectedOperation?.id ?? null);
  const mapOperations = operations.length > 0 ? operations : allSelectedOperations;
  const popupOperation = mapOperations.find((operation) => operation.id === popupId) ?? selectedOperation ?? mapOperations[0];

  return (
    <section className="desktop-region-grid">
      <div className="desktop-vworld-panel">
        <VworldMap
          key={mapOperations.map((operation) => operation.id).join("|")}
          activeType={activeType}
          operations={mapOperations}
          selectedOperation={popupOperation}
          alerts={alerts}
          onTypeChange={onTypeChange}
          onSelect={(operation) => {
            setPopupId(operation.id);
            onSelect(operation);
          }}
        />
      </div>
      <aside className="desktop-region-side">
        <OperationPopup operation={popupOperation} alerts={alerts} />
      </aside>
    </section>
  );
}

function VworldMap({
  activeType,
  operations,
  selectedOperation,
  alerts,
  onTypeChange,
  onSelect,
}: {
  activeType: OperationType;
  operations: TheOneOperation[];
  selectedOperation?: TheOneOperation;
  alerts: LiveAlert[];
  onTypeChange: (type: OperationType) => void;
  onSelect: (operation: TheOneOperation) => void;
}) {
  const fittedView = useMemo(() => fittedMapView(operations), [operations]);
  const [view, setView] = useState(fittedView);
  const viewRef = useRef(fittedView);
  const dragRef = useRef<{ x: number; y: number; center: [number, number]; zoom: number; pointerId: number } | null>(null);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    function moveMap(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      event.preventDefault();
      const startPixel = mercatorPixel(drag.center[0], drag.center[1], drag.zoom);
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMovedRef.current = true;

      setView((current) => ({
        ...current,
        center: latLonFromMercatorPixel(startPixel.x - dx, startPixel.y - dy, drag.zoom),
      }));
    }

    function stopMapDrag(event: PointerEvent) {
      if (dragRef.current?.pointerId === event.pointerId) endDrag();
    }

    window.addEventListener("pointermove", moveMap, { passive: false });
    window.addEventListener("pointerup", stopMapDrag);
    window.addEventListener("pointercancel", stopMapDrag);

    return () => {
      window.removeEventListener("pointermove", moveMap);
      window.removeEventListener("pointerup", stopMapDrag);
      window.removeEventListener("pointercancel", stopMapDrag);
    };
  }, []);

  const zoom = view.zoom;
  const center = view.center;
  const centerPixel = mercatorPixel(center[0], center[1], zoom);
  const centerTile = { x: Math.floor(centerPixel.x / 256), y: Math.floor(centerPixel.y / 256) };
  const tiles = Array.from({ length: 7 }, (_, row) => (
    Array.from({ length: 7 }, (__, col) => ({
      x: centerTile.x + col - 3,
      y: centerTile.y + row - 3,
    }))
  )).flat();

  function zoomBy(delta: number) {
    setView((current) => ({ ...current, zoom: Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_MAX, current.zoom + delta)) }));
  }

  function endDrag() {
    dragRef.current = null;
  }

  return (
    <section
      className="desktop-vworld-map"
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        const current = viewRef.current;
        dragMovedRef.current = false;
        dragRef.current = { x: event.clientX, y: event.clientY, center: current.center, zoom: current.zoom, pointerId: event.pointerId };
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Window-level pointer tracking below keeps drag alive when capture is unavailable.
        }
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onWheel={(event) => {
        event.preventDefault();
        zoomBy(event.deltaY > 0 ? -1 : 1);
      }}
    >
      <div className="desktop-vworld-tiles" aria-hidden="true">
        {tiles.map((tile) => {
          const url = vworldTileUrl(tile.x, tile.y, zoom);
          return url ? (
            <img
              key={`${tile.x}-${tile.y}`}
              src={url}
              alt=""
              draggable={false}
              referrerPolicy="no-referrer"
              style={{
                left: `calc(50% + ${tile.x * 256 - centerPixel.x}px)`,
                top: `calc(50% + ${tile.y * 256 - centerPixel.y}px)`,
              }}
            />
          ) : null;
        })}
      </div>
      <div className="desktop-vworld-shade" />
      <div
        className="desktop-map-type-switch"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
      >
        <DesktopTypeSwitch activeType={activeType} onTypeChange={onTypeChange} />
      </div>
      {operations.map((operation) => {
        if (!operation.center) return null;
        const point = mercatorPixel(operation.center[0], operation.center[1], zoom);
        const active = selectedOperation?.id === operation.id;
        const markerAlerts = alertsForOperation(alerts, operation);

        return (
          <button
            key={operation.id}
            type="button"
            className={cx("desktop-map-marker", `is-${operation.type}`, active && "is-active", markerAlerts.length > 0 && "has-alert")}
            style={{
              left: `calc(50% + ${point.x - centerPixel.x}px)`,
              top: `calc(50% + ${point.y - centerPixel.y}px)`,
            }}
            onPointerDown={(event) => {
              dragMovedRef.current = false;
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (dragMovedRef.current) return;
              onSelect(operation);
            }}
          >
            <span>{weatherEmoji(operation, alerts)}</span>
            <strong>{displayRegionName(operation)}</strong>
          </button>
        );
      })}
    </section>
  );
}

function OperationPopup({ operation, alerts }: { operation?: TheOneOperation; alerts: LiveAlert[] }) {
  if (!operation) {
    return (
      <section className="desktop-panel desktop-region-popup">
        <h2>지역 정보</h2>
        <p>관리자 설정에서 작전지역을 선택하세요.</p>
      </section>
    );
  }

  const metrics = desktopMetrics(operation).slice(0, 8);
  const activeAlerts = alertsForOperation(alerts, operation);

  return (
    <section className="desktop-panel desktop-region-popup">
      <header>
        <span>{operationConfigs[operation.type].title}</span>
        <h2>{operation.name}</h2>
        <em>{operation.datetime}</em>
      </header>
      <div className="desktop-region-status-row">
        <b>{weatherEmoji(operation, alerts)}</b>
        <strong>{statusText(operation)}</strong>
        <span>{activeAlerts.length > 0 ? `특보 ${activeAlerts.length}건` : "특보 없음"}</span>
      </div>
      <div className="desktop-region-metric-list">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em>{metric.helper}</em>
          </article>
        ))}
      </div>
      <div className="desktop-region-action-grid">
        <a href="https://www.weather.go.kr/wgis-nuri/html/map.html#" target="_blank" rel="noreferrer">
          <MapIcon size={18} />
          <span>기상청 지도</span>
        </a>
        <a href="https://www.weather.go.kr/wgis-nuri/html/map.html#" target="_blank" rel="noreferrer">
          <Eye size={18} />
          <span>CCTV</span>
        </a>
      </div>
    </section>
  );
}

function AstronomyOverview({ operation }: { operation: TheOneOperation }) {
  const astro = operationAstronomy(operation);
  if (!astro) return null;
  const weather = weatherLabel(operation);

  return (
    <section className="desktop-astro-overview">
      <article>
        <b>{weather.includes("흐림") ? "☁" : weather.includes("비") ? "🌧" : "☀"}</b>
        <span>일출 / 일몰</span>
        <strong>{astro.sunrise} / {astro.sunset}</strong>
        <em>주간 식별 기준</em>
      </article>
      <article>
        <b>🌗</b>
        <span>월출 / 월몰</span>
        <strong>{astro.moonrise} / {astro.moonset}</strong>
        <em>월광 {astro.moonlightPercent}%</em>
      </article>
      <article>
        <b>◐</b>
        <span>BMNT / EENT</span>
        <strong>{astro.bmnt} / {astro.eent}</strong>
        <em>박명 시간</em>
      </article>
    </section>
  );
}

function LiveSituation({
  activeType,
  operations,
  selectedOperation,
  alerts,
  onTypeChange,
  onSelect,
}: {
  activeType: OperationType;
  operations: TheOneOperation[];
  selectedOperation?: TheOneOperation;
  alerts: LiveAlert[];
  onTypeChange: (type: OperationType) => void;
  onSelect: (operation: TheOneOperation) => void;
}) {
  const metrics = selectedOperation ? desktopMetrics(selectedOperation) : [];

  return (
    <section className="desktop-live-grid">
      <div className="desktop-live-left">
        <DesktopTypeSwitch activeType={activeType} onTypeChange={onTypeChange} />
        <OperationRail operations={operations} selectedId={selectedOperation?.id} onSelect={onSelect} />
      </div>
      <div className="desktop-live-center">
        {selectedOperation ? (
          <>
            <section className="desktop-focus-card">
              <div>
                <span>{selectedOperation.area}</span>
                <h1>{selectedOperation.name}</h1>
                <em>{selectedOperation.datetime}</em>
              </div>
              <strong>{statusText(selectedOperation)}</strong>
            </section>
            <AstronomyOverview operation={selectedOperation} />
            <section className="desktop-metric-grid">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <article key={metric.label}>
                    <Icon size={20} />
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <em>{metric.helper}</em>
                  </article>
                );
              })}
            </section>
            <section className="desktop-live-map-grid">
              <article className="desktop-windy-panel">
                <iframe src={windyEmbedUrl(selectedOperation)} title={`${selectedOperation.name} 윈디`} loading="lazy" />
                <a className="desktop-map-launch" href={windyPageUrl(selectedOperation)} target="_blank" rel="noreferrer">
                  크게 보기
                  <ExternalLink size={14} />
                </a>
              </article>
            </section>
          </>
        ) : (
          <section className="desktop-empty is-large">
            <Database size={30} />
            <strong>관리자 설정에서 지역을 선택하세요</strong>
          </section>
        )}
      </div>
      <aside className="desktop-live-right">
        <section className="desktop-panel desktop-briefing-card">
          <h2>AI 브리핑</h2>
          {selectedOperation ? (
            <div className="desktop-briefing-list">
              {buildBriefing(selectedOperation).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : (
            <p>선택 지역 없음</p>
          )}
        </section>
        <section className="desktop-panel">
          <h2>실시간 특보</h2>
          <div className="desktop-alert-list">
            {(alerts.length > 0 ? alerts : []).slice(0, 8).map((alert) => (
              <article key={alert.id} className={cx("desktop-alert", `is-${alert.level}`)}>
                <strong>{alert.title}</strong>
                <em>{alert.regionText ? `발령지역 ${alert.regionText}` : alert.source}</em>
                <span>{alert.message}</span>
              </article>
            ))}
            {alerts.length === 0 && <p>현재 선택 지역에 표시할 특보가 없습니다.</p>}
          </div>
        </section>
      </aside>
    </section>
  );
}

function WeeklySituation({
  activeType,
  operations,
  selectedOperation,
  onTypeChange,
  onSelect,
}: {
  activeType: OperationType;
  operations: TheOneOperation[];
  selectedOperation?: TheOneOperation;
  onTypeChange: (type: OperationType) => void;
  onSelect: (operation: TheOneOperation) => void;
}) {
  const metrics = selectedOperation ? weeklyMetricsForOperation(selectedOperation) : [];
  const timeMetrics = metrics.filter((metric) => /(\d{1,2}):(\d{2})/.test(metric.value));
  const graphMetrics = metrics.filter((metric) => !/(\d{1,2}):(\d{2})/.test(metric.value) && metricNumber(metric.value) !== null);

  return (
    <section className="desktop-live-grid desktop-weekly-grid">
      <div className="desktop-live-left">
        <DesktopTypeSwitch activeType={activeType} onTypeChange={onTypeChange} />
        <OperationRail operations={operations} selectedId={selectedOperation?.id} onSelect={onSelect} />
      </div>
      <div className="desktop-live-center">
        {selectedOperation ? (
          <>
            <section className="desktop-focus-card">
              <div>
                <span>{selectedOperation.area}</span>
                <h1>{selectedOperation.name}</h1>
                <em>7일 예측 요약</em>
              </div>
              <strong>{operationConfigs[selectedOperation.type].shortTitle}</strong>
            </section>
            <section className="desktop-weekly-sections">
              {graphMetrics.length > 0 && (
                <div className="desktop-weekly-section">
                  <h2>수치 예측</h2>
                  <div className="desktop-weekly-card-grid">
                    {graphMetrics.slice(0, 8).map((metric, index) => (
                      <WeeklyMetricCard key={metric.label} metric={metric} index={index} />
                    ))}
                  </div>
                </div>
              )}
              {timeMetrics.length > 0 && (
                <div className="desktop-weekly-section">
                  <h2>시간 예측</h2>
                  <div className="desktop-weekly-card-grid is-time">
                    {timeMetrics.slice(0, 8).map((metric, index) => (
                      <WeeklyMetricCard key={metric.label} metric={metric} index={index} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="desktop-empty is-large">
            <Database size={30} />
            <strong>관리자 설정에서 지역을 선택하세요</strong>
          </section>
        )}
      </div>
    </section>
  );
}

function WeeklyMetricCard({ metric, index }: { metric: DesktopMetric; index: number }) {
  const clocks = [...metric.value.matchAll(/(\d{1,2}):(\d{2})/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
  const numeric = metricNumber(metric.value);
  const unit = metricUnit(metric.value);

  if (clocks.length > 0) {
    const first = weeklyTimeValues(clockToMinutes(clocks[0]), metric.label.includes("월") ? 16 : 7);
    const second = clocks[1] ? weeklyTimeValues(clockToMinutes(clocks[1]), metric.label.includes("조") ? 12 : 7) : [];

    return (
      <article className="desktop-weekly-card">
        <header>
          <span>{metric.label}</span>
          <strong>시간 예측</strong>
        </header>
        <div className="desktop-weekly-time-grid">
          {WEEK_LABELS.map((label, dayIndex) => (
            <b key={`${metric.label}-${label}`}>
              <small>{label}</small>
              {minutesToClock(first[dayIndex])}
              {second.length > 0 && <em>{minutesToClock(second[dayIndex])}</em>}
            </b>
          ))}
        </div>
      </article>
    );
  }

  if (numeric !== null) {
    const spread = Math.max(1.5, Math.abs(numeric) * (0.08 + index * 0.01));
    const values = weeklyNumberValues(numeric, spread, Math.min(0, numeric - spread * 1.6), Math.max(100, numeric + spread * 1.8));
    const points = weeklyLinePoints(values);
    const path = points.map((point) => `${point.x},${point.y}`).join(" ");
    const areaPath = `M ${points[0].x},128 L ${path} L ${points[points.length - 1].x},128 Z`;

    return (
      <article className="desktop-weekly-card">
        <header>
          <span>{metric.label}</span>
          <strong>7일 예측</strong>
        </header>
        <div className="desktop-weekly-line-chart">
          <svg viewBox="0 0 320 128" role="img" aria-label={`${metric.label} 주간 예측`}>
            <path d={areaPath} />
            <polyline points={path} />
            {points.map((point, pointIndex) => (
              <g key={`${metric.label}-point-${WEEK_LABELS[pointIndex]}`}>
                <circle cx={point.x} cy={point.y} r={4.5} />
                <text x={point.x} y={Math.max(12, point.y - 9)}>{point.value}{unit}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="desktop-weekly-value-grid">
          {values.map((value, dayIndex) => (
            <b key={`${metric.label}-${WEEK_LABELS[dayIndex]}`}>
              <small>{WEEK_LABELS[dayIndex]}</small>
              <em>{value}{unit}</em>
            </b>
          ))}
        </div>
      </article>
    );
  }

  return (
    <article className="desktop-weekly-card">
      <header>
        <span>{metric.label}</span>
        <strong>주간 관측</strong>
      </header>
      <div className="desktop-weekly-text-grid">
        {WEEK_LABELS.map((label) => (
          <b key={`${metric.label}-${label}`}>
            <small>{label}</small>
            {metric.value}
          </b>
        ))}
      </div>
    </article>
  );
}

function WeatherAnalysisSheet({ operations }: { operations: TheOneOperation[] }) {
  const coastal = operations.filter((operation) => operation.type === "coastal" && operation.coastal).slice(0, 6);
  const first = coastal[0]?.coastal;
  const currentMonth = kstDateParts();
  const [sheetMonth, setSheetMonth] = useState(() => ({ year: currentMonth.year, month: currentMonth.month }));
  const { year, month } = sheetMonth;
  const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1);

  if (!first || coastal.length === 0) return <DesktopEmptySheet label="해안 지역을 선택하면 기상분석표가 표시됩니다." />;

  return (
    <section className="desktop-sheet">
      <div className="desktop-sheet-head">
        <div className="desktop-month-nav">
          <button type="button" onClick={() => setSheetMonth((current) => addMonth(current.year, current.month, -1))} aria-label="이전 달">
            <ChevronLeft size={18} />
          </button>
          <h1>{year}년 {month}월 기상분석표</h1>
          <button type="button" onClick={() => setSheetMonth((current) => addMonth(current.year, current.month, 1))} aria-label="다음 달">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="desktop-sheet-actions">
          <button type="button" onClick={() => setSheetMonth({ year: currentMonth.year, month: currentMonth.month })}>이번 달</button>
          <button type="button" onClick={() => window.print()}>인쇄</button>
        </div>
      </div>
      <div className="desktop-table-scroll">
        <table className="desktop-analysis-table">
          <thead>
            <tr>
              <th rowSpan={2}>일자</th>
              <th rowSpan={2}>음력</th>
              <th rowSpan={2}>BMNT<br />EENT</th>
              <th rowSpan={2}>일출<br />일몰</th>
              <th rowSpan={2}>월출<br />월몰</th>
              <th rowSpan={2}>월광</th>
              <th rowSpan={2}>물때</th>
              {coastal.map((operation) => (
                <th key={operation.id} colSpan={2}>{cleanName(operation)}</th>
              ))}
            </tr>
            <tr>
              {coastal.flatMap((operation) => [
                <th key={`${operation.id}-high`}>만조</th>,
                <th key={`${operation.id}-low`}>간조</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <th>{`${month}.${day}.`}</th>
                <td>{formatLunarDate(year, month, day)}</td>
                <td>{shiftClock(first.bmnt, (day - 1) * -1)}<br />{shiftClock(first.eent, day - 1)}</td>
                <td>{shiftClock(first.sunrise, (day - 1) * -1)}<br />{shiftClock(first.sunset, day - 1)}</td>
                <td>{shiftClock(first.moonrise, (day - 1) * 16)}<br />{shiftClock(first.moonset, (day - 1) * 16)}</td>
                <td>{Math.max(0, Math.min(100, first.moonlightPercent + (day - 1) * 3))}%</td>
                <td>{`${((Number.parseInt(first.tideAge, 10) || 7) + day - 2) % 15 + 1}물`}</td>
                {coastal.flatMap((operation) => {
                  const high = splitClockPair(operation.coastal?.highTide);
                  const low = splitClockPair(operation.coastal?.lowTide);
                  return [
                    <td key={`${operation.id}-${day}-high`}>{high.map((time) => shiftClock(time, (day - 1) * 12)).join(" / ")}</td>,
                    <td key={`${operation.id}-${day}-low`}>{low.map((time) => shiftClock(time, (day - 1) * 12)).join(" / ")}</td>,
                  ];
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AccessAssessmentSheet({ operations }: { operations: TheOneOperation[] }) {
  const coastal = operations.filter((operation) => operation.type === "coastal" && operation.coastal);
  const outbound = coastal.filter((operation) => operation.name.includes("중국") || operation.area.includes("황해")).slice(0, 4);
  const inbound = coastal.filter((operation) => !operation.name.includes("중국")).slice(0, 6);
  const currentDate = kstDateParts();
  const [sheetDate, setSheetDate] = useState(() => currentDate);
  const displayDate = datePartsToUtcDate(sheetDate);

  if (coastal.length === 0) return <DesktopEmptySheet label="해안 지역을 선택하면 판단표가 표시됩니다." />;

  return (
    <section className="desktop-sheet desktop-assessment-sheet">
      <div className="desktop-sheet-head">
        <div className="desktop-month-nav">
          <button
            type="button"
            onClick={() => {
              const previous = new Date(displayDate);
              previous.setUTCDate(previous.getUTCDate() - 1);
              setSheetDate(kstDateParts(previous));
            }}
            aria-label="이전 날짜"
          >
            <ChevronLeft size={18} />
          </button>
          <h1>{sheetDate.year}년 {sheetDate.month}월 {sheetDate.day}일 밀입국 가능성 판단표</h1>
          <button
            type="button"
            onClick={() => {
              const next = new Date(displayDate);
              next.setUTCDate(next.getUTCDate() + 1);
              setSheetDate(kstDateParts(next));
            }}
            aria-label="다음 날짜"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="desktop-sheet-actions">
          <button type="button" onClick={() => setSheetDate(currentDate)}>오늘</button>
          <button type="button" onClick={() => window.print()}>인쇄</button>
        </div>
      </div>
      <AssessmentBlock title="출항 가능여부 평가 지표" rows={outbound.length > 0 ? outbound : coastal.slice(0, 2)} sheetDate={sheetDate} />
      <AssessmentBlock title="접안 가능여부 평가 지표" rows={inbound.length > 0 ? inbound : coastal.slice(0, 4)} sheetDate={sheetDate} />
    </section>
  );
}

function AssessmentBlock({ title, rows, sheetDate }: { title: string; rows: TheOneOperation[]; sheetDate: { year: number; month: number; day: number } }) {
  const dayOffset = daysBetweenParts(kstDateParts(), sheetDate);

  return (
    <section className="desktop-assessment-block">
      <div className="desktop-table-scroll">
        <table className="desktop-assessment-table">
          <thead>
            <tr className="desktop-assessment-title-row">
              <th colSpan={10}>{title}</th>
            </tr>
            <tr>
              <th rowSpan={2}>구분</th>
              <th colSpan={2}>기상</th>
              <th colSpan={2}>해상</th>
              <th colSpan={3}>지역</th>
              <th>환경조건</th>
              <th rowSpan={2}>종합평가</th>
            </tr>
            <tr>
              <th>개황</th>
              <th>기상특보</th>
              <th>앞바다</th>
              <th>먼바다</th>
              <th>물때</th>
              <th>조류</th>
              <th>수온</th>
              <th>시정조건</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((operation, rowIndex) => {
              const data = operation.coastal;
              if (!data) return null;
              const rowOffset = dayOffset + rowIndex * 0.7;
              const hasObservedForecast = dayOffset <= 0;
              const weather = hasObservedForecast ? dateAdjustedWeather(operation.coastalEnvironment?.weatherStatus ?? "맑음", Math.round(rowOffset)) : "";
              const weatherAlert = hasObservedForecast ? dateAdjustedAlert(data.weatherAlert, dayOffset) : "";
              const nearshore = dateAdjustedNumber(data.nearshoreWaveHeightM, rowOffset, 0.18, 0, 5);
              const offshore = dateAdjustedNumber(data.offshoreWaveHeightM, rowOffset, 0.24, 0, 7);
              const currentSpeed = dateAdjustedNumber(data.currentSpeedKt, rowOffset, 0.09, 0, 4);
              const waterTemp = dateAdjustedNumber(data.waterTempC, rowOffset, 0.25, -3, 35);
              const visibility = dateAdjustedNumber(data.visibilityKm, rowOffset, 0.6, 0.2, 30);

              return (
                <tr key={`${title}-${operation.id}`}>
                  <th>{cleanName(operation)}</th>
                  <td>{weather}</td>
                  <td>{weatherAlert}</td>
                  <td>{nearshore}m<br />{shiftedClockPair(data.highTide, dayOffset)}</td>
                  <td>{offshore}m<br />{shiftedClockPair(data.lowTide, dayOffset)}</td>
                  <td>{dateAdjustedTideAge(data.tideAge, dayOffset)}</td>
                  <td>{data.currentDirection} {currentSpeed}kt</td>
                  <td>{waterTemp}℃</td>
                  <td>{visibility}km</td>
                  <td />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DesktopEmptySheet({ label }: { label: string }) {
  return (
    <section className="desktop-empty is-large">
      <Database size={32} />
      <strong>{label}</strong>
    </section>
  );
}

function DesktopAdminPinGate({ adminPin, onUnlock }: { adminPin: string; onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin === adminPin) {
      setError("");
      setPin("");
      onUnlock();
      return;
    }

    setError("PIN 번호가 일치하지 않습니다.");
  }

  return (
    <section className="desktop-admin-gate">
      <div className="desktop-admin-lock-card">
        <span className="desktop-admin-lock-icon">
          <LockKeyhole size={34} />
        </span>
        <div>
          <em>관리자 인증</em>
          <h2>관리자 설정</h2>
          <p>작전지역 선택과 시스템 설정 변경은 관리자 PIN 확인 후 가능합니다.</p>
        </div>
        <form onSubmit={handleSubmit} className="desktop-admin-pin-form">
          <label htmlFor="desktop-admin-pin">PIN 번호</label>
          <input
            id="desktop-admin-pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
              setError("");
            }}
            placeholder="0000"
            autoFocus
          />
          {error && <strong role="alert">{error}</strong>}
          <button type="submit" disabled={pin.length !== 4}>관리자 설정 열기</button>
        </form>
      </div>
    </section>
  );
}

function AdminPinPanel({
  adminPin,
  onChangePin,
  onLock,
}: {
  adminPin: string;
  onChangePin: (pin: string) => void;
  onLock: () => void;
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function cleanPin(value: string) {
    return value.replace(/\D/g, "").slice(0, 4);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (currentPin !== adminPin) {
      setIsError(true);
      setMessage("현재 PIN 번호가 일치하지 않습니다.");
      return;
    }

    if (!/^\d{4}$/.test(nextPin)) {
      setIsError(true);
      setMessage("새 PIN 번호는 숫자 4자리로 입력하세요.");
      return;
    }

    if (nextPin !== confirmPin) {
      setIsError(true);
      setMessage("새 PIN 번호 확인이 일치하지 않습니다.");
      return;
    }

    onChangePin(nextPin);
    setCurrentPin("");
    setNextPin("");
    setConfirmPin("");
    setIsError(false);
    setMessage("관리자 PIN 번호가 변경되었습니다.");
  }

  return (
    <div className="desktop-panel desktop-admin-security-panel">
      <div>
        <h2>관리자 보안</h2>
        <p>초기 PIN 번호는 0000이며, 운용 전 반드시 변경하는 것을 권장합니다.</p>
      </div>
      <form onSubmit={handleSubmit} className="desktop-admin-change-form">
        <label>
          현재 PIN
          <input type="password" inputMode="numeric" maxLength={4} value={currentPin} onChange={(event) => setCurrentPin(cleanPin(event.target.value))} placeholder="0000" />
        </label>
        <label>
          새 PIN
          <input type="password" inputMode="numeric" maxLength={4} value={nextPin} onChange={(event) => setNextPin(cleanPin(event.target.value))} placeholder="숫자 4자리" />
        </label>
        <label>
          새 PIN 확인
          <input type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(cleanPin(event.target.value))} placeholder="다시 입력" />
        </label>
        <button type="submit">
          <KeyRound size={16} />
          PIN 변경
        </button>
        <button type="button" className="is-ghost" onClick={onLock}>관리자 잠금</button>
      </form>
      {message && <strong className={cx("desktop-admin-pin-message", isError && "is-error")}>{message}</strong>}
    </div>
  );
}

function DesktopSettings({
  catalog,
  selectedIds,
  activeType,
  adminPin,
  onTypeChange,
  onToggle,
  onClear,
  onDefault,
  onSelectAllType,
  onChangePin,
  onLock,
}: {
  catalog: TheOneOperation[];
  selectedIds: string[];
  activeType: OperationType;
  adminPin: string;
  onTypeChange: (type: OperationType) => void;
  onToggle: (id: string) => void;
  onClear: () => void;
  onDefault: () => void;
  onSelectAllType: () => void;
  onChangePin: (pin: string) => void;
  onLock: () => void;
}) {
  const candidates = catalog.filter((operation) => operation.type === activeType);
  const activeSelectedCount = candidates.filter((operation) => selectedIds.includes(operation.id)).length;
  const grouped = new Map<string, Map<string, TheOneOperation[]>>();

  candidates.forEach((operation) => {
    const parts = catalogLocationParts(operation);
    const province = grouped.get(parts.province) ?? new Map<string, TheOneOperation[]>();
    province.set(parts.city, [...(province.get(parts.city) ?? []), operation]);
    grouped.set(parts.province, province);
  });

  return (
    <section className="desktop-settings-grid">
      <div className="desktop-panel desktop-settings-toolbar">
        <div>
          <h2>지역 설정</h2>
          <p>{operationConfigs[activeType].title} {activeSelectedCount}개 선택</p>
        </div>
        <DesktopTypeSwitch activeType={activeType} onTypeChange={onTypeChange} />
        <div className="desktop-settings-actions">
          <button type="button" onClick={onSelectAllType}>현재 분류 전체</button>
          <button type="button" onClick={onDefault}>기본값</button>
          <button type="button" onClick={onClear}>전체 초기화</button>
        </div>
      </div>
      <AdminPinPanel adminPin={adminPin} onChangePin={onChangePin} onLock={onLock} />
      <div className="desktop-catalog-panel">
        {[...grouped.entries()].map(([provinceName, cityMap]) => {
          const provinceItems = [...cityMap.values()].flat();

          return (
          <details key={provinceName} open={provinceItems.some((operation) => selectedIds.includes(operation.id))}>
            <summary>
              <strong>{provinceName}</strong>
              <span>{provinceItems.filter((operation) => selectedIds.includes(operation.id)).length}/{provinceItems.length}</span>
            </summary>
            <div className="desktop-catalog-city-list">
              {[...cityMap.entries()].map(([cityName, items]) => (
                <details key={`${provinceName}-${cityName}`} open={items.some((operation) => selectedIds.includes(operation.id))}>
                  <summary>
                    <strong>{cityName}</strong>
                    <span>{items.filter((operation) => selectedIds.includes(operation.id)).length}/{items.length}</span>
                  </summary>
                  <div className="desktop-catalog-grid">
                    {items.map((operation) => {
                      const checked = selectedIds.includes(operation.id);
                      const Icon = operationIcon(operation.type);
                      const parts = catalogLocationParts(operation);

                      return (
                        <button key={operation.id} type="button" className={checked ? "is-selected" : ""} onClick={() => onToggle(operation.id)}>
                          <Icon size={18} />
                          <span>{cleanName(operation)}</span>
                          <em>{parts.detail}</em>
                          {checked && <Check size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </details>
        );
        })}
      </div>
      <div className="desktop-panel desktop-source-panel">
        <h2>저작권 표시</h2>
        <div className="desktop-source-grid">
          <div className="desktop-credit-card is-wide">
            <Copyright size={20} />
            <span>공식 수신 중</span>
            <strong>기상청 초단기실황/예보 · 기상특보 · ASOS · 한국천문연구원 · 국립해양조사원 · 에어코리아 · 브이월드</strong>
            <em>API 키는 GitHub Secrets에서만 사용하고 화면은 변환된 JSON 캐시만 읽습니다.</em>
          </div>
          <div className="desktop-credit-card">
            <Cloud size={20} />
            <span>특보/속보</span>
            <strong>기상청 기상특보 조회서비스</strong>
            <em>GitHub Actions 제한에 맞춰 5분 간격으로 갱신합니다.</em>
          </div>
          <div className="desktop-credit-card">
            <Database size={20} />
            <span>일반 실황</span>
            <strong>기상청 · ASOS · 조류/수온/조위 최신 · 에어코리아</strong>
            <em>기온, 바람, 강수, 시정, 대기질 등은 30분 간격으로 갱신합니다.</em>
          </div>
          <div className="desktop-credit-card">
            <Moon size={20} />
            <span>천문/조석</span>
            <strong>한국천문연구원 출몰시각 · 국립해양조사원 조석예보</strong>
            <em>일출, 일몰, 월출, 월몰, BMNT, EENT, 만조, 간조는 하루 2회 갱신합니다.</em>
          </div>
          <div className="desktop-credit-card">
            <MapIcon size={20} />
            <span>지도자료</span>
            <strong>브이월드 · Windy · 기상청 날씨누리 · 해양기상정보포털</strong>
            <em>지도 화면은 각 제공기관의 원본 화면과 이용 정책을 따릅니다.</em>
          </div>
          <div className="desktop-credit-card is-muted is-wide">
            <Waves size={20} />
            <span>대체 표시 중</span>
            <strong>해양기상관측자료, AWS, 고층기상 등 기관 승인 전 자료</strong>
            <em>파고/파주기/먼바다 파고, 상층풍, 돌풍, 난류, 운고, 체감/WBGT는 승인 완료 전까지 공식 수신값과 기상식 기반 보정값으로 표시합니다.</em>
          </div>
        </div>
        <div className="desktop-credit-card is-maker">
          <Users size={20} />
          <span>제작</span>
          <strong>제32보병사단 AI TF</strong>
          <em>대위 정동호 · 9급 전재문 · 병장 김지성 · 병장 김준우 · 상병 김민규 · 일병 임다민 · 일병 전호성</em>
          <b>Think and Make AI for Field Unit</b>
        </div>
      </div>
    </section>
  );
}
