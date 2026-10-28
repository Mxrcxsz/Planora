(function () {
  var P = Planora, UI = PlUI, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('upload');
  var sample = false;
  if (UI.qs('mode') === 'schedule') $('h1').textContent = 'Import course schedule';
  var step = 'empty', fileName = '', timer = null, counter = null, found = 0, MAX_FILES = 5;

  function steps() {
    var d = function (cls, n, l) { return '<div class="step-dot ' + cls + '"><span class="n">' + n + '</span>' + l + '</div>'; };
    $('steps').innerHTML = d(step === 'empty' || step === 'error' ? 'current' : 'done', '1', 'Upload') + '<div class="step-line"></div>' +
      d(step === 'scanning' ? 'current' : step === 'done' ? 'done' : '', '2', 'Scan') + '<div class="step-line"></div>' + d(step === 'done' ? 'current' : '', '3', 'Review');
  }
  function render() {
    steps(); var p = $('panel');
    if (step === 'empty') {
      p.innerHTML = '<div class="dropzone" id="drop"><div class="state-icon neutral" aria-hidden="true">📄</div><h2>Drag your syllabi here</h2>' +
        '<p class="muted">PDF, Word document, or a clear photo of a printed page. Add one file or several at once.</p>' +
        '<button type="button" class="btn btn-primary" id="choose">Choose files</button>' +
        '<div class="faint small mt-3">PDF, DOCX, JPG or PNG — up to 20MB each, ' + MAX_FILES + ' files at a time</div>' +
        '<div class="mt-3 small"><button type="button" class="btn-link-ink" id="sample">No file handy? Use a sample syllabus</button></div></div>';
      $('choose').onclick = function () { $('file').click(); };
      $('sample').onclick = function () { start(''); };
      var dz = $('drop');
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); }); });
      dz.addEventListener('drop', function (e) { if (e.dataTransfer.files.length) pick(e.dataTransfer.files); });
    } else if (step === 'scanning') {
      p.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary mb-3" role="status" aria-hidden="true"></div><h2>Reading ' + UI.esc(fileName) + '…</h2>' +
        '<p class="muted">' + (picked.length > 1 ? UI.esc(picked.join(', ')) : 'This usually takes a few seconds.') + '</p><div class="scan-bar"><span id="bar"></span></div><div class="small muted" id="cnt">Found 0 dates so far</div>' +
        '<div class="mt-3"><button type="button" class="btn btn-secondary btn-sm" id="skip">Skip to results</button></div></div>';
      requestAnimationFrame(function () { requestAnimationFrame(function () { var b = $('bar'); if (b) b.style.width = '100%'; }); });
      $('skip').onclick = finish;
    } else if (step === 'done') {
      // the same mock deadlines the Review page shows (review-core.js)
      var R = PlReview, items = R.create(), n = items.length, bad = R.conflicted(items).length, counts = {};
      items.forEach(function (d) { counts[d.sourceFile] = (counts[d.sourceFile] || 0) + 1; });
      var files = Object.keys(counts).map(function (f) { return { name: f, count: counts[f] }; });
      p.innerHTML = '<div class="text-center py-3"><div class="state-icon ok" aria-hidden="true">✓</div><h2>Found ' + n + ' dates in ' + UI.esc(fileName) + '</h2>' +
        '<p class="muted">' + (n - bad) + ' look right. ' + (bad ? R.clashSummary(items, 'clash') + ', so check them before they go on your calendar.' : '') + '</p>' +
        (files.length > 1 ? '<ul class="upl-files">' + files.map(function (f) { return '<li><span class="n">' + UI.esc(f.name) + '</span><span class="c">' + f.count + (f.count === 1 ? ' date' : ' dates') + '</span></li>'; }).join('') + '</ul>' : '') +
        '<div class="d-flex gap-2 justify-content-center flex-wrap mt-3"><button type="button" class="btn btn-secondary" id="again">Upload another</button><a class="btn btn-primary" href="review.html">Review dates</a></div></div>';
      $('again').onclick = function () { P.state.review = null; P.save(); step = 'empty'; render(); };
    } else {
      p.innerHTML = '<div class="text-center py-3"><div class="state-icon err" aria-hidden="true">!</div><h2>Couldn\'t read that file</h2><p class="muted" style="max-width:46ch;margin:0 auto">' + UI.esc(errMsg) + '</p>' +
        '<div class="d-flex gap-2 justify-content-center mt-4"><button type="button" class="btn btn-secondary" id="cancel">Cancel</button><button type="button" class="btn btn-primary" id="retry">Try another file</button></div></div>';
      $('cancel').onclick = function () { step = 'empty'; render(); };
      $('retry').onclick = function () { step = 'empty'; render(); $('file').click(); };
    }
  }
  var errMsg = '';
  // files: a FileList or array; one bad file stops the batch so the tester knows exactly which one to swap out
  function pick(files) {
    files = Array.prototype.slice.call(files);
    if (files.length > MAX_FILES) return fail('You picked ' + files.length + ' files. Planora can read up to ' + MAX_FILES + ' at a time — upload the rest in another batch.');
    var multi = files.length > 1;
    for (var i = 0; i < files.length; i++) {
      var f = files[i], ext = (f.name.split('.').pop() || '').toLowerCase(), pre = multi ? '"' + f.name + '": ' : '';
      if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].indexOf(ext) < 0) return fail('Planora can read PDF, Word and image files. "' + f.name + '" is a different type.' + (multi ? ' Remove it and try again.' : ''));
      if (f.size > 20 * 1024 * 1024) return fail(multi ? pre + 'this file is over 20MB. Try a smaller export of the syllabus.' : 'That file is over 20MB. Try a smaller export of the syllabus.');
      if (/scan/i.test(f.name)) return fail(multi ? pre + 'this PDF looks like a scanned image with no selectable text, so Planora can\'t pull dates from it yet.' : 'The PDF looks like a scanned image with no selectable text, so Planora can\'t pull dates from it yet.');
    }
    start(files.map(function (f) { return f.name; }));
  }
  function fail(m) { errMsg = m; step = 'error'; render(); }
  var fileCount = 1, picked = [];
  // The demo reads nothing from the file: every upload finds the same small mock set (review-core.js),
  // and nothing changes on the calendar until the tester confirms on the Review page.
  function start(names) {
    picked = (Array.isArray(names) ? names : [names]).filter(Boolean); fileCount = Math.max(picked.length, 1); step = 'scanning';
    fileName = picked.length > 1 ? picked.length + ' files' : picked[0] || 'the sample syllabi';
    found = 0; render();
    var total = PlReview.create().length;
    counter = setInterval(function () { found = Math.min(total, found + 1); var c = $('cnt'); if (c) c.textContent = 'Found ' + found + ' date' + (found === 1 ? '' : 's') + ' so far'; }, (2200 + (fileCount - 1) * 500) / (total + 1));
    timer = setTimeout(finish, 2300 + (fileCount - 1) * 500);
  }
  function finish() { clearTimeout(timer); clearInterval(counter); if (step !== 'scanning') return; step = 'done'; render(); }
  $('file').addEventListener('change', function () { var fs = Array.prototype.slice.call(this.files); this.value = ''; if (fs.length) pick(fs); });
  render();
})();
