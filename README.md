# 백룡 AI The One

백룡 AI The One은 해안·지상·공중 작전기상을 한 화면에서 확인하는 모바일 우선 정적 웹앱입니다. 서버, DB, 외부 AI 호출 없이 GitHub Actions가 만든 기상 JSON 캐시를 우선 사용하고, 공식 자료가 없을 때는 공개 가능한 fallback 값으로 지역 목록, 지도, 개황, 객관 지표를 표시합니다.

## 하위 체계

- 해안작전: 해양·조석·시정 관련 관측값과 해상 개황 표시
- 지상작전: 기온·습도·강수·대기질·산불 관련 관측값 표시
- 공중작전: 풍속·돌풍·운고·시정·난류 관련 관측값 표시

## 주요 기능

- 작전 선택 화면, 작전별 대시보드
- 지역/임무 목록과 Windy 지도 중심 첫 화면
- 사전 등록 후보 검색 및 그룹별 지역/임무 추가
- 개황 카드, 원형 지표 그래프, 시간대별 선형 그래프
- 개황 옆 실시간 탭에서 Windy 지도와 기상청/해양기상 지도 확인
- 상단 뉴스형 알림 배너와 브라우저별 알림 기록
- 입력 지역/임무와 핵심 기상값 LocalStorage 저장
- GitHub Pages 같은 정적 호스팅 배포 가능
- GitHub Actions 기반 JSON 캐시 갱신 구조

## 객관 지표 구조

현재 모바일 화면은 자동 판단 문구를 만들지 않고, 관측값에서 파생되는 객관 지표를 각각 표시합니다.

1. 작전 유형별 mock 관측 데이터 로드
2. 지역/임무 목록과 지도 위치 표시
3. 선택 지역의 개황 표시
4. 작전 유형별 핵심 지표 4개를 원형 그래프로 표시
5. 시간대별 변화는 선형 그래프로 표시

현재 표시 지표 예시는 다음과 같습니다.

- 해안작전: 앞바다/먼바다 파고, 해수온도, 월광, 조석, BMNT/EENT, 이안류 위험지수, 풍랑특보, 해무 위험도, 해상위험지수
- 지상작전: 기온, 습도, 지상풍/상층풍, BMNT/EENT, 온열지수, 불쾌지수, 체감온도, 통합대기환경지수, 산불위험지수
- 공중작전: 드론 운용 기준의 풍속, 돌풍, 운고, 시정, 저고도 고도별 기상, 드론운용지수, 저시정 위험도, 난류·돌풍지수, 착빙지수, 낙뢰위험도

기본 mock 데이터는 `src/lib/the-one-data.ts`에 있으며, `src/lib/the-one-engine.ts`는 모바일 앱에서 사용하는 데이터 타입을 정의합니다.

## 실시간 캐시와 알림

정적 사이트는 브라우저에서 운영 API 키를 직접 보유하지 않습니다. 대신 GitHub Actions가 `npm run update:weather-cache`를 실행해 `public/data/weather-cache.json`을 생성하고, 화면은 이 JSON을 1분 간격으로 확인합니다.

- 기본 구조: `scripts/update-weather-cache.mjs`
- 출력 위치: `public/data/weather-cache.json`
- 화면 기능: 상단 뉴스형 배너, 알림 기록, 작전 유형별 필터링
- 연동 방식: GitHub Secrets 또는 내부망 변환 서버에서 API 키를 사용하고, 결과 JSON만 정적 사이트로 전달

현재 스크립트는 `WEATHER_CACHE_SOURCE_URL`이 있으면 준비된 JSON을 가져오고, 없으면 GitHub Secrets에 등록된 공공 API를 직접 호출합니다. API 키가 없거나 기관 승인 전 자료는 공개 가능한 fallback 캐시와 계산 보정값으로 화면을 유지합니다. 실제 기상청·해양·천문·대기질 API를 붙일 때도 프론트엔드 코드에는 키를 넣지 않습니다.

현재 공식 수신하도록 준비된 API는 다음과 같습니다.

- 기상청 단기예보 조회서비스 초단기실황/초단기예보: 기온, 강수량, 습도, 풍향, 풍속, 날씨 상태
- 기상청 ASOS 시간자료: 시정, 기온, 습도, 풍향, 풍속, 강수량 보강
- 한국환경공단 에어코리아 측정소별 실시간 측정정보: PM10, PM2.5 등급
- 한국천문연구원 출몰시각: 일출, 일몰, 월출, 월몰, BMNT, EENT 후보
- 국립해양조사원 조석예보: 관측소 코드가 설정된 항구의 만조, 간조
- 국립해양조사원 조류예보 시계열: 유향, 유속
- 국립해양조사원 조위관측소 최신 관측데이터/실측 수온: 수온, 조위관측 기반 해양 보강값

갱신 주기는 값의 변동성과 GitHub Actions 운용 제한을 기준으로 나눕니다.

- 특보/속보: 기상청 기상특보 조회서비스, 5분 간격
- 일반 실황: 초단기실황/예보, ASOS, 에어코리아, 조류/수온/조위 최신 관측, 30분 간격
- 천문/조석: 한국천문연구원 출몰시각과 국립해양조사원 조석예보, 하루 2회

추가 연동 대기 API는 다음 Secrets 이름으로 분리해 둡니다. 키 값은 GitHub 저장소에 커밋하지 않고, GitHub Actions Secrets 또는 내부망 변환 서버 환경변수로만 관리합니다.

- `KMA_WARNING_SERVICE_KEY`: 기상청 기상특보 조회서비스
- `KMA_ASOS_SERVICE_KEY`: 기상청 지상(종관, ASOS) 시간자료 조회서비스
- `KHOA_CURRENT_SERVICE_KEY`: 국립해양조사원 조류예보 시계열
- `KHOA_TIDE_RECENT_SERVICE_KEY`: 국립해양조사원 조위관측소 최신 관측데이터
- `KHOA_WATER_TEMP_SERVICE_KEY`: 국립해양조사원 조위관측소 실측 수온 조회
- `KMA_WIND_PROFILER_SERVICE_KEY`: 기상청 연직바람관측 APIHub
- `KMA_AVIATION_SERVICE_KEY`: 기상청 항공기상전문 조회서비스
- `KMA_ROAD_WEATHER_SERVICE_KEY`: CCTV 기반 도로날씨정보 조회서비스
- `KMA_RADAR_SERVICE_KEY`: 기상청 레이더영상 조회서비스
- `KMA_LIFE_INDEX_SERVICE_KEY`: 기상청 생활기상지수 조회서비스
- `KMA_TYPHOON_SERVICE_KEY`: 기상청 태풍정보 조회서비스
- `KMA_IMPACT_FORECAST_SERVICE_KEY`: 기상청 영향예보 조회서비스
- `KMA_GTS_SERVICE_KEY`: 기상청 세계기상전문 조회서비스
- `KMA_LIGHTNING_SERVICE_KEY`: 기상청 낙뢰관측자료 조회서비스
- `KMA_SATELLITE_SERVICE_KEY`: 기상청 위성영상 조회서비스
- `KMA_UPPER_AIR_SERVICE_KEY`: 기상청 고층기상 자료
- `KMA_BEACH_WEATHER_SERVICE_KEY`: 전국 해수욕장 날씨 조회서비스

현재 대체 표시 중인 항목은 다음과 같습니다.

- 파고, 파주기, 파향, 먼바다 파고: 기상청 해양기상관측자료 기관 승인 전까지 기상청 초단기 풍속·강수 기반 추정값
- 상층풍, 돌풍, 난류, 운고: 고층기상·연직바람·항공기상 지점 매핑 전까지 지상풍 기반 보정값
- 체감온도, WBGT, 일부 생활기상지수: 생활기상지수 세부 연동 전까지 기온·습도·풍속 기반 계산값
- 기관 승인 전 관측소 값: 기존 캐시 또는 fallback 값으로 표시

## 정적 운용 원칙

이 프로젝트는 프론트엔드 단독 실행을 기준으로 합니다.

- 백엔드 서버 사용 금지
- DB 사용 금지
- 외부 AI API 사용 금지
- API 키 프론트엔드 코드 삽입 금지
- 기본 기능은 네트워크 요청 없이 mock 데이터로 동작

공공 API 키가 필요한 경우 GitHub Pages 프론트엔드에 직접 삽입하지 말고, GitHub Actions, 서버리스 함수, 내부망 API 서버 등을 통해 JSON으로 변환한 뒤 정적 사이트가 해당 JSON만 읽도록 구성해야 한다.

## 개인화 저장

현재 개인 설정은 IP 기준이 아니라 접속한 기기와 브라우저의 LocalStorage 기준으로 분리됩니다. 같은 URL에 여러 사람이 접속하더라도 각자의 브라우저 저장소가 다르면 지역/임무 설정도 따로 유지됩니다.

IP별 설정이 반드시 필요하다면 정적 사이트만으로는 안전하게 구현하기 어렵고, 서버리스 함수나 내부망 API 서버가 필요합니다.

## 실행

```bash
npm install
npm run dev
```

기본 주소는 [http://localhost:3000](http://localhost:3000)입니다. 다른 포트가 필요하면 다음처럼 실행합니다.

```bash
npm run dev -- --port 3001
```

## 정적 빌드

```bash
npm run build
npm run start
```

GitHub Pages 하위 경로에 배포할 때는 저장소 페이지 경로에 맞춰 `NEXT_PUBLIC_BASE_PATH`를 지정합니다.

```bash
NEXT_PUBLIC_BASE_PATH=/Maritime-Intrusion-Assessment-Dashboard npm run build
```

## GitHub Actions 배포

`.github/workflows/pages.yml`은 `main` 푸시, 수동 실행, 특보 5분 주기, 일반 실황 30분 주기, 천문·조석 하루 2회 주기에서 다음 순서로 동작합니다.

1. 의존성 설치
2. 기상 JSON 캐시 생성
3. 정적 사이트 빌드
4. GitHub Pages 배포

Actions Secrets에 `PUBLIC_DATA_SERVICE_KEY`, `KMA_SERVICE_KEY`, `KMA_WARNING_SERVICE_KEY`, `KMA_ASOS_SERVICE_KEY`, `KHOA_SERVICE_KEY`, `KHOA_CURRENT_SERVICE_KEY`, `KHOA_TIDE_RECENT_SERVICE_KEY`, `KHOA_WATER_TEMP_SERVICE_KEY`, `KASI_SERVICE_KEY`, `AIRKOREA_SERVICE_KEY`, `KHOA_TIDE_OBS_CODE_SEOSAN`, `KHOA_TIDE_OBS_CODE_DANGJIN`, `KHOA_TIDE_OBS_CODE_TAEAN`, `KHOA_TIDE_OBS_CODE_BORYEONG` 등을 넣으면 실제 캐시 갱신에 사용됩니다. 조류·수온 지점 코드가 조석 코드와 다르면 `KHOA_CURRENT_OBS_CODE_*`, `KHOA_TEMP_OBS_CODE_*`를 별도로 넣습니다. 추가 API는 위 `KMA_*_SERVICE_KEY` 이름으로 넣습니다. `WEATHER_CACHE_SOURCE_URL`을 넣으면 내부 변환 서버가 만든 JSON을 우선 사용합니다.

## 보안 주의

- 실제 작전 좌표 사용 금지
- 실제 감시장비 좌표 노출 금지
- API 키 프론트엔드 노출 금지
- 민감한 내부 정보는 권역 단위로 추상화
- 공개 저장소에는 공개 가능한 시연 데이터만 포함

## 자산

- `public/assets/22.svg`: 백룡 로고
- `public/assets/mode-coastal.svg`: 해안작전 아이콘
- `public/assets/mode-land.svg`: 지상작전 아이콘
- `public/assets/mode-air.svg`: 공중작전 아이콘
