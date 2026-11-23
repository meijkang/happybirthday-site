/* 骨架：翻页、声音、闪光、照片放大。其它脚本通过 window.Anniv 使用。 */
(function () {
  'use strict';

  var config = window.ANNIV_CONFIG;
  var Logic = window.AnnivLogic;
  function fail(message) {
    var p = document.createElement('p');
    p.style.cssText = 'position:fixed;z-index:99;top:0;left:0;right:0;margin:0;padding:12px;background:#d9482b;color:#fff';
    p.textContent = message;
    document.body.insertBefore(p, document.body.firstChild);
    throw new Error(message);
  }
  if (!config || !Logic) fail('js/config.js 没有读出来，多半是里面的引号或逗号写成了中文符号。');
  if (!window.ANNIV_MOSAIC) fail('还没有处理照片：请先运行 prepare_photos.py，它会生成 photos 文件夹和 js/mosaic-data.js。');

  var PHOTO_COUNT = window.ANNIV_MOSAIC.photoCount;
  var photos = [];
  for (var i = 0; i < PHOTO_COUNT; i++) {
    var no = (i < 10 ? '0' : '') + i;
    photos.push({ full: 'photos/p' + no + '.jpg', thumb: 'photos/t' + no + '.jpg', caption: (config.captions || [])[i] || '' });
  }

  function $(id) { return document.getElementById(id); }
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 声音（WebAudio 现合成，不需要音频文件） ---------- */
  var audioCtx = null;
  var muted = false;
  var sfxBroken = false;
  var SOUNDS = {
    page: [[520, 0, 0.06, 'triangle']],
    shutter: [[1800, 0, 0.03, 'square'], [240, 0.04, 0.08, 'square']],
    pop: [[660, 0, 0.07, 'sine'], [990, 0.06, 0.1, 'sine']],
    whoosh: [[420, 0, 0.09, 'sawtooth'], [210, 0.07, 0.12, 'sawtooth']],
    nope: [[392, 0, 0.08, 'triangle'], [494, 0.08, 0.12, 'triangle']],
    jump: [[440, 0, 0.05, 'square'], [660, 0.04, 0.07, 'square']],
    boost: [[660, 0, 0.05, 'square'], [990, 0.04, 0.09, 'square']],
    heart: [[988, 0, 0.05, 'square'], [1319, 0.05, 0.1, 'square']],
    stomp: [[300, 0, 0.06, 'square'], [150, 0.05, 0.08, 'square']],
    hurt: [[220, 0, 0.12, 'sawtooth'], [140, 0.1, 0.18, 'sawtooth']],
    join: [[523, 0, 0.1, 'square'], [659, 0.1, 0.1, 'square'], [784, 0.2, 0.1, 'square'], [1047, 0.3, 0.3, 'square']],
    fanfare: [[523, 0, 0.12, 'triangle'], [659, 0.12, 0.12, 'triangle'], [784, 0.24, 0.12, 'triangle'], [1047, 0.36, 0.2, 'triangle'], [784, 0.56, 0.1, 'triangle'], [1047, 0.66, 0.5, 'triangle']],
  };

  function sfx(name) {
    var notes = SOUNDS[name];
    if (muted || sfxBroken || !notes) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var now = audioCtx.currentTime;
      notes.forEach(function (n) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = n[3];
        osc.frequency.value = n[0];
        gain.gain.setValueAtTime(0.0001, now + n[1]);
        gain.gain.exponentialRampToValueAtTime(0.07, now + n[1] + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + n[2]);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now + n[1]);
        osc.stop(now + n[1] + n[2] + 0.02);
      });
    } catch (err) {
      // 音效只是点缀：出错就关掉音效继续（不影响背景音乐），但留下记录方便排查
      sfxBroken = true;
      console.warn('音效播放失败，已关闭音效：', err);
    }
  }

  /* ---------- 背景音乐：一开始是 config.music.first，唱片机那页换成 second ---------- */
  var MUSIC_VOLUME = 0.55;
  var FADE_MS = 1800;
  var FADE_TICK_MS = 50;
  var musicConfig = config.music || {};
  var tracks = {};
  ['first', 'second'].forEach(function (key) {
    if (musicConfig[key] && musicConfig[key].file) tracks[key] = new Audio(musicConfig[key].file);
  });
  var currentTrack = tracks.first ? 'first' : null; // 没配音乐时为 null，下面的函数都会直接跳过
  var musicStarted = false;
  var fadeTimer = 0;
  Object.keys(tracks).forEach(function (key) {
    tracks[key].loop = true;
    tracks[key].preload = 'auto';
    tracks[key].volume = 0;
    tracks[key].addEventListener('error', function () { console.warn('音乐文件读不出来：' + musicConfig[key].file); });
  });

  function playCurrent() {
    if (!currentTrack) return;
    var promise = tracks[currentTrack].play();
    if (promise && promise.catch) {
      promise.catch(function (err) {
        // 浏览器不让自动播放时，等下一次点击再试
        musicStarted = false;
        console.warn('音乐暂时没播出来，下一次点击会再试：', err);
      });
    }
  }

  /** 让每首歌的音量慢慢靠近它该有的音量：当前这首淡入，其它的淡出后暂停。 */
  function fadeMusic() {
    clearInterval(fadeTimer);
    var stepSize = MUSIC_VOLUME / (FADE_MS / FADE_TICK_MS);
    fadeTimer = setInterval(function () {
      var settled = true;
      Object.keys(tracks).forEach(function (key) {
        var audio = tracks[key];
        var target = key === currentTrack && !muted && !document.hidden ? MUSIC_VOLUME : 0;
        var diff = target - audio.volume;
        if (Math.abs(diff) <= stepSize) {
          audio.volume = target;
          if (target === 0 && !audio.paused) audio.pause();
        } else {
          audio.volume += diff > 0 ? stepSize : -stepSize;
          settled = false;
        }
      });
      if (settled) clearInterval(fadeTimer);
    }, FADE_TICK_MS);
  }

  function startMusic() {
    if (musicStarted || muted || !currentTrack) return;
    musicStarted = true;
    playCurrent();
    fadeMusic();
  }
  // 浏览器规定：必须等她第一次点击 / 按键之后才能出声
  document.addEventListener('pointerdown', startMusic, true);
  document.addEventListener('keydown', startMusic, true);
  document.addEventListener('visibilitychange', function () {
    if (!musicStarted) return;
    if (!document.hidden && !muted) playCurrent();
    fadeMusic();
  });

  var music = {
    switchTo: function (key) {
      if (!tracks[key]) throw new Error('没有这首歌：' + key);
      if (key === currentTrack) return;
      currentTrack = key;
      tracks[key].currentTime = 0;
      musicStarted = true;
      if (!muted) playCurrent();
      fadeMusic();
    },
    state: function () {
      var audio = tracks[currentTrack];
      if (!audio) return { track: null, started: false, playing: false, muted: muted, time: 0, volume: 0 };
      return { track: currentTrack, started: musicStarted, playing: !audio.paused, muted: muted, time: audio.currentTime, volume: audio.volume };
    },
  };

  $('mute').addEventListener('click', function () {
    muted = !muted;
    this.setAttribute('aria-pressed', String(muted));
    if (!muted) { musicStarted = true; playCurrent(); }
    fadeMusic();
  });

  function flash() {
    var el = $('flash');
    el.classList.remove('is-on');
    void el.offsetWidth;
    el.classList.add('is-on');
  }

  /* ---------- 翻页 ---------- */
  // 封面的标题和日期
  document.title = config.title;
  $('h-cover').textContent = config.title;
  $('kicker').textContent = config.startDate.replace(/-/g, '.') + (config.anniversaryDate ? ' — ' + config.anniversaryDate.replace(/-/g, '.') : '');

  // config.hidePages 里的页面不出现；没有第二首歌时，唱片机那页也不出现
  var hiddenPages = (config.hidePages || []).filter(function (id) { return id !== 'p-cover'; });
  if (!tracks.second) hiddenPages.push('p-vinyl');
  else $('p-vinyl').dataset.title = musicConfig.first.label + ' → ' + musicConfig.second.label;
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page')).filter(function (page) {
    var isHidden = hiddenPages.indexOf(page.id) >= 0;
    page.hidden = isHidden;
    return !isHidden;
  });
  var current = 0;
  var enterHandlers = {};
  var leaveHandlers = {};
  var dotButtons = [];

  function on(map, id, fn) { (map[id] = map[id] || []).push(fn); }
  function fire(map, id) { (map[id] || []).forEach(function (fn) { fn(); }); }

  function render() {
    pages.forEach(function (page, index) {
      page.classList.toggle('is-active', index === current);
      page.classList.toggle('is-past', index < current);
      page.setAttribute('aria-hidden', String(index !== current));
      page.inert = index !== current;
    });
    dotButtons.forEach(function (btn, index) {
      btn.setAttribute('aria-current', String(index === current));
    });
    $('prev').disabled = current === 0;
    $('next').disabled = current === pages.length - 1;
    $('next').classList.remove('is-nudge');
    $('pagerTitle').textContent = (current + 1) + ' / ' + pages.length + ' ' + pages[current].dataset.title;
  }

  function goTo(index) {
    var target = Math.max(0, Math.min(pages.length - 1, index));
    if (target === current) return;
    fire(leaveHandlers, pages[current].id);
    current = target;
    render();
    sfx('page');
    fire(enterHandlers, pages[current].id);
  }

  /** 这一页的互动做完了：让“下一页”按钮动一动。 */
  function nudgeNext(pageId) {
    if (pageId && pages[current].id !== pageId) return; // 延时触发时人已经翻走了，就不提示
    if (current < pages.length - 1) $('next').classList.add('is-nudge');
  }

  pages.forEach(function (page, index) {
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', '第 ' + (index + 1) + ' 页：' + page.dataset.title);
    btn.addEventListener('click', function () { goTo(index); });
    li.appendChild(btn);
    $('dots').appendChild(li);
    dotButtons.push(btn);
  });
  $('prev').addEventListener('click', function () { goTo(current - 1); });
  $('next').addEventListener('click', function () { goTo(current + 1); });

  document.addEventListener('keydown', function (event) {
    if (!$('lightbox').hidden) return;
    // 游戏进行中、或焦点在胶卷上时，左右键留给游戏 / 胶卷滚动
    var inGame = pages[current].id === 'p-game' && window.Anniv.gameActive();
    inGame = inGame || !!(event.target.closest && event.target.closest('.strip'));
    if (event.key === 'PageDown' || (!inGame && event.key === 'ArrowRight')) { goTo(current + 1); event.preventDefault(); }
    if (event.key === 'PageUp' || (!inGame && event.key === 'ArrowLeft')) { goTo(current - 1); event.preventDefault(); }
  });

  /* ---------- 照片放大 ---------- */
  var lbIndex = 0;
  var lbOpener = null;

  function showLightbox(index) {
    lbIndex = (index + photos.length) % photos.length;
    $('lbImg').src = photos[lbIndex].full;
    $('lbImg').alt = photos[lbIndex].caption || '我们的照片';
    $('lbCap').textContent = photos[lbIndex].caption;
  }
  function setBackgroundInert(isInert) {
    $('book').inert = isInert;
    document.querySelector('.pager').inert = isInert;
  }
  function openLightbox(index, opener) {
    lbOpener = opener || null;
    showLightbox(index);
    setBackgroundInert(true);
    $('lightbox').hidden = false;
    $('lbClose').focus();
    sfx('pop');
  }
  function closeLightbox() {
    $('lightbox').hidden = true;
    setBackgroundInert(false);
    if (lbOpener) lbOpener.focus();
  }
  $('lbPrev').addEventListener('click', function () { showLightbox(lbIndex - 1); });
  $('lbNext').addEventListener('click', function () { showLightbox(lbIndex + 1); });
  $('lbClose').addEventListener('click', closeLightbox);
  $('lightbox').addEventListener('click', function (event) { if (event.target === this) closeLightbox(); });
  document.addEventListener('keydown', function (event) {
    if ($('lightbox').hidden) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') showLightbox(lbIndex - 1);
    if (event.key === 'ArrowRight') showLightbox(lbIndex + 1);
  });

  window.Anniv = {
    $: $,
    config: config,
    photos: photos,
    reducedMotion: reducedMotion,
    sfx: sfx,
    music: music,
    flash: flash,
    goTo: goTo,
    nudgeNext: nudgeNext,
    gameActive: function () { return false; }, // game.js 会换成真的
    onEnter: function (id, fn) { on(enterHandlers, id, fn); },
    onLeave: function (id, fn) { on(leaveHandlers, id, fn); },
    currentPageId: function () { return pages[current].id; },
    openLightbox: openLightbox,
  };

  render();
})();
