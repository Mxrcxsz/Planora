/* Planora mock data store. Plain script, no build step; exposes window.Planora */
(function () {
  'use strict';
  // Standalone A/B entry points provide their own key so test sessions cannot
  // leak state into one another. The production entry point keeps its old key.
  var KEY = window.PLANORA_STORAGE_KEY || 'planora.v1';
  var TODAY = '2025-10-21'; // fixed "today" so the demo data always lines up
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MON3 = MONTHS.map(function (m) { return m.slice(0, 3); });
  var DOW3 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var CATS = [
    { k: 'timetable', label: 'Timetable' }, { k: 'assignments', label: 'Assignments' },
    { k: 'exams', label: 'Exams' }, { k: 'other', label: 'Other' }
  ];
  // type pills in the add-event form
  var KINDS = [
    { k: 'assignments', label: 'Assignment', type: 'Homework' }, { k: 'exams', label: 'Exam', type: 'Exam' },
    { k: 'timetable', label: 'Class', type: 'Class' }, { k: 'other', label: 'Other', type: 'Other' }
  ];
  var TYPE_LIST = ['Homework', 'Essay', 'Reading', 'Project', 'Quiz', 'Exam', 'Class', 'Other'];
  var ICONS = { Homework: '📄', Essay: '📝', Reading: '📝', Project: '👥', Quiz: '🧮', Exam: '🧪', Class: '📅', Other: '📌', Reminder: '🔔' };
  var TYPE_GROUP = { Homework: 'homework', Essay: 'homework', Reading: 'reading', Project: 'project', Quiz: 'exam', Exam: 'exam' };
  var TODO = {
    Homework: 'Submit your work on the course page before the deadline.',
    Essay: 'Upload your draft to the course page before the deadline.',
    Reading: 'Finish the reading and post your short response.',
    Project: 'Submit with your group before the deadline.',
    Quiz: 'Complete the quiz in class.',
    Exam: 'Sit the exam in your assigned room. Bring your student card.',
    Class: 'Attend the session.', Other: 'Added by you.'
  };
  var COURSE_NAMES = { CS301: 'Data Structures', MATH210: 'Linear Algebra', ENG110: 'Composition', HIST220: 'World History', PHYS101: 'Physics I' };

  // ---------- date helpers ----------
  var D = {
    parse: function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); },
    iso: function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    add: function (s, n) { var d = D.parse(s); d.setDate(d.getDate() + n); return D.iso(d); },
    diff: function (a, b) { return Math.round((D.parse(a) - D.parse(b)) / 86400000); },
    short: function (s) { var d = D.parse(s); return MON3[d.getMonth()] + ' ' + d.getDate(); },
    long: function (s) { var d = D.parse(s); return DOW3[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); },
    time12: function (t) { if (!t) return ''; var p = t.split(':'), h = +p[0], m = p[1]; return ((h + 11) % 12 + 1) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM'); },
    mins: function (t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; },
    hhmm: function (m) { m = Math.round(m); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); },
    mondayOf: function (s) { var d = D.parse(s); return D.add(s, -((d.getDay() + 6) % 7)); },
    today: TODAY
  };

  // ---------- seed data ----------
  var seq = 0;
  function uid() { seq += 1; return 'e' + Date.now().toString(36) + seq + Math.random().toString(36).slice(2, 5); }
  function mk(id, date, start, dur, title, cat, course, type, weight, extra) {
    var e = { id: id, date: date, start: start, dur: dur, title: title, cat: cat, course: course, type: type, weight: weight,
      todo: TODO[type] || '', source: course + '_Syllabus.pdf', status: 'verified', conflict: false, done: false, room: '', notes: '' };
    if (extra) for (var k in extra) e[k] = extra[k];
    e.progressStatus = e.progressStatus || (e.done ? 'completed' : 'not_started');
    return e;
  }
  function seedEvents() {
    var ev = [
      mk('ps1', '2025-09-10', '23:59', 0, 'Problem Set 1', 'assignments', 'CS301', 'Homework', 5, { done: true }),
      mk('ps2', '2025-09-24', '23:59', 0, 'Problem Set 2', 'assignments', 'CS301', 'Homework', 5, { done: true }),
      mk('ps3', '2025-10-21', '23:59', 0, 'Problem Set 3', 'assignments', 'CS301', 'Homework', 5),
      mk('rr6', '2025-10-30', '23:59', 0, 'Reading response — Week 6', 'assignments', 'CS301', 'Reading', 3, { status: 'check', note: 'The syllabus lists this under "ongoing weekly readings" without a specific date. Planora estimated Week 6 based on the course schedule — confirm or correct it.' }),
      mk('mid', '2025-10-28', '10:00', 2, 'Midterm Exam', 'exams', 'CS301', 'Exam', 30, { conflict: true, room: 'LT 2-1' }),
      mk('ps4', '2025-11-04', '23:59', 0, 'Problem Set 4', 'assignments', 'CS301', 'Homework', 5),
      mk('final', '2025-12-12', '09:00', 3, 'Final exam', 'exams', 'CS301', 'Exam', null, { status: 'check', note: 'The syllabus lists the weight as "TBD%". Add it once your instructor confirms.' }),
      mk('pop0', '2025-10-14', '10:00', 1, 'Pop quiz before midterm review', 'exams', 'MATH210', 'Quiz', 2, { done: true }),
      mk('gpp', '2025-11-03', '23:59', 0, 'Group project proposal', 'assignments', 'MATH210', 'Project', 10),
      mk('quiz', '2025-10-28', '10:00', 1, 'Pop quiz — chapters 4–5', 'exams', 'MATH210', 'Quiz', 5, { conflict: true }),
      mk('mhw', '2025-11-05', '23:59', 0, 'Homework 6', 'assignments', 'MATH210', 'Homework', 4),
      mk('guide', '2025-10-13', '09:00', 0, 'Midterm study guide release', 'assignments', 'ENG110', 'Reading', 0, { done: true }),
      mk('essay', '2025-10-22', '09:00', 0, 'Essay draft — Chapter 2 response', 'assignments', 'ENG110', 'Essay', 10),
      mk('paper', '2025-11-12', '23:59', 0, 'Paper 2', 'assignments', 'ENG110', 'Essay', 15),
      mk('hist1', '2025-10-31', '17:00', 0, 'Primary source analysis', 'assignments', 'HIST220', 'Homework', 10),
      mk('hist2', '2025-11-11', '14:00', 1, 'Map quiz', 'exams', 'HIST220', 'Quiz', 5)
    ];
    // weekly timetable, 1 Sep – 12 Dec 2025
    var pattern = [
      [1, 'CS301', '10:00', 1.5, 'CS301 Lecture'], [3, 'CS301', '10:00', 1.5, 'CS301 Lecture'],
      [2, 'MATH210', '13:00', 1.5, 'MATH210 Lecture'], [4, 'MATH210', '13:00', 1.5, 'MATH210 Lecture'],
      [5, 'ENG110', '09:00', 2, 'ENG110 Seminar'], [4, 'HIST220', '15:30', 1.5, 'HIST220 Lecture']
    ];
    for (var d = '2025-09-01'; d <= '2025-12-12'; d = D.add(d, 1)) {
      var dow = D.parse(d).getDay();
      pattern.forEach(function (p) {
        if (p[0] === dow) ev.push(mk('tt-' + d + '-' + p[1], d, p[2], p[3], p[4], 'timetable', p[1], 'Class', null, { source: 'Timetable', todo: TODO.Class }));
      });
    }
    return ev;
  }
  function seed(mode) {
    var demo = mode !== 'empty';
    return {
      v: 1,
      user: { loggedIn: false, account: demo ? 'demo' : 'new', name: 'Jamie Lee', email: 'jamie.lee@school.edu' },
      events: demo ? seedEvents() : [],
      review: null,
      conflictAck: false,
      // newest first; a few seeded entries so Recent activity isn't empty on a fresh demo
      activity: demo ? [
        { t: 'Calendar updated with your timetable', ago: '2 minutes ago', icon: 'cal' },
        { t: 'CS301_Syllabus.pdf uploaded', ago: '5 minutes ago', icon: 'up' },
        { t: '9 deadlines confirmed from CS301', ago: '6 minutes ago', icon: 'ok' }
      ] : [],
      conflictMsg: '',
      settings: { notif: { email: true, conflict: true, weekly: false }, gcal: false, extraCourses: [], removedCourses: [] },
      ui: { calFilters: { timetable: true, assignments: true, exams: true, other: true }, dashCourses: { HIST220: false }, dashTypes: {}, taskSort: 'date' }
    };
  }

  // ---------- persistence ----------
  // sessionStorage, not localStorage: a tester's changes carry across pages and refreshes,
  // but closing the tab/browser brings back the original demo scenario.
  var mem = null;
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } // drop data saved by older builds
  function load() {
    try { var r = sessionStorage.getItem(KEY); if (r) { var s = JSON.parse(r); if (s && s.v === 1) return s; } } catch (e) { /* ignore */ }
    return mem || seed('demo');
  }
  var state = load();
  function save() { mem = state; try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  // real session actions are stamped with a time; seeded ones carry a fixed 'ago' label
  function log(t, icon) { var a = state.activity || (state.activity = []); a.unshift({ t: t, at: Date.now(), icon: icon || 'edit' }); if (a.length > 30) a.length = 30; }
  function wipe() { mem = null; state = seed('demo'); try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  // Deadlines confirmed on the Review page. The mock upload holds the demo semester's own deadlines
  // with the same ids, so an event already on the calendar is updated in place (keeping its progress,
  // room and notes) and only a missing one is added: uploading again never piles up copies.
  var KEEP = { done: 1, progressStatus: 1, room: 1, notes: 1 };
  function mergeConfirmed(files, events) {
    events.forEach(function (e) {
      var cur = state.events.filter(function (x) { return x.id === e.id; })[0];
      if (!cur) { state.events.push(e); return; }
      for (var k in e) if (!KEEP[k]) cur[k] = e[k];
      if (!e.start) { cur.allDay = true; } else { delete cur.allDay; }
      if (cur.tbd && !e.tbd) delete cur.tbd;
    });
    (files || []).forEach(function (f) { log(f + ' uploaded', 'up'); });
    log(events.length + ' deadlines confirmed from review', 'ok');
    var clashing = events.filter(function (e) { return e.conflict; }).length;
    if (clashing) { state.conflictAck = false; log(clashing + ' deadlines clash on the same date', 'del'); }
    save();
  }
  // The Review page hands confirmed deadlines over through localStorage and opens the Calendar;
  // take them into this session once, then drop the hand-off.
  (function importConfirmed() {
    var k = window.PLANORA_CONFIRMED_KEY, raw = null, data = null;
    if (!k) return;
    try { raw = localStorage.getItem(k); localStorage.removeItem(k); data = raw && JSON.parse(raw); } catch (e) { return; }
    var events = data && Array.isArray(data.events) ? data.events : [];
    if (events.length) mergeConfirmed(data.files, events);
  })();

  // ---------- extraction pools (fake syllabus reading) ----------
  var POOLS = {
    CS301: { file: 'CS301_Syllabus.pdf', items: [
      { title: 'Problem Set 1', type: 'Homework', date: '2025-09-10', start: '23:59', weight: 5, ok: true },
      { title: 'Problem Set 2', type: 'Homework', date: '2025-09-24', start: '23:59', weight: 5, ok: true },
      { title: 'Midterm Exam', type: 'Exam', date: '2025-10-28', start: '10:00', dur: 2, weight: 30, ok: true },
      { title: 'Lab quiz 3', type: 'Quiz', date: '2025-10-28', start: '10:00', dur: 1, weight: 5, ok: true },
      { title: 'Reading response — Week 6', type: 'Reading', date: '2025-10-30', start: '23:59', weight: 3, ok: false, sub: 'Due date unclear in source text', note: 'The syllabus lists this under "ongoing weekly readings" without a specific date. Planora estimated Week 6 based on the course schedule — confirm or correct it.' },
      { title: 'Group project proposal', type: 'Project', date: '2025-11-03', start: '23:59', weight: 10, ok: true },
      { title: 'Final exam', type: 'Exam', date: '2025-12-12', start: '09:00', dur: 3, weight: null, ok: false, sub: 'Weight unclear — listed as "TBD%"', note: 'The syllabus lists the weight as "TBD%". Add it once your instructor confirms.' }
    ], course: 'CS301' },
    PHYS101: { file: 'PHYS101_Syllabus.pdf', items: [
      { title: 'Lab report 1', type: 'Homework', date: '2025-10-27', start: '23:59', weight: 8, ok: true },
      { title: 'Problem set — kinematics', type: 'Homework', date: '2025-10-30', start: '23:59', weight: 4, ok: true },
      { title: 'Quiz 2', type: 'Quiz', date: '2025-11-11', start: '14:00', dur: 1, weight: 6, ok: true },
      { title: 'Lab report 2', type: 'Homework', date: '2025-11-17', start: '23:59', weight: 8, ok: false, sub: 'Due date unclear in source text', note: 'The lab schedule shows "Week 12" with no date. Planora estimated Nov 17.' },
      { title: 'Midterm exam', type: 'Exam', date: '2025-11-20', start: '14:00', dur: 2, weight: 25, ok: true }
    ], course: 'PHYS101' },
    BIO120: { file: 'BIO120_Syllabus.pdf', items: [
      { title: 'Lab notebook check', type: 'Homework', date: '2025-10-29', start: '23:59', weight: 5, ok: true },
      { title: 'Field trip reflection', type: 'Essay', date: '2025-11-07', start: '23:59', weight: 8, ok: true },
      { title: 'Quiz 1 — microscopy', type: 'Quiz', date: '2025-11-05', start: '11:00', dur: 1, weight: 4, ok: true },
      { title: 'Unit test — cells', type: 'Exam', date: '2025-11-13', start: '09:00', dur: 1.5, weight: 20, ok: false, sub: 'Time unclear in source text', note: 'The syllabus says "Week 11, in lecture" without a time. Planora used the usual lecture slot, 9:00 AM.' }
    ], course: 'BIO120' },
    ECON105: { file: 'ECON105_Syllabus.pdf', items: [
      { title: 'Problem set — supply and demand', type: 'Homework', date: '2025-10-31', start: '23:59', weight: 5, ok: true },
      { title: 'Policy brief', type: 'Essay', date: '2025-11-14', start: '23:59', weight: 15, ok: true },
      { title: 'Quiz 3', type: 'Quiz', date: '2025-11-19', start: '16:00', dur: 1, weight: 5, ok: true }
    ], course: 'ECON105' }
  };
  var POOL_ORDER = ['CS301', 'PHYS101', 'BIO120', 'ECON105'];

  function chipOf(it) { return it.type; }
  function fileTypeOf(filename) {
    var m = String(filename || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }
  function cleanCitation(c, fallbackFilename) {
    c = c || {};
    var filename = c.filename || fallbackFilename || '';
    var out = { filename: filename, fileType: c.fileType || fileTypeOf(filename), page: null, slide: null, line: null, excerpt: '' };
    ['page', 'slide', 'line'].forEach(function (key) { if (Number.isInteger(c[key]) && c[key] > 0) out[key] = c[key]; });
    if (typeof c.excerpt === 'string' && c.excerpt.trim()) out.excerpt = c.excerpt.trim();
    return out;
  }
  function whenText(it) {
    var s = (it.type === 'Exam' || it.type === 'Quiz' ? '' : 'Due ') + D.short(it.date);
    if (it.type === 'Exam' && !it.start) return s;
    if (it.start && it.start !== '23:59') s += ', ' + D.time12(it.start); else if (it.start === '23:59') s += ', 11:59 PM';
    return s;
  }

  // ---------- schedule clashes ----------
  // Two timed items on the same day clash when their time ranges overlap or sit less than CLASH_GAP
  // minutes apart (no time to get from one to the other). Start times don't have to match, so moving
  // one from 10:00 to 10:01 still clashes. Classes, all-day and 11:59 PM deadlines, TBD and completed
  // items never clash. An exam or quiz with no length counts as an hour; other deadlines are a moment.
  var CLASH_GAP = 15;
  function slotOf(e) {
    if (!e || e.cat === 'timetable' || e.allDay || !e.start || e.start === '23:59' || e.tbd || API.progressOf(e) === 'completed') return null;
    var s = D.mins(e.start), len = e.dur ? e.dur * 60 : e.cat === 'exams' ? 60 : 0;
    return { s: s, t: s + len };
  }
  function overlaps(a, b) {
    if (!a || !b || a === b || (a.id && a.id === b.id) || a.date !== b.date) return false;
    var x = slotOf(a), y = slotOf(b); if (!x || !y) return false;
    return x.s < y.t + CLASH_GAP && y.s < x.t + CLASH_GAP;
  }
  function clashesOf(e) { return state.events.filter(function (o) { return overlaps(e, o); }); }
  // after e's date or time changed: flag what it now overlaps, and clear any former partner left with nothing
  function recheckClash(e, before) {
    if (!e || e.conflictType === 'information') return;
    var now = clashesOf(e), was = !!e.conflict;
    e.conflict = now.length > 0;
    now.forEach(function (o) { if (!o.conflict) state.conflictAck = false; o.conflict = true; });
    (before || []).forEach(function (o) { if (now.indexOf(o) < 0 && o.conflictType !== 'information') o.conflict = clashesOf(o).length > 0; });
    if (e.conflict && !was) { state.conflictAck = false; log('“' + e.title + '” now clashes with “' + now[0].title + '”', 'del'); }
    else if (e.conflict && was) log('“' + e.title + '” still overlaps “' + now[0].title + '”', 'del');
  }

  // If no extracted item already shares a date and start time with an upcoming timed event (or another
  // item in the batch), move one extracted quiz/exam onto the best upcoming slot.
  function ensureClash(items) {
    var timed = function (e) { return e.cat !== 'timetable' && e.start && e.start !== '23:59' && API.progressOf(e) !== 'completed'; };
    var mine = items.filter(timed), pool = state.events.filter(function (e) { return timed(e) && e.date >= TODAY; }).concat(mine);
    var clashes = mine.some(function (it) { return pool.some(function (o) { return o !== it && overlaps(it, o); }); });
    if (clashes) return;
    var upcoming = state.events.filter(function (e) { return timed(e) && e.date >= TODAY; });
    var shared = function (e) { return upcoming.some(function (o) { return o !== e && o.date === e.date && o.start === e.start; }) ? 1 : 0; };
    // prefer a slot holding just one event (the conflict page compares two), then exams, then the soonest
    var targets = upcoming.sort(function (a, b) {
      return shared(a) - shared(b) || (a.conflict ? 1 : 0) - (b.conflict ? 1 : 0) || (a.cat === 'exams' ? 0 : 1) - (b.cat === 'exams' ? 0 : 1) || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    });
    var pick = function (list) { return list.filter(function (e) { return e.cat === 'exams' && e.status !== 'check'; })[0] || list.filter(function (e) { return e.cat === 'exams'; })[0] || list[0]; };
    var mover = pick(mine.length ? mine : items), target = targets[0];
    if (!mover) return;
    if (!target) target = items.filter(function (e) { return e !== mover; })[0]; // empty calendar: clash inside the batch
    if (!target) return;
    mover.date = target.date; mover.start = target.start && target.start !== '23:59' ? target.start : '10:00';
    if (!target.start || target.start === '23:59') { target.start = mover.start; if (!target.dur) target.dur = 1; }
    if (!mover.dur) mover.dur = 1;
    if (mover.extractedSnapshot) { mover.extractedSnapshot.date = mover.date; mover.extractedSnapshot.start = mover.start; }
    if (target.extractedSnapshot) target.extractedSnapshot.start = target.start;
  }

  var API = {
    D: D, TODAY: TODAY, MONTHS: MONTHS, MON3: MON3, DOW3: DOW3, CATS: CATS, KINDS: KINDS, TYPE_LIST: TYPE_LIST, ICONS: ICONS, TODO: TODO,
    COURSE_NAMES: COURSE_NAMES, TYPE_GROUP: TYPE_GROUP, uid: uid,
    get state() { return state; },
    save: save,
    mergeConfirmed: mergeConfirmed,
    reset: function (mode) { var u = state.user; state = seed(mode); state.user = u; save(); },
    // back to the untouched demo, logged out, so the next page load starts the whole flow again
    restart: wipe,
    // A/B test version. Kept in localStorage (per device), not with the demo data, so it survives Restart demo and closing the tab.
    variant: function () {
      if (window.PLANORA_VARIANT === 'A' || window.PLANORA_VARIANT === 'B') return window.PLANORA_VARIANT;
      try { return localStorage.getItem('planora.variant') === 'B' ? 'B' : 'A'; } catch (e) { return 'A'; }
    },
    setVariant: function (v) {
      if (window.PLANORA_VARIANT === 'A' || window.PLANORA_VARIANT === 'B') return;
      try { localStorage.setItem('planora.variant', v === 'B' ? 'B' : 'A'); } catch (e) { /* ignore */ }
    },
    // auth
    login: function (email) { if (state.user.account !== 'demo') { state = seed('demo'); } state.user.loggedIn = true; if (email) { state.user.email = email; } save(); },
    signup: function (first, last, email) { state = seed('empty'); state.user.account = 'new'; state.user.name = (first + ' ' + last).trim(); state.user.email = email; state.user.loggedIn = true; save(); },
    logout: function () { state.user.loggedIn = false; save(); },
    initials: function () { var p = state.user.name.split(/\s+/); return ((p[0] || 'J')[0] + ((p[1] || '')[0] || '')).toUpperCase(); },
    firstName: function () { return state.user.name.split(/\s+/)[0]; },
    // events
    all: function () { return state.events; },
    deadlines: function () { return state.events.filter(function (e) { return e.cat !== 'timetable'; }); },
    get: function (id) { return state.events.filter(function (e) { return e.id === id; })[0] || null; },
    add: function (e) { state.events.push(e); log('Added “' + e.title + '”', 'add'); recheckClash(e, []); save(); return e; },
    update: function (id, patch) {
      var e = API.get(id); if (!e) return e;
      var progressLabels = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed' };
      var msg = 'progressStatus' in patch && patch.progressStatus !== API.progressOf(e) ? ['Set “' + e.title + '” to ' + progressLabels[patch.progressStatus], patch.progressStatus === 'completed' ? 'ok' : 'edit']
        : 'done' in patch && patch.done !== e.done ? (patch.done ? ['Marked “' + e.title + '” done', 'ok'] : ['Reopened “' + e.title + '”', 'edit'])
        : 'conflict' in patch && e.conflict && !patch.conflict ? ['Resolved the clash on “' + e.title + '”', 'ok'] : ['Updated “' + e.title + '”', 'edit'];
      var timing = !('conflict' in patch) && ['date', 'start', 'dur', 'allDay', 'tbd', 'cat', 'done', 'progressStatus'].some(function (k) { return k in patch; });
      var before = timing ? clashesOf(e) : null;
      for (var k in patch) e[k] = patch[k];
      log(msg[0], msg[1]);
      if (timing) recheckClash(e, before);
      save(); return e;
    },
    remove: function (id) { var e = API.get(id); state.events = state.events.filter(function (x) { return x.id !== id; }); if (e) log('Deleted “' + e.title + '”', 'del'); save(); },
    activity: function () { return state.activity || (state.activity = []); },
    log: function (t, icon) { log(t, icon); save(); },
    newEvent: function (o) {
      var kind = KINDS.filter(function (k) { return k.k === o.cat; })[0] || KINDS[0];
      var type = o.type || kind.type;
      var source = o.source || 'Added manually';
      return { id: uid(), date: o.date, start: o.start || '', dur: o.dur != null ? o.dur : (kind.k === 'exams' ? 2 : kind.k === 'timetable' ? 1 : 0),
        title: o.title, cat: o.cat, course: o.course || 'Other', type: type, weight: o.weight == null || o.weight === '' ? null : +o.weight,
        todo: TODO[type] || 'Added by you.', source: source, sourceCitations: (o.sourceCitations || []).map(function (c) { return cleanCitation(c, source); }),
        provenance: o.provenance || (source === 'Added manually' ? 'manual' : ''), status: 'verified', conflict: false, done: false, progressStatus: 'not_started', room: o.room || '', notes: o.notes || '' };
    },
    citationsOf: function (e) {
      if (e.provenance === 'manual' || e.source === 'Added manually') return [];
      var citations = Array.isArray(e.sourceCitations) ? e.sourceCitations : (e.sourceCitation ? [e.sourceCitation] : []);
      if (!citations.length && e.source) citations = [{ filename: e.source }];
      return citations.map(function (c) { return cleanCitation(c, e.source); }).filter(function (c) { return !!c.filename; });
    },
    progressOf: function (e) { return e.progressStatus || (e.done ? 'completed' : 'not_started'); },
    setProgress: function (id, progress, syncDone) {
      if (['not_started', 'in_progress', 'completed'].indexOf(progress) < 0) return API.get(id);
      var patch = { progressStatus: progress };
      if (syncDone) patch.done = progress === 'completed';
      return API.update(id, patch);
    },
    // A task's Done-section placement is a page-entry snapshot. Updating progress
    // does not move the row out from under the user; the next Tasks visit does.
    syncTaskSections: function () {
      var changed = false;
      API.deadlines().forEach(function (e) {
        var progress = API.progressOf(e), done = progress === 'completed';
        if (e.progressStatus !== progress) { e.progressStatus = progress; changed = true; }
        if (e.done !== done) { e.done = done; changed = true; }
      });
      if (changed) save();
    },
    statusOf: function (e) { return e.conflict ? 'conflict' : (e.status === 'check' ? 'check' : 'verified'); },
    conflictKindOf: function (e) {
      if (e.conflictType === 'schedule' || e.conflictType === 'information') return e.conflictType;
      var clash = clashesOf(e).some(function (other) { return other.conflict; });
      return clash ? 'schedule' : 'information';
    },
    badgeOf: function (e) { var s = API.statusOf(e); return s === 'conflict' ? { t: 'Conflict', c: 'danger' } : e.tbd ? { t: 'TBD', c: 'warn' } : s === 'check' ? { t: 'Check this', c: 'warn' } : { t: 'Verified', c: 'ok' }; },
    groupOf: function (e) { return TYPE_GROUP[e.type] || 'homework'; },
    iconOf: function (e) { return ICONS[e.type] || '📌'; },
    whenOf: function (e) {
      var t = e.allDay || !e.start ? '' : (e.start === '23:59' ? '11:59 PM' : D.time12(e.start));
      var verb = (e.cat === 'exams' || e.cat === 'timetable') ? '' : 'Due ';
      var diff = D.diff(e.date, TODAY);
      var day = diff === 0 ? (verb ? 'Due today' : 'Today') : diff === 1 ? (verb ? 'Due tomorrow' : 'Tomorrow') : verb + D.short(e.date);
      if (e.cat === 'exams' && e.type === 'Exam' && e.start && e.start === '10:00' && e.room) return D.short(e.date) + ', in class';
      return day + (t ? ', ' + t : '');
    },
    courses: function () {
      var set = {}; state.events.forEach(function (e) { if (e.course && e.course !== 'Other') set[e.course] = 1; });
      state.settings.extraCourses.forEach(function (c) { set[c] = 1; });
      return Object.keys(set).filter(function (c) { return state.settings.removedCourses.indexOf(c) < 0; }).sort();
    },
    conflicts: function () { return state.events.filter(function (e) { return e.conflict; }); },
    CLASH_GAP: CLASH_GAP,
    // events overlapping e; e may be a draft such as { id, date, start, dur, cat } for a slot being considered
    clashesOf: clashesOf,
    recheckClash: recheckClash,
    // flagged events bundled by overlap (A overlaps B, B overlaps C → one group), soonest first
    conflictGroups: function () {
      var left = API.conflicts().slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start || '') < (b.start || '') ? -1 : 1; }), groups = [];
      while (left.length) {
        var g = [left.shift()];
        for (var i = 0; i < g.length; i++) left = left.filter(function (o) { if (overlaps(g[i], o) || (o.date === g[i].date && (o.start || '') === (g[i].start || ''))) { g.push(o); return false; } return true; });
        groups.push(g);
      }
      return groups;
    },
    // review / fake extraction
    // fileNames: one name or a list of names; '' / [] uses the sample syllabus
    startExtraction: function (fileNames) {
      var names = (Array.isArray(fileNames) ? fileNames : [fileNames]).filter(Boolean);
      if (!names.length) names = [''];
      // first file gets the usual pool (CS301 on a fresh account, PHYS101 once there's data); a course code in a file name wins
      var used = {}, first = state.events.some(function (e) { return e.cat !== 'timetable'; }) ? 'PHYS101' : 'CS301';
      // courses already on the calendar go last so extra files don't duplicate existing deadlines
      var have = function (k) { return state.events.some(function (e) { return e.course === k && e.cat !== 'timetable'; }); };
      var all = [first].concat(POOL_ORDER.filter(function (k) { return k !== first; }));
      var order = all.filter(function (k) { return !have(k); }).concat(all.filter(have));
      var picks = names.map(function (n) {
        var hit = POOL_ORDER.filter(function (k) { return !used[k] && n.toUpperCase().indexOf(k) >= 0; })[0];
        var key = hit || order.filter(function (k) { return !used[k]; })[0] || order[0];
        used[key] = 1; return { name: n, pool: POOLS[key] };
      });
      var items = [], files = [];
      picks.forEach(function (pk, f) {
        var sourceFile = pk.name || pk.pool.file, count = 0;
        pk.pool.items.forEach(function (it, i) {
          var rawCitations = it.sourceCitations || (it.sourceCitation ? [it.sourceCitation] : [{ filename: sourceFile }]);
          var ev = API.newEvent({ title: it.title, cat: it.type === 'Exam' || it.type === 'Quiz' ? 'exams' : 'assignments', type: it.type, course: pk.pool.course, date: it.date, start: it.start, dur: it.dur || 0, weight: it.weight, source: sourceFile, sourceCitations: rawCitations, provenance: 'extracted' });
          ev.id = 'rv' + f + '-' + i + '-' + uid(); ev.status = it.ok ? 'verified' : 'check'; ev.note = it.note || ''; ev.sub = it.sub || '';
          ev.extractedSnapshot = { title: ev.title, date: ev.date, start: ev.start, type: ev.type, weight: ev.weight, course: ev.course };
          items.push(ev); count++;
        });
        files.push({ name: sourceFile, course: pk.pool.course, count: count });
      });
      ensureClash(items);
      state.review = { file: files.length === 1 ? files[0].name : files.length + ' files', files: files, items: items, committed: false };
      save(); return state.review;
    },
    reviewWhen: function (e) { return e.sub ? e.sub : whenText({ type: e.type, date: e.date, start: e.start }) + (e.weight ? ' · ' + e.course + ' · ' + e.weight + '%' : ' · ' + e.course); },
    commitReview: function () {
      var r = state.review; if (!r) return 0; var n = r.items.length;
      var added = r.items.map(function (e) { var c = JSON.parse(JSON.stringify(e)); c.id = uid(); delete c.sub; return c; });
      // flag clashes: two timed items (not classes, not 11:59 PM deadlines) at the same date and start time
      var timed = function (e) { return e.cat !== 'timetable' && e.start && e.start !== '23:59' && API.progressOf(e) !== 'completed'; };
      var clashes = 0;
      added.forEach(function (c) {
        if (!timed(c)) return;
        state.events.concat(added).forEach(function (o) {
          if (o === c || !timed(o) || !overlaps(c, o)) return;
          if (!c.conflict) clashes++;
          c.conflict = true; o.conflict = true;
        });
      });
      added.forEach(function (c) { state.events.push(c); });
      (r.files || [{ name: r.file }]).forEach(function (f) { log(f.name + ' uploaded', 'up'); }); log(n + ' deadlines added from ' + r.file, 'ok');
      if (clashes) { state.conflictAck = false; log(clashes + ' schedule conflict' + (clashes === 1 ? '' : 's') + ' found in ' + r.file, 'del'); }
      state.review = null; save(); return n;
    }
  };
  window.Planora = API;
})();
