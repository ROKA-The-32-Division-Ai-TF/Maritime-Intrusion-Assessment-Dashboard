import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(rootDir, "public", "data", "weather-cache.json");
const KMA_NCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
const KMA_FCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";
const KMA_WARNING_URL = "https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList";
const KMA_WARNING_MSG_URL = "https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg";
const KMA_ASOS_HOURLY_URL = "https://apis.data.go.kr/1360000/AsosHourlyInfoService/getWthrDataList";
const AIRKOREA_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty";
const KASI_RISE_SET_URL = "https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo";
const KHOA_TIDE_URL = "https://khoa.go.kr/oceandata/odmiapi/GetTideFcstHghLwApiService.do";
const KHOA_TIDE_RECENT_URL = "https://www.khoa.go.kr/api/oceangrid/tideObsRecent/search.do";
const KHOA_TIDE_TEMP_URL = "https://www.khoa.go.kr/api/oceangrid/tideObsTemp/search.do";
const KHOA_CURRENT_URL = "https://www.khoa.go.kr/api/oceangrid/fcTidalCurrent/search.do";
const KMA_ROAD_CCTV_URL = "https://apihub.kma.go.kr/api/typ01/url/cctv_ana_info.php";
const KMA_ROAD_CCTV_INFO_URL = "https://apihub.kma.go.kr/api/typ01/url/cctv_road_info.php";
const KMA_WIND_PROFILER_URL = "https://apihub.kma.go.kr/api/typ01/url/kma_wpf.php";
const DEFAULT_DEPLOYED_CACHE_URL = "https://roka-the-32-division-ai-tf.github.io/Maritime-Intrusion-Assessment-Dashboard/data/weather-cache.json";

const operationTargets = [
  { id: "coastal-seosan", type: "coastal", name: "서산 권역 · 대산 연안", lat: 37.005, lon: 126.352, location: "서산", airStation: "대산", asosStn: "129", tideObsCode: "DT_0017", tideEnv: "KHOA_TIDE_OBS_CODE_SEOSAN", currentEnv: "KHOA_CURRENT_OBS_CODE_SEOSAN", tempEnv: "KHOA_TEMP_OBS_CODE_SEOSAN" },
  { id: "coastal-dangjin", type: "coastal", name: "당진 권역 · 장고항 일대", lat: 36.96, lon: 126.84, location: "당진", airStation: "당진시청사", tideObsCode: "SO_1270", tideEnv: "KHOA_TIDE_OBS_CODE_DANGJIN", currentEnv: "KHOA_CURRENT_OBS_CODE_DANGJIN", tempEnv: "KHOA_TEMP_OBS_CODE_DANGJIN" },
  { id: "coastal-taean", type: "coastal", name: "태안 권역 · 안흥항 일대", lat: 36.75, lon: 126.29, location: "태안", airStation: "태안읍", tideObsCode: "DT_0067", tideEnv: "KHOA_TIDE_OBS_CODE_TAEAN", currentEnv: "KHOA_CURRENT_OBS_CODE_TAEAN", tempEnv: "KHOA_TEMP_OBS_CODE_TAEAN" },
  { id: "coastal-boryeong", type: "coastal", name: "보령 권역 · 대천항 일대", lat: 36.33, lon: 126.61, location: "보령", airStation: "대천2동", asosStn: "235", tideObsCode: "DT_0025", tideEnv: "KHOA_TIDE_OBS_CODE_BORYEONG", currentEnv: "KHOA_CURRENT_OBS_CODE_BORYEONG", tempEnv: "KHOA_TEMP_OBS_CODE_BORYEONG" },
  { id: "ground-land-seosan", type: "ground", name: "서산시 기상 권역", lat: 36.784, lon: 126.45, location: "서산", airStation: "독곶리", asosStn: "129" },
  { id: "ground-land-dangjin", type: "ground", name: "당진시 기상 권역", lat: 36.893, lon: 126.629, location: "당진", airStation: "당진시청사" },
  { id: "ground-land-taean", type: "ground", name: "태안군 기상 권역", lat: 36.745, lon: 126.298, location: "태안", airStation: "태안읍" },
  { id: "ground-land-boryeong", type: "ground", name: "보령시 기상 권역", lat: 36.333, lon: 126.612, location: "보령", airStation: "대천2동", asosStn: "235" },
  { id: "air-A-A", type: "air", name: "A권역 · 서해 연안 공역", lat: 36.78, lon: 126.45, location: "서산", airStation: "독곶리", asosStn: "129" },
  { id: "air-A-B", type: "air", name: "B권역 · 내륙 회랑", lat: 36.62, lon: 127.12, location: "공주", airStation: "공주", asosStn: "133" },
  { id: "air-A-C", type: "air", name: "C권역 · 도심 관측권", lat: 36.35, lon: 127.38, location: "대전", airStation: "둔산동", asosStn: "133" },
  { id: "air-A-D", type: "air", name: "D권역 · 산악 난류권", lat: 36.95, lon: 127.68, location: "충주", airStation: "칠금동", asosStn: "127" },
];

await loadLocalEnv();

async function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    try {
      const text = await readFile(join(rootDir, filename), "utf8");
      text.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
        const [key, ...valueParts] = trimmed.split("=");
        const name = key.trim();
        if (!name || process.env[name]) return;
        process.env[name] = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
      });
    } catch {
      // Local env files are optional; GitHub Actions provides the same values as Secrets.
    }
  }
}

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

function ymdhm(date) {
  return `${ymd(date)}${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}`;
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

function displayKstMinute(value) {
  const text = String(value ?? "").replace(/\D/g, "");
  if (text.length < 12) return "";
  return `${text.slice(4, 6)}.${text.slice(6, 8)} ${text.slice(8, 10)}:${text.slice(10, 12)}`;
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

async function fetchText(url, params) {
  const requestUrl = `${url}?${new URLSearchParams(params).toString()}`;
  const response = await fetch(requestUrl, { headers: { accept: "text/plain,*/*" } });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status}`);
  }

  return text;
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

function firstValue(item, keys) {
  for (const key of keys) {
    const value = item?.[key] ?? item?.[key.toUpperCase()] ?? item?.[key.toLowerCase()];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }

  return undefined;
}

function khoaItems(json) {
  const candidates = [
    json?.result?.data,
    json?.result?.item,
    json?.result,
    json?.body?.items?.item,
    json?.response?.body?.items?.item,
    json?.data,
    json?.items,
  ];
  const value = candidates.find((candidate) => candidate !== undefined && candidate !== null);
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function latestByTime(items) {
  return [...items].sort((first, second) => {
    const timeKeys = ["tm", "TM", "record_time", "obs_time", "obsTime", "predcDt", "PREDC_DT", "date_time", "time"];
    const firstTime = String(firstValue(first, timeKeys) ?? "");
    const secondTime = String(firstValue(second, timeKeys) ?? "");
    return secondTime.localeCompare(firstTime);
  })[0];
}

function normalizeCurrentKt(value) {
  const speed = safeNumber(value, NaN);
  if (!Number.isFinite(speed)) return undefined;
  if (speed > 10) return Number((speed * 0.0194384).toFixed(1));
  return Number(speed.toFixed(1));
}

function normalizeDirection(value) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const numeric = Number(text);
  if (Number.isFinite(numeric)) return windDirectionLabel(numeric);
  return text.replace(/도$/, "");
}

async function fetchTideRecent(target) {
  const serviceKey = apiKey("KHOA_TIDE_RECENT_SERVICE_KEY") || apiKey("KHOA_SERVICE_KEY") || apiKey("PUBLIC_DATA_SERVICE_KEY");
  const obsCode = (target.tideEnv ? env(target.tideEnv) : "") || target.tideObsCode;
  if (!serviceKey || !obsCode) return null;

  const json = await fetchJson(KHOA_TIDE_RECENT_URL, {
    ServiceKey: serviceKey,
    ObsCode: obsCode,
    ResultType: "json",
  });
  const item = latestByTime(khoaItems(json));
  if (!item) return null;

  const values = {};
  const waterTempC = safeNumber(firstValue(item, ["water_temp", "waterTemp", "wtemp", "temp", "WTEMP"]), NaN);
  const windSpeedMs = safeNumber(firstValue(item, ["wind_speed", "windSpeed", "ws", "WS"]), NaN);
  const windDirection = normalizeDirection(firstValue(item, ["wind_dir", "windDirection", "wd", "WD"]));
  const currentSpeedKt = normalizeCurrentKt(firstValue(item, ["current_speed", "currentSpeed", "cs", "CURRENT_SPEED"]));
  const currentDirection = normalizeDirection(firstValue(item, ["current_dir", "currentDirection", "cd", "CURRENT_DIR"]));

  if (Number.isFinite(waterTempC)) values.waterTempC = Number(waterTempC.toFixed(1));
  if (Number.isFinite(windSpeedMs)) values.windSpeedMs = Number(windSpeedMs.toFixed(1));
  if (windDirection) values.windDirection = windDirection;
  if (currentSpeedKt !== undefined) values.currentSpeedKt = currentSpeedKt;
  if (currentDirection) values.currentDirection = currentDirection;

  return Object.keys(values).length > 0
    ? { source: "국립해양조사원 조위관측소 최신 관측데이터", values }
    : null;
}

async function fetchWaterTemp(target) {
  const serviceKey = apiKey("KHOA_WATER_TEMP_SERVICE_KEY") || apiKey("KHOA_SERVICE_KEY") || apiKey("PUBLIC_DATA_SERVICE_KEY");
  const obsCode = (target.tempEnv ? env(target.tempEnv) : "") || (target.tideEnv ? env(target.tideEnv) : "") || target.tideObsCode;
  if (!serviceKey || !obsCode) return null;

  const json = await fetchJson(KHOA_TIDE_TEMP_URL, {
    ServiceKey: serviceKey,
    ObsCode: obsCode,
    Date: ymd(kstNow()),
    ResultType: "json",
  });
  const item = latestByTime(khoaItems(json));
  if (!item) return null;

  const waterTempC = safeNumber(firstValue(item, ["water_temp", "waterTemp", "wtemp", "temp", "WTEMP"]), NaN);
  return Number.isFinite(waterTempC)
    ? { source: "국립해양조사원 조위관측소 실측 수온", values: { waterTempC: Number(waterTempC.toFixed(1)) } }
    : null;
}

async function fetchTidalCurrent(target) {
  const serviceKey = apiKey("KHOA_CURRENT_SERVICE_KEY") || apiKey("KHOA_SERVICE_KEY") || apiKey("PUBLIC_DATA_SERVICE_KEY");
  const obsCode = (target.currentEnv ? env(target.currentEnv) : "") || target.currentObsCode || target.tideObsCode;
  if (!serviceKey || !obsCode) return null;

  const json = await fetchJson(KHOA_CURRENT_URL, {
    ServiceKey: serviceKey,
    ObsCode: obsCode,
    Date: ymd(kstNow()),
    ResultType: "json",
  });
  const item = latestByTime(khoaItems(json));
  if (!item) return null;

  const currentSpeedKt = normalizeCurrentKt(firstValue(item, ["current_speed", "currentSpeed", "cs", "speed", "CURRENT_SPEED"]));
  const currentDirection = normalizeDirection(firstValue(item, ["current_dir", "currentDirection", "cd", "dir", "CURRENT_DIR"]));
  const values = {};
  if (currentSpeedKt !== undefined) values.currentSpeedKt = currentSpeedKt;
  if (currentDirection) values.currentDirection = currentDirection;

  return Object.keys(values).length > 0
    ? { source: "국립해양조사원 조류예보 시계열", values }
    : null;
}

async function fetchAsosHourly(target) {
  const serviceKey = apiKey("KMA_ASOS_SERVICE_KEY") || apiKey("KMA_SERVICE_KEY") || apiKey("PUBLIC_DATA_SERVICE_KEY");
  if (!serviceKey || !target.asosStn) return null;

  const base = kstNow(-90);
  const json = await fetchJson(KMA_ASOS_HOURLY_URL, {
    serviceKey,
    pageNo: "1",
    numOfRows: "10",
    dataType: "JSON",
    dataCd: "ASOS",
    dateCd: "HR",
    startDt: ymd(base),
    startHh: String(base.getUTCHours()).padStart(2, "0"),
    endDt: ymd(kstNow()),
    endHh: String(kstNow().getUTCHours()).padStart(2, "0"),
    stnIds: target.asosStn,
  });
  const item = latestByTime(publicDataItems(json));
  if (!item) return null;

  const values = {};
  const visibilityM = safeNumber(item.vs, NaN);
  const temperatureC = safeNumber(item.ta, NaN);
  const humidityPercent = safeNumber(item.hm, NaN);
  const windSpeedMs = safeNumber(item.ws, NaN);
  const windDirection = normalizeDirection(item.wd);
  const precipitationMm = safeNumber(item.rn, NaN);

  if (Number.isFinite(visibilityM)) values.visibilityKm = Number(Math.max(0.1, visibilityM / 1000).toFixed(1));
  if (Number.isFinite(temperatureC)) values.temperatureC = Number(temperatureC.toFixed(1));
  if (Number.isFinite(humidityPercent)) values.humidityPercent = Number(humidityPercent.toFixed(0));
  if (Number.isFinite(windSpeedMs)) values.windSpeedMs = Number(windSpeedMs.toFixed(1));
  if (windDirection) values.windDirection = windDirection;
  if (Number.isFinite(precipitationMm)) values.precipitationMm = Number(precipitationMm.toFixed(1));

  return Object.keys(values).length > 0
    ? { source: "기상청 ASOS 시간자료", values }
    : null;
}

async function fetchWindProfiler(target) {
  const authKey = apiKey("KMA_WIND_PROFILER_SERVICE_KEY") || apiKey("KMA_UPPER_AIR_SERVICE_KEY") || apiKey("KMA_APIHUB_AUTH_KEY");
  if (!authKey || !target.wpfStn) return null;

  const text = await fetchText(KMA_WIND_PROFILER_URL, {
    tm: ymdhm(kstNow(-60)).slice(0, 10),
    stn: target.wpfStn,
    mode: "L",
    help: "1",
    authKey,
  });
  const rows = parseKmaTextTable(text);
  const row = rows.find((item) => {
    const height = safeNumber(firstValue(item, ["HT", "HGHT", "height", "_2"]), NaN);
    return Number.isFinite(height) && height >= 500;
  }) ?? rows[0];
  if (!row) return null;

  const upperWindSpeedMs = safeNumber(firstValue(row, ["WS", "WSPD", "wind_speed", "_4"]), NaN);
  const upperWindDirection = normalizeDirection(firstValue(row, ["WD", "WDIR", "wind_dir", "_3"]));
  const values = {};
  if (Number.isFinite(upperWindSpeedMs)) values.upperWindSpeedMs = Number(upperWindSpeedMs.toFixed(1));
  if (upperWindDirection) values.upperWindDirection = upperWindDirection;

  return Object.keys(values).length > 0
    ? { source: "기상청 연직바람관측", values }
    : null;
}

function parseKmaTextTable(text, fallbackHeaders = []) {
  const rows = [];
  let headers = [...fallbackHeaders];
  const lines = String(text ?? "").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || /^#?(START|END)\d*/i.test(trimmed)) return;
    const normalized = trimmed.replace(/^#\s*/, "");
    const columns = normalized.includes(",")
      ? normalized.split(",").map((value) => value.trim())
      : normalized.split(/\s+/).map((value) => value.trim());
    if (columns.length < 2) return;

    const headerLike = columns.some((column) => /^(TM|EQP_ID|STN_NM|LAT|LON|WH_CD|RN_CD|FOG_CD|SN_CD|ROAD_NAME)$/i.test(column));
    if (headerLike) {
      headers = columns.map((column) => column.trim());
      return;
    }

    if (headers.length === 0) {
      rows.push(Object.fromEntries(columns.map((value, index) => [`_${index}`, value])));
      return;
    }

    const row = {};
    headers.forEach((header, index) => {
      row[header] = columns[index] ?? "";
    });
    rows.push(row);
  });

  return rows;
}

function codeLabel(value, labels, fallback = "확인") {
  const key = String(value ?? "").trim();
  if (!key || key === "-9") return fallback;
  return labels[key] ?? fallback;
}

function roadWeatherLabel(value) {
  return codeLabel(value, {
    "00": "맑음",
    "0": "맑음",
    "11": "안개 약",
    "12": "안개 중",
    "13": "안개 강",
    "21": "비 약",
    "22": "비 중",
    "23": "비 강",
    "31": "눈 약",
    "32": "눈 중",
    "33": "눈 강",
  }, "관측");
}

function fogCodeLabel(value) {
  return codeLabel(value, {
    "00": "없음",
    "0": "없음",
    "11": "약",
    "12": "중",
    "13": "강",
  }, "확인");
}

function rainCodeLabel(value) {
  return codeLabel(value, {
    "00": "없음",
    "0": "없음",
    "21": "약",
    "22": "중",
    "23": "강",
  }, "확인");
}

function snowCodeLabel(value) {
  return codeLabel(value, {
    "00": "없음",
    "0": "없음",
    "31": "약",
    "32": "중",
    "33": "강",
  }, "확인");
}

function distanceKm(firstLat, firstLon, secondLat, secondLon) {
  const rad = Math.PI / 180;
  const dLat = (secondLat - firstLat) * rad;
  const dLon = (secondLon - firstLon) * rad;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(firstLat * rad) * Math.cos(secondLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestOperationIds(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
  return operationTargets
    .map((target) => ({
      id: target.id,
      distance: distanceKm(lat, lon, target.lat, target.lon),
    }))
    .sort((first, second) => first.distance - second.distance)
    .filter((item, index) => index < 3 || item.distance <= 75)
    .slice(0, 4)
    .map((item) => item.id);
}

async function fetchRoadCctvWeather() {
  const authKey = apiKey("KMA_ROAD_WEATHER_SERVICE_KEY") || apiKey("KMA_APIHUB_AUTH_KEY");
  if (!authKey) return null;

  try {
    const infoText = await fetchText(KMA_ROAD_CCTV_INFO_URL, {
      eqp: "0",
      disp: "1",
      help: "1",
      authKey,
    }).catch(() => "");
    const infoRows = parseKmaTextTable(infoText, ["EQP_ID", "STN_NM", "LAT", "LON", "HT", "ROAD_NAME"]);
    const infoById = new Map(infoRows.map((row) => {
      const id = row.EQP_ID ?? row._0;
      return [String(id), row];
    }));
    const now = kstNow();
    const text = await fetchText(KMA_ROAD_CCTV_URL, {
      tm1: ymdhm(kstNow(-90)),
      tm2: ymdhm(now),
      eqp: "0",
      disp: "1",
      help: "1",
      authKey,
    });
    const rows = parseKmaTextTable(text, ["TM", "EQP_ID", "STN_NM", "LAT", "LON", "HT", "WH_CD", "FOG_CD", "RN_CD", "SN_CD"]);
    const latestByStation = new Map();

    rows.forEach((row) => {
      const id = String(row.EQP_ID ?? row._1 ?? "").trim();
      if (!id) return;
      const current = latestByStation.get(id);
      const tm = String(row.TM ?? row._0 ?? "");
      if (!current || String(current.TM ?? current._0 ?? "") < tm) {
        latestByStation.set(id, row);
      }
    });

    return [...latestByStation.values()]
      .map((row) => {
        const id = String(row.EQP_ID ?? row._1 ?? "");
        const info = infoById.get(id) ?? {};
        const lat = safeNumber(row.LAT ?? row._3 ?? info.LAT, NaN);
        const lon = safeNumber(row.LON ?? row._4 ?? info.LON, NaN);

        return {
          id: `road-cctv-${id}`,
          stationName: compactText(row.STN_NM ?? row._2 ?? info.STN_NM ?? id),
          roadName: compactText(row.ROAD_NAME ?? info.ROAD_NAME ?? ""),
          observedAt: displayKstMinute(row.TM ?? row._0),
          weatherLabel: roadWeatherLabel(row.WH_CD ?? row._6),
          fogLabel: fogCodeLabel(row.FOG_CD ?? row._7),
          rainLabel: rainCodeLabel(row.RN_CD ?? row._8),
          snowLabel: snowCodeLabel(row.SN_CD ?? row._9),
          lat: Number.isFinite(lat) ? Number(lat.toFixed(5)) : undefined,
          lon: Number.isFinite(lon) ? Number(lon.toFixed(5)) : undefined,
          nearestOperationIds: nearestOperationIds(lat, lon),
          source: "기상청 CCTV 기반 도로날씨정보",
        };
      })
      .filter((item) => item.stationName && (item.nearestOperationIds?.length ?? 0) > 0)
      .slice(0, 80);
  } catch (error) {
    console.warn(`KMA road CCTV failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
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

async function buildOperationUpdate(target, options = {}) {
  const includeDaily = options.includeDaily !== false;
  const sources = [];
  const [kma, air, riseSet, tide, tideRecent, waterTemp, tidalCurrent, asos, windProfiler] = await Promise.all([
    fetchKmaNowForecast(target).catch((error) => ({ error })),
    fetchAirKorea(target).catch((error) => ({ error })),
    includeDaily ? fetchRiseSet(target).catch((error) => ({ error })) : Promise.resolve(null),
    includeDaily ? fetchTide(target).catch((error) => ({ error })) : Promise.resolve(null),
    fetchTideRecent(target).catch((error) => ({ error })),
    fetchWaterTemp(target).catch((error) => ({ error })),
    fetchTidalCurrent(target).catch((error) => ({ error })),
    fetchAsosHourly(target).catch((error) => ({ error })),
    fetchWindProfiler(target).catch((error) => ({ error })),
  ]);
  const kmaValues = { ...(kma?.values ?? {}), ...(asos?.values ?? {}) };

  if (!kma?.values) return { update: null, sources };
  if (Number.isFinite(kmaValues.visibilityKm)) kmaValues.fogLevel = fogLevelFromVisibility(kmaValues.visibilityKm);
  sources.push(kma.source);
  if (air?.values) sources.push(air.source);
  if (riseSet?.values) sources.push(riseSet.source);
  if (tide?.values) sources.push(tide.source);
  if (tideRecent?.values) sources.push(tideRecent.source);
  if (waterTemp?.values) sources.push(waterTemp.source);
  if (tidalCurrent?.values) sources.push(tidalCurrent.source);
  if (asos?.values) sources.push(asos.source);
  if (windProfiler?.values) sources.push(windProfiler.source);

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
      ...(tideRecent?.values ?? {}),
      ...(waterTemp?.values ?? {}),
      ...(tidalCurrent?.values ?? {}),
      ...(windProfiler?.values ?? {}),
    };

    return {
      update: {
        ...common,
        coastal: coastalValues,
        coastalEnvironment: {
          waveHeightM: coastalValues.waveHeightM,
          windSpeedMs: coastalValues.windSpeedMs,
          visibilityKm: coastalValues.visibilityKm,
          weatherStatus: kmaValues.weatherStatus,
          temperatureC: coastalValues.temperatureC,
          fogLevel: fogLevelFromVisibility(coastalValues.visibilityKm),
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
          ...(windProfiler?.values ?? {}),
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
          fogLevel: fogLevelFromVisibility(kmaValues.visibilityKm),
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
        ...(riseSet?.values ?? {}),
        windSpeedMs: kmaValues.windSpeedMs,
        windDirection: kmaValues.windDirection,
        visibilityKm: kmaValues.visibilityKm,
        humidityPercent: kmaValues.humidityPercent,
        ...derived,
        ...(windProfiler?.values ?? {}),
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
    roadCctv: [
      {
        id: "road-cctv-fallback-seosan",
        stationName: "서산권 도로날씨",
        roadName: "CCTV 기반 도로날씨",
        observedAt: displayKstMinute(ymdhm(kstNow())),
        weatherLabel: "관측 대기",
        fogLabel: "확인",
        rainLabel: "확인",
        snowLabel: "확인",
        nearestOperationIds: ["coastal-seosan", "ground-land-seosan", "air-A-A"],
        source: "기상청 CCTV 기반 도로날씨정보",
      },
    ],
  };
}

function alertCacheScore(cache) {
  const alerts = Array.isArray(cache?.alerts) ? cache.alerts : [];
  const enrichedCount = alerts.filter((item) => item?.regionText || (Array.isArray(item?.targetIds) && item.targetIds.length > 0)).length;
  return alerts.length + enrichedCount * 10;
}

function bestAlertCache(caches) {
  return caches
    .filter((cache) => Array.isArray(cache?.alerts))
    .sort((first, second) => alertCacheScore(second) - alertCacheScore(first))[0];
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

function compactObject(value) {
  if (!value) return undefined;
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function mergeDefinedObject(previous, next) {
  const merged = { ...(previous ?? {}) };
  Object.entries(next ?? {}).forEach(([key, value]) => {
    if (value !== undefined) merged[key] = value;
  });
  return compactObject(merged);
}

function mergeCacheUpdate(previous = {}, next = {}) {
  const merged = {
    ...previous,
    ...next,
    coastal: mergeDefinedObject(previous.coastal, next.coastal),
    ground: mergeDefinedObject(previous.ground, next.ground),
    air: mergeDefinedObject(previous.air, next.air),
    coastalEnvironment: mergeDefinedObject(previous.coastalEnvironment, next.coastalEnvironment),
    groundEnvironment: mergeDefinedObject(previous.groundEnvironment, next.groundEnvironment),
    aviationEnvironment: mergeDefinedObject(previous.aviationEnvironment, next.aviationEnvironment),
  };

  return compactObject(merged) ?? next;
}

async function livePayload(options = {}) {
  const [results, officialAlerts, roadCctv, deployedCache, localCache] = await Promise.all([
    Promise.all(operationTargets.map((target) => buildOperationUpdate(target, options))),
    fetchKmaWarningAlerts(),
    fetchRoadCctvWeather(),
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
    if (update.id) updateMap.set(update.id, mergeCacheUpdate(updateMap.get(update.id), update));
  });

  const updates = liveUpdates.length >= Math.min(8, operationTargets.length)
    ? liveUpdates
    : [...updateMap.values()];
  const sourceSet = new Set([
    ...(Array.isArray(bestExisting?.sources) ? bestExisting.sources : []),
    ...results.flatMap((result) => result.sources),
  ]);
  if (officialAlerts?.length) sourceSet.add("기상청 기상특보");
  if (roadCctv?.length) sourceSet.add("기상청 CCTV 기반 도로날씨정보");

  if (updates.length === 0) {
    const fallback = fallbackPayload();
    return {
      ...fallback,
      generatedAt: new Date().toISOString(),
      sourceMode: roadCctv?.length ? "live-partial" : fallback.sourceMode,
      sources: roadCctv?.length ? [...new Set([...fallback.sources, "기상청 CCTV 기반 도로날씨정보"])] : fallback.sources,
      roadCctv: roadCctv?.length ? roadCctv : fallback.roadCctv,
    };
  }

  const alertSeed = officialAlerts === null
    ? bestAlertCache([localCache, deployedCache, bestExisting])?.alerts ?? []
    : officialAlerts;

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    validForSeconds: 43200,
    sourceMode: options.sourceMode ?? "live",
    sources: [...sourceSet],
    operationUpdates: updates,
    alerts: liveAlerts(updates, alertSeed),
    roadCctv: roadCctv?.length ? roadCctv : bestExisting?.roadCctv ?? localCache?.roadCctv ?? deployedCache?.roadCctv ?? [],
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
  const localCache = await loadLocalCache();

  if (officialAlerts?.length) nextSources.add("기상청 기상특보");

  return {
    ...base,
    schemaVersion: base.schemaVersion ?? 1,
    generatedAt: new Date().toISOString(),
    validForSeconds: typeof base.validForSeconds === "number" && base.validForSeconds > 1800 ? base.validForSeconds : 43200,
    sourceMode: officialAlerts?.length ? "live" : base.sourceMode ?? "fallback",
    sources: [...nextSources],
    operationUpdates: updates,
    roadCctv: Array.isArray(base.roadCctv) ? base.roadCctv : [],
    alerts: officialAlerts !== null
      ? liveAlerts(updates, officialAlerts)
      : bestAlertCache([localCache, base])?.alerts ?? liveAlerts(updates, []),
  };
}

function hasLiveServiceKey() {
  return Boolean(
    apiKey("PUBLIC_DATA_SERVICE_KEY") ||
    apiKey("KMA_SERVICE_KEY") ||
    apiKey("KMA_WARNING_SERVICE_KEY") ||
    apiKey("KMA_ASOS_SERVICE_KEY") ||
    apiKey("KASI_SERVICE_KEY") ||
    apiKey("KHOA_SERVICE_KEY") ||
    apiKey("KHOA_CURRENT_SERVICE_KEY") ||
    apiKey("KHOA_TIDE_RECENT_SERVICE_KEY") ||
    apiKey("KHOA_WATER_TEMP_SERVICE_KEY") ||
    apiKey("AIRKOREA_SERVICE_KEY") ||
    apiKey("KMA_ROAD_WEATHER_SERVICE_KEY") ||
    apiKey("KMA_APIHUB_AUTH_KEY"),
  );
}

async function main() {
  let payload;
  const refreshScope = env("WEATHER_CACHE_REFRESH_SCOPE");

  try {
    if (refreshScope === "alerts") {
      payload = await alertOnlyPayload();
    } else if (refreshScope === "observations") {
      payload = hasLiveServiceKey()
        ? await livePayload({ includeDaily: false, sourceMode: "live-observations" })
        : (await loadPreparedFeed()) ?? await livePayload({ includeDaily: false, sourceMode: "live-observations" });
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
