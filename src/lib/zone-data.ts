export type RiskLevel = "양호" | "주의" | "위험";

export type TimeBand = "night" | "evening" | "dawn" | "day";
export type SeaAreaType = "coast" | "nearshore" | "offshore";

export type ZoneEnvironmentData = {
  waveHeightM: number;
  windSpeedMs: number;
  visibilityKm: number;
  tideStatus: "만조 전후" | "만조 접근" | "중간" | "간조 전후";
  currentStatus: "접근 유리" | "보통" | "접근 불리";
  timeBand: TimeBand;
  weatherStatus: "안개" | "비" | "눈" | "폭우" | "악천후" | "흐림" | "맑음";
  temperatureC: number;
  pmLevel: "매우나쁨" | "나쁨" | "보통" | "좋음";
  fireRiskLevel: "매우높음" | "높음" | "보통" | "낮음";
  fogLevel: "심함" | "발생" | "의심" | "없음";
  cctvVisibility: "불량" | "제한" | "보통" | "양호";
};

export type CoastalZone = {
  id: string;
  label: string;
  name: string;
  seaArea: SeaAreaType;
  center: readonly [number, number];
  data: ZoneEnvironmentData;
};

export const zones: CoastalZone[] = [
  {
    id: "seosan",
    label: "서산",
    name: "서산 권역 · 대산 연안",
    seaArea: "nearshore",
    center: [37.005, 126.352],
    data: {
      waveHeightM: 0.45,
      windSpeedMs: 4.6,
      visibilityKm: 3.0,
      tideStatus: "만조 접근",
      currentStatus: "접근 유리",
      timeBand: "night",
      weatherStatus: "흐림",
      temperatureC: 15,
      pmLevel: "보통",
      fireRiskLevel: "낮음",
      fogLevel: "발생",
      cctvVisibility: "제한",
    },
  },
  {
    id: "dangjin",
    label: "당진",
    name: "당진 권역 · 장고항 일대",
    seaArea: "nearshore",
    center: [36.96, 126.84],
    data: {
      waveHeightM: 0.7,
      windSpeedMs: 5.8,
      visibilityKm: 5.6,
      tideStatus: "중간",
      currentStatus: "보통",
      timeBand: "evening",
      weatherStatus: "맑음",
      temperatureC: 16,
      pmLevel: "나쁨",
      fireRiskLevel: "보통",
      fogLevel: "의심",
      cctvVisibility: "보통",
    },
  },
  {
    id: "taean",
    label: "태안",
    name: "태안 권역 · 안흥항 일대",
    seaArea: "nearshore",
    center: [36.75, 126.29],
    data: {
      waveHeightM: 1.4,
      windSpeedMs: 8.4,
      visibilityKm: 9.2,
      tideStatus: "간조 전후",
      currentStatus: "접근 불리",
      timeBand: "day",
      weatherStatus: "맑음",
      temperatureC: 17,
      pmLevel: "좋음",
      fireRiskLevel: "낮음",
      fogLevel: "없음",
      cctvVisibility: "양호",
    },
  },
  {
    id: "boryeong",
    label: "보령",
    name: "보령 권역 · 대천항 일대",
    seaArea: "nearshore",
    center: [36.33, 126.61],
    data: {
      waveHeightM: 0.85,
      windSpeedMs: 5.2,
      visibilityKm: 5.5,
      tideStatus: "중간",
      currentStatus: "보통",
      timeBand: "dawn",
      weatherStatus: "흐림",
      temperatureC: 16,
      pmLevel: "나쁨",
      fireRiskLevel: "보통",
      fogLevel: "의심",
      cctvVisibility: "보통",
    },
  },
  {
    id: "seosan-offshore",
    label: "서산",
    name: "서산 권역 · 원해 관측",
    seaArea: "offshore",
    center: [37.08, 125.82],
    data: {
      waveHeightM: 1.6,
      windSpeedMs: 8.8,
      visibilityKm: 8.4,
      tideStatus: "중간",
      currentStatus: "보통",
      timeBand: "evening",
      weatherStatus: "흐림",
      temperatureC: 14,
      pmLevel: "보통",
      fireRiskLevel: "낮음",
      fogLevel: "없음",
      cctvVisibility: "보통",
    },
  },
  {
    id: "dangjin-offshore",
    label: "당진",
    name: "당진 권역 · 원해 관측",
    seaArea: "offshore",
    center: [37.0, 126.18],
    data: {
      waveHeightM: 1.4,
      windSpeedMs: 7.4,
      visibilityKm: 7.2,
      tideStatus: "중간",
      currentStatus: "보통",
      timeBand: "evening",
      weatherStatus: "맑음",
      temperatureC: 15,
      pmLevel: "나쁨",
      fireRiskLevel: "보통",
      fogLevel: "의심",
      cctvVisibility: "보통",
    },
  },
  {
    id: "taean-offshore",
    label: "태안",
    name: "태안 권역 · 원해 관측",
    seaArea: "offshore",
    center: [36.72, 125.66],
    data: {
      waveHeightM: 2.1,
      windSpeedMs: 12.4,
      visibilityKm: 10.5,
      tideStatus: "간조 전후",
      currentStatus: "접근 불리",
      timeBand: "day",
      weatherStatus: "맑음",
      temperatureC: 16,
      pmLevel: "좋음",
      fireRiskLevel: "낮음",
      fogLevel: "없음",
      cctvVisibility: "양호",
    },
  },
  {
    id: "boryeong-offshore",
    label: "보령",
    name: "보령 권역 · 원해 관측",
    seaArea: "offshore",
    center: [36.2, 126.0],
    data: {
      waveHeightM: 1.7,
      windSpeedMs: 9.2,
      visibilityKm: 7.8,
      tideStatus: "중간",
      currentStatus: "보통",
      timeBand: "dawn",
      weatherStatus: "흐림",
      temperatureC: 15,
      pmLevel: "보통",
      fireRiskLevel: "보통",
      fogLevel: "의심",
      cctvVisibility: "보통",
    },
  },
];
