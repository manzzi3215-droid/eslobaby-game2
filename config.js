/* =============================================================================
 * config.js  —  프로젝트 전역 설정 (교체/수정은 대부분 이 파일에서만)
 * -----------------------------------------------------------------------------
 * 나중에 실제 에셋이 준비되면 아래 경로에 같은 위치로 파일만 넣으면 됩니다.
 * 코드는 수정할 필요가 없습니다.
 *
 *   - 이미지 교체 : assets/ 폴더에 파일을 넣고 아래 ASSETS 경로만 확인
 *   - QR 교체     : assets/qr/kakao-qr.png 를 넣으면 자동 반영
 *   - 배경 교체   : assets/images/background.png 를 넣으면 욕실 배경으로 자동 반영
 *   - 문구 수정   : 아래 TEXTS 값만 수정
 *   - 색상 수정   : css/theme.css 의 :root 변수에서 수정
 *   - 타이밍 수정 : 아래 TIMINGS 값(ms)만 수정
 *   - 게이지 색   : 아래 gauge.colorStops 배열만 수정
 *
 * 이미지 파일이 아직 없으면 자동으로 Placeholder(간단 일러스트)가 표시됩니다.
 * 브랜드명 표기는 반드시 "eslo" 로 통일합니다.
 * ========================================================================== */

window.ESLO_CONFIG = {
  /* --- 프로젝트 메타 --------------------------------------------------- */
  meta: {
    version: 'v0.2.2',
    title: '이슬로(eslo) 베이비 미니게임',
  },

  /* --- 에셋 경로 -------------------------------------------------------
   * 값이 비어있거나("") 파일이 없으면 Placeholder(일러스트)가 대신 표시됩니다.
   * ------------------------------------------------------------------- */
  assets: {
    qr:        'assets/qr/kakao-qr.png',        // 카카오 채널 QR
    logo:      'assets/images/logo.png',        // eslo 로고
    child:     'assets/images/child.png',       // 아이 캐릭터 (평상시)
    childSad:  'assets/images/child-sad.png',   // 아이 캐릭터 (울상)
    childHappy:'assets/images/child-happy.png', // 아이 캐릭터 (웃는 얼굴)
    background:'assets/images/background.png',   // 욕실 배경 (비우면 SVG 욕실 연출)
    magnifier: 'assets/images/magnifier.png',   // 돋보기 (현재 흐름 미사용)
    bubble:    'assets/images/bubble.png',      // 거품 (비우면 도형 거품)
    warningLight: 'assets/images/warning-light.png', // 경고등/비상등 (게이지 100%)
    surfactant:   'assets/images/surfactant.png',    // 계면이 캐릭터 (피부 잔여 자극)
    products: {
      bodywash: 'assets/images/bodywash.png',   // 일반 바디워시 (무지 흰색 펌프)
      shower:   'assets/images/shower.png',     // 샤워기
      eslo:     'assets/images/eslo-bath.png',  // eslo 바스앤샴푸
    },
    // 엔딩 3종 카드
    ending: {
      bath:     'assets/images/eslo-bath.png',
      cleanser: 'assets/images/eslo-cleanser.png',
      lotion:   'assets/images/eslo-lotion.png',
    },
  },

  /* --- Placeholder 라벨 ------------------------------------------------ */
  placeholders: {
    qr:        'QR 코드\n(임시)',
    logo:      'eslo',
    child:     '아이',
    childSad:  '아이(울상)',
    childHappy:'아이(미소)',
    magnifier: '돋보기',
    bodywash:  '일반',
    shower:    '샤워기',
    eslo:      'eslo',
    warningLight: '경고등',
    surfactant:   '계면이',
    endBath:     '바스앤샴푸',
    endCleanser: '엉덩이 클렌저',
    endLotion:   '로션',
  },

  /* --- 문구(텍스트) ---------------------------------------------------- */
  texts: {
    step: 'STEP',
    homeButton: '처음으로',
    replayButton: '다시하기',

    gate: {
      step:   '카카오 채널 추가',
      title:  '게임 참여 전\neslo 카카오 채널을 추가해주세요',
      desc:   'QR 코드를 스캔하고 채널을 추가하면\n게임을 시작할 수 있어요',
      button: '채널 추가 완료했어요',
    },

    mission: {
      badge:  '오늘의 미션',
      goal:   '우리 아기 피부를\n깨끗하게 지켜주세요!',
      target: '나쁜 계면이를 모두 씻어내세요!',
    },

    // eslo 핵심 키워드 (전환 장면)
    esloKeywords: ['생분해', '피부에 남지 않는 계면활성제', '안심 베이비 케어'],

    success: {
      title: '🎉 미션 성공!',
      desc:  '우리 아기 피부를\n깨끗하게 지켰어요!',
    },

    scenes: {
      opening:      '오늘은 우리 아기 피부를\n깨끗하게 씻어볼까요?',
      bodywashUse:  '일반 바디워시로 문질러 주세요',
      distress:     '왜 그런지 살펴볼까요?',
      residue:      '바디워시 속 나쁜 계면활성제가\n피부에 남아 자극이 일어났어요.',
      transition:   'eslo는 달라요',
      esloUse:      'eslo 바스앤샴푸로\n거품을 내어 부드럽게 문질러 주세요',
      esloRinse:    '샤워기로 깨끗하게 헹궈주세요',
      cleanSkin:    '피부가 깨끗하고 편안해졌어요!',
      ending:       '우리 아이 피부를 위한\n안심 생분해 케어',
      endingSub:    'eslo 베이비와 함께\n깨끗한 목욕 습관을 시작해보세요.',

      // (참고) 흐름 정리로 현재 미사용 — 삭제하지 않고 남겨둠
      rinse1:       '거품을 깨끗하게 씻어주세요.',
      check1:       '정말 깨끗하게 씻겨졌는지\n함께 확인해볼까요?',
      check2:       '피부에 계면활성제가\n남아 있는지 확인해볼까요?',
      summary:      '착한 계면활성제로 우리 아이 피부를 지키는\n안심 생분해 케어, eslo.',
    },

    hints: {
      dragWash:  '아이콘을 아이 몸으로 드래그해 문질러 주세요',
      dragRinse: '샤워기를 아이 몸으로 드래그해 헹궈 주세요',
      tapNext:   '화면을 탭하면 다음으로 넘어가요',
      homeHint:  "좌상단 '처음으로' 버튼을 누르면 게임 시작 화면으로 돌아갈 수 있어요.",
    },

    gauge: {
      title: '민감도 게이지',
      warn:  '민감도 100% · 피부 자극 위험!',
      calm:  '피부 진정 완료!',
    },
  },

  /* --- 타이밍 (밀리초) ------------------------------------------------- */
  timings: {
    messageAutoAdvance: 3200,
    missionAutoAdvance: 4200,
    inspectAutoAdvance: 3600,
    dragFallback:       9000,   // 드래그 미조작 시 자동 완료
    completePause:      900,
    warningHold:        2000,
    calmHold:           1600,   // 게이지 0% "진정 완료" 를 보여주는 시간
    successHold:        3600,
  },

  /* --- 게임 동작 옵션 --------------------------------------------------- */
  options: {
    tapToAdvance: true,
    dragThreshold: 1.0,
    // 상단 STEP 번호 클릭으로 장면 이동 (테스트/팀 시연용).
    // ★ 실제 행사 운영 전에는 false 로 바꿔 잠금 처리하세요.
    stepNavigationEnabled: true,
  },

  /* --- 민감/자극 게이지 색 --------------------------------------------
   * 게이지 값(0~1)에 따라 아래 색을 순서대로 보간합니다.
   * 0% → 첫 색(파랑), 100% → 마지막 색(빨강)
   *   상승: (민트)→노랑→주황→빨강
   *   하강: 빨강→주황→노랑→민트→파랑
   * ------------------------------------------------------------------- */
  gauge: {
    colorStops: ['#5db6e6', '#8fe3c4', '#ffe08a', '#ffb85c', '#ff5a5a'],
    warnThreshold: 0.98,
    calmThreshold: 0.02,    // 이 값 이하이면 "진정 완료" (0% 취급)
    surfactantCount: 8,
  },
};
