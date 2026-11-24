/* 异地恋路线图：城市明信片节点，上下交错，地标和城市名分开放。 */
(function () {
  'use strict';
  var config = window.ANNIV_CONFIG || {};
  var stops = config.route || [];

  function $(id) { return document.getElementById(id); }
  // 每个地点一个独立轮廓：沈阳故宫、南京城墙门、珠海日月贝、平山村小院、侨香公馆
  var icons = {
    '沈阳': '<path d="M8 18h24v11H8z" fill="#b5442c" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 18h28l-5-6H11z" fill="#d9482b" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><path d="M11 12h18l-3-5H14z" fill="#e36a4b" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 7h12l-2-4H16z" fill="#ffd23f" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 22h16M12 26h16" stroke="#ffd23f" stroke-width="2"/>',
    '南京': '<path d="M7 29V13h26v16z" fill="#9c6b3d" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><path d="M4 13h32" stroke="#2b2622" stroke-width="2.5" stroke-linecap="round"/><path d="M13 29V19h6v10z" fill="#3f2f20" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><path d="M25 19h5v5h-5z" fill="#f4ecdd" stroke="#2b2622" stroke-width="2"/><path d="M8 5h10v8H8z" fill="#c8553d" stroke="#2b2622" stroke-width="2.5"/><path d="M23 7h10v6H23z" fill="#8fc79a" stroke="#2b2622" stroke-width="2.5"/>',
    '珠海': '<path d="M6 27c6-15 12-20 14-20s8 5 14 20z" fill="#e6d9c0" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><path d="M11 27c4-10 8-14 9-14s5 4 9 14" fill="none" stroke="#b9774a" stroke-width="2"/><path d="M16 27V15M24 27V15" stroke="#d9482b" stroke-width="2.5" stroke-linecap="round"/><path d="M4 29h34" stroke="#2b2622" stroke-width="2.5" stroke-linecap="round"/><path d="M20 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#ffd23f" stroke="#2b2622" stroke-width="1.5"/>',
    '平山村': '<path d="M8 16h24v13H8z" fill="#c8553d" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><path d="M5 16h30l-15-9z" fill="#ffd23f" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><rect x="15" y="20" width="7" height="9" fill="#fffdf6" stroke="#2b2622" stroke-width="2"/><path d="M24 20h6v9h-6z" fill="#ffd23f" stroke="#2b2622" stroke-width="2"/><path d="M11 20h3M11 24h3" stroke="#fffdf6" stroke-width="2"/><path d="M14 7c2 2 5 2 5-2" fill="none" stroke="#8fc79a" stroke-width="2.5" stroke-linecap="round"/>',
    '侨香公馆': '<path d="M7 29V10h26v19z" fill="#f3b9bd" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><path d="M5 10h30l-15-7z" fill="#d9482b" stroke="#2b2622" stroke-width="2.5" stroke-linejoin="round"/><rect x="11" y="14" width="6" height="5" fill="#fffdf6" stroke="#2b2622" stroke-width="2"/><rect x="23" y="14" width="6" height="5" fill="#fffdf6" stroke="#2b2622" stroke-width="2"/><rect x="11" y="22" width="6" height="5" fill="#fffdf6" stroke="#2b2622" stroke-width="2"/><rect x="23" y="22" width="6" height="5" fill="#fffdf6" stroke="#2b2622" stroke-width="2"/><path d="M17 29v-6h6v6" fill="#44557c" stroke="#2b2622" stroke-width="2"/><path d="M18 7h4v3h-4z" fill="#ffd23f" stroke="#2b2622" stroke-width="1.5"/>'
  };

  // 给 preview-icons.html 复用；主页面不依赖这个变量。
  window.ANNIV_ROUTE_ICONS = icons;

  var map = $('routeMap');
  if (!map) return; // preview-icons.html 只取 icons，不需要页面节点


  var line = document.createElement('div');
  line.className = 'route-line';
  map.appendChild(line);

  stops.forEach(function (stop, index) {
    var side = index % 2 ? 'down' : 'up';
    var wrap = document.createElement('div');
    wrap.className = 'route-stop route-stop-' + side;
    wrap.dataset.city = stop.city;
    wrap.style.left = (4 + (92 / Math.max(1, stops.length - 1)) * index) + '%';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '<svg viewBox="0 0 40 30" aria-hidden="true">' + (icons[stop.city] || icons['南京']) + '</svg>';
    btn.setAttribute('aria-label', stop.year + ' ' + stop.city + '：' + stop.title);
    btn.addEventListener('click', function () { show(index); });
    wrap.appendChild(btn);

    var name = document.createElement('span');
    name.className = 'route-name';
    name.textContent = stop.city;
    wrap.appendChild(name);

    map.appendChild(wrap);
  });

  function show(index) {
    Array.prototype.forEach.call(map.querySelectorAll('.route-stop'), function (el, i) {
      el.setAttribute('aria-current', String(i === index));
    });
    var stop = stops[index];
    var card = $('routeCard');
    card.classList.add('is-switching');
    setTimeout(function () {
      $('routeYear').textContent = stop.year + ' · ' + stop.city;
      $('routeTitle').textContent = stop.title;
      $('routeText').textContent = stop.text;
      card.classList.remove('is-switching');
    }, 120);
  }

  window.Anniv.onEnter('p-route', function () { show(0); });
})();




