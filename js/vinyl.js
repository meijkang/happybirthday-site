/* 唱片机页：先放着第一首歌，点一下换成第二首（文字和唱片上的标记来自 config.music） */
(function () {
  'use strict';

  var A = window.Anniv;
  var $ = A.$;
  var SWAP_MS = 1700; // 唱臂抬起、换唱片、再落下

  var music = A.config.music || {};
  if (!music.first || !music.second) return; // 没有第二首歌时，这一页已被隐藏

  var page = $('p-vinyl');
  var deck = $('deck');
  var first = music.first;
  var second = music.second;

  $('recordFirst').dataset.no = first.label;
  $('recordSecond').dataset.no = second.label;
  $('countFirst').textContent = first.label;
  $('countSecond').textContent = second.label;
  $('vinylBefore').textContent = music.before || '';
  $('vinylAfter').textContent = music.after || '';
  $('playingBefore').textContent = (first.name || '') + ' · 点一下唱片机';
  $('playingAfter').textContent = '从 ' + first.label + '，到 ' + second.label + ' · ' + (second.name || '');
  deck.setAttribute('aria-label', '点一下唱片机，换一张唱片：从 ' + first.label + ' 到 ' + second.label);

  deck.addEventListener('click', function () {
    if (page.classList.contains('is-swapped')) return;
    deck.classList.add('is-swapping');
    page.classList.add('is-swapped');
    deck.setAttribute('aria-label', '唱片机，正在播放 ' + (second.name || second.label));
    deck.disabled = true;
    A.music.switchTo('second');
    A.sfx('pop');
    setTimeout(function () {
      deck.classList.remove('is-swapping');
      A.nudgeNext('p-vinyl');
    }, SWAP_MS);
  });
})();
