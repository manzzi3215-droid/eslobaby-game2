/* =============================================================================
 * main.js — 진입점. DOM 준비되면 게임 초기화.
 * ========================================================================== */
(function () {
  'use strict';
  function boot() {
    window.Game.init();
    // 시연/테스트용: index.html?step=3 처럼 열면 해당 STEP에서 바로 시작
    // (config.options.stepNavigationEnabled 가 true 일 때만 동작)
    var m = window.location.search.match(/[?&]step=(\d+)/);
    if (m && window.ESLO_CONFIG.options.stepNavigationEnabled) {
      window.Game.goToStep(parseInt(m[1], 10));
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
