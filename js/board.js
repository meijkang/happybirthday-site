/* 大富翁页：等距 3D 棋盘的搭建、走路动画和事件卡（规则在 board-core.js） */
(function () {
  'use strict';

  var A = window.Anniv;
  var B = window.AnnivBoard;
  var $ = A.$;

  var STEP_MS = 280;
  var ROLL_MS = 650;
  var SHUFFLE_MS = 80;
  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  // 每件事发生后，在棋盘中间留下的纪念物的位置（列, 行）
  var MEMORY_SPOTS = [[1.5, 4.3], [1.4, 2.7], [2.3, 1.5], [3.8, 1.5], [4.5, 2.8], [3, 3]];

  var tiles = B.buildTiles(A.config.journey, A.config.rewards);
  var state = B.createJourney();
  var busy = false;
  var board = $('isoBoard');
  var rewardSigns = {};
  var eventSigns = {};
  var tileEls = [];
  var memories = [];

  function s(n) { return 'calc(var(--s) * ' + n + ')'; }
  function u(n) { return 'calc(var(--u) * ' + n + ')'; }
  function el(className) { var node = document.createElement('div'); node.className = className; return node; }

  /** 长方体：w 沿列方向，d 沿行方向，h 向上。 */
  function cube(o) {
    var node = el('cube ' + o.cls);
    node.style.setProperty('--w', o.w);
    node.style.setProperty('--d', o.d);
    node.style.setProperty('--h', o.h);
    node.style.left = o.x;
    node.style.top = o.y;
    if (o.z) node.style.transform = 'translateZ(' + o.z + ')';
    ['f-top', 'f-x', 'f-y'].forEach(function (face) {
      var i = document.createElement('i');
      i.className = face;
      node.appendChild(i);
    });
    return node;
  }

  /** 正对镜头的立牌。 */
  function sign(className, left, top, z, text) {
    var node = el('bb ' + className);
    node.style.left = left;
    node.style.top = top;
    node.style.setProperty('--z', z);
    var span = document.createElement('span');
    span.textContent = text;
    node.appendChild(span);
    return node;
  }

  function tileSign(className, tile, text) {
    return sign(className, s(tile.col + 0.5), s(tile.row + 0.5), 'calc(var(--tile-h) + ' + u(0.6) + ')', text);
  }

  function person(kind) {
    var node = el('person person-' + kind);
    node.appendChild(cube({ cls: 'legs', w: u(1.8), d: u(1.2), h: u(1), x: u(-0.9), y: u(-0.6) }));
    node.appendChild(cube({ cls: 'body', w: u(2.2), d: u(1.4), h: u(2), x: u(-1.1), y: u(-0.7), z: u(1) }));
    node.appendChild(cube({ cls: 'head', w: u(2.4), d: u(2), h: u(2), x: u(-1.2), y: u(-1), z: u(3) }));
    if (kind === 'her') {
      // 长发：后面垂下来一片
      node.appendChild(cube({ cls: 'hair', w: u(2.8), d: u(0.7), h: u(3), x: u(-1.4), y: u(-1.6), z: u(2.2) }));
      node.appendChild(cube({ cls: 'hair', w: u(2.8), d: u(2.4), h: u(0.6), x: u(-1.4), y: u(-1.2), z: u(5) }));
    } else {
      // 蓬蓬的卷发
      node.appendChild(cube({ cls: 'hair', w: u(3), d: u(2.6), h: u(1.2), x: u(-1.5), y: u(-1.3), z: u(5) }));
    }
    return node;
  }

  function house(col, row) {
    var node = el('house');
    node.style.left = s(col);
    node.style.top = s(row);
    node.appendChild(cube({ cls: 'wall', w: s(0.9), d: s(0.9), h: s(0.6), x: s(-0.45), y: s(-0.45) }));
    node.appendChild(cube({ cls: 'roof', w: s(1.1), d: s(1.1), h: s(0.16), x: s(-0.55), y: s(-0.55), z: s(0.6) }));
    node.appendChild(cube({ cls: 'roof', w: s(0.7), d: s(0.7), h: s(0.16), x: s(-0.35), y: s(-0.35), z: s(0.76) }));
    node.appendChild(cube({ cls: 'roof', w: s(0.3), d: s(0.3), h: s(0.14), x: s(-0.15), y: s(-0.15), z: s(0.92) }));
    return node;
  }

  /* ---------- 搭棋盘 ---------- */
  board.appendChild(cube({ cls: 'slab', w: s(6), d: s(6), h: s(0.2), x: '0px', y: '0px', z: s(-0.2) }));
  var logo = el('board-logo');
  logo.textContent = A.config.title;
  board.appendChild(logo);

  tiles.forEach(function (tile) {
    var node = cube({
      cls: 'tile tile-' + tile.type, w: 'calc(var(--s) - 4px)', d: 'calc(var(--s) - 4px)', h: 'var(--tile-h)',
      x: 'calc(' + s(tile.col) + ' + 2px)', y: 'calc(' + s(tile.row) + ' + 2px)',
    });
    board.appendChild(node);
    tileEls.push(node);
    if (tile.type === 'event') {
      eventSigns[tile.index] = tileSign('bb-event', tile, tile.event.icon);
      board.appendChild(eventSigns[tile.index]);
    }
    // 起点两个字平铺在格子上：立牌会挡住站在起点的两个人，也会伸出棋盘压到按钮
    if (tile.type === 'start') {
      var startMark = el('start-mark');
      startMark.textContent = '起点';
      startMark.style.left = s(tile.col);
      startMark.style.top = s(tile.row);
      board.appendChild(startMark);
    }
  });

  function placeRewards() {
    tiles.forEach(function (tile) {
      if (tile.type !== 'reward' || rewardSigns[tile.index]) return;
      rewardSigns[tile.index] = tileSign('bb-reward', tile, '🎁');
      board.appendChild(rewardSigns[tile.index]);
    });
  }
  placeRewards();

  var walker = el('walker');
  var hopper = el('walker-hop');
  hopper.appendChild(person('him'));
  hopper.appendChild(person('her'));
  hopper.appendChild(sign('bb-heart', '0px', '0px', u(7.4), '♥'));
  walker.appendChild(hopper);
  board.appendChild(walker);

  function placeWalker(index) {
    var tile = tiles[index];
    walker.style.transform = 'translate3d(' + s(tile.col + 0.5) + ',' + s(tile.row + 0.5) + ', var(--tile-h))';
    tileEls.forEach(function (node, i) { node.classList.toggle('is-here', i === index); });
  }
  placeWalker(0);

  /* ---------- 骰子 ---------- */
  var dice = $('dice');
  for (var p = 0; p < 9; p++) dice.appendChild(document.createElement('i'));
  function showDice(value) {
    Array.prototype.forEach.call(dice.children, function (pip, index) {
      pip.classList.toggle('is-on', PIPS[value].indexOf(index) >= 0);
    });
  }
  showDice(1);

  function say(text) { $('boardSay').textContent = text; }
  function sfx(name) { if (A.currentPageId() === 'p-board') A.sfx(name); }

  /* ---------- 走 ---------- */
  function collect(tile) {
    var signEl = rewardSigns[tile.index];
    if (signEl) { signEl.remove(); delete rewardSigns[tile.index]; }
    var chip = document.createElement('li');
    chip.textContent = tile.reward.icon + ' ' + tile.reward.name;
    $('bag').appendChild(chip);
    say('捡到奖励：' + tile.reward.name);
    sfx('heart');
  }

  function walk(path, index, done) {
    if (index >= path.length) { done(); return; }
    placeWalker(path[index]);
    hopper.classList.remove('is-hop');
    void hopper.offsetWidth;
    hopper.classList.add('is-hop');
    sfx('page');
    setTimeout(function () {
      var tile = tiles[path[index]];
      if (tile.type === 'reward') collect(tile);
      walk(path, index + 1, done);
    }, STEP_MS);
  }

  function plantMemory(tile) {
    var eventNo = tile.index / B.EVENT_GAP - 1;
    var spot = MEMORY_SPOTS[eventNo % MEMORY_SPOTS.length];
    var node = tile.event.house ? house(spot[0], spot[1]) : sign('bb-memory', s(spot[0]), s(spot[1]), '0px', tile.event.icon);
    board.appendChild(node);
    memories.push(node);
    eventSigns[tile.index].classList.add('is-seen');
  }

  function openCard(card) {
    $('eventIcon').textContent = card.icon;
    $('eventTag').textContent = card.tag;
    $('eventTitle').textContent = card.title;
    $('eventText').textContent = card.text;
    $('eventOk').textContent = card.button;
    $('eventCard').hidden = false;
    $('eventOk').focus();
  }

  function afterMove(result) {
    state = result.state;
    var tile = tiles[state.pos];
    if (result.event) {
      plantMemory(tile);
      sfx('fanfare');
      openCard({ icon: result.event.icon, tag: result.event.tag, title: result.event.title, text: result.event.text, button: '继续往前走' });
      return;
    }
    if (result.finished) {
      sfx('fanfare');
      openCard({ icon: '💞', tag: '回到起点', title: '第一圈，走完了', text: '带着 ' + state.bag.length + ' 份奖励和这些事，第二圈也一起走。', button: '好' });
      A.nudgeNext('p-board');
      return;
    }
    unlock();
  }

  function unlock() {
    busy = false;
    $('rollBtn').disabled = false;
    $('rollBtn').textContent = state.finished ? '再走一圈' : '掷骰子';
  }

  function restart() {
    state = B.createJourney();
    memories.forEach(function (node) { node.remove(); });
    memories = [];
    Object.keys(eventSigns).forEach(function (key) { eventSigns[key].classList.remove('is-seen'); });
    $('bag').textContent = '';
    placeRewards();
    placeWalker(0);
    say('');
    $('rollBtn').textContent = '掷骰子';
  }

  function roll() {
    if (busy) return;
    if (state.finished) { restart(); return; }
    busy = true;
    $('rollBtn').disabled = true;
    var value = B.rollDice(Math.random);
    var result = B.move(tiles, state, value);
    dice.classList.add('is-rolling');
    sfx('jump');
    var shuffle = setInterval(function () { showDice(B.rollDice(Math.random)); }, SHUFFLE_MS);
    setTimeout(function () {
      clearInterval(shuffle);
      dice.classList.remove('is-rolling');
      showDice(value);
      say(result.capped ? '掷出 ' + value + ' 点，不过前面这一站不能跳过' : '掷出 ' + value + ' 点');
      walk(result.path, 0, function () { afterMove(result); });
    }, ROLL_MS);
  }

  $('rollBtn').addEventListener('click', roll);
  $('eventOk').addEventListener('click', function () {
    $('eventCard').hidden = true;
    unlock();
    $('rollBtn').focus();
  });

  // 给自动化测试用
  window.__annivBoard = { state: function () { return state; }, busy: function () { return busy; } };
})();
