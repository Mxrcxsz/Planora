/* Shared UI: nav + search overlay, auth guard, toasts, add-event modal, small helpers */
(function () {
  'use strict';
  var P = window.Planora, D = P.D;
  var UI = {};

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
      '<div class="pl-navbar">' +
      '<div class="wrap pl-nav"><a class="brand" href="dashboard.html"><img src="assets/planora-wordmark.png" alt="Planora"></a>' +
      '<div class="pl-tabs">' + t + '</div>' +
      '<div class="pl-right"><button type="button" class="icon-circle" id="openSearch" aria-label="Search">' + SEARCH_SVG + '</button>' +
      '<a class="avatar" href="settings.html" aria-label="Settings">' + P.initials() + '</a></div></div>' +
      '<div class="wrap pl-tabs-m">' + t + '</div>' +
      '<div class="nav-search" id="navSearch" hidden><form class="ns-form" action="search.html" role="search">' + SEARCH_SVG +
      '<input class="ns-input" id="nsInput" type="search" name="q" placeholder="Search deadlines, courses, tasks" aria-label="Search" autocomplete="off">' +
      '<button type="submit" class="ns-go">Search</button></form>' +
      '<button type="button" class="ns-close" id="closeSearch" aria-label="Close search">' + X_SVG + '</button></div></div>';
    var ov = document.getElementById('navSearch'), inp = document.getElementById('nsInput');
    function open() { ov.hidden = false; inp.value = ''; inp.focus(); }
    function close() { ov.hidden = true; document.getElementById('openSearch').focus(); }
    document.getElementById('openSearch').addEventListener('click', open);
    document.getElementById('closeSearch').addEventListener('click', close);
    ov.addEventListener('mousedown', function (e) { if (!e.target.closest('.ns-form') && !e.target.closest('.ns-close')) close(); });
    UI.showFlash();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) close(); if (e.key === '/' && ov.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); } });
  };

  // ---------- toast ----------
  UI.toast = function (msg) {
    var c = document.getElementById('toasts');
    if (!c) { c = document.createElement('div'); c.id = 'toasts'; c.className = 'toast-container position-fixed bottom-0 start-50 translate-middle-x p-3'; document.body.appendChild(c); }
    var t = document.createElement('div');
    t.className = 'toast align-items-center show'; t.setAttribute('role', 'status');
    t.innerHTML = '<div class="d-flex"><div class="toast-body fw-semibold">' + UI.esc(msg) + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button></div>';
    c.appendChild(t);
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

  window.PlUI = UI;
})();
