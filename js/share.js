/* =============================================================================
 * share.js — 공유 페이지(share.html) 로직
 * -----------------------------------------------------------------------------
 * - 배포 URL을 화면에 표시하고, 그 URL로 실제 QR 코드를 생성해 삽입합니다.
 * - QR은 라이브러리 없이 js/qrcode.js 로 생성됩니다. (오프라인 OK)
 * - 나중에 실제 QR 이미지(assets/qr/share-qr.png)를 넣으면 자동으로 그 이미지를
 *   대신 사용합니다. (교체 가능 구조)
 * ========================================================================== */
(function () {
  'use strict';

  // 게임 배포 URL (GitHub Pages). 다른 곳에 배포하면 이 값만 바꾸면 됩니다.
  var GAME_URL = 'https://manzzi3215-droid.github.io/eslobaby-game2/';

  // 교체용 실제 QR 이미지 경로 (파일이 있으면 생성 QR 대신 이 이미지를 사용)
  var QR_IMAGE = 'assets/qr/share-qr.png';

  function byId(id) { return document.getElementById(id); }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    // URL 텍스트 표시
    var urlText = byId('game-url');
    if (urlText) urlText.textContent = GAME_URL;

    // "게임 바로가기" 버튼 링크
    var goBtn = byId('go-game');
    if (goBtn) goBtn.setAttribute('href', GAME_URL);

    // QR 렌더링
    renderQR(byId('qr-area'));
  });

  function renderQR(area) {
    if (!area) return;

    // 1) 실제 QR 이미지가 있으면 우선 사용 (교체 가능)
    var probe = new Image();
    probe.onload = function () {
      area.innerHTML = '';
      probe.className = 'qr-img';
      probe.alt = '게임 접속 QR 코드';
      area.appendChild(probe);
    };
    probe.onerror = function () {
      // 2) 이미지가 없으면 생성기로 실제 QR 생성
      generateQR(area);
    };
    probe.src = QR_IMAGE;
  }

  function generateQR(area) {
    try {
      // 오류정정 레벨 M — 현장 인쇄/스캔에 적절
      var svg = window.QRCodeGen.toSVG(GAME_URL, { ecl: 'M', margin: 4, dark: '#2f4858' });
      area.innerHTML = svg;
      area.classList.add('is-generated');
    } catch (e) {
      // 3) 최후: placeholder 안내 (추후 실제 QR 이미지로 교체 가능)
      area.innerHTML = '<div class="qr-placeholder">QR 코드\n(assets/qr/share-qr.png 로 교체 가능)</div>';
    }
  }
})();
