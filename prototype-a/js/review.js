(function () {
  var P = Planora, UI = PlUI, R = PlReview, esc = UI.esc, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('upload');
  // Prototype A: the syllabus source sits beside the extracted list. Data, conflict rules,
  // editing and confirming come from review-core.js (shared with Prototype B).
  var deadlines = R.create(), selectedId = null;

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
    var d = byId(selectedId); if (!d) return;
    // the paragraph holding the first match becomes the evidence block; it carries the date and the weight
    var lines = d.sourceSnippet.split('\n'), hit = -1;
    lines.forEach(function (l, i) { if (hit < 0 && l.indexOf(d.matches[0]) >= 0) hit = i; });
    $('rvsDoc').innerHTML = lines.map(function (line, i) {
      if (line.indexOf('# ') === 0) return '<h3 class="citation-document-course">' + esc(line.slice(2)) + '</h3>';
      var text = esc(line.replace(/^> /, ''));
      return i === hit ? '<p class="citation-highlight"><span class="citation-match-label">Matched evidence · #' + (deadlines.indexOf(d) + 1) + '</span>' + text + '</p>' : '<p>' + text + '</p>';
    }).join('');
    $('rvsFile').textContent = d.sourceFile; $('rvsFile').title = d.sourceFile;
    $('rvsPage').textContent = 'Page ' + d.sourcePage + ' / ' + d.sourcePages;
    $('rvsBrand').textContent = d.sourceCode + ' · Course outline';
    $('rvsFoot').textContent = 'Page ' + d.sourcePage;
    var paper = $('rvsPaper');
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
        '<button type="button" class="btn btn-secondary btn-sm" data-edit="' + d.id + '" aria-label="Edit ' + esc(R.name(d)) + '">Edit</button></div>';
    }).join('');
  }
  function renderSummary() {
    var n = deadlines.length;
    $('rvsHeading').textContent = n + ' deadline' + (n === 1 ? '' : 's') + ' extracted';
    $('rvsConfirm').textContent = 'Confirm all ' + n;
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

  // ---------- edit + confirm ----------
  var openEdit = R.bindEditor(function () { return deadlines; }, render);
  R.bindConfirm($('rvsConfirm'), function () { return deadlines; }, function (first) { select(first.id, true); });
  $('rvsCancel').onclick = function () { P.state.review = null; P.save(); };

  // ---------- events ----------
  $('rvsList').addEventListener('click', function (ev) {
    var row = ev.target.closest('.rvs-row'); if (!row) return;
    select(row.dataset.id);
    var edit = ev.target.closest('[data-edit]'); if (edit) openEdit(byId(edit.dataset.edit));
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

  selectedId = (R.conflicted(deadlines)[0] || deadlines[0]).id;
  render();
})();
