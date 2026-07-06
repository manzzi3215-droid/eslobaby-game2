/* =============================================================================
 * sw.js — 서비스워커 (PWA 기본 오프라인 캐싱)
 * -----------------------------------------------------------------------------
 * 복잡한 전략 없이 "기본 캐싱" 수준만 구현합니다.
 *  - install: 핵심 파일 미리 캐싱 (precache)
 *  - fetch  : 캐시 우선(cache-first), 없으면 네트워크 → 성공 시 캐시에 추가
 *  - activate: 이전 버전 캐시 정리
 *
 * 경로는 모두 상대경로(./) 라 GitHub Pages 하위 경로(/eslobaby-game2/)에서도 동작.
 * 게임 내용이 바뀌면 CACHE_NAME 의 버전을 올리면 새로 캐싱됩니다.
 * ========================================================================== */
'use strict';

var CACHE_NAME = 'eslo-game-v0.2.8';

// 미리 캐싱할 핵심 파일 (상대경로)
var PRECACHE = [
  './',
  './index.html',
  './share.html',
  './config.js',
  './manifest.webmanifest',
  './css/reset.css',
  './css/theme.css',
  './css/game.css',
  './css/share.css',
  './js/components.js',
  './js/scenes.js',
  './js/interactions.js',
  './js/game.js',
  './js/main.js',
  './js/qrcode.js',
  './js/share.js',
  './assets/icons/icon.svg',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // 일부 파일이 없어도 설치가 실패하지 않도록 개별 처리
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;               // GET 요청만 캐싱

  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;                  // 캐시 우선
      return fetch(req).then(function (res) {
        // 정상 응답이면 캐시에 저장 (동일 출처만)
        if (res && res.status === 200 && req.url.indexOf(self.location.origin) === 0) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // 오프라인 & 미캐싱 문서 요청이면 index.html 로 폴백
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
