(function () {
  var P = Planora, UI = PlUI, D = P.D, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('tasks');
  P.syncTaskSections();
  var ui = P.state.ui;
  var PROGRESS = [['not_started', 'Not Started'], ['in_progress', 'In Progress'], ['completed', 'Completed']];
  var TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg>';
  var deleteModalEl = null, deleteModal = null, pendingDeleteId = null;
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
  function addTask() {
    UI.eventForm({ heading: 'Add a task', saveLabel: 'Add task', cat: 'assignments', date: P.TODAY, source: 'Added manually',
      onSave: function (ev) { P.add(ev); render(); UI.toast('Added “' + ev.title + '”'); } });
  }
  function editTask(item) {
    UI.eventForm({ heading: 'Edit task', saveLabel: 'Save changes', cat: item.cat, title: item.title, date: item.date, time: item.start,
      course: item.course, weight: item.weight, room: item.room, notes: item.notes, source: item.source,
      onSave: function (ev) {
        var type = ev.cat === item.cat ? item.type : ev.type;
        P.update(item.id, { title: ev.title, cat: ev.cat, type: type, date: ev.date, start: ev.start, allDay: ev.allDay,
          course: ev.course, weight: ev.weight, room: ev.room, notes: ev.notes, todo: ev.cat === item.cat ? item.todo : ev.todo });
        render(); UI.toast('Updated “' + ev.title + '”');
      } });
  }
  function ensureDeleteModal() {
    if (deleteModalEl) return;
    deleteModalEl = document.createElement('div'); deleteModalEl.className = 'modal fade'; deleteModalEl.tabIndex = -1;
    deleteModalEl.setAttribute('aria-labelledby', 'taskDeleteTitle'); deleteModalEl.setAttribute('aria-hidden', 'true');
    deleteModalEl.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header border-0 pb-0"><h2 class="modal-title fs-4" id="taskDeleteTitle">Delete task?</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"><p class="mb-2">“<b id="taskDeleteName"></b>” will be removed from both your task list and calendar.</p><p class="small text-secondary mb-0">This action cannot be undone.</p></div>' +
      '<div class="modal-footer border-0 pt-0"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Keep task</button><button type="button" class="btn btn-danger" id="taskDeleteConfirm">Delete task</button></div></div></div>';
    document.body.appendChild(deleteModalEl); deleteModal = new bootstrap.Modal(deleteModalEl);
    $('taskDeleteConfirm').onclick = function () {
      var item = P.get(pendingDeleteId); if (!item) { deleteModal.hide(); return; }
      P.remove(item.id); pendingDeleteId = null; deleteModal.hide(); render(); UI.toast('Deleted “' + item.title + '”');
    };
  }
  function confirmDelete(item) {
    ensureDeleteModal(); pendingDeleteId = item.id; $('taskDeleteName').textContent = item.title; deleteModal.show();
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
      [['all', 'All Status']].concat(PROGRESS).map(function (s) { return '<option value="' + s[0] + '"' + (filter === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="btn btn-primary btn-sm ms-auto" id="addTask">+ Add task</button></div>';
    var visible = all.filter(function (e) { return filter === 'all' || P.progressOf(e) === filter; });
    var open = visible.filter(function (e) { return !e.done; }), done = visible.filter(function (e) { return e.done; });
    var key = function (e) { return sort === 'course' ? e.course : sort === 'type' ? e.type : dateLabel(e); };
    var groups = {}; open.forEach(function (e) { (groups[key(e)] = groups[key(e)] || []).push(e); });
    var names = Object.keys(groups).sort(function (a, b) { return sort === 'date' ? (orderKey(a) - orderKey(b)) || a.localeCompare(b) : a.localeCompare(b); });
    var srt = function (a, b) { return (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')); };
    function row(e) {
      var sub = (e.date === '' ? '' : (sort === 'date' ? (e.start ? (e.start === '23:59' ? '11:59 PM' : D.time12(e.start)) : 'All day') : P.whenOf(e)));
      if (sort === 'date' && D.diff(e.date, P.TODAY) > 1) sub = D.short(e.date) + (e.start ? ', ' + (e.start === '23:59' ? '11:59 PM' : D.time12(e.start)) : '');
      if (e.status === 'check' && e.note && /unclear/.test(e.note)) sub = 'Due date unclear';
      var progress = P.progressOf(e), options = PROGRESS.map(function (p) { return '<option value="' + p[0] + '"' + (progress === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('');
      return '<div class="irow task-row' + (e.done ? ' done' : '') + '"><a class="row-main" href="calendar.html?event=' + encodeURIComponent(e.id) + '"><span class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</span><span class="irow-body"><span class="irow-title d-block">' + UI.esc(e.title) + '</span><span class="irow-sub d-block"><span class="chip">' + UI.esc(e.course) + '</span>' + UI.esc(sub) + '</span></span></a>' +
        '<div class="task-controls d-flex align-items-center gap-2">' + verification(e) + '<label class="sr-only" for="progress-' + e.id + '">Progress for ' + UI.esc(e.title) + '</label><select class="form-select form-select-sm task-status" id="progress-' + e.id + '" data-id="' + e.id + '">' + options + '</select>' +
        '<div class="task-actions d-flex gap-1"><button type="button" class="icon-btn task-edit" data-id="' + e.id + '" title="Edit" aria-label="Edit ' + UI.esc(e.title) + '">✎</button><button type="button" class="icon-btn task-delete" data-id="' + e.id + '" title="Delete" aria-label="Delete ' + UI.esc(e.title) + '">' + TRASH + '</button></div></div></div>';
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
      var item = P.get(button.dataset.id); if (item) editTask(item);
    }; });
    $('view').querySelectorAll('.task-delete').forEach(function (button) { button.onclick = function () {
      var item = P.get(button.dataset.id); if (item) confirmDelete(item);
    }; });
    $('taskGroup').onchange = function () { ui.taskSort = $('taskGroup').value; P.save(); render(); };
    $('taskFilter').onchange = function () { ui.taskStatusFilter = $('taskFilter').value; P.save(); render(); };
    $('view').querySelectorAll('.verification-icon[data-bs-title]').forEach(function (el) { tooltips.push(new bootstrap.Tooltip(el, { container: 'body' })); });
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) { P.syncTaskSections(); render(); } });
  render();
})();
