/* 异地恋路线图：每个地点有一个卡通版地表建筑节点。 */
(function () {
  'use strict';
  var config = window.ANNIV_CONFIG || {};
  var stops = config.route || [];

  function $(id) { return document.getElementById(id); }
  var map = $('routeMap');
  if (!map || !stops.length) return;

  var icons = {
    '沈阳': '<path d="M8 14h3v-5h5v5h3v-3h6v17H8z" fill="#8fc79a" stroke="#2b2622" stroke-width="3" stroke-linejoin="round"/><path d="M4 8h14" stroke="#d9482b" stroke-width="4" stroke-linecap="round"/><path d="M11 8V5" stroke="#2b2622" stroke-width="3"/>',
    '南京': '<path d="M7 28V15h20v13z" fill="#c8553d" stroke="#2b2622" stroke-width="3" stroke-linejoin="round"/><path d="M4 15h26" stroke="#2b2622" stroke-width="3" stroke-linecap="round"/><path d="M12 20h10M12 24h10" stroke="#fffdf6" stroke-width="3"/>',
    '珠海': '<path d="M5 28h9V10H5z" fill="#7c9a7e" stroke="#2b2622" stroke-width="3" stroke-linejoin="round"/><path d="M14 28V8h9v20z" fill="#44557c" stroke="#2b2622" stroke-width="3" stroke-linejoin="round"/><path d="M23 28V14h9v14z" fill="#8fc79a" stroke="#2b2622" stroke-width="3" stroke-linejoin="round"/><path d="M2 28h34" stroke="#2b2622" stroke-width="3" stroke-linecap="round"/>',
    '平山村': '<path d="M5 16h32l-16-11z" fill="#ffd23f" stroke="#2b2622" stroke-width="3" stroke-linejoin="round"/><path d="M9 16h24v12H9z" fill="#c8553d" stroke="#2b2622" stroke-width="3" stroke-linejoin="round"/><rect x="16" y="20" width="8" height="8" fill="#fffdf6" stroke="#2b2622" stroke-width="3"/>',
    '侨香公馆': '<path d="M5 28V10h28v18z" fill="#f3b9bd" stroke="#2b2622" stroke-width="3" stroke-linejoin="round"/><path d="M5 10h28l-14-7z" fill="#d9482b" stroke="#2b2622" stroke-width="3" stroke-linejoin="round"/><rect x="10" y="15" width="7" height="7" fill="#fffdf6" stroke="#2b2622" stroke-width="3"/><rect x="21" y="15" width="7" height="7" fill="#fffdf6" stroke="#2b2622" stroke-width="3"/><path d="M16 28v-4h6v4" fill="#fffdf6" stroke="#2b2622" stroke-width="3"/>'
  };

  var line = document.createElement('div');
  line.className = 'route-line';
  map.appendChild(line);

  stops.forEach(function (stop, index) {
    var wrap = document.createElement('div');
    wrap.className = 'route-stop';
    wrap.dataset.city = stop.city;
    wrap.dataset.side = index % 2 ? 'up' : 'down';
    wrap.style.left = (4 + (92 / Math.max(1, stops.length - 1)) * index) + '%';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'route-building';
    btn.innerHTML = '<svg viewBox="0 0 40 30" aria-hidden="true">' + (icons[stop.city] || icons['南京']) + '</svg>';
    btn.setAttribute('aria-label', stop.year + ' ' + stop.city + '：' + stop.title);
    btn.addEventListener('click', function () { show(index); });
    wrap.appendChild(btn);
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
