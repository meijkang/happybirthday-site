/* 纯逻辑：不碰 DOM，浏览器和 node 测试都能用。 */
(function (root) {
  'use strict';

  var DAY_MS = 86400000;

  function parseDate(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text));
    if (!m) throw new Error('日期格式应为 年-月-日，例如 2025-11-12，收到的是：' + text);
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  /** 从 start 那天到 now 一共过了多少整天（同一天为 0，未来日期为 0）。 */
  function daysTogether(startText, now) {
    var start = parseDate(startText);
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.round((today - start) / DAY_MS));
  }

  /** 可复现的随机数（mulberry32）。 */
  function seededRandom(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(list, random) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /* ---------- 小餐桌 ---------- */

  function createTable(dishes) {
    if (!Array.isArray(dishes) || dishes.length === 0) throw new Error('config.dishes 不能为空');
    return dishes.map(function (dish, index) {
      return { id: index, name: dish.name, icon: dish.icon, love: !!dish.love, say: dish.say || '', removed: false };
    });
  }

  /** 点一道菜：不喜欢的被撤走，最爱的留下。返回新桌面，不改原来的。 */
  function pickDish(table, id) {
    var dish = table.filter(function (d) { return d.id === id; })[0];
    if (!dish) throw new Error('没有这道菜：' + id);
    if (dish.removed) return { table: table, outcome: 'gone' };
    if (dish.love) return { table: table, outcome: 'kept' };
    var next = table.map(function (d) {
      return d.id === id ? Object.assign({}, d, { removed: true }) : d;
    });
    return { table: next, outcome: 'removed' };
  }

  function dishesLeftToRemove(table) {
    return table.filter(function (d) { return !d.love && !d.removed; }).length;
  }

  function isTableDone(table) {
    return dishesLeftToRemove(table) === 0;
  }

  var api = {
    parseDate: parseDate,
    daysTogether: daysTogether,
    seededRandom: seededRandom,
    shuffled: shuffled,
    createTable: createTable,
    pickDish: pickDish,
    dishesLeftToRemove: dishesLeftToRemove,
    isTableDone: isTableDone,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnnivLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
