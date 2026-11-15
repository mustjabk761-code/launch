(function () {
  // ===== 1) More like this (inside Details) =====
  var oldHead = detHead;
  detHead = function (p) {
    oldHead(p);
    var box = document.getElementById('detBody');
    if (!box || box.querySelector('.sim')) return;
    var sim = S.products.filter(function (x) {
      return x.id !== p.id && x.category === p.category && visible(x);
    }).sort(function (a, b) { return b.upvotes - a.upvotes; }).slice(0, 4);
    if (!sim.length) return;
    var d = document.createElement('div');
    d.className = 'sim';
    d.style.marginTop = '12px';
    d.innerHTML = '<h3 style="font-size:15px;margin:0 0 4px">More like this</h3>' +
      sim.map(function (x) { return miniHtml(x, '\u25B2 ' + x.upvotes); }).join('');
    box.appendChild(d);
  };

  // ===== 2) Recently viewed =====
  var REC = lsGet('pld_recent', []);
  var oldOpen = openDetail;
  openDetail = function (id) {
    id = String(id);
    REC = REC.filter(function (x) { return x !== id; });
    REC.unshift(id);
    REC = REC.slice(0, 8);
    lsSet('pld_recent', REC);
    oldOpen(id);
    drawRecent();
  };
  function drawRecent() {
    var side = document.querySelector('.side');
    if (!side) return;
    var box = document.getElementById('recBox');
    var list = REC.map(findP).filter(function (p) { return p && visible(p); }).slice(0, 5);
    if (!list.length) { if (box) box.style.display = 'none'; return; }
    if (!box) {
      box = document.createElement('div');
      box.id = 'recBox';
      box.className = 'box';
      side.appendChild(box);
    }
    box.style.display = '';
    box.innerHTML = '<h3>\uD83D\uDD52 Recently viewed</h3>' +
      list.map(function (p) { return miniHtml(p, ''); }).join('') +
      '<button class="btn btn-sm" id="recClr" type="button" style="margin-top:8px">Clear</button>';
    document.getElementById('recClr').addEventListener('click', function () {
      REC = []; lsSet('pld_recent', REC); drawRecent();
    });
  }
  var oldSide = renderSide;
  renderSide = function () { oldSide(); drawRecent(); };

  // ===== 3) Infinite scroll (replaces the Show more button) =====
  var more = document.getElementById('more');
  var busy = false;
  function next() {
    if (busy || !more || more.style.display === 'none') return;
    var r = more.getBoundingClientRect();
    if (r.top < window.innerHeight + 400) {
      busy = true;
      S.shown += CFG.PAGE_SIZE;
      renderList();
      setTimeout(function () { busy = false; }, 400);
    }
  }
  window.addEventListener('scroll', next, { passive: true });

  if (S.loaded) render();
})();
