(function () {
  var P = Planora, UI = PlUI, D = P.D, esc = UI.esc, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('dashboard');
  var ui = P.state.ui, T = P.TODAY;
  var TYPES = [['homework', 'Homework'], ['exam', 'Exams'], ['reading', 'Readings'], ['project', 'Projects']];

  // ---------- widget model ----------
  // A layout is an ordered list of { id, type, size, cfg }. Sizes map to spans of a 12-column grid (see .sz-* in theme.css).
  var SIZE_LABEL = { s: ['S', 'Small, a quarter of the row'], m: ['M', 'Medium, a third of the row'], l: ['L', 'Large, half the row'], xl: ['XL', 'Extra large, two thirds of the row'], full: ['Full', 'Full width'] };
  var uid = function () { return 'w' + Math.random().toString(36).slice(2, 9); };
  var W = function (type, size, cfg) { var c = CATALOG[type]; return { id: uid(), type: type, size: size || c.size, cfg: Object.assign({}, c.cfg || {}, cfg || {}) }; };
  var ICON = {
    stat: '<b style="font-family:Fraunces,serif">9</b>', next: '⏭', progress: '◔', alert: '⚠', conflicts: '🔔', deadlines: '☰', attention: '?',
    agenda: '🗓', module: '▤', activity: '↺', fcourse: '⛃', ftype: '⛉'
  };
  var TRASH = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>';
  var GRIP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg>';
  var CATALOG = {
    stat: { name: 'Stat card', desc: 'A single number and label', sizes: ['s', 'm', 'l'], size: 's', cfg: { metric: 'week' } },
    next: { name: 'Next up', desc: 'Your next exam or deadline', sizes: ['s', 'm', 'l'], size: 's', cfg: { kind: 'exam' } },
    progress: { name: 'Weekly progress', desc: 'How much of this week is done', sizes: ['s', 'm', 'l'], size: 's' },
    alert: { name: 'Conflict alert', desc: 'Banner when two deadlines clash', sizes: ['l', 'xl', 'full'], size: 'full' },
    conflicts: { name: 'Scheduling conflicts', desc: 'Clashes that need sorting out', sizes: ['m', 'l', 'xl', 'full'], size: 'l' },
    deadlines: { name: 'Deadlines list', desc: 'Upcoming items, filtered and sorted', sizes: ['m', 'l', 'xl', 'full'], size: 'xl', cfg: { range: 'week', course: 'all', type: 'all', rows: 'all' } },
    attention: { name: 'Needs your attention', desc: 'Items Planora wasn’t sure about', sizes: ['m', 'l', 'xl', 'full'], size: 'xl', cfg: { rows: 'all' } },
    agenda: { name: 'Agenda', desc: 'Classes and events for a day', sizes: ['m', 'l', 'xl'], size: 'm', cfg: { day: 'today' } },
    module: { name: 'Module summary', desc: 'Weight breakdown for one course', sizes: ['m', 'l', 'xl'], size: 'l', cfg: { course: '' } },
    activity: { name: 'Recent activity', desc: 'Timeline of recent changes', sizes: ['m', 'l', 'xl'], size: 'l', cfg: { rows: '5' } },
    fcourse: { name: 'Course filter', desc: 'Filter the lists by course', sizes: ['s', 'm', 'l'], size: 'm' },
    ftype: { name: 'Type filter', desc: 'Filter the lists by type', sizes: ['s', 'm', 'l'], size: 'm' }
  };
  // the original dashboard, kept as the default
  var DEFAULT = function () {
    return [W('alert'), W('stat', 's', { metric: 'week' }), W('stat', 's', { metric: 'upcoming' }), W('stat', 's', { metric: 'check' }), W('stat', 's', { metric: 'conflicts' }),
      W('fcourse'), W('deadlines'), W('ftype'), W('attention')];
  };
  var PRESETS = [
    ['compact', 'Compact', function () { return [W('stat', 's', { metric: 'today' }), W('stat', 's', { metric: 'week' }), W('next'), W('progress'), W('deadlines', 'l', { rows: '5' }), W('conflicts', 'l')]; }],
    ['focused', 'Focused', function () { return [W('alert'), W('agenda', 'm'), W('deadlines', 'xl', { range: 'next14', rows: '8' })]; }],
    ['full', 'Full detail', function () {
      return [W('alert'), W('stat', 's', { metric: 'week' }), W('stat', 's', { metric: 'upcoming' }), W('stat', 's', { metric: 'check' }), W('stat', 's', { metric: 'overdue' }),
        W('next', 'm'), W('progress', 'm'), W('agenda', 'm'), W('fcourse'), W('deadlines'), W('ftype'), W('attention'), W('module', 'l'), W('activity', 'l'), W('conflicts', 'full')];
    }]
  ];
  var METRICS = [['week', 'Due this week'], ['today', 'Due today'], ['upcoming', 'Upcoming (after this week)'], ['check', 'Need a check'], ['conflicts', 'Conflicts'], ['overdue', 'Overdue'], ['done', 'Completed'], ['courses', 'Courses tracked']];
  var RANGES = [['today', 'Due today'], ['week', 'Due this week'], ['next14', 'Next 14 days'], ['month', 'This month'], ['all', 'All upcoming'], ['past', 'Overdue']];
  function fields(w) {
    var courses = P.courses().map(function (c) { return [c, c]; });
    var rows = function (list) { return ['rows', 'Rows shown', list.map(function (n) { return [n, n === 'all' ? 'All' : n]; })]; };
    return {
      stat: [['metric', 'Show', METRICS]],
      next: [['kind', 'Show', [['exam', 'Next exam'], ['any', 'Next deadline']]]],
      deadlines: [['range', 'Time range', RANGES], ['course', 'Course', [['all', 'All courses']].concat(courses)], ['type', 'Type', [['all', 'All types']].concat(TYPES)], rows(['3', '5', '8', 'all'])],
      attention: [rows(['3', '5', 'all'])],
      agenda: [['day', 'Day', [['today', 'Today'], ['tomorrow', 'Tomorrow']]]],
      module: [['course', 'Course', courses]],
      activity: [rows(['3', '5', '8'])]
    }[w.type] || [];
  }
  function saved() { if (!Array.isArray(ui.dashLayout)) ui.dashLayout = DEFAULT(); return ui.dashLayout; }

  var editing = false, draft = null, cfgOpen = null, drag = null, entering = false, cfgIntro = null; // entering: play the edit-mode intro only on the first render
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  var layout = function () { return editing ? draft : saved(); };

  // ---------- data for one render ----------
  function conflictGroups() {
    var g = {}; P.conflicts().forEach(function (e) { var k = e.date + (e.start || ''); (g[k] = g[k] || []).push(e); });
    return Object.keys(g).map(function (k) { return g[k]; });
  }
  function context() {
    var all = P.deadlines(), open = all.filter(function (e) { return !e.done; }), d = function (e) { return D.diff(e.date, T); };
    var on = function (t) { return layout().some(function (w) { return w.type === t; }); };
    // dashboard filters only apply while their filter widget is on the dashboard
    var useC = on('fcourse'), useT = on('ftype');
    return {
      all: all, open: open, d: d, groups: conflictGroups(),
      week: open.filter(function (e) { return d(e) >= 0 && d(e) <= 7; }),
      check: open.filter(function (e) { return e.status === 'check'; }),
      pass: function (e) { return (!useC || ui.dashCourses[e.course] !== false) && (!useT || ui.dashTypes[P.groupOf(e)] !== false); }
    };
  }
  var byTime = function (a, b) { return (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')); };
  var limit = function (list, rows) { return rows === 'all' ? list : list.slice(0, +rows); };
  var card = function (title, body, extra, foot) {
    return '<div class="widget"><div class="widget-head"><h3>' + title + '</h3>' + (extra || '') + '</div>' + body + (foot ? '<div class="w-foot">' + foot + '</div>' : '') + '</div>';
  };
  var emptyLine = function (t) { return '<div class="px-3 pb-3 muted">' + t + '</div>'; };
  var more = function (n, href) { return n > 0 ? '<a href="' + href + '">+ ' + n + ' more · View all →</a>' : ''; };

  // ---------- widget renderers (return '' to render nothing in view mode) ----------
  var R = {
    stat: function (w, c) {
      var m = w.cfg.metric, n = {
        week: c.week.length, today: c.open.filter(function (e) { return c.d(e) === 0; }).length, upcoming: c.open.filter(function (e) { return c.d(e) > 7; }).length,
        check: c.check.length, conflicts: c.groups.length, overdue: c.open.filter(function (e) { return c.d(e) < 0; }).length,
        done: c.all.filter(function (e) { return e.done; }).length, courses: P.courses().length
      }[m];
      var label = m === 'conflicts' ? (n === 1 ? 'Conflict' : 'Conflicts') : (METRICS.filter(function (x) { return x[0] === m; })[0] || ['', ''])[1].replace(' (after this week)', '');
      return '<div class="stat"><div class="num">' + n + '</div><div class="label">' + label + '</div></div>';
    },
    next: function (w, c) {
      var e = c.open.filter(function (x) { return c.d(x) >= 0 && (w.cfg.kind !== 'exam' || P.groupOf(x) === 'exam'); }).sort(byTime)[0];
      var k = w.cfg.kind === 'exam' ? 'Next exam' : 'Next deadline';
      if (!e) return '<div class="stat nx"><div class="nx-k">' + k + '</div><div class="nx-t">Nothing coming up</div></div>';
      var n = c.d(e), when = n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days';
      return '<a class="stat nx" href="' + UI.eventHref(e) + '"><div class="nx-k">' + k + '<span class="nx-d">' + when + '</span></div><div class="nx-t">' + esc(e.title) + '</div>' +
        '<div class="nx-s">' + esc(e.course) + ' · ' + D.short(e.date) + (e.weight ? ' · ' + e.weight + '%' : '') + '</div></a>';
    },
    progress: function (w, c) {
      var wk = c.all.filter(function (e) { return c.d(e) >= 0 && c.d(e) <= 7; }), done = wk.filter(function (e) { return e.done; }).length, pct = wk.length ? Math.round(done / wk.length * 100) : 0;
      return '<div class="stat pg"><div class="nx-k">This week</div><div class="pg-num"><b>' + done + '</b> of ' + wk.length + ' done</div>' +
        '<div class="pg-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="This week done"><span style="width:' + pct + '%"></span></div></div>';
    },
    alert: function (w, c) {
      var g = c.groups[0];
      if (!g || P.state.conflictAck) return editing ? '<div class="alert-ghost">⚠ Conflict alert: shows here when two deadlines clash</div>' : '';
      return '<a class="alert-banner" href="conflict.html"><span aria-hidden="true">⚠</span><div><b>Scheduling conflict —</b> ' + esc(g[0].course + ' ' + g[0].title) + (g[1] ? ' and ' + esc(g[1].course + ' ' + g[1].title) : '') + ' are both due ' + D.short(g[0].date) + ' at the same time.</div><span class="go">Resolve</span></a>';
    },
    conflicts: function (w, c) {
      var BELL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>';
      var body = c.groups.map(function (g) {
        var a = g[0], b = g[1] || {};
        return '<div class="cfw"><span class="cfw-ic">' + BELL + '</span><div class="flex-fill"><b>' + esc(a.title) + ' overlaps with ' + esc(b.title || 'another item') + '</b>' +
          '<small>' + D.long(a.date) + (a.start ? ', ' + D.time12(a.start) : '') + ' · ' + esc(a.course) + (b.course ? ' & ' + esc(b.course) : '') + '</small>' +
          '<div class="d-flex gap-2 mt-2"><a class="btn btn-secondary btn-sm" href="calendar.html?date=' + a.date + '">View</a><a class="btn btn-primary btn-sm" href="conflict.html">Resolve</a></div></div></div>';
      }).join('');
      return card('Scheduling conflicts', body || emptyLine('No clashes. You’re all clear.'));
    },
    deadlines: function (w, c) {
      var r = w.cfg.range, f = {
        today: function (e) { return c.d(e) === 0; }, week: function (e) { return c.d(e) >= 0 && c.d(e) <= 7; }, next14: function (e) { return c.d(e) >= 0 && c.d(e) <= 14; },
        month: function (e) { return c.d(e) >= 0 && e.date.slice(0, 7) === T.slice(0, 7); }, all: function (e) { return c.d(e) >= 0; }, past: function (e) { return c.d(e) < 0; }
      }[r] || function () { return true; };
      var list = c.open.filter(function (e) { return f(e) && c.pass(e) && (w.cfg.course === 'all' || e.course === w.cfg.course) && (w.cfg.type === 'all' || P.groupOf(e) === w.cfg.type); }).sort(byTime);
      var shown = limit(list, w.cfg.rows), title = (RANGES.filter(function (x) { return x[0] === r; })[0] || ['', 'Deadlines'])[1];
      var tag = [w.cfg.course !== 'all' ? w.cfg.course : '', w.cfg.type !== 'all' ? (TYPES.filter(function (t) { return t[0] === w.cfg.type; })[0] || ['', ''])[1] : ''].filter(Boolean).join(' · ');
      return card(title + (tag ? ' <span class="w-tag">' + esc(tag) + '</span>' : ''),
        shown.map(function (e) { return UI.row(e, { href: UI.eventHref(e) }); }).join('') || emptyLine('Nothing scheduled for these filters.'),
        '<a class="small fw-semibold" href="tasks.html">View all</a>', more(list.length - shown.length, 'tasks.html'));
    },
    attention: function (w, c) {
      var list = c.check.filter(c.pass).sort(byTime), shown = limit(list, w.cfg.rows);
      var rows = shown.map(function (e) {
        return '<div class="irow"><div class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</div><div class="irow-body"><div class="irow-title">' + esc(e.title) + '</div><div class="irow-sub"><span class="chip">' + e.course + '</span>' + (e.note && /unclear|TBD/.test(e.note) ? (/TBD/.test(e.note) ? 'Listed as "TBD%"' : 'Due date unclear') : esc(P.whenOf(e))) + '</div></div><a class="pbadge warn" href="edit.html?id=' + encodeURIComponent(e.id) + '&from=dashboard">Check this</a></div>';
      }).join('');
      return card('Needs your attention', rows || emptyLine('Nothing needs a check. Nice.'), '', more(list.length - shown.length, 'tasks.html'));
    },
    agenda: function (w) {
      var day = w.cfg.day === 'tomorrow' ? D.add(T, 1) : T;
      var list = P.all().filter(function (e) { return e.date === day; }).sort(function (a, b) { return (a.allDay ? '' : a.start || '').localeCompare(b.allDay ? '' : b.start || ''); });
      var rows = list.map(function (e) {
        var due = !e.allDay && e.start && e.cat !== 'timetable' && !e.dur, time = e.allDay || !e.start ? 'All day' : D.time12(e.start);
        return '<div class="ag-row"><span class="ag-time">' + time + '</span><span class="ag-bar" style="background:var(--c-' + e.cat + ')"></span><div class="min-w-0"><div class="ag-t' + (e.done ? ' done' : '') + '">' + esc(e.title) + '</div><div class="ag-s">' + (due ? 'Due · ' : '') + esc(e.course) + ' · ' + esc(e.type) + '</div></div></div>';
      }).join('');
      return card((w.cfg.day === 'tomorrow' ? 'Tomorrow' : 'Today') + ' <span class="w-tag">' + D.long(day).replace(/ \d{4}$/, '') + '</span>',
        rows || emptyLine('Nothing planned. Enjoy the free time.'), '<a class="small fw-semibold" href="calendar.html?date=' + day + '">Calendar</a>');
    },
    module: function (w, c) {
      var cs = P.courses(), course = cs.indexOf(w.cfg.course) >= 0 ? w.cfg.course : cs[0];
      if (!course) return card('Module summary', emptyLine('Add a course to see its breakdown.'));
      var items = c.all.filter(function (e) { return e.course === course; }).sort(byTime), total = items.reduce(function (s, e) { return s + (e.weight || 0); }, 0);
      return card('Module summary <span class="w-tag">' + esc(course) + '</span>',
        (P.COURSE_NAMES[course] ? '<div class="ms-name">' + esc(P.COURSE_NAMES[course]) + '</div>' : '') +
        items.map(function (e) { return '<div class="ms-row"><span' + (e.done ? ' class="done"' : '') + '>' + esc(e.title) + '</span><span>' + (e.weight ? e.weight + '%' : '—') + '</span></div>'; }).join('') +
        '<div class="ms-row ms-total"><span>Total</span><span>' + total + '%</span></div>');
    },
    activity: function (w) {
      var IC = { ok: '✓', up: '↑', add: '+', del: '×', edit: '✎', cal: '▦' };
      var ago = function (a) { if (!a.at) return a.ago || ''; var m = Math.round((Date.now() - a.at) / 60000); return m < 1 ? 'Just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; };
      var rows = P.activity().slice(0, +w.cfg.rows).map(function (a) {
        return '<div class="act-row"><span class="act-ic ' + (a.icon || 'edit') + '" aria-hidden="true">' + (IC[a.icon] || '✎') + '</span><div><div class="act-t">' + esc(a.t) + '</div><div class="act-w">' + ago(a) + '</div></div></div>';
      }).join('');
      return card('Recent activity', rows || emptyLine('Changes you make will show up here.'));
    },
    fcourse: function (w, c) {
      var courses = P.courses(), active = courses.filter(function (x) { return ui.dashCourses[x] !== false; });
      var items = courses.map(function (x) {
        var n = c.open.filter(function (e) { return e.course === x; }).length;
        return '<label class="filter-item"><input class="form-check-input mt-0" type="checkbox" data-c="' + x + '"' + (ui.dashCourses[x] !== false ? ' checked' : '') + '> ' + x + (P.COURSE_NAMES[x] ? ' — ' + P.COURSE_NAMES[x] : '') + '<span class="count">' + n + '</span></label>';
      }).join('');
      return card('Filter by course', '<div class="d-flex justify-content-between px-3 pb-2 small muted"><span>' + active.length + ' course' + (active.length === 1 ? '' : 's') + ' active</span><button type="button" class="btn-link-ink small" data-act="clearF">Clear</button></div>' + items + '<div class="pb-2"></div>');
    },
    ftype: function (w, c) {
      return card('Filter by type', TYPES.map(function (t) {
        var n = c.open.filter(function (e) { return P.groupOf(e) === t[0]; }).length;
        return '<label class="filter-item"><input class="form-check-input mt-0" type="checkbox" data-t="' + t[0] + '"' + (ui.dashTypes[t[0]] !== false ? ' checked' : '') + '> ' + t[1] + '<span class="count">' + n + '</span></label>';
      }).join('') + '<div class="pb-2"></div>');
    }
  };

  // ---------- page ----------
  function head(c) {
    var hr = new Date().getHours(), greet = (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening') + ', ' + P.firstName();
    return '<div class="head-row"><div><h1>' + esc(greet) + '</h1><p>You have ' + c.week.length + (c.week.length === 1 ? ' thing' : ' things') + ' due this week.</p></div>' +
      '<div class="d-flex gap-2 flex-wrap"><button type="button" class="btn btn-secondary" data-act="customize">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>Customize</button>' +
      '<a class="btn btn-primary" href="upload.html">+ Upload a syllabus</a></div></div>';
  }
  function firstRun() {
    $('view').innerHTML = '<div class="head-row"><div><h1>' + esc('Welcome to Planora, ' + P.firstName()) + '</h1><p>Nothing here yet. Add your first course to get started.</p></div><a class="btn btn-primary" href="upload.html">+ Upload a syllabus</a></div>' +
      '<div class="first-run"><h2>Start with one syllabus</h2><p class="muted">Planora reads it, finds every deadline, and fills this page for you.</p>' +
      '<div class="fr-steps"><div class="fr-step"><span class="fr-n">1</span><div><b>Upload</b><span class="s">PDF, Word doc or a photo</span></div></div>' +
      '<div class="fr-step"><span class="fr-n">2</span><div><b>Review</b><span class="s">Confirm what Planora found</span></div></div>' +
      '<div class="fr-step"><span class="fr-n">3</span><div><b>Plan</b><span class="s">See it on your calendar</span></div></div></div>' +
      '<a class="btn btn-primary" href="upload.html">Upload a syllabus</a></div>';
  }
  function viewWidget(w, c) {
    var html = R[w.type] ? R[w.type](w, c) : '';
    return html ? '<div class="dw dw-' + w.type + ' sz-' + w.size + '" data-id="' + w.id + '">' + html + '</div>' : '';
  }
  function editWidget(w, c, i, n) {
    var cat = CATALOG[w.type], fs = fields(w), open = cfgOpen === w.id;
    var cfg = open ? '<div class="dw-cfg' + (cfgIntro === w.id ? ' enter' : '') + '">' + fs.map(function (f) {
      return '<label class="dw-f"><span>' + f[1] + '</span><select class="form-select form-select-sm" data-cfg="' + f[0] + '">' +
        f[2].map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(w.cfg[f[0]]) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    }).join('') + '</div>' : '';
    return '<div class="dw is-edit dw-' + w.type + ' sz-' + w.size + (open ? ' cfg-open' : '') + '" data-id="' + w.id + '" draggable="true" role="group" aria-label="' + cat.name + ' widget">' +
      '<div class="dw-bar"><button type="button" class="dw-x" data-act="remove" aria-label="Remove ' + cat.name + '" title="Remove (or drag it back to the left panel)">' + TRASH + '</button><span class="dw-name">' + cat.name + '</span>' +
      (fs.length ? '<button type="button" class="dw-gear" data-act="cfg" aria-expanded="' + open + '" aria-label="Configure ' + cat.name + '" title="Configure"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/></svg></button>' : '') +
      '<span class="dw-grip" title="Drag to reorder" aria-hidden="true">' + GRIP + '</span></div>' + cfg +
      '<div class="dw-preview" aria-hidden="true">' + (R[w.type](w, c) || '') + '</div>' +
      '<div class="dw-foot"><div class="dw-sizes" role="group" aria-label="Size">' + cat.sizes.map(function (s) {
        return '<button type="button" class="' + (w.size === s ? 'on' : '') + '" data-act="size" data-size="' + s + '" aria-pressed="' + (w.size === s) + '" title="' + SIZE_LABEL[s][1] + '">' + SIZE_LABEL[s][0] + '</button>';
      }).join('') + '</div><div class="dw-move"><button type="button" data-act="move" data-dir="-1" title="Move earlier" aria-label="Move ' + cat.name + ' earlier"' + (i === 0 ? ' disabled' : '') + '>‹</button>' +
      '<button type="button" data-act="move" data-dir="1" title="Move later" aria-label="Move ' + cat.name + ' later"' + (i === n - 1 ? ' disabled' : '') + '>›</button></div></div></div>';
  }
  function render() {
    // rebuilding empties #view for a moment; hold its height and the scroll position so the page doesn't jump to the top
    var view = $('view'), y = window.scrollY; view.style.minHeight = view.offsetHeight + 'px';
    build();
    view.style.minHeight = ''; if (window.scrollY !== y) window.scrollTo({ top: y, behavior: 'instant' }); // instant: Bootstrap makes scrolling smooth by default
  }
  function build() {
    if (!P.deadlines().length && !editing) { firstRun(); return; }
    var c = context(), L = layout(), pal = document.querySelector('.dash-palette'), palTop = pal ? pal.scrollTop : 0, intro = entering ? ' enter' : '';
    entering = false;
    if (!editing) {
      $('view').innerHTML = head(c) + '<div class="dash-grid" id="grid">' + L.map(function (w) { return viewWidget(w, c); }).join('') + '</div>';
    } else {
      $('view').innerHTML =
        '<div class="dash-editbar' + intro + '"><div><h2>Customizing dashboard</h2><p>Drag widgets to rearrange them, pick a size, or add new ones from the left.</p></div>' +
        '<div class="d-flex align-items-center gap-2 flex-wrap"><button type="button" class="btn-link-ink" data-act="reset">↺ Reset to default</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-act="cancel">Cancel</button><button type="button" class="btn btn-primary btn-sm" data-act="save">Save layout</button></div></div>' +
        '<div class="dash-edit"><aside class="dash-palette' + intro + '" aria-label="Add widgets"><div class="pal-trash" aria-hidden="true">' + TRASH + '<b>Drop here to remove</b></div><div class="pal-h">Layout presets</div><div class="pal-presets">' +
        PRESETS.map(function (p) { return '<button type="button" class="fchip" data-act="preset" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
        '<div class="pal-h mt-3">Add widgets</div><p class="pal-tip">Drag onto the dashboard, or click to add at the end.</p>' +
        Object.keys(CATALOG).map(function (t) {
          return '<button type="button" class="pal-item" draggable="true" data-act="add" data-type="' + t + '"><span class="pal-ic">' + ICON[t] + '</span><span><b>' + CATALOG[t].name + '</b><small>' + CATALOG[t].desc + '</small></span></button>';
        }).join('') + '</aside>' +
        '<div class="dash-grid editing" id="grid">' + L.map(function (w, i) { return editWidget(w, c, i, L.length); }).join('') +
        '<div class="dw-drop sz-full" data-drop="end">Drop widget here</div></div></div>';
    }
    cfgIntro = null;
    if (editing && document.querySelector('.dash-palette')) document.querySelector('.dash-palette').scrollTop = palTop;
    pack(); observe();
  }

  // ---------- masonry packing ----------
  // Widgets sit on 8px grid rows; each one spans as many rows as its height needs, so short cards don't leave gaps.
  var ROW = 8, GAP = 20;
  function pack() {
    var g = $('grid'); if (!g) return;
    Array.prototype.forEach.call(g.children, function (el) { el.style.gridRowEnd = 'span ' + Math.max(1, Math.ceil((el.getBoundingClientRect().height + GAP) / ROW)); });
  }
  var ro = window.ResizeObserver ? new ResizeObserver(function () { pack(); }) : null;
  function observe() { if (!ro || !$('grid')) return; ro.disconnect(); Array.prototype.forEach.call($('grid').children, function (el) { ro.observe(el); }); }
  if (!ro) window.addEventListener('resize', pack);

  // ---------- edit actions ----------
  var find = function (id) { for (var i = 0; i < draft.length; i++) if (draft[i].id === id) return i; return -1; };
  function insertAt(w, idx) { draft.splice(idx < 0 ? draft.length : idx, 0, w); }
  // FLIP: remember where every widget was, re-render, then animate each one from its old box to its new one
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function snapshot() { var m = {}; document.querySelectorAll('#grid > .dw[data-id]').forEach(function (el) { m[el.dataset.id] = el.getBoundingClientRect(); }); return m; }
  function flip(before, focusId) {
    if (calm || !before) return;
    document.querySelectorAll('#grid > .dw[data-id]').forEach(function (el) {
      var a = before[el.dataset.id], b = el.getBoundingClientRect(); if (!a || !el.animate) return;
      var dx = a.left - b.left, dy = a.top - b.top, sx = a.width / b.width, sy = a.height / b.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < .01 && Math.abs(sy - 1) < .01) return;
      el.animate([{ transformOrigin: 'top left', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }, { transformOrigin: 'top left', transform: 'none' }],
        { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
    var f = focusId && document.querySelector('.dw[data-id="' + focusId + '"]');
    if (f) { f.classList.add('just-moved'); setTimeout(function () { f.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' }); }, 200); }
  }
  function flash(id) { var el = document.querySelector('.dw[data-id="' + id + '"]'); if (el) { el.classList.add('just-added'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
  var acts = {
    customize: function () { editing = true; entering = true; draft = clone(saved()); cfgOpen = null; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    cancel: function () { editing = false; draft = null; render(); },
    save: function () { ui.dashLayout = draft; editing = false; draft = null; P.save(); render(); UI.toast('Dashboard layout saved'); },
    reset: function () { draft = DEFAULT(); cfgOpen = null; render(); UI.toast('Default layout restored. Save to keep it.'); },
    preset: function (t) { var p = PRESETS.filter(function (x) { return x[0] === t.dataset.p; })[0]; draft = p[2](); cfgOpen = null; render(); UI.toast(p[1] + ' preset applied. Save to keep it.'); },
    add: function (t) { var w = W(t.dataset.type); insertAt(w, -1); render(); flash(w.id); },
    remove: function (t, w) { draft.splice(find(w.id), 1); render(); },
    cfg: function (t, w) { cfgOpen = cfgOpen === w.id ? null : w.id; cfgIntro = cfgOpen; render(); },
    size: function (t, w) { w.size = t.dataset.size; render(); },
    move: function (t, w) { var i = find(w.id), j = i + +t.dataset.dir; if (j < 0 || j >= draft.length) return; draft.splice(j, 0, draft.splice(i, 1)[0]); render(); var b = document.querySelector('.dw[data-id="' + w.id + '"] [data-dir="' + t.dataset.dir + '"]'); if (b && !b.disabled) b.focus(); },
    clearF: function () { ui.dashCourses = {}; ui.dashTypes = {}; P.save(); render(); }
  };
  $('view').addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]'); if (!t || !acts[t.dataset.act]) return;
    var host = t.closest('.dw[data-id]'), w = host && editing ? draft[find(host.dataset.id)] : null;
    // layout-changing actions animate from the old arrangement; moved/resized widgets get a highlight
    var a = t.dataset.act, before = editing && /^(size|move|remove|add|cfg)$/.test(a) ? snapshot() : null;
    acts[a](t, w);
    flip(before, w && (a === 'move' || a === 'size') ? w.id : null);
  });
  $('view').addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.dataset.cfg && editing) { var w = draft[find(t.closest('.dw').dataset.id)]; w.cfg[t.dataset.cfg] = t.value; render(); var s = document.querySelector('.dw[data-id="' + w.id + '"] [data-cfg="' + t.dataset.cfg + '"]'); if (s) s.focus(); }
    else if (t.dataset.c || t.dataset.t) {
      var key = t.dataset.c ? 'c' : 't';
      (key === 'c' ? ui.dashCourses : ui.dashTypes)[t.dataset[key]] = t.checked; P.save(); render();
      var again = document.querySelector('[data-' + key + '="' + t.dataset[key] + '"]'); if (again) again.focus({ preventScroll: true }); // keep keyboard focus on the same checkbox
    }
  });

  // ---------- drag and drop (edit mode) ----------
  function clearMarks() { document.querySelectorAll('.drop-before,.drop-after,.over,.remove-over').forEach(function (el) { el.classList.remove('drop-before', 'drop-after', 'over', 'remove-over'); }); }
  // where a drop would land: before/after the widget under the pointer, or at the end
  function target(ev) {
    var el = ev.target.closest('.dw[data-id], .dw-drop'); if (!el || !el.closest('#grid')) return { end: true, el: document.querySelector('.dw-drop') };
    if (el.classList.contains('dw-drop')) return { end: true, el: el };
    var r = el.getBoundingClientRect(), after = (ev.clientX - r.left) > r.width / 2;
    return { el: el, id: el.dataset.id, after: after };
  }
  $('view').addEventListener('dragstart', function (ev) {
    if (!editing) return;
    var pal = ev.target.closest('.pal-item'), wEl = ev.target.closest('.dw[data-id]');
    if (ev.target.closest('select, input')) { ev.preventDefault(); return; }
    if (pal) drag = { add: pal.dataset.type };
    else if (wEl) {
      drag = { id: wEl.dataset.id }; wEl.classList.add('dragging');
      // arm the palette as a remove target, sized to its visible area
      var pal2 = document.querySelector('.dash-palette'), tr = pal2 && pal2.querySelector('.pal-trash');
      if (tr) { tr.style.top = pal2.scrollTop + 'px'; tr.style.height = pal2.clientHeight + 'px'; pal2.classList.add('can-remove'); }
    }
    else return;
    ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', drag.add || drag.id);
  });
  $('view').addEventListener('dragover', function (ev) {
    var pal = ev.target.closest('.dash-palette');
    if (drag && drag.id && pal) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; clearMarks(); pal.classList.add('remove-over'); return; }
    if (!drag || !ev.target.closest('#grid')) return;
    ev.preventDefault(); ev.dataTransfer.dropEffect = 'move';
    var t = target(ev); clearMarks();
    if (t.end) { if (t.el) t.el.classList.add('over'); } else if (t.id !== drag.id) t.el.classList.add(t.after ? 'drop-after' : 'drop-before');
  });
  $('view').addEventListener('dragleave', function (ev) {
    var to = ev.relatedTarget;
    if (!to || !(to.closest('#grid') || to.closest('.dash-palette'))) clearMarks();
    else if (!to.closest('.dash-palette')) { var p = document.querySelector('.remove-over'); if (p) p.classList.remove('remove-over'); }
  });
  $('view').addEventListener('drop', function (ev) {
    // dropped back on the palette: remove the widget
    if (drag && drag.id && ev.target.closest('.dash-palette')) {
      ev.preventDefault(); var i = find(drag.id), name = CATALOG[draft[i].type].name;
      var b0 = snapshot(); draft.splice(i, 1); drag = null; render(); flip(b0); UI.toast(name + ' removed'); return;
    }
    if (!drag || !ev.target.closest('#grid')) return;
    ev.preventDefault();
    var t = target(ev), w;
    if (drag.add) w = W(drag.add);
    else { if (t.id === drag.id) { drag = null; render(); return; } w = draft.splice(find(drag.id), 1)[0]; }
    insertAt(w, t.end ? -1 : find(t.id) + (t.after ? 1 : 0));
    var added = !!drag.add, b1 = snapshot(); drag = null; render(); flip(b1, added ? null : w.id); if (added) flash(w.id);
  });
  $('view').addEventListener('dragend', function () {
    drag = null; clearMarks();
    document.querySelectorAll('.dragging').forEach(function (el) { el.classList.remove('dragging'); });
    document.querySelectorAll('.can-remove').forEach(function (el) { el.classList.remove('can-remove'); });
  });

  render();
})();
