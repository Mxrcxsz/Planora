(function () {
  var P = Planora, UI = PlUI, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('upload');
  var r = P.state.review;
  // A/B test: this file is version A. Version B registers window.PlReviewB (from its own script, loaded before this one) and takes over.
  if (r && P.variant() === 'B' && typeof window.PlReviewB === 'function') { window.PlReviewB(r); return; }
  if (!r) { location.replace('upload.html'); return; }
  var allVerifiedShown = false;

  function render() {
    var items = r.items, warn = items.filter(function (i) { return i.status === 'check'; }).length;
    var rows = items.map(function (e, i) {
      return '<div class="irow" data-id="' + e.id + '"><div class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</div>' +
        '<div class="irow-body"><div class="irow-title">' + UI.esc(e.title) + '</div><div class="irow-sub"><span class="chip">' + UI.esc(e.type) + '</span>' + UI.esc(P.reviewWhen(e)) + '</div></div>' +
        '<span class="pbadge ' + (e.status === 'check' ? 'warn' : 'ok') + '">' + (e.status === 'check' ? 'Check this' : 'Verified') + '</span>' +
        '<div class="d-flex gap-1">' + (e.status === 'check' ? '<button type="button" class="icon-btn" data-act="ok" title="Confirm" aria-label="Confirm ' + UI.esc(e.title) + '">✓</button>' : '') +
        '<a class="icon-btn" href="edit.html?id=' + encodeURIComponent(e.id) + '&from=review" title="Edit" aria-label="Edit ' + UI.esc(e.title) + '">✎</a>' +
        '<button type="button" class="icon-btn" data-act="rm" title="Remove" aria-label="Remove ' + UI.esc(e.title) + '">✕</button></div></div>';
    }).join('');
    $('view').innerHTML =
      '<div class="head-row" style="padding-top:8px"><div><h1>Review what Planora found</h1><p>From ' + UI.esc(r.file) + ' — ' + items.length + ' dates detected. Confirm each one, or fix anything marked uncertain.</p></div></div>' +
      '<div class="d-flex align-items-center gap-2 flex-wrap mb-3"><span class="pbadge ok">' + (items.length - warn) + ' verified</span>' +
      (warn ? '<span class="pbadge warn">' + warn + ' need a check</span><button type="button" class="btn-link-ink ms-1" id="all">Confirm all</button>' : (items.length ? '<span class="small fw-semibold" style="color:var(--ok-fg)">All verified ✓</span>' : '')) + '</div>' +
      '<div class="list" id="list">' + (rows || '<div class="irow"><div class="irow-body muted">Nothing left to review.</div></div>') + '</div>' +
      '<button type="button" class="add-row" id="add">+ Add a missing date</button>' +
      '<div class="d-flex justify-content-end gap-2 mt-4"><a class="btn btn-secondary" href="upload.html" id="cancel">Cancel</a><button type="button" class="btn btn-primary" id="go">' +
      (items.length === 0 ? 'Continue' : 'Add ' + items.length + (items.length === 1 ? ' date' : ' dates') + ' to my calendar') + '</button></div>';
    if ($('all')) $('all').onclick = function () { items.forEach(function (i) { i.status = 'verified'; }); P.save(); render(); };
    $('add').onclick = function () {
      UI.eventForm({ heading: 'Add a missing date', saveLabel: 'Add date', date: '', course: r.items[0] && r.items[0].course, source: r.file,
        onSave: function (ev) { ev.id = 'rv-' + ev.id; r.items.push(ev); P.save(); render(); UI.toast('Date added: ' + ev.title); } });
    };
    $('cancel').onclick = function () { P.state.review = null; P.save(); };
    $('go').onclick = function () {
      var ds = items.map(function (i) { return i.date; }).sort(), first = ds.filter(function (d) { return d >= P.TODAY; })[0] || ds[ds.length - 1], n = P.commitReview();
      UI.flash(n ? n + (n === 1 ? ' date' : ' dates') + ' added to your calendar' : 'Nothing added');
      location.href = 'calendar.html' + (first ? '?date=' + first : '');
    };
    $('list').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return; var id = b.closest('.irow').dataset.id;
      if (b.dataset.act === 'ok') r.items.forEach(function (i) { if (i.id === id) i.status = 'verified'; });
      if (b.dataset.act === 'rm') r.items = r.items.filter(function (i) { return i.id !== id; });
      P.state.review.items = r.items; P.save(); render();
    });
  }
  render();
})();
