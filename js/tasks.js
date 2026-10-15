(function () {
  var P = Planora, UI = PlUI, D = P.D, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('tasks');
  var ui = P.state.ui;
  function dateLabel(e) {
    var d = D.diff(e.date, P.TODAY);
    if (d < 0) return 'Overdue'; if (d === 0) return 'Today — ' + D.short(e.date); if (d === 1) return 'Tomorrow — ' + D.short(e.date);
    if (d <= 6) return 'This week'; if (d <= 20) return D.short(e.date); return 'Later';
  }
  function orderKey(l) { return l === 'Overdue' ? 0 : l.indexOf('Today') === 0 ? 1 : l.indexOf('Tomorrow') === 0 ? 2 : l === 'This week' ? 3 : l === 'Later' ? 9 : 4; }
  function render() {
    var all = P.deadlines(), sort = ui.taskSort || 'date';
    var h = '<div class="head-row"><h1>All tasks</h1>' + (all.length ? '<div class="seg-sm" role="group" aria-label="Sort">' + [['date', 'By date'], ['course', 'By course'], ['type', 'By type']].map(function (s) {
      return '<button type="button" data-s="' + s[0] + '" class="' + (sort === s[0] ? 'active' : '') + '">' + s[1] + '</button>'; }).join('') + '</div>' : '') + '</div>';
    if (!all.length) {
      $('view').innerHTML = h + '<div class="empty-state"><h2>No tasks yet</h2><p>Upload a syllabus and Planora will turn every deadline into a task here.</p><a class="btn btn-primary" href="upload.html">Upload a syllabus</a></div>'; return;
    }
    var open = all.filter(function (e) { return !e.done; }), done = all.filter(function (e) { return e.done; });
    var key = function (e) { return sort === 'course' ? e.course : sort === 'type' ? e.type : dateLabel(e); };
    var groups = {}; open.forEach(function (e) { (groups[key(e)] = groups[key(e)] || []).push(e); });
    var names = Object.keys(groups).sort(function (a, b) { return sort === 'date' ? (orderKey(a) - orderKey(b)) || a.localeCompare(b) : a.localeCompare(b); });
    var srt = function (a, b) { return (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')); };
    function row(e) {
      var sub = (e.date === '' ? '' : (sort === 'date' ? (e.start ? (e.start === '23:59' ? '11:59 PM' : D.time12(e.start)) : 'All day') : P.whenOf(e)));
      if (sort === 'date' && D.diff(e.date, P.TODAY) > 1) sub = D.short(e.date) + (e.start ? ', ' + (e.start === '23:59' ? '11:59 PM' : D.time12(e.start)) : '');
      if (e.status === 'check' && e.note && /unclear/.test(e.note)) sub = 'Due date unclear';
      var b = P.badgeOf(e);
      return '<div class="irow' + (e.done ? ' done' : '') + '"><button type="button" class="tick" data-id="' + e.id + '" aria-label="' + (e.done ? 'Mark not done: ' : 'Mark done: ') + UI.esc(e.title) + '" aria-pressed="' + !!e.done + '"><span class="tbox' + (e.done ? ' on' : '') + '">' + (e.done ? '✓' : '') + '</span></button>' +
        '<a class="row-main" href="' + UI.eventHref(e) + '"><span class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</span><span class="irow-body"><span class="irow-title d-block">' + UI.esc(e.title) + '</span><span class="irow-sub d-block"><span class="chip">' + e.course + '</span>' + UI.esc(sub) + '</span></span><span class="pbadge ' + b.c + '">' + b.t + '</span></a></div>';
    }
    names.forEach(function (n) { h += '<div class="group-label">' + UI.esc(n) + '</div><div class="list">' + groups[n].sort(srt).map(row).join('') + '</div>'; });
    if (!open.length) h += '<div class="empty-state mt-3"><h2>You\'re all caught up</h2><p>Nothing left to do.</p></div>';
    if (done.length) h += '<div class="group-label">Done</div><div class="list">' + done.sort(srt).map(row).join('') + '</div>';
    $('view').innerHTML = h;
    $('view').querySelectorAll('.tick').forEach(function (b) { b.onclick = function () { var e = P.get(b.dataset.id); P.update(e.id, { done: !e.done }); render(); }; });
    $('view').querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { ui.taskSort = b.dataset.s; P.save(); render(); }; });
  }
  render();
})();
