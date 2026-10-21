(function () {
  var P = Planora, UI = PlUI, D = P.D, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('tasks');
  P.syncTaskSections();
  var ui = P.state.ui;
  var PROGRESS = [['not_started', 'Not Started'], ['in_progress', 'In Progress'], ['completed', 'Completed']];
  var editingId = null;
  var tooltips = [];
  function dateLabel(e) {
    var d = D.diff(e.date, P.TODAY);
    if (d < 0) return 'Overdue'; if (d === 0) return 'Today — ' + D.short(e.date); if (d === 1) return 'Tomorrow — ' + D.short(e.date);
    if (d <= 6) return 'This week'; if (d <= 20) return D.short(e.date); return 'Later';
  }
  function orderKey(l) { return l === 'Overdue' ? 0 : l.indexOf('Today') === 0 ? 1 : l.indexOf('Tomorrow') === 0 ? 2 : l === 'This week' ? 3 : l === 'Later' ? 9 : 4; }
  function verification(e) {
    var s = P.statusOf(e), kind = s === 'conflict' ? P.conflictKindOf(e) : '';
    var icon = s === 'verified' ? '✓' : s === 'check' ? '?' : '!';
    var tone = s === 'verified' ? 'ok' : s === 'check' ? 'warn' : 'danger';
    var detail = s === 'verified' ? 'Verified — Deadline information has been confirmed.'
      : s === 'check' ? 'Needs Review — The date or extracted information needs confirmation.'
      : kind === 'schedule' ? 'Conflict — This deadline overlaps with another scheduled event.'
      : 'Conflict — Source information contains a different deadline detail.';
    var attrs = ' class="verification-icon ' + tone + '" data-bs-placement="top" data-bs-custom-class="verification-tooltip" data-bs-title="' + detail + '" aria-label="' + detail + '"';
    if (s === 'verified') return '<span' + attrs + ' role="img" tabindex="0">' + icon + '</span>';
    var href = s === 'conflict' && kind === 'schedule' ? 'conflict.html?id=' + encodeURIComponent(e.id) : UI.editHref(e, 'tasks', 'review');
    return '<a' + attrs + ' href="' + href + '">' + icon + '</a>';
  }
  function taskHref(e) {
    var status = P.statusOf(e);
    return status === 'check' || (status === 'conflict' && P.conflictKindOf(e) === 'information') ? UI.editHref(e, 'tasks', 'review') : UI.eventHref(e);
  }
  function addTask() {
    UI.eventForm({ heading: 'Add a task', saveLabel: 'Add task', cat: 'assignments', date: P.TODAY, source: 'Added manually',
      onSave: function (ev) { P.add(ev); render(); UI.toast('Added “' + ev.title + '”'); } });
  }
  function render() {
    tooltips.forEach(function (tooltip) { tooltip.dispose(); }); tooltips = [];
    var all = P.deadlines(), sort = ui.taskSort || 'date', filter = ui.taskStatusFilter || 'all';
    var h = '<div class="head-row task-heading"><h1>All tasks</h1></div>';
    if (!all.length) {
      $('view').innerHTML = h + '<div class="empty-state"><h2>No tasks yet</h2><p>Add a task yourself, or upload a syllabus and Planora will find deadlines for you.</p><div class="d-flex justify-content-center gap-2 flex-wrap"><button type="button" class="btn btn-primary" id="emptyAddTask">Add a task</button><a class="btn btn-secondary" href="upload.html">Upload a syllabus</a></div></div>';
      $('emptyAddTask').onclick = addTask; return;
    }
    h += '<div class="task-toolbar" aria-label="Task list controls"><div class="task-filter-field"><label for="taskGroup">Group by</label><select class="form-select form-select-sm task-filter-select" id="taskGroup">' +
      [['date', 'Date'], ['course', 'Course'], ['type', 'Type']].map(function (s) { return '<option value="' + s[0] + '"' + (sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="task-filter-field"><label for="taskFilter">Status</label><select class="form-select form-select-sm task-filter-select" id="taskFilter">' +
      [['all', 'All statuses']].concat(PROGRESS).map(function (s) { return '<option value="' + s[0] + '"' + (filter === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="btn btn-primary btn-sm ms-auto" id="addTask">+ Add task</button></div>';
    var visible = all.filter(function (e) { return filter === 'all' || P.progressOf(e) === filter; });
    var open = visible.filter(function (e) { return !e.done; }), done = visible.filter(function (e) { return e.done; });
    var key = function (e) { return sort === 'course' ? e.course : sort === 'type' ? e.type : dateLabel(e); };
    var groups = {}; open.forEach(function (e) { (groups[key(e)] = groups[key(e)] || []).push(e); });
    var names = Object.keys(groups).sort(function (a, b) { return sort === 'date' ? (orderKey(a) - orderKey(b)) || a.localeCompare(b) : a.localeCompare(b); });
    var srt = function (a, b) { return (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')); };
    function editRow(e) {
      var types = P.TYPE_LIST.map(function (type) { return '<option' + (type === e.type ? ' selected' : '') + '>' + UI.esc(type) + '</option>'; }).join('');
      var progress = P.progressOf(e), progressOptions = PROGRESS.map(function (p) { return '<option value="' + p[0] + '"' + (progress === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('');
      var listId = 'edit-courses-' + e.id;
      return '<form class="irow task-edit-row" data-edit-row="' + UI.esc(e.id) + '" novalidate>' +
        '<div class="task-edit-grid">' +
        '<div class="task-edit-field task-edit-title"><label for="edit-title-' + e.id + '">Title</label><input class="form-control form-control-sm" id="edit-title-' + e.id + '" data-field="title" value="' + UI.esc(e.title) + '" required><div class="invalid-feedback">Add a title.</div></div>' +
        '<div class="task-edit-field"><label for="edit-course-' + e.id + '">Course</label><input class="form-control form-control-sm" id="edit-course-' + e.id + '" data-field="course" list="' + listId + '" value="' + UI.esc(e.course) + '"><datalist id="' + listId + '">' + P.courses().map(function (course) { return '<option value="' + UI.esc(course) + '">'; }).join('') + '</datalist></div>' +
        '<div class="task-edit-field"><label for="edit-type-' + e.id + '">Type</label><select class="form-select form-select-sm" id="edit-type-' + e.id + '" data-field="type">' + types + '</select></div>' +
        '<div class="task-edit-field"><label for="edit-date-' + e.id + '">Due date</label><input class="form-control form-control-sm" id="edit-date-' + e.id + '" data-field="date" type="date" value="' + e.date + '" required><div class="invalid-feedback">Pick a date.</div></div>' +
        '<div class="task-edit-field"><label for="edit-time-' + e.id + '">Due time</label><input class="form-control form-control-sm" id="edit-time-' + e.id + '" data-field="time" type="time" value="' + (e.start || '') + '"></div>' +
        '<div class="task-edit-field"><label for="edit-weight-' + e.id + '">Weight %</label><input class="form-control form-control-sm" id="edit-weight-' + e.id + '" data-field="weight" type="number" min="0" max="100" value="' + (e.weight == null ? '' : e.weight) + '"></div>' +
        '<div class="task-edit-field"><label for="edit-progress-' + e.id + '">Status</label><select class="form-select form-select-sm" id="edit-progress-' + e.id + '" data-field="progress">' + progressOptions + '</select></div>' +
        '</div><div class="task-edit-actions"><button type="button" class="btn btn-secondary btn-sm task-edit-cancel">Cancel</button><button type="submit" class="btn btn-primary btn-sm">Save</button></div></form>';
    }
    function row(e) {
      if (editingId === e.id) return editRow(e);
      var sub = (e.date === '' ? '' : (sort === 'date' ? (e.start ? (e.start === '23:59' ? '11:59 PM' : D.time12(e.start)) : 'All day') : P.whenOf(e)));
      if (sort === 'date' && D.diff(e.date, P.TODAY) > 1) sub = D.short(e.date) + (e.start ? ', ' + (e.start === '23:59' ? '11:59 PM' : D.time12(e.start)) : '');
      if (e.status === 'check' && e.note && /unclear/.test(e.note)) sub = 'Due date unclear';
      var progress = P.progressOf(e), options = PROGRESS.map(function (p) { return '<option value="' + p[0] + '"' + (progress === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('');
      return '<div class="irow task-row' + (e.done ? ' done' : '') + '"><a class="row-main" href="' + taskHref(e) + '"><span class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</span><span class="irow-body"><span class="irow-title d-block">' + UI.esc(e.title) + '</span><span class="irow-sub d-block"><span class="chip">' + UI.esc(e.course) + '</span>' + UI.esc(sub) + '</span></span></a>' +
        '<div class="task-controls d-flex align-items-center gap-2">' + verification(e) + '<label class="sr-only" for="progress-' + e.id + '">Progress for ' + UI.esc(e.title) + '</label><select class="form-select form-select-sm task-status" id="progress-' + e.id + '" data-id="' + e.id + '">' + options + '</select>' +
        '<div class="task-actions d-flex gap-1"><a class="icon-btn" href="calendar.html?event=' + encodeURIComponent(e.id) + '" title="View" aria-label="View ' + UI.esc(e.title) + '">↗</a><button type="button" class="icon-btn task-edit" data-id="' + e.id + '" title="Edit" aria-label="Edit ' + UI.esc(e.title) + '">✎</button><button type="button" class="icon-btn task-delete" data-id="' + e.id + '" title="Delete" aria-label="Delete ' + UI.esc(e.title) + '">✕</button></div></div></div>';
    }
    names.forEach(function (n) { h += '<div class="group-label">' + UI.esc(n) + '</div><div class="list">' + groups[n].sort(srt).map(row).join('') + '</div>'; });
    if (!open.length && !done.length) h += '<div class="empty-state mt-3"><h2>No matching tasks</h2><p>Try another status filter.</p></div>';
    else if (!open.length && filter === 'all') h += '<div class="empty-state mt-3"><h2>You\'re all caught up</h2><p>Nothing left to do.</p></div>';
    if (done.length) h += '<div class="group-label">Done</div><div class="list">' + done.sort(srt).map(row).join('') + '</div>';
    $('view').innerHTML = h;
    $('addTask').onclick = addTask;
    $('view').querySelectorAll('.task-status').forEach(function (select) { select.onchange = function () {
      P.setProgress(select.dataset.id, select.value, false); render();
    }; });
    $('view').querySelectorAll('.task-edit').forEach(function (button) { button.onclick = function () {
      editingId = button.dataset.id; render();
      var title = $('view').querySelector('[data-edit-row="' + editingId + '"] [data-field="title"]'); if (title) { title.focus(); title.select(); }
    }; });
    $('view').querySelectorAll('.task-edit-row').forEach(function (form) {
      form.querySelector('.task-edit-cancel').onclick = function () { editingId = null; render(); };
      form.onkeydown = function (event) { if (event.key === 'Escape') { event.preventDefault(); editingId = null; render(); } };
      form.onsubmit = function (event) {
        event.preventDefault();
        var item = P.get(form.dataset.editRow); if (!item) { editingId = null; render(); return; }
        var title = form.querySelector('[data-field="title"]'), date = form.querySelector('[data-field="date"]');
        title.classList.toggle('is-invalid', !title.value.trim()); date.classList.toggle('is-invalid', !date.value);
        if (!title.value.trim() || !date.value) return;
        var type = form.querySelector('[data-field="type"]').value, time = form.querySelector('[data-field="time"]').value;
        var progress = form.querySelector('[data-field="progress"]').value, weight = form.querySelector('[data-field="weight"]').value;
        var patch = { title: title.value.trim(), course: form.querySelector('[data-field="course"]').value.trim() || item.course,
          type: type, date: date.value, start: time, allDay: !time, weight: weight === '' ? null : +weight,
          progressStatus: progress, done: progress === 'completed' };
        if (type === 'Exam' || type === 'Quiz') patch.cat = 'exams';
        else if (type === 'Class') patch.cat = 'timetable';
        else if (item.cat === 'exams' || item.cat === 'timetable') patch.cat = type === 'Other' ? 'other' : 'assignments';
        P.update(item.id, patch); editingId = null; render(); UI.toast('Updated “' + patch.title + '”');
      };
    });
    $('view').querySelectorAll('.task-delete').forEach(function (button) { button.onclick = function () {
      var e = P.get(button.dataset.id); if (!e || !confirm('Delete "' + e.title + '"? It will also be removed from the calendar.')) return;
      P.remove(e.id); render(); UI.toast('Deleted “' + e.title + '”');
    }; });
    $('taskGroup').onchange = function () { ui.taskSort = $('taskGroup').value; P.save(); render(); };
    $('taskFilter').onchange = function () { ui.taskStatusFilter = $('taskFilter').value; P.save(); render(); };
    $('view').querySelectorAll('.verification-icon[data-bs-title]').forEach(function (el) { tooltips.push(new bootstrap.Tooltip(el, { container: 'body' })); });
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) { P.syncTaskSections(); render(); } });
  render();
})();
