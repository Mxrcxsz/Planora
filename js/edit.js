(function () {
  var P = Planora, UI = PlUI, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('upload');
  var id = UI.qs('id'), from = UI.qs('from') || 'event';
  var inReview = from === 'review', item = null;
  if (inReview) item = (P.state.review ? P.state.review.items : []).filter(function (e) { return e.id === id; })[0];
  else item = P.get(id);
  if (!item) { $('view').innerHTML = '<h1>Deadline not found</h1><p class="muted">It may have been removed.</p><a class="btn btn-primary" href="dashboard.html">Back to dashboard</a>'; return; }
  var back = inReview ? 'review.html' : from === 'tasks' ? 'tasks.html' : from === 'dashboard' ? 'dashboard.html' : from === 'conflict' ? 'conflict.html' : 'calendar.html?event=' + encodeURIComponent(item.id);
  $('crumb').innerHTML = '<a href="dashboard.html">Dashboard</a> / ' + (inReview ? '<a href="review.html">Review</a>' : '<a href="calendar.html">Calendar</a>') + ' / Edit deadline';
  var b = P.badgeOf(item);
  var types = P.TYPE_LIST.map(function (t) { return '<option' + (t === item.type ? ' selected' : '') + '>' + t + '</option>'; }).join('');
  $('view').innerHTML =
    '<div class="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap"><h1 class="mb-0" style="font-size:1.75rem">' + UI.esc(item.title) + '</h1><span class="pbadge ' + b.c + '">' + b.t + '</span></div>' +
    '<form id="f" novalidate>' +
    '<div class="mb-3"><label class="form-label" for="title">Title</label><input class="form-control" id="title" value="' + UI.esc(item.title) + '"><div class="invalid-feedback">Add a title.</div></div>' +
    '<div class="row g-3 mb-3"><div class="col-sm-6"><label class="form-label" for="date">Due date</label><input class="form-control" id="date" type="date" value="' + item.date + '"><div class="invalid-feedback">Pick a date.</div></div>' +
    '<div class="col-sm-6"><label class="form-label" for="time">Due time</label><input class="form-control" id="time" type="time" value="' + (item.start || '') + '"></div></div>' +
    '<div class="row g-3 mb-3"><div class="col-sm-6"><label class="form-label" for="course">Course</label><input class="form-control" id="course" list="courses" value="' + UI.esc(item.course) + '"><datalist id="courses">' + P.courses().map(function (c) { return '<option value="' + c + '">'; }).join('') + '</datalist></div>' +
    '<div class="col-sm-6"><label class="form-label" for="type">Type</label><select class="form-select" id="type">' + types + '</select></div></div>' +
    '<div class="row g-3 mb-3"><div class="col-sm-6"><label class="form-label" for="w">Weightage % <span class="opt">(optional)</span></label><input class="form-control" id="w" type="number" min="0" max="100" value="' + (item.weight == null ? '' : item.weight) + '" placeholder="e.g. 20"></div></div>' +
    '<div class="mb-3"><label class="form-label" for="notes">Notes</label><textarea class="form-control" id="notes" rows="3" placeholder="Add any extra detail...">' + UI.esc(item.notes || '') + '</textarea></div>' +
    (item.note ? '<div class="source-note mb-3"><b>Why this needs a check:</b> ' + UI.esc(item.note) + '</div>' : '') +
    '<div class="d-flex justify-content-between gap-2 flex-wrap mt-4"><button type="button" class="btn btn-danger-soft" id="rm">Remove</button>' +
    '<div class="d-flex gap-2"><a class="btn btn-secondary" href="' + back + '">Cancel</a><button class="btn btn-primary" type="submit">Save and mark verified</button></div></div></form>';
  $('f').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('title').value.trim(), d = $('date').value;
    $('title').classList.toggle('is-invalid', !t); $('date').classList.toggle('is-invalid', !d);
    if (!t || !d) return;
    var time = $('time').value, type = $('type').value;
    var patch = { title: t, date: d, start: time, allDay: !time, course: $('course').value.trim() || item.course, type: type, weight: $('w').value === '' ? null : +$('w').value, notes: $('notes').value.trim(), status: 'verified', note: '', sub: '' };
    if (type === 'Exam' || type === 'Quiz') patch.cat = 'exams'; else if (type === 'Class') patch.cat = 'timetable'; else if (item.cat === 'exams' || item.cat === 'timetable') patch.cat = type === 'Other' ? 'other' : 'assignments';
    for (var k in patch) item[k] = patch[k];
    P.save(); UI.flash('Saved and marked verified'); location.href = back;
  });
  $('rm').addEventListener('click', function () {
    if (!confirm('Remove "' + item.title + '"?')) return;
    if (inReview) P.state.review.items = P.state.review.items.filter(function (e) { return e.id !== item.id; }); else P.remove(item.id);
    P.save(); UI.flash('Removed “' + item.title + '”'); location.href = inReview ? 'review.html' : 'calendar.html';
  });
})();
