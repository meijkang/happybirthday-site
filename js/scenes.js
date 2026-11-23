/* 第 1~4 页：封面（满天星、相机）、胶卷、小餐桌、两只手 */
(function () {
  'use strict';

  var A = window.Anniv;
  var Logic = window.AnnivLogic;
  var $ = A.$;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }

  /* ========== 1 封面 ========== */
  var anniversary = A.config.anniversaryDate ? Logic.parseDate(A.config.anniversaryDate) : new Date();
  $('days').textContent = Logic.daysTogether(A.config.startDate, anniversary);
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  var ticketDate = anniversary.getFullYear() + '.' + pad2(anniversary.getMonth() + 1) + '.' + pad2(anniversary.getDate());

  (function scatterStars() {
    var random = Logic.seededRandom(1112);
    var html = '';
    for (var i = 0; i < 90; i++) {
      var size = 1 + random() * 2.4;
      html += '<i style="left:' + (random() * 100).toFixed(2) + '%;top:' + (random() * 78).toFixed(2) + '%;width:' + size.toFixed(1) +
        'px;height:' + size.toFixed(1) + 'px;animation-delay:-' + (random() * 3).toFixed(2) + 's;animation-duration:' + (2 + random() * 3).toFixed(2) + 's"></i>';
    }
    $('stars').innerHTML = html;
  })();

  /** 满天星：从左下角长出一丛细枝，枝头开小白花。 */
  function growGypsophila(svg, seed) {
    var random = Logic.seededRandom(seed);
    function branch(x, y, angle, length, depth) {
      var bend = (random() - 0.5) * 0.5;
      var x2 = x + Math.cos(angle) * length;
      var y2 = y - Math.sin(angle) * length;
      var cx = x + Math.cos(angle + bend) * length * 0.55;
      var cy = y - Math.sin(angle + bend) * length * 0.55;
      svg.appendChild(svgEl('path', { d: 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) }));
      if (depth === 0 || length < 16) {
        var blooms = 1 + Math.floor(random() * 3);
        for (var b = 0; b < blooms; b++) {
          var bloom = svgEl('circle', {
            cx: (x2 + (random() - 0.5) * 12).toFixed(1), cy: (y2 + (random() - 0.5) * 12).toFixed(1), r: (2.2 + random() * 3).toFixed(1),
          });
          if (random() < 0.22) bloom.setAttribute('class', 'is-soft');
          if (random() < 0.3) { bloom.classList.add('is-twinkle'); bloom.style.animationDelay = '-' + (random() * 4).toFixed(2) + 's'; }
          svg.appendChild(bloom);
        }
        return;
      }
      var kids = 2 + (random() < 0.45 ? 1 : 0);
      for (var k = 0; k < kids; k++) {
        branch(x2, y2, angle + (random() - 0.5) * 1.15, length * (0.62 + random() * 0.2), depth - 1);
      }
    }
    for (var stem = 0; stem < 5; stem++) {
      branch(10 + stem * 14, 410, 0.55 + stem * 0.2 + random() * 0.12, 105 + random() * 40, 4);
    }
  }
  growGypsophila($('gypLeft'), 20251112);
  growGypsophila($('gypRight'), 20261112);

  var SHOT_SLOTS = 4;
  var shotOrder = Logic.shuffled(A.photos.map(function (_, index) { return index; }), Logic.seededRandom(Date.now()));
  var shotCount = 0;

  $('camera').addEventListener('click', function () {
    var camera = this;
    var photoIndex = shotOrder[shotCount % shotOrder.length];
    var slot = shotCount % SHOT_SLOTS;
    shotCount++;
    A.flash();
    A.sfx('shutter');
    camera.classList.add('is-snap');
    setTimeout(function () { camera.classList.remove('is-snap'); }, 180);

    var old = $('shots').querySelector('.slot-' + slot);
    if (old) old.remove();
    var photo = A.photos[photoIndex];
    var shot = document.createElement('figure');
    shot.className = 'polaroid shot slot-' + slot;
    var img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.caption || '我们的照片';
    var caption = document.createElement('figcaption');
    caption.textContent = photo.caption;
    shot.appendChild(img);
    shot.appendChild(caption);
    $('shots').appendChild(shot);

    $('cameraHint').textContent = shotCount < SHOT_SLOTS ? '再按一下，还有很多张' : '后面还有一整卷，翻页看 →';
    if (shotCount >= 2) A.nudgeNext('p-cover');
  });

  /* ========== 2 胶卷 ========== */
  function buildStrip(strip, indexes) {
    indexes.forEach(function (photoIndex) {
      var photo = A.photos[photoIndex];
      var frame = document.createElement('button');
      frame.type = 'button';
      frame.className = 'frame';
      frame.dataset.no = (photoIndex < 9 ? '0' : '') + (photoIndex + 1) + 'A';
      frame.setAttribute('aria-label', '放大照片：' + (photo.caption || '第 ' + (photoIndex + 1) + ' 张'));
      var img = document.createElement('img');
      img.src = photo.thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      frame.appendChild(img);
      frame.addEventListener('click', function () {
        if (strip.dataset.dragged === '1') return;
        A.openLightbox(photoIndex, frame);
      });
      strip.appendChild(frame);
    });
    enableDragScroll(strip);
  }

  function enableDragScroll(strip) {
    var startX = 0;
    var startScroll = 0;
    var dragging = false;
    strip.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse') return; // 触屏用原生滑动
      dragging = true; startX = event.clientX; startScroll = strip.scrollLeft; strip.dataset.dragged = '0';
    });
    window.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      var dx = event.clientX - startX;
      if (Math.abs(dx) > 5) { strip.dataset.dragged = '1'; strip.classList.add('is-drag'); }
      strip.scrollLeft = startScroll - dx;
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false; strip.classList.remove('is-drag');
      setTimeout(function () { strip.dataset.dragged = '0'; }, 0);
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    strip.addEventListener('wheel', function (event) {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      strip.scrollLeft += event.deltaY; event.preventDefault();
    }, { passive: false });
  }

  var evens = [];
  var odds = [];
  A.photos.forEach(function (_, index) { (index % 2 === 0 ? evens : odds).push(index); });
  buildStrip($('stripA'), evens);
  buildStrip($('stripB'), odds);
  A.onEnter('p-film', function () {
    $('stripB').scrollLeft = $('stripB').scrollWidth; // 两条胶卷从相反方向开始，错开一点
    setTimeout(function () { A.nudgeNext('p-film'); }, 5000);
  });

  /* ========== 3 小餐桌 ========== */
  var table = Logic.createTable(A.config.dishes);
  var dishButtons = {};
  var DISH_RADIUS = 0.37;

  function renderTableCount() {
    var left = Logic.dishesLeftToRemove(table);
    $('tableCount').innerHTML = left > 0 ? '还有 <b>' + left + '</b> 道<br>你不爱吃' : '剩下的<br><b>全是你爱的</b>';
    $('table').classList.toggle('is-done', left === 0);
  }

  table.forEach(function (dish, index) {
    var angle = (index / table.length) * Math.PI * 2 - Math.PI / 2;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dish';
    btn.style.setProperty('--x', (Math.cos(angle) * DISH_RADIUS).toFixed(4));
    btn.style.setProperty('--y', (Math.sin(angle) * DISH_RADIUS).toFixed(4));
    btn.setAttribute('aria-label', dish.name);
    var icon = document.createElement('span');
    icon.className = 'dish-icon';
    icon.textContent = dish.icon;
    icon.setAttribute('aria-hidden', 'true');
    var name = document.createElement('span');
    name.className = 'dish-name';
    name.textContent = dish.name;
    btn.appendChild(icon);
    btn.appendChild(name);
    btn.addEventListener('click', function () { onDish(dish.id); });
    $('table').appendChild(btn);
    dishButtons[dish.id] = btn;
  });

  function onDish(id) {
    var result = Logic.pickDish(table, id);
    var btn = dishButtons[id];
    var dish = table[id];
    table = result.table;
    if (result.outcome === 'removed') {
      btn.classList.add('is-removed');
      btn.disabled = true;
      A.sfx('whoosh');
      $('tableSay').textContent = dish.say || (dish.name + '，撤走。');
    } else if (result.outcome === 'kept') {
      btn.classList.remove('is-kept');
      void btn.offsetWidth;
      btn.classList.add('is-kept');
      A.sfx('nope');
      $('tableSay').textContent = dish.say || (dish.name + '是你的最爱，留下。');
    }
    renderTableCount();
    if (Logic.isTableDone(table) && result.outcome === 'removed') {
      setTimeout(function () {
        $('tableSay').textContent = '菜单记住了。以后每一桌，都照这个来。';
        if (A.currentPageId() === 'p-table') A.sfx('fanfare');
        A.nudgeNext('p-table');
      }, 900);
    }
  }
  renderTableCount();

  /* ========== 4 两只手 ========== */
  function handSvg(options) {
    return '<svg viewBox="0 0 200 400" aria-hidden="true"><g filter="url(#sticker)">' +
      // 袖子 + 手腕
      '<path d="M52 300 L148 300 L164 420 L36 420 Z" fill="url(#' + options.sleeve + ')" stroke="#2b2622" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="48" y="292" width="104" height="20" rx="6" fill="' + options.cuff + '" stroke="#2b2622" stroke-width="4"/>' +
      '<path d="M72 236 L128 236 L134 296 L66 296 Z" fill="' + options.skin + '" stroke="#2b2622" stroke-width="4" stroke-linejoin="round"/>' +
      // 握着的拳头
      '<rect x="48" y="168" width="104" height="84" rx="26" fill="' + options.skin + '" stroke="#2b2622" stroke-width="4"/>' +
      // 门票
      '<g transform="rotate(' + options.tilt + ' 100 190)">' +
      '<path d="M46 14 H154 V92 a10 10 0 0 0 0 20 V206 H46 V112 a10 10 0 0 0 0 -20 Z" fill="' + options.ticket + '" stroke="#2b2622" stroke-width="4" stroke-linejoin="round"/>' +
      '<line x1="58" y1="102" x2="142" y2="102" stroke="#2b2622" stroke-width="2.5" stroke-dasharray="6 6"/>' +
      '<text x="100" y="52" text-anchor="middle" font-family="Consolas,monospace" font-weight="700" font-size="30" fill="#2b2622">LIVE</text>' +
      '<text x="100" y="78" text-anchor="middle" font-family="Consolas,monospace" font-size="12" letter-spacing="2" fill="#2b2622">ADMIT ONE</text>' +
      '<text x="100" y="140" text-anchor="middle" font-family="Ma Shan Zheng,KaiTi,serif" font-size="30" fill="#2b2622">' + options.seat + '</text>' +
      '<text x="100" y="164" text-anchor="middle" font-family="Consolas,monospace" font-size="11" fill="#2b2622">' + ticketDate + '</text>' +
      '</g>' +
      // 压在票上的手指和拇指
      '<rect x="38" y="178" width="38" height="66" rx="18" fill="' + options.skin + '" stroke="#2b2622" stroke-width="4" transform="rotate(-8 57 211)"/>' +
      '<path d="M104 190 q20 -6 44 2 M106 210 q20 -6 44 2 M108 230 q18 -5 40 2" fill="none" stroke="#2b2622" stroke-width="3" stroke-linecap="round" opacity=".55"/>' +
      '</g></svg>';
  }
  $('hand1').innerHTML = handSvg({ sleeve: 'sleeveStripe', cuff: '#2f3f66', skin: '#f2c9a5', ticket: '#ffd23f', tilt: -6, seat: 'A排 11座' });
  $('hand2').innerHTML = handSvg({ sleeve: 'sleeveCheck', cuff: '#f3b9bd', skin: '#f7d7bd', ticket: '#f7a8b8', tilt: 6, seat: 'A排 12座' });

  (function buildStageFx() {
    var random = Logic.seededRandom(77);
    var colors = ['#ffd23f', '#f37aa0', '#6eaaff', '#aa78ff', '#7ce0c3'];
    var notes = '';
    var glyphs = ['♪', '♫', '♥', '♪', '✦'];
    for (var i = 0; i < 14; i++) {
      notes += '<i style="--l:' + (4 + random() * 92).toFixed(1) + '%;--s:' + (1.2 + random() * 1.6).toFixed(2) + 'rem;--c:' + colors[i % colors.length] +
        ';--t:' + (5 + random() * 5).toFixed(1) + 's;--dl:-' + (random() * 8).toFixed(1) + 's">' + glyphs[i % glyphs.length] + '</i>';
    }
    $('notes').innerHTML = notes;
    var sticks = '';
    for (var j = 0; j < 22; j++) {
      sticks += '<i style="--h:' + (40 + random() * 60).toFixed(0) + '%;--c:' + colors[j % colors.length] + ';--dl:-' + (random() * 1.1).toFixed(2) + 's"></i>';
    }
    $('sticks').innerHTML = sticks;
  })();

  $('hands').addEventListener('click', function () {
    if ($('p-hands').classList.contains('is-duo')) return;
    $('p-hands').classList.add('is-duo');
    this.setAttribute('aria-pressed', 'true');
    this.setAttribute('aria-label', '两只手，两张连座的门票');
    $('ticketCount').textContent = '2';
    A.sfx('join');
    setTimeout(function () { A.nudgeNext('p-hands'); }, 2200);
  });
})();
