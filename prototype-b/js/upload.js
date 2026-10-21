(function () {
  var P = Planora, UI = PlUI, $ = function (id) { return document.getElementById(id); };
  if (!UI.guard()) return; UI.nav('upload');
  var sample = false;
  if (UI.qs('mode') === 'schedule') $('h1').textContent = 'Import course schedule';
  var step = 'empty', fileName = '', timer = null, counter = null, found = 0;

  function steps() {
    var d = function (cls, n, l) { return '<div class="step-dot ' + cls + '"><span class="n">' + n + '</span>' + l + '</div>'; };
    $('steps').innerHTML = d(step === 'empty' || step === 'error' ? 'current' : 'done', '1', 'Upload') + '<div class="step-line"></div>' +
      d(step === 'scanning' ? 'current' : step === 'done' ? 'done' : '', '2', 'Scan') + '<div class="step-line"></div>' + d(step === 'done' ? 'current' : '', '3', 'Review');
  }
  function render() {
    steps(); var p = $('panel');
    if (step === 'empty') {
      p.innerHTML = '<div class="dropzone" id="drop"><div class="state-icon neutral" aria-hidden="true">📄</div><h2>Drag your syllabus here</h2>' +
        '<p class="muted">PDF, Word document, or a clear photo of a printed page.</p>' +
        '<button type="button" class="btn btn-primary" id="choose">Choose a file</button>' +
        '<div class="faint small mt-3">PDF, DOCX, JPG or PNG — up to 20MB</div>' +
        '<div class="mt-3 small"><button type="button" class="btn-link-ink" id="sample">No file handy? Use a sample syllabus</button></div></div>';
      $('choose').onclick = function () { $('file').click(); };
      $('sample').onclick = function () { start('', true); };
      var dz = $('drop');
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); }); });
      dz.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) pick(f); });
    } else if (step === 'scanning') {
      p.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary mb-3" role="status" aria-hidden="true"></div><h2>Reading ' + UI.esc(fileName) + '…</h2>' +
        '<p class="muted">This usually takes a few seconds.</p><div class="scan-bar"><span id="bar"></span></div><div class="small muted" id="cnt">Found 0 dates so far</div>' +
        '<div class="mt-3"><button type="button" class="btn btn-secondary btn-sm" id="skip">Skip to results</button></div></div>';
      requestAnimationFrame(function () { requestAnimationFrame(function () { var b = $('bar'); if (b) b.style.width = '100%'; }); });
      $('skip').onclick = finish;
    } else if (step === 'done') {
      var r = P.state.review, n = r.items.length, bad = r.items.filter(function (i) { return i.status === 'check'; }).length;
      p.innerHTML = '<div class="text-center py-3"><div class="state-icon ok" aria-hidden="true">✓</div><h2>Found ' + n + ' dates in ' + UI.esc(r.file) + '</h2>' +
        '<p class="muted">' + (n - bad) + ' look right. ' + bad + ' need a quick check before they go on your calendar.</p>' +
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
  function pick(f) {
    var ext = (f.name.split('.').pop() || '').toLowerCase();
    if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].indexOf(ext) < 0) return fail('Planora can read PDF, Word and image files. "' + f.name + '" is a different type.');
    if (f.size > 20 * 1024 * 1024) return fail('That file is over 20MB. Try a smaller export of the syllabus.');
    if (/scan/i.test(f.name)) return fail('The PDF looks like a scanned image with no selectable text, so Planora can\'t pull dates from it yet.');
    start(f.name, false);
  }
  function fail(m) { errMsg = m; step = 'error'; render(); }
  function start(name) {
    fileName = name || 'CS301_Syllabus.pdf'; step = 'scanning';
    P.startExtraction(name || '');
    fileName = P.state.review.file; found = 0; render();
    var total = P.state.review.items.length;
    counter = setInterval(function () { found = Math.min(total, found + 1); var c = $('cnt'); if (c) c.textContent = 'Found ' + found + ' date' + (found === 1 ? '' : 's') + ' so far'; }, 2200 / (total + 1));
    timer = setTimeout(finish, 2300);
  }
  function finish() { clearTimeout(timer); clearInterval(counter); if (step !== 'scanning') return; step = 'done'; render(); }
  $('file').addEventListener('change', function () { var f = this.files[0]; this.value = ''; if (f) pick(f); });
  render();
})();
