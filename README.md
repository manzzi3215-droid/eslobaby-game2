# 이슬로 베이비 미니게임 (프로토타입)

베이비페어 현장 고객 참여용 플래시형 미니게임.
현재 버전은 **v0.2.4 — 팀 내부 공유용 프로토타입**입니다.
브랜드 표기는 `eslo`(영문) / `이슬로`(한글)로 통일합니다.

> 📌 **개발 가이드는 [CLAUDE.md](CLAUDE.md) 참고** — 이 프로젝트를 이어서 작업하기 전에
> 반드시 먼저 읽어야 하는 유지 원칙·구조·버전 규칙이 정리되어 있습니다.
(디자인 완성본이 아니라 **게임 흐름/UX 확인**이 목적. 에셋은 Placeholder)

---

## 1. 프로젝트 폴더 구조

```
eslobaby-game/
├── index.html          진입점 (이 파일을 열면 실행)
├── config.js           ⭐ 에셋 경로 · 문구 · 타이밍 (교체는 대부분 여기)
├── css/
│   ├── reset.css       브라우저 기본 초기화
│   ├── theme.css       ⭐ 색상 · 폰트 · 크기 토큰 (톤 변경은 여기)
│   └── game.css        레이아웃 · 장면 스타일 · 애니메이션
├── js/
│   ├── components.js   Placeholder/버튼/멘트 등 재사용 컴포넌트
│   ├── scenes.js       ⭐ 12개 장면의 순서·타입·문구 데이터
│   ├── interactions.js 드래그/터치(문지르기) 처리
│   ├── game.js         게임 엔진 (장면 전환·렌더링)
│   └── main.js         초기화 진입점
├── assets/
│   ├── images/         제품·캐릭터·로고·돋보기 등 이미지 (지금은 비어있음)
│   └── qr/             카카오 채널 QR (지금은 비어있음)
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
- **가로 모드**: 기존 카드형 UI 그대로.
- **세로 모드**: 위→아래로 흐르는 모바일 게임형 배치로 자동 전환되고,
  화면이 답답하면 세로 스크롤이 허용됩니다. 이미지는 비율을 유지한 채 축소됩니다.

### 현장 조작 (좌측 컨트롤 / v0.2.2~)
게임 중 화면 왼쪽(세로 모드에서는 하단)에 컨트롤 버튼 3개가 표시됩니다.

| 버튼 | 동작 |
|---|---|
| 🏠 처음으로 | 모든 상태 초기화 후 카카오 채널 게이트로 복귀 (다음 고객 응대용) |
| ▶ 플레이 | 정지로 멈춘 자동 진행을 재개 |
| ⏸ 정지 | **자동 장면 전환만** 일시정지 (드래그 조작은 계속 가능) |

### STEP 표시 방식 (v0.2.3~)
- **현재 장면의 STEP 배지**는 각 카드 상단 중앙에 파란 배지(예: `STEP 3`)로 크게 표시됩니다.
- **좌측 상단의 작은 점(dash) 줄**은 전체 진행 보조 표시입니다 —
  현재 단계만 진한 파랑(길게), 지난 단계는 연한 파랑으로 표시됩니다.
- 게임은 **총 10 STEP**: ①카카오 게이트 ②오프닝 ③일반 바디워시 ④민감도 100% 경고
  ⑤왜 그런지 살펴보기 ⑥나쁜 계면활성제 확인 ⑦이슬로는 달라요 ⑧이슬로 제품 사용
  ⑨샤워기로 헹구기 ⑩깨끗해진 피부+3종 엔딩

### STEP 클릭 이동 (테스트/시연용 / v0.2.2~)
- 좌측 상단 진행 점을 누르면 해당 장면으로 바로 이동합니다. (마우스를 올리면 STEP 번호 툴팁)
  (게이지·계면이 상태는 이동한 장면에 맞게 자동 세팅)
- `index.html?step=7` 처럼 열면 해당 STEP에서 바로 시작합니다.
- ★ **실제 행사 운영 전 잠금**: `config.js` → `options.stepNavigationEnabled: false`
  로 바꾸면 점 클릭·`?step=` 이동이 모두 비활성화됩니다.

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
