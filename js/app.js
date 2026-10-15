/* Shared UI: nav + search overlay, auth guard, toasts, add-event modal, small helpers */
(function () {
  'use strict';
  var P = window.Planora, D = P.D;
  var UI = {};

  // ---------- page transitions ----------
  // is-entering gates the CSS entrance animation to the first render; is-leaving fades <main> out before navigating.
  var root = document.documentElement, calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('is-entering');
  setTimeout(function () { root.classList.remove('is-entering'); }, 1000);
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.dataset.bsToggle) return;
    if (a.protocol !== location.protocol || a.host !== location.host) return;
    if (a.pathname === location.pathname && a.search === location.search && a.hash) return; // in-page anchor
    if (calm) return;
    e.preventDefault();
    if (a.classList.contains('pl-tab')) moveTab(a);
    root.classList.add('is-leaving');
    setTimeout(function () { location.href = a.href; }, 200);
  });
  // coming back via the back/forward cache restores the faded-out page
  // and puts the tab pill back on this page's tab
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    root.classList.remove('is-leaving');
    var tabs = document.querySelector('.pl-tabs'); if (!tabs) return;
    tabs.classList.remove('is-moving');
    tabs.querySelectorAll('.pl-tab').forEach(function (x) { x.classList.toggle('active', x.getAttribute('aria-current') === 'page'); });
    var cur = tabs.querySelector('.pl-tab.active');
    if (cur) placeInd(tabs, cur, false); else tabs.classList.remove('ind-ready');
  });

  function placeInd(tabs, tab, animate) {
    var ind = tabs.querySelector('.pl-tab-ind'); if (!ind || !tab) return;
    if (!animate) ind.style.transition = 'none';
    ind.style.transform = 'translateX(' + tab.offsetLeft + 'px)'; ind.style.width = tab.offsetWidth + 'px';
    if (!animate) { void ind.offsetWidth; ind.style.transition = ''; }
    tabs.classList.add('ind-ready');
  }
  function moveTab(tab) {
    var tabs = tab.closest('.pl-tabs'); if (!tabs) return;
    var had = tabs.classList.contains('ind-ready');
    tabs.classList.add('is-moving'); // the pill is now the only background layer (no hover grey fading out on top of it)
    tabs.querySelectorAll('.pl-tab.active').forEach(function (x) { x.classList.remove('active'); });
    tab.classList.add('active');
    placeInd(tabs, tab, had);
  }

  UI.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  UI.qs = function (k) { return new URLSearchParams(location.search).get(k); };
  UI.badge = function (e) { var b = P.badgeOf(e); return '<span class="pbadge ' + b.c + '">' + b.t + '</span>'; };

  UI.guard = function () {
    if (!P.state.user.loggedIn) {
      var here = location.pathname.split('/').pop() || 'index.html';
      location.replace('login.html?next=' + encodeURIComponent(here + location.search));
      return false;
    }
    return true;
  };

  var SEARCH_SVG = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M14 14l4 4"/></svg>';
  var X_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>';

  UI.nav = function (active) {
    var el = document.getElementById('nav'); if (!el) return;
    var tabs = [['dashboard', 'Dashboard', 'dashboard.html'], ['calendar', 'Calendar', 'calendar.html'], ['tasks', 'Tasks', 'tasks.html'], ['upload', 'Upload', 'upload.html']];
    var t = tabs.map(function (x) { return '<a class="pl-tab' + (x[0] === active ? ' active' : '') + '" href="' + x[2] + '"' + (x[0] === active ? ' aria-current="page"' : '') + '>' + x[1] + '</a>'; }).join('');
    el.innerHTML =
      '<div class="pl-navbar app">' +
      '<div class="wrap pl-nav"><a class="brand" href="dashboard.html"><img src="assets/planora-wordmark.png" alt="Planora"></a>' +
      '<div class="pl-tabs"><span class="pl-tab-ind" aria-hidden="true"></span>' + t + '</div>' +
      '<div class="pl-right"><button type="button" class="icon-circle" id="openSearch" aria-label="Search">' + SEARCH_SVG + '</button>' +
      '<a class="avatar" href="settings.html" aria-label="Settings">' + P.initials() + '</a></div></div>' +
      '<div class="wrap pl-tabs-m">' + t + '</div>' +
      '<div class="nav-search" id="navSearch" inert><form class="ns-form" action="search.html" role="search">' + SEARCH_SVG +
      '<input class="ns-input" id="nsInput" type="search" name="q" placeholder="Search deadlines, courses, tasks" aria-label="Search" autocomplete="off">' +
      '<button type="submit" class="ns-go">Search</button></form>' +
      '<button type="button" class="ns-close" id="closeSearch" aria-label="Close search">' + X_SVG + '</button></div></div>';
    var tabsEl = el.querySelector('.pl-tabs'), sync = function () { placeInd(tabsEl, tabsEl.querySelector('.pl-tab.active'), false); };
    sync(); window.addEventListener('resize', sync);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync); // web fonts change tab widths
    var bar = el.querySelector('.pl-navbar'), ov = document.getElementById('navSearch'), inp = document.getElementById('nsInput'), isOpen = false;
    // the sweep is driven by .search-active on the navbar (see theme.css); inert keeps the closed overlay out of the tab order
    function open() {
      isOpen = true; inp.value = ''; ov.inert = false; bar.classList.add('search-active');
      setTimeout(function () { if (isOpen) inp.focus(); }, 150);
    }
    function close() { isOpen = false; ov.inert = true; bar.classList.remove('search-active'); document.getElementById('openSearch').focus(); }
    document.getElementById('openSearch').addEventListener('click', open);
    document.getElementById('closeSearch').addEventListener('click', close);
    ov.addEventListener('mousedown', function (e) { if (!e.target.closest('.ns-form') && !e.target.closest('.ns-close')) close(); });
    document.addEventListener('mousedown', function (e) { if (isOpen && !bar.contains(e.target)) close(); });
    UI.showFlash();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); if (e.key === '/' && !isOpen && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); } });
  };

  // ---------- toast ----------
  UI.toast = function (msg) {
    var c = document.getElementById('toasts');
    if (!c) { c = document.createElement('div'); c.id = 'toasts'; c.className = 'toast-container position-fixed bottom-0 start-50 translate-middle-x p-3'; document.body.appendChild(c); }
    var t = document.createElement('div');
    t.className = 'toast align-items-center show'; t.setAttribute('role', 'status');
    t.innerHTML = '<div class="d-flex"><div class="toast-body fw-semibold">' + UI.esc(msg) + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button></div>';
    c.appendChild(t);
    while (c.children.length > 3) c.removeChild(c.firstChild); // at most 3 on screen; the oldest makes way
    var kill = function () { t.remove(); };
    t.querySelector('.btn-close').addEventListener('click', kill);
    setTimeout(kill, 4200);
  };
  // toast handed over from the previous page
  UI.flash = function (msg) { try { sessionStorage.setItem('planora.flash', msg); } catch (e) { /* ignore */ } };
  UI.showFlash = function () { try { var m = sessionStorage.getItem('planora.flash'); if (m) { sessionStorage.removeItem('planora.flash'); UI.toast(m); } } catch (e) { /* ignore */ } };

  // ---------- add / edit event modal (shared by Calendar and Review) ----------
  var modalEl = null, modal = null, cfg = null, kind = 'assignments';
  function build() {
    modalEl = document.createElement('div');
    modalEl.className = 'modal fade'; modalEl.id = 'evModal'; modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-labelledby', 'evTitle'); modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML =
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><form id="evForm" novalidate>' +
      '<div class="modal-header border-0 pb-0"><h2 class="modal-title fs-4" id="evHeading">Add an event</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body">' +
      '<div class="mb-3"><label class="form-label" for="f-title">Title</label><input class="form-control" id="f-title" type="text" placeholder="e.g. Midterm exam" autocomplete="off"><div class="invalid-feedback">Add a title so you can find this later.</div></div>' +
      '<div class="mb-3"><label class="form-label" id="f-type-l">Type</label><div class="type-row" id="f-type" role="group" aria-labelledby="f-type-l"></div></div>' +
      '<div class="row g-3 mb-3"><div class="col-6"><label class="form-label" for="f-date">Date</label><input class="form-control" id="f-date" type="date"><div class="invalid-feedback">Pick a date.</div></div>' +
      '<div class="col-6"><label class="form-label" for="f-time">Time <span class="opt">(optional)</span></label><input class="form-control" id="f-time" type="time"></div></div>' +
      '<div class="row g-3 mb-3"><div class="col-6"><label class="form-label" for="f-course">Course</label><select class="form-select" id="f-course"></select></div>' +
      '<div class="col-6"><label class="form-label" for="f-w">Weightage % <span class="opt">(optional)</span></label><input class="form-control" id="f-w" type="number" min="0" max="100" placeholder="e.g. 20"></div></div>' +
      '<div class="mb-3" id="f-room-wrap" hidden><label class="form-label" for="f-room">Room <span class="opt">(optional)</span></label><input class="form-control" id="f-room" type="text" placeholder="e.g. LT 2-1"></div>' +
      '<div class="mb-1"><label class="form-label" for="f-notes">Notes <span class="opt">(optional)</span></label><textarea class="form-control" id="f-notes" rows="2" placeholder="Anything to remember"></textarea></div>' +
      '</div><div class="modal-footer border-0 pt-0"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary" id="evSave">Add event</button></div>' +
      '</form></div></div>';
    document.body.appendChild(modalEl);
    modal = new bootstrap.Modal(modalEl);
    document.getElementById('evForm').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    document.getElementById('f-title').addEventListener('input', function () { this.classList.remove('is-invalid'); });
    document.getElementById('f-date').addEventListener('input', function () { this.classList.remove('is-invalid'); });
    modalEl.addEventListener('shown.bs.modal', function () { document.getElementById('f-title').focus(); });
  }
  function drawTypes() {
    var box = document.getElementById('f-type');
    box.innerHTML = P.KINDS.map(function (k) {
      return '<button type="button" class="type-pill' + (k.k === kind ? ' on' : '') + '" data-k="' + k.k + '" aria-pressed="' + (k.k === kind) + '"><span class="d ' + k.k + '"></span>' + k.label + '</button>';
    }).join('');
    box.querySelectorAll('.type-pill').forEach(function (b) { b.addEventListener('click', function () { kind = b.dataset.k; drawTypes(); }); });
    document.getElementById('f-room-wrap').hidden = kind !== 'exams';
  }
  function submit() {
    var title = document.getElementById('f-title').value.trim(), date = document.getElementById('f-date').value;
    document.getElementById('f-title').classList.toggle('is-invalid', !title);
    document.getElementById('f-date').classList.toggle('is-invalid', !date);
    if (!title || !date) return;
    var time = document.getElementById('f-time').value;
    var ev = P.newEvent({
      title: title, cat: kind, date: date, start: time, course: document.getElementById('f-course').value,
      weight: document.getElementById('f-w').value, room: kind === 'exams' ? document.getElementById('f-room').value.trim() : '',
      notes: document.getElementById('f-notes').value.trim(), source: cfg.source
    });
    if (!time) ev.allDay = true;
    modal.hide();
    cfg.onSave(ev);
  }
  UI.eventForm = function (o) {
    if (!modalEl) build();
    cfg = o; kind = o.cat || 'assignments';
    document.getElementById('evHeading').textContent = o.heading || 'Add an event';
    document.getElementById('evSave').textContent = o.saveLabel || 'Add event';
    ['f-title', 'f-time', 'f-w', 'f-room', 'f-notes'].forEach(function (id) { document.getElementById(id).value = ''; });
    document.getElementById('f-title').classList.remove('is-invalid'); document.getElementById('f-date').classList.remove('is-invalid');
    document.getElementById('f-date').value = o.date || P.TODAY;
    var courses = P.courses().concat(['Other']);
    document.getElementById('f-course').innerHTML = courses.map(function (c) { return '<option>' + UI.esc(c) + '</option>'; }).join('');
    if (o.course && courses.indexOf(o.course) >= 0) document.getElementById('f-course').value = o.course;
    drawTypes(); modal.show();
  };

  // ---------- shared row markup ----------
  UI.row = function (e, o) {
    o = o || {};
    var inner = '<div class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</div><div class="irow-body"><div class="irow-title">' + UI.esc(e.title) +
      '</div><div class="irow-sub"><span class="chip">' + UI.esc(e.course) + '</span>' + UI.esc(o.sub != null ? o.sub : P.whenOf(e)) + '</div></div>' + (o.badge === false ? '' : UI.badge(e));
    if (o.href) return '<a class="irow" href="' + o.href + '">' + inner + '</a>';
    return '<div class="irow">' + inner + '</div>';
  };
  UI.eventHref = function (e) { return P.statusOf(e) === 'conflict' ? 'conflict.html' : P.statusOf(e) === 'check' ? 'edit.html?id=' + encodeURIComponent(e.id) + '&from=event' : 'calendar.html?event=' + encodeURIComponent(e.id); };

  // ---------- login / signup side artwork ----------
  // Marketing copy plus decorative mini-mockups of the core features (the mockups are aria-hidden), built from the demo scenario.
  (function authArt() {
    var L = document.querySelector('.auth-art-left'), R = document.querySelector('.auth-art-right');
    if (!L || !R) return;
    var ico = function (d) { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
    var CAL = ico('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
      PIN = ico('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
      PCT = ico('<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'),
      BELL = ico('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
      CHECK = ico('<path d="M20 6 9 17l-5-5"/>');
    var ev = function (cls, top, h, t, s) { return '<div class="aw-ev ' + cls + '" style="top:' + top + 'px;height:' + h + 'px"><b>' + t + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>'; };
    var copy = function (eyebrow, head, text, extra) { return '<div class="art-copy"><span class="art-eyebrow">' + eyebrow + '</span><h2>' + head + '</h2><p>' + text + '</p>' + (extra || '') + '</div>'; };
    L.innerHTML = copy('Syllabus to schedule', 'Every deadline, in one place.', 'Upload a syllabus and Planora pulls out each due date, exam and reading, then puts them straight onto your calendar.',
        '<ul class="art-ticks"><li>' + CHECK + 'Free for students</li><li>' + CHECK + 'Syncs with Google Calendar</li></ul>') +
      '<div class="art-stack" aria-hidden="true">' +
      '<div class="art-card art-week f1"><div class="aw-head"><div><span>TUE</span><b class="today">21</b></div><div><span>WED</span><b>22</b></div><div><span>THU</span><b>23</b></div></div>' +
      '<div class="aw-body"><div class="aw-col">' + ev('tt', 10, 50, 'MATH210 Lecture', '1:00 – 2:30 PM') + '<div class="aw-now" style="top:74px"></div>' + ev('as done', 92, 24, CHECK + ' Problem Set 3', '') + '</div>' +
      '<div class="aw-col">' + ev('as', 4, 28, 'Essay draft', '') + ev('tt', 40, 50, 'CS301 Lecture', '10:00 – 11:30 AM') + '</div>' +
      '<div class="aw-col">' + ev('tt', 10, 50, 'MATH210 Lecture', '1:00 – 2:30 PM') + ev('tt', 70, 50, 'HIST220 Lecture', '3:30 – 5:00 PM') + '</div></div></div>' +
      '<div class="art-chip f2">' + CHECK + ' Essay draft — due 9:00 AM</div>' +
      '<div class="art-card art-upload f3"><div class="au-file"><span class="au-ic">PDF</span><div><b>CS301_Syllabus.pdf</b><small>Reading your syllabus…</small></div></div>' +
      '<div class="au-bar"><span></span></div><div class="au-found">' + CHECK + ' Found 6 dates</div>' +
      '<ul class="au-list"><li><i class="as"></i>Problem Set 2<em>Sep 24</em></li><li><i class="ex"></i>Midterm Exam<em>Oct 28</em></li><li><i class="as"></i>Group project proposal<em>Nov 3</em></li></ul></div></div>';
    R.innerHTML = '<div class="art-stack" aria-hidden="true">' +
      '<div class="art-card art-conflict f2"><div class="ac-head"><span class="ac-ic">!</span><div><b>Scheduling conflict</b><small>Tue, 28 Oct · 10:00 AM</small></div></div>' +
      '<div class="ac-vs"><div><span class="ac-tag">Exam</span><b>CS301</b><small>Midterm · 30%</small></div><em>vs</em><div><span class="ac-tag">Quiz</span><b>MATH210</b><small>Pop quiz · 5%</small></div></div>' +
      '<div class="ac-btns"><span class="b1">Select new date</span><span class="b2">Resolve</span></div></div>' +
      '<div class="art-card art-event f3"><div class="ae-title"><i class="ex"></i>Midterm Exam</div>' +
      '<div class="ae-row">' + CAL + 'Tue, 28 Oct · 10:00 AM – 12:00 PM</div><div class="ae-row">' + PIN + 'LT 2-1</div><div class="ae-row">' + PCT + 'Weightage 30%</div>' +
      '<div class="ae-remind">' + BELL + '<span>Remind me</span><span class="pill on">1 day before</span><span class="pill">1 hour</span></div></div>' +
      '<div class="art-toast f1">' + CHECK + ' Added “Problem Set 4” on Nov 4</div></div>' +
      copy('Stay ahead', 'Clashes caught before they catch you.', 'Planora flags the moment two deadlines overlap, so you can move one, mark it TBD or plan around it in a tap.');
  })();

  window.PlUI = UI;
})();
