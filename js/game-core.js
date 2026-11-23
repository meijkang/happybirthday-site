/* 小游戏的规则和物理：不碰 DOM，node 里可以直接跑通关测试。 */
(function (root) {
  'use strict';

  var TILE = 16;
  var VIEW_W = 400;
  var VIEW_H = 224;
  var COLS = 150;
  var ROWS = 14;
  var GROUND_ROW = 12;
  var GROUND_Y = GROUND_ROW * TILE;

  var PHYS = { gravity: 0.35, jumpV: -6.2, run: 2, maxFall: 7, cutV: -2.5, coyote: 6, buffer: 6 };
  var HERO = { w: 10, h: 14 };
  var ENEMY = { w: 12, h: 10, speed: 0.5 };
  var JOIN_COL = 73;      // 走到这里，2P 加入
  var WALL_COL = 78;      // 一个人跳不过去的墙
  var FLAG_COL = 144;
  var JOIN_FRAMES = 150;
  var HURT_FRAMES = 90;
  var FOLLOW_LAG = 14;
  var TRAIL_MAX = 80;

  var PITS = [[18, 20], [35, 37], [53, 55], [96, 100], [116, 120]];
  var BRICKS = [[23, 8, 4], [41, 9, 3], [45, 7, 3], [59, 8, 4], [86, 9, 3], [126, 8, 4]];
  var WALLS = [[WALL_COL, 7, 2], [108, 8, 2]]; // [列, 顶部所在行, 宽]
  var HEARTS = [[10, 10], [19, 8], [24, 6], [25, 6], [36, 8], [42, 7], [46, 5], [54, 8],
    [60, 6], [61, 6], [78, 5], [79, 5], [87, 7], [98, 6], [108, 6], [118, 6], [127, 6], [128, 6], [138, 10]];
  var ENEMIES = [[28, 33], [64, 70], [84, 93], [129, 138]]; // 巡逻的列范围

  function buildLevel() {
    var grid = [];
    var r, c, i;
    for (r = 0; r < ROWS; r++) {
      var row = [];
      for (c = 0; c < COLS; c++) row.push(r >= GROUND_ROW ? '#' : ' ');
      grid.push(row);
    }
    PITS.forEach(function (p) {
      for (c = p[0]; c <= p[1]; c++) for (r = GROUND_ROW; r < ROWS; r++) grid[r][c] = ' ';
    });
    BRICKS.forEach(function (b) {
      for (i = 0; i < b[2]; i++) grid[b[1]][b[0] + i] = 'B';
    });
    WALLS.forEach(function (w) {
      for (i = 0; i < w[2]; i++) for (r = w[1]; r < GROUND_ROW; r++) grid[r][w[0] + i] = '#';
    });
    return { grid: grid, cols: COLS, rows: ROWS };
  }

  function solidAt(level, px, py) {
    var c = Math.floor(px / TILE);
    var r = Math.floor(py / TILE);
    if (c < 0 || c >= level.cols) return true;
    if (r < 0 || r >= level.rows) return false;
    var t = level.grid[r][c];
    return t === '#' || t === 'B';
  }

  function boxHits(level, b) {
    var xs = [b.x, b.x + b.w - 0.01];
    var ys = [b.y, b.y + b.h / 2, b.y + b.h - 0.01];
    for (var i = 0; i < xs.length; i++) {
      for (var j = 0; j < ys.length; j++) if (solidAt(level, xs[i], ys[j])) return true;
    }
    return false;
  }

  function createGame(options) {
    var opts = options || {};
    return {
      level: buildLevel(),
      phase: 'solo', // solo -> joining -> duo -> won
      allowJoin: opts.allowJoin !== false,
      t: 0,
      joinTimer: 0,
      invuln: 0,
      coyote: 0,
      buffer: 0,
      prevJump: false,
      collected: 0,
      p1: { x: 32, y: GROUND_Y - HERO.h, vx: 0, vy: 0, w: HERO.w, h: HERO.h, onGround: true, face: 1, airJumps: 0 },
      p2: null,
      trail: [],
      safe: { x: 32, y: GROUND_Y - HERO.h },
      hearts: HEARTS.map(function (h) { return { x: h[0] * TILE + 4, y: h[1] * TILE + 4, taken: false }; }),
      enemies: ENEMIES.map(function (e) {
        return { x: e[1] * TILE, y: GROUND_Y - ENEMY.h, dir: -1, alive: true, min: e[0] * TILE, max: e[1] * TILE };
      }),
      events: [],
    };
  }

  function moveHero(level, p) {
    p.x += p.vx;
    if (boxHits(level, p)) {
      p.x = p.vx > 0 ? Math.floor((p.x + p.w) / TILE) * TILE - p.w : (Math.floor(p.x / TILE) + 1) * TILE;
    }
    p.onGround = false;
    p.y += p.vy;
    if (boxHits(level, p)) {
      if (p.vy > 0) {
        p.y = Math.floor((p.y + p.h) / TILE) * TILE - p.h;
        p.onGround = true;
      } else {
        p.y = (Math.floor(p.y / TILE) + 1) * TILE;
      }
      p.vy = 0;
    }
  }

  function applyJump(s, input) {
    var p = s.p1;
    var pressed = !!input.jump && !s.prevJump;
    s.prevJump = !!input.jump;
    if (pressed) s.buffer = PHYS.buffer; else if (s.buffer > 0) s.buffer--;
    if (p.onGround) { s.coyote = PHYS.coyote; p.airJumps = 0; } else if (s.coyote > 0) s.coyote--;
    var airJumpsAllowed = s.phase === 'duo' ? 1 : 0;
    if (s.buffer > 0 && s.coyote > 0) {
      p.vy = PHYS.jumpV; s.coyote = 0; s.buffer = 0; s.events.push('jump');
    } else if (pressed && !p.onGround && p.airJumps < airJumpsAllowed) {
      p.airJumps++; p.vy = PHYS.jumpV; s.buffer = 0; s.events.push('boost');
    }
    if (!input.jump && p.vy < PHYS.cutV) p.vy = PHYS.cutV;
  }

  function overlaps(a, bx, by, bw, bh) {
    return a.x < bx + bw && a.x + a.w > bx && a.y < by + bh && a.y + a.h > by;
  }

  function respawn(s) {
    var p = s.p1;
    p.x = s.safe.x; p.y = s.safe.y; p.vx = 0; p.vy = 0;
    s.invuln = HURT_FRAMES;
    s.trail = [];
    if (s.p2) { s.p2.x = p.x; s.p2.y = p.y; }
    s.events.push('hurt');
  }

  function updateEnemies(s) {
    var p = s.p1;
    s.enemies.forEach(function (e) {
      if (!e.alive) return;
      e.x += e.dir * ENEMY.speed;
      if (e.x <= e.min) { e.x = e.min; e.dir = 1; }
      if (e.x >= e.max) { e.x = e.max; e.dir = -1; }
      if (!overlaps(p, e.x, e.y, ENEMY.w, ENEMY.h)) return;
      if (p.vy > 0 && p.y + p.h < e.y + ENEMY.h) {
        e.alive = false; p.vy = -4; s.events.push('stomp');
      } else if (s.invuln === 0) {
        respawn(s);
      }
    });
  }

  function collectHearts(s) {
    var who = s.p2 ? [s.p1, s.p2] : [s.p1];
    s.hearts.forEach(function (h) {
      if (h.taken) return;
      for (var i = 0; i < who.length; i++) {
        if (overlaps({ x: who[i].x, y: who[i].y, w: HERO.w, h: HERO.h }, h.x, h.y, 8, 8)) {
          h.taken = true; s.collected++; s.events.push('heart');
          return;
        }
      }
    });
  }

  function updateFollower(s) {
    var p = s.p1;
    var last = s.trail[s.trail.length - 1];
    if (!last || Math.abs(last.x - p.x) + Math.abs(last.y - p.y) > 0.5) {
      s.trail.push({ x: p.x, y: p.y });
      if (s.trail.length > TRAIL_MAX) s.trail.shift();
    }
    if (!s.p2) return;
    var target = s.trail[Math.max(0, s.trail.length - 1 - FOLLOW_LAG)];
    var dx = target.x - s.p2.x;
    s.p2.moving = Math.abs(dx) > 0.2 || Math.abs(target.y - s.p2.y) > 0.2;
    if (Math.abs(dx) > 0.2) s.p2.face = dx > 0 ? 1 : -1;
    s.p2.x = target.x; s.p2.y = target.y;
  }

  function updateSafeSpot(s) {
    var p = s.p1;
    var below = p.y + p.h + 2;
    if (p.onGround && s.invuln === 0 && solidAt(s.level, p.x - 12, below) && solidAt(s.level, p.x + p.w + 12, below)) {
      s.safe = { x: p.x, y: p.y };
    }
  }

  /** 推进一帧（1/60 秒）。input: { left, right, jump }。直接修改并返回 s（游戏循环里为了性能）。 */
  function step(s, input) {
    s.events = [];
    if (s.phase === 'won') return s;
    s.t++;
    if (s.phase === 'joining') {
      s.joinTimer--;
      if (s.joinTimer <= 0) {
        s.phase = 'duo';
        s.p2 = { x: s.p1.x - 14, y: s.p1.y, face: 1, moving: false };
        s.trail = [{ x: s.p2.x, y: s.p2.y }];
        s.events.push('duo');
      }
      return s;
    }
    var p = s.p1;
    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.vx = dir * PHYS.run;
    if (dir) p.face = dir;
    applyJump(s, input);
    p.vy = Math.min(p.vy + PHYS.gravity, PHYS.maxFall);
    moveHero(s.level, p);
    if (s.invuln > 0) s.invuln--;
    updateEnemies(s);
    collectHearts(s);
    if (p.y > ROWS * TILE + 32) respawn(s);
    updateSafeSpot(s);
    updateFollower(s);
    if (s.phase === 'solo' && s.allowJoin && p.x >= JOIN_COL * TILE && p.onGround) {
      s.phase = 'joining'; s.joinTimer = JOIN_FRAMES; p.vx = 0; s.events.push('join');
    }
    if (p.x >= FLAG_COL * TILE) { s.phase = 'won'; s.events.push('won'); }
    return s;
  }

  /* 自动通关的小机器人：测试里用来证明关卡能过，也证明没有 2P 时过不了墙。 */
  function createBot() {
    var last = false;
    function noLandingAhead(s, x) {
      for (var y = s.p1.y; y < ROWS * TILE; y += TILE / 2) if (solidAt(s.level, x, y)) return false;
      return true;
    }
    return function (s) {
      var p = s.p1;
      var front = p.x + p.w;
      var out = false;
      if (p.onGround) {
        var pit = !solidAt(s.level, front + 6, p.y + p.h + 2);
        var wall = solidAt(s.level, front + 8, p.y + p.h - 2);
        var enemy = s.enemies.some(function (e) { return e.alive && e.x + ENEMY.w > p.x && e.x - front < 26; });
        out = pit || wall || enemy;
      } else if (p.vy < 0) {
        out = true;
      } else if (s.phase === 'duo' && p.airJumps < 1) {
        var blocked = solidAt(s.level, front + 8, p.y + p.h - 2) || noLandingAhead(s, front + 30);
        out = blocked && !last;
      }
      last = out;
      return { right: true, left: false, jump: out };
    };
  }

  var api = {
    TILE: TILE, VIEW_W: VIEW_W, VIEW_H: VIEW_H, COLS: COLS, ROWS: ROWS, GROUND_Y: GROUND_Y,
    HERO: HERO, ENEMY: ENEMY, JOIN_COL: JOIN_COL, WALL_COL: WALL_COL, FLAG_COL: FLAG_COL, JOIN_FRAMES: JOIN_FRAMES,
    createGame: createGame, step: step, solidAt: solidAt, createBot: createBot,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnnivGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
