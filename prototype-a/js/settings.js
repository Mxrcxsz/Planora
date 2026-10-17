(function () {
  var P = Planora, UI = PlUI, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('');
  var S = P.state.settings, SEC = [['account', 'Account'], ['notif', 'Notifications'], ['courses', 'Courses'], ['cals', 'Connected calendars'], ['demo', 'Demo tools']];
  var sec = (location.hash || '#account').slice(1); if (!SEC.some(function (s) { return s[0] === sec; })) sec = 'account';
  var pwOpen = false, delOpen = false, restartOpen = false;
  var NOTES = [['email', 'Email reminders', 'Get an email the day before something\'s due'], ['conflict', 'Conflict alerts', 'Notify me right away when two deadlines clash'], ['weekly', 'Weekly summary', 'A Sunday recap of the week ahead']];

  function render() {
    $('tabs').innerHTML = SEC.map(function (s) { return '<button type="button" role="tab" class="side-item' + (sec === s[0] ? ' active' : '') + '" aria-selected="' + (sec === s[0]) + '" data-s="' + s[0] + '">' + s[1] + '</button>'; }).join('');
    var h = '';
    if (sec === 'account') {
      h = '<div class="pcard mb-4"><div class="panel-pad"><h3>Account</h3></div>' +
        '<div class="field-row"><div class="field-label">Name</div><input class="form-control" id="name" aria-label="Name" value="' + UI.esc(P.state.user.name) + '"></div>' +
        '<div class="field-row"><div class="field-label">Email</div><input class="form-control" id="email" type="email" aria-label="Email" value="' + UI.esc(P.state.user.email) + '"></div>' +
        '<div class="field-row"><div><div class="field-label">Password</div><div class="field-hint">Last changed 3 months ago</div></div><button type="button" class="btn btn-secondary btn-sm" id="pwt">' + (pwOpen ? 'Close' : 'Change password') + '</button></div>' +
        (pwOpen ? '<div class="px-4 pb-3 d-grid gap-2" style="max-width:420px"><input class="form-control" id="pw1" type="password" placeholder="Current password" aria-label="Current password"><input class="form-control" id="pw2" type="password" placeholder="New password (8+ characters)" aria-label="New password"><div class="invalid-feedback" id="pwe">Use at least 8 characters for the new password.</div><div class="d-flex gap-2"><button type="button" class="btn btn-secondary btn-sm" id="pwc">Cancel</button><button type="button" class="btn btn-primary btn-sm" id="pws">Update password</button></div></div>' : '') +
        '<div class="field-row"><span></span><button type="button" class="btn btn-primary btn-sm" id="saveAcc">Save changes</button></div></div>' +
        '<div class="pcard mb-4"><div class="panel-pad"><h3>Account actions</h3></div>' +
        '<div class="field-row"><div class="field-label">Log out of Planora</div><button type="button" class="btn btn-secondary btn-sm" id="logout">Log out</button></div>' +
        '<div class="field-row"><div><div class="field-label">Delete account</div><div class="field-hint">Permanently removes your data. Can\'t be undone.</div></div><button type="button" class="btn btn-danger-soft btn-sm" id="del">Delete account</button></div>' +
        (delOpen ? '<div class="px-4 pb-3"><div class="del-box"><b>Delete your account?</b><p class="mb-2 small">All courses, deadlines and notes will be removed for good.</p><div class="d-flex gap-2"><button type="button" class="btn btn-secondary btn-sm" id="keep">Keep my account</button><button type="button" class="btn btn-danger btn-sm" id="yes">Yes, delete it</button></div></div></div>' : '') + '</div>';
    } else if (sec === 'notif') {
      h = '<div class="pcard"><div class="panel-pad"><h3>Notifications</h3></div>' + NOTES.map(function (n) {
        return '<div class="field-row"><div><div class="field-label">' + n[1] + '</div><div class="field-hint">' + n[2] + '</div></div><button type="button" role="switch" aria-checked="' + !!S.notif[n[0]] + '" aria-label="' + n[1] + '" class="toggle' + (S.notif[n[0]] ? ' on' : '') + '" data-n="' + n[0] + '"><span class="knob"></span></button></div>'; }).join('') + '</div>';
    } else if (sec === 'courses') {
      var cs = P.courses();
      h = '<div class="pcard"><div class="panel-pad"><h3>Courses</h3></div>' + (cs.length ? cs.map(function (c) {
        return '<div class="field-row"><div><div class="field-label">' + UI.esc(c) + '</div><div class="field-hint">' + UI.esc(P.COURSE_NAMES[c] || 'Added from a syllabus') + '</div></div><button type="button" class="btn btn-danger-soft btn-sm" data-rm="' + UI.esc(c) + '">Remove</button></div>'; }).join('') : '<div class="field-row muted">No courses yet. Upload a syllabus to add one.</div>') +
        '<div class="field-row"><span></span><a class="btn btn-primary btn-sm" href="upload.html">Add a course</a></div></div>';
    } else if (sec === 'demo') {
      h = '<div class="demo-note mb-4"><b>How saving works in this prototype</b><p>Everything a tester does (resolving conflicts, editing, deleting, uploading) is saved and shows up across every page. ' +
        'Changes last until this browser tab is closed. Opening Planora again starts from the original demo scenario.</p></div>' +
        '<div class="pcard"><div class="panel-pad"><h3>Demo tools</h3><p class="muted small mb-0">For whoever is running a test session. Use these between testers.</p></div>' +
        '<div class="field-row"><div><div class="field-label">Restart the demo from the beginning</div><div class="field-hint">Restores the original scenario, signs out and returns to the landing page, ready for the next tester.</div></div><button type="button" class="btn btn-primary btn-sm" id="restart">Restart demo</button></div>' +
        (restartOpen ? '<div class="px-4 pb-3"><div class="del-box"><b>Restart the demo?</b><p class="mb-2 small">All changes made in this session will be discarded.</p><div class="d-flex gap-2"><button type="button" class="btn btn-secondary btn-sm" id="restartNo">Cancel</button><button type="button" class="btn btn-danger btn-sm" id="restartYes">Restart demo</button></div></div></div>' : '') +
        '<div class="field-row"><div><div class="field-label">Prototype version</div><div class="field-hint">Switch prototypes without losing the changes from this test session.</div>' +
        '<ul class="ab-list"><li><b>Resolve a conflict</b> A: dates table + pending review list · B: side-by-side cards</li><li><b>Review and task list</b> shared in both</li></ul></div>' +
        '<div class="seg-sm" role="group" aria-label="Prototype version">' + ['A', 'B'].map(function (v) { return '<button type="button" data-ab="' + v + '" class="' + (P.variant() === v ? 'active' : '') + '" aria-pressed="' + (P.variant() === v) + '">Prototype ' + v + '</button>'; }).join('') + '</div></div>' +
        '<div class="field-row"><div><div class="field-label">Reset demo data</div><div class="field-hint">Restores the sample semester (CS301, MATH210, ENG110, HIST220) but stays signed in.</div></div><button type="button" class="btn btn-secondary btn-sm" id="reset">Reset data</button></div>' +
        '<div class="field-row"><div><div class="field-label">Start with an empty account</div><div class="field-hint">Clears everything so you can test the first-run flow.</div></div><button type="button" class="btn btn-secondary btn-sm" id="empty">Clear all data</button></div></div>';
    } else {
      h = '<div class="pcard"><div class="panel-pad"><h3>Connected calendars</h3></div>' +
        '<div class="field-row"><div><div class="field-label">Google Calendar</div><div class="field-hint">' + (S.gcal ? 'Connected as ' + UI.esc(P.state.user.email) + ' — deadlines sync both ways' : 'Not connected. Sync deadlines to your Google Calendar.') + '</div></div><button type="button" class="btn btn-sm ' + (S.gcal ? 'btn-danger-soft' : 'btn-primary') + '" id="gcal">' + (S.gcal ? 'Disconnect' : 'Connect') + '</button></div>' +
        '<div class="field-row"><div><div class="field-label">Apple Calendar</div><div class="field-hint">Subscribe with an .ics link</div></div><button type="button" class="btn btn-secondary btn-sm" id="ics">Copy link</button></div></div>';
    }
    $('view').innerHTML = h; bind();
  }
  function bind() {
    var on = function (id, fn) { var e = $(id); if (e) e.onclick = fn; };
    document.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { sec = b.dataset.s; history.replaceState(null, '', '#' + sec); render(); }; });
    document.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { S.notif[b.dataset.n] = !S.notif[b.dataset.n]; P.save(); render(); UI.toast('Notification settings saved'); }; });
    document.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { var c = b.dataset.rm; S.extraCourses = S.extraCourses.filter(function (x) { return x !== c; }); if (S.removedCourses.indexOf(c) < 0) S.removedCourses.push(c); P.save(); render(); UI.toast(c + ' removed'); }; });
    on('pwt', function () { pwOpen = !pwOpen; render(); }); on('pwc', function () { pwOpen = false; render(); });
    on('pws', function () { if ($('pw2').value.length < 8) { $('pw2').classList.add('is-invalid'); $('pwe').style.display = 'block'; return; } pwOpen = false; render(); UI.toast('Password updated'); });
    on('saveAcc', function () { var n = $('name').value.trim(), em = $('email').value.trim(); if (!n || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { UI.toast('Add a name and a valid email'); return; } P.state.user.name = n; P.state.user.email = em; P.save(); UI.nav(''); UI.toast('Account saved'); });
    on('logout', function () { P.logout(); location.href = 'login.html'; });
    on('del', function () { delOpen = true; render(); }); on('keep', function () { delOpen = false; render(); });
    on('yes', function () { P.restart(); location.href = 'index.html'; });
    on('restart', function () { restartOpen = true; render(); }); on('restartNo', function () { restartOpen = false; render(); });
    on('restartYes', function () { P.restart(); location.href = 'index.html'; });
    document.querySelectorAll('[data-ab]').forEach(function (b) { b.onclick = function () {
      var version = b.dataset.ab;
      if (version === P.variant()) return;
      var storageKey = version === 'B' ? 'planora.prototype-b.v1' : 'planora.prototype-a.v1';
      var flashKey = version === 'B' ? 'planora.prototype-b.flash' : 'planora.prototype-a.flash';
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(P.state));
        sessionStorage.setItem(flashKey, 'Switched to Prototype ' + version);
      } catch (e) { /* continue even when session storage is unavailable */ }
      location.href = '../prototype-' + version.toLowerCase() + '/settings.html#demo';
    }; });
    on('reset', function () { P.reset('demo'); UI.flash('Demo data restored'); location.reload(); });
    on('empty', function () { P.reset('empty'); UI.flash('All data cleared. Open the dashboard for the first-run view.'); location.reload(); });
    on('gcal', function () { S.gcal = !S.gcal; P.save(); render(); UI.toast(S.gcal ? 'Google Calendar connected' : 'Google Calendar disconnected'); });
    on('ics', function () { var l = 'https://planora.example/ical/jamie-lee.ics'; if (navigator.clipboard) navigator.clipboard.writeText(l).catch(function () {}); UI.toast('Calendar link copied'); });
  }
  render();
})();
