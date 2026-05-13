import type { AviationZoneData } from "@/lib/aviation-zone-data";
import type { LandZoneData } from "@/lib/ground-risk";
import type { ZoneEnvironmentData } from "@/lib/zone-data";

export type OperationType = "coastal" | "ground" | "air";

export type CoastalData = {
  temperatureC: number;
  weatherAlert: string;
  precipitationProbability: number;
  precipitationMm: number;
  humidityPercent: number;
  windDirection: string;
  windSpeedMs: number;
  sunrise: string;
  sunset: string;
  bmnt: string;
  eent: string;
  moonrise: string;
  moonset: string;
  moonlightPercent: number;
  lowTide: string;
  highTide: string;
  tideAge: string;
  tideRangeM: number;
  waveHeightM: number;
  nearshoreWaveHeightM: number;
  offshoreWaveHeightM: number;
  waveDirection: string;
  wavePeriodSec: number;
  waterTempC: number;
  currentDirection: string;
  currentSpeedKt: number;
  surfaceWindMs: number;
  upperWindSpeedMs: number;
  upperWindDirection: string;
  visibilityKm: number;
  currentTime: string;
};

export type GroundData = {
  temperatureC: number;
  precipitationProbability: number;
  precipitationMm: number;
  humidityPercent: number;
  windSpeedMs: number;
  windDirection: string;
  visibilityKm: number;
  cloudCoverPercent: number;
  fog: "없음" | "의심" | "발생" | "심함";
  terrain: "산악" | "도심" | "평야" | "해안 인접";
  sunrise: string;
  sunset: string;
  bmnt: string;
  eent: string;
  apparentTemperatureC: number;
  wbgtC: number;
  surfaceWindMs: number;
  upperWindSpeedMs: number;
  upperWindDirection: string;
  currentTime: string;
};

export type AirAltitudeLayer = {
  label: string;
  windSpeedMs: number;
  windDirection: string;
  temperatureC: number;
  turbulence: "없음" | "약" | "중" | "강";
};

export type AirData = {
  temperatureC: number;
  precipitationProbability: number;
  precipitationMm: number;
  windSpeedMs: number;
  windDirection: string;
  gustSpeedMs: number;
  cloudCeilingFt: number;
  visibilityKm: number;
  turbulenceRisk: "없음" | "약" | "중" | "강";
  pressureHpa: number;
  humidityPercent: number;
  dewPointC: number;
  altitudeLayers: AirAltitudeLayer[];
};

export type TheOneOperation = {
  id: string;
  type: OperationType;
  name: string;
  area: string;
  datetime: string;
  imageTone: "blue" | "red" | "green" | "cyan";
  center?: [number, number];
  coastal?: CoastalData;
  coastalEnvironment?: ZoneEnvironmentData;
  ground?: GroundData;
  groundEnvironment?: LandZoneData;
  air?: AirData;
  aviationEnvironment?: AviationZoneData;
};
