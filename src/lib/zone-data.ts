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

const priorityCoastalZones: CoastalZone[] = [
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

type CoastalCatalogSeed = {
  id: string;
  label: string;
  name: string;
  seaArea: SeaAreaType;
  center: [number, number];
  waveHeightM: number;
  windSpeedMs: number;
  visibilityKm: number;
  temperatureC: number;
  weatherStatus?: ZoneEnvironmentData["weatherStatus"];
  tideStatus?: ZoneEnvironmentData["tideStatus"];
  currentStatus?: ZoneEnvironmentData["currentStatus"];
  fogLevel?: ZoneEnvironmentData["fogLevel"];
};

function coastalCatalogData(seed: CoastalCatalogSeed): ZoneEnvironmentData {
  return {
    waveHeightM: seed.waveHeightM,
    windSpeedMs: seed.windSpeedMs,
    visibilityKm: seed.visibilityKm,
    tideStatus: seed.tideStatus ?? (seed.seaArea === "offshore" ? "중간" : "만조 접근"),
    currentStatus: seed.currentStatus ?? (seed.windSpeedMs <= 5 ? "접근 유리" : seed.windSpeedMs <= 9 ? "보통" : "접근 불리"),
    timeBand: "evening",
    weatherStatus: seed.weatherStatus ?? (seed.visibilityKm <= 3 ? "안개" : seed.windSpeedMs >= 10 ? "흐림" : "맑음"),
    temperatureC: seed.temperatureC,
    pmLevel: seed.visibilityKm <= 4 ? "나쁨" : "보통",
    fireRiskLevel: "낮음",
    fogLevel: seed.fogLevel ?? (seed.visibilityKm <= 2 ? "발생" : seed.visibilityKm <= 5 ? "의심" : "없음"),
    cctvVisibility: seed.visibilityKm <= 2 ? "불량" : seed.visibilityKm <= 4 ? "제한" : seed.visibilityKm <= 7 ? "보통" : "양호",
  };
}

const nationalCoastalSeeds: CoastalCatalogSeed[] = [
  { id: "incheon-coast", label: "인천", name: "인천 연안 · 을왕리/영종", seaArea: "coast", center: [37.44, 126.38], waveHeightM: 0.8, windSpeedMs: 6.2, visibilityKm: 5.4, temperatureC: 16, weatherStatus: "흐림" },
  { id: "baengnyeong-coast", label: "백령", name: "백령도 연안 관측", seaArea: "nearshore", center: [37.96, 124.67], waveHeightM: 1.3, windSpeedMs: 8.5, visibilityKm: 6.2, temperatureC: 13, weatherStatus: "흐림" },
  { id: "ganghwa-coast", label: "강화", name: "강화 연안 관측", seaArea: "coast", center: [37.7, 126.36], waveHeightM: 0.5, windSpeedMs: 4.4, visibilityKm: 4.6, temperatureC: 15, fogLevel: "의심" },
  { id: "gunsan-coast", label: "군산", name: "군산항 연안 관측", seaArea: "nearshore", center: [35.98, 126.55], waveHeightM: 0.9, windSpeedMs: 7.0, visibilityKm: 5.0, temperatureC: 17, weatherStatus: "흐림" },
  { id: "mokpo-coast", label: "목포", name: "목포항 연안 관측", seaArea: "nearshore", center: [34.78, 126.36], waveHeightM: 0.6, windSpeedMs: 5.8, visibilityKm: 4.2, temperatureC: 18, weatherStatus: "흐림" },
  { id: "wando-coast", label: "완도", name: "완도 연안 관측", seaArea: "nearshore", center: [34.31, 126.75], waveHeightM: 0.7, windSpeedMs: 5.0, visibilityKm: 6.8, temperatureC: 18 },
  { id: "yeosu-coast", label: "여수", name: "여수항 연안 관측", seaArea: "nearshore", center: [34.74, 127.74], waveHeightM: 1.0, windSpeedMs: 7.6, visibilityKm: 5.2, temperatureC: 18, weatherStatus: "흐림" },
  { id: "tongyeong-coast", label: "통영", name: "통영 연안 관측", seaArea: "coast", center: [34.84, 128.43], waveHeightM: 0.6, windSpeedMs: 4.8, visibilityKm: 7.1, temperatureC: 18 },
  { id: "busan-coast", label: "부산", name: "부산항/해운대 연안", seaArea: "coast", center: [35.16, 129.16], waveHeightM: 0.8, windSpeedMs: 6.4, visibilityKm: 6.0, temperatureC: 19, weatherStatus: "맑음" },
  { id: "ulsan-coast", label: "울산", name: "울산항 연안 관측", seaArea: "nearshore", center: [35.5, 129.43], waveHeightM: 1.1, windSpeedMs: 7.8, visibilityKm: 5.8, temperatureC: 18, weatherStatus: "흐림" },
  { id: "pohang-coast", label: "포항", name: "포항 연안 관측", seaArea: "nearshore", center: [36.04, 129.39], waveHeightM: 1.4, windSpeedMs: 9.1, visibilityKm: 5.4, temperatureC: 17, weatherStatus: "흐림" },
  { id: "ulleung-coast", label: "울릉", name: "울릉도 연안 관측", seaArea: "nearshore", center: [37.49, 130.91], waveHeightM: 1.8, windSpeedMs: 10.8, visibilityKm: 7.5, temperatureC: 14, weatherStatus: "흐림", tideStatus: "중간" },
  { id: "donghae-coast", label: "동해", name: "동해항 연안 관측", seaArea: "nearshore", center: [37.5, 129.14], waveHeightM: 1.5, windSpeedMs: 8.4, visibilityKm: 7.0, temperatureC: 16 },
  { id: "sokcho-coast", label: "속초", name: "속초항 연안 관측", seaArea: "nearshore", center: [38.2, 128.6], waveHeightM: 1.2, windSpeedMs: 7.2, visibilityKm: 6.6, temperatureC: 15 },
  { id: "jeju-coast", label: "제주", name: "제주항/협재 연안", seaArea: "coast", center: [33.52, 126.53], waveHeightM: 1.0, windSpeedMs: 8.2, visibilityKm: 6.5, temperatureC: 20, weatherStatus: "흐림" },
  { id: "seogwipo-coast", label: "서귀포", name: "서귀포항 연안 관측", seaArea: "coast", center: [33.24, 126.56], waveHeightM: 1.1, windSpeedMs: 7.4, visibilityKm: 6.2, temperatureC: 21 },
  { id: "manripo-beach", label: "만리포", name: "태안 만리포 해수욕장", seaArea: "coast", center: [36.79, 126.14], waveHeightM: 0.7, windSpeedMs: 5.4, visibilityKm: 5.8, temperatureC: 17 },
  { id: "kkotji-beach", label: "꽃지", name: "태안 꽃지 해수욕장", seaArea: "coast", center: [36.5, 126.34], waveHeightM: 0.6, windSpeedMs: 4.9, visibilityKm: 6.1, temperatureC: 17 },
  { id: "daecheon-beach", label: "대천", name: "보령 대천 해수욕장", seaArea: "coast", center: [36.31, 126.51], waveHeightM: 0.5, windSpeedMs: 4.6, visibilityKm: 5.5, temperatureC: 18 },
  { id: "eulwangri-beach", label: "을왕리", name: "인천 을왕리 해수욕장", seaArea: "coast", center: [37.45, 126.37], waveHeightM: 0.6, windSpeedMs: 5.8, visibilityKm: 5.2, temperatureC: 16 },
  { id: "hyeopjae-beach", label: "협재", name: "제주 협재 해수욕장", seaArea: "coast", center: [33.39, 126.24], waveHeightM: 0.8, windSpeedMs: 6.6, visibilityKm: 7.4, temperatureC: 21 },
  { id: "haeundae-beach", label: "해운대", name: "부산 해운대 해수욕장", seaArea: "coast", center: [35.16, 129.16], waveHeightM: 0.7, windSpeedMs: 5.6, visibilityKm: 7.0, temperatureC: 20 },
  { id: "janghang-port", label: "장항", name: "서천 장항항 연안 관측", seaArea: "nearshore", center: [36.01, 126.69], waveHeightM: 0.55, windSpeedMs: 4.9, visibilityKm: 5.6, temperatureC: 17, weatherStatus: "흐림" },
  { id: "hongwon-port", label: "홍원", name: "서천 홍원항 연안 관측", seaArea: "coast", center: [36.15, 126.51], waveHeightM: 0.5, windSpeedMs: 4.7, visibilityKm: 5.9, temperatureC: 17 },
  { id: "maryang-port", label: "마량", name: "서천 마량항 연안 관측", seaArea: "coast", center: [36.13, 126.5], waveHeightM: 0.52, windSpeedMs: 4.8, visibilityKm: 5.7, temperatureC: 17 },
  { id: "namdang-port", label: "남당", name: "홍성 남당항 연안 관측", seaArea: "coast", center: [36.54, 126.47], waveHeightM: 0.58, windSpeedMs: 4.5, visibilityKm: 6.1, temperatureC: 17 },
  { id: "moshang-port", label: "무창포", name: "보령 무창포항/해수욕장", seaArea: "coast", center: [36.25, 126.53], waveHeightM: 0.48, windSpeedMs: 4.2, visibilityKm: 5.8, temperatureC: 18 },
  { id: "sapsido-port", label: "삽시도", name: "보령 삽시도 연안 관측", seaArea: "nearshore", center: [36.33, 126.35], waveHeightM: 0.76, windSpeedMs: 5.9, visibilityKm: 6.0, temperatureC: 17 },
  { id: "gyeokpo-port", label: "격포", name: "부안 격포항 연안 관측", seaArea: "coast", center: [35.63, 126.47], waveHeightM: 0.72, windSpeedMs: 5.4, visibilityKm: 5.5, temperatureC: 18, weatherStatus: "흐림" },
  { id: "saemangeum-coast", label: "새만금", name: "새만금 방조제 연안 관측", seaArea: "coast", center: [35.79, 126.55], waveHeightM: 0.62, windSpeedMs: 5.1, visibilityKm: 5.7, temperatureC: 18 },
  { id: "gomso-port", label: "곰소", name: "부안 곰소항 연안 관측", seaArea: "coast", center: [35.59, 126.61], waveHeightM: 0.5, windSpeedMs: 4.2, visibilityKm: 5.9, temperatureC: 18 },
  { id: "yeonggwang-coast", label: "영광", name: "영광 법성포 연안 관측", seaArea: "coast", center: [35.36, 126.44], waveHeightM: 0.65, windSpeedMs: 5.2, visibilityKm: 5.2, temperatureC: 18 },
  { id: "jindo-port", label: "진도", name: "진도 팽목항 연안 관측", seaArea: "nearshore", center: [34.37, 126.14], waveHeightM: 0.82, windSpeedMs: 6.3, visibilityKm: 5.1, temperatureC: 18, weatherStatus: "흐림" },
  { id: "haenam-port", label: "해남", name: "해남 땅끝항 연안 관측", seaArea: "coast", center: [34.3, 126.52], waveHeightM: 0.68, windSpeedMs: 5.6, visibilityKm: 5.7, temperatureC: 18 },
  { id: "goheung-port", label: "고흥", name: "고흥 녹동항 연안 관측", seaArea: "nearshore", center: [34.53, 127.13], waveHeightM: 0.72, windSpeedMs: 5.8, visibilityKm: 6.0, temperatureC: 19 },
  { id: "namhae-port", label: "남해", name: "남해 미조항 연안 관측", seaArea: "coast", center: [34.71, 128.05], waveHeightM: 0.66, windSpeedMs: 5.0, visibilityKm: 6.8, temperatureC: 19 },
  { id: "sacheon-port", label: "사천", name: "사천 삼천포항 연안 관측", seaArea: "nearshore", center: [34.93, 128.07], waveHeightM: 0.58, windSpeedMs: 4.9, visibilityKm: 6.5, temperatureC: 19 },
  { id: "geoje-port", label: "거제", name: "거제 장승포항 연안 관측", seaArea: "coast", center: [34.87, 128.73], waveHeightM: 0.7, windSpeedMs: 5.5, visibilityKm: 6.4, temperatureC: 19 },
  { id: "jinhae-port", label: "진해", name: "창원 진해항 연안 관측", seaArea: "coast", center: [35.15, 128.66], waveHeightM: 0.45, windSpeedMs: 4.1, visibilityKm: 6.8, temperatureC: 19 },
  { id: "gijang-coast", label: "기장", name: "부산 기장 연안 관측", seaArea: "coast", center: [35.24, 129.22], waveHeightM: 0.82, windSpeedMs: 6.0, visibilityKm: 6.3, temperatureC: 19 },
  { id: "gampo-port", label: "감포", name: "경주 감포항 연안 관측", seaArea: "coast", center: [35.81, 129.5], waveHeightM: 1.05, windSpeedMs: 7.2, visibilityKm: 6.4, temperatureC: 18 },
  { id: "yeongdeok-port", label: "영덕", name: "영덕 강구항 연안 관측", seaArea: "nearshore", center: [36.36, 129.39], waveHeightM: 1.18, windSpeedMs: 7.6, visibilityKm: 6.7, temperatureC: 17 },
  { id: "hupo-port", label: "후포", name: "울진 후포항 연안 관측", seaArea: "nearshore", center: [36.68, 129.46], waveHeightM: 1.28, windSpeedMs: 8.0, visibilityKm: 6.8, temperatureC: 17 },
  { id: "samcheok-port", label: "삼척", name: "삼척항 연안 관측", seaArea: "nearshore", center: [37.44, 129.18], waveHeightM: 1.32, windSpeedMs: 8.2, visibilityKm: 6.9, temperatureC: 16 },
  { id: "jumunjin-port", label: "주문진", name: "강릉 주문진항 연안 관측", seaArea: "nearshore", center: [37.89, 128.83], waveHeightM: 1.22, windSpeedMs: 7.8, visibilityKm: 6.7, temperatureC: 16 },
  { id: "naksan-beach", label: "낙산", name: "양양 낙산 해수욕장", seaArea: "coast", center: [38.12, 128.63], waveHeightM: 1.1, windSpeedMs: 7.0, visibilityKm: 6.9, temperatureC: 16 },
  { id: "goseong-coast", label: "고성", name: "고성 가진항 연안 관측", seaArea: "coast", center: [38.37, 128.51], waveHeightM: 1.16, windSpeedMs: 7.4, visibilityKm: 6.5, temperatureC: 15 },
  { id: "yellow-sea-central", label: "황해", name: "황해 중부 원해 관측", seaArea: "offshore", center: [36.2, 124.8], waveHeightM: 1.9, windSpeedMs: 10.2, visibilityKm: 8.0, temperatureC: 15, weatherStatus: "흐림", tideStatus: "중간" },
  { id: "south-sea-offshore", label: "남해", name: "남해 동부 원해 관측", seaArea: "offshore", center: [33.9, 128.1], waveHeightM: 1.6, windSpeedMs: 9.4, visibilityKm: 7.6, temperatureC: 18, tideStatus: "중간" },
  { id: "east-sea-offshore", label: "동해", name: "동해 중부 원해 관측", seaArea: "offshore", center: [37.2, 131.0], waveHeightM: 2.2, windSpeedMs: 12.0, visibilityKm: 9.2, temperatureC: 14, weatherStatus: "흐림", tideStatus: "중간" },
  { id: "qingdao-yellow-sea", label: "칭다오", name: "중국 황해 칭다오 연안", seaArea: "nearshore", center: [36.07, 120.38], waveHeightM: 0.8, windSpeedMs: 5.8, visibilityKm: 4.8, temperatureC: 16, weatherStatus: "흐림" },
  { id: "yantai-yellow-sea", label: "옌타이", name: "중국 황해 옌타이 연안", seaArea: "nearshore", center: [37.46, 121.45], waveHeightM: 0.9, windSpeedMs: 6.2, visibilityKm: 5.0, temperatureC: 15, weatherStatus: "흐림" },
  { id: "lianyungang-yellow-sea", label: "롄윈강", name: "중국 황해 롄윈강 연안", seaArea: "nearshore", center: [34.6, 119.2], waveHeightM: 0.7, windSpeedMs: 5.0, visibilityKm: 4.5, temperatureC: 17, weatherStatus: "안개" },
  { id: "shanghai-east-china-sea", label: "상하이", name: "중국 동중국해 상하이 외해", seaArea: "offshore", center: [30.9, 122.2], waveHeightM: 1.3, windSpeedMs: 7.4, visibilityKm: 5.8, temperatureC: 19, weatherStatus: "흐림", tideStatus: "중간" },
  { id: "zhoushan-east-china-sea", label: "저우산", name: "중국 동중국해 저우산 해역", seaArea: "nearshore", center: [29.99, 122.21], waveHeightM: 1.2, windSpeedMs: 7.0, visibilityKm: 5.4, temperatureC: 19, weatherStatus: "흐림" },
  { id: "ningbo-east-china-sea", label: "닝보", name: "중국 동중국해 닝보 연안", seaArea: "nearshore", center: [29.87, 121.55], waveHeightM: 1.0, windSpeedMs: 6.4, visibilityKm: 5.2, temperatureC: 19, weatherStatus: "흐림" },
  { id: "tsushima-east-sea", label: "쓰시마", name: "일본 동해 쓰시마 해역", seaArea: "nearshore", center: [34.42, 129.33], waveHeightM: 1.1, windSpeedMs: 7.2, visibilityKm: 6.3, temperatureC: 18, weatherStatus: "흐림" },
  { id: "sakaiminato-east-sea", label: "사카이미나토", name: "일본 동해 사카이미나토 연안", seaArea: "nearshore", center: [35.54, 133.24], waveHeightM: 1.4, windSpeedMs: 8.2, visibilityKm: 6.8, temperatureC: 17, weatherStatus: "흐림" },
  { id: "maizuru-east-sea", label: "마이즈루", name: "일본 동해 마이즈루 연안", seaArea: "nearshore", center: [35.45, 135.33], waveHeightM: 1.5, windSpeedMs: 8.6, visibilityKm: 6.5, temperatureC: 17, weatherStatus: "흐림" },
  { id: "niigata-east-sea", label: "니가타", name: "일본 동해 니가타 연안", seaArea: "nearshore", center: [37.92, 139.04], waveHeightM: 1.7, windSpeedMs: 9.4, visibilityKm: 7.0, temperatureC: 16, weatherStatus: "흐림", tideStatus: "중간" },
];

const nationalCoastalZones: CoastalZone[] = nationalCoastalSeeds.map((seed) => ({
  id: seed.id,
  label: seed.label,
  name: seed.name,
  seaArea: seed.seaArea,
  center: seed.center,
  data: coastalCatalogData(seed),
}));

export const zones: CoastalZone[] = [...priorityCoastalZones, ...nationalCoastalZones];
