/* Review page logic shared by both prototypes: mock deadlines, conflict rules, the edit and
   "still clash" modals, and the hand-off to the Calendar. Keep this file identical in
   prototype-a and prototype-b; only review.js (the layout) differs. Exposes window.PlReview */
(function () {
  var P = Planora, UI = PlUI, $ = function (id) { return document.getElementById(id); };

  // ---------- mock syllabus pages ----------
  // '# ' starts a heading, '> ' a muted paragraph; every other line is a paragraph.
  // The demo semester's own syllabi, so an upload finds the same deadlines that are preloaded.
  var PAGES = {
    cs: ['# Assessment',
      'Problem sets are released every second week. Problem Set 3 is due 21 Oct 2025 at 11:59 PM, worth 5%.',
      'Midterm Exam: 28 Oct 2025, 10:00 AM in LT 2-1, worth 30%. Covers Weeks 1–7.',
      '# Final',
      'The final exam date will be confirmed by the registrar.',
      '> Late problem sets lose 10% of their mark per day.'].join('\n'),
    math: ['# Quizzes and projects',
      'Pop quiz — chapters 4–5 on 28 Oct 2025 at 10:00 AM, worth 5%.',
      'Group project proposal due 3 Nov 2025, 10% of the grade.',
      '# Policies',
      '> Quizzes are held at the start of the lecture.'].join('\n'),
    eng: ['# Writing assignments',
      'Essay draft — Chapter 2 response: due 22 Oct 2025 by 9:00 AM, worth 10%.',
      'Paper 2 is due later in the term; details will follow in class.',
      '# Submission',
      '> Submit all drafts through the course portal.'].join('\n'),
    hist: ['# Coursework',
      'Primary source analysis due 31 Oct 2025 at 5:00 PM, worth 10%.',
      'Map quiz dates will be announced in lecture.',
      '# Referencing',
      '> All written work must include a bibliography.'].join('\n')
  };
  var FILES = {
    cs: { file: 'CS301_Syllabus.pdf', code: 'CS301', page: 2, pages: 6 },
    math: { file: 'MATH210_Syllabus.pdf', code: 'MATH210', page: 3, pages: 7 },
    eng: { file: 'ENG110_Syllabus.pdf', code: 'ENG110', page: 2, pages: 5 },
    hist: { file: 'HIST220_Syllabus.pdf', code: 'HIST220', page: 4, pages: 6 }
  };
  function src(key, matches) {
    var f = FILES[key];
    return { sourceFile: f.file, sourceCode: f.code, sourcePage: f.page, sourcePages: f.pages, sourceSnippet: PAGES[key], matches: matches };
  }
  // ids match the preloaded demo events (store.js seed), so confirming updates them instead of adding copies
  function deadline(id, course, title, date, start, dur, type, weight, source) {
    var d = { id: id, course: course, title: title, date: date, start: start, dur: dur, type: type, weight: weight, status: 'Verified' };
    for (var k in source) d[k] = source[k];
    return d;
  }
  // A fresh copy of the mock deadlines. One array drives both the list and the source text.
  function create() {
    var list = [
      deadline('ps3', 'CS301', 'Problem Set 3', '2025-10-21', '23:59', 0, 'Homework', 5, src('cs', ['21 Oct 2025', '5%'])),
      deadline('essay', 'ENG110', 'Essay draft — Chapter 2 response', '2025-10-22', '09:00', 0, 'Essay', 10, src('eng', ['22 Oct 2025', '10%'])),
      deadline('mid', 'CS301', 'Midterm Exam', '2025-10-28', '10:00', 2, 'Exam', 30, src('cs', ['Midterm Exam: 28 Oct 2025', '30%'])),
      deadline('quiz', 'MATH210', 'Pop quiz — chapters 4–5', '2025-10-28', '10:00', 1, 'Quiz', 5, src('math', ['28 Oct 2025', '5%'])),
      deadline('hist1', 'HIST220', 'Primary source analysis', '2025-10-31', '17:00', 0, 'Homework', 10, src('hist', ['31 Oct 2025', '10%'])),
      deadline('gpp', 'MATH210', 'Group project proposal', '2025-11-03', '23:59', 0, 'Project', 10, src('math', ['3 Nov 2025', '10%']))
    ];
    // Matched text ranges ([start, end] offsets into sourceSnippet). Each match is searched
    // after the previous one, so "25%" lands on the weight that follows its date.
    list.forEach(function (d) {
      var from = 0;
      d.ranges = d.matches.map(function (m) {
        var at = d.sourceSnippet.indexOf(m, from); if (at < 0) return null;
        from = at + m.length; return [at, from];
      }).filter(Boolean);
    });
    detect(list);
    return list;
  }
  // a date the tester adds by hand: no source file, nothing matched
  function manual(ev) {
    return deadline('m-' + ev.id, ev.course, ev.title, ev.date, ev.start, ev.dur, ev.type, ev.weight,
      { sourceFile: null, sourceCode: '', sourcePage: null, sourcePages: null, sourceSnippet: '', matches: [], ranges: [] });
  }

  // ---------- helpers ----------
  function name(d) { return d.course + ' ' + d.title; }
  function fmt(iso) { var x = P.D.parse(iso); return x.getDate() + ' ' + P.MON3[x.getMonth()] + ' ' + x.getFullYear(); }
  function fmtShort(iso) { var x = P.D.parse(iso); return x.getDate() + ' ' + P.MON3[x.getMonth()]; }
  function joinAnd(list) { return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }
  // the source line holding the first match: the sentence with the date and the weight
  function evidenceLine(d) {
    if (!d.sourceSnippet || !d.matches[0]) return '';
    var line = d.sourceSnippet.split('\n').filter(function (l) { return l.indexOf(d.matches[0]) >= 0; })[0] || '';
    return line.replace(/^(# |> )/, '');
  }

  // ---------- conflicts ----------
  // Two or more deadlines from different courses on the same date clash.
  function clashesOf(list, d) { return list.filter(function (o) { return o !== d && o.date === d.date && o.course !== d.course; }); }
  function detect(list) { list.forEach(function (d) { d.status = clashesOf(list, d).length ? 'Conflict' : 'Verified'; }); }
  function conflicted(list) { return list.filter(function (d) { return d.status === 'Conflict'; }); }
  // "2 items clash on 20 Oct" / "4 items still clash on 4 Oct and 20 Oct"
  function clashSummary(list, verb) {
    var bad = conflicted(list), dates = {};
    bad.forEach(function (d) { dates[d.date] = 1; });
    return bad.length + ' item' + (bad.length === 1 ? '' : 's') + ' ' + verb + ' on ' + joinAnd(Object.keys(dates).sort().map(fmtShort));
  }
  function footNote(list) { return conflicted(list).length ? clashSummary(list, 'clash') + '. Review them before you confirm.' : 'No clashes found. Everything is ready to confirm.'; }

  // ---------- edit modal (#rvsEditModal) ----------
  // onSaved runs after the item changes; it should re-render (rendering re-runs detection).
  function bindEditor(getList, onSaved) {
    var modal = new bootstrap.Modal($('rvsEditModal')), editing = null;
    $('rvsFType').innerHTML = P.TYPE_LIST.filter(function (t) { return t !== 'Class'; }).map(function (t) { return '<option>' + t + '</option>'; }).join('');
    $('rvsEditModal').addEventListener('shown.bs.modal', function () { $('rvsFTitle').focus(); });
    $('rvsEditForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var list = getList(), d = editing; if (!d) return;
      var title = $('rvsFTitle').value.trim(), date = $('rvsFDate').value, w = $('rvsFWeight').value.trim();
      var weightOk = w === '' || (+w >= 0 && +w <= 100);
      $('rvsFTitle').classList.toggle('is-invalid', !title);
      $('rvsFDate').classList.toggle('is-invalid', !date);
      $('rvsFWeight').classList.toggle('is-invalid', !weightOk);
      if (!title || !date || !weightOk) return;
      var before = conflicted(list).length;
      d.title = title; d.date = date; d.type = $('rvsFType').value; d.weight = w === '' ? null : +w;
      detect(list); modal.hide(); onSaved(d);
      var after = conflicted(list).length;
      UI.toast(after < before ? 'Saved. ' + (after ? clashSummary(list, 'still clash') + '.' : 'No clashes left.') : after > before ? 'Saved. This date now clashes with another course.' : 'Saved changes to ' + name(d));
    });
    return function open(d) {
      if (!d) return; editing = d;
      $('rvsEditTitle').textContent = 'Edit ' + name(d);
      $('rvsFTitle').value = d.title; $('rvsFDate').value = d.date;
      if (P.TYPE_LIST.indexOf(d.type) < 0 || d.type === 'Class') $('rvsFType').insertAdjacentHTML('beforeend', '<option>' + UI.esc(d.type) + '</option>');
      $('rvsFType').value = d.type;
      $('rvsFWeight').value = d.weight == null ? '' : d.weight;
      ['rvsFTitle', 'rvsFDate', 'rvsFWeight'].forEach(function (f) { $(f).classList.remove('is-invalid'); });
      modal.show();
    };
  }

  // ---------- confirm (#rvsClashModal) ----------
  // later: the tester chose "Review later", so the clash goes on the calendar flagged for later
  function commit(list, later) {
    var events = list.map(function (d) {
      var type = d.type, cat = type === 'Exam' || type === 'Quiz' ? 'exams' : type === 'Other' ? 'other' : 'assignments';
      var ev = d.sourceFile
        ? P.newEvent({ title: d.title, cat: cat, type: type, course: d.course, date: d.date, start: d.start, dur: d.dur, weight: d.weight, source: d.sourceFile,
          sourceCitations: [{ filename: d.sourceFile, page: d.sourcePage, excerpt: evidenceLine(d) }], provenance: 'extracted' })
        : P.newEvent({ title: d.title, cat: cat, type: type, course: d.course, date: d.date, start: d.start, dur: d.dur, weight: d.weight, source: 'Added manually' });
      ev.id = d.id; // same id as the preloaded event, so store.js updates it rather than adding a copy
      if (!d.start) ev.allDay = true;
      ev.conflict = d.status === 'Conflict';
      return ev;
    });
    var files = Object.keys(list.reduce(function (acc, d) { if (d.sourceFile) acc[d.sourceFile] = 1; return acc; }, {}));
    // Hand-off to the Calendar: store.js picks these up from localStorage on the next page load.
    try { localStorage.setItem(window.PLANORA_CONFIRMED_KEY, JSON.stringify({ files: files, events: events })); }
    catch (e) { P.mergeConfirmed(files, events); } // storage blocked: merge directly
    P.state.review = null; P.save();
    var saved = events.length + (events.length === 1 ? ' deadline' : ' deadlines');
    UI.flash(!events.length ? 'Nothing added' : later ? saved + ' added. The clash is flagged on your calendar to review later.' : saved + ' confirmed on your calendar');
    // open on today (or the first upcoming deadline), not on the earliest date in the list
    var dates = list.map(function (d) { return d.date; }).sort(), upcoming = dates.filter(function (d) { return d >= P.TODAY; })[0];
    location.href = 'calendar.html?date=' + (upcoming || dates[dates.length - 1] || P.TODAY);
  }
  // Confirming stays possible with clashes left: some (exam timings, say) can't be fixed on the
  // spot, so the tester can resolve now or add everything and review the clash later.
  // onReview(firstClashingItem) runs once the modal has closed after "Resolve now".
  function bindConfirm(button, getList, onReview) {
    var modal = new bootstrap.Modal($('rvsClashModal'));
    button.addEventListener('click', function () {
      var list = getList();
      if (!conflicted(list).length) { commit(list); return; }
      $('rvsClashMsg').textContent = clashSummary(list, 'still clash') + '. Add them now and sort it out later?';
      modal.show();
    });
    $('rvsReviewLater').onclick = function () { modal.hide(); commit(getList(), true); };
    $('rvsResolveNow').onclick = function () {
      var first = conflicted(getList())[0];
      $('rvsClashModal').addEventListener('hidden.bs.modal', function () { if (first) onReview(first); }, { once: true });
      modal.hide();
    };
  }

  window.PlReview = {
    create: create, manual: manual, name: name, fmt: fmt, evidenceLine: evidenceLine,
    clashesOf: clashesOf, detect: detect, conflicted: conflicted, clashSummary: clashSummary, footNote: footNote,
    bindEditor: bindEditor, bindConfirm: bindConfirm, commit: commit
  };
})();
