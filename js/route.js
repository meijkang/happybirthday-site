/* 异地恋路线图：把恋爱时间轴做成地图站点。 */
(function () {
  'use strict';
  var config = window.ANNIV_CONFIG || {};
  var stops = config.route || [];

  function $(id) { return document.getElementById(id); }
  var map = $('routeMap');
  if (!map || !stops.length) return;

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
    btn.textContent = stop.icon || '●';
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
