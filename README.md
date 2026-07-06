# 이슬로 베이비 미니게임 (프로토타입)

베이비페어 현장 고객 참여용 플래시형 미니게임.
현재 버전은 **v0.2.8 — 팀 내부 공유용 프로토타입**입니다.
브랜드 표기는 `eslo`(영문) / `이슬로`(한글)로 통일합니다.

> 📌 **개발 가이드는 [CLAUDE.md](CLAUDE.md) 참고** — 이 프로젝트를 이어서 작업하기 전에
> 반드시 먼저 읽어야 하는 유지 원칙·구조·버전 규칙이 정리되어 있습니다.
(디자인 완성본이 아니라 **게임 흐름/UX 확인**이 목적. 에셋은 Placeholder)

---

## 0. 온라인 접속 · 공유 (v0.2.6~)

### 접속 링크
- **게임 바로가기**: https://manzzi3215-droid.github.io/eslobaby-game2/
- **공유용 QR 페이지**: https://manzzi3215-droid.github.io/eslobaby-game2/share.html
  - 화면에 접속 QR·URL·"게임 바로가기" 버튼이 표시됩니다. 회사 내부 공유·현장 테스트·모바일 안내용.
  - QR은 **외부 라이브러리 없이** 페이지에서 실시간 생성됩니다(오프라인 OK).
    실제 QR 이미지를 쓰려면 `assets/qr/share-qr.png` 를 넣으면 자동으로 그 이미지로 교체됩니다.

### 모바일 접속 방법
1. 위 **공유 페이지**를 열고 QR을 스캔하거나, "게임 바로가기" 버튼을 누릅니다.
2. 또는 게임 URL을 모바일 브라우저 주소창에 직접 입력합니다.
3. 세로/가로 모드 모두 지원하며, 세로에서는 모바일 게임형 배치로 자동 전환됩니다.

### 홈 화면에 추가 (앱처럼 사용 · PWA)
- **iOS (Safari)**: 게임 페이지에서 **공유 버튼(⬆)** → **홈 화면에 추가** → 추가.
  홈 화면 아이콘 이름은 **이슬로게임** 으로 표시됩니다.
- **Android (Chrome)**: 우측 상단 **⋮ 메뉴** → **홈 화면에 추가**(또는 **앱 설치**) → 추가.
- 추가 후 아이콘을 누르면 주소창 없이 **앱처럼 전체화면(standalone)** 으로 실행됩니다.

### 배포 방식 — GitHub Actions Pages
- 배포는 **GitHub Actions**(`.github/workflows/pages.yml`)로 자동화되어 있습니다.
  (저장소 Settings → Pages → Source = **GitHub Actions**)
- 정적 사이트이므로 별도 빌드 없이 저장소 전체를 그대로 배포합니다.
  (Jekyll 처리 방지를 위해 root에 `.nojekyll` 포함)

### 수정 후 배포 방법
1. 파일을 수정하고 커밋합니다.
2. `master` 브랜치에 **push** 하면 GitHub Actions가 자동으로 배포합니다.
   ```
   git add .
   git commit -m "설명"
   git push origin master
   ```
3. Actions 탭에서 "Deploy static site to GitHub Pages" 워크플로우가 성공(초록)하면
   위 접속 링크에 반영됩니다. (반영까지 보통 1~2분)
- PWA 캐시(서비스워커) 때문에 갱신이 늦게 보이면, 게임 내용 변경 시
  `sw.js` 의 `CACHE_NAME` 버전을 올리면 새로 캐싱됩니다.

---

## 1. 프로젝트 폴더 구조

```
eslobaby-game/
├── index.html          진입점 (이 파일을 열면 실행) · PWA 메타·서비스워커 등록 포함
├── share.html          ⭐ 공유용 QR 페이지 (v0.2.6~)
├── manifest.webmanifest PWA 매니페스트 (앱 이름·아이콘·테마색) (v0.2.6~)
├── sw.js               서비스워커 (기본 오프라인 캐싱) (v0.2.6~)
├── .nojekyll           GitHub Pages Jekyll 처리 방지 (js/·css/ 폴더 정상 서빙)
├── config.js           ⭐ 에셋 경로 · 문구 · 타이밍 (교체는 대부분 여기)
├── css/
│   ├── reset.css       브라우저 기본 초기화
│   ├── theme.css       ⭐ 색상 · 폰트 · 크기 토큰 (톤 변경은 여기)
│   ├── game.css        레이아웃 · 장면 스타일 · 애니메이션
│   └── share.css       공유 페이지 전용 스타일 (v0.2.6~)
├── js/
│   ├── components.js   Placeholder/버튼/멘트 등 재사용 컴포넌트
│   ├── scenes.js       ⭐ 장면(Scene)의 순서·타입·문구 데이터
│   ├── interactions.js 드래그/터치(문지르기) 처리
│   ├── game.js         게임 엔진 (장면 전환·렌더링)
│   ├── main.js         초기화 진입점
│   ├── qrcode.js       외부 라이브러리 없는 QR 코드 생성기 (v0.2.6~)
│   └── share.js        공유 페이지 로직 (URL 표시·QR 삽입) (v0.2.6~)
├── assets/
│   ├── images/         제품·캐릭터·로고·돋보기 등 이미지 (지금은 비어있음)
│   ├── icons/          PWA 아이콘 (icon.svg — placeholder, PNG로 교체 가능) (v0.2.6~)
│   └── qr/             카카오 채널 QR · 공유 QR(share-qr.png 넣으면 자동 교체)
├── .github/workflows/
│   └── pages.yml       GitHub Actions Pages 자동 배포 워크플로우
├── CHANGELOG.md        버전별 변경 기록
└── README.md           이 문서
```

**설계 핵심**: UI(그리기)와 게임 로직을 분리하고, 이미지·텍스트·색상·타이밍을
모두 외부(config.js / theme.css / scenes.js)에서 교체할 수 있게 구성했습니다.

---

## 2. 실행 방법

### 가장 간단한 방법 (오프라인 OK)
`index.html` 파일을 **더블클릭**하면 브라우저에서 바로 실행됩니다.
인터넷 연결이 없어도 동작합니다. (별도 설치·서버 불필요)

### 태블릿/노트북 현장 사용
- 브라우저를 **전체화면(F11)** 으로 두고 사용하세요.
- 터치와 마우스 모두 지원합니다.

### 모바일 / 세로 모드 (v0.2.2~)
- 모바일 브라우저에서도 같은 `index.html` 로 실행됩니다.
- **가로 모드**: 배경 위에 콘텐츠가 올라가는 카드뉴스형 화면 (v0.2.7~).
- **세로 모드**: 위→아래로 흐르는 모바일 게임형 배치로 자동 전환되고,
  화면이 답답하면 세로 스크롤이 허용됩니다. 이미지는 비율을 유지한 채 축소됩니다.

### 화면 형태 — 카드뉴스형 (v0.2.8 레퍼런스 반영)
- 각 장면은 **약간 투명한 화이트/블루 카드**(얇은 하늘색 테두리 · 둥근 모서리 · 부드러운 그림자)로
  구성됩니다. 완전 흰색이 아니라 반투명이라 욕실 배경·거품이 은은하게 비칩니다. (레퍼런스 톤)
- **카드 상단 헤더**: 좌측 "🏠 처음으로" 미니 버튼(사용자용) + 중앙 STEP/MISSION 배지.
  (게이트 화면에는 헤더 없음)
- **카드 하단**: 작은 원형 페이지 점(현재 페이지 진한 파랑) — 카드뉴스 슬라이드 느낌.

### 현장 조작 (좌측 컨트롤 / v0.2.2~, 운영자용 고정 컨트롤)
게임 중 화면 왼쪽(세로 모드에서는 하단 중앙)에 컨트롤 버튼 4개가 표시됩니다.
(사용자용 "처음으로"·페이지 점은 카드 안쪽에 별도로 있습니다 — v0.2.8)

| 버튼 | 동작 |
|---|---|
| 🏠 처음으로 | 모든 상태 초기화 후 카카오 채널 게이트로 복귀 (다음 고객 응대용) |
| ▶ 플레이 | 정지로 멈춘 자동 진행을 재개 |
| ⏸ 정지 | **자동 장면 전환만** 일시정지 (드래그 조작은 계속 가능) |
| → 다음 | 자동 진행 대기 없이 **현재 장면을 건너뛰고 즉시 다음 장면으로** (파란 화살표 강조, 마지막 장면에서는 비활성화) |

### STEP 표시 방식 (v0.2.5~, v0.2.8 카드 헤더/하단 점)
- **STEP은 실제 체험 단계 3개만 존재**합니다: `STEP1`(바디워시) / `STEP2`(이슬로) / `STEP3`(샤워).
  해당 카드 상단 헤더 중앙에 진한 파랑 STEP 배지가 표시됩니다.
- MISSION 화면은 `MISSION`, MISSION 성공 화면은 `MISSION 성공!` 배지.
  설명 화면·최종 브랜드 화면에는 배지를 표시하지 않습니다.
- **카드 하단 페이지 점**은 `MISSION → STEP1 → STEP2 → STEP3 → MISSION 성공!`
  5개를 작은 원으로 표시하며, 현재 페이지만 진한 파랑입니다.
- 전체 흐름: ①카카오 게이트 ②MISSION ③STEP1 바디워시(게이지 0→100%)
  ④민감도 100% 경고(게이지만) ⑤나쁜 계면활성제 설명 ⑥이슬로 소개
  ⑦STEP2 이슬로 사용(게이지 100→50%·계면이 절반 제거) ⑧STEP3 샤워(게이지 50→0%·계면이 모두 제거)
  ⑨MISSION 성공!(웃는 아이+반짝임) ⑩최종 브랜드 페이지(제품 3종)
- **게이지 색상 규칙**: 0% 파랑 → 50% 주황 → 100% 빨강

### 페이지 클릭 이동 (테스트/시연용 / v0.2.2~)
- 카드 하단 페이지 점(MISSION/STEP1~3/MISSION 성공!)을 누르면 해당 구간의 첫 장면으로 바로 이동합니다.
  (게이지·계면이 상태는 이동한 장면에 맞게 자동 세팅)
- `index.html?step=N` 처럼 열면 해당 장면에서 바로 시작합니다.
  (N은 내부 장면 번호: 1=게이트, 2=MISSION, 3=STEP1, 4=경고, 5=계면활성제 설명,
  6=이슬로 소개, 7=STEP2, 8=STEP3, 9=MISSION 성공, 10=최종 브랜드)
- ★ **실제 행사 운영 전 잠금**: `config.js` → `options.stepNavigationEnabled: false`
  로 바꾸면 클릭·`?step=` 이동이 모두 비활성화됩니다.

> 일부 브라우저에서 `file://` 로 열 때 이미지가 안 보이면,
> 아래처럼 간단한 로컬 서버로 열면 확실합니다. (선택 사항)
> - Node 설치 시: `npx serve .`
> - Python 설치 시: `python -m http.server 4321` → `http://localhost:4321`

---

## 3. 나중에 이미지 교체하는 방법

**코드 수정 없이 파일만 넣으면 됩니다.** 이미지가 없으면 Placeholder가 뜨고,
아래 경로에 파일이 존재하면 자동으로 실제 이미지로 바뀝니다.

| 항목 | 넣을 위치(파일명) |
|---|---|
| 카카오 QR | `assets/qr/kakao-qr.png` |
| 이슬로 로고 | `assets/images/logo.png` |
| 아이 캐릭터(평상시) | `assets/images/child.png` |
| 아이 캐릭터(울상) | `assets/images/child-sad.png` |
| 아이 캐릭터(미소) | `assets/images/child-happy.png` |
| 배경(선택) | `assets/images/background.png` |
| 돋보기 | `assets/images/magnifier.png` |
| 거품(선택) | `assets/images/bubble.png` |
| 경고등/비상등 | `assets/images/warning-light.png` |
| 계면이 캐릭터 | `assets/images/surfactant.png` |
| 일반 바디워시 | `assets/images/bodywash.png` |
| 샤워기 | `assets/images/shower.png` |
| eslo 바스앤샴푸 | `assets/images/eslo-bath.png` |
| 엉덩이 클렌저 | `assets/images/eslo-cleanser.png` |
| 로션 | `assets/images/eslo-lotion.png` |

> **신규 에셋**: (v0.1.1) `child-sad.png`, `warning-light.png`, `surfactant.png` /
> (v0.2.0) `child-happy.png`. 없으면 간단 일러스트(SVG) Placeholder로 표시됩니다.
>
> 현재 Placeholder는 v0.2.0부터 **간단 일러스트(SVG)** 로 그려집니다.
> 그림 모양을 바꾸려면 `js/components.js` 의 `SHAPES` 를 수정하세요.

- **파일명을 위와 동일하게** 하면 config 수정도 필요 없습니다.
- 다른 이름을 쓰고 싶으면 `config.js` 의 `assets` 경로만 바꾸세요.
- 권장: 배경 투명 PNG, 제품/캐릭터는 세로로 긴 형태가 잘 맞습니다.

---

## 4. 수정이 필요할 때 파일 위치 안내

| 무엇을 바꾸고 싶을 때 | 어디를 수정 |
|---|---|
| 이미지 / QR / 로고 교체 | `assets/` 에 파일 넣기 (필요시 `config.js`) |
| 멘트·안내 문구 수정 | `config.js` → `texts` |
| 자동 전환 속도, 드래그 난이도 | `config.js` → `timings`, `options` |
| STEP 클릭 이동 잠금(행사용) | `config.js` → `options.stepNavigationEnabled` |
| 게이지 색상·경고 임계값·계면이 수 | `config.js` → `gauge` |
| "처음으로"·게이지 라벨 문구 | `config.js` → `texts.homeButton`, `texts.gauge` |
| 색상 톤(블루/민트) 변경 | `css/theme.css` → `:root` 변수 |
| 글자 크기·버튼 크기 | `css/theme.css` → `--fs-*`, `--btn-min-h` |
| 장면 순서 추가/변경 | `js/scenes.js` (배열 수정) |
| 인터랙션 동작(문지르기) 로직 | `js/interactions.js` |
| Placeholder 일러스트(SVG) 모양 | `js/components.js` → `SHAPES` |
| 장면 그리는 방식(렌더링) | `js/game.js` |
| 애니메이션 | `css/game.css` (`@keyframes`) |

---

## 5. 버전 관리 규칙

- 매 작업 종료 시 `CHANGELOG.md` 에 변경 사항을 기록하고 버전을 올립니다.
  (v0.1.0 → 기능 추가 v0.2.0 / 버그 수정 v0.1.1)
- **기존 기능은 삭제하지 않고 추가·개선 방식**으로 발전시킵니다.

---

## 6. 다음 단계(예정) — 이번 버전 미포함
실제 제품 이미지 · 실제 QR · 실제 캐릭터 · 효과음 · 정교한 애니메이션 ·
세부 연출 · 최종 디자인.
