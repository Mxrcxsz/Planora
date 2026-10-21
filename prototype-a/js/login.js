(function () {
  var P = Planora, $ = function (id) { return document.getElementById(id); };
  var next = new URLSearchParams(location.search).get('next');
  function go() { location.href = next && /^[a-z]+\.html/.test(next) ? next : 'dashboard.html'; }
  if (P.state.user.loggedIn && !next) { /* already in: let them continue */ }
  $('f').addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('email').value.trim(), pw = $('password').value;
    var okEm = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em);
    $('email').classList.toggle('is-invalid', !okEm); $('password').classList.toggle('is-invalid', !pw);
    $('err').hidden = true;
    if (!okEm || !pw) return;
    if (pw !== 'demo1234') { $('err').hidden = false; $('password').focus(); return; }
    P.login(em); go();
  });
  $('google').addEventListener('click', function () { P.login(); go(); });
  $('forgot').addEventListener('click', function (e) { e.preventDefault(); $('err').hidden = true; alert('Prototype: password reset is not wired up. Use demo1234.'); });
})();
