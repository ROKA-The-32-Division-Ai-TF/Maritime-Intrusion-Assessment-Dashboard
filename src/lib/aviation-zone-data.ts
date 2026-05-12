export type AviationRiskLevel = "양호" | "주의" | "위험";
export type AviationRegionGroupKey = "capital" | "gangwon" | "chungcheong" | "honam" | "yeongnam" | "jeju";
export type AviationStationKind = "airport" | "airfield" | "corridor" | "weatherStation";

export type AviationZoneData = {
  averageWindSpeedMs: number;
  gustSpeedMs: number;
  windDirection: string;
  returnWindStatus: "복귀 유리" | "측풍 주의" | "복귀풍 불리";
  precipitationMm: number;
  snowfallCm: number;
  visibilityKm: number;
  fogLevel: "없음" | "의심" | "발생" | "심함";
  temperatureC: number;
  humidityPercent: number;
  dewPointC: number;
  lightningRisk: "없음" | "낮음" | "주의" | "가능" | "발생";
  thunderstormRisk: "없음" | "낮음" | "주의" | "가능" | "발생";
  cloudCeilingFt: number;
  cloudAmountOctas: number;
  weatherStatus: "맑음" | "흐림" | "비" | "눈" | "안개" | "뇌우";
};

export type AviationZone = {
  id: string;
  label: string;
  name: string;
  sector: string;
  regionGroup?: AviationRegionGroupKey;
  stationKind?: AviationStationKind;
  center: [number, number];
  radius: number;
  data: AviationZoneData;
};

const priorityAviationZones: AviationZone[] = [
  {
    id: "A-A",
    label: "서해-1",
    name: "A권역 · 서해 연안 공역",
    sector: "서해안 · 저고도 감시",
    regionGroup: "chungcheong",
    stationKind: "corridor",
    center: [36.78, 126.45],
    radius: 1800,
    data: {
      averageWindSpeedMs: 9.6,
      gustSpeedMs: 17.8,
      windDirection: "서남서",
      returnWindStatus: "측풍 주의",
      precipitationMm: 8,
      snowfallCm: 0,
      visibilityKm: 2.4,
      fogLevel: "발생",
      temperatureC: 31,
      humidityPercent: 86,
      dewPointC: 28,
      lightningRisk: "주의",
      thunderstormRisk: "가능",
      cloudCeilingFt: 700,
      cloudAmountOctas: 7,
      weatherStatus: "비",
    },
  },
  {
    id: "A-B",
    label: "내륙-1",
    name: "B권역 · 내륙 회랑",
    sector: "충남 내륙 · 중고도 경로",
    regionGroup: "chungcheong",
    stationKind: "corridor",
    center: [36.62, 127.12],
    radius: 1600,
    data: {
      averageWindSpeedMs: 6.4,
      gustSpeedMs: 11.8,
      windDirection: "북서",
      returnWindStatus: "측풍 주의",
      precipitationMm: 1.5,
      snowfallCm: 0,
      visibilityKm: 5.2,
      fogLevel: "의심",
      temperatureC: 25,
      humidityPercent: 72,
      dewPointC: 20,
      lightningRisk: "낮음",
      thunderstormRisk: "주의",
      cloudCeilingFt: 1600,
      cloudAmountOctas: 5,
      weatherStatus: "흐림",
    },
  },
  {
    id: "A-C",
    label: "도심-1",
    name: "C권역 · 도심 관측권",
    sector: "도심 · 영상촬영",
    regionGroup: "chungcheong",
    stationKind: "weatherStation",
    center: [36.35, 127.38],
    radius: 1400,
    data: {
      averageWindSpeedMs: 2.8,
      gustSpeedMs: 5.4,
      windDirection: "남",
      returnWindStatus: "복귀 유리",
      precipitationMm: 0,
      snowfallCm: 0,
      visibilityKm: 10,
      fogLevel: "없음",
      temperatureC: 21,
      humidityPercent: 48,
      dewPointC: 10,
      lightningRisk: "없음",
      thunderstormRisk: "없음",
      cloudCeilingFt: 4200,
      cloudAmountOctas: 2,
      weatherStatus: "맑음",
    },
  },
  {
    id: "A-D",
    label: "산악-1",
    name: "D권역 · 산악 난류권",
    sector: "산악 · 난류 가능",
    regionGroup: "gangwon",
    stationKind: "corridor",
    center: [36.95, 127.68],
    radius: 1700,
    data: {
      averageWindSpeedMs: 12.2,
      gustSpeedMs: 20.5,
      windDirection: "북동",
      returnWindStatus: "복귀풍 불리",
      precipitationMm: 0.4,
      snowfallCm: 0,
      visibilityKm: 6.5,
      fogLevel: "의심",
      temperatureC: -3,
      humidityPercent: 64,
      dewPointC: -7,
      lightningRisk: "낮음",
      thunderstormRisk: "낮음",
      cloudCeilingFt: 1200,
      cloudAmountOctas: 6,
      weatherStatus: "흐림",
    },
  },
];

type AviationCatalogSeed = {
  id: string;
  label: string;
  name: string;
  sector: string;
  regionGroup: AviationRegionGroupKey;
  stationKind: AviationStationKind;
  center: [number, number];
  wind: number;
  gust: number;
  visibility: number;
  ceiling: number;
  weatherStatus?: AviationZoneData["weatherStatus"];
  fogLevel?: AviationZoneData["fogLevel"];
  lightningRisk?: AviationZoneData["lightningRisk"];
};

function aviationCatalogData(seed: AviationCatalogSeed): AviationZoneData {
  const harshWind = seed.gust >= 16;
  const humid = seed.fogLevel && seed.fogLevel !== "없음";

  return {
    averageWindSpeedMs: seed.wind,
    gustSpeedMs: seed.gust,
    windDirection: seed.wind >= 8 ? "서북서" : "남서",
    returnWindStatus: seed.wind >= 9 ? "복귀풍 불리" : seed.wind >= 6 ? "측풍 주의" : "복귀 유리",
    precipitationMm: seed.weatherStatus === "비" ? 4 : seed.weatherStatus === "눈" ? 1 : 0,
    snowfallCm: seed.weatherStatus === "눈" ? 3 : 0,
    visibilityKm: seed.visibility,
    fogLevel: seed.fogLevel || (seed.visibility <= 4 ? "의심" : "없음"),
    temperatureC: seed.regionGroup === "gangwon" ? 14 : seed.regionGroup === "jeju" ? 24 : 22,
    humidityPercent: humid ? 82 : 58,
    dewPointC: humid ? 19 : 12,
    lightningRisk: seed.lightningRisk || (seed.weatherStatus === "뇌우" ? "발생" : harshWind ? "주의" : "낮음"),
    thunderstormRisk: seed.weatherStatus === "뇌우" ? "발생" : harshWind ? "주의" : "낮음",
    cloudCeilingFt: seed.ceiling,
    cloudAmountOctas: seed.ceiling <= 1000 ? 7 : seed.ceiling <= 1800 ? 5 : 3,
    weatherStatus: seed.weatherStatus || (seed.visibility <= 3 ? "안개" : "맑음"),
  };
}

const nationalAviationCatalogSeeds: AviationCatalogSeed[] = [
  { id: "air-incheon", label: "인천", name: "인천공항 관측권", sector: "수도권 · 서해 접근", regionGroup: "capital", stationKind: "airport", center: [37.46, 126.44], wind: 7.2, gust: 12.8, visibility: 6.0, ceiling: 1800, weatherStatus: "흐림" },
  { id: "air-gimpo", label: "김포", name: "김포공항 관측권", sector: "수도권 · 도심 회랑", regionGroup: "capital", stationKind: "airport", center: [37.56, 126.80], wind: 5.2, gust: 9.4, visibility: 7.5, ceiling: 2600 },
  { id: "air-suwon", label: "수원", name: "수원 관측권", sector: "수도권 · 남부 내륙", regionGroup: "capital", stationKind: "airfield", center: [37.24, 127.01], wind: 4.0, gust: 7.2, visibility: 9.0, ceiling: 3600 },
  { id: "air-paju", label: "파주", name: "파주 북부 회랑", sector: "수도권 · 북부 저고도", regionGroup: "capital", stationKind: "corridor", center: [37.76, 126.78], wind: 8.8, gust: 15.4, visibility: 3.5, ceiling: 1200, fogLevel: "발생" },
  { id: "air-yangyang", label: "양양", name: "양양공항 관측권", sector: "강원권 · 동해 접근", regionGroup: "gangwon", stationKind: "airport", center: [38.06, 128.67], wind: 9.2, gust: 16.8, visibility: 5.2, ceiling: 1400, weatherStatus: "흐림" },
  { id: "air-wonju", label: "원주", name: "원주 관측권", sector: "강원권 · 내륙 회랑", regionGroup: "gangwon", stationKind: "airport", center: [37.44, 127.96], wind: 6.2, gust: 11.0, visibility: 6.0, ceiling: 1900 },
  { id: "air-gangneung", label: "강릉", name: "강릉 해안 회랑", sector: "강원권 · 해안 난류", regionGroup: "gangwon", stationKind: "corridor", center: [37.75, 128.90], wind: 11.0, gust: 20.2, visibility: 4.4, ceiling: 1100, weatherStatus: "흐림" },
  { id: "air-cheorwon", label: "철원", name: "철원 북부 관측권", sector: "강원권 · 산악 저고도", regionGroup: "gangwon", stationKind: "weatherStation", center: [38.15, 127.31], wind: 5.6, gust: 10.5, visibility: 5.0, ceiling: 1700, fogLevel: "의심" },
  { id: "air-seosan", label: "서산", name: "서산 항공기상 관측권", sector: "충청권 · 서해 저고도", regionGroup: "chungcheong", stationKind: "airfield", center: [36.70, 126.49], wind: 8.2, gust: 14.8, visibility: 4.8, ceiling: 1500, weatherStatus: "흐림" },
  { id: "air-cheongju", label: "청주", name: "청주공항 관측권", sector: "충청권 · 내륙 중심", regionGroup: "chungcheong", stationKind: "airport", center: [36.72, 127.50], wind: 4.8, gust: 8.2, visibility: 8.6, ceiling: 3400 },
  { id: "air-daejeon", label: "대전", name: "대전 도심 관측권", sector: "충청권 · 도심 회랑", regionGroup: "chungcheong", stationKind: "weatherStation", center: [36.35, 127.38], wind: 3.8, gust: 7.0, visibility: 9.5, ceiling: 3800 },
  { id: "air-gunsan", label: "군산", name: "군산공항 관측권", sector: "호남권 · 서해 접근", regionGroup: "honam", stationKind: "airport", center: [35.90, 126.62], wind: 8.8, gust: 15.8, visibility: 4.2, ceiling: 1300, weatherStatus: "비", fogLevel: "의심" },
  { id: "air-gwangju", label: "광주", name: "광주공항 관측권", sector: "호남권 · 내륙 도심", regionGroup: "honam", stationKind: "airport", center: [35.13, 126.81], wind: 4.2, gust: 8.6, visibility: 7.4, ceiling: 2600 },
  { id: "air-muan", label: "무안", name: "무안공항 관측권", sector: "호남권 · 서남해 접근", regionGroup: "honam", stationKind: "airport", center: [34.99, 126.38], wind: 6.8, gust: 12.2, visibility: 5.8, ceiling: 2000 },
  { id: "air-yeosu", label: "여수", name: "여수공항 관측권", sector: "호남권 · 남해 접근", regionGroup: "honam", stationKind: "airport", center: [34.84, 127.62], wind: 9.6, gust: 17.2, visibility: 4.6, ceiling: 1250, weatherStatus: "흐림" },
  { id: "air-daegu", label: "대구", name: "대구공항 관측권", sector: "영남권 · 내륙 분지", regionGroup: "yeongnam", stationKind: "airport", center: [35.90, 128.66], wind: 5.0, gust: 9.0, visibility: 7.8, ceiling: 3000 },
  { id: "air-gimhae", label: "김해", name: "김해공항 관측권", sector: "영남권 · 남해 접근", regionGroup: "yeongnam", stationKind: "airport", center: [35.18, 128.94], wind: 7.8, gust: 13.8, visibility: 5.5, ceiling: 1700, weatherStatus: "흐림" },
  { id: "air-ulsan", label: "울산", name: "울산공항 관측권", sector: "영남권 · 동해 접근", regionGroup: "yeongnam", stationKind: "airport", center: [35.59, 129.35], wind: 8.6, gust: 15.2, visibility: 5.8, ceiling: 1800 },
  { id: "air-pohang", label: "포항", name: "포항공항 관측권", sector: "영남권 · 동해안", regionGroup: "yeongnam", stationKind: "airport", center: [35.99, 129.42], wind: 10.8, gust: 19.8, visibility: 3.8, ceiling: 950, weatherStatus: "비", fogLevel: "발생" },
  { id: "air-sacheon", label: "사천", name: "사천공항 관측권", sector: "영남권 · 남부 내륙", regionGroup: "yeongnam", stationKind: "airport", center: [35.09, 128.09], wind: 4.8, gust: 8.8, visibility: 8.2, ceiling: 3100 },
  { id: "air-jeju", label: "제주", name: "제주공항 관측권", sector: "제주권 · 북부 접근", regionGroup: "jeju", stationKind: "airport", center: [33.51, 126.49], wind: 11.4, gust: 21.0, visibility: 4.2, ceiling: 1000, weatherStatus: "비", lightningRisk: "주의" },
  { id: "air-seogwipo", label: "서귀포", name: "서귀포 남부 회랑", sector: "제주권 · 남부 해안", regionGroup: "jeju", stationKind: "corridor", center: [33.25, 126.56], wind: 8.2, gust: 14.0, visibility: 6.0, ceiling: 1800, weatherStatus: "흐림" },
  { id: "air-seongsan", label: "성산", name: "성산 동부 관측권", sector: "제주권 · 동부 해안", regionGroup: "jeju", stationKind: "weatherStation", center: [33.39, 126.88], wind: 7.2, gust: 12.6, visibility: 7.0, ceiling: 2200 },
  { id: "air-seoul", label: "서울", name: "서울 도심 항공기상 관측권", sector: "수도권 · 도심 저고도", regionGroup: "capital", stationKind: "weatherStation", center: [37.57, 126.98], wind: 4.5, gust: 8.0, visibility: 7.2, ceiling: 2800 },
  { id: "air-yongin", label: "용인", name: "용인 남부 회랑", sector: "수도권 · 남부 저고도", regionGroup: "capital", stationKind: "corridor", center: [37.24, 127.18], wind: 5.4, gust: 9.6, visibility: 6.8, ceiling: 2400 },
  { id: "air-baengnyeong", label: "백령", name: "백령도 해상 공역", sector: "수도권 · 서해 원거리", regionGroup: "capital", stationKind: "weatherStation", center: [37.96, 124.67], wind: 10.6, gust: 18.4, visibility: 5.0, ceiling: 1200, weatherStatus: "흐림" },
  { id: "air-sokcho", label: "속초", name: "속초 동해안 회랑", sector: "강원권 · 동해 저고도", regionGroup: "gangwon", stationKind: "corridor", center: [38.2, 128.59], wind: 8.4, gust: 15.0, visibility: 5.8, ceiling: 1450, weatherStatus: "흐림" },
  { id: "air-taebaek", label: "태백", name: "태백 산악 공역", sector: "강원권 · 산악 고지", regionGroup: "gangwon", stationKind: "weatherStation", center: [37.16, 128.99], wind: 9.4, gust: 17.0, visibility: 4.8, ceiling: 1050, fogLevel: "의심" },
  { id: "air-cheonan", label: "천안", name: "천안 내륙 회랑", sector: "충청권 · 북부 내륙", regionGroup: "chungcheong", stationKind: "corridor", center: [36.82, 127.11], wind: 4.4, gust: 7.8, visibility: 8.2, ceiling: 3200 },
  { id: "air-asan", label: "아산", name: "아산 서해 접근 회랑", sector: "충청권 · 서북부", regionGroup: "chungcheong", stationKind: "corridor", center: [36.79, 127.0], wind: 5.2, gust: 9.4, visibility: 7.4, ceiling: 2700 },
  { id: "air-mokpo", label: "목포", name: "목포 서남해 공역", sector: "호남권 · 서남해 접근", regionGroup: "honam", stationKind: "weatherStation", center: [34.81, 126.39], wind: 7.8, gust: 14.6, visibility: 5.4, ceiling: 1600, weatherStatus: "흐림" },
  { id: "air-suncheon", label: "순천", name: "순천 남해 내륙 회랑", sector: "호남권 · 남부 내륙", regionGroup: "honam", stationKind: "corridor", center: [34.95, 127.49], wind: 5.0, gust: 9.2, visibility: 7.2, ceiling: 2600 },
  { id: "air-gyeongju", label: "경주", name: "경주 동해 내륙 회랑", sector: "영남권 · 동해 내륙", regionGroup: "yeongnam", stationKind: "corridor", center: [35.86, 129.22], wind: 5.6, gust: 10.0, visibility: 7.0, ceiling: 2400 },
  { id: "air-geoje", label: "거제", name: "거제 남해 공역", sector: "영남권 · 남해 접근", regionGroup: "yeongnam", stationKind: "weatherStation", center: [34.88, 128.62], wind: 8.4, gust: 15.6, visibility: 5.6, ceiling: 1550, weatherStatus: "흐림" },
  { id: "air-ulleung", label: "울릉", name: "울릉도 해상 공역", sector: "영남권 · 동해 원거리", regionGroup: "yeongnam", stationKind: "weatherStation", center: [37.49, 130.91], wind: 12.6, gust: 22.4, visibility: 5.0, ceiling: 900, weatherStatus: "흐림" },
  { id: "air-seosan-daesan", label: "대산", name: "서산 대산 저고도 관측권", sector: "충청권 · 서산 북부 해안", regionGroup: "chungcheong", stationKind: "weatherStation", center: [37.0, 126.39], wind: 8.4, gust: 15.2, visibility: 4.9, ceiling: 1450, weatherStatus: "흐림" },
  { id: "air-seosan-haemi", label: "해미", name: "서산 해미 내륙 관측권", sector: "충청권 · 서산 내륙", regionGroup: "chungcheong", stationKind: "airfield", center: [36.71, 126.54], wind: 6.8, gust: 12.0, visibility: 6.2, ceiling: 2100, weatherStatus: "흐림" },
  { id: "air-daejeon-yuseong", label: "유성", name: "대전 유성 저고도 관측권", sector: "충청권 · 대전 서북부", regionGroup: "chungcheong", stationKind: "weatherStation", center: [36.36, 127.36], wind: 4.2, gust: 7.8, visibility: 8.8, ceiling: 3400 },
  { id: "air-seoul-gangnam", label: "강남", name: "서울 강남 도심 회랑", sector: "수도권 · 서울 동남권", regionGroup: "capital", stationKind: "corridor", center: [37.52, 127.05], wind: 4.6, gust: 8.4, visibility: 7.1, ceiling: 2800 },
  { id: "air-busan-haeundae", label: "해운대", name: "부산 해운대 해안 회랑", sector: "영남권 · 부산 동부 해안", regionGroup: "yeongnam", stationKind: "corridor", center: [35.16, 129.16], wind: 7.4, gust: 13.8, visibility: 5.9, ceiling: 1700, weatherStatus: "흐림" },
];

const additionalAviationCatalogSeeds: AviationCatalogSeed[] = [
  { id: "air-seongnam", label: "성남", name: "성남 도심 저고도 관측권", sector: "수도권 · 남동 도심", regionGroup: "capital", stationKind: "weatherStation", center: [37.42, 127.13], wind: 4.8, gust: 8.8, visibility: 7.0, ceiling: 2600 },
  { id: "air-osan", label: "오산", name: "오산 항공기상 관측권", sector: "수도권 · 남부 회랑", regionGroup: "capital", stationKind: "airfield", center: [37.09, 127.03], wind: 6.2, gust: 11.4, visibility: 6.5, ceiling: 2200 },
  { id: "air-pyeongtaek", label: "평택", name: "평택 서해 저고도 관측권", sector: "수도권 · 서해 평야", regionGroup: "capital", stationKind: "corridor", center: [36.99, 127.11], wind: 6.0, gust: 10.8, visibility: 6.6, ceiling: 2300 },
  { id: "air-chuncheon", label: "춘천", name: "춘천 분지 항공기상 관측권", sector: "강원권 · 내륙 분지", regionGroup: "gangwon", stationKind: "weatherStation", center: [37.88, 127.73], wind: 5.0, gust: 9.8, visibility: 6.6, ceiling: 2100, fogLevel: "의심" },
  { id: "air-samcheok", label: "삼척", name: "삼척 동해안 회랑", sector: "강원권 · 동해 남부", regionGroup: "gangwon", stationKind: "corridor", center: [37.45, 129.17], wind: 9.0, gust: 16.4, visibility: 5.3, ceiling: 1350, weatherStatus: "흐림" },
  { id: "air-hongseong", label: "홍성", name: "홍성 서해 내륙 회랑", sector: "충청권 · 서해 내륙", regionGroup: "chungcheong", stationKind: "corridor", center: [36.6, 126.66], wind: 5.8, gust: 10.2, visibility: 6.8, ceiling: 2400 },
  { id: "air-boryeong", label: "보령", name: "보령 서해안 공역", sector: "충청권 · 대천 해안", regionGroup: "chungcheong", stationKind: "weatherStation", center: [36.33, 126.61], wind: 7.4, gust: 13.2, visibility: 5.8, ceiling: 1850, weatherStatus: "흐림" },
  { id: "air-seocheon", label: "서천", name: "서천 남부 서해 공역", sector: "충청권 · 남부 서해", regionGroup: "chungcheong", stationKind: "weatherStation", center: [36.08, 126.69], wind: 7.0, gust: 12.8, visibility: 5.6, ceiling: 1800, weatherStatus: "흐림" },
  { id: "air-jeonju", label: "전주", name: "전주 내륙 항공기상 관측권", sector: "호남권 · 내륙 중심", regionGroup: "honam", stationKind: "weatherStation", center: [35.82, 127.15], wind: 4.0, gust: 8.0, visibility: 7.4, ceiling: 2800 },
  { id: "air-gwangyang", label: "광양", name: "광양 남해안 회랑", sector: "호남권 · 남해 산업권", regionGroup: "honam", stationKind: "corridor", center: [34.94, 127.7], wind: 7.2, gust: 13.4, visibility: 5.7, ceiling: 1700, weatherStatus: "흐림" },
  { id: "air-wando", label: "완도", name: "완도 남해 도서 공역", sector: "호남권 · 남해 도서", regionGroup: "honam", stationKind: "weatherStation", center: [34.31, 126.76], wind: 8.2, gust: 15.0, visibility: 5.2, ceiling: 1500, weatherStatus: "흐림" },
  { id: "air-andong", label: "안동", name: "안동 내륙 항공기상 관측권", sector: "영남권 · 북부 내륙", regionGroup: "yeongnam", stationKind: "weatherStation", center: [36.57, 128.73], wind: 4.4, gust: 8.6, visibility: 7.8, ceiling: 3000 },
  { id: "air-yeongju", label: "영주", name: "영주 산악 회랑", sector: "영남권 · 북부 산지", regionGroup: "yeongnam", stationKind: "corridor", center: [36.81, 128.62], wind: 6.4, gust: 12.2, visibility: 6.4, ceiling: 1900, fogLevel: "의심" },
  { id: "air-changwon", label: "창원", name: "창원 남해안 항공기상 관측권", sector: "영남권 · 남해안", regionGroup: "yeongnam", stationKind: "weatherStation", center: [35.23, 128.68], wind: 6.6, gust: 12.4, visibility: 6.0, ceiling: 1950, weatherStatus: "흐림" },
  { id: "air-tongyeong", label: "통영", name: "통영 남해 도서 공역", sector: "영남권 · 남해 도서", regionGroup: "yeongnam", stationKind: "corridor", center: [34.85, 128.43], wind: 8.0, gust: 14.8, visibility: 5.6, ceiling: 1600, weatherStatus: "흐림" },
  { id: "air-uljin", label: "울진", name: "울진 동해안 회랑", sector: "영남권 · 동해 중부", regionGroup: "yeongnam", stationKind: "corridor", center: [36.99, 129.4], wind: 9.2, gust: 16.8, visibility: 5.5, ceiling: 1400, weatherStatus: "흐림" },
  { id: "air-jeju-hallim", label: "한림", name: "제주 한림 서부 회랑", sector: "제주권 · 서부 해안", regionGroup: "jeju", stationKind: "corridor", center: [33.41, 126.27], wind: 9.4, gust: 17.2, visibility: 5.4, ceiling: 1400, weatherStatus: "흐림" },
  { id: "air-jeju-seongsan-detail", label: "성산", name: "제주 성산 동부 회랑", sector: "제주권 · 동부 해안", regionGroup: "jeju", stationKind: "corridor", center: [33.39, 126.88], wind: 8.8, gust: 16.0, visibility: 5.8, ceiling: 1500, weatherStatus: "흐림" },
];

const mergedAviationCatalogSeeds = [...nationalAviationCatalogSeeds, ...additionalAviationCatalogSeeds];

const nationalAviationZones: AviationZone[] = mergedAviationCatalogSeeds.map((seed) => ({
  id: seed.id,
  label: seed.label,
  name: seed.name,
  sector: seed.sector,
  regionGroup: seed.regionGroup,
  stationKind: seed.stationKind,
  center: seed.center,
  radius: 1400,
  data: aviationCatalogData(seed),
}));

export const aviationZones: AviationZone[] = [...priorityAviationZones, ...nationalAviationZones];
