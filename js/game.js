/* =============================================================================
 * game.js — 게임 엔진 (장면 전환 · 상태 관리 · 각 타입별 렌더링)
 * -----------------------------------------------------------------------------
 * UI 로직의 중심. 장면 "데이터"(scenes.js)와 "인터랙션"(interactions.js),
 * "컴포넌트"(components.js)를 조합해 실제 화면(카드형)을 만든다.
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.ESLO_CONFIG;
  var SCENES = window.ESLO_SCENES;
  var C = window.Components;

  var TOTAL_STEPS = SCENES.length + 1;   // 게이트(STEP 1) 포함

  var app;
  var homeBtn, brandLogo, bottomHint;    // 항상 떠있는 요소들
  var currentScreen = null;
  var timers = [];
  var cleanups = [];
  var index = 0;
  var busy = false;

  // 장면 간 유지되는 게임 상태 (자극 게이지 값 등)
  var state = { irritation: 0 };

  /* ---------- 유틸 ---------------------------------------------------- */
  function div(cls) { var d = document.createElement('div'); if (cls) d.className = cls; return d; }
  function setTimer(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearScene() {
    timers.forEach(clearTimeout); timers = [];
    cleanups.forEach(function (f) { try { f(); } catch (_) {} }); cleanups = [];
  }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function lerpColor(a, b, t) {
    function rgb(h) {
      h = h.replace('#', '');
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    var A = rgb(a), B = rgb(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
                    Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
                    Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  // 게이지 값(0~1) → 여러 색 구간 보간 (빨강↔파랑)
  function gaugeColor(ratio) {
    var s = CFG.gauge.colorStops;
    ratio = clamp01(ratio);
    var seg = ratio * (s.length - 1);
    var i = Math.min(s.length - 2, Math.floor(seg));
    return lerpColor(s[i], s[i + 1], seg - i);
  }

  // 화면 전환(더블 버퍼 페이드)
  function showScreen(buildFn) {
    var prev = currentScreen;
    var el = div('screen');
    buildFn(el);
    app.appendChild(el);
    void el.offsetWidth;
    el.classList.add('is-active');
    currentScreen = el;
    busy = true;
    setTimeout(function () { busy = false; }, 460);
    if (prev) {
      prev.classList.remove('is-active');
      setTimeout(function () { prev.remove(); }, 450);
    }
  }

  /* ---------- 공통 레이아웃: 상단 STEP 진행바 + 카드 ------------------ */
  function buildTopBar(step) {
    var wrap = div('top-bar');

    var badge = div('step-badge');
    badge.textContent = CFG.texts.step;   // "STEP"
    wrap.appendChild(badge);

    var nums = div('step-numbers');
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      var n = div('step-num' + (i < step ? ' is-done' : (i === step ? ' is-current' : '')));
      n.textContent = i;
      nums.appendChild(n);
    }
    wrap.appendChild(nums);

    var bar = div('progress-bar');
    var pf = div('pfill');
    pf.style.width = (step / TOTAL_STEPS * 100) + '%';
    bar.appendChild(pf);
    wrap.appendChild(bar);
    return wrap;
  }

  // el 에 상단바 + 카드(제목 + 본문) 구성
  function shell(el, step, title, buildBody) {
    el.appendChild(buildTopBar(step));

    var card = div('scene-card');
    if (title) {
      var t = div('card-title');
      t.textContent = title;
      card.appendChild(t);
    }
    var body = div('screen-body');
    buildBody(body);
    card.appendChild(body);
    el.appendChild(card);
  }

  /* ---------- 게이트: 카카오 채널 추가 -------------------------------- */
  function renderGate() {
    clearScene();
    index = 0;
    state.irritation = 0;
    toggleChrome(false);
    showScreen(function (el) {
      shell(el, 1, CFG.texts.gate.step, function (body) {
        var title = div('gate-title');
        title.textContent = CFG.texts.gate.title;

        var qr = C.createAsset({ src: CFG.assets.qr, label: CFG.placeholders.qr, shape: 'qr', className: 'qr-box' });

        var desc = div('gate-desc');
        desc.textContent = CFG.texts.gate.desc;

        var btn = C.createButton(CFG.texts.gate.button, startGame);

        body.appendChild(title);
        body.appendChild(qr);
        body.appendChild(desc);
        body.appendChild(btn);
      });
    });
  }

  /* ---------- 진행 제어 --------------------------------------------- */
  function startGame() { index = 0; state.irritation = 0; renderScene(); }
  function next() {
    if (busy) return;
    clearScene();
    index++;
    if (index >= SCENES.length) return;
    renderScene();
  }
  function goHome() { clearScene(); renderGate(); }

  function renderScene() {
    clearScene();
    toggleChrome(true);
    var scene = SCENES[index];
    (RENDERERS[scene.type] || RENDERERS.message)(scene, index + 2);   // step = index+2
  }

  /* ---------- 타입별 렌더러 ------------------------------------------ */
  var RENDERERS = {
    mission: renderMission,
    message: renderMessage,
    reaction: renderReaction,
    drag: renderDrag,
    closeup: renderCloseup,
    brand: renderBrand,
    success: renderSuccess,
    ending: renderEnding,
  };

  // 오프닝 + 오늘의 미션
  function renderMission(scene, step) {
    showScreen(function (el) {
      shell(el, step, scene.title, function (body) {
        var badge = div('mission-badge');
        badge.textContent = CFG.texts.mission.badge;

        var goal = div('mission-goal');
        goal.textContent = CFG.texts.mission.goal;

        var intro = C.createMent(scene.text);

        var target = div('mission-target');
        var germ = C.createAsset({ src: CFG.assets.surfactant, label: CFG.placeholders.surfactant, shape: 'germ', className: 'mini-germ' });
        var tgtText = div('mission-target-text');
        tgtText.textContent = CFG.texts.mission.target;
        target.appendChild(germ);
        target.appendChild(tgtText);

        body.appendChild(badge);
        body.appendChild(goal);
        body.appendChild(intro);
        body.appendChild(target);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.missionAutoAdvance);
    });
  }

  // 멘트형
  function renderMessage(scene, step) {
    showScreen(function (el) {
      shell(el, step, scene.title, function (body) {
        body.appendChild(C.createMent(scene.text, scene.strong));
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.messageAutoAdvance);
    });
  }

  // 아이 반응 (울상/미소)
  function renderReaction(scene, step) {
    showScreen(function (el) {
      shell(el, step, scene.title, function (body) {
        var stage = div('stage');

        var childSrc = scene.mood === 'sad' ? CFG.assets.childSad :
                       scene.mood === 'happy' ? CFG.assets.childHappy : CFG.assets.child;
        var childLabel = scene.mood === 'sad' ? CFG.placeholders.childSad :
                         scene.mood === 'happy' ? CFG.placeholders.childHappy : CFG.placeholders.child;

        var childBody = C.createAsset({
          src: childSrc, label: childLabel, shape: 'baby', variant: scene.mood,
          className: 'child-body' + (scene.mood === 'sad' ? ' is-distress' : ''),
        });
        if (scene.mood === 'sad') addIrritations(childBody, 6);
        if (scene.sparkle) addSparkles(stage, 7);

        stage.appendChild(childBody);
        body.appendChild(C.createMent(scene.text));
        body.appendChild(stage);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.inspectAutoAdvance);
    });
  }

  // 드래그형 (거품 + 게이지 + 계면이)
  function renderDrag(scene, step) {
    showScreen(function (el) {
      shell(el, step, scene.title, function (body) {
        var mode = scene.gauge;               // 'rise' | 'hold' | 'fall'
        var gauge = null, startLevel = 0;
        if (mode) {
          gauge = buildGauge();
          startLevel = mode === 'rise' ? 0 : clamp01(state.irritation || 1);  // hold/fall 은 현재값(100%)에서 시작
          gauge.set(startLevel);
          body.appendChild(gauge.el);
        }

        var stage = div('stage');

        var childBody = C.createAsset({
          src: CFG.assets.child, label: CFG.placeholders.child,
          shape: 'baby', variant: 'neutral', className: 'child-body',
        });

        var foam = div('foam-layer');
        childBody.appendChild(foam);
        var bubbles = buildBubbles(foam, 42);
        var isRinse = scene.action === 'rinse';
        setFoam(bubbles, isRinse ? 1 : 0);

        var surfEls = [];
        if (scene.surfactant) surfEls = addSurfactants(childBody, CFG.gauge.surfactantCount);

        var meter = div('rub-meter');
        var fill = div('fill');
        meter.appendChild(fill);
        childBody.appendChild(meter);

        var tool = C.createAsset({
          src: toolSrc(scene.tool), label: toolLabel(scene.tool),
          shape: toolShape(scene.tool), className: 'drag-tool',
        });
        tool.style.left = '18%';
        tool.style.top = '22%';

        stage.appendChild(childBody);
        stage.appendChild(tool);
        body.appendChild(stage);
        body.appendChild(C.createMent(scene.text));
        body.appendChild(makeHint(scene.hint));

        function applyGauge(r) {
          if (!gauge) return 0;
          var level = mode === 'rise' ? r : (mode === 'fall' ? startLevel * (1 - r) : startLevel);
          gauge.set(level);
          if (mode !== 'hold') state.irritation = level;
          return level;
        }

        var cleanup = window.Interactions.makeRubbable({
          tool: tool, body: childBody, stage: stage,
          onProgress: function (r) {
            fill.style.width = (r * 100) + '%';
            setFoam(bubbles, isRinse ? (1 - r) : r);
            if (scene.weaken) weakenSurfactants(surfEls, r);
            if (scene.surfactant && isRinse) washSurfactants(surfEls, r);
            applyGauge(r);
          },
          onComplete: function () {
            // 게이지를 목표값으로 확정 (fall → 반드시 0%)
            if (gauge) {
              var end = mode === 'rise' ? 1 : (mode === 'fall' ? 0 : startLevel);
              gauge.set(end);
              if (mode !== 'hold') state.irritation = end;
            }
            if (scene.weaken) weakenSurfactants(surfEls, 1);
            if (scene.surfactant && isRinse) washSurfactants(surfEls, 1);

            // requireGaugeZero: 게이지가 0%인지 확인한 뒤에만 다음 단계로
            var proceed = function () { setTimer(next, mode === 'rise' ? CFG.timings.warningHold
                                                    : mode === 'fall' ? CFG.timings.calmHold
                                                    : CFG.timings.completePause); };
            if (scene.requireGaugeZero && state.irritation > CFG.gauge.calmThreshold) {
              state.irritation = 0;
              if (gauge) gauge.set(0);
            }
            proceed();
          },
        });
        cleanups.push(cleanup);
      });
    });
  }

  // 피부 클로즈업 (돋보기 없이 확대 패널)
  function renderCloseup(scene, step) {
    showScreen(function (el) {
      shell(el, step, scene.title, function (body) {
        var panel = div('closeup-panel' + (scene.skin === 'irritated' ? ' is-irritated' : ''));
        addIrritations(panel, 8);
        if (scene.surfactant) addSurfactants(panel, 6);

        body.appendChild(panel);
        body.appendChild(C.createMent(scene.text));
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.inspectAutoAdvance);
    });
  }

  // eslo는 달라요 (제품 + 키워드)
  function renderBrand(scene, step) {
    showScreen(function (el) {
      shell(el, step, scene.title, function (body) {
        body.appendChild(C.createMent(scene.text, true));

        var product = C.createAsset({
          src: CFG.assets.products.eslo, label: CFG.placeholders.eslo,
          shape: 'eslo', className: 'brand-product',
        });

        var list = div('keyword-list');
        (scene.keywords || []).forEach(function (k) {
          var row = div('keyword');
          row.textContent = '✔ ' + k;
          list.appendChild(row);
        });

        body.appendChild(product);
        body.appendChild(list);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.missionAutoAdvance);
    });
  }

  // 미션 성공 연출
  function renderSuccess(scene, step) {
    showScreen(function (el) {
      shell(el, step, scene.title, function (body) {
        var burst = div('confetti-layer');
        addConfetti(burst, 26);
        addSparkles(burst, 8);

        var title = div('success-title');
        title.textContent = CFG.texts.success.title;

        var desc = div('success-desc');
        desc.textContent = CFG.texts.success.desc;

        body.appendChild(burst);
        body.appendChild(title);
        body.appendChild(desc);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.successHold);
    });
  }

  // 엔딩
  function renderEnding(scene, step) {
    showScreen(function (el) {
      shell(el, step, scene.title, function (body) {
        var logo = C.createAsset({ src: CFG.assets.logo, label: CFG.placeholders.logo, shape: 'logo', className: 'ending-logo' });
        var ment = C.createMent(scene.text);

        var cards = div('cards');
        cards.appendChild(buildCard(CFG.assets.ending.bath, CFG.placeholders.endBath, 'mint'));
        cards.appendChild(buildCard(CFG.assets.ending.cleanser, CFG.placeholders.endCleanser, 'blue'));
        cards.appendChild(buildCard(CFG.assets.ending.lotion, CFG.placeholders.endLotion, 'cream'));

        var sub = div('ending-sub');
        sub.textContent = scene.sub || '';

        var replay = C.createButton(CFG.texts.replayButton, renderGate);

        body.appendChild(logo);
        body.appendChild(ment);
        body.appendChild(cards);
        body.appendChild(sub);
        body.appendChild(replay);
      });
    });
  }

  /* ---------- 게이지 컴포넌트 --------------------------------------- */
  function buildGauge() {
    var TG = CFG.texts.gauge;

    var wrap = div('gauge-wrap');
    var head = div('gauge-head');

    var label = div('gauge-label');
    label.textContent = TG.title;

    var right = div('gauge-right');
    var percent = div('gauge-percent');
    percent.textContent = '0%';
    var warn = C.createAsset({ src: CFG.assets.warningLight, label: CFG.placeholders.warningLight, shape: 'siren', className: 'warning-light' });
    right.appendChild(percent);
    right.appendChild(warn);

    head.appendChild(label);
    head.appendChild(right);

    var bar = div('gauge-bar');
    var fillEl = div('gauge-fill');
    bar.appendChild(fillEl);

    var status = div('gauge-status');

    wrap.appendChild(head);
    wrap.appendChild(bar);
    wrap.appendChild(status);

    function set(ratio) {
      ratio = clamp01(ratio);
      var col = gaugeColor(ratio);
      fillEl.style.width = (ratio * 100) + '%';
      fillEl.style.background = col;
      percent.textContent = Math.round(ratio * 100) + '%';
      percent.style.color = col;
      if (ratio >= CFG.gauge.warnThreshold) {
        wrap.classList.add('is-warning'); wrap.classList.remove('is-calm');
        status.textContent = TG.warn;
      } else if (ratio <= CFG.gauge.calmThreshold) {
        wrap.classList.add('is-calm'); wrap.classList.remove('is-warning');
        status.textContent = TG.calm;
      } else {
        wrap.classList.remove('is-warning', 'is-calm');
        status.textContent = '';
      }
    }
    return { el: wrap, set: set };
  }

  /* ---------- 헬퍼 --------------------------------------------------- */
  function makeHint(text) {
    var h = div('hint');
    h.textContent = text || '';
    return h;
  }
  function tapAdvance(el) {
    if (CFG.options.tapToAdvance) el.addEventListener('click', next);
  }

  function toolSrc(tool) {
    if (tool === 'bodywash') return CFG.assets.products.bodywash;
    if (tool === 'shower') return CFG.assets.products.shower;
    if (tool === 'eslo') return CFG.assets.products.eslo;
    return '';
  }
  function toolLabel(tool) {
    if (tool === 'bodywash') return CFG.placeholders.bodywash;
    if (tool === 'shower') return CFG.placeholders.shower;
    if (tool === 'eslo') return CFG.placeholders.eslo;
    return '';
  }
  function toolShape(tool) {
    if (tool === 'bodywash') return 'pump';
    if (tool === 'shower') return 'shower';
    if (tool === 'eslo') return 'eslo';
    return '';
  }

  function buildBubbles(layer, count) {
    var arr = [];
    for (var i = 0; i < count; i++) {
      var b = div('foam-bubble');
      var size = 10 + Math.random() * 22;
      b.style.width = size + 'px';
      b.style.height = size + 'px';
      b.style.left = (8 + Math.random() * 84) + '%';
      b.style.top = (6 + Math.random() * 88) + '%';
      b.style.display = 'none';
      layer.appendChild(b);
      arr.push(b);
    }
    return arr;
  }
  function setFoam(bubbles, ratio) {
    var n = Math.round(bubbles.length * ratio);
    bubbles.forEach(function (b, i) { b.style.display = i < n ? 'block' : 'none'; });
  }

  function addSurfactants(parent, n) {
    var arr = [];
    for (var i = 0; i < n; i++) {
      var s = C.createAsset({ src: CFG.assets.surfactant, label: CFG.placeholders.surfactant, shape: 'germ', className: 'surfactant' });
      s.style.left = (14 + Math.random() * 68) + '%';
      s.style.top = (14 + Math.random() * 66) + '%';
      parent.appendChild(s);
      arr.push(s);
    }
    return arr;
  }
  // 헹구는 진행도(r)에 따라 계면이들을 아래로 씻겨보냄
  function washSurfactants(surfEls, r) {
    var washed = Math.round(surfEls.length * clamp01(r));
    surfEls.forEach(function (s, i) { if (i < washed) s.classList.add('is-washed'); });
  }
  // 문지를수록 계면이가 약해지는(옅어지는) 느낌
  function weakenSurfactants(surfEls, r) {
    var op = 1 - clamp01(r) * 0.55;
    surfEls.forEach(function (s) {
      if (s.classList.contains('is-washed')) return;
      s.style.opacity = op;
      s.style.filter = 'saturate(' + (1 - clamp01(r) * 0.5) + ')';
    });
  }

  function addIrritations(parent, n) {
    for (var i = 0; i < n; i++) {
      var d = div('irritation');
      d.style.left = (20 + Math.random() * 60) + '%';
      d.style.top = (20 + Math.random() * 60) + '%';
      d.style.animationDelay = (i * 90) + 'ms';
      parent.appendChild(d);
    }
  }
  function addSparkles(parent, n) {
    for (var i = 0; i < n; i++) {
      var s = div('sparkle');
      s.textContent = '✦';
      s.style.left = (10 + Math.random() * 80) + '%';
      s.style.top = (10 + Math.random() * 80) + '%';
      s.style.animationDelay = (i * 180) + 'ms';
      parent.appendChild(s);
    }
  }
  function addConfetti(parent, n) {
    var colors = ['#7fbce6', '#b8e6d9', '#ffe08a', '#ffb0c4', '#c9b8f0'];
    for (var i = 0; i < n; i++) {
      var c = div('confetti');
      c.style.left = (Math.random() * 100) + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 600) + 'ms';
      c.style.animationDuration = (1400 + Math.random() * 900) + 'ms';
      parent.appendChild(c);
    }
  }

  function buildCard(src, label, variant) {
    var card = div('product-card');
    var visual = C.createAsset({ src: src, label: label, shape: 'product', variant: variant, className: 'card-visual' });
    var name = div('card-name');
    name.textContent = label;
    card.appendChild(visual);
    card.appendChild(name);
    return card;
  }

  /* ---------- 항상 떠있는 요소 토글 --------------------------------- */
  function toggleChrome(show) {
    var d = show ? '' : 'none';
    if (homeBtn) homeBtn.style.display = d;
    if (bottomHint) bottomHint.style.display = d;
  }

  /* ---------- 초기화 ------------------------------------------------- */
  function init() {
    app = document.getElementById('app');

    // 전역 욕실 배경: 이미지가 있으면 사용, 없으면 SVG 욕실 연출
    var bg = div('bg-layer');
    app.appendChild(bg);
    bg.innerHTML = C.shapeSVG('bathroom');
    for (var i = 0; i < 6; i++) {
      var deco = div('bg-bubble');
      deco.style.left = (Math.random() * 90 + 2) + '%';
      deco.style.width = deco.style.height = (30 + Math.random() * 70) + 'px';
      deco.style.animationDelay = (Math.random() * 6) + 's';
      bg.appendChild(deco);
    }
    if (CFG.assets.background) {
      var probe = new Image();
      probe.onload = function () {
        bg.innerHTML = '';
        bg.style.backgroundImage = 'url(' + CFG.assets.background + ')';
        bg.classList.add('has-image');
      };
      probe.src = CFG.assets.background;
    }

    // 브랜드 로고 (우상단, 항상)
    brandLogo = C.createAsset({ src: CFG.assets.logo, label: CFG.placeholders.logo, shape: 'logo', className: 'brand-logo' });
    app.appendChild(brandLogo);

    // 처음으로 버튼 (좌상단, 게임 중)
    homeBtn = document.createElement('button');
    homeBtn.className = 'home-btn';
    homeBtn.textContent = '🏠 ' + CFG.texts.homeButton;
    homeBtn.style.display = 'none';
    homeBtn.addEventListener('click', goHome);
    app.appendChild(homeBtn);

    // 하단 안내 (게임 중)
    bottomHint = div('bottom-hint');
    bottomHint.textContent = CFG.texts.hints.homeHint;
    bottomHint.style.display = 'none';
    app.appendChild(bottomHint);

    renderGate();
  }

  window.Game = { init: init };
})();
