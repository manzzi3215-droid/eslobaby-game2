/* =============================================================================
 * qrcode.js — 외부 라이브러리 없는 순수 QR 코드 생성기 (오프라인/GitHub Pages OK)
 * -----------------------------------------------------------------------------
 * 바이트 모드 인코딩 + Reed-Solomon 오류정정 + 자동 버전/마스크 선택까지 구현.
 * Project Nayuki QR Code generator(퍼블릭 도메인) 알고리즘을 ES5로 이식.
 *
 * 사용:
 *   var m = QRCodeGen.toModules('https://...', 'M');  // 2차원 boolean 배열
 *   var svg = QRCodeGen.toSVG('https://...', { ecl:'M', margin:4, dark:'#2f4858' });
 *
 * 실제 스캔 가능한 코드입니다. (라이브러리 불필요 / index.html 실행에 영향 없음)
 * ========================================================================== */
(function () {
  'use strict';

  // 오류정정 레벨: ordinal = 블록 테이블 인덱스, fb = 포맷 비트값
  var ECC = {
    L: { ord: 0, fb: 1 },
    M: { ord: 1, fb: 0 },
    Q: { ord: 2, fb: 3 },
    H: { ord: 3, fb: 2 },
  };

  // 버전(1~40)별 블록당 EC 코드워드 수 [ecl.ord][version] (0번 인덱스 미사용)
  var ECC_CODEWORDS_PER_BLOCK = [
    [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
    [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  ];
  // 버전별 EC 블록 수 [ecl.ord][version]
  var NUM_EC_BLOCKS = [
    [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
    [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
    [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
    [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81],
  ];

  var MIN_VER = 1, MAX_VER = 40;

  /* ---------- GF(256) 산술 (원시 다항식 0x11D) ---------------------- */
  function gfMul(a, b) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((b >>> i) & 1) * a;
    }
    return z & 0xFF;
  }

  /* ---------- Reed-Solomon --------------------------------------------- */
  function rsDivisor(degree) {
    var result = [];
    for (var i = 0; i < degree - 1; i++) result.push(0);
    result.push(1);                       // 단항식 x^0 = 1
    var root = 1;
    for (i = 0; i < degree; i++) {
      for (var j = 0; j < result.length; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }
  function rsRemainder(data, divisor) {
    var result = divisor.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ result.shift();
      result.push(0);
      divisor.forEach(function (d, i) { result[i] ^= gfMul(d, factor); });
    });
    return result;
  }

  /* ---------- 용량 계산 ------------------------------------------------ */
  function numRawDataModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }
  function numDataCodewords(ver, eclOrd) {
    return Math.floor(numRawDataModules(ver) / 8)
      - ECC_CODEWORDS_PER_BLOCK[eclOrd][ver] * NUM_EC_BLOCKS[eclOrd][ver];
  }

  /* ---------- 텍스트 → 바이트(UTF-8) ---------------------------------- */
  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) {
        out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      } else if (c >= 0xD800 && c < 0xDC00 && i + 1 < str.length) {
        var c2 = str.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F),
                 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
      } else {
        out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
      }
    }
    return out;
  }

  /* ---------- 정렬 패턴 위치 ------------------------------------------ */
  function alignPatternPositions(ver) {
    if (ver === 1) return [];
    var numAlign = Math.floor(ver / 7) + 2;
    var step = Math.floor((ver * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
    var result = [6];
    for (var pos = ver * 4 + 10; result.length < numAlign; pos -= step) {
      result.splice(1, 0, pos);
    }
    return result;
  }

  /* ---------- QR 매트릭스 생성 ---------------------------------------- */
  function QrCode(ver, eclKey, dataCodewords, mask) {
    this.version = ver;
    this.ecl = ECC[eclKey];
    this.size = ver * 4 + 17;
    var size = this.size;

    this.modules = [];
    this.isFunction = [];
    for (var i = 0; i < size; i++) {
      this.modules.push(new Array(size).fill(false));
      this.isFunction.push(new Array(size).fill(false));
    }

    this.drawFunctionPatterns();
    var allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);

    // 마스크 선택 (mask<0 이면 penalty 최소 마스크 자동 선택)
    if (mask < 0) {
      var minPenalty = Infinity;
      for (var m = 0; m < 8; m++) {
        this.applyMask(m);
        this.drawFormatBits(m);
        var p = this.penaltyScore();
        if (p < minPenalty) { mask = m; minPenalty = p; }
        this.applyMask(m);   // XOR 되돌리기
      }
    }
    this.mask = mask;
    this.applyMask(mask);
    this.drawFormatBits(mask);
    this.isFunction = null;
  }

  QrCode.prototype.setFunctionModule = function (x, y, isDark) {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  };

  QrCode.prototype.drawFunctionPatterns = function () {
    var size = this.size, i;
    // 타이밍 패턴
    for (i = 0; i < size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }
    // 파인더 패턴 3개 (+ 분리자)
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(size - 4, 3);
    this.drawFinderPattern(3, size - 4);
    // 정렬 패턴
    var align = alignPatternPositions(this.version);
    var n = align.length;
    for (i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        this.drawAlignmentPattern(align[i], align[j]);
      }
    }
    // 포맷/버전 정보 자리 (실제 값은 나중에)
    this.drawFormatBits(0);
    this.drawVersion();
  };

  QrCode.prototype.drawFinderPattern = function (x, y) {
    for (var dy = -4; dy <= 4; dy++) {
      for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy));
        var xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  };

  QrCode.prototype.drawAlignmentPattern = function (x, y) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  };

  QrCode.prototype.drawFormatBits = function (mask) {
    var data = (this.ecl.fb << 3) | mask;
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;

    // 좌상단 파인더 주변
    for (i = 0; i <= 5; i++) this.setFunctionModule(8, i, getBit(bits, i));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, getBit(bits, i));

    var size = this.size;
    for (i = 0; i < 8; i++) this.setFunctionModule(size - 1 - i, 8, getBit(bits, i));
    for (i = 8; i < 15; i++) this.setFunctionModule(8, size - 15 + i, getBit(bits, i));
    this.setFunctionModule(8, size - 8, true);   // 항상 검은 모듈
  };

  QrCode.prototype.drawVersion = function () {
    if (this.version < 7) return;
    var rem = this.version;
    for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    var bits = (this.version << 12) | rem;
    for (i = 0; i < 18; i++) {
      var bit = getBit(bits, i);
      var a = this.size - 11 + i % 3, b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  };

  QrCode.prototype.addEccAndInterleave = function (data) {
    var ver = this.version, eclOrd = this.ecl.ord;
    var numBlocks = NUM_EC_BLOCKS[eclOrd][ver];
    var blockEccLen = ECC_CODEWORDS_PER_BLOCK[eclOrd][ver];
    var rawCodewords = Math.floor(numRawDataModules(ver) / 8);
    var numShort = numBlocks - rawCodewords % numBlocks;
    var shortLen = Math.floor(rawCodewords / numBlocks);

    var blocks = [];
    var rsDiv = rsDivisor(blockEccLen);
    for (var i = 0, k = 0; i < numBlocks; i++) {
      var datLen = shortLen - blockEccLen + (i < numShort ? 0 : 1);
      var dat = data.slice(k, k + datLen);
      k += datLen;
      var ecc = rsRemainder(dat, rsDiv);
      if (i < numShort) dat.push(0);       // 짧은 블록 정렬용 패딩
      blocks.push(dat.concat(ecc));
    }

    var result = [];
    for (i = 0; i < blocks[0].length; i++) {
      for (var j = 0; j < blocks.length; j++) {
        // 짧은 블록의 패딩 바이트는 건너뜀
        if (i !== shortLen - blockEccLen || j >= numShort) result.push(blocks[j][i]);
      }
    }
    return result;
  };

  QrCode.prototype.drawCodewords = function (data) {
    var size = this.size, i = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;          // 세로 타이밍 열 건너뜀
      for (var vert = 0; vert < size; vert++) {
        for (var jj = 0; jj < 2; jj++) {
          var x = right - jj;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  };

  QrCode.prototype.applyMask = function (mask) {
    for (var y = 0; y < this.size; y++) {
      for (var x = 0; x < this.size; x++) {
        if (this.isFunction[y][x]) continue;
        var invert;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = (x * y) % 2 + (x * y) % 3 === 0; break;
          case 6: invert = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
          case 7: invert = ((x + y) % 2 + (x * y) % 3) % 2 === 0; break;
        }
        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  };

  QrCode.prototype.penaltyScore = function () {
    var size = this.size, result = 0, x, y;
    var mods = this.modules;
    // 규칙 1: 같은 색 연속 (행/열)
    for (y = 0; y < size; y++) {
      var runColor = false, runX = 0;
      var hist = [0, 0, 0, 0, 0, 0, 0];
      for (x = 0; x < size; x++) {
        if (mods[y][x] === runColor) {
          runX++;
          if (runX === 5) result += 3;
          else if (runX > 5) result++;
        } else { runColor = mods[y][x]; runX = 1; }
      }
    }
    for (x = 0; x < size; x++) {
      var runColorC = false, runY = 0;
      for (y = 0; y < size; y++) {
        if (mods[y][x] === runColorC) {
          runY++;
          if (runY === 5) result += 3;
          else if (runY > 5) result++;
        } else { runColorC = mods[y][x]; runY = 1; }
      }
    }
    // 규칙 2: 2x2 같은 색 블록
    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        var c = mods[y][x];
        if (c === mods[y][x + 1] && c === mods[y + 1][x] && c === mods[y + 1][x + 1]) result += 3;
      }
    }
    // 규칙 3: 파인더 유사 패턴 (1:1:3:1:1)
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        if (x + 6 < size && matchFinder(mods, x, y, 1, 0)) result += 40;
        if (y + 6 < size && matchFinder(mods, x, y, 0, 1)) result += 40;
      }
    }
    // 규칙 4: 흑백 균형
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (mods[y][x]) dark++;
    var total = size * size;
    var k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * 10;
    return result;
  };

  function matchFinder(mods, x, y, dx, dy) {
    // 패턴: dark,light,dark,dark,dark,light,dark (1:1:3:1:1)
    var pat = [true, false, true, true, true, false, true];
    for (var i = 0; i < 7; i++) {
      if (mods[y + dy * i][x + dx * i] !== pat[i]) return false;
    }
    return true;
  }

  function getBit(x, i) { return ((x >>> i) & 1) !== 0; }

  /* ---------- 인코딩 진입점 ------------------------------------------- */
  function encodeText(text, eclKey) {
    eclKey = eclKey || 'M';
    var ecl = ECC[eclKey];
    var bytes = utf8Bytes(text);

    // 버전 선택
    var ver, dataCapacityBits, ccBits, usedBits;
    for (ver = MIN_VER; ; ver++) {
      if (ver > MAX_VER) throw new Error('데이터가 QR 최대 용량을 초과했습니다.');
      dataCapacityBits = numDataCodewords(ver, ecl.ord) * 8;
      ccBits = ver <= 9 ? 8 : 16;                 // 바이트 모드 문자 수 지시자 비트
      usedBits = 4 + ccBits + bytes.length * 8;
      if (usedBits <= dataCapacityBits) break;
    }

    // 비트 버퍼 구성
    var bb = [];
    appendBits(bb, 0x4, 4);                        // 모드 지시자: 바이트(0100)
    appendBits(bb, bytes.length, ccBits);
    for (var i = 0; i < bytes.length; i++) appendBits(bb, bytes[i], 8);

    // 종단자 + 바이트 정렬 패딩
    appendBits(bb, 0, Math.min(4, dataCapacityBits - bb.length));
    appendBits(bb, 0, (8 - bb.length % 8) % 8);
    for (var pad = 0xEC; bb.length < dataCapacityBits; pad ^= 0xEC ^ 0x11) {
      appendBits(bb, pad, 8);
    }

    // 비트 → 바이트
    var dataCodewords = [];
    for (i = 0; i < bb.length; i += 8) {
      var byteVal = 0;
      for (var b = 0; b < 8; b++) byteVal = (byteVal << 1) | bb[i + b];
      dataCodewords.push(byteVal);
    }

    return new QrCode(ver, eclKey, dataCodewords, -1);
  }

  function appendBits(bb, val, len) {
    for (var i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
  }

  /* ---------- 퍼블릭 API ---------------------------------------------- */
  function toModules(text, eclKey) {
    var qr = encodeText(text, eclKey);
    return qr.modules;                             // 2차원 boolean 배열
  }

  function toSVG(text, opts) {
    opts = opts || {};
    var eclKey = opts.ecl || 'M';
    var margin = opts.margin != null ? opts.margin : 4;
    var dark = opts.dark || '#2f4858';
    var light = opts.light || '#ffffff';
    var qr = encodeText(text, eclKey);
    var size = qr.size;
    var dim = size + margin * 2;

    var parts = [];
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        if (qr.modules[y][x]) {
          parts.push('M' + (x + margin) + ',' + (y + margin) + 'h1v1h-1z');
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" '
      + 'shape-rendering="crispEdges" role="img" aria-label="QR code">'
      + '<rect width="' + dim + '" height="' + dim + '" fill="' + light + '"/>'
      + '<path d="' + parts.join('') + '" fill="' + dark + '"/>'
      + '</svg>';
  }

  window.QRCodeGen = { toModules: toModules, toSVG: toSVG, encodeText: encodeText };
})();
