(function () {
  var P = Planora, UI = PlUI, D = P.D, esc = UI.esc, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('dashboard');
  // A/B test: this file is version B; version A lives in conflict-a.js
  if (P.variant() === 'A' && typeof window.PlConflictA === 'function') { window.PlConflictA(); return; }
  var group = P.conflicts().slice(0, 2);
  var editing = null, done = null; // editing: id of the card showing the date picker; done: { title, text } once handled
  var WARN_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
  var when = function (e) { return D.short(e.date) + ' ' + D.parse(e.date).getFullYear() + ', ' + D.time12(e.start); };
  var name = function (e) { return e.course + ' ' + e.title; };

  function card(e) {
    var actions = editing === e.id
      ? '<div class="cf-resched"><label class="form-label" for="nd-' + e.id + '">New date and time</label>' +
        '<div class="d-flex gap-2"><input class="form-control" type="date" id="nd-' + e.id + '" value="' + e.date + '"><input class="form-control" type="time" id="nt-' + e.id + '" value="' + (e.start || '09:00') + '" aria-label="New time"></div>' +
        '<div class="invalid-feedback" id="nerr-' + e.id + '">Pick a different date or time from the other deadline.</div>' +
        '<div class="d-flex gap-2 mt-2"><button type="button" class="btn btn-secondary btn-sm flex-fill" data-act="cancel">Cancel</button><button type="button" class="btn btn-primary btn-sm flex-fill" data-act="move" data-id="' + e.id + '">Save new date</button></div></div>'
      : '<div class="d-grid gap-2"><button type="button" class="btn btn-secondary btn-sm" data-act="edit" data-id="' + e.id + '">Select new date</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="tbd" data-id="' + e.id + '">Mark as “TBD” (rescheduling)</button></div>';
    return '<article class="cf-card" aria-label="' + esc(name(e)) + '"><div><span class="cf-type">' + esc(e.type) + '</span>' +
      '<h3>' + esc(e.course) + '</h3><div class="cf-title">' + esc(e.title) + '</div>' +
      '<dl class="cf-meta"><div><dt>Date</dt><dd>' + when(e) + '</dd></div>' + (e.weight ? '<div><dt>Weightage</dt><dd>' + e.weight + '%</dd></div>' : '') +
      (e.room ? '<div><dt>Room</dt><dd>' + esc(e.room) + '</dd></div>' : '') + '</dl></div>' +
      '<div class="cf-actions">' + actions + '</div></article>';
  }

  function render() {
    if (group.length < 2) {
      $('view').innerHTML = '<div class="empty-state"><h2>No conflicts right now</h2><p>Nothing on your calendar clashes. Planora will flag it here if that changes.</p><a class="btn btn-primary" href="dashboard.html">Back to dashboard</a></div>'; return;
    }
    var a = group[0], b = group[1];
    if (done) {
      $('view').innerHTML = '<section class="cf-box cf-done"><div class="cf-head"><span class="cf-icon ok" aria-hidden="true">✓</span><div><h2>' + esc(done.title) + '</h2><p>' + esc(done.text) + '</p></div></div>' +
        '<div class="d-flex gap-2 flex-wrap"><a class="btn btn-primary" href="dashboard.html">Back to dashboard</a><a class="btn btn-secondary" href="calendar.html?date=' + done.date + '">View calendar</a></div></section>';
      return;
    }
    $('view').innerHTML = '<section class="cf-box" aria-labelledby="cfTitle">' +
      '<div class="cf-head"><span class="cf-icon" aria-hidden="true">' + WARN_SVG + '</span><div><h2 id="cfTitle">Schedule conflict detected</h2>' +
      '<p>' + D.long(a.date) + ' · ' + esc(name(a)) + ' and ' + esc(name(b)) + ' are both at ' + D.time12(a.start) + '.</p></div></div>' +
      '<div class="cf-grid">' + card(a) + card(b) + '</div>' +
      '<div class="cf-later"><p>Or handle this conflict later:</p><div class="d-flex align-items-center gap-3 flex-wrap">' +
      '<a class="cf-link" href="dashboard.html">Review later</a><button type="button" class="btn btn-neutral btn-sm" data-act="keep">Keep both (acknowledge clash)</button></div></div></section>';
  }

  function finish(title, text, date) { P.save(); done = { title: title, text: text, date: date }; editing = null; render(); }
  var other = function (id) { return group[0].id === id ? group[1] : group[0]; };
  var acts = {
    edit: function (t) { editing = t.dataset.id; render(); var d = $('nd-' + editing); if (d) d.focus(); },
    cancel: function () { editing = null; render(); },
    move: function (t) {
      var e = P.get(t.dataset.id), o = other(e.id), d = $('nd-' + e.id), tm = $('nt-' + e.id);
      if (!d.value || !tm.value || (d.value === o.date && tm.value === o.start)) { d.classList.add('is-invalid'); tm.classList.add('is-invalid'); $('nerr-' + e.id).style.display = 'block'; return; }
      P.update(e.id, { date: d.value, start: tm.value, conflict: false, tbd: false }); P.update(o.id, { conflict: false });
      finish('Rescheduled', name(e) + ' moved to ' + D.long(d.value) + ', ' + D.time12(tm.value) + '. ' + name(o) + ' keeps its slot.', d.value);
    },
    tbd: function (t) {
      var e = P.get(t.dataset.id), o = other(e.id);
      P.update(e.id, { tbd: true, conflict: false }); P.update(o.id, { conflict: false });
      finish('Marked as TBD', name(e) + ' is marked TBD while it’s rescheduled. ' + name(o) + ' keeps its slot.', e.date);
    },
    keep: function () {
      P.state.conflictAck = true;
      finish('Clash acknowledged', 'Both deadlines stay on your calendar, marked as a clash.', group[0].date);
    }
  };
  $('view').addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]'); if (t && acts[t.dataset.act]) acts[t.dataset.act](t);
  });
  render();
})();
