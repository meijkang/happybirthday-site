/* 记忆小考：不为分数，为了把故事再讲一遍。 */
(function () {
  'use strict';
  var config = window.ANNIV_CONFIG || {};
  var quiz = config.quiz || [];
  if (!quiz.length) return;
  var index = 0, score = 0, answered = false;

  function $(id) { return document.getElementById(id); }
  var box = $('quizOptions');

  function render() {
    var item = quiz[index];
    answered = false;
    $('quizNo').textContent = 'Q' + (index + 1) + ' / ' + quiz.length;
    $('quizQuestion').textContent = item.q;
    $('quizSay').textContent = '';
    $('quizScore').textContent = '已答对 ' + score + ' 题';
    $('quizRestart').hidden = false;
    box.textContent = '';
    item.options.forEach(function (option, answer) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = option;
      btn.addEventListener('click', function () { pick(answer, btn); });
      box.appendChild(btn);
    });
  }

  function pick(answer, btn) {
    if (answered) return;
    answered = true;
    var item = quiz[index];
    var right = answer === item.answer;
    if (right) score++;
    Array.prototype.forEach.call(box.children, function (el, i) {
      el.disabled = true;
      if (i === item.answer) el.classList.add('is-right');
      else if (el === btn) el.classList.add('is-wrong');
    });
    $('quizSay').textContent = (right ? '答对了。' : '没关系。') + item.say;
    $('quizScore').textContent = '已答对 ' + score + ' / ' + quiz.length + ' 题';
    window.Anniv.sfx(right ? 'heart' : 'nope');
    setTimeout(function () {
      if (index + 1 < quiz.length) { index++; render(); }
      else {
        $('quizNo').textContent = '考完了';
        $('quizQuestion').textContent = '你比答案重要';
        box.textContent = '';
        $('quizSay').textContent = '不用算分数。能一起坐在这里讲这些，就已经很好了。';
        $('quizRestart').hidden = false;
      }
    }, 900);
  }

  $('quizRestart').addEventListener('click', function () {
    index = 0; score = 0; render();
  });

  render();
})();
