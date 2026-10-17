/* Resolve a conflict, A/B test version A: a table of verified dates, then an expandable list of dates waiting for review
   (clashes and uncertain dates). conflict.js (version B) hands over to this when Planora.variant() is 'A'.
   Outcomes match version B: keep both = acknowledge the clash, keep one = the other is marked TBD. */
window.PlConflictA = function () {
  var P = Planora, UI = PlUI, D = P.D, esc = UI.esc, $ = function (id) { return document.getElementById(id); };
  var open = null, choice = {};
  var body = document.querySelector('.page-body'); if (body) { body.style.maxWidth = '1148px'; body.style.paddingBottom = '20px'; }

  // one pending entry per clash, plus one per date Planora wasn't sure about
  function pending() {
    var list = [], seen = {};
    if (!P.state.conflictAck) P.conflicts().forEach(function (e) {
      var k = e.date + (e.start || ''); if (seen[k]) return; seen[k] = 1;
      var g = P.conflicts().filter(function (x) { return x.date + (x.start || '') === k; });
      if (g.length > 1) list.push({ key: 'c-' + g[0].id, kind: 'clash', a: g[0], b: g[1] });
    });
    P.deadlines().filter(function (e) { return e.status === 'check' && !e.done; }).forEach(function (e) { list.push({ key: 'q-' + e.id, kind: 'check', a: e }); });
    return list;
  }
  function verified() {
    return P.deadlines().filter(function (e) { return !e.conflict && e.status !== 'check'; }).sort(function (a, b) { return (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')); });
  }
  var name = function (e) { return e.course + ' ' + e.title; };
  var radio = function (key, v, label) {
    return '<label class="pa-opt"><input class="form-check-input" type="radio" name="opt-' + key + '" value="' + v + '"' + (choice[key] === v ? ' checked' : '') + '> ' + esc(label) + '</label>';
  };

  function render() {
    var vs = verified(), pd = pending();
    if (open && !pd.some(function (p) { return p.key === open; })) open = null;
    if (open === null && pd.length) open = pd[0].key;
    var rows = vs.map(function (e, i) {
      var b = P.badgeOf(e);
      return '<tr><td class="pa-n">' + (i + 1) + '.</td><td><div class="pa-t' + (e.done ? ' done' : '') + '">' + esc(e.title) + '</div><div class="pa-src">' + esc(e.source || '') + '</div></td>' +
        '<td>' + esc(e.course) + '</td><td class="text-nowrap">' + D.short(e.date) + ' ' + D.parse(e.date).getFullYear() + '</td><td>' + esc(e.type) + '</td>' +
        '<td>' + (e.weight ? e.weight + '%' : '—') + '</td><td><span class="pbadge ' + b.c + '">' + b.t + '</span></td>' +
        '<td><a class="btn btn-secondary btn-sm pa-edit" href="edit.html?id=' + encodeURIComponent(e.id) + '&from=conflict" aria-label="Edit ' + esc(e.title) + '">✎ Edit</a></td></tr>';
    }).join('');
    var items = pd.map(function (p, i) {
      var isOpen = p.key === open, detail = '';
      if (isOpen && p.kind === 'clash') {
        detail = '<p class="pa-lbl">This deadline clashes with:</p><div class="pa-with">' + esc(name(p.b)) + '<span>' + D.long(p.a.date) + (p.a.start ? ', ' + D.time12(p.a.start) : '') + '</span></div>' +
          '<p class="pa-lbl mt-2">Next actions:</p><div class="pa-opts" role="radiogroup" aria-label="Next actions">' +
          radio(p.key, 'both', 'Keep both dates') + radio(p.key, 'a', 'Keep ' + name(p.a)) + radio(p.key, 'b', 'Keep ' + name(p.b)) + '</div>' +
          '<p class="pa-hint">Keeping one marks the other as TBD so you can reschedule it.</p>';
      } else if (isOpen) {
        detail = '<p class="pa-lbl">Planora wasn’t sure about this date:</p><div class="pa-with">' + esc(P.whenOf(p.a)) + (p.a.weight ? ' · ' + p.a.weight + '%' : ' · weight unknown') + '<span>' + esc(p.a.note || 'Check it against your syllabus.') + '</span></div>' +
          '<p class="pa-lbl mt-2">Next actions:</p><div class="pa-opts" role="radiogroup" aria-label="Next actions">' +
          radio(p.key, 'ok', 'The details are correct') + radio(p.key, 'edit', 'Change the details') + radio(p.key, 'rm', 'Remove it') + '</div>';
      }
      return '<div class="pa-item' + (isOpen ? ' open' : '') + '"><button type="button" class="pa-head" data-key="' + p.key + '" aria-expanded="' + isOpen + '">' +
        '<span class="pa-n">' + (i + 1) + '.</span><span class="pa-name">' + esc(name(p.a)) + '</span>' +
        '<span class="pbadge ' + (p.kind === 'clash' ? 'danger">Clash' : 'warn">Check this') + '</span><span class="pa-chev" aria-hidden="true">›</span></button>' +
        (isOpen ? '<div class="pa-body"><div class="pa-main">' + detail + '</div><div class="pa-side"><a class="cf-link" href="dashboard.html">Review later</a>' +
          '<button type="button" class="btn btn-primary btn-sm" data-confirm="' + p.key + '"' + (choice[p.key] ? '' : ' disabled') + '>Confirm</button></div></div>' : '') + '</div>';
    }).join('');
    $('view').innerHTML =
      '<div class="head-row pa-top"><div><h1>Review your dates</h1><p>' + (pd.length ? pd.length + (pd.length === 1 ? ' date needs' : ' dates need') + ' your review before it’s final.' : 'Everything is confirmed.') + '</p></div></div>' +
      '<div class="pa-card"><div class="pa-cap">Verified dates <span>' + vs.length + '</span></div><div class="pa-scroll" id="paScroll" tabindex="0" aria-label="Verified dates, scrollable"><table class="pa-table"><thead><tr><th></th><th>Assignment</th><th>Module</th><th>Date</th><th>Type</th><th>Weightage</th><th>Status</th><th>Action</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="8" class="muted p-3">No verified dates yet.</td></tr>') + '</tbody></table></div></div>' +
      '<div class="pa-card mt-3" id="paPending"><div class="pa-cap">Pending dates for your review <span>' + pd.length + '</span></div>' +
      (items || '<div class="pa-empty"><b>All caught up</b><p>Nothing is waiting for your review.</p><a class="btn btn-primary btn-sm" href="dashboard.html">Back to dashboard</a></div>') + '</div>';
    fit();
  }

  // the verified table scrolls inside its card so it and the pending list fit on one screen together
  function fit() {
    var box = $('paScroll'), pend = $('paPending'); if (!box || !pend) return;
    var top = box.getBoundingClientRect().top + window.scrollY;
    var room = window.innerHeight - top - 16 - pend.offsetHeight - 20;
    box.style.maxHeight = Math.max(132, room) + 'px';
  }
  window.addEventListener('resize', fit);

  function confirm(key) {
    var p = pending().filter(function (x) { return x.key === key; })[0], c = choice[key]; if (!p || !c) return;
    var msg;
    if (p.kind === 'clash') {
      if (c === 'both') { P.state.conflictAck = true; P.log('Kept both ' + p.a.title + ' and ' + p.b.title, 'ok'); msg = 'Both dates kept, marked as a clash'; }
      else { var keep = c === 'a' ? p.a : p.b, other = c === 'a' ? p.b : p.a; P.update(other.id, { tbd: true, conflict: false }); P.update(keep.id, { conflict: false }); msg = name(other) + ' marked TBD'; }
    } else {
      if (c === 'edit') { location.href = 'edit.html?id=' + encodeURIComponent(p.a.id) + '&from=conflict'; return; }
      if (c === 'ok') { P.update(p.a.id, { status: 'verified' }); msg = p.a.title + ' confirmed'; }
      if (c === 'rm') { P.remove(p.a.id); msg = p.a.title + ' removed'; }
    }
    P.save(); delete choice[key]; open = null; render(); UI.toast(msg);
  }

  $('view').addEventListener('click', function (ev) {
    var h = ev.target.closest('.pa-head'); if (h) { open = open === h.dataset.key ? '' : h.dataset.key; render(); var again = document.querySelector('.pa-head[data-key="' + h.dataset.key + '"]'); if (again) again.focus(); return; }
    var c = ev.target.closest('[data-confirm]'); if (c) confirm(c.dataset.confirm);
  });
  $('view').addEventListener('change', function (ev) {
    var r = ev.target; if (r.type !== 'radio') return;
    var key = r.name.slice(4); choice[key] = r.value;
    var btn = document.querySelector('[data-confirm="' + key + '"]'); if (btn) btn.disabled = false;
  });
  render();
};
