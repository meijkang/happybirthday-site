/* 大富翁的规则：不碰 DOM，node 里可以直接测。 */
(function (root) {
  'use strict';

  var SIDE = 6;        // 棋盘每边 6 格，一圈 20 格
  var EVENT_GAP = 3;   // 每 3 格一件“我们的事”
  var REWARD_OFFSET = 1;
  var DICE_MAX = 6;

  /** 一圈格子的坐标：从离镜头最近的角出发，顺时针走。 */
  function ringPath(side) {
    var last = side - 1;
    var path = [];
    var i;
    for (i = last; i > 0; i--) path.push({ col: i, row: last });
    for (i = last; i > 0; i--) path.push({ col: 0, row: i });
    for (i = 0; i < last; i++) path.push({ col: i, row: 0 });
    for (i = 0; i < last; i++) path.push({ col: last, row: i });
    return path;
  }

  function buildTiles(events, rewards) {
    var path = ringPath(SIDE);
    var maxEvents = Math.ceil(path.length / EVENT_GAP) - 1;
    if (!Array.isArray(events) || events.length === 0) throw new Error('config.journey 不能为空');
    if (events.length > maxEvents) throw new Error('config.journey 最多放 ' + maxEvents + ' 件事，现在有 ' + events.length + ' 件');
    var rewardList = Array.isArray(rewards) ? rewards : [];
    var rewardIndex = 0;
    return path.map(function (cell, index) {
      var tile = { index: index, col: cell.col, row: cell.row, type: 'plain', event: null, reward: null };
      var eventNo = index / EVENT_GAP;
      if (index === 0) return Object.assign(tile, { type: 'start' });
      if (index % EVENT_GAP === 0 && eventNo <= events.length) return Object.assign(tile, { type: 'event', event: events[eventNo - 1] });
      if (index % EVENT_GAP === REWARD_OFFSET && rewardList.length > 0) {
        var reward = rewardList[rewardIndex % rewardList.length];
        rewardIndex++;
        return Object.assign(tile, { type: 'reward', reward: reward });
      }
      return tile;
    });
  }

  function createJourney() {
    return { pos: 0, bag: [], seen: 0, finished: false };
  }

  /** 离下一个“不能跳过的格子”（下一件事，或终点）还有几步。 */
  function nextStopDistance(tiles, pos) {
    for (var d = 1; d <= tiles.length; d++) {
      var tile = tiles[(pos + d) % tiles.length];
      if (tile.type === 'event' || tile.type === 'start') return d;
    }
    return tiles.length;
  }

  function rollDice(random) {
    return 1 + Math.floor(random() * DICE_MAX);
  }

  /**
   * 掷出 roll 点后往前走。每一件事都不能跳过：点数太大就停在那一格。
   * 路过的奖励都会捡起来。返回新的状态，不改原来的。
   */
  function move(tiles, state, roll) {
    if (state.finished) {
      return { state: state, steps: 0, capped: false, path: [], collected: [], event: null, finished: true };
    }
    if (!(roll >= 1 && roll <= DICE_MAX)) throw new Error('骰子点数应在 1~' + DICE_MAX + ' 之间，收到的是：' + roll);
    var distance = nextStopDistance(tiles, state.pos);
    var steps = Math.min(roll, distance);
    var path = [];
    var collected = [];
    for (var i = 1; i <= steps; i++) {
      var tile = tiles[(state.pos + i) % tiles.length];
      path.push(tile.index);
      if (tile.type === 'reward') collected.push(tile.reward);
    }
    var landed = tiles[path[path.length - 1]];
    var event = landed.type === 'event' ? landed.event : null;
    var finished = landed.type === 'start';
    var next = {
      pos: landed.index,
      bag: state.bag.concat(collected),
      seen: state.seen + (event ? 1 : 0),
      finished: finished,
    };
    return { state: next, steps: steps, capped: roll > distance, path: path, collected: collected, event: event, finished: finished };
  }

  var api = {
    SIDE: SIDE, EVENT_GAP: EVENT_GAP, DICE_MAX: DICE_MAX,
    ringPath: ringPath, buildTiles: buildTiles, createJourney: createJourney,
    nextStopDistance: nextStopDistance, rollDice: rollDice, move: move,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnnivBoard = api;
})(typeof window !== 'undefined' ? window : globalThis);
