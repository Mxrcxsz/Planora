(function () {
  var P = Planora, $ = function (id) { return document.getElementById(id); };
  $('f').addEventListener('submit', function (e) {
    e.preventDefault();
    var first = $('first').value.trim(), last = $('last').value.trim(), em = $('email').value.trim(), pw = $('password').value;
    var okEm = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em), okPw = pw.length >= 8 && /[\d\W]/.test(pw), okT = $('terms').checked;
    $('first').classList.toggle('is-invalid', !first); $('email').classList.toggle('is-invalid', !okEm);
    $('password').classList.toggle('is-invalid', !okPw); $('terms').classList.toggle('is-invalid', !okT);
    if (!first || !okEm || !okPw || !okT) return;
    P.signup(first, last, em); location.href = 'dashboard.html';
  });
  $('google').addEventListener('click', function () { P.login(); location.href = 'dashboard.html'; });
})();
