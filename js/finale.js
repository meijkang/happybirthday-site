/* 第 6 页：游戏的像素（方块）和演出的灯（光点）交错着飞进来，拼成合照 */
(function () {
  'use strict';

  var A = window.Anniv;
  var Logic = window.AnnivLogic;
  var $ = A.$;
  var data = window.ANNIV_MOSAIC;
  var canvas = $('mosaic');
  var ctx = canvas.getContext('2d');
  var figure = canvas.parentElement;

  var FLY_MS = 2600;      // 每一粒飞行的时间
  var SPREAD_MS = 2200;   // 出发时间错开的范围
  var HOLD_MS = 900;      // 拼好之后停一下，再显出真照片
  var LETTER_GAP_MS = 1100;

  var cell = canvas.width / data.cols;
  var particles = [];
  var rafId = 0;
  var timers = [];
  var startTime = 0;

  $('finalePhoto').src = data.src;

  // 信的内容
  (A.config.letter || []).forEach(function (text) {
    var p = document.createElement('p');
    p.textContent = text;
    $('letterBody').appendChild(p);
  });
  $('letterSign').textContent = A.config.sign || '';
  var letterLines = Array.prototype.slice.call($('letterBody').children).concat([$('letterSign')]);

  function buildParticles() {
    var random = Logic.seededRandom(Date.now());
    var list = [];
    for (var r = 0; r < data.rows; r++) {
      for (var c = 0; c < data.cols; c++) {
        var i = (r * data.cols + c) * 6;
        var isPixel = (c + r) % 2 === 0; // 棋盘格：一格像素，一格灯光，交织在一起
        list.push({
          color: '#' + data.hex.substr(i, 6),
          isPixel: isPixel,
          tx: c * cell, ty: r * cell,
          // 像素从左下（游戏那边）来，灯光从右上（舞台那边）来
          sx: isPixel ? -40 - random() * 260 : canvas.width + 40 + random() * 260,
          sy: isPixel ? canvas.height * (0.5 + random() * 0.7) : -canvas.height * (0.2 + random() * 0.6),
          delay: random() * SPREAD_MS,
        });
      }
    }
    return list;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function drawFrame(elapsed) {
    ctx.fillStyle = '#0c0a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var half = cell / 2;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var t = Math.max(0, Math.min(1, (elapsed - p.delay) / FLY_MS));
      if (t === 0) continue;
      var e = easeOutCubic(t);
      var x = p.sx + (p.tx - p.sx) * e;
      var y = p.sy + (p.ty - p.sy) * e + Math.sin(t * Math.PI) * (p.isPixel ? -60 : 40);
      ctx.fillStyle = p.color;
      if (p.isPixel) {
        ctx.fillRect(x, y, cell, cell);
      } else {
        ctx.beginPath();
        ctx.arc(x + half, y + half, half * (1.6 - 0.45 * e), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function tick(now) {
    var elapsed = now - startTime;
    drawFrame(elapsed);
    if (elapsed < FLY_MS + SPREAD_MS) rafId = requestAnimationFrame(tick);
    else timers.push(setTimeout(reveal, HOLD_MS));
  }

  function reveal() {
    figure.classList.add('is-real');
    A.sfx('fanfare');
    letterLines.forEach(function (line, index) {
      timers.push(setTimeout(function () { line.classList.add('is-shown'); }, 600 + index * LETTER_GAP_MS));
    });
  }

  function stop() {
    cancelAnimationFrame(rafId);
    timers.forEach(clearTimeout);
    timers = [];
  }

  function play() {
    stop();
    figure.classList.remove('is-real');
    letterLines.forEach(function (line) { line.classList.remove('is-shown'); });
    particles = buildParticles();
    if (A.reducedMotion) {
      drawFrame(FLY_MS + SPREAD_MS);
      reveal();
      return;
    }
    startTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  A.onEnter('p-finale', play);
  A.onLeave('p-finale', stop);
  $('finaleReplay').addEventListener('click', play);
})();
