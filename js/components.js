/* =============================================================================
 * components.js — 재사용 UI 컴포넌트 + Placeholder 시스템
 * -----------------------------------------------------------------------------
 * createAsset() 하나로 "이미지 있으면 이미지 / 없으면 일러스트(SVG) Placeholder".
 * 실제 이미지가 config.assets 에 채워지고 파일이 존재하면 자동으로 이미지 사용.
 * 브랜드 표기는 반드시 "eslo" 로 통일.
 * ========================================================================== */
(function () {
  'use strict';

  // 스파이키(계면이) 별 경로 생성
  function spikePath(cx, cy, rO, rI, n) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 === 0 ? rO : rI;
      var a = (Math.PI / n) * i - Math.PI / 2;
      pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return 'M' + pts.join(' L') + ' Z';
  }

  var SHAPES = {
    // 아기 얼굴 (variant: 'happy' | 'sad' | 'neutral')
    baby: function (label, variant) {
      variant = variant || 'neutral';
      var eyes, mouth, extra = '';
      if (variant === 'happy') {
        eyes = '<path d="M33 45 q4 -6 8 0" stroke="#3a2b22" stroke-width="3" fill="none" stroke-linecap="round"/>'
             + '<path d="M59 45 q4 -6 8 0" stroke="#3a2b22" stroke-width="3" fill="none" stroke-linecap="round"/>';
        mouth = '<path d="M40 58 q10 11 20 0" stroke="#c96b5b" stroke-width="3" fill="#fff" stroke-linecap="round"/>';
      } else if (variant === 'sad') {
        eyes = '<circle cx="38" cy="46" r="3.6" fill="#3a2b22"/><circle cx="62" cy="46" r="3.6" fill="#3a2b22"/>'
             + '<path d="M31 40 l11 3" stroke="#3a2b22" stroke-width="2.5" stroke-linecap="round"/>'
             + '<path d="M69 40 l-11 3" stroke="#3a2b22" stroke-width="2.5" stroke-linecap="round"/>';
        mouth = '<path d="M41 62 q9 -8 18 0" stroke="#c96b5b" stroke-width="3" fill="none" stroke-linecap="round"/>';
        extra = '<path d="M35 51 q-3 7 0 11 q3 -4 0 -11 Z" fill="#7ec8ea"/>';
      } else {
        eyes = '<circle cx="38" cy="46" r="3.6" fill="#3a2b22"/><circle cx="62" cy="46" r="3.6" fill="#3a2b22"/>';
        mouth = '<path d="M42 60 h16" stroke="#c96b5b" stroke-width="3" stroke-linecap="round"/>';
      }
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
        + '<ellipse cx="50" cy="96" rx="30" ry="18" fill="#ffe0c9"/>'
        + '<circle cx="20" cy="48" r="7" fill="#ffe0c9"/><circle cx="80" cy="48" r="7" fill="#ffe0c9"/>'
        + '<circle cx="50" cy="47" r="31" fill="#ffe0c9"/>'
        + '<path d="M21 42 Q50 6 79 42 Q66 24 50 22 Q34 24 21 42 Z" fill="#6b4b3a"/>'
        + '<circle cx="31" cy="55" r="5" fill="#ffc2c2" opacity="0.75"/>'
        + '<circle cx="69" cy="55" r="5" fill="#ffc2c2" opacity="0.75"/>'
        + eyes + mouth + extra
        + '</svg>';
    },

    // 무지 흰색 펌프 바디워시
    pump: function (label) {
      return '<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">'
        + '<rect x="46" y="4" width="7" height="14" rx="2" fill="#c9d4db"/>'
        + '<path d="M39 8 h15 v6 h-15 z" fill="#c9d4db"/>'
        + '<rect x="36" y="16" width="28" height="12" rx="3" fill="#e6edf1" stroke="#c9d4db" stroke-width="1.5"/>'
        + '<rect x="26" y="28" width="48" height="104" rx="14" fill="#ffffff" stroke="#cfdae1" stroke-width="2.5"/>'
        + '<rect x="33" y="64" width="34" height="42" rx="5" fill="#f1f5f8"/>'
        + '<text x="50" y="90" text-anchor="middle" font-size="13" fill="#9bb0bd" font-weight="700">' + (label || '일반') + '</text>'
        + '</svg>';
    },

    // eslo 제품(민트 보틀)
    eslo: function (label) {
      return '<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">'
        + '<rect x="46" y="4" width="7" height="14" rx="2" fill="#8fd3bd"/>'
        + '<path d="M39 8 h15 v6 h-15 z" fill="#8fd3bd"/>'
        + '<rect x="36" y="16" width="28" height="12" rx="3" fill="#cdeee2" stroke="#8fd3bd" stroke-width="1.5"/>'
        + '<rect x="26" y="28" width="48" height="104" rx="14" fill="#dff6ef" stroke="#8fd3bd" stroke-width="2.5"/>'
        + '<rect x="33" y="62" width="34" height="44" rx="5" fill="#ffffff"/>'
        + '<text x="50" y="88" text-anchor="middle" font-size="13" fill="#4aa88c" font-weight="800">eslo</text>'
        + '</svg>';
    },

    // 샤워기
    shower: function () {
      return '<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">'
        + '<g transform="rotate(18 55 45)">'
        + '<rect x="20" y="18" width="9" height="42" rx="4" fill="#bcd7e6"/>'
        + '<ellipse cx="58" cy="40" rx="23" ry="14" fill="#e3f1f9" stroke="#a9cfe2" stroke-width="2"/>'
        + '<ellipse cx="58" cy="42" rx="15" ry="7" fill="#cfe6f2"/>'
        + '</g>'
        + '<g fill="#9fd0ea">'
        + '<ellipse cx="52" cy="82" rx="3" ry="6"/><ellipse cx="64" cy="90" rx="3" ry="6"/>'
        + '<ellipse cx="44" cy="94" rx="3" ry="6"/><ellipse cx="58" cy="104" rx="3" ry="6"/>'
        + '</g></svg>';
    },

    // 계면이 캐릭터 (보라 스파이키 + 심술 표정)
    germ: function () {
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="' + spikePath(50, 50, 46, 33, 11) + '" fill="#9b7fd4"/>'
        + '<circle cx="50" cy="50" r="30" fill="#a98fe0"/>'
        + '<circle cx="41" cy="47" r="7" fill="#fff"/><circle cx="59" cy="47" r="7" fill="#fff"/>'
        + '<circle cx="42" cy="49" r="3.4" fill="#3a2b4a"/><circle cx="60" cy="49" r="3.4" fill="#3a2b4a"/>'
        + '<path d="M33 39 l12 5" stroke="#6b4f9e" stroke-width="3" stroke-linecap="round"/>'
        + '<path d="M67 39 l-12 5" stroke="#6b4f9e" stroke-width="3" stroke-linecap="round"/>'
        + '<path d="M42 64 q8 -7 16 0" stroke="#5c3f8f" stroke-width="3" fill="none" stroke-linecap="round"/>'
        + '</svg>';
    },

    // 경고등/비상등
    siren: function () {
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
        + '<rect x="28" y="72" width="44" height="14" rx="4" fill="#8a95a0"/>'
        + '<path d="M32 74 Q50 30 68 74 Z" fill="#ff5a5a"/>'
        + '<ellipse cx="50" cy="74" rx="18" ry="5" fill="#d64a46"/>'
        + '<ellipse cx="44" cy="54" rx="5" ry="7" fill="#ffd0d0" opacity="0.85"/>'
        + '<path d="M78 44 l10 -5 M80 58 l11 2 M74 32 l7 -8" stroke="#ffb85c" stroke-width="3" stroke-linecap="round"/>'
        + '<path d="M22 44 l-10 -5 M20 58 l-11 2 M26 32 l-7 -8" stroke="#ffb85c" stroke-width="3" stroke-linecap="round"/>'
        + '</svg>';
    },

    // eslo 3종 카드용 제품 (variant: 'mint' | 'blue' | 'cream')
    product: function (label, variant) {
      var tint = { mint: ['#dff6ef', '#8fd3bd', '#4aa88c'],
                   blue: ['#e3f0fb', '#9cc7ea', '#4a90c2'],
                   cream:['#fff4ea', '#f0cfa8', '#c98f4a'] }[variant || 'mint'];
      return '<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">'
        + '<rect x="40" y="6" width="20" height="14" rx="3" fill="' + tint[1] + '"/>'
        + '<rect x="24" y="20" width="52" height="122" rx="16" fill="' + tint[0] + '" stroke="' + tint[1] + '" stroke-width="2.5"/>'
        + '<rect x="32" y="60" width="36" height="52" rx="6" fill="#ffffff"/>'
        + '<text x="50" y="82" text-anchor="middle" font-size="13" fill="' + tint[2] + '" font-weight="800">eslo</text>'
        + '<text x="50" y="100" text-anchor="middle" font-size="8" fill="' + tint[2] + '">' + (label || '') + '</text>'
        + '</svg>';
    },

    // 로고
    logo: function () {
      return '<svg viewBox="0 0 130 54" xmlns="http://www.w3.org/2000/svg">'
        + '<text x="65" y="34" text-anchor="middle" font-size="30" font-weight="800" fill="#4a90c2" font-family="sans-serif">eslo</text>'
        + '<text x="65" y="48" text-anchor="middle" font-size="11" fill="#7fbce6" font-family="sans-serif" letter-spacing="2">이슬로 베이비</text>'
        + '</svg>';
    },

    // QR (의사 QR 패턴)
    qr: function () {
      var cells = '', seed = 7;
      for (var y = 0; y < 9; y++) for (var x = 0; x < 9; x++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        if ((seed >> 16) & 1) cells += '<rect x="' + (10 + x * 9) + '" y="' + (10 + y * 9) + '" width="8" height="8" fill="#2f4858"/>';
      }
      function marker(mx, my) {
        return '<rect x="' + mx + '" y="' + my + '" width="26" height="26" fill="#2f4858"/>'
             + '<rect x="' + (mx + 5) + '" y="' + (my + 5) + '" width="16" height="16" fill="#fff"/>'
             + '<rect x="' + (mx + 9) + '" y="' + (my + 9) + '" width="8" height="8" fill="#2f4858"/>';
      }
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
        + '<rect width="100" height="100" fill="#fff"/>' + cells
        + marker(8, 8) + marker(66, 8) + marker(8, 66) + '</svg>';
    },

    // 욕실 배경 (전역 배경 placeholder) — background.png 없을 때 사용
    bathroom: function () {
      var tiles = '';
      for (var ty = 0; ty < 6; ty++) for (var tx = 0; tx < 14; tx++) {
        var off = (ty % 2) * 44;
        tiles += '<rect x="' + (tx * 88 - off) + '" y="' + (ty * 60) + '" width="84" height="56" rx="8" fill="#dff0fb" stroke="#c7e6f6" stroke-width="2"/>';
      }
      return '<svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">'
        + '<rect width="1200" height="800" fill="#eaf6ff"/>'
        + '<g opacity="0.9">' + tiles + '</g>'
        // 바닥
        + '<rect x="0" y="620" width="1200" height="180" fill="#eafaf3"/>'
        + '<rect x="0" y="612" width="1200" height="14" fill="#d6efe6"/>'
        // 선반 + 제품들 (좌상단)
        + '<rect x="70" y="150" width="230" height="14" rx="6" fill="#cbe6d9"/>'
        + '<g><rect x="95" y="96" width="34" height="56" rx="8" fill="#cdeee2" stroke="#8fd3bd" stroke-width="3"/>'
        + '<rect x="150" y="86" width="30" height="66" rx="8" fill="#e3f0fb" stroke="#9cc7ea" stroke-width="3"/>'
        + '<rect x="205" y="104" width="30" height="48" rx="8" fill="#fff4ea" stroke="#f0cfa8" stroke-width="3"/></g>'
        // 화분 (우상단)
        + '<g transform="translate(980,90)">'
        + '<path d="M40 70 q-40 -70 0 -70 q40 70 0 70 Z" fill="#bfe3c6"/>'
        + '<path d="M40 70 q-70 -40 -30 -60 q40 30 30 60 Z" fill="#a9d6b3"/>'
        + '<path d="M40 70 q70 -40 30 -60 q-40 30 -30 60 Z" fill="#a9d6b3"/>'
        + '<rect x="20" y="66" width="40" height="34" rx="6" fill="#eac9a8"/></g>'
        // 샤워기 (우상단)
        + '<g transform="translate(1040,180)">'
        + '<rect x="-4" y="-40" width="8" height="60" rx="4" fill="#bcd7e6"/>'
        + '<ellipse cx="0" cy="26" rx="26" ry="12" fill="#dceefa" stroke="#a9cfe2" stroke-width="3"/>'
        + '<g fill="#bce0f2"><ellipse cx="-10" cy="44" rx="3" ry="7"/><ellipse cx="2" cy="50" rx="3" ry="7"/><ellipse cx="12" cy="44" rx="3" ry="7"/></g></g>'
        // 욕조 (하단 중앙)
        + '<g transform="translate(430,470)">'
        + '<ellipse cx="180" cy="210" rx="240" ry="40" fill="#d6efe6" opacity="0.6"/>'
        + '<rect x="0" y="60" width="360" height="150" rx="70" fill="#ffffff" stroke="#cfe3ef" stroke-width="5"/>'
        + '<rect x="24" y="84" width="312" height="70" rx="40" fill="#d6f0ff"/>'
        + '<ellipse cx="120" cy="110" rx="22" ry="12" fill="#ffffff" opacity="0.8"/>'
        + '<ellipse cx="230" cy="120" rx="16" ry="9" fill="#ffffff" opacity="0.8"/>'
        // 러버덕
        + '<g transform="translate(250,60)"><ellipse cx="0" cy="0" rx="26" ry="18" fill="#ffe08a"/>'
        + '<circle cx="16" cy="-16" r="14" fill="#ffe08a"/><circle cx="20" cy="-18" r="2.6" fill="#3a2b22"/>'
        + '<path d="M28 -16 h12 v5 h-12 z" fill="#ffb85c"/></g></g>'
        + '</svg>';
    },
  };

  /* ---------- createAsset ------------------------------------------- */
  function createAsset(opt) {
    var wrap = document.createElement('div');
    wrap.className = 'asset' + (opt.className ? ' ' + opt.className : '');
    if (opt.style) Object.assign(wrap.style, opt.style);

    var ph = document.createElement('div');
    if (opt.shape && SHAPES[opt.shape]) {
      ph.className = 'placeholder placeholder-shape';
      ph.innerHTML = SHAPES[opt.shape](opt.label || '', opt.variant);
    } else {
      ph.className = 'placeholder';
      ph.textContent = opt.label || '';
    }
    wrap.appendChild(ph);

    if (opt.src) {
      var img = document.createElement('img');
      img.alt = opt.label || '';
      img.style.display = 'none';
      img.addEventListener('load', function () {
        img.style.display = 'block';
        ph.style.display = 'none';
      });
      img.addEventListener('error', function () { img.remove(); });
      img.src = opt.src;
      wrap.appendChild(img);
    }
    return wrap;
  }

  function createButton(text, onClick) {
    var btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function createMent(text, strong) {
    var el = document.createElement('div');
    el.className = 'ment' + (strong ? ' is-strong' : '');
    el.textContent = text;
    return el;
  }

  // 특정 SVG 일러스트 마크업 문자열 얻기 (배경 등 직접 삽입용)
  function shapeSVG(name, label, variant) {
    return SHAPES[name] ? SHAPES[name](label || '', variant) : '';
  }

  window.Components = {
    createAsset: createAsset,
    createButton: createButton,
    createMent: createMent,
    shapeSVG: shapeSVG,
  };
})();
