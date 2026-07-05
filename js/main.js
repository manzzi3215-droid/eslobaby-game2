/* =============================================================================
 * main.js — 진입점. DOM 준비되면 게임 초기화.
 * ========================================================================== */
(function () {
  'use strict';
  function boot() { window.Game.init(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
