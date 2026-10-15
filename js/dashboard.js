(function () {
  var P = Planora, UI = PlUI, D = P.D, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('dashboard');
  var ui = P.state.ui;
  var TYPES = [['homework', 'Homework'], ['exam', 'Exams'], ['reading', 'Readings'], ['project', 'Projects']];

  function conflictGroups() {
    var g = {}; P.conflicts().forEach(function (e) { var k = e.date + (e.start || ''); (g[k] = g[k] || []).push(e); });
    return Object.keys(g).map(function (k) { return g[k]; });
  }
  function render() {
    var all = P.deadlines(), has = all.length > 0, hr = new Date().getHours();
    var greet = (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening') + ', ' + P.firstName();
    var open = all.filter(function (e) { return !e.done; });
    var week = open.filter(function (e) { var d = D.diff(e.date, P.TODAY); return d >= 0 && d <= 7; });
    var upcoming = open.filter(function (e) { return D.diff(e.date, P.TODAY) > 7; });
    var check = open.filter(function (e) { return e.status === 'check'; });
    var groups = conflictGroups();
    var h = '<div class="head-row"><div><h1>' + UI.esc(has ? greet : 'Welcome to Planora, ' + P.firstName()) + '</h1><p>' +
      (has ? 'You have ' + week.length + (week.length === 1 ? ' thing' : ' things') + ' due this week.' : 'Nothing due yet — add your first course to get started.') +
      '</p></div><a class="btn btn-primary" href="upload.html">+ Upload a syllabus</a></div>';
    if (!has) {
      $('view').innerHTML = h + '<div class="first-run"><h2>Start with one syllabus</h2><p class="muted">Planora reads it, finds every deadline, and fills this page for you.</p>' +
        '<div class="fr-steps"><div class="fr-step"><span class="fr-n">1</span><div><b>Upload</b><span class="s">PDF, Word doc or a photo</span></div></div>' +
        '<div class="fr-step"><span class="fr-n">2</span><div><b>Review</b><span class="s">Confirm what Planora found</span></div></div>' +
        '<div class="fr-step"><span class="fr-n">3</span><div><b>Plan</b><span class="s">See it on your calendar</span></div></div></div>' +
        '<a class="btn btn-primary" href="upload.html">Upload a syllabus</a></div>';
      return;
    }
    if (groups.length && !P.state.conflictAck) {
      var g = groups[0];
      h += '<a class="alert-banner" href="conflict.html"><span aria-hidden="true">⚠</span><div><b>Scheduling conflict —</b> ' + UI.esc(g[0].course + ' ' + g[0].title) + (g[1] ? ' and ' + UI.esc(g[1].course + ' ' + g[1].title) : '') + ' are both due ' + D.short(g[0].date) + ' at the same time.</div><span class="go">Resolve</span></a>';
    }
    h += '<div class="row g-3 mb-4">' + [[week.length, 'Due this week'], [upcoming.length, 'Upcoming'], [check.length, 'Need a check'], [groups.length, groups.length === 1 ? 'Conflict' : 'Conflicts']].map(function (s) {
      return '<div class="col-6 col-md-3"><div class="stat"><div class="num">' + s[0] + '</div><div class="label">' + s[1] + '</div></div></div>'; }).join('') + '</div>';
    // filters
    var courses = P.courses(), activeC = courses.filter(function (c) { return ui.dashCourses[c] !== false; });
    var cf = courses.map(function (c) {
      var n = all.filter(function (e) { return e.course === c && !e.done; }).length;
      return '<label class="filter-item"><input class="form-check-input mt-0" type="checkbox" data-c="' + c + '"' + (ui.dashCourses[c] !== false ? ' checked' : '') + '> ' + c + (P.COURSE_NAMES[c] ? ' — ' + P.COURSE_NAMES[c] : '') + '<span class="count">' + n + '</span></label>'; }).join('');
    var tf = TYPES.map(function (t) {
      var n = all.filter(function (e) { return P.groupOf(e) === t[0] && !e.done; }).length;
      return '<label class="filter-item"><input class="form-check-input mt-0" type="checkbox" data-t="' + t[0] + '"' + (ui.dashTypes[t[0]] !== false ? ' checked' : '') + '> ' + t[1] + '<span class="count">' + n + '</span></label>'; }).join('');
    var pass = function (e) { return ui.dashCourses[e.course] !== false && ui.dashTypes[P.groupOf(e)] !== false; };
    var sortFn = function (a, b) { return (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')); };
    var rows = week.filter(pass).sort(sortFn).map(function (e) { return UI.row(e, { href: UI.eventHref(e) }); }).join('');
    var att = check.filter(pass).sort(sortFn).map(function (e) {
      return '<div class="irow"><div class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</div><div class="irow-body"><div class="irow-title">' + UI.esc(e.title) + '</div><div class="irow-sub"><span class="chip">' + e.course + '</span>' + (e.note && /unclear|TBD/.test(e.note) ? (/TBD/.test(e.note) ? 'Listed as "TBD%"' : 'Due date unclear') : UI.esc(P.whenOf(e))) + '</div></div><a class="pbadge warn" href="edit.html?id=' + encodeURIComponent(e.id) + '&from=dashboard">Check this</a></div>'; }).join('');
    h += '<div class="row g-4"><div class="col-lg-4"><div class="widget"><div class="widget-head"><h3>Filter by course</h3></div>' +
      '<div class="d-flex justify-content-between px-3 pb-2 small muted"><span>' + activeC.length + ' course' + (activeC.length === 1 ? '' : 's') + ' active</span><button type="button" class="btn-link-ink small" id="clear">Clear</button></div>' + cf + '<div class="pb-2"></div></div>' +
      '<div class="widget"><div class="widget-head"><h3>Filter by type</h3></div>' + tf + '<div class="pb-2"></div></div></div>' +
      '<div class="col-lg-8"><div class="widget"><div class="widget-head"><h3>Due this week</h3><a class="small fw-semibold" href="tasks.html">View all</a></div>' +
      (rows || '<div class="px-3 pb-3 muted">Nothing due this week for these filters.</div>') + '</div>' +
      '<div class="widget"><div class="widget-head"><h3>Needs your attention</h3></div>' + (att || '<div class="px-3 pb-3 muted">Nothing needs a check. Nice.</div>') + '</div></div></div>';
    $('view').innerHTML = h;
    $('view').querySelectorAll('[data-c]').forEach(function (i) { i.onchange = function () { ui.dashCourses[i.dataset.c] = i.checked; P.save(); render(); }; });
    $('view').querySelectorAll('[data-t]').forEach(function (i) { i.onchange = function () { ui.dashTypes[i.dataset.t] = i.checked; P.save(); render(); }; });
    if ($('clear')) $('clear').onclick = function () { ui.dashCourses = {}; ui.dashTypes = {}; P.save(); render(); };
  }
  render();
})();
