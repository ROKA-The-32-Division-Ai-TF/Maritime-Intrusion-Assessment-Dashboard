"use client";

import {
  FormEvent,
  Fragment,
  KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import {
  Cloud,
  CloudRain,
  CloudSun,
  KeyRound,
  LockKeyhole,
  Printer,
  RefreshCcw,
  Settings,
  Sun,
  UserRound,
  X,
} from "lucide-react";

const KMA_SERVICE_KEY = process.env.NEXT_PUBLIC_KMA_SERVICE_KEY || "";
const KHOA_SERVICE_KEY = process.env.NEXT_PUBLIC_KHOA_SERVICE_KEY || "";
const NIFS_SERVICE_KEY = process.env.NEXT_PUBLIC_NIFS_SERVICE_KEY || "";
const KASI_SERVICE_KEY = process.env.NEXT_PUBLIC_KASI_SERVICE_KEY || "";
const KMA_OCEAN_URL =
  process.env.NEXT_PUBLIC_KMA_OCEAN_API_URL ||
  "https://apis.data.go.kr/1360000/OceanInfoService/getWhBuoy";
const KMA_WARNING_URL =
  process.env.NEXT_PUBLIC_KMA_WARNING_API_URL ||
  "https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList";
const KHOA_TIDE_URL =
  process.env.NEXT_PUBLIC_KHOA_TIDE_API_URL ||
  "https://www.khoa.go.kr/api/oceangrid/tideObsPreTab/search.do";
const KHOA_CURRENT_URL =
  process.env.NEXT_PUBLIC_KHOA_CURRENT_API_URL ||
  "https://www.khoa.go.kr/api/oceangrid/fcTidalCurrent/search.do";
const NIFS_RISA_URL =
  process.env.NEXT_PUBLIC_NIFS_RISA_API_URL || "https://www.nifs.go.kr/OpenAPI_json";
const KASI_RISE_SET_URL =
  process.env.NEXT_PUBLIC_KASI_RISE_SET_API_URL ||
  "https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo";
const WINDY_POINT_FORECAST_KEY =
  process.env.NEXT_PUBLIC_WINDY_POINT_FORECAST_KEY ||
  process.env.NEXT_PUBLIC_WINDY_API_KEY ||
  "";
const WINDY_POINT_FORECAST_URL = "https://api.windy.com/api/point-forecast/v2";
const PASSWORD_STORAGE_KEY = "maritime-dashboard-password";
const HARBOR_STORAGE_KEY = "maritime-dashboard-harbors";
const WINDY_EMBED_BASE_URL = "https://embed.windy.com/embed2.html";
const OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

type RegionKey = "dangjin" | "taean" | "boryeong" | "seocheon";
type WeatherKind = "sun" | "partly" | "cloud" | "rain";
type ApiState = "live" | "fallback";
type JsonRecord = Record<string, unknown>;

type HarborOption = {
  harborName: string;
  lat: number;
  lon: number;
  tideCode: string;
  currentCode: string;
  kmaHint: string;
  nifsHint: string;
  airTemp: string;
  badatimeUrl: string;
  defaultWeather: WeatherKind;
  fixed: MarineRow;
};

type Region = {
  key: RegionKey;
  name: string;
  lat: number;
  lon: number;
  tideCode: string;
  currentCode: string;
  kmaHint: string;
  nifsHint: string;
  airTemp: string;
  badatimeUrl: string;
  fixed: MarineRow;
  defaultWeather: WeatherKind;
  harbors: HarborOption[];
};

type ResolvedRegion = Region & {
  harborName: string;
};

type WeatherNow = {
  kind: WeatherKind;
  label: string;
  temperature: string;
  windSpeed: string;
  windDirection: string;
  precipitation: string;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  updatedAt: string;
  state: ApiState;
};

type HourlyWeather = {
  time: string;
  kind: WeatherKind;
  label: string;
  temperature: string;
  windSpeed: string;
  windDirection: string;
  wave: string;
  waveDirection: string;
  wavePeriod: string;
  precipitationProbability: string;
  precipitation: string;
  humidity: string;
};

type MarineRow = {
  alert: string;
  overview: string;
  wave: string;
  tideAge: string;
  lowTide: string;
  lowTide2?: string;
  highTide: string;
  highTide2?: string;
  waterTemp: string;
  windSpeed: string;
  windDirection: string;
  current: string;
};

type KmaObservation = {
  kind: WeatherKind;
  overview: string;
  airTemp?: string;
  wave?: string;
  waterTemp?: string;
  windSpeed?: string;
  windDirection?: string;
  updatedAt: string;
};

type OfficialBundle = {
  weather: WeatherNow;
  hourly: HourlyWeather[];
  row: MarineRow;
};

type OpenMeteoWeatherResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    precipitation?: number;
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    relative_humidity_2m?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
  };
};

type OpenMeteoMarineResponse = {
  current?: {
    wave_height?: number;
    sea_surface_temperature?: number;
  };
  hourly?: {
    time?: string[];
    wave_height?: number[];
    wave_direction?: number[];
    wave_period?: number[];
  };
};

type WindyPointResponse = {
  ts?: number[];
  units?: Record<string, string | null>;
  "temp-surface"?: Array<number | null>;
  "rh-surface"?: Array<number | null>;
  "past3hprecip-surface"?: Array<number | null>;
  "wind_u-surface"?: Array<number | null>;
  "wind_v-surface"?: Array<number | null>;
  "waves_height-surface"?: Array<number | null>;
  "waves_period-surface"?: Array<number | null>;
  "waves_direction-surface"?: Array<number | null>;
};

const regions: Region[] = [
  {
    key: "dangjin",
    name: "당진",
    lat: 36.96,
    lon: 126.84,
    tideCode: "DT_0002",
    currentCode: "03PT-1",
    kmaHint: "평택",
    nifsHint: "평택",
    airTemp: "16.2℃",
    badatimeUrl: "https://www.badatime.com/370.html",
    defaultWeather: "partly",
    fixed: {
      alert: "없음",
      overview: "구름",
      wave: "0.6m",
      tideAge: "7물",
      lowTide: "04:18",
      highTide: "10:42",
      waterTemp: "14.8℃",
      windSpeed: "3.2m/s",
      windDirection: "북서",
      current: "0.4m/s",
    },
    harbors: [
      {
        harborName: "장고항",
        lat: 36.96,
        lon: 126.84,
        tideCode: "DT_0002",
        currentCode: "03PT-1",
        kmaHint: "평택",
        nifsHint: "평택",
        airTemp: "16.2℃",
        badatimeUrl: "https://www.badatime.com/370.html",
        defaultWeather: "partly",
        fixed: {
          alert: "없음",
          overview: "구름",
          wave: "0.6m",
          tideAge: "7물",
          lowTide: "04:18",
          highTide: "10:42",
          waterTemp: "14.8℃",
          windSpeed: "3.2m/s",
          windDirection: "북서",
          current: "0.4m/s",
        },
      },
      {
        harborName: "왜목항",
        lat: 37.04,
        lon: 126.53,
        tideCode: "DT_0002",
        currentCode: "03PT-1",
        kmaHint: "당진",
        nifsHint: "당진",
        airTemp: "16.0℃",
        badatimeUrl: "https://www.badatime.com/180.html",
        defaultWeather: "partly",
        fixed: {
          alert: "없음",
          overview: "구름",
          wave: "0.5m",
          tideAge: "7물",
          lowTide: "04:11",
          highTide: "10:36",
          waterTemp: "14.6℃",
          windSpeed: "3.0m/s",
          windDirection: "북서",
          current: "0.3m/s",
        },
      },
    ],
  },
  {
    key: "taean",
    name: "태안",
    lat: 36.75,
    lon: 126.29,
    tideCode: "DT_0050",
    currentCode: "07TA03",
    kmaHint: "태안",
    nifsHint: "태안",
    airTemp: "15.7℃",
    badatimeUrl: "https://www.badatime.com/1410.html",
    defaultWeather: "sun",
    fixed: {
      alert: "없음",
      overview: "맑음",
      wave: "1.3m",
      tideAge: "8물",
      lowTide: "05:04",
      highTide: "11:27",
      waterTemp: "13.9℃",
      windSpeed: "6.8m/s",
      windDirection: "서",
      current: "0.7m/s",
    },
    harbors: [
      {
        harborName: "안흥항",
        lat: 36.75,
        lon: 126.29,
        tideCode: "DT_0050",
        currentCode: "07TA03",
        kmaHint: "태안",
        nifsHint: "태안",
        airTemp: "15.7℃",
        badatimeUrl: "https://www.badatime.com/1410.html",
        defaultWeather: "sun",
        fixed: {
          alert: "없음",
          overview: "맑음",
          wave: "1.3m",
          tideAge: "8물",
          lowTide: "05:04",
          highTide: "11:27",
          waterTemp: "13.9℃",
          windSpeed: "6.8m/s",
          windDirection: "서",
          current: "0.7m/s",
        },
      },
      {
        harborName: "만리포항",
        lat: 36.78,
        lon: 126.14,
        tideCode: "DT_0050",
        currentCode: "07TA03",
        kmaHint: "태안",
        nifsHint: "태안",
        airTemp: "15.4℃",
        badatimeUrl: "https://www.badatime.com/631.html",
        defaultWeather: "sun",
        fixed: {
          alert: "없음",
          overview: "맑음",
          wave: "1.5m",
          tideAge: "8물",
          lowTide: "05:09",
          highTide: "11:31",
          waterTemp: "13.6℃",
          windSpeed: "7.1m/s",
          windDirection: "서",
          current: "0.8m/s",
        },
      },
    ],
  },
  {
    key: "boryeong",
    name: "보령",
    lat: 36.33,
    lon: 126.61,
    tideCode: "DT_0025",
    currentCode: "07KS01",
    kmaHint: "보령",
    nifsHint: "보령",
    airTemp: "16.0℃",
    badatimeUrl: "https://www.badatime.com/126.html",
    defaultWeather: "sun",
    fixed: {
      alert: "없음",
      overview: "맑음",
      wave: "0.8m",
      tideAge: "7물",
      lowTide: "04:44",
      highTide: "11:09",
      waterTemp: "14.5℃",
      windSpeed: "4.1m/s",
      windDirection: "북",
      current: "0.5m/s",
    },
    harbors: [
      {
        harborName: "대천항",
        lat: 36.33,
        lon: 126.61,
        tideCode: "DT_0025",
        currentCode: "07KS01",
        kmaHint: "보령",
        nifsHint: "보령",
        airTemp: "16.0℃",
        badatimeUrl: "https://www.badatime.com/126.html",
        defaultWeather: "sun",
        fixed: {
          alert: "없음",
          overview: "맑음",
          wave: "0.8m",
          tideAge: "7물",
          lowTide: "04:44",
          highTide: "11:09",
          waterTemp: "14.5℃",
          windSpeed: "4.1m/s",
          windDirection: "북",
          current: "0.5m/s",
        },
      },
      {
        harborName: "오천항",
        lat: 36.44,
        lon: 126.52,
        tideCode: "DT_0025",
        currentCode: "07KS01",
        kmaHint: "보령",
        nifsHint: "보령",
        airTemp: "15.9℃",
        badatimeUrl: "https://www.badatime.com/355.html",
        defaultWeather: "sun",
        fixed: {
          alert: "없음",
          overview: "맑음",
          wave: "0.7m",
          tideAge: "7물",
          lowTide: "04:39",
          highTide: "11:03",
          waterTemp: "14.3℃",
          windSpeed: "3.8m/s",
          windDirection: "북",
          current: "0.4m/s",
        },
      },
    ],
  },
  {
    key: "seocheon",
    name: "서천",
    lat: 36.08,
    lon: 126.69,
    tideCode: "DT_0051",
    currentCode: "12JB11",
    kmaHint: "서천",
    nifsHint: "서천",
    airTemp: "16.4℃",
    badatimeUrl: "https://www.badatime.com/121.html",
    defaultWeather: "sun",
    fixed: {
      alert: "없음",
      overview: "맑음",
      wave: "0.7m",
      tideAge: "6물",
      lowTide: "04:31",
      highTide: "10:53",
      waterTemp: "15.1℃",
      windSpeed: "3.7m/s",
      windDirection: "북동",
      current: "0.3m/s",
    },
    harbors: [
      {
        harborName: "장항항",
        lat: 36.08,
        lon: 126.69,
        tideCode: "DT_0051",
        currentCode: "12JB11",
        kmaHint: "서천",
        nifsHint: "서천",
        airTemp: "16.4℃",
        badatimeUrl: "https://www.badatime.com/121.html",
        defaultWeather: "sun",
        fixed: {
          alert: "없음",
          overview: "맑음",
          wave: "0.7m",
          tideAge: "6물",
          lowTide: "04:31",
          highTide: "10:53",
          waterTemp: "15.1℃",
          windSpeed: "3.7m/s",
          windDirection: "북동",
          current: "0.3m/s",
        },
      },
      {
        harborName: "홍원항",
        lat: 36.14,
        lon: 126.50,
        tideCode: "DT_0051",
        currentCode: "12JB11",
        kmaHint: "서천",
        nifsHint: "서천",
        airTemp: "16.1℃",
        badatimeUrl: "https://www.badatime.com/523/tide",
        defaultWeather: "sun",
        fixed: {
          alert: "없음",
          overview: "맑음",
          wave: "0.8m",
          tideAge: "6물",
          lowTide: "04:28",
          highTide: "10:49",
          waterTemp: "14.9℃",
          windSpeed: "3.9m/s",
          windDirection: "북동",
          current: "0.4m/s",
        },
      },
    ],
  },
];

const columns = [
  "구분",
  "특보",
  "개황",
  "파고",
  "물때",
  "간조",
  "만조",
  "수온",
  "풍향",
  "풍속",
  "조류",
];

const astronomyLocations: Record<RegionKey, string> = {
  dangjin: "평택",
  taean: "태안",
  boryeong: "보령",
  seocheon: "서천",
};

function defaultHarborSelections(): Record<RegionKey, string> {
  return Object.fromEntries(
    regions.map((region) => [region.key, region.harbors[0]?.harborName || region.name]),
  ) as Record<RegionKey, string>;
}

function storedHarborSelections() {
  if (typeof window === "undefined") {
    return defaultHarborSelections();
  }

  try {
    const stored = window.localStorage.getItem(HARBOR_STORAGE_KEY);
    return stored
      ? ({ ...defaultHarborSelections(), ...JSON.parse(stored) } as Record<RegionKey, string>)
      : defaultHarborSelections();
  } catch {
    return defaultHarborSelections();
  }
}

function resolveRegion(region: Region, harborName: string | undefined): ResolvedRegion {
  const harbor =
    region.harbors.find((option) => option.harborName === harborName) || region.harbors[0];

  if (!harbor) {
    return {
      ...region,
      harborName: region.name,
    };
  }

  return {
    ...region,
    ...harbor,
    name: region.name,
    harborName: harbor.harborName,
  };
}

function directionLabel(degrees?: number | null) {
  if (degrees === undefined || degrees === null || Number.isNaN(degrees)) {
    return "-";
  }

  const normalized = ((degrees % 360) + 360) % 360;
  const labels = [
    "북",
    "북북동",
    "북동",
    "동북동",
    "동",
    "동남동",
    "남동",
    "남남동",
    "남",
    "남남서",
    "남서",
    "서남서",
    "서",
    "서북서",
    "북서",
    "북북서",
  ];
  return labels[Math.round(normalized / 22.5) % labels.length];
}

function weatherFromOverview(text: string | undefined, fallback: WeatherKind) {
  const label = text?.trim() || (fallback === "rain" ? "비" : fallback === "sun" ? "맑음" : "구름");

  if (/[비눈우박소나기강수]/.test(label)) {
    return { kind: "rain" as const, label };
  }

  if (/맑/.test(label)) {
    return { kind: "sun" as const, label };
  }

  if (/구름|부분|조금/.test(label)) {
    return { kind: "partly" as const, label };
  }

  return { kind: fallback === "sun" ? ("sun" as const) : ("cloud" as const), label };
}

function weatherFromCode(code?: number) {
  if (code === undefined) {
    return { kind: "cloud" as const, label: "조회중" };
  }

  if ([0, 1].includes(code)) {
    return { kind: "sun" as const, label: "맑음" };
  }

  if ([2, 3].includes(code)) {
    return { kind: "partly" as const, label: "구름" };
  }

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 99)) {
    return { kind: "rain" as const, label: "비" };
  }

  return { kind: "cloud" as const, label: "흐림" };
}

function fallbackWeather(region: Region): WeatherNow {
  const weather = weatherFromOverview(region.fixed.overview, region.defaultWeather);
  return {
    ...weather,
    temperature: region.airTemp,
    windSpeed: region.fixed.windSpeed,
    windDirection: region.fixed.windDirection,
    precipitation: "-",
    sunrise: "06:02",
    sunset: "19:24",
    moonrise: "23:18",
    moonset: "08:42",
    updatedAt: "고정값",
    state: "fallback",
  };
}

function formatKstHour(date: Date) {
  return kstParts(date).hour;
}

function formatTableReferenceTime(date: Date) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}년 ${values.month}월 ${values.day}일 ${values.hour}시 기준`;
}

function fallbackHourly(region: Region): HourlyWeather[] {
  const weather = weatherFromOverview(region.fixed.overview, region.defaultWeather);
  const now = new Date();

  return Array.from({ length: 10 }, (_, index) => ({
    time: `${formatKstHour(new Date(now.getTime() + index * 60 * 60 * 1000))}:00`,
    kind: weather.kind,
    label: weather.label,
    temperature: region.airTemp,
    windSpeed: region.fixed.windSpeed,
    windDirection: region.fixed.windDirection,
    wave: region.fixed.wave,
    waveDirection: region.fixed.windDirection,
    wavePeriod: "-",
    precipitationProbability: "0%",
    precipitation: "0.0mm",
    humidity: "-",
  }));
}

function WeatherMark({ type }: { type: WeatherKind }) {
  const common = { size: 42, strokeWidth: 2.5, "aria-hidden": true };

  if (type === "rain") {
    return <CloudRain {...common} className="weather-icon rain" />;
  }

  if (type === "partly") {
    return <CloudSun {...common} className="weather-icon partly" />;
  }

  if (type === "cloud") {
    return <Cloud {...common} className="weather-icon cloud" />;
  }

  return <Sun {...common} className="weather-icon sun" />;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPath(value: unknown, path: string[]) {
  return path.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), value);
}

function extractItems(payload: unknown): JsonRecord[] {
  const candidates = [
    readPath(payload, ["response", "body", "items", "item"]),
    readPath(payload, ["body", "items", "item"]),
    readPath(payload, ["result", "data"]),
    readPath(payload, ["items", "item"]),
    readPath(payload, ["data"]),
    readPath(payload, ["item"]),
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }

    if (isRecord(candidate)) {
      return [candidate];
    }
  }

  return [];
}

function firstValue(record: JsonRecord | undefined, keys: string[]) {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function stringValue(record: JsonRecord | undefined, keys: string[]) {
  const value = firstValue(record, keys);
  return value === undefined ? undefined : String(value).trim();
}

function numberValue(record: JsonRecord | undefined, keys: string[]) {
  const value = firstValue(record, keys);

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : undefined;
  }

  return undefined;
}

function formatUnit(value: number | undefined, unit: string) {
  return value === undefined || Number.isNaN(value) ? undefined : `${value.toFixed(1)}${unit}`;
}

function formatOptionalUnit(value: number | null | undefined, unit: string, fractionDigits = 1) {
  return value === undefined || value === null || Number.isNaN(value)
    ? "-"
    : `${value.toFixed(fractionDigits)}${unit}`;
}

function formatPercent(value: number | null | undefined) {
  return value === undefined || value === null || Number.isNaN(value)
    ? "-"
    : `${Math.round(value)}%`;
}

function formatTemperature(value: number | null | undefined) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }

  const celsius = value > 100 ? value - 273.15 : value;
  return `${celsius.toFixed(1)}℃`;
}

function windVectorToSpeedDirection(u?: number | null, v?: number | null) {
  if (u === undefined || u === null || v === undefined || v === null) {
    return undefined;
  }

  const speed = Math.hypot(u, v);
  const fromDegrees = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;

  return {
    speed,
    direction: directionLabel(fromDegrees),
  };
}

function directionFromValue(value: unknown) {
  if (typeof value === "number") {
    return directionLabel(value);
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value.trim() : directionLabel(numeric);
  }

  return undefined;
}

function createUrl(base: string, params: Record<string, string | undefined>) {
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

function windyDirectUrl(region: ResolvedRegion | Region) {
  return `https://www.windy.com/?${region.lat.toFixed(3)},${region.lon.toFixed(3)},8`;
}

function windyEmbedUrl(region: ResolvedRegion | Region) {
  return createUrl(WINDY_EMBED_BASE_URL, {
    lat: region.lat.toFixed(3),
    lon: region.lon.toFixed(3),
    detailLat: region.lat.toFixed(3),
    detailLon: region.lon.toFixed(3),
    zoom: "8",
    level: "surface",
    overlay: "wind",
    product: "ecmwf",
    menu: "",
    message: "",
    marker: "true",
    calendar: "",
    pressure: "true",
    type: "map",
    location: "coordinates",
    detail: "",
    metricWind: "m/s",
    metricTemp: "°C",
    radarRange: "-1",
  }).toString();
}

async function fetchJson(url: URL) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });

    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    return response.json() as Promise<unknown>;
  } finally {
    window.clearTimeout(timer);
  }
}

async function postJson(url: string, body: JsonRecord) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    return response.json() as Promise<unknown>;
  } finally {
    window.clearTimeout(timer);
  }
}

function kstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>;
}

function kstYmd(date = new Date()) {
  const parts = kstParts(date);
  return `${parts.year}${parts.month}${parts.day}`;
}

function kstYmdh(date = new Date()) {
  const parts = kstParts(date);
  return `${parts.year}${parts.month}${parts.day}${parts.hour}`;
}

function formatClock(value: string | undefined) {
  const match = value?.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : undefined;
}

function formatCompactClock(value: string | undefined) {
  const digits = value?.replace(/\D/g, "");

  if (!digits) {
    return undefined;
  }

  const padded = digits.padStart(4, "0").slice(-4);
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
}

function addHours(clock: string, hours: number) {
  const match = clock.match(/(\d{2}):(\d{2})/);

  if (!match) {
    return "-";
  }

  const total = (Number(match[1]) * 60 + Number(match[2]) + hours * 60) % (24 * 60);
  const normalized = total < 0 ? total + 24 * 60 : total;
  const hh = String(Math.floor(normalized / 60)).padStart(2, "0");
  const mm = String(normalized % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseKstDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const timestamp = Date.parse(`${normalized}+09:00`);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function nearestByTime(items: JsonRecord[], timeKeys: string[]) {
  const now = Date.now();
  return items.reduce<JsonRecord | undefined>((nearest, item) => {
    const itemTime = parseKstDate(stringValue(item, timeKeys));

    if (itemTime === undefined) {
      return nearest;
    }

    const nearestTime = parseKstDate(stringValue(nearest, timeKeys));
    return nearestTime === undefined || Math.abs(itemTime - now) < Math.abs(nearestTime - now)
      ? item
      : nearest;
  }, items[0]);
}

function distanceScore(region: Region, item: JsonRecord) {
  const lat = numberValue(item, ["lat", "obs_lat", "latitude"]);
  const lon = numberValue(item, ["lon", "obs_lon", "longitude"]);

  if (lat !== undefined && lon !== undefined) {
    return Math.hypot(region.lat - lat, region.lon - lon);
  }

  const station = stringValue(item, ["name", "obs_post_name", "stationName", "stnName"]);

  if (station?.includes(region.name) || station?.includes(region.kmaHint)) {
    return 0.01;
  }

  return Number.POSITIVE_INFINITY;
}

function nearestObservation(items: JsonRecord[], region: Region) {
  return items.reduce<JsonRecord | undefined>((nearest, item) => {
    if (!nearest) {
      return item;
    }

    return distanceScore(region, item) < distanceScore(region, nearest) ? item : nearest;
  }, undefined);
}

function hourlyFromOpenMeteo(payload: OpenMeteoWeatherResponse, region: Region) {
  const hourly = payload.hourly;

  if (!hourly?.time?.length) {
    return fallbackHourly(region);
  }

  const startTime = Date.now() - 30 * 60 * 1000;
  const items = hourly.time
    .map<HourlyWeather | undefined>((time, index) => {
      const timestamp = parseKstDate(time);

      if (timestamp !== undefined && timestamp < startTime) {
        return undefined;
      }

      const weather = weatherFromCode(hourly.weather_code?.[index]);
      const temperature = hourly.temperature_2m?.[index];
      const windSpeed = hourly.wind_speed_10m?.[index];

      return {
        time: formatClock(time) || time.replace("T", " ").slice(-5),
        kind: weather.kind,
        label: weather.label,
        temperature:
          typeof temperature === "number" ? `${temperature.toFixed(1)}℃` : region.airTemp,
        windSpeed:
          typeof windSpeed === "number" ? `${windSpeed.toFixed(1)}m/s` : region.fixed.windSpeed,
        windDirection: directionLabel(hourly.wind_direction_10m?.[index]) || region.fixed.windDirection,
        wave: region.fixed.wave,
        waveDirection: region.fixed.windDirection,
        wavePeriod: "-",
        precipitationProbability: formatPercent(hourly.precipitation_probability?.[index]),
        precipitation: formatOptionalUnit(hourly.precipitation?.[index], "mm"),
        humidity: formatPercent(hourly.relative_humidity_2m?.[index]),
      };
    })
    .filter((item): item is HourlyWeather => Boolean(item))
    .slice(0, 10);

  return items.length ? items : fallbackHourly(region);
}

async function fetchOpenMeteoWeatherBundle(
  region: Region,
): Promise<{ weather: WeatherNow; hourly: HourlyWeather[] }> {
  const payload = (await fetchJson(
    createUrl(OPEN_METEO_WEATHER_URL, {
      latitude: String(region.lat),
      longitude: String(region.lon),
      current: "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation",
      daily: "sunrise,sunset",
      hourly:
        "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,precipitation_probability,precipitation",
      timezone: "Asia/Seoul",
      wind_speed_unit: "ms",
      forecast_days: "2",
    }),
  )) as OpenMeteoWeatherResponse;
  const current = payload.current;
  const weather = weatherFromCode(current?.weather_code);
  const fallback = fallbackWeather(region);

  return {
    weather: {
      ...weather,
      temperature:
        typeof current?.temperature_2m === "number"
          ? `${current.temperature_2m.toFixed(1)}℃`
          : fallback.temperature,
      windSpeed:
        typeof current?.wind_speed_10m === "number"
          ? `${current.wind_speed_10m.toFixed(1)}m/s`
          : fallback.windSpeed,
      windDirection: directionLabel(current?.wind_direction_10m) || fallback.windDirection,
      precipitation:
        typeof current?.precipitation === "number" ? `${current.precipitation.toFixed(1)}mm` : "-",
      sunrise: formatClock(payload.daily?.sunrise?.[0]) || fallback.sunrise,
      sunset: formatClock(payload.daily?.sunset?.[0]) || fallback.sunset,
      moonrise: fallback.moonrise,
      moonset: fallback.moonset,
      updatedAt: current?.time ? current.time.replace("T", " ") : "실시간",
      state: "live",
    },
    hourly: hourlyFromOpenMeteo(payload, region),
  };
}

function mergeHourlyMarine(hourly: HourlyWeather[], payload: OpenMeteoMarineResponse) {
  const marine = payload.hourly;

  if (!marine?.time?.length) {
    return hourly;
  }

  const startTime = Date.now() - 30 * 60 * 1000;
  const marineItems = marine.time
    .map((time, index) => {
      const timestamp = parseKstDate(time);

      if (timestamp !== undefined && timestamp < startTime) {
        return undefined;
      }

      return {
        wave: formatOptionalUnit(marine.wave_height?.[index], "m"),
        waveDirection: directionLabel(marine.wave_direction?.[index]),
        wavePeriod: formatOptionalUnit(marine.wave_period?.[index], "초", 1),
      };
    })
    .filter((item): item is { wave: string; waveDirection: string; wavePeriod: string } =>
      Boolean(item),
    );

  return hourly.map((item, index) => ({
    ...item,
    wave: marineItems[index]?.wave !== "-" ? marineItems[index]?.wave || item.wave : item.wave,
    waveDirection:
      marineItems[index]?.waveDirection !== "-"
        ? marineItems[index]?.waveDirection || item.waveDirection
        : item.waveDirection,
    wavePeriod:
      marineItems[index]?.wavePeriod !== "-"
        ? marineItems[index]?.wavePeriod || item.wavePeriod
        : item.wavePeriod,
  }));
}

async function fetchOpenMeteoMarine(region: Region) {
  const payload = (await fetchJson(
    createUrl(OPEN_METEO_MARINE_URL, {
      latitude: String(region.lat),
      longitude: String(region.lon),
      current: "wave_height,sea_surface_temperature",
      hourly: "wave_height,wave_direction,wave_period",
      timezone: "Asia/Seoul",
      length_unit: "metric",
      forecast_days: "2",
    }),
  )) as OpenMeteoMarineResponse;

  return {
    wave: formatUnit(payload.current?.wave_height, "m"),
    waterTemp: formatUnit(payload.current?.sea_surface_temperature, "℃"),
    hourly: payload.hourly,
  };
}

async function fetchKmaObservation(region: Region): Promise<KmaObservation> {
  if (!KMA_SERVICE_KEY) {
    throw new Error("KMA service key is missing");
  }

  const payload = await fetchJson(
    createUrl(KMA_OCEAN_URL, {
      ServiceKey: KMA_SERVICE_KEY,
      pageNo: "1",
      numOfRows: "100",
      dataType: "JSON",
      searchTime: kstYmdh(new Date(Date.now() - 60 * 60 * 1000)),
    }),
  );
  const item = nearestObservation(extractItems(payload), region);

  if (!item) {
    throw new Error("KMA observation item is missing");
  }

  const overview = stringValue(item, ["wf", "weather", "weatherKor", "wea", "sky", "overview"]);
  const weather = weatherFromOverview(overview || region.fixed.overview, region.defaultWeather);
  const wave =
    formatUnit(numberValue(item, ["whSig", "whAve", "waveHeight", "wave", "wv"]), "m") ||
    undefined;
  const airTemp = formatUnit(numberValue(item, ["ta", "airTemp", "air_temp", "temperature"]), "℃");
  const waterTemp = formatUnit(numberValue(item, ["tw", "waterTemp", "seaTemp", "wtrTmp"]), "℃");
  const windSpeed = formatUnit(numberValue(item, ["ws", "windSpeed", "wind_speed", "wspd"]), "m/s");
  const windDirection =
    directionFromValue(firstValue(item, ["wd", "windDirection", "wind_dir", "wdd"])) ||
    stringValue(item, ["wdKor", "windDirectionKor"]);
  const updatedAt = stringValue(item, ["tm", "tm4", "obsTime", "time"]) || "기상청 수신";

  return {
    ...weather,
    overview: weather.label,
    airTemp,
    wave,
    waterTemp,
    windSpeed,
    windDirection,
    updatedAt,
  };
}

function summarizeWarning(title: string) {
  if (/해제/.test(title)) {
    return "해제";
  }

  if (/풍랑/.test(title)) {
    return "풍랑";
  }

  if (/강풍/.test(title)) {
    return "강풍";
  }

  if (/호우/.test(title)) {
    return "호우";
  }

  return title.length > 8 ? `${title.slice(0, 8)}…` : title;
}

async function fetchKmaWarning(region: Region) {
  if (!KMA_SERVICE_KEY) {
    throw new Error("KMA service key is missing");
  }

  const payload = await fetchJson(
    createUrl(KMA_WARNING_URL, {
      ServiceKey: KMA_SERVICE_KEY,
      pageNo: "1",
      numOfRows: "50",
      dataType: "JSON",
      fromTmFc: kstYmd(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
      toTmFc: kstYmd(),
    }),
  );
  const warning = extractItems(payload)
    .map((item) => stringValue(item, ["title", "wrnTitle", "warningTitle"]))
    .find((title) => {
      if (!title) {
        return false;
      }

      return (
        title.includes(region.name) ||
        title.includes(region.kmaHint) ||
        title.includes("서해") ||
        title.includes("충남") ||
        title.includes("충청남도")
      );
    });

  return warning ? summarizeWarning(warning) : undefined;
}

async function fetchKhoaTide(region: Region) {
  if (!KHOA_SERVICE_KEY) {
    throw new Error("KHOA service key is missing");
  }

  const payload = await fetchJson(
    createUrl(KHOA_TIDE_URL, {
      ServiceKey: KHOA_SERVICE_KEY,
      ObsCode: region.tideCode,
      Date: kstYmd(),
      ResultType: "json",
    }),
  );
  const items = extractItems(payload);
  const lows = items.filter((item) => stringValue(item, ["hl_code"])?.includes("저"));
  const highs = items.filter((item) => stringValue(item, ["hl_code"])?.includes("고"));
  const tideAge = stringValue(items[0], ["tide_age", "tideAge", "mul", "tide"]);

  return {
    tideAge,
    lowTide: formatClock(stringValue(lows[0], ["tph_time", "lowTide", "time"])),
    lowTide2: formatClock(stringValue(lows[1], ["tph_time", "lowTide", "time"])),
    highTide: formatClock(stringValue(highs[0], ["tph_time", "highTide", "time"])),
    highTide2: formatClock(stringValue(highs[1], ["tph_time", "highTide", "time"])),
  };
}

async function fetchKhoaCurrent(region: Region) {
  if (!KHOA_SERVICE_KEY) {
    throw new Error("KHOA service key is missing");
  }

  const payload = await fetchJson(
    createUrl(KHOA_CURRENT_URL, {
      ServiceKey: KHOA_SERVICE_KEY,
      ObsCode: region.currentCode,
      Date: kstYmd(),
      ResultType: "json",
    }),
  );
  const current = nearestByTime(extractItems(payload), ["pred_time", "time"]);
  const direction = stringValue(current, ["current_dir", "direction", "dir"]);
  const speed = numberValue(current, ["current_speed", "speed", "currentSpeed"]);

  if (!direction && speed === undefined) {
    return undefined;
  }

  return `${direction || ""} ${speed === undefined ? "" : `${(speed / 100).toFixed(1)}m/s`}`.trim();
}

async function fetchNifsWaterTemp(region: Region) {
  if (!NIFS_SERVICE_KEY) {
    throw new Error("NIFS service key is missing");
  }

  const payload = await fetchJson(
    createUrl(NIFS_RISA_URL, {
      id: "risaList",
      key: NIFS_SERVICE_KEY,
    }),
  );
  const item = extractItems(payload).find((entry) => {
    const name = stringValue(entry, ["sta_nam_kor", "stationName", "name"]);
    return name?.includes(region.name) || name?.includes(region.nifsHint);
  });
  return formatUnit(numberValue(item, ["wtr_tmp", "waterTemp", "temp"]), "℃");
}

async function fetchKasiAstronomy(region: Region) {
  if (!KASI_SERVICE_KEY) {
    throw new Error("KASI service key is missing");
  }

  const payload = await fetchJson(
    createUrl(KASI_RISE_SET_URL, {
      ServiceKey: KASI_SERVICE_KEY,
      locdate: kstYmd(),
      location: astronomyLocations[region.key],
      _type: "json",
    }),
  );
  const item = extractItems(payload)[0];

  return {
    sunrise: formatCompactClock(stringValue(item, ["sunrise"])),
    sunset: formatCompactClock(stringValue(item, ["sunset"])),
    moonrise: formatCompactClock(stringValue(item, ["moonrise"])),
    moonset: formatCompactClock(stringValue(item, ["moonset"])),
  };
}

async function fetchWindyPointHourly(region: Region, baseHourly: HourlyWeather[]) {
  if (!WINDY_POINT_FORECAST_KEY) {
    throw new Error("Windy point forecast key is missing");
  }

  const commonBody = {
    lat: region.lat,
    lon: region.lon,
    levels: ["surface"],
    key: WINDY_POINT_FORECAST_KEY,
  };
  const [weatherPayload, wavePayload] = (await Promise.all([
    postJson(WINDY_POINT_FORECAST_URL, {
      ...commonBody,
      model: "gfs",
      parameters: ["temp", "wind", "rh", "precip"],
    }),
    postJson(WINDY_POINT_FORECAST_URL, {
      ...commonBody,
      model: "gfsWave",
      parameters: ["waves"],
    }),
  ])) as [WindyPointResponse, WindyPointResponse];
  const now = Date.now() - 30 * 60 * 1000;
  const weatherTimes = weatherPayload.ts || [];
  const waveTimes = wavePayload.ts || [];

  const items = weatherTimes
    .map<HourlyWeather | undefined>((timestamp, index) => {
      if (timestamp < now) {
        return undefined;
      }

      const base = baseHourly[index] || baseHourly[baseHourly.length - 1] || fallbackHourly(region)[0];
      const waveIndex = waveTimes.findIndex((waveTimestamp) => waveTimestamp >= timestamp);
      const matchedWaveIndex = waveIndex >= 0 ? waveIndex : index;
      const wind = windVectorToSpeedDirection(
        weatherPayload["wind_u-surface"]?.[index],
        weatherPayload["wind_v-surface"]?.[index],
      );
      const precip = weatherPayload["past3hprecip-surface"]?.[index];
      const kind = typeof precip === "number" && precip > 0.1 ? "rain" : base.kind;

      return {
        time: `${formatKstHour(new Date(timestamp))}:00`,
        kind,
        label: kind === "rain" ? "비" : base.label,
        temperature: formatTemperature(weatherPayload["temp-surface"]?.[index]),
        windSpeed: wind ? `${wind.speed.toFixed(1)}m/s` : base.windSpeed,
        windDirection: wind?.direction || base.windDirection,
        wave: formatOptionalUnit(wavePayload["waves_height-surface"]?.[matchedWaveIndex], "m"),
        waveDirection: directionLabel(wavePayload["waves_direction-surface"]?.[matchedWaveIndex]),
        wavePeriod: formatOptionalUnit(
          wavePayload["waves_period-surface"]?.[matchedWaveIndex],
          "초",
          1,
        ),
        precipitationProbability: base.precipitationProbability,
        precipitation: formatOptionalUnit(precip, "mm"),
        humidity: formatPercent(weatherPayload["rh-surface"]?.[index]),
      };
    })
    .filter((item): item is HourlyWeather => Boolean(item))
    .slice(0, 8)
    .map((item, index) => {
      const base = baseHourly[index] || item;

      return {
        ...item,
        temperature: item.temperature === "-" ? base.temperature : item.temperature,
        wave: item.wave === "-" ? base.wave : item.wave,
        waveDirection: item.waveDirection === "-" ? base.waveDirection : item.waveDirection,
        wavePeriod: item.wavePeriod === "-" ? base.wavePeriod : item.wavePeriod,
        precipitation: item.precipitation === "-" ? base.precipitation : item.precipitation,
        humidity: item.humidity === "-" ? base.humidity : item.humidity,
      };
    });

  return items.length ? items : baseHourly;
}

async function fetchOfficialBundle(region: Region): Promise<OfficialBundle> {
  const row: MarineRow = { ...region.fixed };
  let weather = fallbackWeather(region);
  let hourly = fallbackHourly(region);

  try {
    const openMeteo = await fetchOpenMeteoWeatherBundle(region);
    weather = openMeteo.weather;
    hourly = openMeteo.hourly;
    row.overview = weather.label;
    row.windSpeed = weather.windSpeed;
    row.windDirection = weather.windDirection;
  } catch {
    weather = fallbackWeather(region);
  }

  try {
    const marine = await fetchOpenMeteoMarine(region);
    row.wave = marine.wave || row.wave;
    row.waterTemp = marine.waterTemp || row.waterTemp;
    hourly = mergeHourlyMarine(hourly, { hourly: marine.hourly });
  } catch {
    row.wave = row.wave || region.fixed.wave;
  }

  try {
    const kma = await fetchKmaObservation(region);

    row.overview = kma.overview || row.overview;
    row.wave = kma.wave || row.wave;
    row.waterTemp = kma.waterTemp || row.waterTemp;
    row.windSpeed = kma.windSpeed || row.windSpeed;
    row.windDirection = kma.windDirection || row.windDirection;
    weather = KMA_SERVICE_KEY ? {
      ...weather,
      kind: kma.kind,
      label: kma.overview || row.overview,
      temperature: kma.airTemp || region.airTemp,
      windSpeed: row.windSpeed,
      windDirection: row.windDirection,
      updatedAt: kma.updatedAt,
      state: "live",
    } : weather;
  } catch {
    row.overview = weather.label || row.overview;
  }

  try {
    hourly = await fetchWindyPointHourly(region, hourly);
    const current = hourly[0];

    if (current) {
      weather = {
        ...weather,
        kind: current.kind,
        label: current.label,
        temperature: current.temperature,
        windSpeed: current.windSpeed,
        windDirection: current.windDirection,
        precipitation: current.precipitation,
        state: "live",
      };
      row.overview = current.label;
      row.wave = current.wave !== "-" ? current.wave : row.wave;
      row.windSpeed = current.windSpeed;
      row.windDirection = current.windDirection;
    }
  } catch {
    hourly = hourly.slice(0, 8);
  }

  try {
    const astronomy = await fetchKasiAstronomy(region);
    weather = {
      ...weather,
      sunrise: astronomy.sunrise || weather.sunrise,
      sunset: astronomy.sunset || weather.sunset,
      moonrise: astronomy.moonrise || weather.moonrise,
      moonset: astronomy.moonset || weather.moonset,
    };
  } catch {
    weather = {
      ...weather,
      moonrise: weather.moonrise,
      moonset: weather.moonset,
    };
  }

  try {
    row.alert = (await fetchKmaWarning(region)) || row.alert;
  } catch {
    row.alert = row.alert || "없음";
  }

  try {
    const tide = await fetchKhoaTide(region);
    row.tideAge = tide.tideAge || row.tideAge;
    row.lowTide = tide.lowTide || row.lowTide;
    row.lowTide2 = tide.lowTide2 || row.lowTide2;
    row.highTide = tide.highTide || row.highTide;
    row.highTide2 = tide.highTide2 || row.highTide2;
  } catch {
    row.lowTide = row.lowTide || region.fixed.lowTide;
    row.highTide = row.highTide || region.fixed.highTide;
  }

  row.lowTide2 = row.lowTide2 || addHours(row.lowTide, 12);
  row.highTide2 = row.highTide2 || addHours(row.highTide, 12);

  try {
    row.current = (await fetchKhoaCurrent(region)) || row.current;
  } catch {
    row.current = row.current || region.fixed.current;
  }

  try {
    row.waterTemp = (await fetchNifsWaterTemp(region)) || row.waterTemp;
  } catch {
    row.waterTemp = row.waterTemp || region.fixed.waterTemp;
  }

  return {
    weather,
    hourly,
    row,
  };
}

function LoginScreen({ onEnter }: { onEnter: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const storedPassword =
      typeof window === "undefined" ? "" : window.localStorage.getItem(PASSWORD_STORAGE_KEY) || "";

    if (storedPassword && password !== storedPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setError("");
    onEnter();
  }

  return (
    <main className="login-screen">
      <section className="login-panel" aria-label="로그인">
        <Image
          className="login-emblem"
          src="/assets/32div-emblem.svg"
          alt="제32보병사단"
          width={150}
          height={180}
          priority
        />

        <h1>
          <span>제32보병사단</span>
          <strong>밀입국 가능성 판단 지원 체계</strong>
        </h1>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <UserRound size={34} aria-hidden="true" />
            <input name="id" aria-label="ID" autoComplete="username" />
          </label>
          <label>
            <LockKeyhole size={34} aria-hidden="true" />
            <input
              name="password"
              aria-label="PW"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit">
            <KeyRound size={18} aria-hidden="true" />
            로그인
          </button>
        </form>
      </section>
    </main>
  );
}

function RegionCard({
  region,
  active,
  weather,
  onSelect,
}: {
  region: ResolvedRegion;
  active: boolean;
  weather: WeatherNow;
  onSelect: (region: RegionKey) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(region.key);
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(region.key)}
      onKeyDown={handleKeyDown}
      className={`region-card ${active ? "active" : ""}`}
      aria-pressed={active}
    >
      <div className="region-card-top">
        <div className="region-name">
          <strong>{region.name}</strong>
          <span>{region.harborName}</span>
        </div>
        <WeatherMark type={weather.kind} />
      </div>
      <dl className="weather-metrics">
        <div>
          <dt>기온</dt>
          <dd>{weather.temperature}</dd>
        </div>
        <div>
          <dt>풍속</dt>
          <dd>{weather.windSpeed}</dd>
        </div>
        <div>
          <dt>일출</dt>
          <dd>{weather.sunrise}</dd>
        </div>
        <div>
          <dt>일몰</dt>
          <dd>{weather.sunset}</dd>
        </div>
        <div>
          <dt>월출</dt>
          <dd>{weather.moonrise}</dd>
        </div>
        <div>
          <dt>월몰</dt>
          <dd>{weather.moonset}</dd>
        </div>
      </dl>
    </article>
  );
}

function DetailCell({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <td>
      <a className="detail-link" href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    </td>
  );
}

function TideTimes({ first, second }: { first: string; second?: string }) {
  return (
    <span className="tide-times">
      <span>1차 {first}</span>
      <span>2차 {second || addHours(first, 12)}</span>
    </span>
  );
}

function HourlyStrip({
  region,
  items,
}: {
  region: ResolvedRegion;
  items: HourlyWeather[];
}) {
  const visibleItems = items.slice(0, 8);
  const rows = [
    {
      label: "날씨",
      render: (item: HourlyWeather) => (
        <span className="hourly-weather-mark">
          <WeatherMark type={item.kind} />
          <em>{item.label}</em>
        </span>
      ),
    },
    { label: "기온", render: (item: HourlyWeather) => item.temperature },
    { label: "풍향", render: (item: HourlyWeather) => item.windDirection },
    { label: "풍속", render: (item: HourlyWeather) => item.windSpeed },
    { label: "파고", render: (item: HourlyWeather) => item.wave },
    { label: "파향", render: (item: HourlyWeather) => item.waveDirection },
    { label: "파주기", render: (item: HourlyWeather) => item.wavePeriod },
    { label: "강수확률", render: (item: HourlyWeather) => item.precipitationProbability },
    { label: "강수량", render: (item: HourlyWeather) => item.precipitation },
    { label: "습도", render: (item: HourlyWeather) => item.humidity },
  ];

  return (
    <section className="hourly-strip" aria-label="시간별 기상">
      <div className="hourly-title">
        <strong>시간별 기상</strong>
        <span>{region.harborName}</span>
      </div>
      <div className="hourly-table-scroll">
        <div
          className="hourly-matrix"
          style={{
            gridTemplateColumns: `70px repeat(${visibleItems.length}, minmax(84px, 1fr))`,
          }}
        >
          <div className="hourly-cell hourly-corner">구분</div>
          {visibleItems.map((item) => (
            <div className="hourly-cell hourly-time" key={`${region.key}-${item.time}-head`}>
              {item.time}
            </div>
          ))}
          {rows.map((row) => (
            <Fragment key={row.label}>
              <div className="hourly-cell hourly-row-label">{row.label}</div>
              {visibleItems.map((item) => (
                <div
                  className="hourly-cell hourly-value"
                  key={`${region.key}-${item.time}-${row.label}`}
                >
                  {row.render(item)}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function WeatherTable({
  activeRegion,
  displayRegions,
  rows,
}: {
  activeRegion: ResolvedRegion;
  displayRegions: ResolvedRegion[];
  rows: Record<RegionKey, MarineRow>;
}) {
  return (
    <div className="weather-table-wrap">
      <table className="weather-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRegions.map((region) => {
            const focused = region.key === activeRegion.key;
            const row = rows[region.key] || region.fixed;
            return (
              <tr key={region.key} className={focused ? "selected-row" : undefined}>
                <th>
                  <a href={region.badatimeUrl} target="_blank" rel="noreferrer">
                    <strong>{region.name}</strong>
                    <span>{region.harborName}</span>
                  </a>
                </th>
                <DetailCell href={region.badatimeUrl}>{row.alert}</DetailCell>
                <DetailCell href={region.badatimeUrl}>{row.overview}</DetailCell>
                <DetailCell href={region.badatimeUrl}>{row.wave}</DetailCell>
                <DetailCell href={region.badatimeUrl}>{row.tideAge}</DetailCell>
                <DetailCell href={region.badatimeUrl}>
                  <TideTimes first={row.lowTide} second={row.lowTide2} />
                </DetailCell>
                <DetailCell href={region.badatimeUrl}>
                  <TideTimes first={row.highTide} second={row.highTide2} />
                </DetailCell>
                <DetailCell href={region.badatimeUrl}>{row.waterTemp}</DetailCell>
                <DetailCell href={region.badatimeUrl}>{row.windDirection}</DetailCell>
                <DetailCell href={region.badatimeUrl}>{row.windSpeed}</DetailCell>
                <DetailCell href={windyDirectUrl(region)}>{row.current}</DetailCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MapPanel({ region }: { region: ResolvedRegion }) {
  const src = windyEmbedUrl(region);

  return (
    <aside className="map-panel">
      <div className="map-canvas official-map">
        <iframe
          key={`${region.key}-${region.harborName}`}
          title="Windy 해상기상 지도"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </aside>
  );
}

function SettingsPanel({
  open,
  harborSelections,
  onClose,
  onHarborChange,
}: {
  open: boolean;
  harborSelections: Record<RegionKey, string>;
  onClose: () => void;
  onHarborChange: (region: RegionKey, harborName: string) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  if (!open) {
    return null;
  }

  function handlePasswordSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 4) {
      setMessage("비밀번호는 4자리 이상으로 입력하세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    window.localStorage.setItem(PASSWORD_STORAGE_KEY, newPassword);
    setNewPassword("");
    setConfirmPassword("");
    setMessage("비밀번호가 저장되었습니다.");
  }

  return (
    <div className="settings-backdrop" role="dialog" aria-modal="true" aria-label="설정">
      <section className="settings-panel">
        <div className="settings-head">
          <div>
            <span>운용 설정</span>
            <h2>지역·항구 세부설정</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="설정 닫기">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="settings-card" onSubmit={handlePasswordSave}>
          <h3>비밀번호 변경</h3>
          <div className="password-grid">
            <label>
              <span>새 비밀번호</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label>
              <span>새 비밀번호 확인</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="settings-footer">
            <p>{message}</p>
            <button type="submit">저장</button>
          </div>
        </form>

        <section className="settings-card">
          <h3>지역별 항구 선택</h3>
          <div className="harbor-grid">
            {regions.map((region) => (
              <label key={region.key}>
                <span>{region.name}</span>
                <select
                  value={harborSelections[region.key]}
                  onChange={(event) => onHarborChange(region.key, event.target.value)}
                >
                  {region.harbors.map((harbor) => (
                    <option key={harbor.harborName} value={harbor.harborName}>
                      {harbor.harborName}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <h3>자료 출처 및 상세 확인 항목</h3>
          <dl className="source-list">
            <div>
              <dt>기상청</dt>
              <dd>기상특보, 바다날씨, 풍향, 풍속, 파고, 수온</dd>
            </div>
            <div>
              <dt>국립해양조사원</dt>
              <dd>조석, 물때, 간조, 만조, 조류</dd>
            </div>
            <div>
              <dt>국립수산과학원</dt>
              <dd>수온 및 해양환경 보조 검증</dd>
            </div>
            <div>
              <dt>한국천문연구원</dt>
              <dd>일출, 일몰, 월출, 월몰 공식 출몰시각</dd>
            </div>
            <div>
              <dt>Windy</dt>
              <dd>해상풍 지도 표시, API 키 설정 시 시간별 풍향·풍속·파고·파주기 우선 반영</dd>
            </div>
            <div>
              <dt>바다타임 상세</dt>
              <dd>물흐름, 만조/간조, 파향, 파주기, 일출/일몰, 월출/월몰, 바다수온</dd>
            </div>
          </dl>
        </section>
      </section>
    </div>
  );
}

function DashboardScreen({ onLogout }: { onLogout: () => void }) {
  const [activeKey, setActiveKey] = useState<RegionKey>("dangjin");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [harborSelections, setHarborSelections] = useState<Record<RegionKey, string>>(
    storedHarborSelections,
  );
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [weatherByRegion, setWeatherByRegion] = useState<Record<RegionKey, WeatherNow>>(() =>
    Object.fromEntries(regions.map((region) => [region.key, fallbackWeather(region)])) as Record<
      RegionKey,
      WeatherNow
    >,
  );
  const [hourlyByRegion, setHourlyByRegion] = useState<Record<RegionKey, HourlyWeather[]>>(() =>
    Object.fromEntries(regions.map((region) => [region.key, fallbackHourly(region)])) as Record<
      RegionKey,
      HourlyWeather[]
    >,
  );
  const [tableRows, setTableRows] = useState<Record<RegionKey, MarineRow>>(() =>
    Object.fromEntries(regions.map((region) => [region.key, region.fixed])) as Record<
      RegionKey,
      MarineRow
    >,
  );

  const displayRegions = useMemo(
    () => regions.map((region) => resolveRegion(region, harborSelections[region.key])),
    [harborSelections],
  );

  const activeRegion = useMemo(
    () => displayRegions.find((region) => region.key === activeKey) || displayRegions[0],
    [activeKey, displayRegions],
  );

  const handleHarborChange = useCallback((region: RegionKey, harborName: string) => {
    setHarborSelections((current) => {
      const next = { ...current, [region]: harborName };
      window.localStorage.setItem(HARBOR_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);

    try {
      const bundles = await Promise.all(
        displayRegions.map(
          async (region) => [region.key, await fetchOfficialBundle(region)] as const,
        ),
      );
      const weatherMap = Object.fromEntries(
        bundles.map(([key, bundle]) => [key, bundle.weather]),
      ) as Record<RegionKey, WeatherNow>;
      const hourlyMap = Object.fromEntries(
        bundles.map(([key, bundle]) => [key, bundle.hourly]),
      ) as Record<RegionKey, HourlyWeather[]>;
      const rows = Object.fromEntries(
        bundles.map(([key, bundle]) => [key, bundle.row]),
      ) as Record<RegionKey, MarineRow>;

      setWeatherByRegion(weatherMap);
      setHourlyByRegion(hourlyMap);
      setTableRows(rows);
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, [displayRegions]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refreshData(), 0);
    const timer = window.setInterval(() => void refreshData(), 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [refreshData]);

  const formattedTime = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(updatedAt);
  const tableReferenceTime = formatTableReferenceTime(updatedAt);

  return (
    <main className="dashboard-screen">
      <header className="dashboard-header">
        <div className="brand">
          <Image
            className="brand-logo"
            src="/assets/22.svg"
            alt="제32보병사단"
            width={52}
            height={52}
            priority
          />
          <div>
            <span>제32보병사단</span>
            <h1>밀입국 가능성 판단 지원</h1>
          </div>
        </div>
        <div className="header-actions">
          <span>{loading ? "API 수신 중" : `${formattedTime} 갱신`}</span>
          <button type="button" onClick={refreshData}>
            <RefreshCcw size={18} aria-hidden="true" />
            갱신
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            인쇄
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} aria-hidden="true" />
            설정
          </button>
          <button type="button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <section className="region-grid" aria-label="지역별 실시간 날씨 카드">
        {displayRegions.map((region) => (
          <RegionCard
            key={region.key}
            region={region}
            active={region.key === activeKey}
            weather={weatherByRegion[region.key]}
            onSelect={setActiveKey}
          />
        ))}
      </section>

      <section className="workspace">
        <section className="weather-system">
          <HourlyStrip region={activeRegion} items={hourlyByRegion[activeRegion.key]} />

          <div className="table-reference">
            <span>{tableReferenceTime}</span>
          </div>

          <WeatherTable activeRegion={activeRegion} displayRegions={displayRegions} rows={tableRows} />
        </section>

        <MapPanel region={activeRegion} />
      </section>
      <SettingsPanel
        open={settingsOpen}
        harborSelections={harborSelections}
        onClose={() => setSettingsOpen(false)}
        onHarborChange={handleHarborChange}
      />
    </main>
  );
}

export function StaticDashboard() {
  const [entered, setEntered] = useState(false);

  return entered ? (
    <DashboardScreen onLogout={() => setEntered(false)} />
  ) : (
    <LoginScreen onEnter={() => setEntered(true)} />
  );
}
