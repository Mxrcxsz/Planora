(function () {
  var P = Planora, UI = PlUI, D = P.D, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('dashboard');
  var OPTS = [
    { title: 'Keep both, just flag the clash', text: 'Both stay on your calendar with a conflict badge, so you remember to sort it out with your instructors.', done: 'Both deadlines stay on your calendar, marked as a clash.' },
    { title: 'Move the quiz to a reminder-only entry', text: 'Keeps the quiz visible but off your real schedule, so the exam takes priority.', done: 'The quiz is now a reminder. The exam keeps its slot.' },
    { title: 'Dismiss — I\'ve already sorted this out', text: 'Removes the conflict warning without changing either deadline.', done: 'The conflict warning is gone. Both deadlines are unchanged.' }
  ];
  var choice = 0, saved = false, doneText = '';
  var group = P.conflicts().slice(0, 2);
  function render() {
    if (group.length < 2 && !saved) {
      $('view').innerHTML = '<div class="empty-state"><h2>No conflicts right now</h2><p>Nothing on your calendar clashes. Planora will flag it here if that changes.</p><a class="btn btn-primary" href="dashboard.html">Back to dashboard</a></div>'; return;
    }
    var a = group[0], b = group[1];
    var card = function (e) { return '<div class="vs-card"><span class="chip">' + UI.esc(e.course) + '</span><h3>' + UI.esc(e.title) + '</h3><div class="muted">' + D.short(e.date) + ', ' + D.time12(e.start) + ' — ' + (e.room ? 'in class' : 'in class') + '</div></div>'; };
    var h = '<div class="banner-warn mb-3"><span aria-hidden="true">⚠</span><div><b>Two deadlines land at the same time</b><span>You can\'t be in two places at once — decide how to handle this.</span></div></div>' +
      '<div class="vs-row">' + card(a) + '<div class="vs-mid">vs</div>' + card(b) + '</div>';
    if (saved) {
      h += '<div class="pcard p-4 d-flex gap-3"><div class="state-icon ok flex-shrink-0 m-0" aria-hidden="true">✓</div><div><b>Choice saved</b><p class="muted mb-3">' + UI.esc(doneText) + '</p><div class="d-flex gap-2 flex-wrap"><a class="btn btn-primary" href="dashboard.html">Back to dashboard</a><a class="btn btn-secondary" href="calendar.html?date=' + a.date + '">View calendar</a></div></div></div>';
    } else {
      h += '<div role="radiogroup" aria-label="How to handle this conflict">' + OPTS.map(function (o, i) {
        return '<button type="button" role="radio" aria-checked="' + (i === choice) + '" class="option' + (i === choice ? ' selected' : '') + '" data-i="' + i + '"><span class="rdot"></span><span><b>' + o.title + '</b><p>' + o.text + '</p></span></button>'; }).join('') + '</div>' +
        '<div class="d-flex justify-content-end gap-2 mt-3"><a class="btn btn-secondary" href="dashboard.html">Back to dashboard</a><button type="button" class="btn btn-primary" id="save">Save choice</button></div>';
    }
    $('view').innerHTML = h;
    $('view').querySelectorAll('[data-i]').forEach(function (b2) { b2.onclick = function () { choice = +b2.dataset.i; render(); }; });
    if ($('save')) $('save').onclick = function () {
      var x = group[0], y = group[1];
      if (choice === 0) { P.state.conflictAck = true; }
      if (choice === 1) { var q = x.type === 'Quiz' ? x : y, ex = q === x ? y : x; P.update(q.id, { cat: 'other', type: 'Reminder', conflict: false, dur: 0 }); P.update(ex.id, { conflict: false }); }
      if (choice === 2) { P.update(x.id, { conflict: false }); P.update(y.id, { conflict: false }); }
      P.save(); saved = true; doneText = OPTS[choice].done; render();
    };
  }
  render();
})();
