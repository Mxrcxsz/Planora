(function () {
  var P = Planora, UI = PlUI, D = P.D, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('');
  var T = P.TODAY;
  var q = UI.qs('q') || '', type = 'all', period = 'any', from = UI.qs('from') || '', to = UI.qs('to') || '';
  if (from || to) period = 'custom';
  var TYPES = [['all', 'All'], ['exam', 'Exams'], ['homework', 'Homework'], ['reading', 'Readings'], ['project', 'Projects']];
  // presets resolve against the demo's fixed "today"; '' means open-ended
  var PERIODS = [
    ['any', 'Any time', function () { return ['', '']; }],
    ['week', 'This week', function () { var m = D.mondayOf(T); return [m, D.add(m, 6)]; }],
    ['next7', 'Next 7 days', function () { return [T, D.add(T, 6)]; }],
    ['month', 'This month', function () { var d = D.parse(T); return [D.iso(new Date(d.getFullYear(), d.getMonth(), 1)), D.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))]; }],
    ['next30', 'Next 30 days', function () { return [T, D.add(T, 29)]; }],
    ['past', 'Past', function () { return ['', D.add(T, -1)]; }]
  ];
  function hay(e) { var d = D.parse(e.date); return [e.title, e.course, P.COURSE_NAMES[e.course] || '', e.type, D.short(e.date), d.getDate() + ' ' + P.MON3[d.getMonth()], P.MONTHS[d.getMonth()], e.date].join(' ').toLowerCase(); }
  var bad = function () { return from && to && from > to; };
  function rangeText() {
    if (!from && !to) return '';
    var y = function (s) { return D.short(s) + (D.parse(s).getFullYear() !== D.parse(T).getFullYear() ? ' ' + D.parse(s).getFullYear() : ''); };
    return from && to ? (from === to ? y(from) : y(from) + ' – ' + y(to)) : from ? 'from ' + y(from) : 'until ' + y(to);
  }
  function syncUrl() {
    var p = new URLSearchParams(); if (q) p.set('q', q); if (period === 'custom') { if (from) p.set('from', from); if (to) p.set('to', to); }
    var s = p.toString(); history.replaceState(null, '', s ? '?' + s : location.pathname);
  }

  // controls are built once; only the results and the control states update afterwards
  $('view').innerHTML =
    '<div class="search-bar"><span aria-hidden="true">⌕</span><input id="q" type="search" placeholder="Search your deadlines..." aria-label="Search your deadlines" value="' + UI.esc(q) + '"></div>' +
    '<div class="srch-layout"><section class="srch-results" id="results" aria-live="polite"></section>' +
    '<aside class="pcard srch-side" aria-label="Search options">' +
    '<div class="srch-sec"><h3 id="typeL">Type</h3><div class="d-flex gap-2 flex-wrap" role="group" aria-labelledby="typeL">' +
    TYPES.map(function (t) { return '<button type="button" class="fchip" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="srch-sec"><h3 id="perL">Time period</h3><div class="d-flex gap-2 flex-wrap" role="group" aria-labelledby="perL">' +
    PERIODS.map(function (p) { return '<button type="button" class="fchip" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
    '<div class="period-range"><div><label class="form-label" for="from">From</label><input class="form-control" type="date" id="from"></div><span aria-hidden="true">–</span>' +
    '<div><label class="form-label" for="to">To</label><input class="form-control" type="date" id="to"></div></div>' +
    '<div class="invalid-feedback" id="perr">The start date is after the end date.</div></div>' +
    '<div class="srch-foot"><button type="button" class="btn-link-ink" id="reset">Clear filters</button></div></aside></div>';

  function render() {
    var ql = q.trim().toLowerCase(), useRange = !bad();
    var hits = P.deadlines().filter(function (e) {
      return (type === 'all' || P.groupOf(e) === type) &&
        (!useRange || ((!from || e.date >= from) && (!to || e.date <= to))) &&
        (!ql || ql.split(/\s+/).every(function (w) { return hay(e).indexOf(w) >= 0; }));
    }).sort(function (a, b) { return a.date.localeCompare(b.date); });
    // control states
    document.querySelectorAll('[data-t]').forEach(function (b) { b.classList.toggle('on', b.dataset.t === type); b.setAttribute('aria-pressed', b.dataset.t === type); });
    document.querySelectorAll('[data-p]').forEach(function (b) { b.classList.toggle('on', b.dataset.p === period); b.setAttribute('aria-pressed', b.dataset.p === period); });
    if ($('from').value !== from) $('from').value = from;
    if ($('to').value !== to) $('to').value = to;
    $('from').classList.toggle('is-invalid', bad()); $('to').classList.toggle('is-invalid', bad()); $('perr').style.display = bad() ? 'block' : '';
    var filtered = type !== 'all' || from || to;
    $('reset').hidden = !filtered;
    // results
    var range = useRange ? rangeText() : '';
    var head = '<div class="mb-3 muted"><b class="text-body">' + (hits.length ? hits.length + (hits.length === 1 ? ' result' : ' results') : 'No results') + '</b> ' +
      (ql ? 'for “' + UI.esc(q.trim()) + '”' : '') + (range ? ' <span class="srch-range">' + range + '</span>' : '') + '</div>';
    $('results').innerHTML = head + (hits.length
      ? '<div class="list">' + hits.map(function (e) { return UI.row(e, { href: UI.eventHref(e) }); }).join('') + '</div>'
      : '<div class="empty-state"><h2>' + (ql ? 'Nothing matches “' + UI.esc(q.trim()) + '”' : 'Nothing in this period') + '</h2><p>' +
        (filtered ? 'Try a wider time period or clear the filters.' : 'Check the spelling, or try a course code like CS301.') + '</p>' +
        '<button type="button" class="btn btn-secondary" id="clr">Clear search</button> <a class="btn btn-primary" href="dashboard.html">Back to dashboard</a></div>');
    if ($('clr')) $('clr').onclick = function () { q = ''; $('q').value = ''; type = 'all'; period = 'any'; from = to = ''; syncUrl(); render(); $('q').focus(); };
  }

  $('q').addEventListener('input', function () { q = this.value; syncUrl(); render(); });
  document.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { type = b.dataset.t; render(); }; });
  document.querySelectorAll('[data-p]').forEach(function (b) {
    b.onclick = function () { period = b.dataset.p; var r = PERIODS.filter(function (p) { return p[0] === period; })[0][2](); from = r[0]; to = r[1]; syncUrl(); render(); };
  });
  ['from', 'to'].forEach(function (id) {
    $(id).addEventListener('change', function () { if (id === 'from') from = this.value; else to = this.value; period = from || to ? 'custom' : 'any'; syncUrl(); render(); });
  });
  $('reset').onclick = function () { type = 'all'; period = 'any'; from = to = ''; syncUrl(); render(); };
  render();
})();
