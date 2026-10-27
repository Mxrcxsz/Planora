(function () {
  var P = Planora, UI = PlUI, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('upload');
  var r = P.state.review;
  // Review is shared by both prototypes. The controlled difference is the
  // conflict-resolution presentation, not extraction or confirmation logic.
  if (!r) { location.replace('upload.html'); return; }
  var allVerifiedShown = false;
  var citationModalEl = null, citationModal = null;
  var removeModalEl = null, removeModal = null, pendingRemoveId = null;
  var TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg>';

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
  function evidencePreview(e, c, index) {
    var location = citationLocation(c), samplePage = ((String(e.id || '').length + index * 3) % 7) + 2;
    var pageLabel = location || 'Page ' + samplePage;
    var when = P.D.long(e.date) + (e.start ? ' at ' + P.D.time12(e.start) : '');
    var weight = e.weight != null ? e.weight + '% of the final grade' : 'weight not specified';
    var excerpt = c.excerpt || e.title + ' is due ' + when + '. This ' + e.type.toLowerCase() + ' is worth ' + weight + '.';
    return {
      location: pageLabel,
      pageNumber: c.page || samplePage,
      pageTotal: Math.max((c.page || samplePage) + 4, 9),
      isSample: !c.excerpt,
      heading: (e.course || 'Course') + ' · Assessment schedule',
      excerpt: excerpt,
      before: 'Assessment dates and submission requirements are listed below. Submit all work through the course portal unless your instructor states otherwise.',
      after: 'Late submissions follow the policy in the course handbook. Any schedule changes will be announced during class and on the course portal.'
    };
  }
  function ensureCitationModal() {
    if (citationModalEl) return;
    citationModalEl = document.createElement('div');
    citationModalEl.className = 'modal fade'; citationModalEl.tabIndex = -1; citationModalEl.setAttribute('aria-labelledby', 'citationTitle'); citationModalEl.setAttribute('aria-hidden', 'true');
    citationModalEl.innerHTML = '<div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable citation-preview-dialog"><div class="modal-content citation-preview-content"><div class="modal-header citation-modal-header"><div><h2 class="modal-title fs-4" id="citationTitle">Source evidence</h2><p>Review the original context behind this extracted deadline.</p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body citation-modal-body p-0" id="citationBody"></div></div></div>';
    document.body.appendChild(citationModalEl); citationModal = new bootstrap.Modal(citationModalEl);
  }
  function showCitation(e, index) {
    var c = P.citationsOf(e)[index]; if (!c) return;
    ensureCitationModal();
    var type = c.fileType ? c.fileType.toUpperCase() : 'File', preview = evidencePreview(e, c, index);
    var when = P.D.long(e.date) + (e.start ? ' · ' + P.D.time12(e.start) : '');
    $('citationBody').innerHTML = '<div class="citation-pdf-toolbar"><div class="citation-toolbar-file"><span class="citation-pdf-icon" aria-hidden="true">PDF</span><div class="min-w-0"><div class="citation-toolbar-name">' + UI.esc(c.filename) + '</div><div>' + UI.esc(type + ' document') + '</div></div></div>' +
      '<div class="citation-toolbar-meta"><span>' + UI.esc('Page ' + preview.pageNumber + ' / ' + preview.pageTotal) + '</span><span>100%</span>' +
      (preview.isSample ? '<span class="citation-sample-badge">Prototype preview</span>' : '') + '</div></div>' +
      '<div class="citation-evidence-layout"><section class="citation-pdf-stage" aria-label="PDF document preview">' +
      '<div class="citation-document"><div class="citation-document-brand">' + UI.esc(e.course || 'Course') + '</div><div class="citation-document-course">' + UI.esc(preview.heading) + '</div><p>' + UI.esc(preview.before) + '</p>' +
      '<p class="citation-highlight"><span class="citation-match-label">Matched evidence</span>' + UI.esc(preview.excerpt) + '</p><p>' + UI.esc(preview.after) + '</p><div class="citation-page-number">' + UI.esc(preview.location) + '</div></div></section>' +
      '<aside class="citation-details"><div class="citation-section-head"><span>Information found</span></div>' +
      '<dl><div><dt>Assessment</dt><dd>' + UI.esc(e.title) + '</dd></div><div><dt>Due</dt><dd>' + UI.esc(when) + '</dd></div><div><dt>Course</dt><dd>' + UI.esc(e.course || 'Not specified') + '</dd></div><div><dt>Type</dt><dd>' + UI.esc(e.type) + '</dd></div>' +
      (e.weight != null ? '<div><dt>Weight</dt><dd>' + UI.esc(e.weight + '%') + '</dd></div>' : '') + '</dl>' +
      '<div class="citation-trust-note"><span aria-hidden="true">✓</span><div><b>Matched to this source</b><small>Planora found these details in the highlighted text.</small></div></div>' +
      (e.citationEdited ? '<div class="source-note"><b>Edited after extraction.</b> The source supports the originally extracted information.</div>' : '') +
      (preview.isSample ? '<p class="citation-prototype-note mb-0">Representative mock content for this prototype. The live product would display the exact uploaded PDF page.</p>' : '') + '</aside></div>';
    citationModal.show();
  }

  function ensureRemoveModal() {
    if (removeModalEl) return;
    removeModalEl = document.createElement('div'); removeModalEl.className = 'modal fade'; removeModalEl.tabIndex = -1;
    removeModalEl.setAttribute('aria-labelledby', 'reviewRemoveTitle'); removeModalEl.setAttribute('aria-hidden', 'true');
    removeModalEl.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header border-0 pb-0"><h2 class="modal-title fs-4" id="reviewRemoveTitle">Remove this date?</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"><p class="mb-2">“<b id="reviewRemoveName"></b>” won’t be added to your calendar or task list.</p><p class="small text-secondary mb-0">You can add it back later with “+ Add a missing date”.</p></div>' +
      '<div class="modal-footer border-0 pt-0"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Keep date</button><button type="button" class="btn btn-danger" id="reviewRemoveConfirm">Remove date</button></div></div></div>';
    document.body.appendChild(removeModalEl); removeModal = new bootstrap.Modal(removeModalEl);
    $('reviewRemoveConfirm').onclick = function () {
      var item = r.items.filter(function (i) { return i.id === pendingRemoveId; })[0]; if (!item) { removeModal.hide(); return; }
      r.items = r.items.filter(function (i) { return i.id !== item.id; }); P.state.review.items = r.items; P.save();
      pendingRemoveId = null; removeModal.hide(); render(); UI.toast('Removed “' + item.title + '”');
    };
  }
  function confirmRemove(item) {
    ensureRemoveModal(); pendingRemoveId = item.id; $('reviewRemoveName').textContent = item.title; removeModal.show();
  }

  function render() {
    var items = r.items, warn = items.filter(function (i) { return i.status === 'check'; }).length;
    var rows = items.map(function (e, i) {
      return '<div class="irow review-row" data-id="' + e.id + '"><div class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</div>' +
        '<div class="irow-body"><div class="irow-title">' + UI.esc(e.title) + '</div><div class="irow-sub"><span class="chip">' + UI.esc(e.type) + '</span>' + UI.esc(P.reviewWhen(e)) + '</div>' + citationMarkup(e) + '</div>' +
        '<span class="pbadge ' + (e.status === 'check' ? 'warn' : 'ok') + '">' + (e.status === 'check' ? 'Check this' : 'Verified') + '</span>' +
        '<div class="d-flex gap-1">' + (e.status === 'check' ? '<button type="button" class="icon-btn" data-act="ok" title="Confirm" aria-label="Confirm ' + UI.esc(e.title) + '">✓</button>' : '') +
        '<a class="icon-btn" href="' + UI.editHref(e, 'review') + '" title="Edit" aria-label="Edit ' + UI.esc(e.title) + '">✎</a>' +
        '<button type="button" class="icon-btn" data-act="rm" title="Remove" aria-label="Remove ' + UI.esc(e.title) + '">' + TRASH + '</button></div></div>';
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
      if (b.dataset.act === 'rm') { var item = r.items.filter(function (i) { return i.id === id; })[0]; if (item) confirmRemove(item); return; }
      P.state.review.items = r.items; P.save(); render();
    });
  }
  render();
})();
