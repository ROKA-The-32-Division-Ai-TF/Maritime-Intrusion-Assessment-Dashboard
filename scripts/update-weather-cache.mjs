import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(rootDir, "public", "data", "weather-cache.json");
const KMA_NCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
const KMA_FCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";
const KMA_WARNING_URL = "http://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList";
const KMA_WARNING_MSG_URL = "http://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg";
const AIRKOREA_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty";
const KASI_RISE_SET_URL = "https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo";
const KHOA_TIDE_URL = "https://khoa.go.kr/oceandata/odmiapi/GetTideFcstHghLwApiService.do";
const DEFAULT_DEPLOYED_CACHE_URL = "https://roka-the-32-division-ai-tf.github.io/Maritime-Intrusion-Assessment-Dashboard/data/weather-cache.json";

const operationTargets = [
  { id: "coastal-seosan", type: "coastal", name: "서산 권역 · 대산 연안", lat: 37.005, lon: 126.352, location: "서산", airStation: "대산", tideObsCode: "DT_0017", tideEnv: "KHOA_TIDE_OBS_CODE_SEOSAN" },
  { id: "coastal-dangjin", type: "coastal", name: "당진 권역 · 장고항 일대", lat: 36.96, lon: 126.84, location: "당진", airStation: "당진시청사", tideObsCode: "SO_1270", tideEnv: "KHOA_TIDE_OBS_CODE_DANGJIN" },
  { id: "coastal-taean", type: "coastal", name: "태안 권역 · 안흥항 일대", lat: 36.75, lon: 126.29, location: "태안", airStation: "태안읍", tideObsCode: "DT_0067", tideEnv: "KHOA_TIDE_OBS_CODE_TAEAN" },
  { id: "coastal-boryeong", type: "coastal", name: "보령 권역 · 대천항 일대", lat: 36.33, lon: 126.61, location: "보령", airStation: "대천2동", tideObsCode: "DT_0025", tideEnv: "KHOA_TIDE_OBS_CODE_BORYEONG" },
  { id: "ground-land-seosan", type: "ground", name: "서산시 기상 권역", lat: 36.784, lon: 126.45, location: "서산", airStation: "독곶리" },
  { id: "ground-land-dangjin", type: "ground", name: "당진시 기상 권역", lat: 36.893, lon: 126.629, location: "당진", airStation: "당진시청사" },
  { id: "ground-land-taean", type: "ground", name: "태안군 기상 권역", lat: 36.745, lon: 126.298, location: "태안", airStation: "태안읍" },
  { id: "ground-land-boryeong", type: "ground", name: "보령시 기상 권역", lat: 36.333, lon: 126.612, location: "보령", airStation: "대천2동" },
  { id: "air-A-A", type: "air", name: "A권역 · 서해 연안 공역", lat: 36.78, lon: 126.45, location: "서산", airStation: "독곶리" },
  { id: "air-A-B", type: "air", name: "B권역 · 내륙 회랑", lat: 36.62, lon: 127.12, location: "공주", airStation: "공주" },
  { id: "air-A-C", type: "air", name: "C권역 · 도심 관측권", lat: 36.35, lon: 127.38, location: "대전", airStation: "둔산동" },
  { id: "air-A-D", type: "air", name: "D권역 · 산악 난류권", lat: 36.95, lon: 127.68, location: "충주", airStation: "칠금동" },
];

function env(name) {
  return process.env[name]?.trim() || "";
}

function apiKey(name) {
  const value = env(name);
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function alert(id, type, level, title, message, source, timestamp = new Date().toISOString(), meta = {}) {
  return {
    id,
    type,
    level,
    title,
    message,
    source,
    timestamp,
    ...meta,
  };
}

function kstNow(offsetMinutes = 0) {
  return new Date(Date.now() + 9 * 60 * 60 * 1000 + offsetMinutes * 60 * 1000);
}

function ymd(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function kmaTimestamp(tmFc) {
  const value = String(tmFc ?? "");
  if (value.length < 8) return new Date().toISOString();

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const hour = value.length >= 10 ? value.slice(8, 10) : "00";
  const minute = value.length >= 12 ? value.slice(10, 12) : "00";
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00+09:00`).toISOString();
}

function hourBaseTime() {
  const date = kstNow(-45);
  return {
    baseDate: ymd(date),
    baseTime: `${String(date.getUTCHours()).padStart(2, "0")}00`,
    currentTime: `${String(kstNow().getUTCHours()).padStart(2, "0")}:${String(kstNow().getUTCMinutes()).padStart(2, "0")}`,
  };
}

function displayDateTime() {
  const now = kstNow();
  return `${now.getUTCFullYear()}.${String(now.getUTCMonth() + 1).padStart(2, "0")}.${String(now.getUTCDate()).padStart(2, "0")} ${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} 기준`;
}

function dfsGrid(lat, lon) {
  const re = 6371.00877;
  const grid = 5.0;
  const slat1 = 30.0;
  const slat2 = 60.0;
  const olon = 126.0;
  const olat = 38.0;
  const xo = 43;
  const yo = 136;
  const degrad = Math.PI / 180.0;
  const reGrid = re / grid;
  const slat1Rad = slat1 * degrad;
  const slat2Rad = slat2 * degrad;
  const olonRad = olon * degrad;
  const olatRad = olat * degrad;
  let sn = Math.tan(Math.PI * 0.25 + slat2Rad * 0.5) / Math.tan(Math.PI * 0.25 + slat1Rad * 0.5);
  sn = Math.log(Math.cos(slat1Rad) / Math.cos(slat2Rad)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1Rad * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1Rad)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olatRad * 0.5);
  ro = (reGrid * sf) / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * degrad * 0.5);
  ra = (reGrid * sf) / Math.pow(ra, sn);
  let theta = lon * degrad - olonRad;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + xo + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + yo + 0.5),
  };
}

function windDirectionLabel(degrees) {
  if (!Number.isFinite(degrees)) return "서";
  const labels = ["북", "북북동", "북동", "동북동", "동", "동남동", "남동", "남남동", "남", "남남서", "남서", "서남서", "서", "서북서", "북서", "북북서"];
  return labels[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

function weatherStatusFromCode(sky, pty) {
  if (["1", "2", "4", "5", "6"].includes(String(pty))) return "비";
  if (["3", "7"].includes(String(pty))) return "눈";
  if (String(sky) === "4") return "흐림";
  if (String(sky) === "3") return "흐림";
  return "맑음";
}

function fogLevelFromVisibility(visibilityKm) {
  if (visibilityKm <= 1) return "심함";
  if (visibilityKm <= 3) return "발생";
  if (visibilityKm <= 5) return "의심";
  return "없음";
}

function pmLevelFromGrade(grade) {
  if (["4", "매우나쁨"].includes(String(grade))) return "매우나쁨";
  if (["3", "나쁨"].includes(String(grade))) return "나쁨";
  if (["2", "보통"].includes(String(grade))) return "보통";
  return "좋음";
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hhmm(value) {
  const text = String(value ?? "").replace(/\D/g, "").padStart(4, "0");
  if (text === "----" || text.length < 4) return "";
  return `${text.slice(-4, -2)}:${text.slice(-2)}`;
}

function publicDataItems(json) {
  const items = json?.response?.body?.items;
  if (Array.isArray(items)) return items;

  const item = items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value) {
  return String(value ?? "")
    .replace(/[\s·ㆍ,./_()[\]{}-]/g, "")
    .toLowerCase();
}

function warningKeywordsForTarget(target) {
  const location = target.location ?? "";
  const station = String(target.airStation ?? "").replace(/(시청사|읍|동|리)$/g, "");
  const nameTokens = String(target.name ?? "")
    .split(/[·\s]+/g)
    .map((token) => token.replace(/(권역|일대|연안|기상|관측권|공역|회랑)$/g, ""));
  const keywords = [
    location,
    station,
    `${location}시`,
    `${location}군`,
    ...nameTokens,
  ];

  if (location === "대전") {
    keywords.push("대전광역시", "대전");
  }

  if (target.type === "coastal" || ["서산", "당진", "태안", "보령"].includes(location)) {
    keywords.push("서해중부해상", "서해중부앞바다", "서해중부먼바다");
    if (["서산", "당진", "태안"].includes(location)) keywords.push("충남북부앞바다");
    if (location === "보령") keywords.push("충남남부앞바다");
  }

  return unique(keywords.map(compactText).filter((keyword) => keyword.length >= 2));
}

const warningTargetProfiles = operationTargets.map((target) => ({
  target,
  keywords: warningKeywordsForTarget(target),
  normalizedKeywords: warningKeywordsForTarget(target).map(normalizeForMatch),
}));

function warningRecordText(...records) {
  return records
    .filter(Boolean)
    .flatMap((record) =>
      Object.entries(record)
        .filter(([, value]) => ["string", "number"].includes(typeof value))
        .map(([key, value]) => `${key}: ${value}`),
    )
    .join("\n");
}

function matchWarningTargets(text) {
  const normalizedText = normalizeForMatch(text);

  return warningTargetProfiles.filter((profile) =>
    profile.normalizedKeywords.some((keyword) => keyword && normalizedText.includes(keyword)),
  );
}

function looksLikeWarningRegion(value) {
  const text = compactText(value);
  if (!text || /없\s*음|없음/.test(text)) return false;
  if (/[0-9]{4}년|\d{1,2}시|\d{2}분/.test(text)) return false;
  return /[가-힣]/.test(text);
}

function extractWarningRegionText(text, matchedProfiles) {
  const source = String(text ?? "");
  const directPatterns = [
    /(?:발효|해제|예비특보|특보)\s*(?:현황|지역|구역)\s*[:：]\s*([^\n]+)/,
    /(?:해당|대상)\s*(?:지역|구역)\s*[:：]\s*([^\n]+)/,
    /(?:o|○|ㆍ|-)\s*[^:\n]*(?:주의보|경보)\s*[:：]\s*([^\n]+)/,
  ];

  for (const pattern of directPatterns) {
    const match = source.match(pattern);
    if (match?.[1] && looksLikeWarningRegion(match[1])) return compactText(match[1]).slice(0, 90);
  }

  const warningAreaMatches = [...source.matchAll(/(?:주의보|경보|예비특보|해제|변경)[^:\n]*[:：]\s*([^\n]+)/g)]
    .map((match) => compactText(match[1]))
    .filter(looksLikeWarningRegion);
  if (warningAreaMatches.length > 0) {
    return warningAreaMatches[0].slice(0, 90);
  }

  const labels = unique(matchedProfiles.map(({ target }) => target.location).filter(Boolean));
  return labels.length > 0 ? labels.join(" · ") : "";
}

async function fetchKmaWarningDetail(item, serviceKey) {
  const tmFc = String(item.tmFc ?? "");
  const tmSeq = String(item.tmSeq ?? "");
  const stnId = String(item.stnId ?? "108");
  if (!tmFc || !tmSeq) return null;

  const json = await fetchJson(KMA_WARNING_MSG_URL, {
    ServiceKey: serviceKey,
    pageNo: 1,
    numOfRows: 10,
    dataType: "JSON",
    stnId,
    fromTmFc: tmFc.slice(0, 8),
    toTmFc: ymd(kstNow()),
    tmFc,
    tmSeq,
  });

  return publicDataItems(json)[0] ?? null;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function kmaWarningAlertFromItem(item, detail, index) {
  const title = compactText(item.title ?? detail?.title ?? "기상특보");
  if (!title) return null;

  const text = warningRecordText(item, detail);
  const matchedProfiles = matchWarningTargets(text);
  const targetIds = unique(matchedProfiles.map(({ target }) => target.id));
  const regions = unique(matchedProfiles.map(({ target }) => target.location).filter(Boolean));
  const regionText = extractWarningRegionText(text, matchedProfiles);
  const level = title.includes("경보") || title.includes("태풍") ? "warning" : "watch";
  const regionPrefix = regionText ? `${regionText} · ` : "";

  return alert(
    `kma-warning-${item.tmFc ?? "latest"}-${item.tmSeq ?? index}-${item.stnId ?? "108"}`,
    "system",
    level,
    "기상특보",
    `${regionPrefix}${title}`,
    regionText ? `기상청 · ${regionText}` : "기상청 기상특보",
    kmaTimestamp(item.tmFc),
    {
      regions,
      regionText,
      targetIds,
      rawTitle: title,
    },
  );
}

function compactItems(items) {
  const result = new Map();

  items.forEach((item) => {
    if (item.category) result.set(item.category, item.obsrValue ?? item.fcstValue);
  });

  return Object.fromEntries(result);
}

async function fetchJson(url, params) {
  const requestUrl = `${url}?${new URLSearchParams(params).toString()}`;
  const response = await fetch(requestUrl, { headers: { accept: "application/json" } });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function loadPreparedFeed() {
  const sourceUrl = env("WEATHER_CACHE_SOURCE_URL");
  if (!sourceUrl) return null;

  const response = await fetch(sourceUrl, {
    headers: {
      accept: "application/json",
      ...(env("WEATHER_CACHE_SOURCE_TOKEN") ? { authorization: `Bearer ${env("WEATHER_CACHE_SOURCE_TOKEN")}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Weather cache source failed: ${response.status}`);
  }

  return response.json();
}

async function loadExistingCache() {
  const existingUrl = env("WEATHER_CACHE_EXISTING_URL") || DEFAULT_DEPLOYED_CACHE_URL;

  try {
    const response = await fetch(`${existingUrl}?ts=${Date.now()}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function loadLocalCache() {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    return null;
  }
}

async function fetchKmaNowForecast(target) {
  const serviceKey = apiKey("KMA_SERVICE_KEY") || apiKey("PUBLIC_DATA_SERVICE_KEY");
  if (!serviceKey) return null;

  const { nx, ny } = dfsGrid(target.lat, target.lon);
  const base = hourBaseTime();
  const commonParams = {
    serviceKey,
    pageNo: "1",
    numOfRows: "1000",
    dataType: "JSON",
    base_date: base.baseDate,
    base_time: base.baseTime,
    nx: `${nx}`,
    ny: `${ny}`,
  };
  const [nowcastJson, forecastJson] = await Promise.all([
    fetchJson(KMA_NCST_URL, commonParams),
    fetchJson(KMA_FCST_URL, commonParams).catch(() => null),
  ]);
  const now = compactItems(publicDataItems(nowcastJson));
  const forecast = compactItems(publicDataItems(forecastJson));
  const merged = { ...forecast, ...now };
  const windSpeedMs = safeNumber(merged.WSD, 0);
  const humidityPercent = safeNumber(merged.REH, 60);
  const temperatureC = safeNumber(merged.T1H, 20);
  const precipitationMm = safeNumber(merged.RN1, 0);
  const precipitationProbability = precipitationMm > 10 ? 85 : precipitationMm > 0 ? 55 : 15;
  const windDirection = windDirectionLabel(safeNumber(merged.VEC, NaN));
  const visibilityKm = target.type === "air" ? Math.max(2, 10 - precipitationMm * 0.3 - windSpeedMs * 0.12) : Math.max(2, 9 - precipitationMm * 0.25);
  const weatherStatus = weatherStatusFromCode(merged.SKY, merged.PTY);

  return {
    source: "기상청 초단기실황/예보",
    base,
    values: {
      temperatureC,
      humidityPercent,
      precipitationMm,
      precipitationProbability,
      windSpeedMs,
      windDirection,
      visibilityKm: Number(visibilityKm.toFixed(1)),
      weatherStatus,
      fogLevel: fogLevelFromVisibility(visibilityKm),
      currentTime: base.currentTime,
    },
  };
}

async function fetchKmaWarningAlerts() {
  const serviceKey = apiKey("KMA_WARNING_SERVICE_KEY") || apiKey("KMA_SERVICE_KEY") || apiKey("PUBLIC_DATA_SERVICE_KEY");
  if (!serviceKey) return null;

  try {
    const json = await fetchJson(KMA_WARNING_URL, {
      ServiceKey: serviceKey,
      pageNo: 1,
      numOfRows: 50,
      dataType: "JSON",
      fromTmFc: ymd(kstNow(-72 * 60)),
      toTmFc: ymd(kstNow()),
    });
    const resultCode = json?.response?.header?.resultCode;
    const resultMsg = json?.response?.header?.resultMsg;
    if (resultCode && resultCode !== "00") {
      console.warn(`KMA warning skipped: ${resultCode} ${resultMsg ?? ""}`.trim());
      return resultCode === "03" ? [] : null;
    }

    const items = publicDataItems(json)
      .filter((item) => item.title)
      .slice(0, 50);

    const enrichedAlerts = await mapWithConcurrency(
      items,
      5,
      async (item, index) => {
        const detail = await fetchKmaWarningDetail(item, serviceKey).catch(() => null);
        return kmaWarningAlertFromItem(item, detail, index);
      },
    );

    return enrichedAlerts.filter(Boolean);
  } catch (error) {
    console.warn(`KMA warning failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

async function fetchAirKorea(target) {
  const serviceKey = apiKey("AIRKOREA_SERVICE_KEY");
  if (!serviceKey || !target.airStation) return null;

  const json = await fetchJson(AIRKOREA_URL, {
    serviceKey,
    returnType: "json",
    numOfRows: "1",
    pageNo: "1",
    stationName: target.airStation,
    dataTerm: "DAILY",
    ver: "1.3",
  });
  const item = publicDataItems(json)[0];
  if (!item) return null;

  return {
    source: "에어코리아",
    values: {
      pm10Level: pmLevelFromGrade(item.pm10Grade1h ?? item.pm10Grade),
      pm25Level: pmLevelFromGrade(item.pm25Grade1h ?? item.pm25Grade),
      pmLevel: pmLevelFromGrade(item.pm10Grade1h ?? item.pm10Grade),
    },
  };
}

async function fetchRiseSet(target) {
  const serviceKey = apiKey("KASI_SERVICE_KEY");
  if (!serviceKey) return null;

  const json = await fetchJson(KASI_RISE_SET_URL, {
    serviceKey,
    locdate: ymd(kstNow()),
    location: target.location,
    _type: "json",
  });
  const item = publicDataItems(json)[0] ?? json?.response?.body?.item;
  if (!item) return null;

  return {
    source: "한국천문연구원 출몰시각",
    values: {
      sunrise: hhmm(item.sunrise),
      sunset: hhmm(item.sunset),
      moonrise: hhmm(item.moonrise),
      moonset: hhmm(item.moonset),
      bmnt: hhmm(item.civilm),
      eent: hhmm(item.civile),
    },
  };
}

async function fetchTide(target) {
  const obsCode = (target.tideEnv ? env(target.tideEnv) : "") || target.tideObsCode;
  if (!obsCode) return null;

  const json = await fetchJson(KHOA_TIDE_URL, {
    obsCode,
    reqDate: ymd(kstNow()),
    type: "json",
    numOfRows: 20,
    pageNo: 1,
    isSample: "Y",
  });
  const tideItems = json?.body?.items?.item ?? json?.response?.body?.items?.item ?? [];
  const items = Array.isArray(tideItems) ? tideItems : [tideItems];
  const highs = items.filter((item) => ["1", "3"].includes(String(item.extrSe ?? item.EXTR_SE)));
  const lows = items.filter((item) => ["2", "4"].includes(String(item.extrSe ?? item.EXTR_SE)));
  const timeOf = (item) => String(item.predcDt ?? item.PREDC_DT ?? "").slice(11, 16);

  return {
    source: "국립해양조사원 조석예보",
    values: {
      highTide: highs.map(timeOf).filter(Boolean).slice(0, 2).join(" / "),
      lowTide: lows.map(timeOf).filter(Boolean).slice(0, 2).join(" / "),
    },
  };
}

function marineValuesFromWeather(values) {
  const waveHeightM = Number(Math.max(0.2, values.windSpeedMs * 0.09 + values.precipitationMm * 0.025).toFixed(1));

  return {
    waveHeightM,
    nearshoreWaveHeightM: waveHeightM,
    offshoreWaveHeightM: Number((waveHeightM + 0.45).toFixed(1)),
    wavePeriodSec: Number(Math.max(3.5, waveHeightM * 3.1 + 3.4).toFixed(1)),
    waterTempC: Number((values.temperatureC - 1.2).toFixed(1)),
    currentSpeedKt: Number(Math.max(0.2, values.windSpeedMs * 0.08).toFixed(1)),
    currentDirection: values.windDirection,
    surfaceWindMs: values.windSpeedMs,
    upperWindSpeedMs: Number((values.windSpeedMs * 1.45 + 1.8).toFixed(1)),
    upperWindDirection: "서",
  };
}

function groundDerived(values) {
  return {
    apparentTemperatureC: Number((values.temperatureC + values.humidityPercent * 0.04 - values.windSpeedMs * 0.7).toFixed(1)),
    wbgtC: Number((values.temperatureC * 0.72 + values.humidityPercent * 0.05).toFixed(1)),
    surfaceWindMs: values.windSpeedMs,
    upperWindSpeedMs: Number((values.windSpeedMs * 1.6 + 1.4).toFixed(1)),
    upperWindDirection: values.windDirection,
  };
}

function airDerived(values) {
  const gustSpeedMs = Number((values.windSpeedMs * 1.75 + 1.2).toFixed(1));
  const turbulenceRisk = gustSpeedMs >= 18 ? "강" : gustSpeedMs >= 12 ? "중" : gustSpeedMs >= 8 ? "약" : "없음";

  return {
    gustSpeedMs,
    turbulenceRisk,
    cloudCeilingFt: values.weatherStatus === "비" ? 900 : values.weatherStatus === "흐림" ? 1800 : 3600,
    pressureHpa: values.windSpeedMs >= 9 ? 1001 : 1012,
    dewPointC: Number((values.temperatureC - (100 - values.humidityPercent) / 5).toFixed(1)),
    altitudeLayers: [
      { label: "50m", windSpeedMs: Math.max(2, values.windSpeedMs - 0.6), windDirection: "230°", temperatureC: values.temperatureC - 0.4, turbulence: turbulenceRisk },
      { label: "100m", windSpeedMs: values.windSpeedMs + 1.2, windDirection: "235°", temperatureC: values.temperatureC - 0.8, turbulence: turbulenceRisk },
      { label: "150m", windSpeedMs: values.windSpeedMs + 2.4, windDirection: "240°", temperatureC: values.temperatureC - 1.2, turbulence: turbulenceRisk === "강" ? "강" : "중" },
      { label: "300m", windSpeedMs: values.windSpeedMs + 4.5, windDirection: "250°", temperatureC: values.temperatureC - 2.4, turbulence: turbulenceRisk === "없음" ? "약" : turbulenceRisk },
    ],
  };
}

async function buildOperationUpdate(target) {
  const sources = [];
  const [kma, air, riseSet, tide] = await Promise.all([
    fetchKmaNowForecast(target).catch((error) => ({ error })),
    fetchAirKorea(target).catch((error) => ({ error })),
    fetchRiseSet(target).catch((error) => ({ error })),
    fetchTide(target).catch((error) => ({ error })),
  ]);
  const kmaValues = kma?.values;

  if (!kmaValues) return { update: null, sources };
  sources.push(kma.source);
  if (air?.values) sources.push(air.source);
  if (riseSet?.values) sources.push(riseSet.source);
  if (tide?.values) sources.push(tide.source);

  const common = {
    id: target.id,
    type: target.type,
    name: target.name,
    datetime: displayDateTime(),
  };

  if (target.type === "coastal") {
    const marine = marineValuesFromWeather(kmaValues);
    const coastalValues = {
      ...kmaValues,
      ...marine,
      ...(riseSet?.values ?? {}),
      ...(tide?.values ?? {}),
    };

    return {
      update: {
        ...common,
        coastal: coastalValues,
        coastalEnvironment: {
          waveHeightM: marine.waveHeightM,
          windSpeedMs: kmaValues.windSpeedMs,
          visibilityKm: kmaValues.visibilityKm,
          weatherStatus: kmaValues.weatherStatus,
          temperatureC: kmaValues.temperatureC,
          fogLevel: kmaValues.fogLevel,
          pmLevel: air?.values?.pmLevel,
        },
      },
      sources,
    };
  }

  if (target.type === "ground") {
    const derived = groundDerived(kmaValues);

    return {
      update: {
        ...common,
        ground: {
          ...kmaValues,
          ...derived,
          fog: kmaValues.fogLevel,
          cloudCoverPercent: kmaValues.weatherStatus === "맑음" ? 22 : kmaValues.weatherStatus === "흐림" ? 65 : 86,
          ...(riseSet?.values ?? {}),
        },
        groundEnvironment: {
          temperatureC: kmaValues.temperatureC,
          humidityPercent: kmaValues.humidityPercent,
          precipitationMm: kmaValues.precipitationMm,
          precipitationProbability: kmaValues.precipitationProbability,
          windSpeedMs: kmaValues.windSpeedMs,
          windDirection: kmaValues.windDirection,
          visibilityKm: kmaValues.visibilityKm,
          weatherStatus: kmaValues.weatherStatus,
          fogLevel: kmaValues.fogLevel,
          ...(air?.values ?? {}),
        },
      },
      sources,
    };
  }

  const derived = airDerived(kmaValues);

  return {
    update: {
      ...common,
      air: {
        temperatureC: kmaValues.temperatureC,
        precipitationProbability: kmaValues.precipitationProbability,
        precipitationMm: kmaValues.precipitationMm,
        windSpeedMs: kmaValues.windSpeedMs,
        windDirection: kmaValues.windDirection,
        visibilityKm: kmaValues.visibilityKm,
        humidityPercent: kmaValues.humidityPercent,
        ...derived,
      },
      aviationEnvironment: {
        averageWindSpeedMs: kmaValues.windSpeedMs,
        gustSpeedMs: derived.gustSpeedMs,
        windDirection: kmaValues.windDirection,
        precipitationMm: kmaValues.precipitationMm,
        visibilityKm: kmaValues.visibilityKm,
        fogLevel: kmaValues.fogLevel,
        temperatureC: kmaValues.temperatureC,
        humidityPercent: kmaValues.humidityPercent,
        weatherStatus: kmaValues.weatherStatus,
      },
    },
    sources,
  };
}

function fallbackPayload() {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    validForSeconds: 43200,
    sourceMode: "fallback",
    sources: [
      "기상청 API허브",
      "기상청 해양기상/특보",
      "국립해양조사원 조석·조류",
      "에어코리아 대기질",
      "산림청 산불위험",
      "항공기상 관측 후보",
    ],
    operationUpdates: [],
    alerts: [
      alert("weather-warning-pending", "system", "watch", "기상특보 확인", "현재 공식 특보 자료 수신을 준비 중입니다.", "기상청"),
    ],
  };
}

function liveAlerts(updates, officialAlerts = []) {
  const alerts = [...officialAlerts];
  const targetById = new Map(operationTargets.map((target) => [target.id, target]));

  updates.forEach((update) => {
    const wind = update.coastal?.windSpeedMs ?? update.ground?.windSpeedMs ?? update.air?.windSpeedMs;
    const visibility = update.coastal?.visibilityKm ?? update.ground?.visibilityKm ?? update.air?.visibilityKm;
    const alertType = update.type ?? "system";
    const target = targetById.get(update.id);
    const regionText = target?.location ?? update.name ?? "";
    const meta = {
      regions: regionText ? [regionText] : [],
      regionText,
      targetIds: update.id ? [update.id] : [],
    };

    if (Number.isFinite(wind) && wind >= 10) {
      alerts.push(alert(`${update.id}-wind`, alertType, "warning", "강풍성 변동", `${update.name ?? update.id} 풍속 ${wind}m/s 수준입니다.`, `기상청 · ${regionText || "선택지역"}`, new Date().toISOString(), meta));
    }

    if (Number.isFinite(visibility) && visibility <= 3) {
      alerts.push(alert(`${update.id}-visibility`, alertType, "watch", "저시정 확인", `${update.name ?? update.id} 시정 ${visibility}km 수준입니다.`, `기상청 · ${regionText || "선택지역"}`, new Date().toISOString(), meta));
    }
  });

  return alerts.slice(0, 60);
}

async function livePayload() {
  const [results, officialAlerts, deployedCache, localCache] = await Promise.all([
    Promise.all(operationTargets.map(buildOperationUpdate)),
    fetchKmaWarningAlerts(),
    loadExistingCache(),
    loadLocalCache(),
  ]);
  const liveUpdates = results.map((result) => result.update).filter(Boolean);
  const existingCandidates = [deployedCache, localCache]
    .filter(Boolean)
    .sort((first, second) => (second.operationUpdates?.length ?? 0) - (first.operationUpdates?.length ?? 0));
  const bestExisting = existingCandidates[0];
  const existingUpdates = Array.isArray(bestExisting?.operationUpdates) ? bestExisting.operationUpdates : [];
  const updateMap = new Map(existingUpdates.filter((update) => update.id).map((update) => [update.id, update]));

  liveUpdates.forEach((update) => {
    if (update.id) updateMap.set(update.id, update);
  });

  const updates = liveUpdates.length >= Math.min(8, operationTargets.length)
    ? liveUpdates
    : [...updateMap.values()];
  const sourceSet = new Set([
    ...(Array.isArray(bestExisting?.sources) ? bestExisting.sources : []),
    ...results.flatMap((result) => result.sources),
  ]);
  if (officialAlerts?.length) sourceSet.add("기상청 기상특보");

  if (updates.length === 0) return fallbackPayload();

  const alertSeed = officialAlerts === null
    ? Array.isArray(bestExisting?.alerts) ? bestExisting.alerts : []
    : officialAlerts;

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    validForSeconds: 43200,
    sourceMode: "live",
    sources: [...sourceSet],
    operationUpdates: updates,
    alerts: liveAlerts(updates, alertSeed),
  };
}

async function alertOnlyPayload() {
  const [current, officialAlerts] = await Promise.all([
    loadExistingCache(),
    fetchKmaWarningAlerts(),
  ]);
  const base = current ?? fallbackPayload();
  const updates = Array.isArray(base.operationUpdates) ? base.operationUpdates : [];
  const nextSources = new Set(Array.isArray(base.sources) ? base.sources : []);

  if (officialAlerts?.length) nextSources.add("기상청 기상특보");

  return {
    ...base,
    schemaVersion: base.schemaVersion ?? 1,
    generatedAt: new Date().toISOString(),
    validForSeconds: typeof base.validForSeconds === "number" && base.validForSeconds > 1800 ? base.validForSeconds : 43200,
    sourceMode: officialAlerts?.length ? "live" : base.sourceMode ?? "fallback",
    sources: [...nextSources],
    operationUpdates: updates,
    alerts: officialAlerts !== null
      ? liveAlerts(updates, officialAlerts)
      : Array.isArray(base.alerts)
        ? base.alerts
        : liveAlerts(updates, []),
  };
}

function hasLiveServiceKey() {
  return Boolean(
    apiKey("PUBLIC_DATA_SERVICE_KEY") ||
    apiKey("KMA_SERVICE_KEY") ||
    apiKey("KMA_WARNING_SERVICE_KEY") ||
    apiKey("KASI_SERVICE_KEY") ||
    apiKey("KHOA_SERVICE_KEY") ||
    apiKey("AIRKOREA_SERVICE_KEY"),
  );
}

async function main() {
  let payload;

  try {
    if (env("WEATHER_CACHE_REFRESH_SCOPE") === "alerts") {
      payload = await alertOnlyPayload();
    } else {
      payload = hasLiveServiceKey()
        ? await livePayload()
        : (await loadPreparedFeed()) ?? await livePayload();
    }
  } catch (error) {
    console.warn(error instanceof Error ? error.message : error);
    payload = fallbackPayload();
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`weather cache written: ${outputPath}`);
}

await main();
