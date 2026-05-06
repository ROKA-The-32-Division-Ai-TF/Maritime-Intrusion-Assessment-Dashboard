# 제32보병사단 밀입국 가능성 판단 지원 체계

GitHub Pages에서 정적으로 운용할 수 있는 밀입국 가능성 판단 지원 대시보드입니다. 첨부 시안의 로그인 화면과 대시보드 구성을 기준으로 `#254aa5` 색상, SVG 헤더 로고, 지역별 실시간 날씨 카드, 기상제원 표, 지도 패널을 반영했습니다.

## 실행

```bash
npm install
npm run dev
```

로컬 확인 주소는 기본적으로 [http://localhost:3000](http://localhost:3000)입니다. 이미 사용 중인 포트가 있으면 `npm run dev -- --port 3001`처럼 다른 포트를 지정합니다.

## 정적 빌드

```bash
npm run build
npm run start
```

`npm run build`는 Next.js static export를 수행하고 `out/` 폴더를 생성합니다. `npm run start`는 생성된 `out/` 폴더를 정적 서버로 확인합니다.

## GitHub Pages

`.github/workflows/pages.yml`이 포함되어 있습니다. `main` 브랜치에 push하면 GitHub Actions가 정적 사이트를 빌드하고 GitHub Pages에 배포합니다.

대상 저장소:

```text
https://github.com/ROKA-The-32-Division-Ai-TF/Maritime-Intrusion-Assessment-Dashboard
```

프로젝트 페이지 경로에 맞춰 workflow에서 다음 값을 사용합니다.

```text
NEXT_PUBLIC_BASE_PATH=/Maritime-Intrusion-Assessment-Dashboard
```

GitHub 저장소의 Pages 설정에서 Source를 `GitHub Actions`로 지정하면 됩니다.

## API 구성

정적 사이트이므로 브라우저에서 직접 API를 호출합니다. `.env.example`의 `NEXT_PUBLIC_*` 값을 사용하며, 값이 없거나 CORS/인증 오류가 있으면 당진·태안·보령·서천 고정 기준값을 표시합니다.

- 기상청: 풍향, 풍속, 파고, 수온, 특보, 바다날씨
- 국립해양조사원: 조석, 물때, 간조, 만조, 조류
- 국립수산과학원: 수온/해양환경 보조 검증
- 한국천문연구원: 일출, 일몰, 월출, 월몰
- Windy Point Forecast: API 키 설정 시 시간별 풍향, 풍속, 파고, 파향, 파주기 우선 반영

정적 클라이언트에 넣는 키는 사용자 브라우저에 노출됩니다. 비공개 운영키가 필요하면 GitHub Pages 앞단에 별도 프록시/API 서버를 두는 구성이 필요합니다.

## 자산

- `public/assets/32div-emblem.png`: 제32보병사단 엠블럼
- `public/assets/22.svg`: 헤더용 SVG 로고
- `public/assets/baekryong-logo.gif`: 제공된 gif 로고 자산. 현재 헤더에는 사용하지 않습니다.
- `public/assets/reference-login.png`: 로그인 시안 참고 이미지
- `public/assets/reference-dashboard.png`: 대시보드 시안 참고 이미지
