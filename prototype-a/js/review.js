(function () {
  var P = Planora, UI = PlUI, R = PlReview, esc = UI.esc, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('upload');
  // Prototype A: the syllabus source sits beside the extracted list. Data, conflict rules,
  // editing and confirming come from review-core.js (shared with Prototype B).
  var deadlines = R.create(), selectedId = null;
  var removeModalEl = null, removeModal = null, pendingRemoveId = null;
  var TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg>';

  function byId(id) { return deadlines.filter(function (d) { return d.id === id; })[0] || null; }

  // ---------- source pane (PDF viewer) ----------
  // pages of the selected file that have extracted deadlines; ‹ › step through these
  function pagesOf(file) {
    var seen = {};
    deadlines.forEach(function (o) { if (o.sourceFile === file) seen[o.sourcePage] = 1; });
    return Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
  }
  function turnPage(step) {
    var d = byId(selectedId); if (!d) return;
    var pages = pagesOf(d.sourceFile), to = pages[pages.indexOf(d.sourcePage) + step];
    var first = deadlines.filter(function (o) { return o.sourceFile === d.sourceFile && o.sourcePage === to; })[0];
    if (first) select(first.id);
  }
  function renderSource() {
    var d = byId(selectedId), paper = $('rvsPaper');
    // nothing selected (list emptied) or a date added by hand: there is no syllabus page to show
    if (!d || !d.sourceFile) {
      $('rvsDoc').innerHTML = '<p class="rvs-nosrc">' + (d ? 'Added manually — no syllabus source to show for ' + esc(R.name(d)) + '.' : 'Nothing left to review.') + '</p>';
      $('rvsFile').textContent = d ? 'Added manually' : 'No file'; $('rvsFile').title = ''; $('rvsFileSub').textContent = d ? 'You added this date, so there’s no file' : 'No deadlines selected';
      $('rvsPage').textContent = '—'; $('rvsBrand').textContent = d ? d.course : ''; $('rvsFoot').textContent = '';
      paper.setAttribute('aria-label', d ? 'No source for ' + R.name(d) : 'No source');
      $('rvsPrev').disabled = true; $('rvsNext').disabled = true;
      var none = d ? R.clashesOf(deadlines, d) : [], cbox = $('rvsClash');
      cbox.hidden = !none.length;
      cbox.innerHTML = none.length ? 'Clashes with ' + none.map(function (o) { return '<b>' + esc(R.name(o)) + '</b> · ' + esc(R.fmt(o.date)); }).join('; ') : '';
      return;
    }
    // the paragraph holding the first match becomes the evidence block; it carries the date and the weight
    var lines = d.sourceSnippet.split('\n'), hit = -1;
    lines.forEach(function (l, i) { if (hit < 0 && l.indexOf(d.matches[0]) >= 0) hit = i; });
    $('rvsDoc').innerHTML = lines.map(function (line, i) {
      if (line.indexOf('# ') === 0) return '<h3 class="citation-document-course">' + esc(line.slice(2)) + '</h3>';
      var text = esc(line.replace(/^> /, ''));
      return i === hit ? '<p class="citation-highlight"><span class="citation-match-label">Matched evidence · #' + (deadlines.indexOf(d) + 1) + '</span>' + text + '</p>' : '<p>' + text + '</p>';
    }).join('');
    $('rvsFile').textContent = d.sourceFile; $('rvsFile').title = d.sourceFile; $('rvsFileSub').textContent = 'Original file you uploaded';
    $('rvsPage').textContent = 'Page ' + d.sourcePage + ' / ' + d.sourcePages;
    $('rvsBrand').textContent = d.sourceCode + ' · Course outline';
    $('rvsFoot').textContent = 'Page ' + d.sourcePage;
    paper.setAttribute('aria-label', 'Preview of ' + d.sourceFile + ', page ' + d.sourcePage);
    paper.classList.remove('swap'); void paper.offsetWidth; paper.classList.add('swap');
    var pages = pagesOf(d.sourceFile), at = pages.indexOf(d.sourcePage);
    $('rvsPrev').disabled = at <= 0; $('rvsNext').disabled = at >= pages.length - 1;

    var clashes = R.clashesOf(deadlines, d), box = $('rvsClash');
    box.hidden = !clashes.length;
    box.innerHTML = clashes.length ? 'Clashes with ' + clashes.map(function (o) { return '<b>' + esc(R.name(o)) + '</b> · ' + esc(R.fmt(o.date)); }).join('; ') : '';
  }

  // ---------- list + footer ----------
  function renderList() {
    $('rvsList').innerHTML = deadlines.map(function (d, i) {
      var on = d.id === selectedId, bad = d.status === 'Conflict';
      return '<div class="rvs-row' + (on ? ' active' : '') + '" role="button" tabindex="0" aria-pressed="' + on + '" data-id="' + d.id + '">' +
        '<span class="n">' + (i + 1) + '</span>' +
        '<div class="body"><div class="t">' + esc(R.name(d)) + '</div><div class="s">' + esc(R.fmt(d.date) + ' · ' + d.type + (d.weight != null ? ' · ' + d.weight + '%' : '')) + '</div></div>' +
        '<span class="pbadge ' + (bad ? 'danger' : 'ok') + '">' + d.status + '</span>' +
        '<div class="d-flex gap-1"><button type="button" class="icon-btn" data-act="edit" title="Edit" aria-label="Edit ' + esc(R.name(d)) + '">✎</button>' +
        '<button type="button" class="icon-btn" data-act="rm" title="Remove" aria-label="Remove ' + esc(R.name(d)) + '">' + TRASH + '</button></div></div>';
    }).join('') || '<div class="rvs-row rvs-empty">Nothing left to review.</div>';
  }
  function renderSummary() {
    var n = deadlines.length;
    $('rvsHeading').textContent = n + ' deadline' + (n === 1 ? '' : 's') + ' extracted';
    $('rvsConfirm').textContent = n ? 'Confirm all ' + n : 'Continue';
    var note = $('rvsNote');
    note.textContent = R.footNote(deadlines);
    note.classList.toggle('bad', !!R.conflicted(deadlines).length);
  }
  function render() { R.detect(deadlines); renderList(); renderSummary(); renderSource(); }

  function select(id, focus) {
    if (!byId(id)) return;
    selectedId = id;
    Array.prototype.forEach.call($('rvsList').querySelectorAll('.rvs-row'), function (row) {
      var on = row.dataset.id === id; row.classList.toggle('active', on); row.setAttribute('aria-pressed', on);
      if (on && focus) { row.focus(); row.scrollIntoView({ block: 'nearest' }); }
    });
    renderSource();
  }

  // ---------- remove (same confirmation as Prototype B) ----------
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
      var at = deadlines.indexOf(item);
      deadlines = deadlines.filter(function (d) { return d !== item; });
      if (selectedId === item.id) selectedId = (deadlines[Math.min(at, deadlines.length - 1)] || {}).id || null;
      pendingRemoveId = null; removeModal.hide(); render(); UI.toast('Removed “' + R.name(item) + '”');
    };
  }
  function confirmRemove(item) {
    ensureRemoveModal(); pendingRemoveId = item.id; $('reviewRemoveName').textContent = R.name(item); removeModal.show();
  }

  // ---------- edit + confirm ----------
  var openEdit = R.bindEditor(function () { return deadlines; }, render);
  R.bindConfirm($('rvsConfirm'), function () { return deadlines; }, function (first) { select(first.id, true); });
  $('rvsCancel').onclick = function () { P.state.review = null; P.save(); };
  $('rvsAdd').onclick = function () {
    UI.eventForm({ heading: 'Add a missing date', saveLabel: 'Add date', date: '', course: deadlines[0] && deadlines[0].course, source: 'Added manually',
      onSave: function (ev) { var d = R.manual(ev); deadlines.push(d); selectedId = d.id; render(); UI.toast('Date added: ' + R.name(d)); } });
  };

  // ---------- events ----------
  $('rvsList').addEventListener('click', function (ev) {
    var row = ev.target.closest('.rvs-row'); if (!row || !row.dataset.id) return;
    select(row.dataset.id);
    var b = ev.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'edit') openEdit(byId(row.dataset.id));
    if (b.dataset.act === 'rm') confirmRemove(byId(row.dataset.id));
  });
  $('rvsList').addEventListener('keydown', function (ev) {
    var row = ev.target.closest('.rvs-row'); if (!row || ev.target !== row) return;
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(row.dataset.id); }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      var next = ev.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
      if (next) select(next.dataset.id, true);
    }
  });
  $('rvsPrev').onclick = function () { turnPage(-1); };
  $('rvsNext').onclick = function () { turnPage(1); };

  selectedId = (R.conflicted(deadlines)[0] || deadlines[0] || {}).id || null;
  render();
})();
