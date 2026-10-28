(function () {
  var P = Planora, UI = PlUI, R = PlReview, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('upload');
  // Prototype B: the card list. Data, conflict rules, editing and confirming come from
  // review-core.js (shared with Prototype A), so only the layout differs between the two.
  var items = R.create();
  var citationModalEl = null, citationModal = null;
  var removeModalEl = null, removeModal = null, pendingRemoveId = null;
  var TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg>';

  function byId(id) { return items.filter(function (i) { return i.id === id; })[0] || null; }
  function citationOf(e) { return e.sourceFile ? { filename: e.sourceFile, fileType: 'pdf', page: e.sourcePage, excerpt: R.evidenceLine(e) } : null; }
  function citationText(c) { return 'Source: ' + c.filename + (c.page ? ' · Page ' + c.page : ''); }
  function citationMarkup(e) {
    var c = citationOf(e);
    if (!c) return '<div class="review-citation manual"><span aria-hidden="true">✎</span><span>Added manually — no AI source citation</span></div>';
    var text = citationText(c);
    return '<div class="review-citations"><button type="button" class="review-citation" data-cite="1" aria-label="Inspect ' + UI.esc(text) + '" title="Inspect source evidence"><span aria-hidden="true">⌕</span><span class="citation-label">' + UI.esc(text) + '</span>' + (e.citationEdited ? '<span class="citation-edited">Edited</span>' : '') + '</button></div>';
  }
  function clashMarkup(e) {
    var clashes = R.clashesOf(items, e); if (!clashes.length) return '';
    return '<div class="small mt-1" style="color:var(--danger-fg)">Clashes with ' + clashes.map(function (o) { return '<b>' + UI.esc(R.name(o)) + '</b> · ' + UI.esc(R.fmt(o.date)); }).join('; ') + '</div>';
  }

  // ---------- Source evidence modal ----------
  function ensureCitationModal() {
    if (citationModalEl) return;
    citationModalEl = document.createElement('div');
    citationModalEl.className = 'modal fade'; citationModalEl.tabIndex = -1; citationModalEl.setAttribute('aria-labelledby', 'citationTitle'); citationModalEl.setAttribute('aria-hidden', 'true');
    citationModalEl.innerHTML = '<div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable citation-preview-dialog"><div class="modal-content citation-preview-content"><div class="modal-header citation-modal-header"><div><h2 class="modal-title fs-4" id="citationTitle">Source evidence</h2><p>Review the original context behind this extracted deadline.</p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body citation-modal-body p-0" id="citationBody"></div></div></div>';
    document.body.appendChild(citationModalEl); citationModal = new bootstrap.Modal(citationModalEl);
  }
  function showCitation(e) {
    var c = citationOf(e); if (!c) return;
    ensureCitationModal();
    var paras = e.sourceSnippet.split('\n').filter(function (l) { return l.indexOf('# ') !== 0; }).map(function (l) { return l.replace(/^> /, ''); });
    var before = paras.filter(function (l) { return l !== c.excerpt; })[0] || '', after = paras.filter(function (l) { return l !== c.excerpt; }).slice(-1)[0] || '';
    $('citationBody').innerHTML = '<div class="citation-pdf-toolbar"><div class="citation-toolbar-file"><span class="citation-pdf-icon" aria-hidden="true">PDF</span><div class="min-w-0"><div class="citation-toolbar-name">' + UI.esc(c.filename) + '</div><div>PDF document</div></div></div>' +
      '<div class="citation-toolbar-meta"><span>' + UI.esc('Page ' + e.sourcePage + ' / ' + e.sourcePages) + '</span><span>100%</span></div></div>' +
      '<div class="citation-evidence-layout"><section class="citation-pdf-stage" aria-label="PDF document preview">' +
      '<div class="citation-document"><div class="citation-document-brand">' + UI.esc(e.sourceCode + ' · Course outline') + '</div><div class="citation-document-course">' + UI.esc(e.course + ' · Assessment schedule') + '</div><p>' + UI.esc(before) + '</p>' +
      '<p class="citation-highlight"><span class="citation-match-label">Matched evidence</span>' + UI.esc(c.excerpt) + '</p><p>' + UI.esc(after) + '</p><div class="citation-page-number">Page ' + e.sourcePage + '</div></div></section>' +
      '<aside class="citation-details"><div class="citation-section-head"><span>Information found</span></div>' +
      '<dl><div><dt>Assessment</dt><dd>' + UI.esc(e.title) + '</dd></div><div><dt>Due</dt><dd>' + UI.esc(P.D.long(e.date)) + '</dd></div><div><dt>Course</dt><dd>' + UI.esc(e.course) + '</dd></div><div><dt>Type</dt><dd>' + UI.esc(e.type) + '</dd></div>' +
      (e.weight != null ? '<div><dt>Weight</dt><dd>' + UI.esc(e.weight + '%') + '</dd></div>' : '') + '</dl>' +
      '<div class="citation-trust-note"><span aria-hidden="true">✓</span><div><b>Matched to this source</b><small>Planora found these details in the highlighted text.</small></div></div>' +
      (e.citationEdited ? '<div class="source-note"><b>Edited after extraction.</b> The source supports the originally extracted information.</div>' : '') + '</aside></div>';
    citationModal.show();
  }

  // ---------- remove ----------
  function ensureRemoveModal() {
    if (removeModalEl) return;
    removeModalEl = document.createElement('div'); removeModalEl.className = 'modal fade'; removeModalEl.tabIndex = -1;
    removeModalEl.setAttribute('aria-labelledby', 'reviewRemoveTitle'); removeModalEl.setAttribute('aria-hidden', 'true');
    removeModalEl.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header border-0 pb-0"><h2 class="modal-title fs-4" id="reviewRemoveTitle">Remove this date?</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"><p class="mb-2">“<b id="reviewRemoveName"></b>” won’t be added to your calendar or task list.</p><p class="small text-secondary mb-0">You can add it back later with “+ Add a missing date”.</p></div>' +
      '<div class="modal-footer border-0 pt-0"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Keep date</button><button type="button" class="btn btn-danger" id="reviewRemoveConfirm">Remove date</button></div></div></div>';
    document.body.appendChild(removeModalEl); removeModal = new bootstrap.Modal(removeModalEl);
    $('reviewRemoveConfirm').onclick = function () {
      var item = byId(pendingRemoveId); if (!item) { removeModal.hide(); return; }
      items = items.filter(function (i) { return i !== item; });
      pendingRemoveId = null; removeModal.hide(); render(); UI.toast('Removed “' + R.name(item) + '”');
    };
  }
  function confirmRemove(item) {
    ensureRemoveModal(); pendingRemoveId = item.id; $('reviewRemoveName').textContent = R.name(item); removeModal.show();
  }

  // ---------- page ----------
  var files = Object.keys(items.reduce(function (acc, d) { acc[d.sourceFile] = 1; return acc; }, {}));
  $('view').innerHTML =
    '<div class="head-row" style="padding-top:8px"><div><h1>Review what Planora found</h1><p id="rvbSub"></p></div></div>' +
    '<div class="d-flex align-items-center gap-2 flex-wrap mb-3" id="rvbBadges"></div>' +
    '<div class="list" id="list"></div>' +
    '<button type="button" class="add-row" id="add">+ Add a missing date</button>' +
    '<div class="d-flex justify-content-between align-items-center gap-3 flex-wrap mt-4"><p class="small mb-0" id="rvsNote" aria-live="polite"></p>' +
    '<div class="d-flex gap-2 ms-auto"><a class="btn btn-secondary" href="upload.html" id="cancel">Cancel</a><button type="button" class="btn btn-primary" id="go"></button></div></div>';

  function render() {
    R.detect(items);
    var bad = R.conflicted(items).length, n = items.length;
    $('rvbSub').textContent = 'From ' + files.join(', ') + ' — ' + n + (n === 1 ? ' date' : ' dates') + ' detected. Confirm each one, or fix anything that clashes.';
    $('rvbBadges').innerHTML = '<span class="pbadge ok">' + (n - bad) + ' verified</span>' +
      (bad ? '<span class="pbadge danger">' + bad + ' clash</span>' : (n ? '<span class="small fw-semibold" style="color:var(--ok-fg)">All verified ✓</span>' : ''));
    $('list').innerHTML = items.map(function (e) {
      var conflict = e.status === 'Conflict';
      return '<div class="irow review-row" data-id="' + e.id + '"><div class="irow-icon" aria-hidden="true">' + P.iconOf(e) + '</div>' +
        '<div class="irow-body"><div class="irow-title">' + UI.esc(R.name(e)) + '</div><div class="irow-sub"><span class="chip">' + UI.esc(e.type) + '</span>' + UI.esc(R.fmt(e.date) + (e.weight != null ? ' · ' + e.weight + '%' : '')) + '</div>' + citationMarkup(e) + clashMarkup(e) + '</div>' +
        '<span class="pbadge ' + (conflict ? 'danger' : 'ok') + '">' + e.status + '</span>' +
        '<div class="d-flex gap-1"><button type="button" class="icon-btn" data-act="edit" title="Edit" aria-label="Edit ' + UI.esc(R.name(e)) + '">✎</button>' +
        '<button type="button" class="icon-btn" data-act="rm" title="Remove" aria-label="Remove ' + UI.esc(R.name(e)) + '">' + TRASH + '</button></div></div>';
    }).join('') || '<div class="irow"><div class="irow-body muted">Nothing left to review.</div></div>';
    var note = $('rvsNote');
    note.textContent = R.footNote(items);
    note.style.color = bad ? 'var(--danger-fg)' : 'var(--muted)'; note.classList.toggle('fw-semibold', !!bad);
    $('go').textContent = n === 0 ? 'Continue' : 'Add ' + n + (n === 1 ? ' date' : ' dates') + ' to my calendar';
  }

  var openEdit = R.bindEditor(function () { return items; }, function (d) { d.citationEdited = !!d.sourceFile; render(); });
  R.bindConfirm($('go'), function () { return items; }, function (first) {
    var row = document.querySelector('.review-row[data-id="' + first.id + '"]'); if (!row) return;
    row.scrollIntoView({ block: 'center' }); row.querySelector('[data-act="edit"]').focus();
  });
  $('add').onclick = function () {
    UI.eventForm({ heading: 'Add a missing date', saveLabel: 'Add date', date: '', course: items[0] && items[0].course, source: 'Added manually',
      onSave: function (ev) { var d = R.manual(ev); items.push(d); render(); UI.toast('Date added: ' + R.name(d)); } });
  };
  $('cancel').onclick = function () { P.state.review = null; P.save(); };
  $('list').addEventListener('click', function (ev) {
    var row = ev.target.closest('.review-row'); if (!row) return;
    var item = byId(row.dataset.id); if (!item) return;
    if (ev.target.closest('[data-cite]')) { showCitation(item); return; }
    var b = ev.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'edit') openEdit(item);
    if (b.dataset.act === 'rm') confirmRemove(item);
  });
  render();
})();
