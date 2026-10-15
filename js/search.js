(function () {
  var P = Planora, UI = PlUI, D = P.D, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('');
  var q = UI.qs('q') || '', type = 'all';
  var TYPES = [['all', 'All'], ['exam', 'Exams'], ['homework', 'Homework'], ['reading', 'Readings'], ['project', 'Projects']];
  function hay(e) { var d = D.parse(e.date); return [e.title, e.course, P.COURSE_NAMES[e.course] || '', e.type, D.short(e.date), d.getDate() + ' ' + P.MON3[d.getMonth()], P.MONTHS[d.getMonth()], e.date].join(' ').toLowerCase(); }
  function render() {
    var ql = q.trim().toLowerCase();
    var hits = P.deadlines().filter(function (e) { return (type === 'all' || P.groupOf(e) === type) && (!ql || ql.split(/\s+/).every(function (w) { return hay(e).indexOf(w) >= 0; })); })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    var chips = TYPES.map(function (t) { return '<button type="button" class="fchip' + (type === t[0] ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    var rows = hits.map(function (e) { return UI.row(e, { href: UI.eventHref(e) }); }).join('');
    $('view').innerHTML =
      '<div class="search-bar"><span aria-hidden="true">⌕</span><input id="q" type="search" placeholder="Search your deadlines..." aria-label="Search your deadlines" value="' + UI.esc(q) + '"></div>' +
      '<div class="d-flex gap-2 flex-wrap mb-3">' + chips + '</div>' +
      '<div class="mb-3 muted"><b class="text-body">' + (hits.length ? hits.length + (hits.length === 1 ? ' result' : ' results') : 'No results') + '</b> ' + (ql ? 'for “' + UI.esc(q.trim()) + '”' : '') + '</div>' +
      (hits.length ? '<div class="list">' + rows + '</div>' :
        '<div class="empty-state"><h2>Nothing matches “' + UI.esc(q.trim()) + '”</h2><p>Check the spelling, try a course code like CS301, or clear the type filter.</p><button type="button" class="btn btn-secondary" id="clr">Clear search</button> <a class="btn btn-primary" href="dashboard.html">Back to dashboard</a></div>');
    var inp = $('q'); inp.addEventListener('input', function () { q = inp.value; var pos = inp.selectionStart; render(); var n = $('q'); n.focus(); n.setSelectionRange(pos, pos); history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname); });
    $('view').querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { type = b.dataset.t; render(); }; });
    if ($('clr')) $('clr').onclick = function () { q = ''; type = 'all'; history.replaceState(null, '', location.pathname); render(); $('q').focus(); };
  }
  render();
})();
