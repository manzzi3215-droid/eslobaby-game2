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
  var brandLogo, bottomHint;                     // 항상 떠있는 요소들
  var controlPanel, playBtn, pauseBtn, nextBtn;  // 좌측 컨트롤 (처음으로/플레이/정지/다음)
  var currentScreen = null;
  var timers = [];
  var cleanups = [];
  var index = 0;
  var busy = false;
  var paused = false;                    // 정지(⏸): 자동 진행만 멈춤 (드래그는 유지)
  var queuedNext = false;                // 정지 중 발생한 자동 전환을 기억했다가 플레이 시 재개

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
      // v0.2.8: 다음 장면은 오른쪽에서 들어오고, 이전 장면은 왼쪽으로 밀려나며 사라짐
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(function () { prev.remove(); }, 450);
    }
  }

  /* ---------- 진행 표시 (v0.2.7: 하단 페이지 인디케이터, 카드뉴스형) -----
   * v0.2.5까지는 상단에 큰 라벨(MISSION/STEP1..)을 나열했으나,
   * v0.2.7부터 하단 중앙의 작고 깔끔한 원형 인디케이터로 변경.
   *   - 현재 페이지: 진한 파랑 + 라벨(작게) 표시
   *   - 나머지 페이지: 연한 파랑 점
   *   - 클릭 시 해당 구간 첫 장면으로 이동 (stepNavigationEnabled 잠금 유지)
   * (라벨 텍스트는 config.texts.phases 로 관리 — 그대로 유지)
   * ------------------------------------------------------------------- */
  var PHASES = CFG.texts.phases;

  // 각 phase 가 시작되는 장면 index (클릭 이동용)
  function firstSceneOfPhase(p) {
    for (var i = 0; i < SCENES.length; i++) {
      if (SCENES[i].phase === p) return i;
    }
    return 0;
  }

  // 카드 하단 페이지 인디케이터(작은 원형 점)를 만들어 반환 (v0.2.8: 카드 안쪽)
  //   현재 페이지: 진한 파랑 / 나머지: 연한 파랑. 클릭 시 해당 구간 첫 장면 이동.
  function buildPageDots(phase) {
    var wrap = div('page-dots-in');
    var navOn = CFG.options.stepNavigationEnabled;
    for (var i = 0; i < PHASES.length; i++) {
      var cls = 'pdot' + (i === phase ? ' is-current' : '');
      var n;
      if (navOn) {
        n = document.createElement('button');
        n.className = cls + ' is-clickable';
        n.addEventListener('click', (function (target) {
          return function (e) {
            e.stopPropagation();          // 탭-진행(tapAdvance)과 충돌 방지
            goToStep(firstSceneOfPhase(target) + 2);
          };
        })(i));
      } else {
        n = div(cls);
      }
      n.title = PHASES[i];                // 툴팁으로 라벨 안내
      wrap.appendChild(n);
    }
    return wrap;
  }

  // 장면별 상단 배지 라벨 계산 (v0.2.8)
  //   실제 체험 단계 → STEP1~3 / MISSION 인트로 → MISSION / 성공 → MISSION 성공!
  //   그 외(설명·최종 브랜드)는 배지 없음
  function badgeLabel(opts) {
    if (opts.step != null) return CFG.texts.step + opts.step;
    if (opts.type === 'missionIntro') return PHASES[0];
    if (opts.type === 'missionSuccess') return PHASES[4];
    return null;
  }

  // el 에 카드뉴스형 카드(상단 처음으로+배지 헤더 + 제목 + 본문 + 하단 점) 구성
  //   opts.phase : 진행 표시 위치 (null 이면 헤더·점 숨김 — 게이트)
  //   opts.step  : 실제 체험 단계 번호 (1~3)
  //   titleMod   : 'warn' 등 제목 스타일 변형 (선택)
  function shell(el, opts, title, buildBody, titleMod) {
    opts = opts || {};

    var card = div('scene-card');

    // 카드 상단 헤더: 좌측 "처음으로" 미니 버튼(사용자용) + 중앙 STEP/MISSION 배지
    // (게이트에는 헤더 없음 — opts.phase 가 있을 때만)
    if (opts.phase != null) {
      var header = div('card-header');

      var homeMini = document.createElement('button');
      homeMini.className = 'card-home';
      var chIco = div('ch-ico'); chIco.textContent = '🏠';
      var chLbl = div('ch-lbl'); chLbl.textContent = CFG.texts.homeButton;
      homeMini.appendChild(chIco);
      homeMini.appendChild(chLbl);
      homeMini.addEventListener('click', function (e) { e.stopPropagation(); goHome(); });
      header.appendChild(homeMini);

      var badge = badgeLabel(opts);
      if (badge) {
        var bd = div('card-badge');
        bd.textContent = badge;
        header.appendChild(bd);
      }
      card.appendChild(header);
    }

    if (title) {
      var t = div('card-title' + (titleMod ? ' is-' + titleMod : ''));
      t.textContent = title;
      card.appendChild(t);
    }
    var body = div('screen-body');
    buildBody(body);
    card.appendChild(body);

    // 카드 하단 페이지 인디케이터 (게이트 제외)
    if (opts.phase != null) card.appendChild(buildPageDots(opts.phase));

    el.appendChild(card);
  }

  /* ---------- 게이트: 카카오 채널 추가 -------------------------------- */
  function renderGate() {
    clearScene();
    index = 0;
    state.irritation = 0;
    paused = false;            // 게이트 복귀 시 자동 진행 상태 초기화
    queuedNext = false;
    updateCtrlButtons();
    toggleChrome(false);
    showScreen(function (el) {
      // v0.2.5: STEP 배지·진행 표시 없이 게이트 문구(gate-title) + QR + 버튼만 구성
      // (안내문(gate.desc)은 config 에 보존 — 표시만 제외)
      shell(el, {}, '', function (body) {
        var title = div('gate-title');
        title.textContent = CFG.texts.gate.title;

        var qr = C.createAsset({ src: CFG.assets.qr, label: CFG.placeholders.qr, shape: 'qr', className: 'qr-box' });

        var btn = C.createButton(CFG.texts.gate.button, startGame);

        body.appendChild(title);
        body.appendChild(qr);
        body.appendChild(btn);
      });
    });
  }

  /* ---------- 진행 제어 --------------------------------------------- */
  function startGame() { index = 0; state.irritation = 0; renderScene(); }
  function next() {
    if (busy) return;
    if (paused) { queuedNext = true; return; }   // 정지 중: 전환을 보류
    clearScene();
    index++;
    if (index >= SCENES.length) return;
    renderScene();
  }
  function goHome() { clearScene(); renderGate(); }

  // → 다음: 자동 진행 대기 없이 현재 장면을 건너뛰고 즉시 다음 장면으로 이동.
  //   (마지막 장면에서는 버튼이 비활성화되어 동작 안 함)
  function goNext() {
    if (index >= SCENES.length - 1) return;      // 마지막 장면: 이동 없음
    clearScene();
    queuedNext = false;
    index++;
    state.irritation = irritationForIndex(index); // 건너뛴 게이지 값을 목표값으로 보정
    renderScene();
  }

  // ⏸ 정지: 자동 진행(타이머 전환)만 멈춤. 드래그 인터랙션은 계속 가능.
  function pauseGame() {
    paused = true;
    updateCtrlButtons();
  }
  // ▶ 플레이: 정지 중 보류된 전환이 있으면 이어서 진행.
  function playGame() {
    paused = false;
    updateCtrlButtons();
    if (queuedNext) { queuedNext = false; next(); }
  }
  function updateCtrlButtons() {
    if (playBtn) playBtn.classList.toggle('is-active', !paused);
    if (pauseBtn) pauseBtn.classList.toggle('is-active', paused);
    // 다음 버튼: 마지막 장면에서는 비활성화
    if (nextBtn) {
      var atLast = index >= SCENES.length - 1;
      nextBtn.disabled = atLast;
      nextBtn.classList.toggle('is-disabled', atLast);
    }
  }

  // 대상 장면 시작 시점의 게이지 값을 계산
  // (각 게이지 장면의 목표값(gaugeTo)을 순서대로 반영: rise 이후=100%,
  //  STEP2 이후=50%, STEP3 이후=0%)
  function irritationForIndex(target) {
    var irr = 0;
    for (var i = 0; i < target; i++) {
      var sc = SCENES[i];
      if (sc.gauge === 'rise') irr = (sc.gaugeTo != null ? sc.gaugeTo : 1);
      else if (sc.gauge === 'fall') irr = (sc.gaugeTo != null ? sc.gaugeTo : 0);
    }
    return irr;
  }

  // 장면 이동 (테스트/시연용, config.options.stepNavigationEnabled)
  // step: 1=게이트, 2~=장면 순서 (내부 Scene 번호 — 사용자 표시 STEP1~3과 별개)
  function goToStep(step) {
    clearScene();
    queuedNext = false;
    if (step <= 1) { renderGate(); return; }
    index = Math.min(step - 2, SCENES.length - 1);
    state.irritation = irritationForIndex(index);
    renderScene();
  }

  function renderScene() {
    clearScene();
    toggleChrome(true);
    var scene = SCENES[index];
    updateCtrlButtons();                 // 다음 버튼 활성/비활성 갱신
    // 진행 표시(페이지 점)는 카드 안쪽에서 shell 이 직접 그림 (v0.2.8)
    (RENDERERS[scene.type] || RENDERERS.message)(scene);
  }

  /* ---------- 타입별 렌더러 ------------------------------------------ */
  var RENDERERS = {
    missionIntro: renderMissionIntro,       // v0.2.5 — MISSION 인트로
    drag: renderDrag,
    warning: renderWarning,
    closeup: renderCloseup,
    brand: renderBrand,
    missionSuccess: renderMissionSuccess,   // v0.2.5 — MISSION 성공!
    brandFinal: renderBrandFinal,           // v0.2.5 — 최종 브랜드 페이지
    mission: renderMission,     // (보존 — 현재 흐름 미사용)
    message: renderMessage,     // (보존 — 현재 흐름 미사용)
    reaction: renderReaction,   // (보존 — 현재 흐름 미사용)
    success: renderSuccess,     // (보존 — 현재 흐름 미사용)
    ending: renderEnding,       // (보존 — 현재 흐름 미사용)
  };

  // MISSION 인트로 (v0.2.5) — MISSION 배지 + 미션 문구
  function renderMissionIntro(scene) {
    showScreen(function (el) {
      shell(el, scene, '', function (body) {
        var badge = div('mission-badge');
        badge.textContent = PHASES[0];              // "MISSION"

        var goal = div('mission-goal');
        goal.textContent = scene.title;

        body.appendChild(badge);
        body.appendChild(goal);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.missionAutoAdvance);
    });
  }

  // MISSION 성공! (v0.2.5) — 웃는 아이 + 반짝임 (제품 이미지 없음)
  function renderMissionSuccess(scene) {
    showScreen(function (el) {
      shell(el, scene, '', function (body) {
        var burst = div('confetti-layer');
        addConfetti(burst, 26);

        var title = div('success-title');
        title.textContent = PHASES[4];              // "MISSION 성공!"

        var desc = div('success-desc');
        desc.textContent = scene.title;

        var stage = div('stage');
        var childBody = C.createAsset({
          src: CFG.assets.childHappy, label: CFG.placeholders.childHappy,
          shape: 'baby', variant: 'happy', className: 'child-body',
        });
        addSparkles(stage, 8);
        stage.appendChild(childBody);

        body.appendChild(burst);
        body.appendChild(title);
        body.appendChild(desc);
        body.appendChild(stage);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.successHold);
    });
  }

  // 최종 브랜드 페이지 (v0.2.5) — 제품 3종 + 브랜드 문구 + 다시하기
  // (장면 전환은 공통 Fade — showScreen 의 더블 버퍼 페이드 사용)
  function renderBrandFinal(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var logo = C.createAsset({ src: CFG.assets.logo, label: CFG.placeholders.logo, shape: 'logo', className: 'ending-logo' });

        var cards = div('cards is-compact');
        cards.appendChild(buildCard(CFG.assets.ending.bath, CFG.placeholders.endBath, 'mint', false));
        cards.appendChild(buildCard(CFG.assets.ending.cleanser, CFG.placeholders.endCleanser, 'blue', false));
        cards.appendChild(buildCard(CFG.assets.ending.lotion, CFG.placeholders.endLotion, 'cream', false));

        var desc = div('ending-sub');
        desc.textContent = scene.desc || '';

        body.appendChild(logo);
        body.appendChild(cards);
        body.appendChild(desc);
        body.appendChild(C.createButton(CFG.texts.replayButton, renderGate));
      });
    });
  }

  // 오늘의 미션 (보존 — 현재 흐름 미사용)
  function renderMission(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
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

  // 멘트형 (보존 — 현재 흐름 미사용)
  function renderMessage(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        body.appendChild(C.createMent(scene.text, scene.strong));
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.messageAutoAdvance);
    });
  }

  // 아이 반응 (울상/미소) — (보존 — 현재 흐름 미사용)
  function renderReaction(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
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
        body.appendChild(stage);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.inspectAutoAdvance);
    });
  }

  // 민감도 100% 경고 — v0.2.5: STEP 배지·제목 없이 게이지(100%)+경고 연출만 표시
  function renderWarning(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var gauge = buildGauge('rise');
        gauge.set(1);                       // 100% — 경고등/흔들림 자동 발동
        body.appendChild(gauge.el);

        var stage = div('stage');
        var childBody = C.createAsset({
          src: CFG.assets.childSad, label: CFG.placeholders.childSad,
          shape: 'baby', variant: 'sad', className: 'child-body is-distress',
        });
        addIrritations(childBody, 6);
        stage.appendChild(childBody);
        body.appendChild(stage);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      }, 'warn');
      tapAdvance(el);
      setTimer(next, CFG.timings.warningHold + 800);
    });
  }

  // 드래그형 (거품 + 게이지 + 계면이)
  // v0.2.5 게이지 규칙 — 장면별 gaugeFrom → gaugeTo 로 진행:
  //   STEP1: 0 → 1 (빨강) / STEP2: 1 → 0.5 (주황) / STEP3: 0.5 → 0 (파랑)
  function renderDrag(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var mode = scene.gauge;               // 'rise' | 'hold' | 'fall'
        var gauge = null, startLevel = 0, endLevel = 0;
        if (mode) {
          gauge = buildGauge(mode);
          // 시작값: gaugeFrom 지정 시 그 값, 아니면 rise=0 / hold·fall=현재값(100%)
          startLevel = scene.gaugeFrom != null ? clamp01(scene.gaugeFrom)
                     : (mode === 'rise' ? 0 : clamp01(state.irritation || 1));
          // 목표값: gaugeTo 지정 시 그 값, 아니면 rise=1 / fall=0 / hold=시작값
          endLevel = scene.gaugeTo != null ? clamp01(scene.gaugeTo)
                   : (mode === 'rise' ? 1 : (mode === 'fall' ? 0 : startLevel));
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

        // 계면이 — surfactantFrom(시작 잔량 비율) 만큼 표시하고,
        // surfactantTo(목표 잔량 비율) 까지 문지르는 진행도에 따라 씻겨나감
        //   STEP2: 1 → 0.5 (절반 제거) / STEP3: 0.5 → 0 (모두 제거)
        var surfEls = [];
        var surfFrom = scene.surfactantFrom != null ? clamp01(scene.surfactantFrom) : 1;
        var surfWashFraction = 0;   // 이번 장면에서 씻어낼 비율 (표시 개수 기준)
        if (scene.surfactant) {
          var surfCount = Math.max(1, Math.round(CFG.gauge.surfactantCount * surfFrom));
          surfEls = addSurfactants(childBody, surfCount);
          if (scene.surfactantTo != null && surfFrom > 0) {
            surfWashFraction = clamp01(1 - clamp01(scene.surfactantTo) / surfFrom);
          } else if (isRinse) {
            surfWashFraction = 1;   // (구버전 호환: rinse 는 전부 씻겨나감)
          }
        }

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
        body.appendChild(makeHint(scene.hint));   // 보조문구 (제목 아래)
        body.appendChild(stage);

        // POINT! 안내 박스 (esloUse 등 scene.point 가 있을 때)
        if (scene.point) {
          var pb = div('point-box');
          var pbT = div('pb-title');
          pbT.textContent = CFG.texts.scenes.pointTitle;
          var pbB = div('pb-body');
          pbB.textContent = scene.point;
          pb.appendChild(pbT);
          pb.appendChild(pbB);
          body.appendChild(pb);
        }

        function applyGauge(r) {
          if (!gauge) return 0;
          // 시작값 → 목표값 사이를 진행도(r)에 따라 보간
          var level = mode === 'hold' ? startLevel : startLevel + (endLevel - startLevel) * r;
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
            if (surfWashFraction > 0) washSurfactants(surfEls, r * surfWashFraction);
            applyGauge(r);
          },
          onComplete: function () {
            // 게이지를 목표값으로 확정 (STEP1→100%, STEP2→50%, STEP3→0%)
            if (gauge) {
              gauge.set(endLevel);
              if (mode !== 'hold') state.irritation = endLevel;
            }
            if (scene.weaken) weakenSurfactants(surfEls, 1);
            if (surfWashFraction > 0) washSurfactants(surfEls, surfWashFraction);

            // requireGaugeZero: 게이지가 0%인지 확인한 뒤에만 다음 단계로
            // ("진정 완료" 연출(calmHold)은 0%까지 내려가는 장면에서만 —
            //  STEP2 는 50%에서 멈추므로 짧은 완료 대기만)
            var reachesZero = mode === 'fall' && endLevel <= CFG.gauge.calmThreshold;
            var proceed = function () { setTimer(next, reachesZero ? CFG.timings.calmHold
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

  // 피부 클로즈업 (설명 화면 — STEP 배지 없음)
  function renderCloseup(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var panel = div('closeup-panel' + (scene.skin === 'irritated' ? ' is-irritated' : ''));
        addIrritations(panel, 8);
        if (scene.surfactant) addSurfactants(panel, 6);

        body.appendChild(panel);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);
      setTimer(next, CFG.timings.inspectAutoAdvance);
    });
  }

  // 이슬로 소개 (제품 + 키워드 — 설명 화면, STEP 배지 없음)
  function renderBrand(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
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

  // 미션 성공 연출 (보존 — 현재 흐름 미사용, missionSuccess 로 대체)
  function renderSuccess(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
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

  // 구 엔딩 (보존 — 현재 흐름 미사용, missionSuccess + brandFinal 로 분리)
  function renderEnding(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var sub = div('ending-sub');
        sub.textContent = scene.sub || '';
        body.appendChild(sub);

        // 웃는 아이 + 반짝임 (미션 성공 느낌)
        var row = div('ending-row');
        var stage = div('ending-baby');
        var childBody = C.createAsset({
          src: CFG.assets.childHappy, label: CFG.placeholders.childHappy,
          shape: 'baby', variant: 'happy', className: 'child-body',
        });
        addSparkles(stage, 6);
        stage.appendChild(childBody);
        row.appendChild(stage);

        // 이슬로 베이비 3종 (로고 + 제품 3개 + 제품명 캡션)
        var brandBox = div('ending-brand');
        var logo = C.createAsset({ src: CFG.assets.logo, label: CFG.placeholders.logo, shape: 'logo', className: 'ending-logo' });
        var brandName = div('ending-brand-name');
        brandName.textContent = CFG.texts.scenes.endingBrand;
        var cards = div('cards is-compact');
        cards.appendChild(buildCard(CFG.assets.ending.bath, CFG.placeholders.endBath, 'mint', false));
        cards.appendChild(buildCard(CFG.assets.ending.cleanser, CFG.placeholders.endCleanser, 'blue', false));
        cards.appendChild(buildCard(CFG.assets.ending.lotion, CFG.placeholders.endLotion, 'cream', false));
        var caption = div('ending-caption');
        caption.textContent = CFG.texts.scenes.endingProducts;
        brandBox.appendChild(logo);
        brandBox.appendChild(brandName);
        brandBox.appendChild(cards);
        brandBox.appendChild(caption);
        row.appendChild(brandBox);

        body.appendChild(row);
        body.appendChild(C.createButton(CFG.texts.replayButton, renderGate));
      });
    });
  }

  /* ---------- 게이지 컴포넌트 --------------------------------------- */
  // mode: 'rise' | 'hold' | 'fall' — "피부 진정 완료!"는 하강(fall) 모드에서만 표시
  function buildGauge(mode) {
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
      // 경고 연출(문구+흔들림+경고등)은 상승(rise) 계열에서만 —
      // 이슬로 사용(hold)/헹굼(fall)은 100%여도 조용히 표시 (레퍼런스 기준)
      if (mode === 'rise' && ratio >= CFG.gauge.warnThreshold) {
        wrap.classList.add('is-warning'); wrap.classList.remove('is-calm');
        status.textContent = TG.warn;
      } else if (mode === 'fall' && ratio <= CFG.gauge.calmThreshold) {
        // "피부 진정 완료!"는 헹굼(하강) 장면에서 0% 도달했을 때만
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

  function buildCard(src, label, variant, showName) {
    var card = div('product-card');
    var visual = C.createAsset({ src: src, label: label, shape: 'product', variant: variant, className: 'card-visual' });
    card.appendChild(visual);
    if (showName !== false) {           // 엔딩은 캡션 한 줄로 대체 (개별 이름 생략)
      var name = div('card-name');
      name.textContent = label;
      card.appendChild(name);
    }
    return card;
  }

  /* ---------- 항상 떠있는 요소 토글 --------------------------------- */
  function toggleChrome(show) {
    var d = show ? '' : 'none';
    if (controlPanel) controlPanel.style.display = d;
    if (bottomHint) bottomHint.style.display = d;
  }

  /* ---------- 좌측 컨트롤 패널 (처음으로/플레이/정지/다음) ----------------- */
  function makeCtrlButton(icon, label, onClick) {
    var b = document.createElement('button');
    b.className = 'ctrl-btn';
    var ico = div('ctrl-ico');
    ico.textContent = icon;
    var lbl = div('ctrl-lbl');
    lbl.textContent = label;
    b.appendChild(ico);
    b.appendChild(lbl);
    b.addEventListener('click', onClick);
    return b;
  }
  function buildControlPanel() {
    controlPanel = div('control-panel');
    var homeB = makeCtrlButton('🏠', CFG.texts.homeButton, goHome);
    playBtn = makeCtrlButton('▶', '플레이', playGame);
    pauseBtn = makeCtrlButton('⏸', '정지', pauseGame);
    nextBtn = makeCtrlButton('→', '다음', goNext);   // v0.2.7 — 다음 장면으로 즉시 이동
    nextBtn.classList.add('is-next');                // v0.2.8 — 파란 화살표 강조
    controlPanel.appendChild(homeB);
    controlPanel.appendChild(playBtn);
    controlPanel.appendChild(pauseBtn);
    controlPanel.appendChild(nextBtn);
    controlPanel.style.display = 'none';
    updateCtrlButtons();
    app.appendChild(controlPanel);
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

    // 좌측 컨트롤 패널: 처음으로/플레이/정지/다음 (운영자용 고정 컨트롤, 게임 중 표시)
    // (v0.2.1까지의 좌상단 "처음으로" 버튼을 이 패널로 통합)
    // 사용자용 "처음으로"·페이지 점은 카드 안쪽(shell)에 별도 표시 (v0.2.8)
    buildControlPanel();

    // 하단 안내 (게임 중)
    bottomHint = div('bottom-hint');
    bottomHint.textContent = CFG.texts.hints.homeHint;
    bottomHint.style.display = 'none';
    app.appendChild(bottomHint);

    renderGate();
  }

  // 외부 제어 API (콘솔/시연용): Game.goToStep(3), Game.pause() 등
  window.Game = {
    init: init,
    goToStep: goToStep,
    goHome: goHome,
    play: playGame,
    pause: pauseGame,
    next: goNext,        // v0.2.7 — 다음 장면으로 즉시 이동
  };
})();
