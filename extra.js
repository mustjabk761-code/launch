(function () {
  function ready(fn) {
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (S.loaded) { clearInterval(t); fn(); }
      if (n > 80) { clearInterval(t); }
    }, 500);
  }
  function mkModal(id, html) {
    var o = document.createElement('div');
    o.className = 'ov';
    o.id = id;
    o.innerHTML = '<div class="mbox"><button class="close" type="button" data-close="' + id + '" aria-label="Close">&times;</button>' + html + '</div>';
    document.body.appendChild(o);
    return o;
  }
  function safeId(x) { return /^[A-Za-z0-9_-]+$/.test(x); }

  // ===== 7) Keyboard: press / to search =====
  document.addEventListener('keydown', function (e) {
    var t = e.target && e.target.tagName;
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && t !== 'INPUT' && t !== 'TEXTAREA' && t !== 'SELECT') {
      e.preventDefault();
      var q = document.getElementById('q');
      if (q) { q.focus(); window.scrollTo(0, 0); }
    }
  });

  // ===== 4) Ratings (stored in comments table, pid __rate) =====
  var RT = {};
  var MY = lsGet('pld_rated', {});
  function addRate(id, v) {
    RT[id] = RT[id] || { s: 0, n: 0 };
    RT[id].s += v;
    RT[id].n += 1;
  }
  function avg(p) {
    var r = RT[p.id];
    return r ? (r.s / r.n).toFixed(1) + ' / 5 (' + r.n + ')' : 'No ratings yet';
  }
  function rateHtml(p) {
    var mine = MY[p.id] || 0;
    var h = '<div class="rate" style="margin:8px 0"><b>\u2605 ' + avg(p) + '</b> ';
    for (var i = 1; i <= 5; i++) {
      h += '<button class="btn btn-sm fav' + (i <= mine ? ' on' : '') + '" type="button" data-rate="' + i + '" data-pid="' + esc(p.id) + '" aria-label="Rate ' + i + '">' + (i <= mine ? '\u2605' : '\u2606') + '</button> ';
    }
    return h + '<span class="note">' + (mine ? 'Thanks for rating!' : 'Tap a star to rate') + '</span></div>';
  }
  var oldHead = detHead;
  detHead = function (p) {
    oldHead(p);
    var box = document.getElementById('detBody');
    if (!box || box.querySelector('.rate')) return;
    var d = document.createElement('div');
    d.innerHTML = rateHtml(p);
    box.appendChild(d.firstChild);
  };
  function loadRatings() {
    apiGet(CFG.MAIN_API, { action: 'comments', pid: '__rate' }).then(function (r) {
      if (!r || !r.ok) return;
      (r.comments || []).forEach(function (c) {
        var t = String(c.text);
        var i = t.indexOf('|');
        if (i < 1) return;
        var v = Number(t.slice(i + 1));
        if (v >= 1 && v <= 5) addRate(t.slice(0, i), v);
      });
      if (S.cur && findP(S.cur)) detHead(findP(S.cur));
    }).catch(function () {});
  }

  // ===== 1) Compare two tools =====
  var CM = [];
  var oldRow = rowHtml;
  rowHtml = function (p) {
    var on = CM.indexOf(p.id) > -1;
    var btn = '<button class="btn btn-sm' + (on ? ' fav on' : '') + '" type="button" data-cmp="' + esc(p.id) + '">' + (on ? '\u2714 Added' : '\u21C4 Compare') + '</button>';
    return oldRow(p).replace('>Share</button>', '>Share</button>' + btn);
  };
  var bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:60;background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:6px 10px;box-shadow:0 4px 14px rgba(0,0,0,.25);display:none;align-items:center;gap:6px;font-size:12px;white-space:nowrap';
  bar.innerHTML = '<span id="cmpTxt"></span><button class="btn btn-sm btn-pri" type="button" data-cmpgo="1">Compare</button><button class="btn btn-sm" type="button" data-cmpclr="1">Clear</button>';
  document.body.appendChild(bar);
  mkModal('mCmp', '<h2>Compare tools</h2><div id="cmpBody" style="overflow-x:auto"></div>');

  function syncCmp() {
    bar.style.display = CM.length ? 'flex' : 'none';
    document.getElementById('cmpTxt').textContent = CM.length + ' / 2 selected';
    var bs = document.querySelectorAll('[data-cmp]');
    for (var i = 0; i < bs.length; i++) {
      var on = CM.indexOf(bs[i].getAttribute('data-cmp')) > -1;
      bs[i].className = 'btn btn-sm' + (on ? ' fav on' : '');
      bs[i].textContent = on ? '\u2714 Added' : '\u21C4 Compare';
    }
  }
  function showCmp() {
    var a = findP(CM[0]), b = findP(CM[1]);
    if (!a || !b) { toast('Pick two tools to compare.'); return; }
    function cell(p, fn) { return '<td style="padding:6px;border-top:1px solid var(--bd);vertical-align:top">' + fn(p) + '</td>'; }
    var rows = [
      ['Tool', function (p) { return '<b>' + esc(p.name) + '</b>'; }],
      ['Tagline', function (p) { return esc(p.tagline); }],
      ['Category', function (p) { return esc(p.category); }],
      ['Tags', function (p) { return p.tags.map(function (t) { return '#' + esc(t); }).join(' ') || '-'; }],
      ['Upvotes', function (p) { return '\u25B2 ' + p.upvotes; }],
      ['Comments', function (p) { return String(cmCount(p)); }],
      ['Rating', function (p) { return avg(p); }],
      ['Added', function (p) { return esc(ago(p.created)); }],
      ['Website', function (p) { return okUrl(p.website) ? '<a href="' + esc(p.website) + '" target="_blank" rel="nofollow noopener noreferrer" style="color:var(--pri)">Visit</a>' : '-'; }]
    ];
    var h = '<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:300px">';
    rows.forEach(function (r) {
      h += '<tr><td style="padding:6px;border-top:1px solid var(--bd);color:var(--mut);font-weight:700">' + r[0] + '</td>' + cell(a, r[1]) + cell(b, r[1]) + '</tr>';
    });
    document.getElementById('cmpBody').innerHTML = h + '</table>';
    openM('mCmp');
  }

  // ===== 3) Trending now =====
  function drawTrend() {
    var side = document.querySelector('.side');
    if (!side) return;
    var cut = Date.now() - 3 * 86400000;
    var list = S.products.filter(function (p) { return visible(p) && pdate(p).getTime() >= cut; });
    list.sort(function (a, b) { return (b.upvotes + cmCount(b) * 2) - (a.upvotes + cmCount(a) * 2); });
    list = list.slice(0, 5);
    var box = document.getElementById('trBox');
    if (!list.length) { if (box) box.style.display = 'none'; return; }
    if (!box) {
      box = document.createElement('div');
      box.id = 'trBox';
      box.className = 'box';
      var tb = document.getElementById('topBox');
      side.insertBefore(box, tb ? tb.nextSibling : null);
    }
    box.style.display = '';
    box.innerHTML = '<h3>\uD83D\uDCC8 Trending now</h3>' + list.map(function (p) { return miniHtml(p, '\u25B2 ' + p.upvotes); }).join('');
  }
  var oldSide = renderSide;
  renderSide = function () { oldSide(); drawTrend(); };

  // ===== 2) Streak + 5) Share collection + 6) Text size (one sidebar box) =====
  var st = lsGet('pld_streak', { last: '', n: 0 });
  var today = dayStr(new Date());
  if (st.last !== today) {
    st.n = (st.last === dayStr(new Date(Date.now() - 86400000))) ? st.n + 1 : 1;
    st.last = today;
    lsSet('pld_streak', st);
  }
  var SIZES = [14, 15, 17, 19];
  var fi = lsGet('pld_fsi', 1);
  function applySize() { document.body.style.fontSize = SIZES[fi] + 'px'; }
  applySize();

  var side = document.querySelector('.side');
  if (side) {
    var mb = document.createElement('div');
    mb.className = 'box';
    mb.innerHTML = '<h3>\uD83D\uDD25 Day ' + st.n + ' streak</h3>' +
      '<p class="note">Visit on consecutive days to grow your streak.</p>' +
      '<div class="acts"><button class="btn btn-sm" type="button" data-shcol="1">\u2764 Share my saved list</button>' +
      '<button class="btn btn-sm" type="button" data-fs="-1">A-</button><button class="btn btn-sm" type="button" data-fs="1">A+</button></div>';
    side.appendChild(mb);
  }

  function shareCol() {
    var ids = Object.keys(lsGet('pld_fav', {})).filter(safeId).slice(0, 30);
    if (!ids.length) { toast('Save some tools first (tap Save on a product).'); return; }
    var url = CFG.SITE + '#c=' + ids.join('.');
    if (navigator.share) { navigator.share({ title: 'My saved free tools', text: 'My saved free tools on Product Launch Directory', url: url }).catch(function () {}); }
    else { copyText(url); }
  }

  mkModal('mCol', '<h2>Shared collection</h2><div id="colBody"></div><button class="btn btn-pri" id="colSave" type="button" style="margin-top:10px;width:100%">Save all to my list</button>');
  var colIds = [];
  function showShared() {
    var m = /^#c=(.+)$/.exec(location.hash || '');
    if (!m) return;
    colIds = m[1].split('.').filter(safeId).slice(0, 30);
    var list = colIds.map(findP).filter(function (p) { return p && visible(p); });
    if (!list.length) return;
    document.getElementById('colBody').innerHTML = list.map(function (p) { return miniHtml(p, '\u25B2 ' + p.upvotes); }).join('');
    openM('mCol');
  }
  document.getElementById('colSave').addEventListener('click', function () {
    var f = lsGet('pld_fav', {});
    colIds.forEach(function (id) { f[id] = 1; });
    lsSet('pld_fav', f);
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    toast('Saved. Refreshing...');
    setTimeout(function () { location.reload(); }, 900);
  });
  document.getElementById('colBody').addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.mini')) closeM('mCol');
  });

  // ===== click handler for all new buttons =====
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : null;
    if (!t) return;
    var v;
    if ((v = t.getAttribute('data-cmp'))) {
      var i = CM.indexOf(v);
      if (i > -1) { CM.splice(i, 1); }
      else { if (CM.length >= 2) { CM.shift(); } CM.push(v); }
      syncCmp();
    } else if (t.getAttribute('data-cmpgo')) { showCmp(); }
    else if (t.getAttribute('data-cmpclr')) { CM = []; syncCmp(); }
    else if (t.getAttribute('data-shcol')) { shareCol(); }
    else if ((v = t.getAttribute('data-fs'))) {
      fi = Math.max(0, Math.min(SIZES.length - 1, fi + Number(v)));
      lsSet('pld_fsi', fi);
      applySize();
    } else if ((v = t.getAttribute('data-rate'))) {
      var pid = t.getAttribute('data-pid');
      if (MY[pid]) { toast('You already rated this tool.'); return; }
      var n = Number(v);
      MY[pid] = n;
      lsSet('pld_rated', MY);
      addRate(pid, n);
      if (findP(pid)) detHead(findP(pid));
      apiPost(CFG.MAIN_API, { action: 'comment', pid: '__rate', name: 'rating', text: pid + '|' + n }).then(function (r) {
        if (!r || !r.ok) throw new Error('fail');
      }).catch(function () {
        delete MY[pid]; lsSet('pld_rated', MY);
        if (RT[pid]) { RT[pid].s -= n; RT[pid].n -= 1; }
        if (findP(pid)) detHead(findP(pid));
        toast('Could not save your rating. Please try again later.');
      });
    }
  });

  var oldList = renderList;
  renderList = function () { oldList(); syncCmp(); };

  ready(function () {
    render();
    loadRatings();
    showShared();
  });
})();
