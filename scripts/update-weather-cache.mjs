import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(rootDir, "public", "data", "weather-cache.json");

function alert(id, type, level, title, message, source) {
  return {
    id,
    type,
    level,
    title,
    message,
    source,
    timestamp: new Date().toISOString(),
  };
}

async function loadPreparedFeed() {
  const sourceUrl = process.env.WEATHER_CACHE_SOURCE_URL;
  if (!sourceUrl) return null;

  const response = await fetch(sourceUrl, {
    headers: {
      accept: "application/json",
      ...(process.env.WEATHER_CACHE_SOURCE_TOKEN
        ? { authorization: `Bearer ${process.env.WEATHER_CACHE_SOURCE_TOKEN}` }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Weather cache source failed: ${response.status}`);
  }

  return response.json();
}

function fallbackPayload() {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    validForSeconds: 1800,
    sourceMode: "fallback",
    sources: [
      "기상청 API허브",
      "기상청 해양기상/특보",
      "국립해양조사원 조석·조류",
      "에어코리아 대기질",
      "산림청 산불위험",
      "항공기상 관측 후보",
    ],
    alerts: [
      alert(
        "coastal-cache-watch",
        "coastal",
        "watch",
        "해상 캐시 갱신",
        "파고, 조석, 시정, 해양기상 지도 확인이 가능한 최신 캐시 구조가 준비되었습니다.",
        "GitHub Actions",
      ),
      alert(
        "ground-cache-watch",
        "ground",
        "watch",
        "온열·대기 지표 갱신",
        "온열지수, 불쾌지수, 통합대기환경지수, 산불위험지수 캐시 구조가 준비되었습니다.",
        "GitHub Actions",
      ),
      alert(
        "air-cache-watch",
        "air",
        "watch",
        "드론 기상 감시",
        "저고도 풍속, 돌풍, 시정, 낙뢰 위험을 드론 운용 기준으로 확인합니다.",
        "GitHub Actions",
      ),
      alert(
        "system-cache-ready",
        "system",
        "info",
        "정적 배포 연동",
        "운영 API 키는 GitHub Actions 또는 내부 변환 서버에서만 사용하고, 화면은 JSON 캐시만 읽습니다.",
        "백룡 데이터 허브",
      ),
    ],
  };
}

async function main() {
  let payload;

  try {
    payload = (await loadPreparedFeed()) ?? fallbackPayload();
  } catch (error) {
    console.warn(error instanceof Error ? error.message : error);
    payload = fallbackPayload();
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`weather cache written: ${outputPath}`);
}

await main();
