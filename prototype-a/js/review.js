(function () {
  var P = Planora, UI = PlUI, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('upload');
  var r = P.state.review;
  // Review is shared by both prototypes. The controlled difference is the
  // conflict-resolution presentation, not extraction or confirmation logic.
  if (!r) { location.replace('upload.html'); return; }
  var allVerifiedShown = false;
  var citationModalEl = null, citationModal = null;

  function citationLocation(c) {
    var parts = [];
    if (c.page) parts.push('Page ' + c.page);
    if (c.slide) parts.push('Slide ' + c.slide);
    if (c.line) parts.push('Line ' + c.line);
    return parts.join(', ');
  }
  function citationText(c) { var location = citationLocation(c); return 'Source: ' + c.filename + (location ? ' · ' + location : ''); }
  function citationMarkup(e) {
    var citations = P.citationsOf(e);
    if (!citations.length) return '<div class="review-citation manual"><span aria-hidden="true">✎</span><span>Added manually — no AI source citation</span></div>';
    return '<div class="review-citations">' + citations.map(function (c, index) {
      var text = citationText(c);
      return '<button type="button" class="review-citation" data-cite="' + index + '" aria-label="Inspect ' + UI.esc(text) + '" title="Inspect source evidence"><span aria-hidden="true">⌕</span><span class="citation-label">' + UI.esc(text) + '</span>' + (e.citationEdited ? '<span class="citation-edited">Edited</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function ensureCitationModal() {
    if (citationModalEl) return;
    citationModalEl = document.createElement('div');
    citationModalEl.className = 'modal fade'; citationModalEl.tabIndex = -1; citationModalEl.setAttribute('aria-labelledby', 'citationTitle'); citationModalEl.setAttribute('aria-hidden', 'true');
    citationModalEl.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header border-0 pb-0"><h2 class="modal-title fs-4" id="citationTitle">Source evidence</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body" id="citationBody"></div></div></div>';
    document.body.appendChild(citationModalEl); citationModal = new bootstrap.Modal(citationModalEl);
  }
  function showCitation(e, index) {
    var c = P.citationsOf(e)[index]; if (!c) return;
    ensureCitationModal();
    var location = citationLocation(c), type = c.fileType ? c.fileType.toUpperCase() : 'File';
    $('citationBody').innerHTML = '<div class="citation-file"><span class="citation-file-icon" aria-hidden="true">📄</span><div class="min-w-0"><div class="fw-semibold text-break">' + UI.esc(c.filename) + '</div><div class="small text-secondary">' + UI.esc(type + (location ? ' · ' + location : ' · Exact location unavailable')) + '</div></div></div>' +
      (e.citationEdited ? '<div class="source-note mt-3"><b>Edited after extraction.</b> This source supports the originally extracted information, not necessarily the current assessment details.</div>' : '') +
      (c.excerpt ? '<div class="mt-3"><div class="form-label mb-1">Extracted source text</div><blockquote class="citation-excerpt mb-0">' + UI.esc(c.excerpt) + '</blockquote></div>' : '<p class="small text-secondary mt-3 mb-0">No source excerpt or precise location was retained. The filename is the available provenance.</p>');
    citationModal.show();
  }

  function render() {
    var items = r.items, warn = items.filter(function (i) { return i.status === 'check'; }).length;
    var rows = items.map(function (e, i) {
      return '<div class="irow review-row" data-id="' + e.id + '"><div class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</div>' +
        '<div class="irow-body"><div class="irow-title">' + UI.esc(e.title) + '</div><div class="irow-sub"><span class="chip">' + UI.esc(e.type) + '</span>' + UI.esc(P.reviewWhen(e)) + '</div>' + citationMarkup(e) + '</div>' +
        '<span class="pbadge ' + (e.status === 'check' ? 'warn' : 'ok') + '">' + (e.status === 'check' ? 'Check this' : 'Verified') + '</span>' +
        '<div class="d-flex gap-1">' + (e.status === 'check' ? '<button type="button" class="icon-btn" data-act="ok" title="Confirm" aria-label="Confirm ' + UI.esc(e.title) + '">✓</button>' : '') +
        '<a class="icon-btn" href="' + UI.editHref(e, 'review') + '" title="Edit" aria-label="Edit ' + UI.esc(e.title) + '">✎</a>' +
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
      UI.eventForm({ heading: 'Add a missing date', saveLabel: 'Add date', date: '', course: r.items[0] && r.items[0].course, source: 'Added manually',
        onSave: function (ev) { ev.id = 'rv-' + ev.id; ev.provenance = 'manual'; ev.sourceCitations = []; r.items.push(ev); P.save(); render(); UI.toast('Date added: ' + ev.title); } });
    };
    $('cancel').onclick = function () { P.state.review = null; P.save(); };
    $('go').onclick = function () {
      var ds = items.map(function (i) { return i.date; }).sort(), first = ds.filter(function (d) { return d >= P.TODAY; })[0] || ds[ds.length - 1], n = P.commitReview();
      UI.flash(n ? n + (n === 1 ? ' date' : ' dates') + ' added to your calendar' : 'Nothing added');
      location.href = 'calendar.html' + (first ? '?date=' + first : '');
    };
    $('list').addEventListener('click', function (ev) {
      var cite = ev.target.closest('[data-cite]');
      if (cite) { var cited = r.items.filter(function (item) { return item.id === cite.closest('.irow').dataset.id; })[0]; if (cited) showCitation(cited, +cite.dataset.cite); return; }
      var b = ev.target.closest('[data-act]'); if (!b) return; var id = b.closest('.irow').dataset.id;
      if (b.dataset.act === 'ok') r.items.forEach(function (i) { if (i.id === id) i.status = 'verified'; });
      if (b.dataset.act === 'rm') r.items = r.items.filter(function (i) { return i.id !== id; });
      P.state.review.items = r.items; P.save(); render();
    });
  }
  render();
})();
