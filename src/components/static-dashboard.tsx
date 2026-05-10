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
  Activity,
  AlertTriangle,
  Compass,
  Eye,
  Flame,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  KeyRound,
  LogOut,
  LockKeyhole,
  MapPinned,
  Menu,
  Plane,
  Printer,
  Radar,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  Waves,
  Wind,
  X,
} from "lucide-react";
import { calculateRisk, type RiskAssessment } from "@/lib/risk-calculator";
import { calculateAviationRisk, type AviationRiskAssessment } from "@/lib/aviation-risk";
import {
  aviationZones,
  type AviationRegionGroupKey,
  type AviationRiskLevel,
  type AviationZone,
  type AviationZoneData,
} from "@/lib/aviation-zone-data";
import {
  zones,
  type CoastalZone,
  type RiskLevel,
  type SeaAreaType,
  type ZoneEnvironmentData,
} from "@/lib/zone-data";

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
const REGION_VISIBILITY_STORAGE_KEY = "blade-ai-region-visibility";
const REGION_VISIBILITY_VERSION_STORAGE_KEY = "blade-ai-region-visibility-version";
const REGION_VISIBILITY_VERSION = "2026-05-national-marine-catalog";
const LAND_ZONE_VISIBILITY_STORAGE_KEY = "ridge-ai-land-zone-visibility";
const LAND_ZONE_VISIBILITY_VERSION_STORAGE_KEY = "ridge-ai-land-zone-visibility-version";
const LAND_ZONE_VISIBILITY_VERSION = "2026-05-national-sigungu";
const AVIATION_ZONE_VISIBILITY_STORAGE_KEY = "sky-ai-aviation-zone-visibility";
const AVIATION_ZONE_VISIBILITY_VERSION_STORAGE_KEY = "sky-ai-aviation-zone-visibility-version";
const AVIATION_ZONE_VISIBILITY_VERSION = "2026-05-national-aviation-catalog";
const CUSTOM_REGIONS_STORAGE_KEY = "blade-ai-custom-regions";
const CUSTOM_LAND_ZONES_STORAGE_KEY = "ridge-ai-custom-land-zones";
const CUSTOM_AVIATION_ZONES_STORAGE_KEY = "sky-ai-custom-aviation-zones";
const WINDY_EMBED_BASE_URL = "https://embed.windy.com/embed2.html";
const KMA_WEATHER_MAP_URL = "https://www.weather.go.kr/wgis-nuri/html/map.html";
const KMA_MARINE_MAP_URL = "https://marine.kma.go.kr/mmis/?menuId=sig_wh";
const OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const DIVISION_MARK_SRC = `${BASE_PATH}/assets/22.svg`;
const MODE_COASTAL_SRC = `${BASE_PATH}/assets/mode-coastal.svg`;
const MODE_LAND_SRC = `${BASE_PATH}/assets/mode-land.svg`;
const MODE_AIR_SRC = `${BASE_PATH}/assets/mode-air.svg`;
const INTEGRATED_SYSTEM_NAME = "백룡 기상판단 지원체계";
const COASTAL_SYSTEM = {
  label: "해상",
  koreanName: INTEGRATED_SYSTEM_NAME,
};
const LAND_SYSTEM = {
  label: "육상",
  koreanName: INTEGRATED_SYSTEM_NAME,
};
const AIR_SYSTEM = {
  label: "항공",
  koreanName: INTEGRATED_SYSTEM_NAME,
};
const presetAviationZoneIds = new Set(["A-A", "A-B", "A-C", "A-D"]);

type RegionKey = string;
type OperationMode = "coastal" | "land" | "air";
type DashboardView =
  | "marine"
  | "marineMonthly"
  | "marineAccess"
  | "blade"
  | "land"
  | "landTable"
  | "air"
  | "airTable"
  | "settings";
type SettingsTab = "account" | "marine" | "land" | "air" | "sources";
type WeatherKind = "sun" | "partly" | "cloud" | "rain";
type ApiState = "live" | "fallback";
type JsonRecord = Record<string, unknown>;
type WindyOverlay = "waves" | "wind" | "rain" | "clouds" | "temp";
type MarineRegionGroupKey =
  | "incheonGyeonggi"
  | "chungnam"
  | "jeonbuk"
  | "jeonnam"
  | "south"
  | "east"
  | "jeju"
  | "chinaYellowSea"
  | "chinaEastSea"
  | "offshore"
  | "custom";
type MarineStationKind = "harbor" | "beach" | "buoy" | "offshore";

type CustomRegionDraft = {
  name: string;
  harborName: string;
  seaArea: SeaAreaType;
  marineGroup?: MarineRegionGroupKey;
  lat: number;
  lon: number;
  tideCode?: string;
  currentCode?: string;
  kmaHint?: string;
  nifsHint?: string;
  airTemp?: string;
  badatimeUrl?: string;
  defaultWeather?: WeatherKind;
  fixed?: MarineRow;
};

type CustomRegionConfig = CustomRegionDraft & {
  key: string;
};

type CustomLandZoneDraft = {
  name: string;
  label?: string;
  sector: string;
  regionGroup: Exclude<LandRegionGroupKey, "all">;
  lat: number;
  lon: number;
  radius?: number;
};

type CustomLandZoneConfig = CustomLandZoneDraft & {
  id: string;
};

type LandZoneSelectionMode = "all" | "preset";

type CustomAviationZoneDraft = {
  name: string;
  label?: string;
  sector: string;
  regionGroup?: AviationRegionGroupKey;
  lat: number;
  lon: number;
  averageWindSpeedMs?: number;
  gustSpeedMs?: number;
  windDirection?: string;
  visibilityKm?: number;
  cloudCeilingFt?: number;
};

type CustomAviationZoneConfig = CustomAviationZoneDraft & {
  id: string;
};

type HarborOption = {
  harborName: string;
  seaArea?: SeaAreaType;
  marineGroup?: MarineRegionGroupKey;
  stationKind?: MarineStationKind;
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
  seaArea: SeaAreaType;
  marineGroup?: MarineRegionGroupKey;
  stationKind?: MarineStationKind;
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

const seaAreaLabels: Record<SeaAreaType, string> = {
  coast: "해안",
  nearshore: "연안",
  offshore: "원해",
};

const marineRegionGroupLabels: Record<MarineRegionGroupKey, string> = {
  incheonGyeonggi: "인천·경기 서해",
  chungnam: "충남 서해",
  jeonbuk: "전북 서해",
  jeonnam: "전남 서남해",
  south: "남해·부산·경남",
  east: "동해안",
  jeju: "제주 해역",
  chinaYellowSea: "중국 황해",
  chinaEastSea: "중국 동중국해",
  offshore: "원해 관측",
  custom: "사용자 추가",
};

const marineRegionGroupOrder: MarineRegionGroupKey[] = [
  "incheonGyeonggi",
  "chungnam",
  "jeonbuk",
  "jeonnam",
  "south",
  "east",
  "jeju",
  "chinaYellowSea",
  "chinaEastSea",
  "offshore",
  "custom",
];

const marineStationKindLabels: Record<MarineStationKind, string> = {
  harbor: "항구",
  beach: "해수욕장",
  buoy: "관측부이",
  offshore: "원해",
};

const aviationRegionGroupLabels: Record<AviationRegionGroupKey | "custom", string> = {
  capital: "수도권",
  gangwon: "강원권",
  chungcheong: "충청권",
  honam: "호남권",
  yeongnam: "영남권",
  jeju: "제주권",
  custom: "사용자 추가",
};

const aviationRegionGroupOrder: Array<AviationRegionGroupKey | "custom"> = [
  "capital",
  "gangwon",
  "chungcheong",
  "honam",
  "yeongnam",
  "jeju",
  "custom",
];

function marineStationLabel(region: Pick<Region, "seaArea" | "stationKind">) {
  return region.stationKind ? marineStationKindLabels[region.stationKind] : seaAreaLabels[region.seaArea];
}

const baseRegions: Region[] = [
  {
    key: "seosan",
    name: "서산",
    seaArea: "nearshore",
    lat: 37.0,
    lon: 126.35,
    tideCode: "DT_0002",
    currentCode: "03PT-1",
    kmaHint: "서산",
    nifsHint: "서산",
    airTemp: "15.8℃",
    badatimeUrl: "https://www.badatime.com/144.html",
    defaultWeather: "partly",
    fixed: {
      alert: "없음",
      overview: "구름",
      wave: "0.5m",
      tideAge: "7물",
      lowTide: "04:15",
      highTide: "10:39",
      waterTemp: "14.6℃",
      windSpeed: "3.6m/s",
      windDirection: "북서",
      current: "0.4m/s",
    },
    harbors: [
      {
        harborName: "삼길포항",
        lat: 37.0,
        lon: 126.35,
        tideCode: "DT_0002",
        currentCode: "03PT-1",
        kmaHint: "서산",
        nifsHint: "서산",
        airTemp: "15.8℃",
        badatimeUrl: "https://www.badatime.com/144.html",
        defaultWeather: "partly",
        fixed: {
          alert: "없음",
          overview: "구름",
          wave: "0.5m",
          tideAge: "7물",
          lowTide: "04:15",
          highTide: "10:39",
          waterTemp: "14.6℃",
          windSpeed: "3.6m/s",
          windDirection: "북서",
          current: "0.4m/s",
        },
      },
      {
        harborName: "대산항",
        lat: 37.01,
        lon: 126.39,
        tideCode: "DT_0002",
        currentCode: "03PT-1",
        kmaHint: "서산",
        nifsHint: "서산",
        airTemp: "15.7℃",
        badatimeUrl: "https://www.badatime.com/144.html",
        defaultWeather: "partly",
        fixed: {
          alert: "없음",
          overview: "구름",
          wave: "0.5m",
          tideAge: "7물",
          lowTide: "04:12",
          highTide: "10:36",
          waterTemp: "14.5℃",
          windSpeed: "3.8m/s",
          windDirection: "북서",
          current: "0.4m/s",
        },
      },
    ],
  },
  {
    key: "dangjin",
    name: "당진",
    seaArea: "nearshore",
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
    seaArea: "nearshore",
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
    seaArea: "nearshore",
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
];

const offshoreRegions: Region[] = [
  {
    key: "seosan-offshore",
    name: "서산",
    seaArea: "offshore",
    lat: 37.08,
    lon: 125.82,
    tideCode: "DT_0002",
    currentCode: "03PT-1",
    kmaHint: "서해중부먼바다",
    nifsHint: "서산",
    airTemp: "14.2℃",
    badatimeUrl: windyCoordinateUrl(37.08, 125.82),
    defaultWeather: "cloud",
    fixed: {
      alert: "없음",
      overview: "흐림",
      wave: "1.6m",
      tideAge: "7물",
      lowTide: "04:30",
      highTide: "10:55",
      waterTemp: "13.8℃",
      windSpeed: "8.8m/s",
      windDirection: "북서",
      current: "0.6m/s",
    },
    harbors: [
      {
        harborName: "서산 원해",
        seaArea: "offshore",
        lat: 37.08,
        lon: 125.82,
        tideCode: "DT_0002",
        currentCode: "03PT-1",
        kmaHint: "서해중부먼바다",
        nifsHint: "서산",
        airTemp: "14.2℃",
        badatimeUrl: windyCoordinateUrl(37.08, 125.82),
        defaultWeather: "cloud",
        fixed: {
          alert: "없음",
          overview: "흐림",
          wave: "1.6m",
          tideAge: "7물",
          lowTide: "04:30",
          highTide: "10:55",
          waterTemp: "13.8℃",
          windSpeed: "8.8m/s",
          windDirection: "북서",
          current: "0.6m/s",
        },
      },
    ],
  },
  {
    key: "dangjin-offshore",
    name: "당진",
    seaArea: "offshore",
    lat: 37.0,
    lon: 126.18,
    tideCode: "DT_0002",
    currentCode: "03PT-1",
    kmaHint: "서해중부먼바다",
    nifsHint: "당진",
    airTemp: "14.8℃",
    badatimeUrl: windyCoordinateUrl(37.0, 126.18),
    defaultWeather: "partly",
    fixed: {
      alert: "없음",
      overview: "구름",
      wave: "1.4m",
      tideAge: "7물",
      lowTide: "04:27",
      highTide: "10:51",
      waterTemp: "14.0℃",
      windSpeed: "7.4m/s",
      windDirection: "서북서",
      current: "0.5m/s",
    },
    harbors: [
      {
        harborName: "당진 원해",
        seaArea: "offshore",
        lat: 37.0,
        lon: 126.18,
        tideCode: "DT_0002",
        currentCode: "03PT-1",
        kmaHint: "서해중부먼바다",
        nifsHint: "당진",
        airTemp: "14.8℃",
        badatimeUrl: windyCoordinateUrl(37.0, 126.18),
        defaultWeather: "partly",
        fixed: {
          alert: "없음",
          overview: "구름",
          wave: "1.4m",
          tideAge: "7물",
          lowTide: "04:27",
          highTide: "10:51",
          waterTemp: "14.0℃",
          windSpeed: "7.4m/s",
          windDirection: "서북서",
          current: "0.5m/s",
        },
      },
    ],
  },
  {
    key: "taean-offshore",
    name: "태안",
    seaArea: "offshore",
    lat: 36.72,
    lon: 125.66,
    tideCode: "DT_0050",
    currentCode: "07TA03",
    kmaHint: "서해중부먼바다",
    nifsHint: "태안",
    airTemp: "15.4℃",
    badatimeUrl: windyCoordinateUrl(36.72, 125.66),
    defaultWeather: "sun",
    fixed: {
      alert: "없음",
      overview: "맑음",
      wave: "2.1m",
      tideAge: "8물",
      lowTide: "05:18",
      highTide: "11:42",
      waterTemp: "13.5℃",
      windSpeed: "12.4m/s",
      windDirection: "서",
      current: "0.8m/s",
    },
    harbors: [
      {
        harborName: "태안 원해",
        seaArea: "offshore",
        lat: 36.72,
        lon: 125.66,
        tideCode: "DT_0050",
        currentCode: "07TA03",
        kmaHint: "서해중부먼바다",
        nifsHint: "태안",
        airTemp: "15.4℃",
        badatimeUrl: windyCoordinateUrl(36.72, 125.66),
        defaultWeather: "sun",
        fixed: {
          alert: "없음",
          overview: "맑음",
          wave: "2.1m",
          tideAge: "8물",
          lowTide: "05:18",
          highTide: "11:42",
          waterTemp: "13.5℃",
          windSpeed: "12.4m/s",
          windDirection: "서",
          current: "0.8m/s",
        },
      },
    ],
  },
  {
    key: "boryeong-offshore",
    name: "보령",
    seaArea: "offshore",
    lat: 36.2,
    lon: 126.0,
    tideCode: "DT_0025",
    currentCode: "07KS01",
    kmaHint: "서해중부먼바다",
    nifsHint: "보령",
    airTemp: "15.1℃",
    badatimeUrl: windyCoordinateUrl(36.2, 126.0),
    defaultWeather: "cloud",
    fixed: {
      alert: "없음",
      overview: "흐림",
      wave: "1.7m",
      tideAge: "7물",
      lowTide: "04:58",
      highTide: "11:22",
      waterTemp: "14.1℃",
      windSpeed: "9.2m/s",
      windDirection: "북서",
      current: "0.7m/s",
    },
    harbors: [
      {
        harborName: "보령 원해",
        seaArea: "offshore",
        lat: 36.2,
        lon: 126.0,
        tideCode: "DT_0025",
        currentCode: "07KS01",
        kmaHint: "서해중부먼바다",
        nifsHint: "보령",
        airTemp: "15.1℃",
        badatimeUrl: windyCoordinateUrl(36.2, 126.0),
        defaultWeather: "cloud",
        fixed: {
          alert: "없음",
          overview: "흐림",
          wave: "1.7m",
          tideAge: "7물",
          lowTide: "04:58",
          highTide: "11:22",
          waterTemp: "14.1℃",
          windSpeed: "9.2m/s",
          windDirection: "북서",
          current: "0.7m/s",
        },
      },
    ],
  },
];

type MarineCatalogSeed = {
  key: string;
  name: string;
  station: string;
  group: MarineRegionGroupKey;
  kind: MarineStationKind;
  seaArea: SeaAreaType;
  lat: number;
  lon: number;
  wave?: number;
  wind?: number;
  weather?: WeatherKind;
  overview?: string;
};

function createMarineCatalogRegion(seed: MarineCatalogSeed): Region {
  const fixed = {
    ...defaultMarineRow(seed.seaArea),
    overview: seed.overview || defaultMarineRow(seed.seaArea).overview,
    wave: `${(seed.wave ?? (seed.seaArea === "offshore" ? 1.8 : seed.kind === "beach" ? 0.6 : 0.8)).toFixed(1)}m`,
    windSpeed: `${(seed.wind ?? (seed.seaArea === "offshore" ? 8.5 : 4.2)).toFixed(1)}m/s`,
  };
  const badatimeUrl = seed.seaArea === "offshore" || seed.group === "chinaYellowSea" || seed.group === "chinaEastSea"
    ? windyCoordinateUrl(seed.lat, seed.lon)
    : "https://www.badatime.com/";

  return {
    key: `marine-${seed.key}`,
    name: seed.name,
    seaArea: seed.seaArea,
    marineGroup: seed.group,
    stationKind: seed.kind,
    lat: seed.lat,
    lon: seed.lon,
    tideCode: "CATALOG",
    currentCode: "CATALOG",
    kmaHint: seed.name,
    nifsHint: seed.name,
    airTemp: "15.0℃",
    badatimeUrl,
    defaultWeather: seed.weather || "partly",
    fixed,
    harbors: [
      {
        harborName: seed.station,
        seaArea: seed.seaArea,
        marineGroup: seed.group,
        stationKind: seed.kind,
        lat: seed.lat,
        lon: seed.lon,
        tideCode: "CATALOG",
        currentCode: "CATALOG",
        kmaHint: seed.name,
        nifsHint: seed.name,
        airTemp: "15.0℃",
        badatimeUrl,
        defaultWeather: seed.weather || "partly",
        fixed,
      },
    ],
  };
}

const nationalMarineCatalogSeeds: MarineCatalogSeed[] = [
  { key: "incheon-port", name: "인천", station: "인천항", group: "incheonGyeonggi", kind: "harbor", seaArea: "nearshore", lat: 37.46, lon: 126.59, wave: 0.6, wind: 4.4 },
  { key: "baengnyeong", name: "백령도", station: "백령도 연안", group: "incheonGyeonggi", kind: "buoy", seaArea: "nearshore", lat: 37.96, lon: 124.67, wave: 1.1, wind: 6.2 },
  { key: "daebudo", name: "안산 대부도", station: "방아머리해수욕장", group: "incheonGyeonggi", kind: "beach", seaArea: "coast", lat: 37.29, lon: 126.58, wave: 0.4, wind: 3.6 },
  { key: "jebudo", name: "화성 제부도", station: "제부도해수욕장", group: "incheonGyeonggi", kind: "beach", seaArea: "coast", lat: 37.17, lon: 126.62, wave: 0.4, wind: 3.8 },
  { key: "eulwangri", name: "인천 을왕리", station: "을왕리해수욕장", group: "incheonGyeonggi", kind: "beach", seaArea: "coast", lat: 37.45, lon: 126.37, wave: 0.5, wind: 4.1 },
  { key: "wangsan", name: "인천 왕산", station: "왕산해수욕장", group: "incheonGyeonggi", kind: "beach", seaArea: "coast", lat: 37.46, lon: 126.36, wave: 0.5, wind: 4.2 },
  { key: "hanagae", name: "인천 무의도", station: "하나개해수욕장", group: "incheonGyeonggi", kind: "beach", seaArea: "coast", lat: 37.38, lon: 126.42, wave: 0.5, wind: 4.0 },
  { key: "kkotji", name: "태안 꽃지", station: "꽃지해수욕장", group: "chungnam", kind: "beach", seaArea: "coast", lat: 36.50, lon: 126.34, wave: 0.7, wind: 4.0, weather: "sun", overview: "맑음" },
  { key: "manripo-beach", name: "태안 만리포", station: "만리포해수욕장", group: "chungnam", kind: "beach", seaArea: "coast", lat: 36.78, lon: 126.14, wave: 1.2, wind: 5.8, weather: "sun", overview: "맑음" },
  { key: "mongsanpo", name: "태안 몽산포", station: "몽산포해수욕장", group: "chungnam", kind: "beach", seaArea: "coast", lat: 36.67, lon: 126.29, wave: 0.8, wind: 4.6, weather: "sun", overview: "맑음" },
  { key: "hakampo", name: "태안 학암포", station: "학암포해수욕장", group: "chungnam", kind: "beach", seaArea: "coast", lat: 36.89, lon: 126.20, wave: 0.9, wind: 5.0 },
  { key: "daecheon-beach", name: "보령 대천", station: "대천해수욕장", group: "chungnam", kind: "beach", seaArea: "coast", lat: 36.31, lon: 126.51, wave: 0.8, wind: 4.3, weather: "sun", overview: "맑음" },
  { key: "muchangpo", name: "보령 무창포", station: "무창포해수욕장", group: "chungnam", kind: "beach", seaArea: "coast", lat: 36.25, lon: 126.54, wave: 0.7, wind: 4.2, weather: "sun", overview: "맑음" },
  { key: "chunjangdae", name: "서천 춘장대", station: "춘장대해수욕장", group: "chungnam", kind: "beach", seaArea: "coast", lat: 36.16, lon: 126.52, wave: 0.8, wind: 4.5 },
  { key: "gunsan", name: "군산", station: "군산항", group: "jeonbuk", kind: "harbor", seaArea: "nearshore", lat: 35.98, lon: 126.63, wave: 0.9, wind: 5.0 },
  { key: "gyeokpo", name: "부안 격포", station: "격포항", group: "jeonbuk", kind: "harbor", seaArea: "nearshore", lat: 35.62, lon: 126.47, wave: 0.8, wind: 4.8 },
  { key: "seonyudo-beach", name: "군산 선유도", station: "선유도해수욕장", group: "jeonbuk", kind: "beach", seaArea: "coast", lat: 35.82, lon: 126.41, wave: 0.6, wind: 4.4 },
  { key: "byeonsan-beach", name: "부안 변산", station: "변산해수욕장", group: "jeonbuk", kind: "beach", seaArea: "coast", lat: 35.68, lon: 126.53, wave: 0.6, wind: 4.2 },
  { key: "gosapo", name: "부안 고사포", station: "고사포해수욕장", group: "jeonbuk", kind: "beach", seaArea: "coast", lat: 35.66, lon: 126.51, wave: 0.6, wind: 4.3 },
  { key: "mohang", name: "부안 모항", station: "모항해수욕장", group: "jeonbuk", kind: "beach", seaArea: "coast", lat: 35.58, lon: 126.52, wave: 0.7, wind: 4.5 },
  { key: "mokpo", name: "목포", station: "목포항", group: "jeonnam", kind: "harbor", seaArea: "nearshore", lat: 34.78, lon: 126.38, wave: 0.7, wind: 4.6 },
  { key: "heuksando", name: "흑산도", station: "흑산도 연안", group: "jeonnam", kind: "buoy", seaArea: "nearshore", lat: 34.68, lon: 125.43, wave: 1.5, wind: 7.6, weather: "cloud", overview: "흐림" },
  { key: "hongdo", name: "신안 홍도", station: "홍도 연안", group: "jeonnam", kind: "buoy", seaArea: "nearshore", lat: 34.68, lon: 125.19, wave: 1.6, wind: 7.8, weather: "cloud", overview: "흐림" },
  { key: "jindo-gagye", name: "진도 가계", station: "가계해수욕장", group: "jeonnam", kind: "beach", seaArea: "coast", lat: 34.49, lon: 126.26, wave: 0.8, wind: 4.7 },
  { key: "yulpo", name: "보성 율포", station: "율포솔밭해수욕장", group: "jeonnam", kind: "beach", seaArea: "coast", lat: 34.67, lon: 127.09, wave: 0.5, wind: 3.8 },
  { key: "sinji-myeongsasimni", name: "완도 신지", station: "명사십리해수욕장", group: "jeonnam", kind: "beach", seaArea: "coast", lat: 34.32, lon: 126.81, wave: 0.7, wind: 4.4 },
  { key: "jeungdo-ujjeon", name: "신안 증도", station: "우전해수욕장", group: "jeonnam", kind: "beach", seaArea: "coast", lat: 35.00, lon: 126.14, wave: 0.6, wind: 4.1 },
  { key: "yeosu", name: "여수", station: "여수항", group: "south", kind: "harbor", seaArea: "nearshore", lat: 34.74, lon: 127.74, wave: 0.8, wind: 4.8 },
  { key: "tongyeong", name: "통영", station: "통영항", group: "south", kind: "harbor", seaArea: "nearshore", lat: 34.84, lon: 128.43, wave: 0.7, wind: 4.1 },
  { key: "namhae-sangju", name: "남해 상주", station: "상주은모래비치", group: "south", kind: "beach", seaArea: "coast", lat: 34.72, lon: 127.99, wave: 0.6, wind: 4.2 },
  { key: "geoje-gujora", name: "거제 구조라", station: "구조라해수욕장", group: "south", kind: "beach", seaArea: "coast", lat: 34.80, lon: 128.69, wave: 0.6, wind: 4.0 },
  { key: "geoje-hakdong", name: "거제 학동", station: "학동몽돌해수욕장", group: "south", kind: "beach", seaArea: "coast", lat: 34.77, lon: 128.64, wave: 0.7, wind: 4.2 },
  { key: "busan-songjeong", name: "부산 송정", station: "송정해수욕장", group: "south", kind: "beach", seaArea: "coast", lat: 35.18, lon: 129.20, wave: 0.8, wind: 4.6 },
  { key: "busan-haeundae", name: "부산 해운대", station: "해운대해수욕장", group: "south", kind: "beach", seaArea: "coast", lat: 35.16, lon: 129.16, wave: 0.7, wind: 4.4, weather: "sun", overview: "맑음" },
  { key: "busan-gwangalli", name: "부산 광안리", station: "광안리해수욕장", group: "south", kind: "beach", seaArea: "coast", lat: 35.15, lon: 129.12, wave: 0.6, wind: 4.0, weather: "sun", overview: "맑음" },
  { key: "ulsan-jinha", name: "울산 진하", station: "진하해수욕장", group: "east", kind: "beach", seaArea: "coast", lat: 35.38, lon: 129.34, wave: 0.8, wind: 5.0 },
  { key: "pohang-yeongildae", name: "포항 영일대", station: "영일대해수욕장", group: "east", kind: "beach", seaArea: "coast", lat: 36.06, lon: 129.38, wave: 0.9, wind: 5.2 },
  { key: "hupo", name: "울진 후포", station: "후포항", group: "east", kind: "harbor", seaArea: "nearshore", lat: 36.68, lon: 129.45, wave: 1.0, wind: 5.8 },
  { key: "samcheok-maengbang", name: "삼척 맹방", station: "맹방해수욕장", group: "east", kind: "beach", seaArea: "coast", lat: 37.40, lon: 129.23, wave: 0.9, wind: 5.4 },
  { key: "donghae-mangsang", name: "동해 망상", station: "망상해수욕장", group: "east", kind: "beach", seaArea: "coast", lat: 37.59, lon: 129.09, wave: 1.0, wind: 5.7 },
  { key: "gangneung-gyeongpo", name: "강릉 경포", station: "경포해수욕장", group: "east", kind: "beach", seaArea: "coast", lat: 37.80, lon: 128.91, wave: 1.0, wind: 5.6 },
  { key: "yangyang-naksan", name: "양양 낙산", station: "낙산해수욕장", group: "east", kind: "beach", seaArea: "coast", lat: 38.12, lon: 128.63, wave: 1.0, wind: 5.9 },
  { key: "sokcho", name: "속초", station: "속초항", group: "east", kind: "harbor", seaArea: "nearshore", lat: 38.21, lon: 128.60, wave: 1.1, wind: 6.1 },
  { key: "jeju-port", name: "제주", station: "제주항", group: "jeju", kind: "harbor", seaArea: "nearshore", lat: 33.52, lon: 126.54, wave: 1.0, wind: 6.0 },
  { key: "seogwipo", name: "서귀포", station: "서귀포항", group: "jeju", kind: "harbor", seaArea: "nearshore", lat: 33.24, lon: 126.56, wave: 1.0, wind: 5.8 },
  { key: "hamdeok", name: "제주 함덕", station: "함덕해수욕장", group: "jeju", kind: "beach", seaArea: "coast", lat: 33.54, lon: 126.67, wave: 0.7, wind: 4.8, weather: "sun", overview: "맑음" },
  { key: "gimnyeong", name: "제주 김녕", station: "김녕해수욕장", group: "jeju", kind: "beach", seaArea: "coast", lat: 33.56, lon: 126.76, wave: 0.8, wind: 5.0 },
  { key: "hyeopjae", name: "제주 협재", station: "협재해수욕장", group: "jeju", kind: "beach", seaArea: "coast", lat: 33.39, lon: 126.24, wave: 0.8, wind: 5.2, weather: "sun", overview: "맑음" },
  { key: "gwakji", name: "제주 곽지", station: "곽지해수욕장", group: "jeju", kind: "beach", seaArea: "coast", lat: 33.45, lon: 126.30, wave: 0.8, wind: 5.0 },
  { key: "jungmun", name: "서귀포 중문", station: "중문색달해수욕장", group: "jeju", kind: "beach", seaArea: "coast", lat: 33.25, lon: 126.41, wave: 1.0, wind: 5.5 },
  { key: "pyoseon", name: "서귀포 표선", station: "표선해수욕장", group: "jeju", kind: "beach", seaArea: "coast", lat: 33.33, lon: 126.84, wave: 0.9, wind: 5.2 },
  { key: "dalian-port", name: "중국 대련", station: "대련항", group: "chinaYellowSea", kind: "harbor", seaArea: "nearshore", lat: 38.92, lon: 121.64, wave: 0.9, wind: 5.6, weather: "cloud", overview: "흐림" },
  { key: "dalian-jinshitan", name: "중국 대련", station: "금석탄 해변", group: "chinaYellowSea", kind: "beach", seaArea: "coast", lat: 39.08, lon: 122.01, wave: 0.8, wind: 5.3, weather: "cloud", overview: "흐림" },
  { key: "weihai-port", name: "중국 위해", station: "위해항", group: "chinaYellowSea", kind: "harbor", seaArea: "nearshore", lat: 37.51, lon: 122.12, wave: 0.7, wind: 4.8, weather: "partly", overview: "구름" },
  { key: "weihai-international-beach", name: "중국 위해", station: "국제해수욕장", group: "chinaYellowSea", kind: "beach", seaArea: "coast", lat: 37.53, lon: 122.05, wave: 0.7, wind: 4.6, weather: "partly", overview: "구름" },
  { key: "shanghai-yangshan", name: "중국 상하이", station: "양산항", group: "chinaEastSea", kind: "harbor", seaArea: "nearshore", lat: 30.61, lon: 122.06, wave: 1.0, wind: 6.2, weather: "cloud", overview: "흐림" },
  { key: "zhoushan", name: "중국 저우산", station: "저우산 군도", group: "chinaEastSea", kind: "buoy", seaArea: "nearshore", lat: 29.99, lon: 122.20, wave: 1.2, wind: 6.8, weather: "cloud", overview: "흐림" },
  { key: "ningbo-zhoushan", name: "중국 닝보", station: "닝보-저우산항", group: "chinaEastSea", kind: "harbor", seaArea: "nearshore", lat: 29.87, lon: 121.93, wave: 1.1, wind: 6.4, weather: "partly", overview: "구름" },
  { key: "xiamen-coast", name: "중국 샤먼", station: "샤먼 연안", group: "chinaEastSea", kind: "harbor", seaArea: "nearshore", lat: 24.48, lon: 118.08, wave: 1.3, wind: 7.0, weather: "partly", overview: "구름" },
  { key: "offshore-west-central", name: "서해중부", station: "서해중부먼바다", group: "offshore", kind: "offshore", seaArea: "offshore", lat: 36.9, lon: 125.3, wave: 1.8, wind: 8.2, weather: "cloud", overview: "흐림" },
  { key: "offshore-west-south", name: "서해남부", station: "서해남부먼바다", group: "offshore", kind: "offshore", seaArea: "offshore", lat: 35.2, lon: 125.1, wave: 2.0, wind: 9.4, weather: "cloud", overview: "흐림" },
  { key: "offshore-south-west", name: "남해서부", station: "남해서부먼바다", group: "offshore", kind: "offshore", seaArea: "offshore", lat: 33.9, lon: 126.9, wave: 1.7, wind: 8.8 },
  { key: "offshore-south-east", name: "남해동부", station: "남해동부먼바다", group: "offshore", kind: "offshore", seaArea: "offshore", lat: 34.5, lon: 128.6, wave: 1.6, wind: 8.4 },
  { key: "offshore-east-central", name: "동해중부", station: "동해중부먼바다", group: "offshore", kind: "offshore", seaArea: "offshore", lat: 37.8, lon: 130.0, wave: 2.2, wind: 10.2 },
  { key: "offshore-east-south", name: "동해남부", station: "동해남부먼바다", group: "offshore", kind: "offshore", seaArea: "offshore", lat: 35.7, lon: 130.0, wave: 1.9, wind: 9.0 },
  { key: "offshore-jeju", name: "제주남쪽", station: "제주남쪽먼바다", group: "offshore", kind: "offshore", seaArea: "offshore", lat: 32.6, lon: 126.5, wave: 2.1, wind: 9.8 },
];

const nationalMarineCatalogRegions = nationalMarineCatalogSeeds.map(createMarineCatalogRegion);
const systemRegions = [...baseRegions, ...offshoreRegions, ...nationalMarineCatalogRegions];
const presetMarineRegionKeys = new Set([...baseRegions, ...offshoreRegions].map((region) => region.key));

function marineAdministrativeKey(region: Pick<Region, "key" | "name" | "seaArea" | "marineGroup">): MarineRegionGroupKey {
  if (region.marineGroup) {
    return region.marineGroup;
  }

  if (region.key.startsWith("custom-")) {
    return "custom";
  }

  if (region.seaArea === "offshore") {
    return "offshore";
  }

  if (/인천|백령|대부|제부|평택|안산|화성/.test(region.name)) return "incheonGyeonggi";
  if (/서산|당진|태안|보령|서천/.test(region.name)) return "chungnam";
  if (/군산|부안|격포|변산|선유도/.test(region.name)) return "jeonbuk";
  if (/목포|흑산|홍도|신안|진도|완도/.test(region.name)) return "jeonnam";
  if (/여수|통영|거제|부산|남해/.test(region.name)) return "south";
  if (/울산|포항|울진|강릉|속초|삼척|동해/.test(region.name)) return "east";
  if (/제주|서귀포|협재|중문/.test(region.name)) return "jeju";

  return "custom";
}

function getMarineSettingsGroups(regionList: Region[]) {
  const regionKeys = Array.from(new Set(regionList.map((region) => marineAdministrativeKey(region))));
  const orderedKeys = [
    ...marineRegionGroupOrder.filter((key) => regionKeys.includes(key)),
    ...regionKeys.filter((key) => !marineRegionGroupOrder.includes(key)).sort((first, second) => first.localeCompare(second, "ko")),
  ];

  return orderedKeys
    .map((key) => ({
      key,
      label: marineRegionGroupLabels[key],
      regions: regionList.filter((region) => marineAdministrativeKey(region) === key),
    }))
    .filter((group) => group.regions.length > 0);
}

function marineLocationGroupLabel(region: Pick<Region, "name" | "seaArea">) {
  if (region.seaArea === "offshore") {
    return "원해";
  }

  return region.name.split(" ")[0] || region.name;
}

function getMarineLocationGroups(regionList: Region[]) {
  const labels = Array.from(new Set(regionList.map((region) => marineLocationGroupLabel(region))));

  return labels
    .map((label) => ({
      key: label,
      label,
      regions: regionList.filter((region) => marineLocationGroupLabel(region) === label),
    }))
    .sort((first, second) => first.label.localeCompare(second.label, "ko"));
}

function aviationAdministrativeKey(zone: AviationZone): AviationRegionGroupKey | "custom" {
  return zone.regionGroup || (zone.id.startsWith("custom-air-") ? "custom" : "chungcheong");
}

function getAviationSettingsGroups(zoneList: AviationZone[]) {
  const zoneKeys = Array.from(new Set(zoneList.map((zone) => aviationAdministrativeKey(zone))));
  const orderedKeys = [
    ...aviationRegionGroupOrder.filter((key) => zoneKeys.includes(key)),
    ...zoneKeys.filter((key) => !aviationRegionGroupOrder.includes(key)).sort((first, second) => first.localeCompare(second, "ko")),
  ];

  return orderedKeys
    .map((key) => ({
      key,
      label: aviationRegionGroupLabels[key],
      zones: zoneList.filter((zone) => aviationAdministrativeKey(zone) === key),
    }))
    .filter((group) => group.zones.length > 0);
}

type ApiHarborCandidate = {
  id: string;
  regionKey: RegionKey;
  regionName: string;
  marineGroup: MarineRegionGroupKey;
  harbor: HarborOption;
};

const apiHarborCandidates: ApiHarborCandidate[] = systemRegions.flatMap((region) =>
  region.harbors.map((harbor) => ({
    id: `${region.key}:${harbor.harborName}`,
    regionKey: region.key,
    regionName: region.name,
    marineGroup: harbor.marineGroup || marineAdministrativeKey(region),
    harbor,
  })),
);

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
  seosan: "서산",
  dangjin: "평택",
  taean: "태안",
  boryeong: "보령",
  "seosan-offshore": "서산",
  "dangjin-offshore": "평택",
  "taean-offshore": "태안",
  "boryeong-offshore": "보령",
};

function defaultMarineRow(seaArea: SeaAreaType = "nearshore"): MarineRow {
  if (seaArea === "offshore") {
    return {
      alert: "없음",
      overview: "원해 기준",
      wave: "1.6m",
      tideAge: "7물",
      lowTide: "04:40",
      highTide: "11:05",
      waterTemp: "14.0℃",
      windSpeed: "8.0m/s",
      windDirection: "서",
      current: "0.6m/s",
    };
  }

  if (seaArea === "coast") {
    return {
      alert: "없음",
      overview: "해안 기준",
      wave: "0.4m",
      tideAge: "7물",
      lowTide: "04:25",
      highTide: "10:45",
      waterTemp: "15.2℃",
      windSpeed: "3.4m/s",
      windDirection: "서",
      current: "0.3m/s",
    };
  }

  return {
    alert: "없음",
    overview: "연안 기준",
    wave: "0.8m",
    tideAge: "7물",
    lowTide: "04:30",
    highTide: "10:50",
    waterTemp: "15.0℃",
    windSpeed: "4.0m/s",
    windDirection: "서",
    current: "0.4m/s",
  };
}

function windyCoordinateUrl(lat: number, lon: number, zoom = 8, overlay = "waves") {
  return `https://www.windy.com/?${overlay},${lat.toFixed(3)},${lon.toFixed(3)},${zoom}`;
}

function customRegionToRegion(config: CustomRegionConfig): Region {
  const seaArea = config.seaArea || "nearshore";
  const fixed = config.fixed || defaultMarineRow(seaArea);
  const detailUrl =
    config.badatimeUrl ||
    (seaArea === "offshore" ? windyCoordinateUrl(config.lat, config.lon) : "https://www.badatime.com/");

  return {
    key: config.key,
    name: config.name,
    seaArea,
    marineGroup: config.marineGroup || "custom",
    stationKind: seaArea === "offshore" ? "offshore" : "harbor",
    lat: config.lat,
    lon: config.lon,
    tideCode: config.tideCode || "CUSTOM",
    currentCode: config.currentCode || "CUSTOM",
    kmaHint: config.kmaHint || config.name,
    nifsHint: config.nifsHint || config.name,
    airTemp: config.airTemp || "15.0℃",
    badatimeUrl: detailUrl,
    defaultWeather: config.defaultWeather || "partly",
    fixed,
    harbors: [
      {
        harborName: config.harborName,
        seaArea,
        marineGroup: config.marineGroup || "custom",
        stationKind: seaArea === "offshore" ? "offshore" : "harbor",
        lat: config.lat,
        lon: config.lon,
        tideCode: config.tideCode || "CUSTOM",
        currentCode: config.currentCode || "CUSTOM",
        kmaHint: config.kmaHint || config.name,
        nifsHint: config.nifsHint || config.name,
        airTemp: config.airTemp || "15.0℃",
        badatimeUrl: detailUrl,
        defaultWeather: config.defaultWeather || "partly",
        fixed,
      },
    ],
  };
}

function numberFromText(value: string, fallback: number) {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function regionToZone(region: ResolvedRegion): CoastalZone {
  const selectedBaseZone = zones.find((zone) => zone.id === region.key);

  if (selectedBaseZone) {
    return {
      ...selectedBaseZone,
      center: [region.lat, region.lon],
    };
  }

  const seaArea = region.seaArea || "nearshore";
  const areaLabel = seaAreaLabels[seaArea];

  return {
    id: region.key,
    label: region.name,
    name: `${region.name} ${areaLabel} · ${region.harborName} 일대`,
    seaArea,
    center: [region.lat, region.lon],
    data: {
      waveHeightM: numberFromText(region.fixed.wave, seaArea === "offshore" ? 1.6 : 0.8),
      windSpeedMs: numberFromText(region.fixed.windSpeed, seaArea === "offshore" ? 8 : 5.5),
      visibilityKm: seaArea === "offshore" ? 7.5 : 6,
      tideStatus: "중간",
      currentStatus: "보통",
      timeBand: "evening",
      weatherStatus: "흐림",
      temperatureC: 15,
      pmLevel: "보통",
      fireRiskLevel: "보통",
      fogLevel: "의심",
      cctvVisibility: "보통",
    },
  };
}

function defaultHarborSelections(regionList: Region[] = systemRegions): Record<RegionKey, string> {
  return Object.fromEntries(
    regionList.map((region) => [region.key, region.harbors[0]?.harborName || region.name]),
  ) as Record<RegionKey, string>;
}

function storedHarborSelections(regionList: Region[] = systemRegions) {
  if (typeof window === "undefined") {
    return defaultHarborSelections(regionList);
  }

  try {
    const stored = window.localStorage.getItem(HARBOR_STORAGE_KEY);
    return stored
      ? ({ ...defaultHarborSelections(regionList), ...JSON.parse(stored) } as Record<RegionKey, string>)
      : defaultHarborSelections(regionList);
  } catch {
    return defaultHarborSelections(regionList);
  }
}

function storedEnabledRegionKeys(regionList: Region[] = systemRegions) {
  const fallback = defaultEnabledRegionKeys(regionList);

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(REGION_VISIBILITY_STORAGE_KEY);
    const version = window.localStorage.getItem(REGION_VISIBILITY_VERSION_STORAGE_KEY);
    const hasStoredSelection = stored !== null;
    const parsed = hasStoredSelection ? (JSON.parse(stored) as string[]) : fallback;
    const validKeys = new Set(regionList.map((region) => region.key));
    const filtered = parsed.filter((key) => validKeys.has(key));
    if (hasStoredSelection && version !== REGION_VISIBILITY_VERSION) {
      const next = filtered.length ? Array.from(new Set([...filtered, ...fallback])) : filtered;
      window.localStorage.setItem(REGION_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(REGION_VISIBILITY_VERSION_STORAGE_KEY, REGION_VISIBILITY_VERSION);
      return next;
    }
    window.localStorage.setItem(REGION_VISIBILITY_VERSION_STORAGE_KEY, REGION_VISIBILITY_VERSION);
    return hasStoredSelection ? filtered : fallback;
  } catch {
    return fallback;
  }
}

function defaultEnabledRegionKeys(regionList: Region[] = systemRegions) {
  const preset = regionList.filter((region) => presetMarineRegionKeys.has(region.key)).map((region) => region.key);
  return preset.length ? preset : regionList.slice(0, 1).map((region) => region.key);
}

function defaultEnabledLandZoneIds(zoneList: LandZone[]) {
  const presetIds = zoneList.filter((zone) => presetLandZoneIds.has(zone.id)).map((zone) => zone.id);
  return presetIds.length ? presetIds : zoneList.slice(0, 1).map((zone) => zone.id);
}

function storedEnabledLandZoneIds(zoneList: LandZone[]) {
  const fallback = defaultEnabledLandZoneIds(zoneList);

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(LAND_ZONE_VISIBILITY_STORAGE_KEY);
    const version = window.localStorage.getItem(LAND_ZONE_VISIBILITY_VERSION_STORAGE_KEY);
    const hasStoredSelection = stored !== null;
    const parsed = hasStoredSelection ? (JSON.parse(stored) as string[]) : fallback;
    const validIds = new Set(zoneList.map((zone) => zone.id));
    const filtered = parsed.filter((id) => validIds.has(id));

    if (hasStoredSelection && version !== LAND_ZONE_VISIBILITY_VERSION) {
      const next = filtered.length ? Array.from(new Set([...filtered, ...fallback])) : filtered;
      window.localStorage.setItem(LAND_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(LAND_ZONE_VISIBILITY_VERSION_STORAGE_KEY, LAND_ZONE_VISIBILITY_VERSION);
      return next;
    }

    window.localStorage.setItem(LAND_ZONE_VISIBILITY_VERSION_STORAGE_KEY, LAND_ZONE_VISIBILITY_VERSION);
    return hasStoredSelection ? filtered : fallback;
  } catch {
    return fallback;
  }
}

function storedCustomRegionConfigs() {
  if (typeof window === "undefined") {
    return [] as CustomRegionConfig[];
  }

  try {
    const stored = window.localStorage.getItem(CUSTOM_REGIONS_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as CustomRegionConfig[]) : [];
    return parsed
      .map((item) => ({
        ...item,
        seaArea: ["coast", "nearshore", "offshore"].includes(item.seaArea)
          ? item.seaArea
          : ("nearshore" as SeaAreaType),
      }))
      .filter(
        (item) =>
        item.key &&
        item.name &&
        item.harborName &&
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lon),
      );
  } catch {
    return [];
  }
}

const landCustomGroupKeys: Array<Exclude<LandRegionGroupKey, "all">> = [
  "capital",
  "gangwon",
  "chungcheong",
  "honam",
  "yeongnam",
  "jeju",
];

function isLandCustomGroupKey(value: unknown): value is Exclude<LandRegionGroupKey, "all"> {
  return typeof value === "string" && landCustomGroupKeys.includes(value as Exclude<LandRegionGroupKey, "all">);
}

function storedCustomLandZoneConfigs() {
  if (typeof window === "undefined") {
    return [] as CustomLandZoneConfig[];
  }

  try {
    const stored = window.localStorage.getItem(CUSTOM_LAND_ZONES_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as CustomLandZoneConfig[]) : [];
    return parsed.filter(
      (item) =>
        item.id &&
        item.name &&
        item.sector &&
        isLandCustomGroupKey(item.regionGroup) &&
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lon),
    );
  } catch {
    return [];
  }
}

function defaultAviationZoneData(overrides: Partial<AviationZoneData> = {}): AviationZoneData {
  return {
    averageWindSpeedMs: overrides.averageWindSpeedMs ?? 4.8,
    gustSpeedMs: overrides.gustSpeedMs ?? 8.6,
    windDirection: overrides.windDirection ?? "서",
    returnWindStatus: overrides.returnWindStatus ?? "복귀 유리",
    precipitationMm: overrides.precipitationMm ?? 0,
    snowfallCm: overrides.snowfallCm ?? 0,
    visibilityKm: overrides.visibilityKm ?? 8,
    fogLevel: overrides.fogLevel ?? "없음",
    temperatureC: overrides.temperatureC ?? 22,
    humidityPercent: overrides.humidityPercent ?? 58,
    dewPointC: overrides.dewPointC ?? 13,
    lightningRisk: overrides.lightningRisk ?? "낮음",
    thunderstormRisk: overrides.thunderstormRisk ?? "낮음",
    cloudCeilingFt: overrides.cloudCeilingFt ?? 3200,
    cloudAmountOctas: overrides.cloudAmountOctas ?? 3,
    weatherStatus: overrides.weatherStatus ?? "맑음",
  };
}

function customAviationZoneToZone(config: CustomAviationZoneConfig): AviationZone {
  const label = (config.label || config.name.replace(/\s/g, "").slice(0, 4) || "공역").slice(0, 8);

  return {
    id: config.id,
    label,
    name: config.name,
    sector: config.sector,
    regionGroup: config.regionGroup || "chungcheong",
    center: [config.lat, config.lon],
    radius: 1400,
    data: defaultAviationZoneData({
      averageWindSpeedMs: config.averageWindSpeedMs,
      gustSpeedMs: config.gustSpeedMs,
      windDirection: config.windDirection,
      visibilityKm: config.visibilityKm,
      cloudCeilingFt: config.cloudCeilingFt,
    }),
  };
}

function storedCustomAviationZoneConfigs() {
  if (typeof window === "undefined") {
    return [] as CustomAviationZoneConfig[];
  }

  try {
    const stored = window.localStorage.getItem(CUSTOM_AVIATION_ZONES_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as CustomAviationZoneConfig[]) : [];
    return parsed.filter(
      (item) =>
        item.id &&
        item.name &&
        item.sector &&
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lon),
    );
  } catch {
    return [];
  }
}

function storedEnabledAviationZoneIds(zoneList: AviationZone[]) {
  const fallback = defaultEnabledAviationZoneIds(zoneList);

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(AVIATION_ZONE_VISIBILITY_STORAGE_KEY);
    const version = window.localStorage.getItem(AVIATION_ZONE_VISIBILITY_VERSION_STORAGE_KEY);
    const hasStoredSelection = stored !== null;
    const parsed = hasStoredSelection ? (JSON.parse(stored) as string[]) : fallback;
    const validIds = new Set(zoneList.map((zone) => zone.id));
    const filtered = parsed.filter((id) => validIds.has(id));

    if (hasStoredSelection && version !== AVIATION_ZONE_VISIBILITY_VERSION) {
      const next = filtered.length ? Array.from(new Set([...filtered, ...fallback])) : filtered;
      window.localStorage.setItem(AVIATION_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(AVIATION_ZONE_VISIBILITY_VERSION_STORAGE_KEY, AVIATION_ZONE_VISIBILITY_VERSION);
      return next;
    }

    window.localStorage.setItem(AVIATION_ZONE_VISIBILITY_VERSION_STORAGE_KEY, AVIATION_ZONE_VISIBILITY_VERSION);
    return hasStoredSelection ? filtered : fallback;
  } catch {
    return fallback;
  }
}

function defaultEnabledAviationZoneIds(zoneList: AviationZone[]) {
  const preset = zoneList.filter((zone) => presetAviationZoneIds.has(zone.id)).map((zone) => zone.id);
  return preset.length ? preset : zoneList.slice(0, 1).map((zone) => zone.id);
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
    seaArea: harbor.seaArea || region.seaArea,
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
  return windyCoordinateUrl(region.lat, region.lon);
}

function kmaWeatherMapUrl(lat: number, lon: number, zoom = 8) {
  return createUrl(KMA_WEATHER_MAP_URL, {
    zoom: zoom.toFixed(1),
    center: `${lat.toFixed(5)},${lon.toFixed(5)}`,
    location: `${lat.toFixed(5)},${lon.toFixed(5)}`,
    fold: "true",
    blank: "true",
  }).toString();
}

function kmaMarineMapUrl() {
  return KMA_MARINE_MAP_URL;
}

const windyOverlayLabels: Record<WindyOverlay, string> = {
  waves: "파고",
  wind: "바람",
  rain: "강수",
  clouds: "구름",
  temp: "기온",
};

const coastalWindyOverlays: WindyOverlay[] = ["waves", "wind", "rain", "clouds"];
const weatherWindyOverlays: WindyOverlay[] = ["wind", "rain", "temp", "clouds"];

function windyGenericEmbedUrl(lat: number, lon: number, overlay = "wind", zoom = "8") {
  const url = createUrl(WINDY_EMBED_BASE_URL, {
    lat: lat.toFixed(3),
    lon: lon.toFixed(3),
    detailLat: lat.toFixed(3),
    detailLon: lon.toFixed(3),
    zoom,
    level: "surface",
    overlay,
    product: overlay === "waves" ? "gfsWaves" : "ecmwf",
    menu: "true",
    message: "true",
    marker: "true",
    calendar: "now",
    pressure: "true",
    type: "map",
    location: "coordinates",
    detail: "",
    metricWind: "m/s",
    metricTemp: "°C",
    radarRange: "-1",
  });

  url.searchParams.set("detail", "");
  return url.toString();
}

function windyProductForOverlay(overlay: WindyOverlay) {
  return overlay === "waves" ? "gfsWaves" : "ecmwf";
}

function windyLandEmbedUrl(item: LandAssessment, overlay: WindyOverlay) {
  const [lat, lon] = item.zone.center;
  return windyGenericEmbedUrl(lat, lon, overlay, item.zone.regionGroup === "jeju" ? "8" : "9");
}

function windyAviationEmbedUrl(item: AviationAssessment, overlay: WindyOverlay) {
  const [lat, lon] = item.zone.center;
  return windyGenericEmbedUrl(lat, lon, overlay, "8");
}

function windyBladeEmbedUrl(item: ZoneAssessment, overlay: WindyOverlay) {
  const [lat, lon] = item.zone.center;
  const url = createUrl(WINDY_EMBED_BASE_URL, {
    lat: lat.toFixed(3),
    lon: lon.toFixed(3),
    detailLat: lat.toFixed(3),
    detailLon: lon.toFixed(3),
    zoom: item.zone.seaArea === "offshore" ? "7" : "8",
    level: "surface",
    overlay,
    product: windyProductForOverlay(overlay),
    menu: "true",
    message: "true",
    marker: "true",
    calendar: "now",
    pressure: "true",
    type: "map",
    location: "coordinates",
    detail: "",
    metricWind: "m/s",
    metricTemp: "°C",
    radarRange: "-1",
  });

  url.searchParams.set("detail", "");
  return url.toString();
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
      location: astronomyLocations[region.key] || region.kmaHint || region.name,
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
    throw new Error("윈디 지점 예보 키가 없습니다.");
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

function isChinaMarineRegion(region: Pick<Region, "marineGroup" | "name">) {
  return region.marineGroup === "chinaYellowSea" || region.marineGroup === "chinaEastSea" || region.name.startsWith("중국");
}

async function fetchOfficialBundle(region: Region): Promise<OfficialBundle> {
  const row: MarineRow = { ...region.fixed };
  let weather = fallbackWeather(region);
  let hourly = fallbackHourly(region);
  const windyOnlyRegion = isChinaMarineRegion(region);

  if (!windyOnlyRegion) {
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
  }

  if (!windyOnlyRegion) {
    try {
      const marine = await fetchOpenMeteoMarine(region);
      row.wave = marine.wave || row.wave;
      row.waterTemp = marine.waterTemp || row.waterTemp;
      hourly = mergeHourlyMarine(hourly, { hourly: marine.hourly });
    } catch {
      row.wave = row.wave || region.fixed.wave;
    }
  }

  if (!windyOnlyRegion) {
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

  if (!windyOnlyRegion) {
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
  }

  if (!windyOnlyRegion) {
    try {
      row.alert = (await fetchKmaWarning(region)) || row.alert;
    } catch {
      row.alert = row.alert || "없음";
    }
  }

  if (!windyOnlyRegion) {
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
  }

  row.lowTide2 = row.lowTide2 || addHours(row.lowTide, 12);
  row.highTide2 = row.highTide2 || addHours(row.highTide, 12);

  if (!windyOnlyRegion) {
    try {
      row.current = (await fetchKhoaCurrent(region)) || row.current;
    } catch {
      row.current = row.current || region.fixed.current;
    }
  }

  if (!windyOnlyRegion) {
    try {
      row.waterTemp = (await fetchNifsWaterTemp(region)) || row.waterTemp;
    } catch {
      row.waterTemp = row.waterTemp || region.fixed.waterTemp;
    }
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
          src={DIVISION_MARK_SRC}
          alt="제32보병사단"
          width={150}
          height={180}
          priority
        />

        <h1>
          <strong>{INTEGRATED_SYSTEM_NAME}</strong>
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
          <strong>
            {region.name}
            <em>{seaAreaLabels[region.seaArea]}</em>
          </strong>
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

type OperationalRegionCardItem = {
  id: string;
  label: string;
  name: string;
  sector: string;
  score: number;
  level: RiskLevel;
  metrics: SituationMetric[];
};

function OperationalRegionCardGrid({
  items,
  activeId,
  ariaLabel,
  onSelect,
}: {
  items: OperationalRegionCardItem[];
  activeId: string;
  ariaLabel: string;
  onSelect: (id: string) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>, itemId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(itemId);
    }
  }

  return (
    <section className="region-grid operation-region-grid" aria-label={ariaLabel}>
      {items.map((item) => (
        <article
          role="button"
          tabIndex={0}
          key={item.id}
          className={`region-card operation-region-card ${riskLevelClass(item.level)} ${item.id === activeId ? "active" : ""}`}
          title={item.name}
          onClick={() => onSelect(item.id)}
          onKeyDown={(event) => handleKeyDown(event, item.id)}
          aria-pressed={item.id === activeId}
        >
          <div className="region-card-top">
            <div className="region-name">
              <strong>
                {item.label}
                <em>{item.level}</em>
              </strong>
              <span>{item.sector}</span>
            </div>
            <span className="operation-card-score">
              <strong>{item.score}</strong>
              <em>점</em>
            </span>
          </div>
          <dl className="operation-card-metrics">
            {item.metrics.map((metric) => (
              <div key={`${item.id}-${metric.label}`}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </section>
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

function WindyOverlaySelector({
  value,
  options,
  onChange,
}: {
  value: WindyOverlay;
  options: WindyOverlay[];
  onChange: (overlay: WindyOverlay) => void;
}) {
  return (
    <div className="windy-overlay-selector" aria-label="윈디 지도 종류">
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className={value === option ? "active" : undefined}
          onClick={() => onChange(option)}
          aria-pressed={value === option}
        >
          {windyOverlayLabels[option]}
        </button>
      ))}
    </div>
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

type SituationMatrixRow = {
  label: string;
  values: string[];
};

type SituationMetric = {
  label: string;
  value: string;
  detail?: string;
};

const situationTimeLabels = ["00시", "03시", "06시", "09시", "12시", "15시", "18시", "21시"];
const temperatureOffsets = [-2, -2, -1, 1, 3, 2, 0, -1];
const windOffsets = [0, 0.4, 0.8, 0.6, 0.2, 0, 0.3, 0.5];

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number, digits = 0) {
  return value.toFixed(digits);
}

function OperationalHourlyStrip({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: SituationMatrixRow[];
}) {
  return (
    <section className="hourly-strip operational-hourly-strip" aria-label={title}>
      <div className="hourly-title">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="hourly-table-scroll">
        <div
          className="hourly-matrix"
          style={{
            gridTemplateColumns: `80px repeat(${situationTimeLabels.length}, minmax(92px, 1fr))`,
          }}
        >
          <div className="hourly-cell hourly-corner">구분</div>
          {situationTimeLabels.map((time) => (
            <div className="hourly-cell hourly-time" key={`${title}-${time}`}>
              {time}
            </div>
          ))}
          {rows.map((row) => (
            <Fragment key={row.label}>
              <div className="hourly-cell hourly-row-label">{row.label}</div>
              {row.values.map((value, index) => (
                <div className="hourly-cell hourly-value" key={`${title}-${row.label}-${situationTimeLabels[index]}`}>
                  {value}
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
                    <em>{seaAreaLabels[region.seaArea]}</em>
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

type ZoneAssessment = {
  zone: CoastalZone;
  assessment: RiskAssessment;
};

type LandAssessment = {
  zone: LandZone;
  assessment: LandRiskAssessment;
};

type AviationAssessment = {
  zone: AviationZone;
  assessment: AviationRiskAssessment;
};

type LandRegionGroupKey = "all" | "capital" | "gangwon" | "chungcheong" | "honam" | "yeongnam" | "jeju";
type LandAxisKey = "personnelLoad" | "visibility" | "mobility" | "environmentalHazard";
type LandAxisName = "인원 부담도" | "시야 제한도" | "이동 제한도" | "환경 위험도";
type LandDustLevel = "매우나쁨" | "나쁨" | "보통" | "좋음";
type LandAlertLevel =
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

type LandZoneData = {
  temperatureC: number;
  humidityPercent: number;
  apparentTemperatureC?: number;
  wbgtC?: number;
  precipitationMm: number;
  precipitationProbability: number;
  windSpeedMs: number;
  windDirection?: string;
  visibilityKm: number;
  weatherStatus: "맑음" | "흐림" | "비" | "눈" | "안개" | "강풍" | "뇌우";
  fogLevel: "심함" | "발생" | "의심" | "없음";
  pm10Level: LandDustLevel;
  pm25Level: LandDustLevel;
  ozoneLevel: LandDustLevel;
  fireRiskLevel: "매우높음" | "높음" | "보통" | "낮음";
  weatherAlert: LandAlertLevel;
  pressureHpa: number;
  pressureTrend: "급하강" | "하강" | "유지" | "상승";
  uvIndexLevel: "매우높음" | "높음" | "보통" | "낮음";
  lightningRisk: "높음" | "보통" | "낮음" | "없음";
  snowDepthCm: number;
  icingRisk: "심함" | "가능" | "없음";
};

type LandZone = {
  id: string;
  label: string;
  name: string;
  sector: string;
  regionGroup: Exclude<LandRegionGroupKey, "all">;
  center: readonly [number, number];
  radius: number;
  data: LandZoneData;
};

type LandRiskContribution = {
  factor: string;
  value: string;
  axis: LandAxisName;
  normalizedScore: number;
  weight: number;
  contribution: number;
  reason: string;
};

type LandRiskAssessment = {
  score: number;
  level: RiskLevel;
  summary: string;
  axisScores: Record<LandAxisKey, number>;
  contributions: LandRiskContribution[];
  matchedRules: RiskAssessment["matchedRules"];
};

const landRegionGroups: Array<{ key: LandRegionGroupKey; label: string }> = [
  { key: "all", label: "전국" },
  { key: "capital", label: "수도권" },
  { key: "gangwon", label: "강원권" },
  { key: "chungcheong", label: "충청권" },
  { key: "honam", label: "호남권" },
  { key: "yeongnam", label: "영남권" },
  { key: "jeju", label: "제주권" },
];

const priorityLandZones: LandZone[] = [
  {
    id: "L-A",
    label: "종로",
    name: "서울특별시 종로구",
    sector: "수도권 · 도심",
    regionGroup: "capital",
    center: [37.5735, 126.979],
    radius: 1200,
    data: { temperatureC: 34, humidityPercent: 82, apparentTemperatureC: 38, wbgtC: 32, precipitationMm: 12, precipitationProbability: 85, windSpeedMs: 9.5, windDirection: "남서", visibilityKm: 2.4, weatherStatus: "비", fogLevel: "발생", pm10Level: "보통", pm25Level: "나쁨", ozoneLevel: "나쁨", fireRiskLevel: "높음", weatherAlert: "폭염경보", pressureHpa: 998, pressureTrend: "급하강", uvIndexLevel: "매우높음", lightningRisk: "보통", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-B",
    label: "인천",
    name: "인천광역시 중구",
    sector: "수도권 · 항만 배후",
    regionGroup: "capital",
    center: [37.4737, 126.6215],
    radius: 1200,
    data: { temperatureC: 24, humidityPercent: 66, apparentTemperatureC: 26, wbgtC: 24, precipitationMm: 2, precipitationProbability: 45, windSpeedMs: 7.2, windDirection: "서", visibilityKm: 5.8, weatherStatus: "흐림", fogLevel: "의심", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "보통", weatherAlert: "없음", pressureHpa: 1008, pressureTrend: "유지", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-C",
    label: "수원",
    name: "경기도 수원시",
    sector: "수도권 · 남부 내륙",
    regionGroup: "capital",
    center: [37.2636, 127.0286],
    radius: 1200,
    data: { temperatureC: 22, humidityPercent: 48, apparentTemperatureC: 23, wbgtC: 21, precipitationMm: 0, precipitationProbability: 10, windSpeedMs: 2.8, windDirection: "북서", visibilityKm: 10.5, weatherStatus: "맑음", fogLevel: "없음", pm10Level: "좋음", pm25Level: "좋음", ozoneLevel: "보통", fireRiskLevel: "낮음", weatherAlert: "없음", pressureHpa: 1014, pressureTrend: "상승", uvIndexLevel: "보통", lightningRisk: "없음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-D",
    label: "파주",
    name: "경기도 파주시",
    sector: "수도권 · 북부 접경",
    regionGroup: "capital",
    center: [37.7599, 126.7799],
    radius: 1200,
    data: { temperatureC: 5, humidityPercent: 82, apparentTemperatureC: 2, wbgtC: 12, precipitationMm: 12, precipitationProbability: 85, windSpeedMs: 9.4, windDirection: "북동", visibilityKm: 2.8, weatherStatus: "비", fogLevel: "발생", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "좋음", fireRiskLevel: "낮음", weatherAlert: "호우주의보", pressureHpa: 1000, pressureTrend: "급하강", uvIndexLevel: "낮음", lightningRisk: "보통", snowDepthCm: 0, icingRisk: "가능" },
  },
  {
    id: "L-E",
    label: "춘천",
    name: "강원특별자치도 춘천시",
    sector: "강원권 · 호반 내륙",
    regionGroup: "gangwon",
    center: [37.8813, 127.7298],
    radius: 1200,
    data: { temperatureC: 18, humidityPercent: 62, apparentTemperatureC: 18, wbgtC: 20, precipitationMm: 1, precipitationProbability: 35, windSpeedMs: 4.4, windDirection: "남", visibilityKm: 7.5, weatherStatus: "흐림", fogLevel: "없음", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "보통", weatherAlert: "없음", pressureHpa: 1010, pressureTrend: "유지", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-F",
    label: "철원",
    name: "강원특별자치도 철원군",
    sector: "강원권 · 북부 산악",
    regionGroup: "gangwon",
    center: [38.1468, 127.3133],
    radius: 1200,
    data: { temperatureC: -2, humidityPercent: 74, apparentTemperatureC: -6, wbgtC: 8, precipitationMm: 4, precipitationProbability: 65, windSpeedMs: 6.8, windDirection: "북서", visibilityKm: 5.0, weatherStatus: "눈", fogLevel: "의심", pm10Level: "좋음", pm25Level: "보통", ozoneLevel: "좋음", fireRiskLevel: "낮음", weatherAlert: "한파주의보", pressureHpa: 1006, pressureTrend: "하강", uvIndexLevel: "낮음", lightningRisk: "없음", snowDepthCm: 6, icingRisk: "가능" },
  },
  {
    id: "L-G",
    label: "강릉",
    name: "강원특별자치도 강릉시",
    sector: "강원권 · 동해안",
    regionGroup: "gangwon",
    center: [37.7519, 128.8761],
    radius: 1200,
    data: { temperatureC: 29, humidityPercent: 58, apparentTemperatureC: 30, wbgtC: 26, precipitationMm: 0, precipitationProbability: 20, windSpeedMs: 10.2, windDirection: "서", visibilityKm: 8.2, weatherStatus: "강풍", fogLevel: "없음", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "높음", weatherAlert: "강풍주의보", pressureHpa: 1007, pressureTrend: "하강", uvIndexLevel: "높음", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-H",
    label: "천안",
    name: "충청남도 천안시",
    sector: "충청권 · 북부 내륙",
    regionGroup: "chungcheong",
    center: [36.8151, 127.1139],
    radius: 1200,
    data: { temperatureC: 27, humidityPercent: 42, apparentTemperatureC: 26, wbgtC: 24.8, precipitationMm: 0.5, precipitationProbability: 35, windSpeedMs: 8.4, windDirection: "서북서", visibilityKm: 4.8, weatherStatus: "흐림", fogLevel: "의심", pm10Level: "나쁨", pm25Level: "나쁨", ozoneLevel: "보통", fireRiskLevel: "높음", weatherAlert: "건조주의보", pressureHpa: 1009, pressureTrend: "유지", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-I",
    label: "서산",
    name: "충청남도 서산시",
    sector: "충청권 · 서북부 내륙",
    regionGroup: "chungcheong",
    center: [36.7848, 126.4503],
    radius: 1200,
    data: { temperatureC: 25, humidityPercent: 70, apparentTemperatureC: 27, wbgtC: 26, precipitationMm: 0.2, precipitationProbability: 30, windSpeedMs: 10.1, windDirection: "서북서", visibilityKm: 4.1, weatherStatus: "강풍", fogLevel: "발생", pm10Level: "나쁨", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "높음", weatherAlert: "강풍주의보", pressureHpa: 1005, pressureTrend: "하강", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-J",
    label: "보령",
    name: "충청남도 보령시",
    sector: "충청권 · 서남부",
    regionGroup: "chungcheong",
    center: [36.3335, 126.6129],
    radius: 1200,
    data: { temperatureC: 28, humidityPercent: 55, apparentTemperatureC: 29, wbgtC: 26.5, precipitationMm: 0, precipitationProbability: 20, windSpeedMs: 9.4, windDirection: "북서", visibilityKm: 5.6, weatherStatus: "강풍", fogLevel: "없음", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "높음", weatherAlert: "건조주의보", pressureHpa: 1010, pressureTrend: "유지", uvIndexLevel: "높음", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-K",
    label: "청주",
    name: "충청북도 청주시",
    sector: "충청권 · 중부 내륙",
    regionGroup: "chungcheong",
    center: [36.6424, 127.489],
    radius: 1200,
    data: { temperatureC: 33, humidityPercent: 81, apparentTemperatureC: 37, wbgtC: 31.5, precipitationMm: 0, precipitationProbability: 15, windSpeedMs: 5.2, windDirection: "남서", visibilityKm: 6.2, weatherStatus: "맑음", fogLevel: "없음", pm10Level: "보통", pm25Level: "나쁨", ozoneLevel: "나쁨", fireRiskLevel: "높음", weatherAlert: "폭염경보", pressureHpa: 1003, pressureTrend: "하강", uvIndexLevel: "매우높음", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-L",
    label: "전주",
    name: "전북특별자치도 전주시",
    sector: "호남권 · 내륙 도시",
    regionGroup: "honam",
    center: [35.8242, 127.148],
    radius: 1200,
    data: { temperatureC: 24, humidityPercent: 58, apparentTemperatureC: 25, wbgtC: 23, precipitationMm: 0, precipitationProbability: 15, windSpeedMs: 3.2, windDirection: "남", visibilityKm: 9.5, weatherStatus: "맑음", fogLevel: "없음", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "보통", weatherAlert: "없음", pressureHpa: 1012, pressureTrend: "상승", uvIndexLevel: "보통", lightningRisk: "없음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-M",
    label: "군산",
    name: "전북특별자치도 군산시",
    sector: "호남권 · 서해안",
    regionGroup: "honam",
    center: [35.9676, 126.7369],
    radius: 1200,
    data: { temperatureC: 21, humidityPercent: 86, apparentTemperatureC: 22, wbgtC: 23.5, precipitationMm: 18, precipitationProbability: 90, windSpeedMs: 8.8, windDirection: "남서", visibilityKm: 2.6, weatherStatus: "비", fogLevel: "발생", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "좋음", fireRiskLevel: "낮음", weatherAlert: "호우주의보", pressureHpa: 998, pressureTrend: "급하강", uvIndexLevel: "낮음", lightningRisk: "보통", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-N",
    label: "광주",
    name: "광주광역시 북구",
    sector: "호남권 · 광역 도심",
    regionGroup: "honam",
    center: [35.174, 126.9119],
    radius: 1200,
    data: { temperatureC: 30, humidityPercent: 72, apparentTemperatureC: 33, wbgtC: 28.5, precipitationMm: 1, precipitationProbability: 40, windSpeedMs: 4.8, windDirection: "남", visibilityKm: 6.0, weatherStatus: "흐림", fogLevel: "의심", pm10Level: "나쁨", pm25Level: "나쁨", ozoneLevel: "나쁨", fireRiskLevel: "보통", weatherAlert: "폭염주의보", pressureHpa: 1006, pressureTrend: "하강", uvIndexLevel: "높음", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-O",
    label: "목포",
    name: "전라남도 목포시",
    sector: "호남권 · 남서 해안",
    regionGroup: "honam",
    center: [34.8118, 126.3922],
    radius: 1200,
    data: { temperatureC: 26, humidityPercent: 88, apparentTemperatureC: 29, wbgtC: 27.5, precipitationMm: 6, precipitationProbability: 65, windSpeedMs: 12.2, windDirection: "남서", visibilityKm: 3.2, weatherStatus: "강풍", fogLevel: "발생", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "낮음", weatherAlert: "강풍주의보", pressureHpa: 1002, pressureTrend: "하강", uvIndexLevel: "보통", lightningRisk: "보통", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-P",
    label: "대구",
    name: "대구광역시 달서구",
    sector: "영남권 · 내륙 분지",
    regionGroup: "yeongnam",
    center: [35.8299, 128.5327],
    radius: 1200,
    data: { temperatureC: 35, humidityPercent: 76, apparentTemperatureC: 39, wbgtC: 32, precipitationMm: 0, precipitationProbability: 10, windSpeedMs: 4.2, windDirection: "남동", visibilityKm: 5.8, weatherStatus: "맑음", fogLevel: "없음", pm10Level: "보통", pm25Level: "나쁨", ozoneLevel: "나쁨", fireRiskLevel: "높음", weatherAlert: "폭염경보", pressureHpa: 1001, pressureTrend: "하강", uvIndexLevel: "매우높음", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-Q",
    label: "부산",
    name: "부산광역시 해운대구",
    sector: "영남권 · 남동 해안",
    regionGroup: "yeongnam",
    center: [35.1631, 129.1636],
    radius: 1200,
    data: { temperatureC: 24, humidityPercent: 72, apparentTemperatureC: 26, wbgtC: 25, precipitationMm: 0, precipitationProbability: 25, windSpeedMs: 6.4, windDirection: "동", visibilityKm: 8.0, weatherStatus: "흐림", fogLevel: "없음", pm10Level: "좋음", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "낮음", weatherAlert: "없음", pressureHpa: 1011, pressureTrend: "유지", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-R",
    label: "울산",
    name: "울산광역시 울주군",
    sector: "영남권 · 산림 배후",
    regionGroup: "yeongnam",
    center: [35.522, 129.242],
    radius: 1200,
    data: { temperatureC: 28, humidityPercent: 45, apparentTemperatureC: 28, wbgtC: 25.5, precipitationMm: 0, precipitationProbability: 15, windSpeedMs: 10.8, windDirection: "서", visibilityKm: 7.0, weatherStatus: "강풍", fogLevel: "없음", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "매우높음", weatherAlert: "건조주의보", pressureHpa: 1008, pressureTrend: "유지", uvIndexLevel: "높음", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-S",
    label: "포항",
    name: "경상북도 포항시",
    sector: "영남권 · 동해안",
    regionGroup: "yeongnam",
    center: [36.019, 129.3435],
    radius: 1200,
    data: { temperatureC: 20, humidityPercent: 90, apparentTemperatureC: 20, wbgtC: 21, precipitationMm: 34, precipitationProbability: 85, windSpeedMs: 14.5, windDirection: "북동", visibilityKm: 1.8, weatherStatus: "비", fogLevel: "심함", pm10Level: "좋음", pm25Level: "좋음", ozoneLevel: "좋음", fireRiskLevel: "낮음", weatherAlert: "호우경보", pressureHpa: 996, pressureTrend: "급하강", uvIndexLevel: "낮음", lightningRisk: "높음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-T",
    label: "창원",
    name: "경상남도 창원시",
    sector: "영남권 · 남부 내륙",
    regionGroup: "yeongnam",
    center: [35.2285, 128.6811],
    radius: 1200,
    data: { temperatureC: 23, humidityPercent: 55, apparentTemperatureC: 24, wbgtC: 22, precipitationMm: 0, precipitationProbability: 20, windSpeedMs: 5.0, windDirection: "남", visibilityKm: 9.0, weatherStatus: "맑음", fogLevel: "없음", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "보통", weatherAlert: "없음", pressureHpa: 1013, pressureTrend: "상승", uvIndexLevel: "보통", lightningRisk: "없음", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-U",
    label: "제주",
    name: "제주특별자치도 제주시",
    sector: "제주권 · 북부",
    regionGroup: "jeju",
    center: [33.4996, 126.5312],
    radius: 1200,
    data: { temperatureC: 27, humidityPercent: 84, apparentTemperatureC: 31, wbgtC: 28, precipitationMm: 8, precipitationProbability: 70, windSpeedMs: 11.0, windDirection: "남서", visibilityKm: 3.8, weatherStatus: "비", fogLevel: "발생", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "낮음", weatherAlert: "강풍주의보", pressureHpa: 1003, pressureTrend: "하강", uvIndexLevel: "보통", lightningRisk: "보통", snowDepthCm: 0, icingRisk: "없음" },
  },
  {
    id: "L-V",
    label: "서귀포",
    name: "제주특별자치도 서귀포시",
    sector: "제주권 · 남부",
    regionGroup: "jeju",
    center: [33.2541, 126.5601],
    radius: 1200,
    data: { temperatureC: 23, humidityPercent: 68, apparentTemperatureC: 24, wbgtC: 24, precipitationMm: 0, precipitationProbability: 20, windSpeedMs: 4.8, windDirection: "동", visibilityKm: 10.0, weatherStatus: "맑음", fogLevel: "없음", pm10Level: "좋음", pm25Level: "좋음", ozoneLevel: "보통", fireRiskLevel: "낮음", weatherAlert: "없음", pressureHpa: 1014, pressureTrend: "유지", uvIndexLevel: "높음", lightningRisk: "없음", snowDepthCm: 0, icingRisk: "없음" },
  },
];

function defaultLandZoneData(regionGroup: Exclude<LandRegionGroupKey, "all">): LandZoneData {
  const groupDefaults: Record<Exclude<LandRegionGroupKey, "all">, LandZoneData> = {
    capital: { temperatureC: 26, humidityPercent: 62, apparentTemperatureC: 27, wbgtC: 25, precipitationMm: 0.5, precipitationProbability: 35, windSpeedMs: 4.6, windDirection: "서", visibilityKm: 7.2, weatherStatus: "흐림", fogLevel: "없음", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "보통", weatherAlert: "없음", pressureHpa: 1009, pressureTrend: "유지", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
    gangwon: { temperatureC: 18, humidityPercent: 70, apparentTemperatureC: 18, wbgtC: 21, precipitationMm: 2, precipitationProbability: 45, windSpeedMs: 5.8, windDirection: "북서", visibilityKm: 6.5, weatherStatus: "흐림", fogLevel: "의심", pm10Level: "좋음", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "낮음", weatherAlert: "없음", pressureHpa: 1008, pressureTrend: "유지", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
    chungcheong: { temperatureC: 27, humidityPercent: 58, apparentTemperatureC: 28, wbgtC: 26, precipitationMm: 0.4, precipitationProbability: 30, windSpeedMs: 6.2, windDirection: "서북서", visibilityKm: 6.8, weatherStatus: "흐림", fogLevel: "의심", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "보통", weatherAlert: "없음", pressureHpa: 1009, pressureTrend: "유지", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
    honam: { temperatureC: 28, humidityPercent: 68, apparentTemperatureC: 30, wbgtC: 27, precipitationMm: 1.2, precipitationProbability: 45, windSpeedMs: 6.8, windDirection: "남서", visibilityKm: 6.0, weatherStatus: "흐림", fogLevel: "의심", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "보통", weatherAlert: "없음", pressureHpa: 1007, pressureTrend: "유지", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
    yeongnam: { temperatureC: 29, humidityPercent: 56, apparentTemperatureC: 30, wbgtC: 27, precipitationMm: 0, precipitationProbability: 25, windSpeedMs: 7.0, windDirection: "서", visibilityKm: 7.8, weatherStatus: "맑음", fogLevel: "없음", pm10Level: "보통", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "높음", weatherAlert: "건조주의보", pressureHpa: 1008, pressureTrend: "유지", uvIndexLevel: "높음", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
    jeju: { temperatureC: 26, humidityPercent: 76, apparentTemperatureC: 28, wbgtC: 26.5, precipitationMm: 3, precipitationProbability: 55, windSpeedMs: 8.2, windDirection: "남서", visibilityKm: 6.2, weatherStatus: "흐림", fogLevel: "의심", pm10Level: "좋음", pm25Level: "보통", ozoneLevel: "보통", fireRiskLevel: "낮음", weatherAlert: "없음", pressureHpa: 1006, pressureTrend: "유지", uvIndexLevel: "보통", lightningRisk: "낮음", snowDepthCm: 0, icingRisk: "없음" },
  };

  return groupDefaults[regionGroup];
}

function customLandZoneToZone(config: CustomLandZoneConfig): LandZone {
  const label = (config.label || config.name.replace(/\s/g, "").slice(0, 3) || "지역").slice(0, 4);
  return {
    id: config.id,
    label,
    name: config.name,
    sector: config.sector,
    regionGroup: config.regionGroup,
    center: [config.lat, config.lon],
    radius: config.radius || 1200,
    data: defaultLandZoneData(config.regionGroup),
  };
}

type NationalLandZoneCatalog = {
  code: string;
  province: string;
  regionGroup: Exclude<LandRegionGroupKey, "all">;
  center: readonly [number, number];
  columns?: number;
  latStep?: number;
  lonStep?: number;
  names: string[];
};

const nationalLandZoneCatalogs: NationalLandZoneCatalog[] = [
  {
    code: "seoul",
    province: "서울특별시",
    regionGroup: "capital",
    center: [37.5665, 126.978],
    columns: 5,
    latStep: 0.038,
    lonStep: 0.052,
    names: [
      "종로구", "중구", "용산구", "성동구", "광진구",
      "동대문구", "중랑구", "성북구", "강북구", "도봉구",
      "노원구", "은평구", "서대문구", "마포구", "양천구",
      "강서구", "구로구", "금천구", "영등포구", "동작구",
      "관악구", "서초구", "강남구", "송파구", "강동구",
    ],
  },
  {
    code: "busan",
    province: "부산광역시",
    regionGroup: "yeongnam",
    center: [35.1796, 129.0756],
    columns: 4,
    names: [
      "중구", "서구", "동구", "영도구",
      "부산진구", "동래구", "남구", "북구",
      "해운대구", "사하구", "금정구", "강서구",
      "연제구", "수영구", "사상구", "기장군",
    ],
  },
  {
    code: "daegu",
    province: "대구광역시",
    regionGroup: "yeongnam",
    center: [35.8714, 128.6014],
    columns: 3,
    names: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"],
  },
  {
    code: "incheon",
    province: "인천광역시",
    regionGroup: "capital",
    center: [37.4563, 126.7052],
    columns: 4,
    names: ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군", "옹진군"],
  },
  {
    code: "gwangju",
    province: "광주광역시",
    regionGroup: "honam",
    center: [35.1595, 126.8526],
    columns: 3,
    names: ["동구", "서구", "남구", "북구", "광산구"],
  },
  {
    code: "daejeon",
    province: "대전광역시",
    regionGroup: "chungcheong",
    center: [36.3504, 127.3845],
    columns: 3,
    names: ["동구", "중구", "서구", "유성구", "대덕구"],
  },
  {
    code: "ulsan",
    province: "울산광역시",
    regionGroup: "yeongnam",
    center: [35.5384, 129.3114],
    columns: 3,
    names: ["중구", "남구", "동구", "북구", "울주군"],
  },
  {
    code: "sejong",
    province: "세종특별자치시",
    regionGroup: "chungcheong",
    center: [36.4801, 127.289],
    columns: 1,
    names: ["세종특별자치시"],
  },
  {
    code: "gyeonggi",
    province: "경기도",
    regionGroup: "capital",
    center: [37.4138, 127.5183],
    columns: 6,
    latStep: 0.14,
    lonStep: 0.18,
    names: [
      "수원시", "성남시", "의정부시", "안양시", "부천시", "광명시",
      "평택시", "동두천시", "안산시", "고양시", "과천시", "구리시",
      "남양주시", "오산시", "시흥시", "군포시", "의왕시", "하남시",
      "용인시", "파주시", "이천시", "안성시", "김포시", "화성시",
      "광주시", "양주시", "포천시", "여주시", "연천군", "가평군", "양평군",
    ],
  },
  {
    code: "gangwon",
    province: "강원특별자치도",
    regionGroup: "gangwon",
    center: [37.8228, 128.1555],
    columns: 5,
    latStep: 0.18,
    lonStep: 0.22,
    names: [
      "춘천시", "원주시", "강릉시", "동해시", "태백시",
      "속초시", "삼척시", "홍천군", "횡성군", "영월군",
      "평창군", "정선군", "철원군", "화천군", "양구군",
      "인제군", "고성군", "양양군",
    ],
  },
  {
    code: "chungbuk",
    province: "충청북도",
    regionGroup: "chungcheong",
    center: [36.8, 127.7],
    columns: 4,
    latStep: 0.12,
    lonStep: 0.16,
    names: ["청주시", "충주시", "제천시", "보은군", "옥천군", "영동군", "증평군", "진천군", "괴산군", "음성군", "단양군"],
  },
  {
    code: "chungnam",
    province: "충청남도",
    regionGroup: "chungcheong",
    center: [36.5184, 126.8],
    columns: 5,
    latStep: 0.12,
    lonStep: 0.17,
    names: [
      "천안시", "공주시", "보령시", "아산시", "서산시",
      "논산시", "계룡시", "당진시", "금산군", "부여군",
      "서천군", "청양군", "홍성군", "예산군", "태안군",
    ],
  },
  {
    code: "jeonbuk",
    province: "전북특별자치도",
    regionGroup: "honam",
    center: [35.7175, 127.153],
    columns: 5,
    latStep: 0.12,
    lonStep: 0.17,
    names: [
      "전주시", "군산시", "익산시", "정읍시", "남원시",
      "김제시", "완주군", "진안군", "무주군", "장수군",
      "임실군", "순창군", "고창군", "부안군",
    ],
  },
  {
    code: "jeonnam",
    province: "전라남도",
    regionGroup: "honam",
    center: [34.8679, 126.991],
    columns: 6,
    latStep: 0.13,
    lonStep: 0.17,
    names: [
      "목포시", "여수시", "순천시", "나주시", "광양시", "담양군",
      "곡성군", "구례군", "고흥군", "보성군", "화순군", "장흥군",
      "강진군", "해남군", "영암군", "무안군", "함평군", "영광군",
      "장성군", "완도군", "진도군", "신안군",
    ],
  },
  {
    code: "gyeongbuk",
    province: "경상북도",
    regionGroup: "yeongnam",
    center: [36.4919, 128.8889],
    columns: 6,
    latStep: 0.15,
    lonStep: 0.18,
    names: [
      "포항시", "경주시", "김천시", "안동시", "구미시", "영주시",
      "영천시", "상주시", "문경시", "경산시", "의성군", "청송군",
      "영양군", "영덕군", "청도군", "고령군", "성주군", "칠곡군",
      "예천군", "봉화군", "울진군", "울릉군",
    ],
  },
  {
    code: "gyeongnam",
    province: "경상남도",
    regionGroup: "yeongnam",
    center: [35.4606, 128.2132],
    columns: 5,
    latStep: 0.12,
    lonStep: 0.18,
    names: [
      "창원시", "진주시", "통영시", "사천시", "김해시",
      "밀양시", "거제시", "양산시", "의령군", "함안군",
      "창녕군", "고성군", "남해군", "하동군", "산청군",
      "함양군", "거창군", "합천군",
    ],
  },
  {
    code: "jeju",
    province: "제주특별자치도",
    regionGroup: "jeju",
    center: [33.3617, 126.5292],
    columns: 2,
    latStep: 0.18,
    lonStep: 0.18,
    names: ["제주시", "서귀포시"],
  },
];

function landZoneLabelFromName(name: string) {
  const lastPart = name.split(" ").at(-1) || name;
  const cleaned = lastPart.replace(/(특별자치시|특별자치도|특별시|광역시|자치구|시|군|구)$/g, "");
  return (cleaned.length >= 2 ? cleaned : lastPart).slice(0, 4);
}

function buildLandSector(province: string, regionGroup: Exclude<LandRegionGroupKey, "all">) {
  const groupLabel = landRegionGroups.find((group) => group.key === regionGroup)?.label || "육상";
  const provinceLabel = province
    .replace("특별자치도", "")
    .replace("특별자치시", "")
    .replace("특별시", "")
    .replace("광역시", "")
    .replace("도", "");

  return `${groupLabel} · ${provinceLabel}`;
}

function createCatalogCoordinate(catalog: NationalLandZoneCatalog, index: number): readonly [number, number] {
  if (catalog.names.length === 1) {
    return catalog.center;
  }

  const columns = catalog.columns || 4;
  const rows = Math.ceil(catalog.names.length / columns);
  const row = Math.floor(index / columns);
  const column = index % columns;
  const latStep = catalog.latStep || 0.07;
  const lonStep = catalog.lonStep || 0.09;
  const lat = catalog.center[0] + (Math.floor(rows / 2) - row) * latStep;
  const lon = catalog.center[1] + (column - (columns - 1) / 2) * lonStep;

  return [Number(lat.toFixed(5)), Number(lon.toFixed(5))];
}

function createCatalogLandData(regionGroup: Exclude<LandRegionGroupKey, "all">, index: number): LandZoneData {
  const base = defaultLandZoneData(regionGroup);
  const weatherCycle: LandZoneData["weatherStatus"][] = ["맑음", "흐림", "비", "안개", "강풍"];
  const dustCycle: LandDustLevel[] = ["좋음", "보통", "나쁨", "보통"];
  const fireCycle: LandZoneData["fireRiskLevel"][] = ["낮음", "보통", "높음", "보통"];
  const alertCycle: LandAlertLevel[] = ["없음", "건조주의보", "강풍주의보", "폭염주의보", "호우주의보"];
  const pressureCycle: LandZoneData["pressureTrend"][] = ["상승", "유지", "하강", "유지", "급하강"];
  const windDirections = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
  const riskShift = index % 6;

  return {
    ...base,
    temperatureC: Number(Math.max(-8, Math.min(36, base.temperatureC + (riskShift - 2) * 1.6)).toFixed(1)),
    humidityPercent: Math.max(35, Math.min(90, base.humidityPercent + (index % 5) * 4 - 6)),
    apparentTemperatureC: Number(Math.max(-12, Math.min(40, (base.apparentTemperatureC || base.temperatureC) + (riskShift - 2) * 1.8)).toFixed(1)),
    wbgtC: Number(Math.max(8, Math.min(32, (base.wbgtC || 24) + (riskShift - 2) * 1.2)).toFixed(1)),
    precipitationMm: Number(Math.max(0, base.precipitationMm + [0, 0.4, 1.2, 4.5, 9, 14][riskShift]).toFixed(1)),
    precipitationProbability: Math.max(10, Math.min(90, base.precipitationProbability + riskShift * 8 - 10)),
    windSpeedMs: Number(Math.max(1.5, Math.min(14.5, base.windSpeedMs + (riskShift - 2) * 1.4)).toFixed(1)),
    windDirection: windDirections[index % windDirections.length],
    visibilityKm: Number(Math.max(1.2, Math.min(12, base.visibilityKm - riskShift * 0.75 + 1.2)).toFixed(1)),
    weatherStatus: weatherCycle[index % weatherCycle.length],
    fogLevel: riskShift >= 4 ? "발생" : riskShift >= 2 ? "의심" : "없음",
    pm10Level: dustCycle[index % dustCycle.length],
    pm25Level: dustCycle[(index + 1) % dustCycle.length],
    ozoneLevel: dustCycle[(index + 2) % dustCycle.length],
    fireRiskLevel: fireCycle[index % fireCycle.length],
    weatherAlert: alertCycle[index % alertCycle.length],
    pressureHpa: Math.max(994, Math.min(1016, base.pressureHpa - riskShift * 2 + 4)),
    pressureTrend: pressureCycle[index % pressureCycle.length],
    uvIndexLevel: riskShift >= 4 ? "매우높음" : riskShift >= 2 ? "높음" : "보통",
    lightningRisk: riskShift >= 4 ? "보통" : riskShift >= 2 ? "낮음" : "없음",
    snowDepthCm: base.temperatureC <= 3 && riskShift >= 3 ? riskShift * 2 : 0,
    icingRisk: base.temperatureC <= 3 && riskShift >= 3 ? "가능" : "없음",
  };
}

function createNationalLandZones() {
  return nationalLandZoneCatalogs.flatMap((catalog) =>
    catalog.names.map((areaName, index): LandZone => {
      const name = areaName === catalog.province ? areaName : `${catalog.province} ${areaName}`;
      return {
        id: `land-${catalog.code}-${index + 1}`,
        label: landZoneLabelFromName(name),
        name,
        sector: buildLandSector(catalog.province, catalog.regionGroup),
        regionGroup: catalog.regionGroup,
        center: createCatalogCoordinate(catalog, index),
        radius: 900,
        data: createCatalogLandData(catalog.regionGroup, index),
      };
    }),
  );
}

function mergeLandZones(primaryZones: LandZone[], secondaryZones: LandZone[]) {
  const usedNames = new Set<string>();
  const usedIds = new Set<string>();
  const merged: LandZone[] = [];

  [...primaryZones, ...secondaryZones].forEach((zone) => {
    if (usedNames.has(zone.name) || usedIds.has(zone.id)) {
      return;
    }

    usedNames.add(zone.name);
    usedIds.add(zone.id);
    merged.push(zone);
  });

  return merged;
}

const generatedNationalLandZones = createNationalLandZones();
const landZones = mergeLandZones(priorityLandZones, generatedNationalLandZones);
const presetLandZoneIds = new Set(priorityLandZones.map((zone) => zone.id));
const landAdministrativeOrder = [
  "서울특별시",
  "인천광역시",
  "경기도",
  "강원특별자치도",
  "대전광역시",
  "세종특별자치시",
  "충청북도",
  "충청남도",
  "광주광역시",
  "전북특별자치도",
  "전라남도",
  "대구광역시",
  "부산광역시",
  "울산광역시",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

function landAdministrativeKey(zone: LandZone) {
  const key = zone.name.split(" ")[0] || "기타";
  const aliases: Record<string, string> = {
    강원도: "강원특별자치도",
    전라북도: "전북특별자치도",
  };

  return aliases[key] || key;
}

function landAdministrativeLabel(key: string) {
  const shortLabels: Record<string, string> = {
    서울특별시: "서울",
    인천광역시: "인천",
    경기도: "경기",
    강원특별자치도: "강원",
    대전광역시: "대전",
    세종특별자치시: "세종",
    충청북도: "충북",
    충청남도: "충남",
    광주광역시: "광주",
    전북특별자치도: "전북",
    전라남도: "전남",
    대구광역시: "대구",
    부산광역시: "부산",
    울산광역시: "울산",
    경상북도: "경북",
    경상남도: "경남",
    제주특별자치도: "제주",
  };

  return shortLabels[key] || key;
}

function getLandAdministrativeGroups(zoneList: LandZone[]) {
  const zoneKeys = Array.from(new Set(zoneList.map((zone) => landAdministrativeKey(zone))));
  const orderedKeys = [
    ...landAdministrativeOrder.filter((key) => zoneKeys.includes(key)),
    ...zoneKeys.filter((key) => !landAdministrativeOrder.includes(key)).sort((first, second) => first.localeCompare(second, "ko")),
  ];

  return [
    { key: "all", label: "전국" },
    ...orderedKeys.map((key) => ({ key, label: landAdministrativeLabel(key) })),
  ];
}

function getLandSettingsGroups(zoneList: LandZone[]) {
  return getLandAdministrativeGroups(zoneList)
    .filter((group) => group.key !== "all")
    .map((group) => ({
      ...group,
      zones: zoneList.filter((zone) => landAdministrativeKey(zone) === group.key),
    }))
    .filter((group) => group.zones.length > 0);
}

function riskLevelClass(level: RiskLevel) {
  if (level === "위험") {
    return "level-danger";
  }

  if (level === "주의") {
    return "level-watch";
  }

  return "level-good";
}

function riskLevelColor(level: RiskLevel) {
  if (level === "위험") {
    return "#db4c4c";
  }

  if (level === "주의") {
    return "#f59e0b";
  }

  return "#17a673";
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 70) return "위험";
  if (score >= 40) return "주의";
  return "양호";
}

function landSituationMetrics(zone: LandZone): SituationMetric[] {
  const data = zone.data;
  return [
    { label: "기온", value: `${data.temperatureC}℃` },
    { label: "습도", value: `${data.humidityPercent}%` },
    { label: "풍속", value: `${data.windSpeedMs}m/s` },
    { label: "시정", value: `${data.visibilityKm}km` },
    { label: "대기질", value: `PM10 ${data.pm10Level}` },
    { label: "특보", value: data.weatherAlert },
  ];
}

function aviationSituationMetrics(zone: AviationZone): SituationMetric[] {
  const data = zone.data;
  return [
    { label: "평균풍", value: `${data.averageWindSpeedMs}m/s` },
    { label: "돌풍", value: `${data.gustSpeedMs}m/s` },
    { label: "풍향", value: data.windDirection },
    { label: "시정", value: `${data.visibilityKm}km`, detail: data.fogLevel },
    { label: "운고", value: `${data.cloudCeilingFt}ft` },
    { label: "낙뢰", value: data.lightningRisk },
  ];
}

function landHourlyRows(zone: LandZone): SituationMatrixRow[] {
  const data = zone.data;
  const apparent = data.wbgtC ?? data.apparentTemperatureC ?? data.temperatureC;
  const dustLabel = `${data.pm10Level}/${data.pm25Level}`;

  return [
    { label: "날씨", values: situationTimeLabels.map(() => data.weatherStatus) },
    { label: "기온", values: temperatureOffsets.map((offset) => `${formatNumber(data.temperatureC + offset)}℃`) },
    { label: "습도", values: temperatureOffsets.map((offset) => `${formatNumber(clampValue(data.humidityPercent - offset * 2, 25, 98))}%`) },
    { label: "체감/WBGT", values: temperatureOffsets.map((offset) => `${formatNumber(apparent + offset)}℃`) },
    { label: "강수확률", values: temperatureOffsets.map((offset) => `${formatNumber(clampValue(data.precipitationProbability + offset * 5, 0, 100))}%`) },
    { label: "풍향", values: situationTimeLabels.map(() => data.windDirection || "-") },
    { label: "풍속", values: windOffsets.map((offset) => `${formatNumber(data.windSpeedMs + offset, 1)}m/s`) },
    { label: "시정", values: windOffsets.map((offset) => `${formatNumber(clampValue(data.visibilityKm - offset, 0.2, 20), 1)}km`) },
    { label: "운무", values: situationTimeLabels.map(() => data.fogLevel) },
    { label: "미세먼지", values: situationTimeLabels.map(() => dustLabel) },
    { label: "특보", values: situationTimeLabels.map(() => data.weatherAlert) },
  ];
}

function aviationHourlyRows(zone: AviationZone): SituationMatrixRow[] {
  const data = zone.data;

  return [
    { label: "날씨", values: situationTimeLabels.map(() => data.weatherStatus) },
    { label: "평균풍속", values: windOffsets.map((offset) => `${formatNumber(data.averageWindSpeedMs + offset, 1)}m/s`) },
    { label: "순간풍속", values: windOffsets.map((offset) => `${formatNumber(data.gustSpeedMs + offset * 1.4, 1)}m/s`) },
    { label: "풍향", values: situationTimeLabels.map(() => `${data.windDirection} · ${data.returnWindStatus}`) },
    { label: "강수/강설", values: situationTimeLabels.map(() => `${data.precipitationMm}mm/${data.snowfallCm}cm`) },
    { label: "시정", values: windOffsets.map((offset) => `${formatNumber(clampValue(data.visibilityKm - offset, 0.2, 20), 1)}km`) },
    { label: "운무", values: situationTimeLabels.map(() => data.fogLevel) },
    { label: "기온", values: temperatureOffsets.map((offset) => `${formatNumber(data.temperatureC + offset)}℃`) },
    { label: "습도/이슬점", values: temperatureOffsets.map((offset) => `${formatNumber(clampValue(data.humidityPercent - offset * 2, 20, 99))}%/${formatNumber(data.dewPointC + offset)}℃`) },
    { label: "낙뢰/뇌우", values: situationTimeLabels.map(() => `${data.lightningRisk}/${data.thunderstormRisk}`) },
    { label: "운고/운량", values: situationTimeLabels.map(() => `${data.cloudCeilingFt}ft/${data.cloudAmountOctas}/8`) },
  ];
}

function roundedContribution(value: number) {
  return Number(value.toFixed(1));
}

const landAxisLabels: Record<LandAxisKey, LandAxisName> = {
  personnelLoad: "인원 부담도",
  visibility: "시야 제한도",
  mobility: "이동 제한도",
  environmentalHazard: "환경 위험도",
};

const landAxisOrder: LandAxisKey[] = [
  "personnelLoad",
  "visibility",
  "mobility",
  "environmentalHazard",
];

function clampRiskScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function landApparentTemperature(data: LandZoneData) {
  return data.apparentTemperatureC ?? data.temperatureC;
}

function landThermalLabel(data: LandZoneData) {
  if (typeof data.wbgtC === "number") {
    return `${data.wbgtC}℃ WBGT`;
  }

  return `${landApparentTemperature(data)}℃`;
}

function landWindDirection(data: LandZoneData) {
  return data.windDirection || "미상";
}

function worstDustLevel(pm10Level: LandDustLevel, pm25Level: LandDustLevel) {
  const order: Record<LandDustLevel, number> = {
    좋음: 1,
    보통: 2,
    나쁨: 3,
    매우나쁨: 4,
  };

  return order[pm25Level] > order[pm10Level] ? pm25Level : pm10Level;
}

function isDustBadOrWorse(level: LandDustLevel) {
  return level === "나쁨" || level === "매우나쁨";
}

function scoreLandTemperature(value: number) {
  if (value >= 33) return 1;
  if (value >= 30) return 0.8;
  if (value >= 27) return 0.5;
  if (value > 5) return 0.2;
  if (value > 0) return 0.5;
  return 0.8;
}

function scoreLandHumidity(value: number) {
  if (value >= 80) return 1;
  if (value >= 70) return 0.8;
  if (value >= 60) return 0.5;
  if (value >= 40) return 0.2;
  return 0.3;
}

function scoreLandThermal(data: LandZoneData) {
  if (typeof data.wbgtC === "number") {
    if (data.wbgtC >= 31) return 1;
    if (data.wbgtC >= 28) return 0.8;
    if (data.wbgtC >= 25) return 0.5;
    return 0.2;
  }

  const apparentTemperature = landApparentTemperature(data);
  if (apparentTemperature >= 35) return 1;
  if (apparentTemperature >= 32) return 0.8;
  if (apparentTemperature >= 29) return 0.5;
  return 0.2;
}

function scoreLandPrecipitation(value: number) {
  if (value >= 30) return 1;
  if (value >= 10) return 0.8;
  if (value >= 1) return 0.5;
  return 0.1;
}

function scoreLandPrecipitationProbability(value: number) {
  if (value >= 80) return 0.8;
  if (value >= 60) return 0.6;
  if (value >= 30) return 0.3;
  return 0.1;
}

function scoreLandWind(value: number) {
  if (value >= 14) return 1;
  if (value >= 9) return 0.8;
  if (value >= 5) return 0.5;
  return 0.2;
}

function scoreLandVisibility(value: number) {
  if (value <= 1) return 1;
  if (value <= 3) return 0.8;
  if (value <= 6) return 0.5;
  return 0.1;
}

function scoreLandFog(value: LandZoneData["fogLevel"]) {
  if (value === "심함") return 1;
  if (value === "발생") return 0.8;
  if (value === "의심") return 0.5;
  return 0.1;
}

function scoreLandDust(value: LandDustLevel) {
  if (value === "매우나쁨") return 1;
  if (value === "나쁨") return 0.7;
  if (value === "보통") return 0.3;
  return 0.1;
}

function scoreLandFire(value: LandZoneData["fireRiskLevel"]) {
  if (value === "매우높음") return 1;
  if (value === "높음") return 0.8;
  if (value === "보통") return 0.4;
  return 0.1;
}

function scoreLandWeatherAlert(value: LandZoneData["weatherAlert"]) {
  if (value === "없음") return 0.1;
  if (value.includes("경보")) return 1;
  return 0.7;
}

function scoreLandPressureTrend(value: LandZoneData["pressureTrend"]) {
  if (value === "급하강") return 0.7;
  if (value === "하강") return 0.4;
  if (value === "유지") return 0.2;
  return 0.1;
}

function scoreLandUv(value: LandZoneData["uvIndexLevel"]) {
  if (value === "매우높음") return 1;
  if (value === "높음") return 0.7;
  if (value === "보통") return 0.3;
  return 0.1;
}

function scoreLandLightning(value: LandZoneData["lightningRisk"]) {
  if (value === "높음") return 1;
  if (value === "보통") return 0.6;
  if (value === "낮음") return 0.2;
  return 0.1;
}

function scoreLandSnow(value: number) {
  if (value >= 20) return 1;
  if (value >= 5) return 0.7;
  if (value > 0) return 0.4;
  return 0.1;
}

function scoreLandIcing(value: LandZoneData["icingRisk"]) {
  if (value === "심함") return 1;
  if (value === "가능") return 0.7;
  return 0.1;
}

function scoreLandWeatherStatus(value: LandZoneData["weatherStatus"]) {
  if (value === "안개" || value === "비" || value === "눈" || value === "뇌우") return 0.8;
  if (value === "강풍") return 0.7;
  if (value === "흐림") return 0.4;
  return 0.1;
}

function makeLandContribution(
  axis: LandAxisKey,
  factor: string,
  value: string,
  normalizedScore: number,
  weight: number,
  reason: string,
): LandRiskContribution {
  return {
    factor,
    value,
    axis: landAxisLabels[axis],
    normalizedScore,
    weight,
    contribution: roundedContribution(normalizedScore * weight),
    reason,
  };
}

function getLandMatchedRules(data: LandZoneData): RiskAssessment["matchedRules"] {
  const matchedRules: RiskAssessment["matchedRules"] = [];
  const apparentTemperature = landApparentTemperature(data);
  const worstDust = worstDustLevel(data.pm10Level, data.pm25Level);

  if (
    apparentTemperature >= 32 &&
    data.humidityPercent >= 70
  ) {
    matchedRules.push({
      name: "온열 부담 중첩",
      condition: "체감온도 ≥ 32℃ AND 습도 ≥ 70%",
      result: "온열손상 및 피로 누적 가능성이 증가합니다.",
      category: "risk",
    });
  }

  if (data.visibilityKm <= 3 || data.fogLevel === "발생" || data.fogLevel === "심함") {
    matchedRules.push({
      name: "시야 제한 중첩",
      condition: "시정 ≤ 3km OR 안개/운무 발생 이상",
      result: "관측 및 이동 간 시야 제한 가능성이 높습니다.",
      category: "risk",
    });
  }

  if (data.precipitationMm >= 10 || data.precipitationProbability >= 80) {
    matchedRules.push({
      name: "강수 이동 제한",
      condition: "강수량 ≥ 10mm OR 강수확률 ≥ 80%",
      result: "지면 악화, 장비 젖음, 이동속도 저하 가능성이 있습니다.",
      category: "risk",
    });
  }

  if (data.windSpeedMs >= 9) {
    matchedRules.push({
      name: "강풍 영향",
      condition: "풍속 ≥ 9m/s",
      result: "체감온도 변화, 먼지 확산, 산불 확산, 이동 안정성 저하 가능성이 있습니다.",
      category: "risk",
    });
  }

  if (
    (data.fireRiskLevel === "높음" || data.fireRiskLevel === "매우높음") &&
    data.windSpeedMs >= 5
  ) {
    matchedRules.push({
      name: "산불 확산 조건",
      condition: "산불지수 높음 이상 AND 풍속 ≥ 5m/s",
      result: "건조한 환경과 바람이 중첩되어 산불 확산 위험이 증가할 수 있습니다.",
      category: "risk",
    });
  }

  if (isDustBadOrWorse(worstDust)) {
    matchedRules.push({
      name: "대기질 부담",
      condition: "미세먼지 나쁨 이상 OR 초미세먼지 나쁨 이상",
      result: "장시간 야외활동 시 호흡 부담과 시야 저하 가능성이 있습니다.",
      category: "risk",
    });
  }

  if (data.weatherAlert !== "없음") {
    matchedRules.push({
      name: "기상특보 존재",
      condition: "기상특보 존재",
      result: "야외활동 및 작전환경에 직접적인 위험 요인이 존재합니다.",
      category: "risk",
    });
  }

  if (data.pressureTrend === "하강" || data.pressureTrend === "급하강") {
    matchedRules.push({
      name: "기압 하강",
      condition: "기압 추세가 하강 또는 급하강",
      result: "기상 악화 가능성이 있어 후속 기상 변화를 확인해야 합니다.",
      category: "risk",
    });
  }

  return matchedRules;
}

function calculateAxisScore(
  contributions: LandRiskContribution[],
  axis: LandAxisName,
) {
  return clampRiskScore(
    contributions
      .filter((item) => item.axis === axis)
      .reduce((sum, item) => sum + item.contribution, 0),
  );
}

function calculateLandRisk(data: LandZoneData): LandRiskAssessment {
  const worstDust = worstDustLevel(data.pm10Level, data.pm25Level);
  const contributions = [
    makeLandContribution("personnelLoad", "체감/WBGT", landThermalLabel(data), scoreLandThermal(data), 40, "체감온도 또는 WBGT가 높을수록 인원 부담이 증가합니다."),
    makeLandContribution("personnelLoad", "기온", `${data.temperatureC}℃`, scoreLandTemperature(data.temperatureC), 20, "온열 또는 한랭 부담을 반영합니다."),
    makeLandContribution("personnelLoad", "습도", `${data.humidityPercent}%`, scoreLandHumidity(data.humidityPercent), 20, "습도가 높을수록 온열 부담이 커집니다."),
    makeLandContribution("personnelLoad", "미세먼지", worstDust, scoreLandDust(worstDust), 10, "대기질은 장시간 야외활동 부담을 높일 수 있습니다."),
    makeLandContribution("personnelLoad", "자외선지수", data.uvIndexLevel, scoreLandUv(data.uvIndexLevel), 10, "자외선지수는 인원 피로와 노출 부담을 보조 반영합니다."),

    makeLandContribution("visibility", "시정", `${data.visibilityKm}km`, scoreLandVisibility(data.visibilityKm), 35, "시정이 낮을수록 관측과 이동 안전성이 제한됩니다."),
    makeLandContribution("visibility", "안개/운무", data.fogLevel, scoreLandFog(data.fogLevel), 30, "안개와 운무는 감시 가능 거리를 줄입니다."),
    makeLandContribution("visibility", "강수량", `${data.precipitationMm}mm`, scoreLandPrecipitation(data.precipitationMm), 15, "강수는 관측 품질과 노면 상태에 영향을 줍니다."),
    makeLandContribution("visibility", "미세먼지", worstDust, scoreLandDust(worstDust), 15, "미세먼지는 원거리 식별 보조 지표로 반영합니다."),
    makeLandContribution("visibility", "날씨 상태", data.weatherStatus, scoreLandWeatherStatus(data.weatherStatus), 5, "현재 날씨 상태를 시야 제한 보조 지표로 반영합니다."),

    makeLandContribution("mobility", "강수량", `${data.precipitationMm}mm`, scoreLandPrecipitation(data.precipitationMm), 30, "강수량 증가는 지면 악화와 이동속도 저하 가능성을 높입니다."),
    makeLandContribution("mobility", "강수확률", `${data.precipitationProbability}%`, scoreLandPrecipitationProbability(data.precipitationProbability), 15, "강수 가능성은 이동계획의 불확실성을 높입니다."),
    makeLandContribution("mobility", "풍속", `${data.windSpeedMs}m/s`, scoreLandWind(data.windSpeedMs), 20, "강한 바람은 이동 안정성과 장비 운용에 영향을 줍니다."),
    makeLandContribution("mobility", "적설", `${data.snowDepthCm}cm`, scoreLandSnow(data.snowDepthCm), 15, "적설은 보행과 차량 이동을 제한할 수 있습니다."),
    makeLandContribution("mobility", "결빙", data.icingRisk, scoreLandIcing(data.icingRisk), 15, "결빙 가능성은 이동 안전성을 낮춥니다."),
    makeLandContribution("mobility", "시정", `${data.visibilityKm}km`, scoreLandVisibility(data.visibilityKm), 5, "시정은 이동 안전성에 보조적으로 반영됩니다."),

    makeLandContribution("environmentalHazard", "산불지수", data.fireRiskLevel, scoreLandFire(data.fireRiskLevel), 30, "산불위험은 육상 환경 위험의 핵심 지표입니다."),
    makeLandContribution("environmentalHazard", "기상특보", data.weatherAlert, scoreLandWeatherAlert(data.weatherAlert), 30, "기상특보는 야외활동 위험 요인을 직접 반영합니다."),
    makeLandContribution("environmentalHazard", "풍속", `${data.windSpeedMs}m/s`, scoreLandWind(data.windSpeedMs), 15, "풍속은 산불 확산과 먼지 확산에 영향을 줍니다."),
    makeLandContribution("environmentalHazard", "낙뢰위험", data.lightningRisk, scoreLandLightning(data.lightningRisk), 15, "낙뢰위험은 야외활동 안전에 직접적인 제한 요소입니다."),
    makeLandContribution("environmentalHazard", "기압 추세", `${data.pressureHpa}hPa · ${data.pressureTrend}`, scoreLandPressureTrend(data.pressureTrend), 10, "기압 하강은 후속 기상 악화 가능성을 보조 반영합니다."),
  ];

  const axisScores = {
    personnelLoad: calculateAxisScore(contributions, landAxisLabels.personnelLoad),
    visibility: calculateAxisScore(contributions, landAxisLabels.visibility),
    mobility: calculateAxisScore(contributions, landAxisLabels.mobility),
    environmentalHazard: calculateAxisScore(contributions, landAxisLabels.environmentalHazard),
  };
  const score = clampRiskScore(
    axisScores.personnelLoad * 0.35 +
      axisScores.visibility * 0.25 +
      axisScores.mobility * 0.25 +
      axisScores.environmentalHazard * 0.15,
  );
  const level = riskLevelFromScore(score);
  const matchedRules = getLandMatchedRules(data);
  const topFactors = [...contributions]
    .sort((first, second) => second.contribution - first.contribution)
    .slice(0, 4)
    .map((item) => item.factor)
    .join(", ");

  return {
    score,
    level,
    summary: `${topFactors} 요인이 중첩되어 육상 활동환경 위험도가 ${level} 단계로 산정되었습니다.`,
    axisScores,
    contributions,
    matchedRules,
  };
}

function timeBandText(value: ZoneEnvironmentData["timeBand"]) {
  if (value === "night") return "야간";
  if (value === "evening") return "저녁";
  if (value === "dawn") return "새벽";
  return "주간";
}

function EnvironmentGrid({ data }: { data: ZoneEnvironmentData }) {
  const items = [
    { label: "파고", value: `${data.waveHeightM}m`, icon: <Waves size={16} aria-hidden="true" /> },
    { label: "풍속", value: `${data.windSpeedMs}m/s`, icon: <Wind size={16} aria-hidden="true" /> },
    { label: "시정", value: `${data.visibilityKm}km`, icon: <Eye size={16} aria-hidden="true" /> },
    { label: "조석", value: data.tideStatus, icon: <Activity size={16} aria-hidden="true" /> },
    { label: "조류", value: data.currentStatus, icon: <Compass size={16} aria-hidden="true" /> },
    { label: "시간대", value: timeBandText(data.timeBand), icon: <Radar size={16} aria-hidden="true" /> },
    { label: "날씨", value: data.weatherStatus, icon: <Cloud size={16} aria-hidden="true" /> },
    { label: "온도", value: `${data.temperatureC}℃`, icon: <Sun size={16} aria-hidden="true" /> },
    { label: "미세먼지", value: data.pmLevel, icon: <Activity size={16} aria-hidden="true" /> },
    { label: "운무", value: data.fogLevel, icon: <CloudSun size={16} aria-hidden="true" /> },
    { label: "CCTV 시정", value: data.cctvVisibility, icon: <Eye size={16} aria-hidden="true" /> },
  ];

  return (
    <div className="environment-grid">
      {items.map((item) => (
        <div className="environment-item" key={item.label}>
          {item.icon}
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ContributionBars({ assessment }: { assessment: RiskAssessment }) {
  return (
    <div className="contribution-list">
      {assessment.contributions.map((item) => (
        <div className="contribution-row" key={item.factor}>
          <div className="contribution-head">
            <span>{item.factor}</span>
            <strong>
              {item.contribution} / {item.weight}
            </strong>
          </div>
          <div className="contribution-track" aria-hidden="true">
            <span
              className="contribution-fill"
              style={{ width: `${Math.min(100, (item.contribution / 20) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LandAxisCards({ assessment }: { assessment: LandRiskAssessment }) {
  return (
    <div className="land-axis-grid" aria-label="육상 위험도 4축">
      {landAxisOrder.map((axisKey) => {
        const score = assessment.axisScores[axisKey];
        const level = riskLevelFromScore(score);
        return (
          <article className={`land-axis-card ${riskLevelClass(level)}`} key={axisKey}>
            <span>{landAxisLabels[axisKey]}</span>
            <strong>{score}</strong>
            <em>{level}</em>
          </article>
        );
      })}
    </div>
  );
}

function LandContributionBars({ assessment }: { assessment: LandRiskAssessment }) {
  return (
    <div className="contribution-list land-contribution-list">
      {assessment.contributions.map((item) => (
        <div className="contribution-row" key={`${item.axis}-${item.factor}`}>
          <div className="contribution-head">
            <span>
              {item.factor}
              <em>{item.axis}</em>
            </span>
            <strong>
              {item.contribution} / {item.weight}
            </strong>
          </div>
          <div className="contribution-track" aria-hidden="true">
            <span
              className="contribution-fill"
              style={{ width: `${Math.min(100, (item.contribution / item.weight) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RuleCards({ assessment }: { assessment: Pick<RiskAssessment, "matchedRules"> }) {
  const riskRules = assessment.matchedRules.filter((rule) => rule.category === "risk");
  const limitationRules = assessment.matchedRules.filter((rule) => rule.category === "limitation");

  return (
    <div className="rule-card-stack">
      <div className="rule-card-group">
        <h4>적용된 판단 규칙</h4>
        {riskRules.length ? (
          riskRules.map((rule) => (
            <article className="rule-card" key={rule.name}>
              <strong>{rule.name}</strong>
              <p>{rule.result}</p>
            </article>
          ))
        ) : (
          <p className="empty-rule">현재 적용된 고위험 중첩 규칙은 없습니다.</p>
        )}
      </div>

      {limitationRules.length ? (
        <div className="rule-card-group limitation">
          <h4>해상 이동 제한 요소</h4>
          {limitationRules.map((rule) => (
            <article className="rule-card" key={rule.name}>
              <strong>{rule.name}</strong>
              <p>{rule.result}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ZoneDecisionPanel({ item }: { item: ZoneAssessment }) {
  const { zone, assessment } = item;
  const levelClass = riskLevelClass(assessment.level);
  const levelColor = riskLevelColor(assessment.level);

  return (
    <aside className={`blade-decision-panel ${levelClass}`} aria-label="선택 권역 판단 근거">
      <div className="decision-panel-head">
        <div>
          <span>선택 권역 · {seaAreaLabels[zone.seaArea]}</span>
          <h2>{zone.name}</h2>
        </div>
        <div className="risk-gauge" style={{ background: `conic-gradient(${levelColor} ${assessment.score * 3.6}deg, #e8eef7 0deg)` }}>
          <div>
            <strong>{assessment.score}</strong>
            <span>{assessment.level}</span>
          </div>
        </div>
      </div>

      <section className="decision-section">
        <div className="section-title">
          <ShieldCheck size={18} aria-hidden="true" />
          <h3>현재 주요 데이터</h3>
        </div>
        <EnvironmentGrid data={zone.data} />
      </section>

      <section className="decision-section">
        <div className="section-title">
          <Activity size={18} aria-hidden="true" />
          <h3>항목별 기여도</h3>
        </div>
        <ContributionBars assessment={assessment} />
      </section>

      <section className="decision-section">
        <div className="section-title">
          <AlertTriangle size={18} aria-hidden="true" />
          <h3>XAI 판단 근거</h3>
        </div>
        <RuleCards assessment={assessment} />
      </section>
    </aside>
  );
}

function BladeAiMap({
  items,
  activeZoneId,
  windyOverlay,
  onWindyOverlayChange,
}: {
  items: ZoneAssessment[];
  activeZoneId: CoastalZone["id"];
  windyOverlay: WindyOverlay;
  onWindyOverlayChange: (overlay: WindyOverlay) => void;
}) {
  const activeItem = items.find((item) => item.zone.id === activeZoneId) || items[0];
  const mapUrl = windyBladeEmbedUrl(activeItem, windyOverlay);

  return (
    <section className="blade-map-card" aria-label="해상 권역 지도">
      <div className="blade-map-canvas">
        <iframe
          key={`windy-${activeItem.zone.id}-${activeItem.zone.center.join(",")}-${windyOverlay}`}
          className="windy-blade-map"
          title="윈디 해양기상 지도"
          src={mapUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        <div className="map-legend" aria-label="위험도 범례">
          <span><i className="legend-good" />양호</span>
          <span><i className="legend-watch" />주의</span>
          <span><i className="legend-danger" />위험</span>
        </div>
        <WindyOverlaySelector
          value={windyOverlay}
          options={coastalWindyOverlays}
          onChange={onWindyOverlayChange}
        />
      </div>
    </section>
  );
}

function ZoneCardList({
  items,
  activeZoneId,
  onSelect,
}: {
  items: ZoneAssessment[];
  activeZoneId: CoastalZone["id"];
  onSelect: (zoneId: CoastalZone["id"]) => void;
}) {
  return (
    <aside className="blade-zone-panel" aria-label="권역 선택 카드">
      <div className="windy-zone-tray">
        {items.map((item) => {
          const areaLabel = seaAreaLabels[item.zone.seaArea];
          const active = item.zone.id === activeZoneId;
          const levelText = item.assessment.level === "위험" ? "위험 경고" : item.assessment.level;
          return (
            <button
              type="button"
              key={item.zone.id}
              className={`windy-zone-chip ${riskLevelClass(item.assessment.level)} ${active ? "active" : ""}`}
              onClick={() => onSelect(item.zone.id)}
              aria-pressed={active}
            >
              <span>
                {item.zone.label}
                <em>{areaLabel}</em>
              </span>
              <span className="zone-score">
                <strong>{item.assessment.score}</strong>
                <b>{levelText}</b>
              </span>
              <small>
                파고 {item.zone.data.waveHeightM}m · 풍속 {item.zone.data.windSpeedMs}m/s
              </small>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function SettingsPanel({
  open,
  embedded = false,
  regions,
  enabledRegionKeys,
  harborSelections,
  customRegionKeys,
  landZoneList,
  enabledLandZoneIds,
  customLandZoneKeys,
  aviationZoneList,
  enabledAviationZoneIds,
  customAviationZoneKeys,
  initialTab = "marine",
  onClose,
  onToggleRegion,
  onToggleLandZone,
  onToggleLandZoneGroup,
  onSetLandZoneSelectionMode,
  onToggleAviationZone,
  onRemoveRegion,
  onRemoveLandZone,
  onRemoveAviationZone,
  onHarborChange,
  onResetAllSettings,
}: {
  open: boolean;
  embedded?: boolean;
  regions: Region[];
  enabledRegionKeys: string[];
  harborSelections: Record<RegionKey, string>;
  customRegionKeys: string[];
  landZoneList: LandZone[];
  enabledLandZoneIds: string[];
  customLandZoneKeys: string[];
  aviationZoneList: AviationZone[];
  enabledAviationZoneIds: string[];
  customAviationZoneKeys: string[];
  initialTab?: SettingsTab;
  onClose: () => void;
  onToggleRegion: (region: RegionKey, enabled: boolean) => void;
  onToggleLandZone: (zoneId: LandZone["id"], enabled: boolean) => void;
  onToggleLandZoneGroup: (zoneIds: LandZone["id"][], enabled: boolean) => void;
  onSetLandZoneSelectionMode: (mode: LandZoneSelectionMode) => void;
  onToggleAviationZone: (zoneId: AviationZone["id"], enabled: boolean) => void;
  onRemoveRegion: (region: RegionKey) => void;
  onRemoveLandZone: (zoneId: LandZone["id"]) => void;
  onRemoveAviationZone: (zoneId: AviationZone["id"]) => void;
  onHarborChange: (region: RegionKey, harborName: string) => void;
  onResetAllSettings: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>(initialTab);
  const [marineSearchTerm, setMarineSearchTerm] = useState("");
  const [selectedApiCandidateId, setSelectedApiCandidateId] = useState("");
  const [message, setMessage] = useState("");

  if (!open && !embedded) {
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

  function handleApiCandidateChange(candidateId: string) {
    setSelectedApiCandidateId(candidateId);
    const candidate = apiHarborCandidates.find((item) => item.id === candidateId);

    if (!candidate) {
      return;
    }

    setMessage(`${candidate.regionName} ${candidate.harbor.harborName} API 조회 후보를 불러왔습니다.`);
  }

  function handleEnableApiCandidate() {
    const candidate = apiHarborCandidates.find((item) => item.id === selectedApiCandidateId);

    if (!candidate) {
      setMessage("먼저 표시할 해상 측정지점을 선택하세요.");
      return;
    }

    onToggleRegion(candidate.regionKey, true);
    onHarborChange(candidate.regionKey, candidate.harbor.harborName);
    setMarineSearchTerm(candidate.harbor.harborName);
    setMessage(`${candidate.regionName} ${candidate.harbor.harborName} 측정지점이 표시 대상으로 선택되었습니다.`);
  }

  function handleCloseSettings() {
    setMessage("");
    onClose();
  }

  function handleResetAllSettings() {
    const confirmed = window.confirm("모든 지역 선택을 비우고 설정을 초기화할까요?");

    if (!confirmed) {
      return;
    }

    onResetAllSettings();
    setSelectedApiCandidateId("");
    setMarineSearchTerm("");
    setMessage("모든 지역 선택과 사용자 설정을 초기화했습니다.");
  }

  const settingsTabs: Array<{ key: SettingsTab; label: string; detail: string }> = [
    { key: "account", label: "계정", detail: "비밀번호" },
    { key: "marine", label: "해상 설정", detail: "지역·항구" },
    { key: "land", label: "육상 설정", detail: "시군구" },
    { key: "air", label: "공중 설정", detail: "측정지역" },
    { key: "sources", label: "자료", detail: "API 후보" },
  ];
  const enabledRegionSet = new Set(enabledRegionKeys);
  const enabledLandZoneSet = new Set(enabledLandZoneIds);
  const enabledAviationZoneSet = new Set(enabledAviationZoneIds);
  const selectedMarineCount = regions.filter((region) => enabledRegionSet.has(region.key)).length;
  const selectedLandCount = landZoneList.filter((zone) => enabledLandZoneSet.has(zone.id)).length;
  const selectedAviationCount = aviationZoneList.filter((zone) => enabledAviationZoneSet.has(zone.id)).length;
  const marineSettingsGroups = getMarineSettingsGroups(regions);
  const landSettingsGroups = getLandSettingsGroups(landZoneList);
  const aviationSettingsGroups = getAviationSettingsGroups(aviationZoneList);
  const normalizedMarineSearchTerm = marineSearchTerm.trim().toLocaleLowerCase("ko-KR");
  const visibleMarineSettingsGroups = marineSettingsGroups
    .map((group) => ({
      ...group,
      visibleRegions: normalizedMarineSearchTerm
        ? group.regions.filter((region) => {
          const searchText = [
            group.label,
            region.name,
            region.harbors.map((harbor) => harbor.harborName).join(" "),
            seaAreaLabels[region.seaArea],
            marineStationLabel(region),
          ].join(" ").toLocaleLowerCase("ko-KR");

          return searchText.includes(normalizedMarineSearchTerm);
        })
        : group.regions,
    }))
    .filter((group) => group.visibleRegions.length > 0);

  const settingsContent = (
      <section className={`settings-panel ${embedded ? "settings-panel-page" : ""}`}>
        <div className="settings-head">
          <div>
            <span>운용 설정</span>
            <h2>지역·항구 세부설정</h2>
          </div>
          <div className="settings-head-actions">
            <button type="button" className="settings-reset-all-button" onClick={handleResetAllSettings}>
              완전 초기화
            </button>
            {!embedded ? (
              <button type="button" onClick={handleCloseSettings} aria-label="설정 닫기">
                <X size={20} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="settings-tab-row" aria-label="설정 구분">
          {settingsTabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={activeSettingsTab === tab.key ? "active" : undefined}
              onClick={() => setActiveSettingsTab(tab.key)}
              aria-pressed={activeSettingsTab === tab.key}
            >
              <span>{tab.label}</span>
              <strong>{tab.detail}</strong>
            </button>
          ))}
        </div>

        {activeSettingsTab === "account" ? (
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
        ) : null}

        {activeSettingsTab === "marine" ? (
        <section className="settings-card">
          <div className="land-settings-title-row">
            <div>
              <h3>해상 측정지점 표시 및 항구 선택</h3>
              <p>전국 항구·관측부이·해수욕장·원해 지점을 지역별로 묶어 표시합니다.</p>
            </div>
            <strong>{selectedMarineCount} / {regions.length}</strong>
          </div>
          <div className="marine-settings-toolbar">
            <label>
              <span>특정 위치 검색</span>
              <input
                value={marineSearchTerm}
                onChange={(event) => setMarineSearchTerm(event.target.value)}
                placeholder="예: 만리포, 해운대, 서해중부"
              />
            </label>
          </div>
          <div className="land-settings-groups marine-settings-groups">
            {visibleMarineSettingsGroups.map((group) => {
              const groupKeys = group.regions.map((region) => region.key);
              const groupEnabledCount = group.regions.filter((region) => enabledRegionSet.has(region.key)).length;

              return (
                <details className="land-settings-group" key={group.key} open={normalizedMarineSearchTerm ? true : undefined}>
                  <summary className="land-settings-group-summary">
                    <div>
                      <strong>{group.label}</strong>
                      <span>{groupEnabledCount} / {group.regions.length}</span>
                    </div>
                    <em>접기/펼치기</em>
                  </summary>
                  <div className="land-settings-group-actions">
                    <button
                      type="button"
                      onClick={() => {
                        groupKeys.forEach((key) => onToggleRegion(key, true));
                        setMessage(`${group.label} 측정지점 전체가 표시 대상으로 선택되었습니다.`);
                      }}
                    >
                      그룹 선택
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        groupKeys.forEach((key) => onToggleRegion(key, false));
                        setMessage(`${group.label} 측정지점 표시가 해제되었습니다.`);
                      }}
                    >
                      그룹 해제
                    </button>
                  </div>
                  <div className="region-settings-list">
                    {getMarineLocationGroups(group.visibleRegions).map((locationGroup) => {
                      const locationKeys = locationGroup.regions.map((region) => region.key);
                      const locationEnabledCount = locationGroup.regions.filter((region) => enabledRegionSet.has(region.key)).length;

                      return (
                        <details className="marine-location-group" key={`${group.key}-${locationGroup.key}`} open={normalizedMarineSearchTerm ? true : undefined}>
                          <summary>
                            <strong>{locationGroup.label}</strong>
                            <span>{locationEnabledCount} / {locationGroup.regions.length}</span>
                          </summary>
                          <div className="marine-location-actions">
                            <button
                              type="button"
                              onClick={() => {
                                locationKeys.forEach((key) => onToggleRegion(key, true));
                                setMessage(`${locationGroup.label} 측정지점이 표시 대상으로 선택되었습니다.`);
                              }}
                            >
                              지역 선택
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                locationKeys.forEach((key) => onToggleRegion(key, false));
                                setMessage(`${locationGroup.label} 측정지점 표시가 해제되었습니다.`);
                              }}
                            >
                              지역 해제
                            </button>
                          </div>
                          <div className="marine-location-list">
                            {locationGroup.regions.map((region) => {
                              const checked = enabledRegionSet.has(region.key);
                              const storedHarbor = harborSelections[region.key];
                              const selectedHarbor = storedHarbor && region.harbors.some((harbor) => harbor.harborName === storedHarbor)
                                ? storedHarbor
                                : region.harbors[0]?.harborName || region.name;

                              return (
                                <div className={`land-setting-row marine-setting-row ${checked ? "active" : ""}`} key={region.key}>
                                  <label className="region-toggle">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) => onToggleRegion(region.key, event.target.checked)}
                                    />
                                    <span>
                                      {region.name}
                                      <em>{marineStationLabel(region)}</em>
                                    </span>
                                  </label>
                                  <small>{seaAreaLabels[region.seaArea]} · {selectedHarbor}</small>
                                  <select
                                    value={selectedHarbor}
                                    onChange={(event) => onHarborChange(region.key, event.target.value)}
                                    aria-label={`${region.name} 세부 위치`}
                                  >
                                    {region.harbors.map((harbor) => (
                                      <option key={harbor.harborName} value={harbor.harborName}>
                                        {harbor.harborName}
                                      </option>
                                    ))}
                                  </select>
                                  {customRegionKeys.includes(region.key) ? (
                                    <button
                                      type="button"
                                      className="region-remove-button"
                                      onClick={() => {
                                        onRemoveRegion(region.key);
                                        setMessage(`${region.name} ${seaAreaLabels[region.seaArea]} 지역이 삭제되었습니다.`);
                                      }}
                                    >
                                      삭제
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
        ) : null}

        {activeSettingsTab === "marine" ? (
        <section className="settings-card">
          <h3>특정 해상 위치 빠른 선택</h3>
          <div className="custom-region-grid">
            <label className="api-candidate-field">
              <span>측정지점 후보</span>
              <select
                value={selectedApiCandidateId}
                onChange={(event) => handleApiCandidateChange(event.target.value)}
              >
                <option value="">항구·해수욕장·관측부이·원해 선택</option>
                {apiHarborCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.regionName} · {candidate.harbor.harborName} · {marineRegionGroupLabels[candidate.marineGroup]} · {marineStationKindLabels[candidate.harbor.stationKind || "harbor"]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="settings-footer">
            <p>선택한 측정지점은 위 목록에서 자동으로 표시 대상에 추가됩니다.</p>
            <button type="button" onClick={handleEnableApiCandidate}>선택 위치 표시</button>
          </div>
        </section>
        ) : null}

        {activeSettingsTab === "land" ? (
        <section className="settings-card">
          <div className="land-settings-title-row">
            <div>
              <h3>육상 시군구 표시 설정</h3>
              <p>전국 시군구 중 체크한 지역만 육상 지도와 표에 표시됩니다.</p>
            </div>
            <strong>{selectedLandCount} / {landZoneList.length}</strong>
          </div>
          <div className="land-settings-toolbar" aria-label="육상 시군구 빠른 선택">
            <button
              type="button"
              onClick={() => {
                onSetLandZoneSelectionMode("all");
                setMessage("전국 시군구 전체가 표시 대상으로 선택되었습니다.");
              }}
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={() => {
                onSetLandZoneSelectionMode("preset");
                setMessage("대표 운용 지역만 표시하도록 복원했습니다.");
              }}
            >
              대표지역 복원
            </button>
          </div>
          {message ? <p className="settings-inline-message">{message}</p> : null}
          <div className="land-settings-groups">
            {landSettingsGroups.map((group) => {
              const groupZones = group.zones;
              const groupZoneIds = groupZones.map((zone) => zone.id);
              const groupEnabledCount = groupZones.filter((zone) => enabledLandZoneSet.has(zone.id)).length;

              return (
                <details className="land-settings-group" key={group.key}>
                  <summary className="land-settings-group-summary">
                    <div>
                      <strong>{group.label}</strong>
                      <span>{groupEnabledCount} / {groupZones.length}</span>
                    </div>
                    <em>접기/펼치기</em>
                  </summary>
                  <div className="land-settings-group-actions">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleLandZoneGroup(groupZoneIds, true);
                        setMessage(`${group.label} 전체가 표시 대상으로 선택되었습니다.`);
                      }}
                    >
                      권역 선택
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleLandZoneGroup(groupZoneIds, false);
                        setMessage(`${group.label} 표시가 해제되었습니다.`);
                      }}
                    >
                      권역 해제
                    </button>
                  </div>
                  <div className="land-settings-list">
                    {groupZones.map((zone) => {
                      const checked = enabledLandZoneSet.has(zone.id);
                      return (
                        <div className={`land-setting-row ${checked ? "active" : ""}`} key={zone.id}>
                          <label className="region-toggle">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                onToggleLandZone(zone.id, event.target.checked);
                                setMessage(`${zone.name} ${event.target.checked ? "표시" : "숨김"} 상태가 저장되었습니다.`);
                              }}
                            />
                            <span>
                              {zone.name}
                              <em>{zone.sector}</em>
                            </span>
                          </label>
                          <small>{zone.center[0].toFixed(4)}, {zone.center[1].toFixed(4)}</small>
                          {customLandZoneKeys.includes(zone.id) ? (
                            <button
                              type="button"
                              className="region-remove-button"
                              onClick={() => {
                                onRemoveLandZone(zone.id);
                                setMessage(`${zone.name} 육상 지역이 삭제되었습니다.`);
                              }}
                            >
                              삭제
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
        ) : null}

        {activeSettingsTab === "air" ? (
        <Fragment>
          <section className="settings-card">
            <div className="land-settings-title-row">
              <div>
                <h3>공중 측정지역 표시 설정</h3>
                <p>전국 항공 관측권역을 지역별로 묶고, 체크한 측정지역만 항공 화면에 표시합니다.</p>
              </div>
              <strong>{selectedAviationCount} / {aviationZoneList.length}</strong>
            </div>
            {message ? <p className="settings-inline-message">{message}</p> : null}
            <div className="land-settings-groups aviation-settings-groups">
              {aviationSettingsGroups.map((group) => {
                const groupZoneIds = group.zones.map((zone) => zone.id);
                const groupEnabledCount = group.zones.filter((zone) => enabledAviationZoneSet.has(zone.id)).length;

                return (
                  <details className="land-settings-group" key={group.key}>
                    <summary className="land-settings-group-summary">
                      <div>
                        <strong>{group.label}</strong>
                        <span>{groupEnabledCount} / {group.zones.length}</span>
                      </div>
                      <em>접기/펼치기</em>
                    </summary>
                    <div className="land-settings-group-actions">
                      <button
                        type="button"
                        onClick={() => {
                          groupZoneIds.forEach((zoneId) => onToggleAviationZone(zoneId, true));
                          setMessage(`${group.label} 공중 측정지역 전체가 표시 대상으로 선택되었습니다.`);
                        }}
                      >
                        권역 선택
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          groupZoneIds.forEach((zoneId) => onToggleAviationZone(zoneId, false));
                          setMessage(`${group.label} 공중 측정지역 표시가 해제되었습니다.`);
                        }}
                      >
                        권역 해제
                      </button>
                    </div>
                    <div className="land-settings-list aviation-settings-list">
                      {group.zones.map((zone) => {
                        const checked = enabledAviationZoneSet.has(zone.id);
                        return (
                          <div className={`land-setting-row ${checked ? "active" : ""}`} key={zone.id}>
                            <label className="region-toggle">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  onToggleAviationZone(zone.id, event.target.checked);
                                  setMessage(`${zone.name} ${event.target.checked ? "표시" : "숨김"} 상태가 저장되었습니다.`);
                                }}
                              />
                              <span>
                                {zone.name}
                                <em>{zone.label}</em>
                              </span>
                            </label>
                            <small>{zone.sector} · {zone.center[0].toFixed(4)}, {zone.center[1].toFixed(4)}</small>
                            {customAviationZoneKeys.includes(zone.id) ? (
                              <button
                                type="button"
                                className="region-remove-button"
                                onClick={() => {
                                  onRemoveAviationZone(zone.id);
                                  setMessage(`${zone.name} 공중 측정지역이 삭제되었습니다.`);
                                }}
                              >
                                삭제
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>

        </Fragment>
        ) : null}

        {activeSettingsTab === "sources" ? (
        <section className="settings-card">
          <h3>자료 출처 및 상세 확인 항목</h3>
          <dl className="source-list">
            <div>
              <dt>기상청 API허브 · 지상관측</dt>
              <dd>ASOS/AWS 기반 기온, 강수, 기압, 습도, 풍향, 풍속, 돌풍, 적설, 구름, 시정, 현상번호</dd>
            </div>
            <div>
              <dt>기상청 API허브 · 해양관측</dt>
              <dd>해양기상부이·파고부이 기반 기온, 바람, 기압, 습도, 파고, 파주기, 파향, 수온</dd>
            </div>
            <div>
              <dt>기상청 API허브 · 예특보</dt>
              <dd>초단기·단기예보, 기온, 바람, 강수량, 하늘상태, 강수확률, 파고, 기상특보</dd>
            </div>
            <div>
              <dt>기상청 API허브 · 항공</dt>
              <dd>METAR/항공관측 기반 풍향, 풍속, 돌풍, 시정, 활주로시정, 현재일기, 운량, 운고, 기온, 이슬점, 습도, 기압</dd>
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
              <dt>윈디</dt>
              <dd>해상풍 지도 표시, 별도 연동 구성 시 시간별 풍향·풍속·파고·파주기 우선 반영</dd>
            </div>
            <div>
              <dt>바다타임 상세</dt>
              <dd>물흐름, 만조/간조, 파향, 파주기, 일출/일몰, 월출/월몰, 바다수온</dd>
            </div>
            <div>
              <dt>기상청 단기예보·초단기실황</dt>
              <dd>육상 기온, 습도, 강수량, 강수확률, 풍속, 풍향, 날씨 상태</dd>
            </div>
            <div>
              <dt>기상청 ASOS·생활기상지수</dt>
              <dd>시정, 기압, 기압 추세, 적설, 현상번호, 체감온도, 자외선지수, 대기정체지수</dd>
            </div>
            <div>
              <dt>에어코리아·산림청</dt>
              <dd>PM10, PM2.5, 오존, 산불위험지수, 산불위험등급</dd>
            </div>
            <div>
              <dt>기상특보 조회서비스</dt>
              <dd>폭염, 한파, 호우, 대설, 강풍, 건조, 안개, 낙뢰·뇌우 관련 정보</dd>
            </div>
          </dl>
        </section>
        ) : null}
      </section>
  );

  if (embedded) {
    return (
      <section className="settings-view" aria-label="설정 화면">
        {settingsContent}
      </section>
    );
  }

  return (
    <div className="settings-backdrop" role="dialog" aria-modal="true" aria-label="설정">
      {settingsContent}
    </div>
  );
}

type MarineAnalysisSource = {
  label: string;
  region: ResolvedRegion;
  row: MarineRow;
  weather: WeatherNow;
};

type MarineMonthlyDayRow = {
  dateLabel: string;
  lunarLabel: string;
  bmntEent: string;
  sunriseSunset: string;
  moonriseMoonset: string;
  moonlight: string;
  tideAge: string;
  isToday: boolean;
  tides: Record<string, { high: string; low: string }>;
};

type MarineAssessmentTableRow = {
  label: string;
  overview: string;
  alert: string;
  wavePrimary: string;
  waveSecondary: string;
  tideAge: string;
  current: string;
  waterTemp: string;
  vulnerableTime: string;
  visibility: string;
  evaluation: string;
  evaluationLevel: "clear" | "caution" | "restrict";
};

function marineAnalysisRegionLabel(region: ResolvedRegion) {
  const station = region.harborName && region.harborName !== region.name ? region.harborName : seaAreaLabels[region.seaArea];
  return `${region.name} · ${station}`;
}

function resolveMarineAnalysisSourceFromRegion(
  region: ResolvedRegion,
  rows: Record<RegionKey, MarineRow>,
  weatherByRegion: Record<RegionKey, WeatherNow>,
): MarineAnalysisSource {
  const row = rows[region.key] || region.fixed;
  const weather = weatherByRegion[region.key] || fallbackWeather(region);

  return {
    label: marineAnalysisRegionLabel(region),
    region,
    row,
    weather,
  };
}

function formatKstMonthTitle(date = new Date()) {
  const parts = kstParts(date);
  return `${parts.year}년 ${Number(parts.month)}월 기상분석표`;
}

function formatKstAssessmentTitle(date = new Date()) {
  const parts = kstParts(date);
  return `${parts.year}년 ${Number(parts.month)}월 ${Number(parts.day)}일 해상 접근 가능성 판단표(${parts.hour}:00 기준)`;
}

function weekdayLabel(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(date).replace("요일", "");
}

function approximateLunarLabel(day: number) {
  const lunarDay = ((day + 13) % 30) + 1;
  return `음 ${String(lunarDay).padStart(2, "0")}`;
}

function moonlightLabel(day: number) {
  const lunarDay = ((day + 13) % 30) + 1;
  const angle = ((lunarDay - 1) / 29.53) * Math.PI * 2;
  const illumination = Math.round(((1 - Math.cos(angle)) / 2) * 100);
  return `${Math.max(0, Math.min(100, illumination))}%`;
}

function shiftedTideValue(primary: string, secondary: string | undefined, dayIndex: number) {
  const shift = (dayIndex % 3) - 1;
  const first = addHours(primary, shift);
  const second = addHours(secondary || addHours(primary, 12), shift);
  return `${first} / ${second}`;
}

function buildMonthlyAnalysisRows(
  regions: ResolvedRegion[],
  rows: Record<RegionKey, MarineRow>,
  weatherByRegion: Record<RegionKey, WeatherNow>,
) {
  const sources = regions.map((region) => resolveMarineAnalysisSourceFromRegion(region, rows, weatherByRegion));

  if (!sources.length) {
    return [];
  }

  const parts = kstParts();
  const year = Number(parts.year);
  const month = Number(parts.month);
  const today = Number(parts.day);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const primarySource = sources[0];

  return Array.from({ length: daysInMonth }, (_, index): MarineMonthlyDayRow => {
    const day = index + 1;
    const tideReference = primarySource.row;
    const tides = Object.fromEntries(
      sources.map((source) => {
        return [
          source.region.key,
          {
            high: shiftedTideValue(source.row.highTide, source.row.highTide2, index),
            low: shiftedTideValue(source.row.lowTide, source.row.lowTide2, index),
          },
        ];
      }),
    ) as MarineMonthlyDayRow["tides"];

    return {
      dateLabel: `${month}.${day}.(${weekdayLabel(year, month, day)})`,
      lunarLabel: approximateLunarLabel(day),
      bmntEent: `${addHours(primarySource.weather.sunrise, -1)} / ${addHours(primarySource.weather.sunset, 1)}`,
      sunriseSunset: `${primarySource.weather.sunrise} / ${primarySource.weather.sunset}`,
      moonriseMoonset: `${primarySource.weather.moonrise} / ${primarySource.weather.moonset}`,
      moonlight: moonlightLabel(day),
      tideAge: tideReference.tideAge,
      isToday: day === today,
      tides,
    };
  });
}

function currentVulnerableTimeLabel(date = new Date()) {
  const hour = Number(kstParts(date).hour);

  if (hour >= 22 || hour < 4) return "야간";
  if (hour >= 19) return "저녁";
  if (hour >= 4 && hour < 6) return "새벽";
  return "주간";
}

function marineVisibilityCondition(row: MarineRow, weather: WeatherNow) {
  const text = `${row.overview} ${weather.label}`;

  if (/안개|폭우|눈|비/.test(text)) return "제한";
  if (/흐림|구름/.test(text)) return "보통";
  return "양호";
}

function secondaryWaveLabel(row: MarineRow) {
  const wave = numberFromText(row.wave, 0.8);
  return `${Math.min(wave + 0.2, 3).toFixed(1)}m`;
}

function evaluateMarineAssessment(row: MarineRow, weather: WeatherNow) {
  const wave = numberFromText(row.wave, 0.8);
  const wind = numberFromText(row.windSpeed, 4);
  const visibility = marineVisibilityCondition(row, weather);
  const hasAlert = row.alert !== "없음" && row.alert !== "-";
  let score = 0;

  if (hasAlert) score += 25;
  if (wave >= 2) score += 30;
  else if (wave >= 1.2) score += 18;
  else if (wave >= 0.8) score += 10;
  if (wind >= 12) score += 28;
  else if (wind >= 8) score += 18;
  else if (wind >= 5) score += 8;
  if (visibility === "제한") score += 20;
  else if (visibility === "보통") score += 8;
  if (currentVulnerableTimeLabel() !== "주간") score += 6;

  if (score >= 65) {
    return { evaluation: "제한", evaluationLevel: "restrict" as const };
  }

  if (score >= 35) {
    return { evaluation: "주의", evaluationLevel: "caution" as const };
  }

  return { evaluation: "가능", evaluationLevel: "clear" as const };
}

function buildMarineAssessmentRow(source: MarineAnalysisSource): MarineAssessmentTableRow {
  const visibility = marineVisibilityCondition(source.row, source.weather);
  const evaluation = evaluateMarineAssessment(source.row, source.weather);

  return {
    label: source.label,
    overview: source.row.overview,
    alert: source.row.alert,
    wavePrimary: source.row.wave,
    waveSecondary: secondaryWaveLabel(source.row),
    tideAge: source.row.tideAge,
    current: source.row.current,
    waterTemp: source.row.waterTemp,
    vulnerableTime: currentVulnerableTimeLabel(),
    visibility,
    ...evaluation,
  };
}

function AnalysisDocumentHeader({
  title,
  subtitle,
  regions,
  onOpenSettings,
}: {
  title: string;
  subtitle?: string;
  regions: ResolvedRegion[];
  onOpenSettings: () => void;
}) {
  return (
    <header className="analysis-doc-header">
      <div className="analysis-doc-title-row">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="analysis-action-group">
          <button type="button" className="analysis-secondary-button" onClick={onOpenSettings}>
            <Settings size={18} aria-hidden="true" />
            위치 선택
          </button>
          <button type="button" className="analysis-action-button" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            인쇄
          </button>
        </div>
      </div>
      <div className="analysis-selection-strip" aria-label="표 반영 위치">
        <div>
          <span>표 반영 위치</span>
          <strong>{regions.length}개 선택</strong>
        </div>
        <div className="analysis-chip-row">
          {regions.slice(0, 12).map((region) => (
            <span key={region.key} className="analysis-location-chip">
              {marineAnalysisRegionLabel(region)}
            </span>
          ))}
          {regions.length > 12 ? <span className="analysis-location-chip muted">+{regions.length - 12}</span> : null}
        </div>
      </div>
    </header>
  );
}

function MarineMonthlyAnalysisView({
  regions,
  weatherByRegion,
  tableRows,
  tableReferenceTime,
  onOpenSettings,
}: {
  regions: ResolvedRegion[];
  weatherByRegion: Record<RegionKey, WeatherNow>;
  tableRows: Record<RegionKey, MarineRow>;
  tableReferenceTime: string;
  onOpenSettings: () => void;
}) {
  const analysisSources = regions.map((region) => resolveMarineAnalysisSourceFromRegion(region, tableRows, weatherByRegion));
  const monthRows = buildMonthlyAnalysisRows(regions, tableRows, weatherByRegion);
  const tableMinWidth = Math.max(820, 610 + analysisSources.length * 170);

  return (
    <section className="marine-analysis-view" aria-label="월간 기상분석표">
      <article className="analysis-document monthly-document">
        <AnalysisDocumentHeader
          title={formatKstMonthTitle()}
          subtitle={`${tableReferenceTime} · 선택 위치 기준`}
          regions={regions}
          onOpenSettings={onOpenSettings}
        />
        <div className="analysis-table-wrap monthly-table-wrap">
          <table className="analysis-grid-table monthly-analysis-table" style={{ minWidth: tableMinWidth }}>
            <thead>
              <tr>
                <th rowSpan={2}>일자</th>
                <th rowSpan={2}>음력</th>
                <th rowSpan={2}>BMNT<br />/ EENT</th>
                <th rowSpan={2}>일출<br />/ 일몰</th>
                <th rowSpan={2}>월출<br />/ 월몰</th>
                <th rowSpan={2}>월광</th>
                <th rowSpan={2}>물때</th>
                {analysisSources.map((source) => (
                  <th key={source.region.key} colSpan={2}>
                    <span>{source.region.name}</span>
                    <small>{source.region.harborName}</small>
                  </th>
                ))}
              </tr>
              <tr>
                {analysisSources.flatMap((source) => [
                  <th key={`${source.region.key}-high`}>만조</th>,
                  <th key={`${source.region.key}-low`}>간조</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {monthRows.map((row) => (
                <tr key={row.dateLabel} className={row.isToday ? "current-analysis-row" : undefined}>
                  <th scope="row">{row.dateLabel}</th>
                  <td>{row.lunarLabel}</td>
                  <td>{row.bmntEent}</td>
                  <td>{row.sunriseSunset}</td>
                  <td>{row.moonriseMoonset}</td>
                  <td>{row.moonlight}</td>
                  <td>{row.tideAge}</td>
                  {analysisSources.flatMap((source) => [
                    <td key={`${row.dateLabel}-${source.region.key}-high`}>{row.tides[source.region.key].high}</td>,
                    <td key={`${row.dateLabel}-${source.region.key}-low`}>{row.tides[source.region.key].low}</td>,
                  ])}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="analysis-mobile-list monthly-mobile-list" aria-label="모바일 월간 기상분석표">
          {monthRows.map((row) => (
            <article key={`mobile-${row.dateLabel}`} className={`analysis-mobile-card ${row.isToday ? "current" : ""}`}>
              <header>
                <div>
                  <strong>{row.dateLabel}</strong>
                  <span>{row.tideAge} · 월광 {row.moonlight}</span>
                </div>
              </header>
              <div className="mobile-astro-grid">
                <div>
                  <span>BMNT/EENT</span>
                  <strong>{row.bmntEent}</strong>
                </div>
                <div>
                  <span>일출/일몰</span>
                  <strong>{row.sunriseSunset}</strong>
                </div>
                <div>
                  <span>월출/월몰</span>
                  <strong>{row.moonriseMoonset}</strong>
                </div>
                <div>
                  <span>음력</span>
                  <strong>{row.lunarLabel}</strong>
                </div>
              </div>
              <div className="mobile-tide-list" aria-label={`${row.dateLabel} 위치별 조석`}>
                {analysisSources.map((source) => (
                  <section key={`${row.dateLabel}-${source.region.key}`} className="mobile-tide-card">
                    <div>
                      <strong>{source.region.name}</strong>
                      <span>{source.region.harborName}</span>
                    </div>
                    <dl>
                      <div>
                        <dt>만조</dt>
                        <dd>{row.tides[source.region.key].high}</dd>
                      </div>
                      <div>
                        <dt>간조</dt>
                        <dd>{row.tides[source.region.key].low}</dd>
                      </div>
                    </dl>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

function MarineAssessmentMobileGroup({
  title,
  emptyMessage,
  rows,
}: {
  title: string;
  emptyMessage: string;
  rows: MarineAssessmentTableRow[];
}) {
  return (
    <section className="assessment-mobile-group" aria-label={`${title} 모바일 보기`}>
      <h3>{title}</h3>
      {rows.length ? (
        rows.map((row) => (
          <article key={`mobile-${title}-${row.label}`} className={`assessment-mobile-card ${row.evaluationLevel}`}>
            <header>
              <div>
                <strong>{row.label}</strong>
                <span>{row.overview} · {row.visibility}</span>
              </div>
              <span className={`assessment-badge ${row.evaluationLevel}`}>{row.evaluation}</span>
            </header>
            <dl>
              <div>
                <dt>특보</dt>
                <dd>{row.alert}</dd>
              </div>
              <div>
                <dt>파고</dt>
                <dd>{row.wavePrimary} / {row.waveSecondary}</dd>
              </div>
              <div>
                <dt>물때</dt>
                <dd>{row.tideAge}</dd>
              </div>
              <div>
                <dt>창조류</dt>
                <dd>{row.current}</dd>
              </div>
              <div>
                <dt>수온</dt>
                <dd>{row.waterTemp}</dd>
              </div>
              <div>
                <dt>취약시기</dt>
                <dd>{row.vulnerableTime}</dd>
              </div>
            </dl>
          </article>
        ))
      ) : (
        <p>{emptyMessage}</p>
      )}
    </section>
  );
}

function MarineAssessmentMatrix({
  title,
  regionHeading,
  emptyMessage,
  rows,
}: {
  title: string;
  regionHeading: string;
  emptyMessage: string;
  rows: MarineAssessmentTableRow[];
}) {
  return (
    <section className="assessment-matrix-card" aria-label={title}>
      <table className="analysis-grid-table assessment-grid-table">
        <colgroup>
          <col className="assessment-col-label" />
          {Array.from({ length: 9 }, (_, index) => (
            <col key={index} className="assessment-col-metric" />
          ))}
          <col className="assessment-col-evaluation" />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={3}>구분</th>
            <th colSpan={10}>{title}</th>
          </tr>
          <tr>
            <th colSpan={2}>기상</th>
            <th colSpan={2}>해상</th>
            <th colSpan={3}>{regionHeading}</th>
            <th colSpan={2}>환경조건</th>
            <th rowSpan={2}>종합평가</th>
          </tr>
          <tr>
            <th>개황</th>
            <th>기상특보</th>
            <th>1차 파고</th>
            <th>2차 파고</th>
            <th>물때</th>
            <th>창조류</th>
            <th>수온</th>
            <th>취약시기</th>
            <th>시정조건</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.overview}</td>
              <td>{row.alert}</td>
              <td>{row.wavePrimary}</td>
              <td>{row.waveSecondary}</td>
              <td>{row.tideAge}</td>
              <td>{row.current}</td>
              <td>{row.waterTemp}</td>
              <td>{row.vulnerableTime}</td>
              <td>{row.visibility}</td>
              <td>
                <span className={`assessment-badge ${row.evaluationLevel}`}>{row.evaluation}</span>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr className="assessment-empty-row">
              <td colSpan={11}>{emptyMessage}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

function MarineAccessAssessmentView({
  regions,
  weatherByRegion,
  tableRows,
  tableReferenceTime,
  onOpenSettings,
}: {
  regions: ResolvedRegion[];
  weatherByRegion: Record<RegionKey, WeatherNow>;
  tableRows: Record<RegionKey, MarineRow>;
  tableReferenceTime: string;
  onOpenSettings: () => void;
}) {
  const analysisSources = regions.map((region) => resolveMarineAnalysisSourceFromRegion(region, tableRows, weatherByRegion));
  const outboundRows = analysisSources
    .filter((source) => isChinaMarineRegion(source.region))
    .map((source) => buildMarineAssessmentRow(source));
  const inboundRows = analysisSources
    .filter((source) => !isChinaMarineRegion(source.region))
    .map((source) => buildMarineAssessmentRow(source));

  return (
    <section className="marine-analysis-view" aria-label="해상 접근 가능성 판단표">
      <article className="analysis-document assessment-document">
        <AnalysisDocumentHeader
          title={formatKstAssessmentTitle()}
          subtitle={`${tableReferenceTime} · 선택 위치 기준`}
          regions={regions}
          onOpenSettings={onOpenSettings}
        />
        <div className="assessment-stack">
          <MarineAssessmentMatrix
            title="출항 가능여부 평가 지표"
            regionHeading="출항지역"
            emptyMessage="선택한 출항 위치가 없습니다. 설정에서 중국 황해·동중국해 위치를 체크하세요."
            rows={outboundRows}
          />
          <MarineAssessmentMatrix
            title="접안 가능여부 평가 지표"
            regionHeading="접안지역"
            emptyMessage="선택한 접안 위치가 없습니다. 설정에서 국내 해상 위치를 체크하세요."
            rows={inboundRows}
          />
        </div>
        <div className="analysis-mobile-list assessment-mobile-list" aria-label="모바일 해상 접근 가능성 판단표">
          <MarineAssessmentMobileGroup
            title="출항 가능여부"
            emptyMessage="선택한 출항 위치가 없습니다. 설정에서 중국 황해·동중국해 위치를 체크하세요."
            rows={outboundRows}
          />
          <MarineAssessmentMobileGroup
            title="접안 가능여부"
            emptyMessage="선택한 접안 위치가 없습니다. 설정에서 국내 해상 위치를 체크하세요."
            rows={inboundRows}
          />
        </div>
      </article>
    </section>
  );
}

function MarineDashboardView({
  displayRegions,
  activeKey,
  activeRegion,
  weatherByRegion,
  hourlyByRegion,
  tableRows,
  tableReferenceTime,
  onSelectRegion,
}: {
  displayRegions: ResolvedRegion[];
  activeKey: RegionKey;
  activeRegion: ResolvedRegion;
  weatherByRegion: Record<RegionKey, WeatherNow>;
  hourlyByRegion: Record<RegionKey, HourlyWeather[]>;
  tableRows: Record<RegionKey, MarineRow>;
  tableReferenceTime: string;
  onSelectRegion: (region: RegionKey) => void;
}) {
  return (
    <section className="marine-view" aria-label="해양상황 화면">
      <section className="region-grid" aria-label="지역별 실시간 날씨 카드">
        {displayRegions.map((region) => (
          <RegionCard
            key={region.key}
            region={region}
            active={region.key === activeKey}
            weather={weatherByRegion[region.key] || fallbackWeather(region)}
            onSelect={onSelectRegion}
          />
        ))}
      </section>

      <section className="workspace" aria-label="해양상황 데이터">
        <section className="weather-system" aria-label="시간별 기상 및 해양 제원">
          <HourlyStrip
            region={activeRegion}
            items={hourlyByRegion[activeRegion.key] || fallbackHourly(activeRegion)}
          />
          <div className="table-reference">
            <span>{tableReferenceTime}</span>
          </div>
          <WeatherTable
            activeRegion={activeRegion}
            displayRegions={displayRegions}
            rows={tableRows}
          />
        </section>
      </section>
    </section>
  );
}

function BladeDashboardView({
  zoneAssessments,
  activeZoneId,
  activeZoneAssessment,
  windyOverlay,
  onSelectZone,
  onWindyOverlayChange,
}: {
  zoneAssessments: ZoneAssessment[];
  activeZoneId: CoastalZone["id"];
  activeZoneAssessment: ZoneAssessment;
  windyOverlay: WindyOverlay;
  onSelectZone: (zoneId: CoastalZone["id"]) => void;
  onWindyOverlayChange: (overlay: WindyOverlay) => void;
}) {
  return (
    <section className="blade-view" aria-label="해상 판단지원 화면">
      <section className="blade-workspace">
        <div className="blade-map-column">
          <BladeAiMap
            items={zoneAssessments}
            activeZoneId={activeZoneId}
            windyOverlay={windyOverlay}
            onWindyOverlayChange={onWindyOverlayChange}
          />
          <ZoneCardList
            items={zoneAssessments}
            activeZoneId={activeZoneId}
            onSelect={onSelectZone}
          />
        </div>

        <ZoneDecisionPanel item={activeZoneAssessment} />
      </section>
    </section>
  );
}

function LandEnvironmentGrid({ data }: { data: LandZoneData }) {
  const items = [
    { label: "기온", value: `${data.temperatureC}℃`, icon: <Sun size={16} aria-hidden="true" /> },
    { label: "습도", value: `${data.humidityPercent}%`, icon: <CloudRain size={16} aria-hidden="true" /> },
    { label: "체감/WBGT", value: `${landApparentTemperature(data)}℃ / ${data.wbgtC ?? "-"}℃`, icon: <Activity size={16} aria-hidden="true" /> },
    { label: "강수량/확률", value: `${data.precipitationMm}mm / ${data.precipitationProbability}%`, icon: <CloudRain size={16} aria-hidden="true" /> },
    { label: "풍속/풍향", value: `${data.windSpeedMs}m/s · ${landWindDirection(data)}`, icon: <Wind size={16} aria-hidden="true" /> },
    { label: "시정", value: `${data.visibilityKm}km`, icon: <Eye size={16} aria-hidden="true" /> },
    { label: "안개/운무", value: `${data.weatherStatus === "안개" ? "안개" : "운무"} · ${data.fogLevel}`, icon: <CloudSun size={16} aria-hidden="true" /> },
    { label: "대기질", value: `PM10 ${data.pm10Level} / PM2.5 ${data.pm25Level} / O3 ${data.ozoneLevel}`, icon: <Activity size={16} aria-hidden="true" /> },
    { label: "산불지수", value: data.fireRiskLevel, icon: <Flame size={16} aria-hidden="true" /> },
    { label: "기상특보", value: data.weatherAlert, icon: <AlertTriangle size={16} aria-hidden="true" /> },
  ];

  return (
    <div className="environment-grid land-environment-grid">
      {items.map((item) => (
        <div className="environment-item" key={item.label}>
          {item.icon}
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function LandGroupTabs({
  groups,
  activeGroup,
  onSelect,
}: {
  groups: Array<{ key: string; label: string }>;
  activeGroup: string;
  onSelect: (group: string) => void;
}) {
  return (
    <div className="land-group-tabs" aria-label="육상 지역 구분">
      {groups.map((group) => (
        <button
          type="button"
          key={group.key}
          className={activeGroup === group.key ? "active" : undefined}
          onClick={() => onSelect(group.key)}
          aria-pressed={activeGroup === group.key}
        >
          {group.label}
        </button>
      ))}
    </div>
  );
}

function LandSituationMap({
  items,
  activeZoneId,
  windyOverlay,
  onWindyOverlayChange,
}: {
  items: LandAssessment[];
  activeZoneId: LandZone["id"];
  windyOverlay: WindyOverlay;
  onWindyOverlayChange: (overlay: WindyOverlay) => void;
}) {
  const activeItem = items.find((item) => item.zone.id === activeZoneId) || items[0];
  const [lat, lon] = activeItem.zone.center;
  const mapUrl = windyLandEmbedUrl(activeItem, windyOverlay);

  return (
    <section className="land-map-card" aria-label="육상 윈디 지도">
      <div className="land-map-canvas official-map">
        <iframe
          key={`${activeItem.zone.id}-${lat}-${lon}-${windyOverlay}`}
          title="윈디 육상 지도"
          src={mapUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <WindyOverlaySelector
          value={windyOverlay}
          options={weatherWindyOverlays}
          onChange={onWindyOverlayChange}
        />
      </div>
    </section>
  );
}

function LandZoneCardList({
  items,
  activeZoneId,
  onSelect,
}: {
  items: LandAssessment[];
  activeZoneId: LandZone["id"];
  onSelect: (zoneId: LandZone["id"]) => void;
}) {
  return (
    <aside className="land-zone-panel" aria-label="육상 권역 선택">
      <div className="land-zone-list">
        {items.map((item) => (
          <button
            type="button"
            key={item.zone.id}
            className={`land-zone-card ${riskLevelClass(item.assessment.level)} ${item.zone.id === activeZoneId ? "active" : ""}`}
            onClick={() => onSelect(item.zone.id)}
            aria-pressed={item.zone.id === activeZoneId}
          >
            <span>
              {item.zone.label}
              <em>{item.zone.sector}</em>
            </span>
            <span className="zone-score">
              <strong>{item.assessment.score}</strong>
              <b>{item.assessment.level === "위험" ? "위험 경고" : item.assessment.level}</b>
            </span>
            <small>
              기온 {item.zone.data.temperatureC}℃ · 풍속 {item.zone.data.windSpeedMs}m/s
            </small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function LandDashboardView({
  landZoneList,
  activeLandZoneId,
  onSelectLandZone,
  windyOverlay,
  onWindyOverlayChange,
}: {
  landZoneList: LandZone[];
  activeLandZoneId: LandZone["id"];
  onSelectLandZone: (zoneId: LandZone["id"]) => void;
  windyOverlay: WindyOverlay;
  onWindyOverlayChange: (overlay: WindyOverlay) => void;
}) {
  const [activeGroup, setActiveGroup] = useState("all");
  const landDisplayGroups = useMemo(() => getLandAdministrativeGroups(landZoneList), [landZoneList]);
  const landAssessments = useMemo(
    () => landZoneList.map((zone) => ({ zone, assessment: calculateLandRisk(zone.data) })),
    [landZoneList],
  );
  const filteredAssessments = useMemo(
    () => {
      const next = activeGroup === "all"
        ? landAssessments
        : landAssessments.filter((item) => landAdministrativeKey(item.zone) === activeGroup);

      return next.length ? next : landAssessments;
    },
    [activeGroup, landAssessments],
  );
  const activeItem =
    filteredAssessments.find((item) => item.zone.id === activeLandZoneId) ||
    filteredAssessments[0] ||
    landAssessments[0];
  const levelColor = riskLevelColor(activeItem.assessment.level);

  return (
    <section className="land-view" aria-label="육상 화면">
      <section className="land-workspace">
        <div className="land-map-column">
          <LandGroupTabs groups={landDisplayGroups} activeGroup={activeGroup} onSelect={setActiveGroup} />
          <LandSituationMap
            items={filteredAssessments}
            activeZoneId={activeItem.zone.id}
            windyOverlay={windyOverlay}
            onWindyOverlayChange={onWindyOverlayChange}
          />
          <LandZoneCardList
            items={filteredAssessments}
            activeZoneId={activeItem.zone.id}
            onSelect={onSelectLandZone}
          />
        </div>

        <aside className={`blade-decision-panel land-decision-panel ${riskLevelClass(activeItem.assessment.level)}`} aria-label="육상 판단 근거">
          <div className="decision-panel-head">
            <div>
              <span>선택 권역 · {activeItem.zone.sector}</span>
              <h2>{activeItem.zone.name}</h2>
            </div>
            <div className="risk-gauge" style={{ background: `conic-gradient(${levelColor} ${activeItem.assessment.score * 3.6}deg, #e8eef7 0deg)` }}>
              <div>
                <strong>{activeItem.assessment.score}</strong>
                <span>{activeItem.assessment.level}</span>
              </div>
            </div>
          </div>

          <section className="decision-section">
            <div className="section-title">
              <ShieldCheck size={18} aria-hidden="true" />
              <h3>현재 주요 데이터</h3>
            </div>
            <LandEnvironmentGrid data={activeItem.zone.data} />
          </section>

          <section className="decision-section">
            <div className="section-title">
              <Activity size={18} aria-hidden="true" />
              <h3>4축 위험도</h3>
            </div>
            <LandAxisCards assessment={activeItem.assessment} />
          </section>

          <section className="decision-section">
            <div className="section-title">
              <Activity size={18} aria-hidden="true" />
              <h3>항목별 기여도</h3>
            </div>
            <LandContributionBars assessment={activeItem.assessment} />
          </section>

          <section className="decision-section">
            <div className="section-title">
              <AlertTriangle size={18} aria-hidden="true" />
              <h3>육상 판단 근거</h3>
            </div>
            <RuleCards assessment={activeItem.assessment} />
          </section>
        </aside>
      </section>
    </section>
  );
}

function LandTableView({
  landZoneList,
  activeLandZoneId,
  onSelectLandZone,
}: {
  landZoneList: LandZone[];
  activeLandZoneId: LandZone["id"];
  onSelectLandZone: (zoneId: LandZone["id"]) => void;
}) {
  const [activeGroup, setActiveGroup] = useState("all");
  const landDisplayGroups = useMemo(() => getLandAdministrativeGroups(landZoneList), [landZoneList]);
  const landAssessments = useMemo(
    () => landZoneList.map((zone) => ({ zone, assessment: calculateLandRisk(zone.data) })),
    [landZoneList],
  );
  const filteredAssessments = useMemo(
    () => {
      const next = activeGroup === "all"
        ? landAssessments
        : landAssessments.filter((item) => landAdministrativeKey(item.zone) === activeGroup);

      return next.length ? next : landAssessments;
    },
    [activeGroup, landAssessments],
  );
  const activeItem =
    filteredAssessments.find((item) => item.zone.id === activeLandZoneId) ||
    filteredAssessments[0] ||
    landAssessments[0];
  const cardItems = filteredAssessments.map((item) => ({
    id: item.zone.id,
    label: item.zone.label,
    name: item.zone.name,
    sector: item.zone.sector,
    score: item.assessment.score,
    level: item.assessment.level,
    metrics: landSituationMetrics(item.zone),
  }));

  return (
    <section className="land-view land-table-view" aria-label="육상 표 화면">
      <div className="land-table-shell">
        <div className="table-region-panel">
          <OperationalRegionCardGrid
            items={cardItems}
            activeId={activeItem.zone.id}
            ariaLabel="육상 지역별 카드"
            onSelect={onSelectLandZone}
          />
          <LandGroupTabs groups={landDisplayGroups} activeGroup={activeGroup} onSelect={setActiveGroup} />
        </div>
        <OperationalHourlyStrip
          title="시간별 육상"
          subtitle={activeItem.zone.name}
          rows={landHourlyRows(activeItem.zone)}
        />
      </div>
    </section>
  );
}

function aviationLevelClass(level: AviationRiskLevel) {
  return riskLevelClass(level);
}

function AviationEnvironmentGrid({ data }: { data: AviationZoneData }) {
  const items = [
    { label: "평균풍속", value: `${data.averageWindSpeedMs}m/s`, icon: <Wind size={16} aria-hidden="true" /> },
    { label: "순간풍속", value: `${data.gustSpeedMs}m/s`, icon: <Activity size={16} aria-hidden="true" /> },
    { label: "풍향", value: `${data.windDirection} · ${data.returnWindStatus}`, icon: <Compass size={16} aria-hidden="true" /> },
    { label: "강수/강설", value: `${data.precipitationMm}mm / ${data.snowfallCm}cm`, icon: <CloudRain size={16} aria-hidden="true" /> },
    { label: "시정", value: `${data.visibilityKm}km`, icon: <Eye size={16} aria-hidden="true" /> },
    { label: "안개/운무", value: data.fogLevel, icon: <CloudSun size={16} aria-hidden="true" /> },
    { label: "기온", value: `${data.temperatureC}℃`, icon: <Sun size={16} aria-hidden="true" /> },
    { label: "습도/이슬점", value: `${data.humidityPercent}% / ${data.dewPointC}℃`, icon: <Cloud size={16} aria-hidden="true" /> },
    { label: "낙뢰/뇌우", value: `${data.lightningRisk} / ${data.thunderstormRisk}`, icon: <CloudLightning size={16} aria-hidden="true" /> },
    { label: "구름고도/운량", value: `${data.cloudCeilingFt}ft / ${data.cloudAmountOctas}/8`, icon: <Plane size={16} aria-hidden="true" /> },
  ];

  return (
    <div className="environment-grid aviation-environment-grid">
      {items.map((item) => (
        <article key={item.label}>
          {item.icon}
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function AviationContributionBars({ assessment }: { assessment: AviationRiskAssessment }) {
  return (
    <div className="contribution-list aviation-contribution-list">
      {assessment.contributions.map((item) => (
        <div className="contribution-row" key={item.factor}>
          <div className="contribution-row-head">
            <span>{item.factor}</span>
            <strong>{item.contribution} / {item.weight}</strong>
          </div>
          <div className="contribution-track">
            <span style={{ width: `${Math.min(100, (item.contribution / item.weight) * 100)}%` }} />
          </div>
          <p>{item.reason}</p>
        </div>
      ))}
    </div>
  );
}

function AviationRuleCards({ assessment }: { assessment: AviationRiskAssessment }) {
  return (
    <div className="rule-card-list">
      <p className="rule-summary">{assessment.summary}</p>
      {assessment.matchedRules.length ? (
        assessment.matchedRules.map((rule) => (
          <article className="rule-card" key={rule.name}>
            <strong>{rule.name}</strong>
            <p>{rule.result}</p>
          </article>
        ))
      ) : (
        <p className="rule-empty">현재 적용된 고위험 항공 규칙은 없습니다.</p>
      )}
    </div>
  );
}

function AviationZoneCardList({
  items,
  activeZoneId,
  onSelect,
}: {
  items: AviationAssessment[];
  activeZoneId: AviationZone["id"];
  onSelect: (zoneId: AviationZone["id"]) => void;
}) {
  return (
    <aside className="blade-zone-panel aviation-zone-panel" aria-label="항공 권역 선택 카드">
      <div className="windy-zone-tray">
        {items.map((item) => (
          <button
            type="button"
            key={item.zone.id}
            className={`windy-zone-chip ${aviationLevelClass(item.assessment.level)} ${item.zone.id === activeZoneId ? "active" : ""}`}
            onClick={() => onSelect(item.zone.id)}
            aria-pressed={item.zone.id === activeZoneId}
          >
            <span>
              {item.zone.label}
              <em>{item.zone.sector}</em>
            </span>
            <span className="zone-score">
              <strong>{item.assessment.score}</strong>
              <b>{item.assessment.level === "위험" ? "위험 경고" : item.assessment.level}</b>
            </span>
            <small>
              평균풍 {item.zone.data.averageWindSpeedMs}m/s · 시정 {item.zone.data.visibilityKm}km
            </small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function AviationMap({
  items,
  activeZoneId,
  windyOverlay,
  onWindyOverlayChange,
}: {
  items: AviationAssessment[];
  activeZoneId: AviationZone["id"];
  windyOverlay: WindyOverlay;
  onWindyOverlayChange: (overlay: WindyOverlay) => void;
}) {
  const activeItem = items.find((item) => item.zone.id === activeZoneId) || items[0];
  const mapUrl = windyAviationEmbedUrl(activeItem, windyOverlay);

  return (
    <section className="blade-map-card aviation-map-card" aria-label="항공 윈디 지도">
      <div className="blade-map-canvas">
        <iframe
          key={`aviation-windy-${activeItem.zone.id}-${activeItem.zone.center.join(",")}-${windyOverlay}`}
          className="windy-blade-map"
          title="윈디 항공 지도"
          src={mapUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="map-legend" aria-label="위험도 범례">
          <span><i className="legend-good" />양호</span>
          <span><i className="legend-watch" />주의</span>
          <span><i className="legend-danger" />위험</span>
        </div>
        <WindyOverlaySelector
          value={windyOverlay}
          options={weatherWindyOverlays}
          onChange={onWindyOverlayChange}
        />
      </div>
    </section>
  );
}

function AviationDashboardView({
  aviationZoneList,
  activeAviationZoneId,
  onSelectAviationZone,
  windyOverlay,
  onWindyOverlayChange,
}: {
  aviationZoneList: AviationZone[];
  activeAviationZoneId: AviationZone["id"];
  onSelectAviationZone: (zoneId: AviationZone["id"]) => void;
  windyOverlay: WindyOverlay;
  onWindyOverlayChange: (overlay: WindyOverlay) => void;
}) {
  const aviationAssessments = useMemo(
    () => aviationZoneList.map((zone) => ({ zone, assessment: calculateAviationRisk(zone.data) })),
    [aviationZoneList],
  );
  const activeItem =
    aviationAssessments.find((item) => item.zone.id === activeAviationZoneId) ||
    aviationAssessments[0];
  const levelColor = riskLevelColor(activeItem.assessment.level);

  return (
    <section className="land-view aviation-view" aria-label="항공 화면">
      <section className="land-workspace aviation-workspace">
        <div className="blade-map-column aviation-map-column">
          <AviationMap
            items={aviationAssessments}
            activeZoneId={activeItem.zone.id}
            windyOverlay={windyOverlay}
            onWindyOverlayChange={onWindyOverlayChange}
          />
          <AviationZoneCardList
            items={aviationAssessments}
            activeZoneId={activeItem.zone.id}
            onSelect={onSelectAviationZone}
          />
        </div>

        <aside className={`blade-decision-panel land-decision-panel aviation-decision-panel ${riskLevelClass(activeItem.assessment.level)}`} aria-label="항공 판단 근거">
          <div className="decision-panel-head">
            <div>
              <span>선택 공역 · {activeItem.zone.sector}</span>
              <h2>{activeItem.zone.name}</h2>
            </div>
            <div className="risk-gauge" style={{ background: `conic-gradient(${levelColor} ${activeItem.assessment.score * 3.6}deg, #e8eef7 0deg)` }}>
              <div>
                <strong>{activeItem.assessment.score}</strong>
                <span>{activeItem.assessment.level}</span>
              </div>
            </div>
          </div>

          <section className="decision-section">
            <div className="section-title">
              <Plane size={18} aria-hidden="true" />
              <h3>항공 핵심 지표</h3>
            </div>
            <AviationEnvironmentGrid data={activeItem.zone.data} />
          </section>

          <section className="decision-section">
            <div className="section-title">
              <Activity size={18} aria-hidden="true" />
              <h3>항목별 기여도</h3>
            </div>
            <AviationContributionBars assessment={activeItem.assessment} />
          </section>

          <section className="decision-section">
            <div className="section-title">
              <AlertTriangle size={18} aria-hidden="true" />
              <h3>항공 판단 근거</h3>
            </div>
            <AviationRuleCards assessment={activeItem.assessment} />
          </section>
        </aside>
      </section>
    </section>
  );
}

function AviationTableView({
  aviationZoneList,
  activeAviationZoneId,
  onSelectAviationZone,
}: {
  aviationZoneList: AviationZone[];
  activeAviationZoneId: AviationZone["id"];
  onSelectAviationZone: (zoneId: AviationZone["id"]) => void;
}) {
  const [activeGroup, setActiveGroup] = useState("all");
  const aviationDisplayGroups = useMemo(
    () => [
      { key: "all", label: "전체" },
      ...getAviationSettingsGroups(aviationZoneList).map((group) => ({
        key: group.key,
        label: group.label,
      })),
    ],
    [aviationZoneList],
  );
  const aviationAssessments = useMemo(
    () => aviationZoneList.map((zone) => ({ zone, assessment: calculateAviationRisk(zone.data) })),
    [aviationZoneList],
  );
  const filteredAssessments = useMemo(
    () => {
      const next = activeGroup === "all"
        ? aviationAssessments
        : aviationAssessments.filter((item) => aviationAdministrativeKey(item.zone) === activeGroup);

      return next.length ? next : aviationAssessments;
    },
    [activeGroup, aviationAssessments],
  );
  const activeItem =
    filteredAssessments.find((item) => item.zone.id === activeAviationZoneId) ||
    filteredAssessments[0] ||
    aviationAssessments[0];
  const cardItems = filteredAssessments.map((item) => ({
    id: item.zone.id,
    label: item.zone.label,
    name: item.zone.name,
    sector: item.zone.sector,
    score: item.assessment.score,
    level: item.assessment.level,
    metrics: aviationSituationMetrics(item.zone),
  }));

  return (
    <section className="land-view aviation-table-view" aria-label="항공 표 화면">
      <div className="land-table-shell">
        <div className="table-region-panel">
          <OperationalRegionCardGrid
            items={cardItems}
            activeId={activeItem.zone.id}
            ariaLabel="항공 지역별 카드"
            onSelect={onSelectAviationZone}
          />
          <LandGroupTabs groups={aviationDisplayGroups} activeGroup={activeGroup} onSelect={setActiveGroup} />
        </div>
        <OperationalHourlyStrip
          title="시간별 항공"
          subtitle={activeItem.zone.name}
          rows={aviationHourlyRows(activeItem.zone)}
        />
      </div>
    </section>
  );
}

function OperationModeScreen({
  onSelect,
}: {
  onSelect: (mode: OperationMode) => void;
}) {
  return (
    <main className="operation-mode-screen">
      <header className="operation-mode-header">
        <div>
          <span>작전환경 선택</span>
          <h1>{INTEGRATED_SYSTEM_NAME}</h1>
        </div>
        <Image
          className="operation-mode-mark"
          src={DIVISION_MARK_SRC}
          alt="제32보병사단"
          width={56}
          height={56}
          priority
        />
      </header>

      <section className="operation-mode-grid" aria-label="작전환경 선택">
        <button type="button" className="operation-mode-card coastal" onClick={() => onSelect("coastal")}>
          <Image
            className="mode-card-art"
            src={MODE_COASTAL_SRC}
            alt=""
            width={640}
            height={420}
            priority
          />
          <strong>{COASTAL_SYSTEM.label}</strong>
          <em>{COASTAL_SYSTEM.koreanName}</em>
        </button>
        <button type="button" className="operation-mode-card land" onClick={() => onSelect("land")}>
          <Image
            className="mode-card-art"
            src={MODE_LAND_SRC}
            alt=""
            width={640}
            height={420}
            priority
          />
          <strong>{LAND_SYSTEM.label}</strong>
          <em>{LAND_SYSTEM.koreanName}</em>
        </button>
        <button type="button" className="operation-mode-card air" onClick={() => onSelect("air")}>
          <Image
            className="mode-card-art"
            src={MODE_AIR_SRC}
            alt=""
            width={640}
            height={420}
            priority
          />
          <strong>{AIR_SYSTEM.label}</strong>
          <em>{AIR_SYSTEM.koreanName}</em>
        </button>
      </section>
      <div className="operation-mode-footer">선택</div>
    </main>
  );
}

function DashboardWorkspace({
  operationMode,
  onSwitchMode,
  onLogout,
}: {
  operationMode: OperationMode;
  onSwitchMode: (mode: OperationMode) => void;
  onLogout: () => void;
}) {
  const [activeView, setActiveView] = useState<DashboardView>(() =>
    operationMode === "land" ? "land" : operationMode === "air" ? "air" : "blade",
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<RegionKey>("seosan");
  const [activeZoneId, setActiveZoneId] = useState<CoastalZone["id"]>("seosan");
  const [activeLandZoneId, setActiveLandZoneId] = useState<LandZone["id"]>(landZones[0].id);
  const [activeAviationZoneId, setActiveAviationZoneId] = useState<AviationZone["id"]>(aviationZones[0].id);
  const [windyOverlays, setWindyOverlays] = useState<Record<OperationMode, WindyOverlay>>({
    coastal: "waves",
    land: "wind",
    air: "wind",
  });
  const [customRegionConfigs, setCustomRegionConfigs] = useState<CustomRegionConfig[]>(
    storedCustomRegionConfigs,
  );
  const [customLandZoneConfigs, setCustomLandZoneConfigs] = useState<CustomLandZoneConfig[]>(
    storedCustomLandZoneConfigs,
  );
  const [customAviationZoneConfigs, setCustomAviationZoneConfigs] = useState<CustomAviationZoneConfig[]>(
    storedCustomAviationZoneConfigs,
  );
  const customRegions = useMemo(
    () => customRegionConfigs.map((config) => customRegionToRegion(config)),
    [customRegionConfigs],
  );
  const allRegions = useMemo(() => [...systemRegions, ...customRegions], [customRegions]);
  const landZoneList = useMemo(
    () => [...landZones, ...customLandZoneConfigs.map((config) => customLandZoneToZone(config))],
    [customLandZoneConfigs],
  );
  const aviationZoneList = useMemo(
    () => [...aviationZones, ...customAviationZoneConfigs.map((config) => customAviationZoneToZone(config))],
    [customAviationZoneConfigs],
  );
  const [enabledLandZoneIds, setEnabledLandZoneIds] = useState<string[]>(() =>
    storedEnabledLandZoneIds([...landZones, ...storedCustomLandZoneConfigs().map((config) => customLandZoneToZone(config))]),
  );
  const [enabledAviationZoneIds, setEnabledAviationZoneIds] = useState<string[]>(() =>
    storedEnabledAviationZoneIds([
      ...aviationZones,
      ...storedCustomAviationZoneConfigs().map((config) => customAviationZoneToZone(config)),
    ]),
  );
  const [enabledRegionKeys, setEnabledRegionKeys] = useState<RegionKey[]>(() =>
    storedEnabledRegionKeys([...systemRegions, ...storedCustomRegionConfigs().map((config) => customRegionToRegion(config))]),
  );
  const [harborSelections, setHarborSelections] = useState<Record<RegionKey, string>>(
    () => storedHarborSelections([...systemRegions, ...storedCustomRegionConfigs().map((config) => customRegionToRegion(config))]),
  );
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [weatherByRegion, setWeatherByRegion] = useState<Record<RegionKey, WeatherNow>>(() =>
    Object.fromEntries(systemRegions.map((region) => [region.key, fallbackWeather(region)])) as Record<
      RegionKey,
      WeatherNow
    >,
  );
  const [hourlyByRegion, setHourlyByRegion] = useState<Record<RegionKey, HourlyWeather[]>>(() =>
    Object.fromEntries(systemRegions.map((region) => [region.key, fallbackHourly(region)])) as Record<
      RegionKey,
      HourlyWeather[]
    >,
  );
  const [tableRows, setTableRows] = useState<Record<RegionKey, MarineRow>>(() =>
    Object.fromEntries(systemRegions.map((region) => [region.key, region.fixed])) as Record<
      RegionKey,
      MarineRow
    >,
  );

  const visibleRegions = useMemo(() => {
    const enabledSet = new Set(enabledRegionKeys);
    const filtered = allRegions.filter((region) => enabledSet.has(region.key));
    return filtered.length ? filtered : allRegions.slice(0, 1);
  }, [allRegions, enabledRegionKeys]);

  const effectiveHarborSelections = useMemo(
    () => ({ ...defaultHarborSelections(allRegions), ...harborSelections }),
    [allRegions, harborSelections],
  );

  const displayRegions = useMemo(
    () =>
      visibleRegions
        .map((region) => resolveRegion(region, effectiveHarborSelections[region.key])),
    [effectiveHarborSelections, visibleRegions],
  );

  const settingsRegions = useMemo(
    () =>
      allRegions
        .map((region) => resolveRegion(region, effectiveHarborSelections[region.key])),
    [allRegions, effectiveHarborSelections],
  );

  const visibleLandZoneList = useMemo(() => {
    const enabledSet = new Set(enabledLandZoneIds);
    const filtered = landZoneList.filter((zone) => enabledSet.has(zone.id));
    return filtered.length ? filtered : landZoneList.slice(0, 1);
  }, [enabledLandZoneIds, landZoneList]);

  const visibleAviationZoneList = useMemo(() => {
    const enabledSet = new Set(enabledAviationZoneIds);
    const filtered = aviationZoneList.filter((zone) => enabledSet.has(zone.id));
    return filtered.length ? filtered : aviationZoneList.slice(0, 1);
  }, [aviationZoneList, enabledAviationZoneIds]);

  const effectiveActiveKey = useMemo(
    () => displayRegions.find((region) => region.key === activeKey)?.key || displayRegions[0]?.key || "seosan",
    [activeKey, displayRegions],
  );

  const activeRegion = useMemo(
    () => displayRegions.find((region) => region.key === effectiveActiveKey) || displayRegions[0],
    [effectiveActiveKey, displayRegions],
  );
  const visibleZones = useMemo(
    () => displayRegions.map((region) => regionToZone(region)),
    [displayRegions],
  );
  const zoneAssessments = useMemo(
    () => visibleZones.map((zone) => ({ zone, assessment: calculateRisk(zone.data) })),
    [visibleZones],
  );
  const effectiveActiveZoneId = useMemo(
    () =>
      zoneAssessments.find((item) => item.zone.id === activeZoneId)?.zone.id ||
      zoneAssessments[0]?.zone.id ||
      "seosan",
    [activeZoneId, zoneAssessments],
  );
  const activeZoneAssessment = useMemo(
    () =>
      zoneAssessments.find((item) => item.zone.id === effectiveActiveZoneId) ||
      zoneAssessments[0],
    [effectiveActiveZoneId, zoneAssessments],
  );
  const effectiveActiveLandZone = useMemo(
    () =>
      visibleLandZoneList.find((zone) => zone.id === activeLandZoneId) ||
      visibleLandZoneList[0] ||
      landZones[0],
    [activeLandZoneId, visibleLandZoneList],
  );
  const effectiveActiveAviationZone = useMemo(
    () =>
      visibleAviationZoneList.find((zone) => zone.id === activeAviationZoneId) ||
      visibleAviationZoneList[0] ||
      aviationZones[0],
    [activeAviationZoneId, visibleAviationZoneList],
  );
  const kmaMarineUrl = kmaMarineMapUrl();
  const kmaLandUrl = kmaWeatherMapUrl(
    effectiveActiveLandZone.center[0],
    effectiveActiveLandZone.center[1],
    effectiveActiveLandZone.regionGroup === "jeju" ? 8 : 9,
  );
  const kmaAirUrl = kmaWeatherMapUrl(effectiveActiveAviationZone.center[0], effectiveActiveAviationZone.center[1], 8);

  const handleHarborChange = useCallback((region: RegionKey, harborName: string) => {
    setHarborSelections((current) => {
      const next = { ...current, [region]: harborName };
      window.localStorage.setItem(HARBOR_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleToggleRegion = useCallback((region: RegionKey, enabled: boolean) => {
    setEnabledRegionKeys((current) => {
      const next = enabled
        ? Array.from(new Set([...current, region]))
        : current.filter((key) => key !== region);

      window.localStorage.setItem(REGION_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(REGION_VISIBILITY_VERSION_STORAGE_KEY, REGION_VISIBILITY_VERSION);
      return next;
    });
  }, []);

  const handleToggleLandZone = useCallback((zoneId: LandZone["id"], enabled: boolean) => {
    setEnabledLandZoneIds((current) => {
      const next = enabled
        ? Array.from(new Set([...current, zoneId]))
        : current.filter((id) => id !== zoneId);

      window.localStorage.setItem(LAND_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(LAND_ZONE_VISIBILITY_VERSION_STORAGE_KEY, LAND_ZONE_VISIBILITY_VERSION);
      return next;
    });
  }, []);

  const handleToggleLandZoneGroup = useCallback((zoneIds: LandZone["id"][], enabled: boolean) => {
    setEnabledLandZoneIds((current) => {
      const next = enabled
        ? Array.from(new Set([...current, ...zoneIds]))
        : current.filter((id) => !zoneIds.includes(id));

      window.localStorage.setItem(LAND_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(LAND_ZONE_VISIBILITY_VERSION_STORAGE_KEY, LAND_ZONE_VISIBILITY_VERSION);
      return next;
    });
  }, []);

  const handleSetLandZoneSelectionMode = useCallback((mode: LandZoneSelectionMode) => {
    setEnabledLandZoneIds(() => {
      const next = mode === "all"
        ? landZoneList.map((zone) => zone.id)
        : defaultEnabledLandZoneIds(landZoneList);

      window.localStorage.setItem(LAND_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(LAND_ZONE_VISIBILITY_VERSION_STORAGE_KEY, LAND_ZONE_VISIBILITY_VERSION);
      return next;
    });
  }, [landZoneList]);

  const handleToggleAviationZone = useCallback((zoneId: AviationZone["id"], enabled: boolean) => {
    setEnabledAviationZoneIds((current) => {
      const next = enabled
        ? Array.from(new Set([...current, zoneId]))
        : current.filter((id) => id !== zoneId);

      window.localStorage.setItem(AVIATION_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(AVIATION_ZONE_VISIBILITY_VERSION_STORAGE_KEY, AVIATION_ZONE_VISIBILITY_VERSION);
      return next;
    });
  }, []);

  const handleResetAllSettings = useCallback(() => {
    const defaultHarbors = defaultHarborSelections(systemRegions);

    [
      CUSTOM_REGIONS_STORAGE_KEY,
      CUSTOM_LAND_ZONES_STORAGE_KEY,
      CUSTOM_AVIATION_ZONES_STORAGE_KEY,
      HARBOR_STORAGE_KEY,
    ].forEach((key) => window.localStorage.removeItem(key));

    window.localStorage.setItem(REGION_VISIBILITY_STORAGE_KEY, JSON.stringify([]));
    window.localStorage.setItem(LAND_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify([]));
    window.localStorage.setItem(AVIATION_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify([]));
    window.localStorage.setItem(REGION_VISIBILITY_VERSION_STORAGE_KEY, REGION_VISIBILITY_VERSION);
    window.localStorage.setItem(LAND_ZONE_VISIBILITY_VERSION_STORAGE_KEY, LAND_ZONE_VISIBILITY_VERSION);
    window.localStorage.setItem(AVIATION_ZONE_VISIBILITY_VERSION_STORAGE_KEY, AVIATION_ZONE_VISIBILITY_VERSION);

    setCustomRegionConfigs([]);
    setCustomLandZoneConfigs([]);
    setCustomAviationZoneConfigs([]);
    setEnabledRegionKeys([]);
    setEnabledLandZoneIds([]);
    setEnabledAviationZoneIds([]);
    setHarborSelections(defaultHarbors);
    setActiveKey(systemRegions[0].key);
    setActiveZoneId(zones[0].id);
    setActiveLandZoneId(landZones[0].id);
    setActiveAviationZoneId(aviationZones[0].id);
    setWeatherByRegion(Object.fromEntries(systemRegions.map((region) => [region.key, fallbackWeather(region)])) as Record<RegionKey, WeatherNow>);
    setHourlyByRegion(Object.fromEntries(systemRegions.map((region) => [region.key, fallbackHourly(region)])) as Record<RegionKey, HourlyWeather[]>);
    setTableRows(Object.fromEntries(systemRegions.map((region) => [region.key, region.fixed])) as Record<RegionKey, MarineRow>);
  }, []);

	  const handleRemoveRegion = useCallback((region: RegionKey) => {
    setCustomRegionConfigs((current) => {
      const next = current.filter((item) => item.key !== region);
      window.localStorage.setItem(CUSTOM_REGIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setEnabledRegionKeys((current) => {
      const next = current.filter((key) => key !== region);
      window.localStorage.setItem(REGION_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setHarborSelections((current) => {
      const next = { ...current };
      delete next[region];
      window.localStorage.setItem(HARBOR_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
	  }, []);

  const handleRemoveLandZone = useCallback((zoneId: LandZone["id"]) => {
    setCustomLandZoneConfigs((current) => {
      const next = current.filter((item) => item.id !== zoneId);
      window.localStorage.setItem(CUSTOM_LAND_ZONES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setEnabledLandZoneIds((current) => {
      const next = current.filter((id) => id !== zoneId);
      window.localStorage.setItem(LAND_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveLandZoneId((current) => (current === zoneId ? landZones[0].id : current));
  }, []);

  const handleRemoveAviationZone = useCallback((zoneId: AviationZone["id"]) => {
    setCustomAviationZoneConfigs((current) => {
      const next = current.filter((item) => item.id !== zoneId);
      window.localStorage.setItem(CUSTOM_AVIATION_ZONES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setEnabledAviationZoneIds((current) => {
      const next = current.filter((id) => id !== zoneId);
      const safeNext = next.length ? next : aviationZones.slice(0, 1).map((zone) => zone.id);
      window.localStorage.setItem(AVIATION_ZONE_VISIBILITY_STORAGE_KEY, JSON.stringify(safeNext));
      window.localStorage.setItem(AVIATION_ZONE_VISIBILITY_VERSION_STORAGE_KEY, AVIATION_ZONE_VISIBILITY_VERSION);
      return safeNext;
    });
    setActiveAviationZoneId((current) => (current === zoneId ? aviationZones[0].id : current));
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
    const isMarineDataView = ["marine", "marineMonthly", "marineAccess"].includes(activeView);

    if (operationMode !== "coastal" || !isMarineDataView) {
      return undefined;
    }

    const initialTimer = window.setTimeout(() => void refreshData(), 0);
    const timer = window.setInterval(() => void refreshData(), 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [activeView, operationMode, refreshData]);

  const tableReferenceTime = formatTableReferenceTime(updatedAt);
  const handleManualRefresh = useCallback(() => {
    const isMarineDataView = ["marine", "marineMonthly", "marineAccess"].includes(activeView);

    if (operationMode !== "coastal" || !isMarineDataView) {
      setUpdatedAt(new Date());
      return;
    }

    void refreshData();
  }, [activeView, operationMode, refreshData]);
  const handleWindyOverlayChange = useCallback((overlay: WindyOverlay) => {
    setWindyOverlays((current) => ({
      ...current,
      [operationMode]: overlay,
    }));
  }, [operationMode]);

  return (
    <main className={`dashboard-screen view-${activeView}`}>
      <header className="dashboard-header">
        <button
          type="button"
          className="menu-toggle-button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? "사이드 메뉴 닫기" : "사이드 메뉴 열기"}
          aria-expanded={menuOpen}
        >
          <Menu size={24} aria-hidden="true" />
        </button>
        <div className="dashboard-title">
          <h1>
            <b>{INTEGRATED_SYSTEM_NAME}</b>
          </h1>
        </div>
        <Image
          className="header-division-mark"
          src={DIVISION_MARK_SRC}
          alt="제32보병사단"
          width={52}
          height={52}
          priority
        />
      </header>

      <section className={`dashboard-shell ${menuOpen ? "menu-open" : ""}`}>
        <nav className="side-menu" aria-label="대시보드 화면 전환">
          <details className="side-menu-section mode-switch-section" open>
            <summary>작전 선택</summary>
            <button
              type="button"
              className={`mode-switch-card ${operationMode === "coastal" ? "active" : ""}`}
              onClick={() => {
                if (operationMode === "coastal") {
                  setActiveView("blade");
                  setMenuOpen(false);
                } else {
                  onSwitchMode("coastal");
                }
              }}
              aria-pressed={operationMode === "coastal"}
            >
              <Waves size={24} aria-hidden="true" />
              <span>해상</span>
              <strong>상황판</strong>
            </button>
            <button
              type="button"
              className={`mode-switch-card ${operationMode === "land" ? "active" : ""}`}
              onClick={() => {
                if (operationMode === "land") {
                  setActiveView("land");
                  setMenuOpen(false);
                } else {
                  onSwitchMode("land");
                }
              }}
              aria-pressed={operationMode === "land"}
            >
              <Flame size={24} aria-hidden="true" />
              <span>육상</span>
              <strong>상황판</strong>
            </button>
            <button
              type="button"
              className={`mode-switch-card ${operationMode === "air" ? "active" : ""}`}
              onClick={() => {
                if (operationMode === "air") {
                  setActiveView("air");
                  setMenuOpen(false);
                } else {
                  onSwitchMode("air");
                }
              }}
              aria-pressed={operationMode === "air"}
            >
              <Plane size={24} aria-hidden="true" />
              <span>항공</span>
              <strong>상황판</strong>
            </button>
          </details>

          <details className="side-menu-section" open>
            <summary>상황판</summary>
            {operationMode === "coastal" ? (
              <Fragment>
                <button
                  type="button"
                  className={activeView === "blade" ? "active" : undefined}
                  onClick={() => {
                    setActiveView("blade");
                    setMenuOpen(false);
                  }}
                  aria-pressed={activeView === "blade"}
                >
                  <Radar size={22} aria-hidden="true" />
                  <span>판단지원</span>
                  <strong>위험도</strong>
                </button>
                <button
                  type="button"
                  className={activeView === "marine" ? "active" : undefined}
                  onClick={() => {
                    setActiveView("marine");
                    setMenuOpen(false);
                  }}
                  aria-pressed={activeView === "marine"}
                >
                  <Waves size={22} aria-hidden="true" />
                  <span>해양상황</span>
                  <strong>표·시간별</strong>
                </button>
                <button
                  type="button"
                  className={activeView === "marineMonthly" ? "active" : undefined}
                  onClick={() => {
                    setActiveView("marineMonthly");
                    setMenuOpen(false);
                  }}
                  aria-pressed={activeView === "marineMonthly"}
                >
                  <Activity size={22} aria-hidden="true" />
                  <span>월간분석표</span>
                  <strong>일출·물때</strong>
                </button>
                <button
                  type="button"
                  className={activeView === "marineAccess" ? "active" : undefined}
                  onClick={() => {
                    setActiveView("marineAccess");
                    setMenuOpen(false);
                  }}
                  aria-pressed={activeView === "marineAccess"}
                >
                  <ShieldCheck size={22} aria-hidden="true" />
                  <span>접근판단표</span>
                  <strong>출항·접안</strong>
                </button>
              </Fragment>
            ) : operationMode === "land" ? (
              <Fragment>
                <button
                  type="button"
                  className={activeView === "land" ? "active" : undefined}
                  onClick={() => {
                    setActiveView("land");
                    setMenuOpen(false);
                  }}
                  aria-pressed={activeView === "land"}
                >
                  <MapPinned size={22} aria-hidden="true" />
                  <span>지도 상황판</span>
                  <strong>위험도</strong>
                </button>
                <button
                  type="button"
                  className={activeView === "landTable" ? "active" : undefined}
                  onClick={() => {
                    setActiveView("landTable");
                    setMenuOpen(false);
                  }}
                  aria-pressed={activeView === "landTable"}
                >
                  <Activity size={22} aria-hidden="true" />
                  <span>표 상황판</span>
                  <strong>시군구</strong>
                </button>
              </Fragment>
            ) : (
              <Fragment>
                <button
                  type="button"
                  className={activeView === "air" ? "active" : undefined}
                  onClick={() => {
                    setActiveView("air");
                    setMenuOpen(false);
                  }}
                  aria-pressed={activeView === "air"}
                >
                  <Plane size={22} aria-hidden="true" />
                  <span>지도 상황판</span>
                  <strong>위험도</strong>
                </button>
                <button
                  type="button"
                  className={activeView === "airTable" ? "active" : undefined}
                  onClick={() => {
                    setActiveView("airTable");
                    setMenuOpen(false);
                  }}
                  aria-pressed={activeView === "airTable"}
                >
                  <Activity size={22} aria-hidden="true" />
                  <span>항공상황</span>
                  <strong>표·시간별</strong>
                </button>
              </Fragment>
            )}
          </details>

          <details className="side-menu-section side-menu-help-section">
            <summary>앱 운용방법</summary>
            <div className="side-menu-help-banner">
              <strong>{INTEGRATED_SYSTEM_NAME}</strong>
              <span>지도·카드 기반 상황판</span>
            </div>
            <ol className="side-menu-help-list">
              <li>작전 선택에서 해상·육상·항공 화면을 전환합니다.</li>
              <li>지도 아래 카드를 누르면 해당 지점으로 윈디 지도가 이동합니다.</li>
              <li>설정에서 표시할 지역만 체크해 상황판을 단순화합니다.</li>
              <li>해상은 시정·파고·풍속·시간대·조석·조류 등을 가중합해 위험도를 계산합니다.</li>
              <li>육상은 인원 부담도, 시야 제한도, 이동 제한도, 환경 위험도 4개 축을 합산합니다.</li>
              <li>항공은 평균풍·돌풍·시정·운고·낙뢰 등 항공 지표를 합산합니다.</li>
            </ol>
          </details>

          <details className="side-menu-section" open>
            <summary>도구</summary>
            <details className="side-menu-nested">
              <summary>해상 기상청 지도</summary>
              <div className="side-menu-link-stack">
                <a className="side-menu-map-link" href={kmaMarineUrl} target="_blank" rel="noreferrer">
                  <Waves size={19} aria-hidden="true" />
                  <span>해상</span>
                  <strong>해양기상</strong>
                </a>
              </div>
            </details>
            <details className="side-menu-nested">
              <summary>육상 기상청 지도</summary>
              <div className="side-menu-link-stack">
                <a className="side-menu-map-link" href={kmaLandUrl} target="_blank" rel="noreferrer">
                  <MapPinned size={19} aria-hidden="true" />
                  <span>육상</span>
                  <strong>날씨누리</strong>
                </a>
              </div>
            </details>
            <details className="side-menu-nested">
              <summary>공중 기상청 지도</summary>
              <div className="side-menu-link-stack">
                <a className="side-menu-map-link" href={kmaAirUrl} target="_blank" rel="noreferrer">
                  <Plane size={19} aria-hidden="true" />
                  <span>공중</span>
                  <strong>관측권역</strong>
                </a>
              </div>
            </details>
            <button
              type="button"
              className={activeView === "settings" ? "active" : undefined}
              onClick={() => {
                setActiveView("settings");
                setMenuOpen(false);
              }}
              aria-pressed={activeView === "settings"}
            >
              <Settings size={22} aria-hidden="true" />
              <span>설정</span>
              <strong>지역·계정</strong>
            </button>
            <button type="button" onClick={handleManualRefresh}>
              <RefreshCcw size={22} aria-hidden="true" />
              <span>갱신</span>
              <strong>{loading ? "수신 중" : "수동"}</strong>
            </button>
            <button type="button" onClick={() => window.print()}>
              <Printer size={22} aria-hidden="true" />
              <span>인쇄</span>
              <strong>PDF</strong>
            </button>
            <button type="button" onClick={onLogout}>
              <LogOut size={22} aria-hidden="true" />
              <span>로그아웃</span>
              <strong>종료</strong>
            </button>
          </details>
        </nav>

        <div className="screen-stage">
          {activeView === "settings" ? (
            <SettingsPanel
              open
              embedded
              regions={settingsRegions}
              enabledRegionKeys={enabledRegionKeys}
	              harborSelections={effectiveHarborSelections}
	              customRegionKeys={customRegionConfigs.map((region) => region.key)}
	              landZoneList={landZoneList}
	              enabledLandZoneIds={enabledLandZoneIds}
	              customLandZoneKeys={customLandZoneConfigs.map((zone) => zone.id)}
	              aviationZoneList={aviationZoneList}
	              enabledAviationZoneIds={enabledAviationZoneIds}
	              customAviationZoneKeys={customAviationZoneConfigs.map((zone) => zone.id)}
	              initialTab={operationMode === "land" ? "land" : operationMode === "air" ? "air" : "marine"}
	              onClose={() => setActiveView(operationMode === "land" ? "land" : operationMode === "air" ? "air" : "blade")}
	              onToggleRegion={handleToggleRegion}
	              onToggleLandZone={handleToggleLandZone}
	              onToggleLandZoneGroup={handleToggleLandZoneGroup}
	              onSetLandZoneSelectionMode={handleSetLandZoneSelectionMode}
	              onToggleAviationZone={handleToggleAviationZone}
	              onRemoveRegion={handleRemoveRegion}
	              onRemoveLandZone={handleRemoveLandZone}
	              onRemoveAviationZone={handleRemoveAviationZone}
	              onHarborChange={handleHarborChange}
	              onResetAllSettings={handleResetAllSettings}
	            />
          ) : activeView === "air" ? (
            <AviationDashboardView
              aviationZoneList={visibleAviationZoneList}
              activeAviationZoneId={activeAviationZoneId}
              onSelectAviationZone={setActiveAviationZoneId}
              windyOverlay={windyOverlays.air}
              onWindyOverlayChange={handleWindyOverlayChange}
            />
          ) : activeView === "airTable" ? (
            <AviationTableView
              aviationZoneList={visibleAviationZoneList}
              activeAviationZoneId={activeAviationZoneId}
              onSelectAviationZone={setActiveAviationZoneId}
            />
          ) : activeView === "land" ? (
	            <LandDashboardView
	              landZoneList={visibleLandZoneList}
	              activeLandZoneId={activeLandZoneId}
	              onSelectLandZone={setActiveLandZoneId}
	              windyOverlay={windyOverlays.land}
	              onWindyOverlayChange={handleWindyOverlayChange}
	            />
	          ) : activeView === "landTable" ? (
	            <LandTableView
	              landZoneList={visibleLandZoneList}
	              activeLandZoneId={activeLandZoneId}
	              onSelectLandZone={setActiveLandZoneId}
	            />
          ) : activeView === "marine" ? (
            <MarineDashboardView
              displayRegions={displayRegions}
              activeKey={effectiveActiveKey}
              activeRegion={activeRegion}
              weatherByRegion={weatherByRegion}
              hourlyByRegion={hourlyByRegion}
              tableRows={tableRows}
              tableReferenceTime={tableReferenceTime}
              onSelectRegion={setActiveKey}
            />
          ) : activeView === "marineMonthly" ? (
            <MarineMonthlyAnalysisView
              regions={displayRegions}
              weatherByRegion={weatherByRegion}
              tableRows={tableRows}
              tableReferenceTime={tableReferenceTime}
              onOpenSettings={() => setActiveView("settings")}
            />
          ) : activeView === "marineAccess" ? (
            <MarineAccessAssessmentView
              regions={displayRegions}
              weatherByRegion={weatherByRegion}
              tableRows={tableRows}
              tableReferenceTime={tableReferenceTime}
              onOpenSettings={() => setActiveView("settings")}
            />
          ) : (
            <BladeDashboardView
              zoneAssessments={zoneAssessments}
              activeZoneId={effectiveActiveZoneId}
              activeZoneAssessment={activeZoneAssessment}
              onSelectZone={setActiveZoneId}
              windyOverlay={windyOverlays.coastal}
              onWindyOverlayChange={handleWindyOverlayChange}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function DashboardScreen({ onLogout }: { onLogout: () => void }) {
  const [operationMode, setOperationMode] = useState<OperationMode | null>(null);

  if (!operationMode) {
    return (
      <OperationModeScreen
        onSelect={setOperationMode}
      />
    );
  }

  return (
    <DashboardWorkspace
      key={operationMode}
      operationMode={operationMode}
      onSwitchMode={setOperationMode}
      onLogout={onLogout}
    />
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
