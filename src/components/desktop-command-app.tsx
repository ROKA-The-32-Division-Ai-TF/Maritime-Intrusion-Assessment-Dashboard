"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  Cloud,
  Compass,
  Database,
  Eye,
  ListChecks,
  Map as MapIcon,
  Menu,
  Moon,
  Settings,
  Shield,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import { allOperations, defaultOperations, operationConfigs } from "@/lib/the-one-data";
import type { OperationType, TheOneOperation } from "@/lib/the-one-engine";

type DesktopMenu = "weather" | "access" | "live" | "settings";
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
type WeatherCachePayload = {
  alerts?: LiveAlert[];
  operationUpdates?: Partial<TheOneOperation>[];
};
type DesktopMetric = {
  label: string;
  value: string;
  helper: string;
  icon: IconType;
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DESKTOP_SELECTION_KEY = "baekryong-desktop-selection-v1";
const DESKTOP_TYPE_KEY = "baekryong-desktop-type-v1";
const MENUS: Array<{ id: DesktopMenu; label: string; icon: IconType }> = [
  { id: "weather", label: "기상분석표", icon: CalendarDays },
  { id: "access", label: "밀입국판단표", icon: ListChecks },
  { id: "live", label: "실시간 상황", icon: MapIcon },
  { id: "settings", label: "사용자 설정", icon: Settings },
];
const TYPES: OperationType[] = ["coastal", "ground", "air"];
const KMA_WEATHER_MAP_URL = "https://www.weather.go.kr/wgis-nuri/html/map.html#";
const KMA_MARINE_MAP_URL = "https://marine.kma.go.kr/mmis/?menuId=sig_wh";

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

  const alertText = normalizeAlertMatchText([
    alert.title,
    alert.message,
    alert.source,
    alert.regionText ?? "",
    ...(alert.regions ?? []),
  ].join(" "));

  if (alert.type === "system") return alertKeywordsForOperation(operation).some((keyword) => alertText.includes(keyword));
  return !alert.regionText || alertKeywordsForOperation(operation).some((keyword) => alertText.includes(keyword));
}

function filterAlertsForOperation(alerts: LiveAlert[], activeType: OperationType, operation?: TheOneOperation) {
  return alerts.filter((alert) => alertMatchesOperation(alert, activeType, operation));
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

function splitClockPair(value?: string) {
  const matches = [...String(value ?? "").matchAll(/(\d{1,2}):(\d{2})/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
  if (matches.length >= 2) return [matches[0], matches[1]];
  return [matches[0] ?? "-", "-"];
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
  const overlay = operation.type === "coastal" ? "waves" : operation.type === "air" ? "wind" : "rain";
  const zoom = operation.type === "coastal" ? "7" : "8";
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
    message: "true",
    calendar: "now",
    type: "map",
    location: "coordinates",
    metricWind: "m/s",
    metricTemp: "°C",
  });

  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

function kmaMapUrl(operation: TheOneOperation) {
  return operation.type === "coastal" ? KMA_MARINE_MAP_URL : KMA_WEATHER_MAP_URL;
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
      { label: "운고", value: `${data.cloudCeilingFt}ft`, helper: "저고도", icon: Cloud },
      { label: "난류", value: data.turbulenceRisk, helper: "항로안정", icon: Activity },
      { label: "습도", value: `${data.humidityPercent}%`, helper: `이슬점 ${data.dewPointC}℃`, icon: Activity },
      { label: "기온", value: `${data.temperatureC}℃`, helper: "배터리", icon: Thermometer },
    ];
  }

  return [];
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
      } catch {
        if (active) setAlerts([]);
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 60_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { catalog, alerts };
}

export function DesktopCommandApp() {
  const { catalog, alerts } = useDesktopData();
  const [activeMenu, setActiveMenu] = useState<DesktopMenu>("live");
  const [activeType, setActiveType] = useState<OperationType>("coastal");
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultOperations.map((operation) => operation.id));
  const [selectedId, setSelectedId] = useState(defaultOperations[0]?.id ?? "");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const storedIds = JSON.parse(window.localStorage.getItem(DESKTOP_SELECTION_KEY) ?? "null") as string[] | null;
        const storedType = window.localStorage.getItem(DESKTOP_TYPE_KEY) as OperationType | null;

        if (Array.isArray(storedIds)) {
          setSelectedIds(storedIds);
          setSelectedId(storedIds[0] ?? "");
        }

        if (storedType && TYPES.includes(storedType)) setActiveType(storedType);
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
  const selectedOperation = activeOperations.find((operation) => operation.id === selectedId) ?? activeOperations[0] ?? selectedOperations[0];
  const selectedAlerts = useMemo(
    () => filterAlertsForOperation(alerts, activeType, selectedOperation),
    [activeType, alerts, selectedOperation],
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

  return (
    <div className="desktop-app">
      <aside className="desktop-sidebar">
        <div className="desktop-brand">
          <img src={assetUrl("22.svg")} alt="" />
          <div>
            <span>백룡</span>
            <strong>작전기상 판단체계</strong>
          </div>
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
        <div className="desktop-sidebar-status">
          <Bell size={18} />
          <span>선택지역 특보 {selectedAlerts.length}건</span>
        </div>
      </aside>
      <main className="desktop-main">
        <header className="desktop-topbar">
          <button type="button" aria-label="메뉴">
            <Menu size={21} />
          </button>
          <div>
            <strong>{MENUS.find((menu) => menu.id === activeMenu)?.label}</strong>
            <span>{new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })}</span>
          </div>
          <img src={assetUrl("22.svg")} alt="" />
        </header>
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
        {activeMenu === "settings" && (
          <DesktopSettings
            catalog={catalog}
            selectedIds={selectedIds}
            activeType={activeType}
            onTypeChange={setActiveType}
            onToggle={handleToggle}
            onClear={() => {
              setSelectedIds([]);
              setSelectedId("");
            }}
            onDefault={handleDefault}
            onSelectAllType={() => {
              const ids = catalog.filter((operation) => operation.type === activeType).map((operation) => operation.id);
              setSelectedIds((current) => [...new Set([...current, ...ids])]);
              setSelectedId(ids[0] ?? "");
            }}
          />
        )}
      </main>
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
              <article>
                <span>윈디</span>
                <iframe src={windyEmbedUrl(selectedOperation)} title={`${selectedOperation.name} 윈디`} loading="lazy" />
              </article>
              <article>
                <span>기상청</span>
                <iframe src={kmaMapUrl(selectedOperation)} title={`${selectedOperation.name} 기상청`} loading="lazy" />
              </article>
            </section>
          </>
        ) : (
          <section className="desktop-empty is-large">
            <Database size={30} />
            <strong>사용자 설정에서 지역을 선택하세요</strong>
          </section>
        )}
      </div>
      <aside className="desktop-live-right">
        <section className="desktop-panel">
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

function WeatherAnalysisSheet({ operations }: { operations: TheOneOperation[] }) {
  const coastal = operations.filter((operation) => operation.type === "coastal" && operation.coastal).slice(0, 6);
  const first = coastal[0]?.coastal;
  const days = Array.from({ length: 10 }, (_, index) => index);

  if (!first || coastal.length === 0) return <DesktopEmptySheet label="해안 지역을 선택하면 기상분석표가 표시됩니다." />;

  return (
    <section className="desktop-sheet">
      <div className="desktop-sheet-head">
        <h1>2026년 5월 기상분석표</h1>
        <button type="button" onClick={() => window.print()}>인쇄</button>
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
                <th>{`5.${14 + day}.`}</th>
                <td>{`4.${27 + day}.`}</td>
                <td>{shiftClock(first.bmnt, day * -1)}<br />{shiftClock(first.eent, day)}</td>
                <td>{shiftClock(first.sunrise, day * -1)}<br />{shiftClock(first.sunset, day)}</td>
                <td>{shiftClock(first.moonrise, day * 16)}<br />{shiftClock(first.moonset, day * 16)}</td>
                <td>{Math.max(0, Math.min(100, first.moonlightPercent + day * 3))}%</td>
                <td>{`${((Number.parseInt(first.tideAge, 10) || 7) + day - 1) % 15 + 1}물`}</td>
                {coastal.flatMap((operation) => {
                  const high = splitClockPair(operation.coastal?.highTide);
                  const low = splitClockPair(operation.coastal?.lowTide);
                  return [
                    <td key={`${operation.id}-${day}-high`}>{high.map((time) => shiftClock(time, day * 12)).join(" / ")}</td>,
                    <td key={`${operation.id}-${day}-low`}>{low.map((time) => shiftClock(time, day * 12)).join(" / ")}</td>,
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

  if (coastal.length === 0) return <DesktopEmptySheet label="해안 지역을 선택하면 판단표가 표시됩니다." />;

  return (
    <section className="desktop-sheet">
      <div className="desktop-sheet-head">
        <h1>2026년 5월 14일 밀입국 가능성 판단표</h1>
        <button type="button" onClick={() => window.print()}>인쇄</button>
      </div>
      <AssessmentBlock title="출항 가능여부 평가 지표" rows={outbound.length > 0 ? outbound : coastal.slice(0, 2)} />
      <AssessmentBlock title="접안 가능여부 평가 지표" rows={inbound.length > 0 ? inbound : coastal.slice(0, 4)} />
    </section>
  );
}

function AssessmentBlock({ title, rows }: { title: string; rows: TheOneOperation[] }) {
  return (
    <div className="desktop-table-scroll">
      <table className="desktop-assessment-table">
        <thead>
          <tr>
            <th rowSpan={2}>구분</th>
            <th colSpan={2}>기상</th>
            <th colSpan={2}>해상</th>
            <th colSpan={3}>지역</th>
            <th colSpan={2}>환경조건</th>
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
            <th>취약시기</th>
            <th>시정조건</th>
          </tr>
          <tr className="desktop-section-row">
            <th colSpan={11}>{title}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((operation) => {
            const data = operation.coastal;
            const weather = operation.coastalEnvironment?.weatherStatus ?? "맑음";
            if (!data) return null;

            return (
              <tr key={`${title}-${operation.id}`}>
                <th>{cleanName(operation)}</th>
                <td>{weather}</td>
                <td>{data.weatherAlert}</td>
                <td>{data.nearshoreWaveHeightM}m</td>
                <td>{data.offshoreWaveHeightM}m</td>
                <td>{data.tideAge}</td>
                <td>{data.currentDirection} {data.currentSpeedKt}kt</td>
                <td>{data.waterTempC}℃</td>
                <td>{data.currentTime}</td>
                <td>{data.visibilityKm}km</td>
                <td><span className={cx("desktop-judge", statusText(operation).includes("주의") || statusText(operation).includes("저시정") ? "is-watch" : "")}>{statusText(operation)}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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

function DesktopSettings({
  catalog,
  selectedIds,
  activeType,
  onTypeChange,
  onToggle,
  onClear,
  onDefault,
  onSelectAllType,
}: {
  catalog: TheOneOperation[];
  selectedIds: string[];
  activeType: OperationType;
  onTypeChange: (type: OperationType) => void;
  onToggle: (id: string) => void;
  onClear: () => void;
  onDefault: () => void;
  onSelectAllType: () => void;
}) {
  const candidates = catalog.filter((operation) => operation.type === activeType);
  const grouped = new Map<string, TheOneOperation[]>();

  candidates.forEach((operation) => {
    const groupName = operation.area.split("·")[0]?.trim() || operationConfigs[operation.type].title;
    grouped.set(groupName, [...(grouped.get(groupName) ?? []), operation]);
  });

  return (
    <section className="desktop-settings-grid">
      <div className="desktop-panel">
        <h2>지역 설정</h2>
        <DesktopTypeSwitch activeType={activeType} onTypeChange={onTypeChange} />
        <div className="desktop-settings-actions">
          <button type="button" onClick={onSelectAllType}>현재 분류 전체</button>
          <button type="button" onClick={onDefault}>기본값</button>
          <button type="button" onClick={onClear}>전체 초기화</button>
        </div>
      </div>
      <div className="desktop-catalog-panel">
        {[...grouped.entries()].map(([groupName, items]) => (
          <details key={groupName} open={groupName.includes("충청") || groupName.includes("서산")}>
            <summary>
              <strong>{groupName}</strong>
              <span>{items.length}</span>
            </summary>
            <div className="desktop-catalog-grid">
              {items.map((operation) => {
                const checked = selectedIds.includes(operation.id);
                const Icon = operationIcon(operation.type);

                return (
                  <button key={operation.id} type="button" className={checked ? "is-selected" : ""} onClick={() => onToggle(operation.id)}>
                    <Icon size={18} />
                    <span>{operation.name}</span>
                    {checked && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </details>
        ))}
      </div>
      <div className="desktop-panel desktop-source-panel">
        <h2>연동 출처</h2>
        <div>
          <span>기상청</span>
          <strong>단기예보 · 초단기실황 · 기상특보 · 해양기상</strong>
        </div>
        <div>
          <span>해양</span>
          <strong>국립해양조사원 조석예보</strong>
        </div>
        <div>
          <span>천문</span>
          <strong>한국천문연구원 출몰시각</strong>
        </div>
        <div>
          <span>환경</span>
          <strong>에어코리아 대기질</strong>
        </div>
      </div>
    </section>
  );
}
