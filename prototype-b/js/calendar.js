(function () {
  var P = Planora, UI = PlUI, D = P.D, esc = UI.esc, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('calendar');
  var HH = 48;
  var PROGRESS = [['not_started', 'Not Started'], ['in_progress', 'In Progress'], ['completed', 'Completed']];
  var st = { view: 'month', cursor: P.TODAY, selected: null, panel: 'none', detailId: null, confirmDel: false, from: 'list' };
  var scrollTop = 9 * HH, lastView = '';

  // deep links: ?date=YYYY-MM-DD  /  ?event=ID
  (function () {
    var d = UI.qs('date'), id = UI.qs('event');
    if (id && P.get(id)) { var e = P.get(id); st.cursor = e.date; st.selected = e.date; st.panel = 'detail'; st.detailId = id; st.from = 'direct'; }
    else if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) { st.cursor = d; st.selected = d; st.panel = 'list'; }
  })();

  var filters = function () { return P.state.ui.calFilters; };
  function eventsOn(date) {
    return P.all().filter(function (e) { return e.date === date && filters()[e.cat]; }).sort(function (a, b) {
      var ta = a.cat === 'timetable' ? 1 : 0, tb = b.cat === 'timetable' ? 1 : 0;
      return ta - tb || (a.start || '').localeCompare(b.start || '');
    });
  }
  function weekStart() { return D.mondayOf(st.cursor); }
  function monthOf(s) { return s.slice(0, 7); }

  // ---------- sidebar ----------
  function side() {
    var cur = D.parse(st.cursor), first = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-01';
    var start = D.mondayOf(first), cells = '';
    var dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    var rows = Math.ceil(((D.parse(first).getDay() + 6) % 7 + dim) / 7);
    for (var i = 0; i < rows * 7; i++) {
      var d = D.add(start, i), inM = monthOf(d) === monthOf(first);
      cells += '<button type="button" class="mini-day' + (inM ? '' : ' muted') + (d === P.TODAY ? ' today' : '') + (d === st.selected ? ' selected' : '') + '" data-act="pick" data-date="' + d + '" aria-label="' + D.long(d) + '">' + D.parse(d).getDate() + '</button>';
    }
    var f = filters();
    $('side').innerHTML =
      '<div class="dropdown"><button class="btn btn-primary w-100 dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" id="createBtn">+ Create</button>' +
      '<ul class="dropdown-menu w-100 shadow-sm"><li><button class="dropdown-item py-2" type="button" data-act="add" data-cat="assignments">Event</button></li>' +
      '<li><button class="dropdown-item py-2" type="button" data-act="add" data-cat="exams">Exam</button></li><li><hr class="dropdown-divider"></li>' +
      '<li><a class="dropdown-item py-2" href="upload.html?mode=schedule">Import course schedule</a></li></ul></div>' +
      '<div class="side-box"><div class="mini-head"><span>' + P.MONTHS[cur.getMonth()] + ' ' + cur.getFullYear() + '</span><span class="mini-nav"><button type="button" data-act="mini" data-n="-1" aria-label="Previous month">‹</button><button type="button" data-act="mini" data-n="1" aria-label="Next month">›</button></span></div>' +
      '<div class="mini-grid">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x) { return '<div class="mini-dow">' + x + '</div>'; }).join('') + cells + '</div></div>' +
      '<div class="side-box"><div class="side-label mt-0">Show on calendar</div>' + P.CATS.map(function (c) {
        return '<button type="button" class="cal-filter cat-' + c.k + (f[c.k] ? ' on' : '') + '" data-act="filter" data-k="' + c.k + '" aria-pressed="' + !!f[c.k] + '"><span class="box">' + (f[c.k] ? '✓' : '') + '</span><span>' + c.label + '</span></button>'; }).join('') +
      '<div class="side-label">View</div>' + [['month', 'Month'], ['week', 'Week'], ['day', 'Day']].map(function (v) {
        return '<button type="button" class="cal-radio' + (st.view === v[0] ? ' on' : '') + '" data-act="view" data-v="' + v[0] + '" role="radio" aria-checked="' + (st.view === v[0]) + '"><span class="dot"></span><span>' + v[1] + '</span></button>'; }).join('') + '</div>';
  }

  // ---------- main ----------
  function title() {
    var c = D.parse(st.cursor);
    if (st.view === 'month') return P.MONTHS[c.getMonth()] + ' ' + c.getFullYear();
    if (st.view === 'day') return D.long(st.cursor);
    var a = D.parse(weekStart()), b = D.parse(D.add(weekStart(), 6));
    return a.getMonth() === b.getMonth() ? P.MON3[a.getMonth()] + ' ' + a.getDate() + ' – ' + b.getDate() : P.MON3[a.getMonth()] + ' ' + a.getDate() + ' – ' + P.MON3[b.getMonth()] + ' ' + b.getDate();
  }
  function conflictIn(list) { return list.some(function (e) { return e.conflict; }); }
  function month() {
    var cur = D.parse(st.cursor), first = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-01';
    var dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    var rows = Math.ceil(((D.parse(first).getDay() + 6) % 7 + dim) / 7), start = D.mondayOf(first), h = '';
    for (var i = 0; i < rows * 7; i++) {
      var d = D.add(start, i), inM = monthOf(d) === monthOf(first);
      if (!inM) { h += '<div class="cell muted" aria-hidden="true"><div class="num">' + D.parse(d).getDate() + '</div></div>'; continue; }
      var evs = eventsOn(d), shown = evs.slice(0, 3);
      h += '<div class="cell' + (conflictIn(evs) ? ' conflict-day' : '') + (d === st.selected ? ' sel' : '') + (d === P.TODAY ? ' today' : '') + '" role="button" tabindex="0" data-act="pick" data-date="' + d + '" aria-label="' + D.long(d) + (evs.length ? ', ' + evs.length + ' items' : '') + '">' +
        '<div class="num">' + D.parse(d).getDate() + '</div>' +
        (conflictIn(evs) ? '<a class="alert-dot" href="conflict.html" aria-label="Conflict: resolve" data-stop="1">!</a>' : '') +
        shown.map(function (e) { return '<div class="ev"><span class="d ' + e.cat + '"></span><span class="t' + (P.progressOf(e) === 'completed' ? ' done' : '') + '">' + esc(e.title) + '</span>' + (e.weight ? '<span class="w">' + e.weight + '%</span>' : '') + '</div>'; }).join('') +
        (evs.length > 3 ? '<div class="more">+' + (evs.length - 3) + ' more</div>' : '') + '</div>';
    }
    return '<div class="dow-row">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (x) { return '<div class="dow">' + x + '</div>'; }).join('') + '</div><div class="grid7">' + h + '</div>';
  }
  function layoutDay(evs) {
    var items = evs.filter(function (e) { return !e.allDay && e.start; }).map(function (e) {
      var s = D.mins(e.start), len = e.dur ? e.dur * 60 : 30; return { e: e, s: s, t: s + Math.max(len, 30), lane: 0, lanes: 1 };
    }).sort(function (a, b) { return a.s - b.s || b.t - a.t; });
    var cluster = [], end = -1;
    function flush() { var n = 0; cluster.forEach(function (c) { n = Math.max(n, c.lane + 1); }); cluster.forEach(function (c) { c.lanes = n; }); cluster = []; }
    var laneEnd = [];
    items.forEach(function (it) {
      if (it.s >= end && cluster.length) { flush(); laneEnd = []; }
      var l = 0; while (laneEnd[l] > it.s) l++; laneEnd[l] = it.t; it.lane = l; cluster.push(it); end = Math.max(end, it.t);
    });
    if (cluster.length) flush();
    return items;
  }
  function timeGrid() {
    var days = st.view === 'day' ? [st.cursor] : [0, 1, 2, 3, 4, 5, 6].map(function (i) { return D.add(weekStart(), i); });
    var head = days.map(function (d) {
      return '<button type="button" class="cellh" data-act="pick" data-date="' + d + '" aria-label="' + D.long(d) + '"><span class="n">' + P.DOW3[D.parse(d).getDay()] + '</span><br><span class="dn' + (d === P.TODAY ? ' today' : '') + (d === st.selected ? ' sel' : '') + '">' + D.parse(d).getDate() + '</span></button>'; }).join('');
    var allday = days.map(function (d) {
      return '<div class="adc">' + eventsOn(d).filter(function (e) { return e.allDay || !e.start; }).map(function (e) { return '<button type="button" class="tg-chip w-' + e.cat + '" data-act="open" data-id="' + e.id + '">' + esc(e.title) + '</button>'; }).join('') + '</div>'; }).join('');
    var hours = ''; for (var h = 0; h < 24; h++) hours += '<div class="hr">' + String(h).padStart(2, '0') + ':00</div>';
    var cols = days.map(function (d) {
      var cards = layoutDay(eventsOn(d)).map(function (it) {
        var e = it.e, top = Math.min(it.s / 60 * HH + 2, 24 * HH - 30), ht = e.dur ? Math.max(e.dur * HH - 3, 26) : 26;
        var wPct = 100 / it.lanes, left = it.lane * wPct;
        var time = e.dur ? D.hhmm(it.s) + '–' + D.hhmm(it.s + e.dur * 60) : 'Due ' + e.start;
        return '<button type="button" class="tg-card w-' + e.cat + '" data-act="open" data-id="' + e.id + '" style="top:' + top + 'px;height:' + ht + 'px;left:calc(' + left + '% + 2px);width:calc(' + wPct + '% - 4px)">' +
          '<span class="t' + (P.progressOf(e) === 'completed' ? ' done' : '') + '">' + esc(e.title) + '</span><span class="s">' + time + (e.weight ? ' · ' + e.weight + '%' : '') + '</span></button>';
      }).join('');
      return '<div class="tg-col' + (d === P.TODAY ? ' today' : '') + '" data-date="' + d + '">' + cards + '</div>'; }).join('');
    return '<div class="tg ' + (st.view === 'day' ? 'n1' : 'n7') + '"><div class="tg-head trow"><div></div>' + head + '</div>' +
      '<div class="tg-allday trow"><div class="gut">All day</div>' + allday + '</div>' +
      '<div class="tg-body" id="tgBody"><div class="trow tg-inner"><div class="gut">' + hours + '</div>' + cols + '</div></div></div>';
  }
  function main() {
    var prev = $('tgBody'); if (prev && lastView === st.view) scrollTop = prev.scrollTop;
    if (lastView !== st.view) scrollTop = 9 * HH;
    $('main').innerHTML = '<div class="cal-main"><div class="toolbar"><div class="tb-left"><h1 class="cal-title">' + esc(title()) + '</h1>' +
      '<button type="button" class="arrow" data-act="nav" data-n="-1" aria-label="Previous">‹</button><button type="button" class="arrow" data-act="nav" data-n="1" aria-label="Next">›</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-act="today">Today</button></div>' +
      '<div class="seg seg-slide" role="group" aria-label="View"><span class="seg-ind" aria-hidden="true"></span>' + [['month', 'Month'], ['week', 'Week'], ['day', 'Day']].map(function (v) {
        return '<button type="button" class="' + (st.view === v[0] ? 'on' : '') + '" data-act="view" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="cal-body">' + (st.view === 'month' ? month() : timeGrid()) + '</div></div>';
    var tb = $('tgBody'); if (tb) { tb.scrollTop = scrollTop; tb.addEventListener('scroll', function () { scrollTop = tb.scrollTop; }); }
    lastView = st.view;
  }

  // ---------- panel ----------
  function panel() {
    var el = $('panel'), show = st.panel !== 'none' && st.selected;
    // keep the old content while closed so the panel can slide out with it
    el.inert = !show; $('layout').classList.toggle('with-panel', !!show);
    if (!show) return;
    var h = '<button type="button" class="close" data-act="close" aria-label="Close">×</button>';
    var e = st.panel === 'detail' && st.detailId ? P.get(st.detailId) : null;
    if (st.panel === 'detail' && !e) { st.panel = 'list'; }
    if (st.panel === 'list') {
      var list = eventsOn(st.selected);
      h += '<div class="p-label">Details</div><div class="p-date">' + D.long(st.selected).replace(/ \d{4}$/, '') + '</div>' +
        (list.length ? list.map(function (x) { return '<button type="button" class="p-card b-' + x.cat + '" data-act="open" data-id="' + x.id + '"><div class="t' + (P.progressOf(x) === 'completed' ? ' done' : '') + '">' + esc(x.title) + '</div><div class="s">' + esc(x.course + ' · ' + x.type + (x.start && x.dur ? ' · ' + D.hhmm(D.mins(x.start)) + '–' + D.hhmm(D.mins(x.start) + x.dur * 60) : x.start && !x.allDay ? ' · due ' + x.start : '') + (x.weight ? ' · ' + x.weight + '%' : '')) + '</div></button>'; }).join('') : '<p class="muted">Nothing planned for this day yet. Add a class, an outing or anything else you want to keep track of.</p>') +
        '<button type="button" class="btn btn-secondary btn-sm w-100 mt-2" data-act="add" data-cat="assignments">+ Add event on this day</button>';
    } else {
      var b = P.badgeOf(e);
      var progress = P.progressOf(e), progressOptions = PROGRESS.map(function (p) { return '<option value="' + p[0] + '"' + (progress === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('');
      h += (st.from === 'direct' ? '' : '<button type="button" class="p-back" data-act="back">‹ All items</button>') +
        '<h2 class="fs-4 mb-2" style="padding-right:28px">' + esc(e.title) + '</h2><span class="pbadge ' + b.c + '">' + b.t + '</span>' + (progress === 'completed' ? ' <span class="pbadge ok">Completed</span>' : '') +
        '<div class="p-sec"><h4>Deadline</h4><div>' + D.long(e.date) + (e.start && !e.allDay ? ', ' + (e.start === '23:59' ? '11:59 PM' : D.time12(e.start)) + (e.dur ? '–' + D.time12(D.hhmm(D.mins(e.start) + e.dur * 60)) : '') : '') + '</div></div>' +
        '<div class="p-sec"><h4>What to do</h4><div>' + esc(e.todo || '—') + '</div></div>' +
        '<div class="p-sec"><h4>Details</h4><div>' + esc(e.course + ' · ' + e.type + (e.weight ? ' · Weightage: ' + e.weight + '%' : '') + (e.room ? ' · Room: ' + e.room : '')) + '</div></div>' +
        (e.notes ? '<div class="p-sec"><h4>Notes</h4><div>' + esc(e.notes) + '</div></div>' : '') +
        '<div class="p-sec"><h4>Source</h4><div class="muted">' + esc(e.source) + '</div></div>' +
        (e.cat !== 'timetable' ? '<div class="p-sec"><label class="form-label" for="calendar-progress">Task status</label><select class="form-select form-select-sm calendar-status" id="calendar-progress" data-id="' + e.id + '">' + progressOptions + '</select></div>' : '') +
        '<div class="d-grid gap-2 mt-3">' +
        (e.conflict ? '<a class="btn btn-danger-soft btn-sm" href="conflict.html">Resolve conflict</a>' : '') +
        '<button type="button" class="btn btn-secondary btn-sm" data-act="edit" data-id="' + e.id + '">Edit</button>' +
        '<button type="button" class="btn btn-danger-soft btn-sm" data-act="del" data-id="' + e.id + '">Delete</button></div>' +
        (st.confirmDel ? '<div class="del-box"><b>Delete this event?</b><p class="small mb-2">It will be removed from your calendar and task list.</p><div class="d-flex gap-2"><button type="button" class="btn btn-secondary btn-sm" data-act="delno">Keep it</button><button type="button" class="btn btn-danger btn-sm" data-act="delyes" data-id="' + e.id + '">Delete</button></div></div>' : '');
    }
    el.innerHTML = '<div class="p-inner">' + h + '</div>';
  }

  // ---------- motion ----------
  // Everything is re-rendered via innerHTML, so CSS transitions can't see state changes.
  // Instead, diff a snapshot of the state before/after each render and tag the fresh nodes
  // with a one-shot animation class.
  var prevSnap = null, segPos = null;
  function snap() {
    return { view: st.view, title: title(), cursor: st.cursor, month: monthOf(st.cursor), sel: st.selected,
      open: st.panel !== 'none' && !!st.selected, pkey: st.panel + '|' + st.detailId + '|' + st.selected, f: JSON.stringify(filters()) };
  }
  function tag(sel, cls) { var n = document.querySelector(sel); if (n) n.classList.add(cls); return n; }
  function placeSeg(animate) {
    var seg = document.querySelector('.seg-slide'); if (!seg) return;
    var on = seg.querySelector('button.on'), ind = seg.querySelector('.seg-ind');
    var to = { x: on.offsetLeft, w: on.offsetWidth };
    ind.style.transition = 'none';
    if (animate && segPos) { ind.style.transform = 'translateX(' + segPos.x + 'px)'; ind.style.width = segPos.w + 'px'; void ind.offsetWidth; ind.style.transition = ''; }
    ind.style.transform = 'translateX(' + to.x + 'px)'; ind.style.width = to.w + 'px';
    segPos = to;
  }
  function animate(a, b) {
    var dir = b.cursor > a.cursor ? 'a-next' : 'a-prev';
    if (a.view !== b.view) { tag('.cal-body', 'a-view'); tag('.cal-title', 'a-fade'); tag('.cal-radio.on .dot', 'a-pop'); tag('.seg-slide button.on', 'a-ink'); }
    else if (a.title !== b.title) { tag('.cal-body', dir); tag('.cal-title', 'a-fade'); }
    if (a.month !== b.month) tag('.mini-grid', dir);
    if (a.f !== b.f) {
      var fa = JSON.parse(a.f), fb = JSON.parse(b.f);
      Object.keys(fb).forEach(function (k) {
        if (fa[k] === fb[k]) return;
        tag('.cal-filter[data-k="' + k + '"] .box', 'a-pop');
        if (fb[k]) { var body = document.querySelector('.cal-body'); if (body) body.dataset.reveal = k; }
      });
    }
    if (b.sel && a.sel !== b.sel) { tag('.cell.sel', 'a-sel'); tag('.dn.sel', 'a-sel'); tag('.mini-day.selected', 'a-sel'); }
    if (a.open && b.open && a.pkey !== b.pkey) tag('.p-inner', 'a-swap');
  }

  function render() {
    side(); main(); panel();
    var s = snap();
    if (prevSnap) animate(prevSnap, s);
    placeSeg(!!prevSnap && prevSnap.view !== s.view);
    prevSnap = s;
  }
  // web fonts change the button widths after first paint
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeSeg(false); });
  window.addEventListener('resize', function () { placeSeg(false); });

  // ---------- actions ----------
  function shift(n) {
    var c = D.parse(st.cursor);
    if (st.view === 'month') { c.setDate(1); c.setMonth(c.getMonth() + n); st.cursor = D.iso(c); }
    else st.cursor = D.add(st.cursor, n * (st.view === 'week' ? 7 : 1));
    st.panel = 'none'; st.selected = null; st.detailId = null; st.confirmDel = false;
  }
  function openEv(id) { var e = P.get(id); if (!e) return; st.cursor = st.view === 'month' ? st.cursor : e.date; st.selected = e.date; st.panel = 'detail'; st.detailId = id; st.confirmDel = false; st.from = 'list'; }
  function editEvent(item) {
    UI.eventForm({ heading: 'Edit event', saveLabel: 'Save changes', cat: item.cat, title: item.title, date: item.date, time: item.start,
      course: item.course, weight: item.weight, room: item.room, notes: item.notes, source: item.source,
      onSave: function (ev) {
        var type = ev.cat === item.cat ? item.type : ev.type;
        P.update(item.id, { title: ev.title, cat: ev.cat, type: type, date: ev.date, start: ev.start, allDay: ev.allDay,
          course: ev.course, weight: ev.weight, room: ev.room, notes: ev.notes, todo: ev.cat === item.cat ? item.todo : ev.todo });
        st.cursor = ev.date; st.selected = ev.date; st.panel = 'detail'; st.detailId = item.id; st.confirmDel = false;
        if (!filters()[ev.cat]) { filters()[ev.cat] = true; P.save(); }
        render(); UI.toast('Updated “' + ev.title + '”');
      } });
  }
  var acts = {
    pick: function (t) { var d = t.dataset.date; st.selected = d; st.cursor = d; st.panel = 'list'; st.detailId = null; st.confirmDel = false; },
    mini: function (t) { var c = D.parse(st.cursor); c.setDate(1); c.setMonth(c.getMonth() + +t.dataset.n); st.cursor = D.iso(c); },
    filter: function (t) { var f = filters(); f[t.dataset.k] = !f[t.dataset.k]; P.save(); },
    view: function (t) { st.view = t.dataset.v; if (st.selected) st.cursor = st.selected; },
    nav: function (t) { shift(+t.dataset.n); }, today: function () { st.cursor = P.TODAY; st.selected = P.TODAY; st.panel = 'list'; st.detailId = null; },
    open: function (t) { openEv(t.dataset.id); },
    edit: function (t) { var item = P.get(t.dataset.id); if (item) editEvent(item); return true; },
    close: function () { st.panel = 'none'; st.selected = null; st.detailId = null; st.confirmDel = false; },
    back: function () { st.panel = 'list'; st.detailId = null; st.confirmDel = false; },
    del: function () { st.confirmDel = true; }, delno: function () { st.confirmDel = false; },
    delyes: function (t) { var e = P.get(t.dataset.id); P.remove(e.id); st.panel = 'list'; st.detailId = null; st.confirmDel = false; UI.toast('Deleted “' + e.title + '”'); },
    add: function (t) {
      var cat = t.dataset.cat || 'assignments';
      UI.eventForm({ heading: cat === 'exams' ? 'Add an exam' : 'Add an event', saveLabel: cat === 'exams' ? 'Add exam' : 'Add event', cat: cat, date: st.selected || P.TODAY, source: 'Added manually',
        onSave: function (ev) { P.add(ev); st.cursor = ev.date; st.selected = ev.date; st.panel = 'list'; st.detailId = null; if (!filters()[ev.cat]) { filters()[ev.cat] = true; P.save(); } render(); UI.toast('Added “' + ev.title + '” on ' + D.short(ev.date)); } });
      return true;
    }
  };
  $('layout').addEventListener('click', function (ev) {
    if (ev.target.closest('[data-stop]')) return;
    var t = ev.target.closest('[data-act]'); if (!t) return;
    var a = acts[t.dataset.act]; if (!a) return;
    if (a(t) === true) return;
    render();
  });
  $('layout').addEventListener('keydown', function (ev) {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.cell[data-act]')) { ev.preventDefault(); acts.pick(ev.target); render(); }
  });
  $('layout').addEventListener('change', function (ev) {
    var select = ev.target.closest('.calendar-status'); if (!select) return;
    P.setProgress(select.dataset.id, select.value, true); render(); UI.toast('Task status updated');
  });
  render();
})();
