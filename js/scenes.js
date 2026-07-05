/* =============================================================================
 * scenes.js — 장면 "데이터" 정의 (순서/타입/문구/에셋)
 * -----------------------------------------------------------------------------
 * 장면 순서를 바꾸거나 추가/삭제하려면 이 배열만 수정하세요.
 * step 번호는 게이트(STEP 1) 다음부터 자동 계산됩니다.
 *
 * type 종류:
 *   'mission'  : 오프닝 + 오늘의 미션(게임 목표)
 *   'message'  : 멘트만 노출 (strong: true 면 강조)
 *   'reaction' : 아이 반응 (mood: 'sad' | 'happy'), sparkle: true 면 반짝임
 *   'drag'     : 도구를 아이 몸으로 드래그 (action: 'foam' | 'rinse')
 *                - gauge: 'rise'(0→100) | 'hold'(고정 100) | 'fall'(100→0)
 *                - surfactant: true 면 계면이 캐릭터가 몸에 붙음(rinse면 씻겨나감)
 *                - weaken: true 면 문지를수록 계면이가 약해지는 느낌
 *                - requireGaugeZero: true 면 게이지 0%가 되어야 완료로 인정
 *   'closeup'  : 피부 클로즈업 (skin: 'irritated'), surfactant: true 면 계면이 노출
 *   'brand'    : eslo 제품 + 핵심 키워드
 *   'success'  : 미션 성공 축하 연출
 *   'ending'   : 로고 + 3종 카드 + 다시하기
 * ========================================================================== */
(function () {
  'use strict';
  var T = window.ESLO_CONFIG.texts;

  window.ESLO_SCENES = [
    // STEP 2 — 오프닝 + 오늘의 미션
    { id: 'opening', type: 'mission', title: '오프닝', text: T.scenes.opening },

    // STEP 3 — 일반 바디워시 사용 (게이지 0→100 → 100% 경고등)
    { id: 'bodywashUse', type: 'drag', title: '일반 바디워시 사용',
      text: T.scenes.bodywashUse, tool: 'bodywash', action: 'foam',
      hint: T.hints.dragWash, gauge: 'rise' },

    // STEP 4 — 아이 울상 / 피부 자극
    { id: 'distress', type: 'reaction', title: '아이 피부가 불편해요',
      text: T.scenes.distress, mood: 'sad' },

    // STEP 5 — 피부 클로즈업: 계면이 캐릭터 확인
    { id: 'residue', type: 'closeup', title: '나쁜 계면활성제 확인',
      text: T.scenes.residue, skin: 'irritated', surfactant: true },

    // STEP 6 — eslo는 달라요 (제품 + 키워드)
    { id: 'transition', type: 'brand', title: 'eslo는 달라요',
      text: T.scenes.transition, keywords: T.esloKeywords },

    // STEP 7 — eslo 사용: 계면이 붙은 채로 시작, 게이지 100% 유지, 문지를수록 계면이 약해짐
    { id: 'esloUse', type: 'drag', title: 'eslo 바스앤샴푸',
      text: T.scenes.esloUse, tool: 'eslo', action: 'foam',
      hint: T.hints.dragWash, gauge: 'hold', surfactant: true, weaken: true },

    // STEP 8 — 샤워기로 헹구기: 계면이 씻김 + 게이지 100→0 (0% 되어야 완료)
    { id: 'esloRinse', type: 'drag', title: '샤워기로 씻어내요',
      text: T.scenes.esloRinse, tool: 'shower', action: 'rinse',
      hint: T.hints.dragRinse, gauge: 'fall', surfactant: true, requireGaugeZero: true },

    // STEP 9 — 깨끗해진 피부 (웃는 아이 + 반짝임)
    { id: 'cleanSkin', type: 'reaction', title: '깨끗해진 피부!',
      text: T.scenes.cleanSkin, mood: 'happy', sparkle: true },

    // STEP 10 — 미션 성공 연출
    { id: 'success', type: 'success', title: '미션 성공!' },

    // STEP 11 — 엔딩 (eslo 베이비 3종)
    { id: 'ending', type: 'ending', title: 'eslo 베이비',
      text: T.scenes.ending, sub: T.scenes.endingSub },
  ];
})();
