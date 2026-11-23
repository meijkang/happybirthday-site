/* 心动纸条罐：抽出来的是具体日子。 */
(function () {
  'use strict';
  var notes = (window.ANNIV_CONFIG || {}).notes || [];
  var order = [], cursor = 0;

  function $(id) { return document.getElementById(id); }
  if (!notes.length) return;

  for (var i = 0; i < notes.length; i++) order.push(i);
  for (var j = order.length - 1; j > 0; j--) {
    var k = Math.floor(Math.random() * (j + 1));
    var tmp = order[j]; order[j] = order[k]; order[k] = tmp;
  }

  $('noteDraw').addEventListener('click', function () {
    var item = notes[order[cursor]];
    cursor = (cursor + 1) % order.length;
    var card = $('noteCard');
    card.classList.add('is-switching');
    setTimeout(function () {
      $('noteTag').textContent = '· ' + item.tag + ' ·';
      $('noteText').textContent = item.text;
      card.classList.remove('is-switching');
    }, 140);
    window.Anniv.sfx('pop');
  });
})();
