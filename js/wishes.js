/* 愿望清单：今天完成一件，故事就厚一页。 */
(function () {
  'use strict';
  var wishes = (window.ANNIV_CONFIG || {}).wishes || [];
  function $(id) { return document.getElementById(id); }
  if (!wishes.length) return;

  var list = $('wishList'), done = 0;

  function update() {
    $('wishBar').style.width = (done / wishes.length * 100) + '%';
    $('wishSay').textContent = done === wishes.length
      ? '全部完成了。那下一页，我们继续写。'
      : '已完成 ' + done + ' / ' + wishes.length + '。慢慢来，我不急。';
  }

  wishes.forEach(function (item, index) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '<i>✓</i><span></span>';
    btn.lastElementChild.textContent = item.text;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      item.done = !item.done;
      btn.classList.toggle('is-done', item.done);
      btn.setAttribute('aria-pressed', String(item.done));
      done = wishes.filter(function (w) { return w.done; }).length;
      window.Anniv.sfx(item.done ? 'heart' : 'nope');
      update();
    });
    list.appendChild(btn);
  });
  update();
})();
