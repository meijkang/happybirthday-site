/* 第 8 页：大块像素和灯光交错飞入，拼成合照 */
(function () {
  'use strict';

  var A = window.Anniv;
  var Logic = window.AnnivLogic;
  var $ = A.$;
  var data = window.ANNIV_MOSAIC;
  var canvas = $('mosaic');
  var ctx = canvas.getContext('2d');
  var figure = canvas.parentElement;

  var FLY_MS = 2600;
  var SPREAD_MS = 2200;
  var HOLD_MS = 900;
  var LETTER_GAP_MS = 1100;
  var COLS = 6, ROWS = 4;
  var cell = canvas.width / COLS;
  var particles = [];
  var rafId = 0;
  var timers = [];
  var startTime = 0;

  $('finalePhoto').src = A.config.finalePhoto || data.src;

  (A.config.letter || []).forEach(function (text) {
    var p = document.createElement('p');
    p.textContent = text;
    $('letterBody').appendChild(p);
  });
  $('letterSign').textContent = A.config.sign || '';
  var letterLines = Array.prototype.slice.call($('letterBody').children).concat([$('letterSign')]);

  function colorAt(c, r) {
    // 大块拼图不是取照片前 24 个小像素，而是均匀取整张照片的颜色。
    var srcC = Math.floor((c + .5) / COLS * data.cols);
    var srcR = Math.floor((r + .5) / ROWS * data.rows);
    var i = (srcR * data.cols + srcC) * 6;
    return '#' + data.hex.substr(i, 6);
  }

  function buildParticles() {
    var random = Logic.seededRandom(Date.now());
    var list = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var isPixel = (c + r) % 2 === 0;
        list.push({
          color: colorAt(c, r),
          isPixel: isPixel,
          tx: c * cell, ty: r * cell,
          sx: isPixel ? -80 - random() * 320 : canvas.width + 80 + random() * 320,
          sy: isPixel ? canvas.height * (.5 + random() * .7) : -canvas.height * (.2 + random() * .6),
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
      var y = p.sy + (p.ty - p.sy) * e + Math.sin(t * Math.PI) * (p.isPixel ? -50 : 34);
      ctx.fillStyle = p.color;
      if (p.isPixel) {
        ctx.fillRect(x, y, cell - 1, cell - 1);
      } else {
        ctx.beginPath();
        ctx.arc(x + half, y + half, half * (1.5 - .35 * e), 0, Math.PI * 2);
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
    // 这页的核心就是飞入拼图；即使系统开了“减少动态效果”也保留。
    startTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  A.onEnter('p-finale', play);
  A.onLeave('p-finale', stop);
  $('finaleReplay').addEventListener('click', play);
})();
