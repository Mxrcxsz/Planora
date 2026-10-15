/* Planora mock data store. Plain script, no build step; exposes window.Planora */
(function () {
  'use strict';
  var KEY = 'planora.v1';
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
  function wipe() { mem = null; state = seed('demo'); try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

  // ---------- extraction pools (fake syllabus reading) ----------
  var POOLS = {
    CS301: { file: 'CS301_Syllabus.pdf', items: [
      { title: 'Problem Set 1', type: 'Homework', date: '2025-09-10', start: '23:59', weight: 5, ok: true },
      { title: 'Problem Set 2', type: 'Homework', date: '2025-09-24', start: '23:59', weight: 5, ok: true },
      { title: 'Midterm Exam', type: 'Exam', date: '2025-10-28', start: '10:00', dur: 2, weight: 30, ok: true },
      { title: 'Reading response — Week 6', type: 'Reading', date: '2025-10-30', start: '23:59', weight: 3, ok: false, sub: 'Due date unclear in source text', note: 'The syllabus lists this under "ongoing weekly readings" without a specific date. Planora estimated Week 6 based on the course schedule — confirm or correct it.' },
      { title: 'Group project proposal', type: 'Project', date: '2025-11-03', start: '23:59', weight: 10, ok: true },
      { title: 'Final exam', type: 'Exam', date: '2025-12-12', start: '09:00', dur: 3, weight: null, ok: false, sub: 'Weight unclear — listed as "TBD%"', note: 'The syllabus lists the weight as "TBD%". Add it once your instructor confirms.' }
    ], course: 'CS301' },
    PHYS101: { file: 'PHYS101_Syllabus.pdf', items: [
      { title: 'Lab report 1', type: 'Homework', date: '2025-10-27', start: '23:59', weight: 8, ok: true },
      { title: 'Problem set — kinematics', type: 'Homework', date: '2025-10-30', start: '23:59', weight: 4, ok: true },
      { title: 'Quiz 2', type: 'Quiz', date: '2025-11-06', start: '11:00', dur: 1, weight: 6, ok: true },
      { title: 'Lab report 2', type: 'Homework', date: '2025-11-17', start: '23:59', weight: 8, ok: false, sub: 'Due date unclear in source text', note: 'The lab schedule shows "Week 12" with no date. Planora estimated Nov 17.' },
      { title: 'Midterm exam', type: 'Exam', date: '2025-11-20', start: '14:00', dur: 2, weight: 25, ok: true }
    ], course: 'PHYS101' }
  };

  function chipOf(it) { return it.type; }
  function whenText(it) {
    var s = (it.type === 'Exam' || it.type === 'Quiz' ? '' : 'Due ') + D.short(it.date);
    if (it.type === 'Exam' && !it.start) return s;
    if (it.start && it.start !== '23:59') s += ', ' + D.time12(it.start); else if (it.start === '23:59') s += ', 11:59 PM';
    return s;
  }

  var API = {
    D: D, TODAY: TODAY, MONTHS: MONTHS, MON3: MON3, DOW3: DOW3, CATS: CATS, KINDS: KINDS, TYPE_LIST: TYPE_LIST, ICONS: ICONS, TODO: TODO,
    COURSE_NAMES: COURSE_NAMES, TYPE_GROUP: TYPE_GROUP, uid: uid,
    get state() { return state; },
    save: save,
    reset: function (mode) { var u = state.user; state = seed(mode); state.user = u; save(); },
    // back to the untouched demo, logged out, so the next page load starts the whole flow again
    restart: wipe,
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
    add: function (e) { state.events.push(e); save(); return e; },
    update: function (id, patch) { var e = API.get(id); if (e) { for (var k in patch) e[k] = patch[k]; save(); } return e; },
    remove: function (id) { state.events = state.events.filter(function (e) { return e.id !== id; }); save(); },
    newEvent: function (o) {
      var kind = KINDS.filter(function (k) { return k.k === o.cat; })[0] || KINDS[0];
      var type = o.type || kind.type;
      return { id: uid(), date: o.date, start: o.start || '', dur: o.dur != null ? o.dur : (kind.k === 'exams' ? 2 : kind.k === 'timetable' ? 1 : 0),
        title: o.title, cat: o.cat, course: o.course || 'Other', type: type, weight: o.weight == null || o.weight === '' ? null : +o.weight,
        todo: TODO[type] || 'Added by you.', source: o.source || 'Added manually', status: 'verified', conflict: false, done: false, room: o.room || '', notes: o.notes || '' };
    },
    statusOf: function (e) { return e.conflict ? 'conflict' : (e.status === 'check' ? 'check' : 'verified'); },
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
    // review / fake extraction
    startExtraction: function (fileName) {
      var pool = state.events.some(function (e) { return e.cat !== 'timetable'; }) ? POOLS.PHYS101 : POOLS.CS301;
      var items = pool.items.map(function (it, i) {
        var ev = API.newEvent({ title: it.title, cat: it.type === 'Exam' || it.type === 'Quiz' ? 'exams' : 'assignments', type: it.type, course: pool.course, date: it.date, start: it.start, dur: it.dur || 0, weight: it.weight, source: fileName || pool.file });
        ev.id = 'rv' + i + '-' + uid(); ev.status = it.ok ? 'verified' : 'check'; ev.note = it.note || ''; ev.sub = it.sub || '';
        return ev;
      });
      state.review = { file: fileName || pool.file, items: items, committed: false };
      save(); return state.review;
    },
    reviewWhen: function (e) { return e.sub ? e.sub : whenText({ type: e.type, date: e.date, start: e.start }) + (e.weight ? ' · ' + e.course + ' · ' + e.weight + '%' : ' · ' + e.course); },
    commitReview: function () {
      var r = state.review; if (!r) return 0; var n = r.items.length;
      r.items.forEach(function (e) { var c = JSON.parse(JSON.stringify(e)); c.id = uid(); delete c.sub; state.events.push(c); });
      state.review = null; save(); return n;
    }
  };
  window.Planora = API;
})();
