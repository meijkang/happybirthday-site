/* 第 5 页：小游戏的画面、输入和循环（规则在 game-core.js） */
(function () {
  'use strict';

  var A = window.Anniv;
  var G = window.AnnivGame;
  var $ = A.$;
  var canvas = $('gameCanvas');
  var ctx = canvas.getContext('2d');
  var TILE = G.TILE;
  var STEP_MS = 1000 / 60;

  var PALETTE = {
    h: '#1d1a22', s: '#f2c9a5', k: '#1d1a22', b: '#2f3f66', w: '#f4ecdd', n: '#39415c',
    H: '#3a2b2b', p: '#f7b6c2', q: '#fff6f4', g: '#c9d4ff', r: '#d9482b',
  };
  var SPRITES = {
    p1: [
      '..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', '.hssssssh.', '.sskssks..', '.ssssssss.', '..ssssss..',
      '.bbwwbbww.', 'sbbwwbbwws', 'sbbwwbbwws', '.bbwwbbww.', '.nnnnnnnn.', '.nn....nn.', '.kk....kk.',
    ],
    p2: [
      '..HHHHHH..', '.HHHHHHHH.', '.HHHHHHHH.', '.HssssssH.', '.Hgkssgk..', 'HHssssssH.', 'HH.ssss.HH',
      'H.pqpqpq.H', '.spqpqpqs.', '.spqpqpqs.', '..pppppp..', '.pppppppp.', '..ss..ss..', '..kk..kk..',
    ],
  };
  var WALK_LEGS = ['..nn..nn..', '...kk.kk..'];

  var game = G.createGame();
  var input = { left: false, right: false, jump: false };
  var running = false;
  var started = false;
  var lastTime = 0;
  var acc = 0;
  var rafId = 0;
  var bannerTimer = 0;
  var RESTART_GUARD_MS = 700; // 通关后短时间内不接受“按跳重开”，免得按着跳键把通关画面跳过去
  var wonAt = -1e9;

  function banner(text, big, ms) {
    var el = $('gameBanner');
    el.textContent = text;
    el.classList.toggle('is-big', !!big);
    clearTimeout(bannerTimer);
    if (ms) bannerTimer = setTimeout(function () { el.textContent = ''; }, ms);
  }

  /* ---------- 画 ---------- */
  function drawSprite(rows, x, y, face, walkFrame) {
    for (var r = 0; r < rows.length; r++) {
      var row = (walkFrame && r >= 12 && rows === SPRITES.p1) ? WALK_LEGS[r - 12] : rows[r];
      for (var c = 0; c < row.length; c++) {
        var color = PALETTE[row[c]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x) + (face < 0 ? row.length - 1 - c : c), Math.round(y) + r, 1, 1);
      }
    }
  }

  function drawHeart(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y, 2, 1); ctx.fillRect(x + 5, y, 2, 1);
    ctx.fillRect(x, y + 1, 8, 3);
    ctx.fillRect(x + 1, y + 4, 6, 1); ctx.fillRect(x + 2, y + 5, 4, 1); ctx.fillRect(x + 3, y + 6, 2, 1);
  }

  function drawBackground(camX) {
    var duo = game.phase === 'duo' || game.phase === 'won';
    var sky = ctx.createLinearGradient(0, 0, 0, G.VIEW_H);
    sky.addColorStop(0, duo ? '#2a1d5c' : '#1b1f3a');
    sky.addColorStop(1, duo ? '#e0568a' : '#3d4a7a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, G.VIEW_W, G.VIEW_H);
    ctx.fillStyle = '#fff';
    for (var i = 0; i < 40; i++) {
      var sx = ((i * 97 - camX * 0.15) % 420 + 420) % 420 - 10;
      var sy = (i * 53) % 120;
      if ((i + Math.floor(game.t / 30)) % 5) ctx.fillRect(Math.round(sx), sy, 1, 1);
    }
    ctx.fillStyle = duo ? '#4a2f7a' : '#2b3560';
    for (var h = 0; h < 8; h++) {
      var hx = ((h * 130 - camX * 0.4) % 1040 + 1040) % 1040 - 130;
      ctx.beginPath();
      ctx.arc(Math.round(hx), G.GROUND_Y + 20, 70 + (h % 3) * 14, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawTiles(camX) {
    var first = Math.max(0, Math.floor(camX / TILE));
    var last = Math.min(G.COLS - 1, first + Math.ceil(G.VIEW_W / TILE) + 1);
    for (var r = 0; r < G.ROWS; r++) {
      for (var c = first; c <= last; c++) {
        var t = game.level.grid[r][c];
        if (t === ' ') continue;
        var x = c * TILE - camX;
        var y = r * TILE;
        if (t === 'B') {
          ctx.fillStyle = '#c8553d'; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#7d2f20'; ctx.fillRect(x, y + 7, TILE, 1); ctx.fillRect(x + 7, y, 1, 7); ctx.fillRect(x + 3, y + 8, 1, 8); ctx.fillRect(x + 11, y + 8, 1, 8);
          ctx.fillRect(x, y + 15, TILE, 1);
        } else {
          var top = r === 0 || game.level.grid[r - 1][c] === ' ';
          ctx.fillStyle = '#6b4a3a'; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#573a2d'; ctx.fillRect(x + 3, y + 6, 3, 2); ctx.fillRect(x + 10, y + 11, 3, 2);
          if (top) { ctx.fillStyle = '#7fb069'; ctx.fillRect(x, y, TILE, 4); ctx.fillStyle = '#a7d08c'; ctx.fillRect(x, y, TILE, 1); }
        }
      }
    }
  }

  function drawThings(camX) {
    var bob = Math.round(Math.sin(game.t / 12) * 1.5);
    game.hearts.forEach(function (h) {
      if (!h.taken) drawHeart(Math.round(h.x - camX), h.y + bob, '#ff8fb0');
    });
    game.enemies.forEach(function (e) {
      if (!e.alive) return;
      var x = Math.round(e.x - camX);
      ctx.fillStyle = '#8b90a8'; ctx.fillRect(x + 1, e.y + 2, 10, 8); ctx.fillRect(x + 3, e.y, 6, 3); ctx.fillRect(x, e.y + 5, 12, 4);
      ctx.fillStyle = '#1d1a22'; ctx.fillRect(x + 3, e.y + 5, 2, 2); ctx.fillRect(x + 7, e.y + 5, 2, 2);
    });
    // 终点：舞台的旗
    var fx = Math.round(G.FLAG_COL * TILE - camX);
    ctx.fillStyle = '#f4ecdd'; ctx.fillRect(fx + 6, G.GROUND_Y - 80, 2, 80);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(fx + 8, G.GROUND_Y - 80, 22, 16);
    drawHeart(fx + 15, G.GROUND_Y - 76, '#d9482b');
    ctx.fillStyle = '#fff'; ctx.font = '8px Consolas, monospace'; ctx.fillText('LIVE', fx + 9, G.GROUND_Y - 84);
    // 2P 加入点的路牌
    var jx = Math.round(G.JOIN_COL * TILE - camX);
    ctx.fillStyle = '#f4ecdd'; ctx.fillRect(jx + 28, G.GROUND_Y - 22, 2, 22); ctx.fillRect(jx + 18, G.GROUND_Y - 30, 22, 10);
    ctx.fillStyle = '#e0568a'; ctx.fillText('2P', jx + 24, G.GROUND_Y - 22);
  }

  function drawHeroes(camX) {
    var p = game.p1;
    var walk = p.onGround && p.vx !== 0 && Math.floor(game.t / 6) % 2 === 1;
    if (game.phase === 'joining') {
      var progress = 1 - game.joinTimer / G.JOIN_FRAMES;
      var dropY = -20 + (p.y + 20) * Math.min(1, progress * 1.4);
      var px = p.x - 14 - camX;
      ctx.fillStyle = 'rgba(255, 210, 63, .25)'; ctx.fillRect(Math.round(px) - 3, 0, 16, dropY + 14);
      drawSprite(SPRITES.p2, px, dropY, 1, false);
    }
    if (game.p2) drawSprite(SPRITES.p2, game.p2.x - camX, game.p2.y, game.p2.face, false);
    if (game.invuln === 0 || Math.floor(game.t / 4) % 2) drawSprite(SPRITES.p1, p.x - camX, p.y, p.face, walk);
    if (game.p2) drawHeart(Math.round((p.x + game.p2.x) / 2 - camX + 1), Math.round(Math.min(p.y, game.p2.y) - 12 + Math.sin(game.t / 10) * 2), '#ff8fb0');
  }

  function draw() {
    var camX = Math.max(0, Math.min(G.COLS * TILE - G.VIEW_W, Math.round(game.p1.x - G.VIEW_W * 0.4)));
    ctx.imageSmoothingEnabled = false;
    drawBackground(camX);
    drawTiles(camX);
    drawThings(camX);
    drawHeroes(camX);
  }

  /* ---------- 事件 ---------- */
  function handleEvents() {
    game.events.forEach(function (name) {
      if (name === 'jump' || name === 'boost' || name === 'heart' || name === 'stomp' || name === 'hurt') A.sfx(name);
      if (name === 'heart') $('hudHearts').textContent = game.collected;
      if (name === 'hurt') banner('没关系，再来。', false, 1200);
      if (name === 'join') {
        A.sfx('join');
        banner('PLAYER 2 JOINED!', true);
        $('hudP2').classList.add('is-on');
        $('h-game').textContent = '后来，2P 加入了';
      }
      if (name === 'duo') banner('一个人跳不过的墙，两个人可以：在空中再按一次跳', false, 6000);
      if (name === 'won') onWon();
    });
  }

  function onWon() {
    running = false;
    wonAt = performance.now();
    input.left = input.right = input.jump = false;
    A.sfx('fanfare');
    banner('');
    $('gameOverlayTitle').innerHTML = 'STAGE CLEAR<br>♥ × ' + game.collected;
    $('gameStart').textContent = '再玩一次';
    $('gameOverlay').hidden = false;
    $('h-game').textContent = '一起通关';
    A.nudgeNext('p-game');
  }

  /* ---------- 循环 ---------- */
  function frame(now) {
    if (!running) return;
    acc += Math.min(100, now - lastTime);
    lastTime = now;
    while (acc >= STEP_MS && running) {
      G.step(game, input);
      handleEvents();
      acc -= STEP_MS;
    }
    draw();
    if (running) rafId = requestAnimationFrame(frame);
  }

  function resume() {
    if (running || !started || game.phase === 'won') return;
    running = true; lastTime = performance.now(); acc = 0;
    rafId = requestAnimationFrame(frame);
  }
  function pause() {
    running = false; cancelAnimationFrame(rafId);
    input.left = input.right = input.jump = false;
  }

  function start() {
    game = G.createGame();
    started = true;
    input.left = input.right = input.jump = false;
    $('gameOverlay').hidden = true;
    $('hudHearts').textContent = '0';
    $('hudP2').classList.remove('is-on');
    $('h-game').textContent = '本来，这个游戏只有一个玩家';
    banner('一直往右走', false, 2500);
    canvas.focus();
    resume();
  }

  $('gameStart').addEventListener('click', start);

  var KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ' ': 'jump', ArrowUp: 'jump', w: 'jump', W: 'jump' };
  function isActive() { return started && game.phase !== 'won'; }
  function canQuickStart() { return performance.now() - wonAt > RESTART_GUARD_MS; }
  A.gameActive = isActive;

  function onKey(event, down) {
    if (A.currentPageId() !== 'p-game') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return; // 不抢浏览器快捷键
    var action = KEYS[event.key];
    if (!action) return;
    if (!down) { input[action] = false; return; } // 松键任何时候都要生效
    if (!isActive()) {
      if (action === 'jump' && !event.repeat && canQuickStart() && document.activeElement !== $('gameStart')) { start(); event.preventDefault(); }
      return;
    }
    input[action] = true;
    event.preventDefault();
  }
  window.addEventListener('keydown', function (event) { onKey(event, true); });
  window.addEventListener('keyup', function (event) { onKey(event, false); });
  window.addEventListener('blur', function () { input.left = input.right = input.jump = false; });

  [['padLeft', 'left'], ['padRight', 'right'], ['padJump', 'jump']].forEach(function (pair) {
    var btn = $(pair[0]);
    function set(down) { input[pair[1]] = down; btn.classList.toggle('is-down', down); }
    btn.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      if (!isActive()) { if (canQuickStart()) start(); return; }
      set(true);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
      btn.addEventListener(type, function () { set(false); });
    });
    btn.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  });

  canvas.tabIndex = -1;
  A.onEnter('p-game', resume);
  A.onLeave('p-game', pause);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else if (A.currentPageId() === 'p-game') resume();
  });

  draw();

  // 给自动化测试用：读状态、让机器人代打
  window.__annivGame = {
    state: function () { return game; },
    bot: function (untilPhase) {
      var bot = G.createBot();
      var guard = 0;
      var target = untilPhase || 'won';
      while (game.phase !== target && game.phase !== 'won' && guard++ < 60 * 240) { G.step(game, bot(game)); handleEvents(); }
      draw();
      return game.phase;
    },
  };
})();
