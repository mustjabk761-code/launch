(function () {
  // ===== FEATURE 1+2: Surprise me + Collections =====
  var COLL = [
    { t: 'No sign-up', q: 'no-signup' },
    { t: 'Free tools', q: 'free' },
    { t: 'AI video', q: 'ai-video' },
    { t: 'Freelancers', q: 'freelancer' },
    { t: 'Calculators', q: 'calculator' }
  ];
  var ch = document.getElementById('chips');
  if (!ch) return;
  var bar = document.createElement('div');
  bar.className = 'chips';
  bar.id = 'coll';
  ch.parentNode.insertBefore(bar, ch);

  function draw() {
    var h = '<button class="chip on" type="button" data-sur="1">\uD83C\uDFB2 Surprise me</button>';
    COLL.forEach(function (c) {
      h += '<button class="chip' + (S.q === c.q ? ' on' : '') + '" type="button" data-q="' + c.q + '">' + c.t + '</button>';
    });
    bar.innerHTML = h;
  }
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.getAttribute('data-sur')) {
      var list = S.products.filter(visible);
      if (!list.length) { toast('Products are still loading.'); return; }
      openDetail(list[Math.floor(Math.random() * list.length)].id);
      return;
    }
    var q = b.getAttribute('data-q');
    S.q = (S.q === q) ? '' : q;
    S.cat = 'All';
    S.tag = '';
    S.shown = CFG.PAGE_SIZE;
    document.getElementById('q').value = S.q;
    render();
    draw();
  });
  document.getElementById('q').addEventListener('input', function () { setTimeout(draw, 300); });
  draw();
})();
(function () {
  // ===== FEATURE 3: Saved (heart) =====
  var FAV = lsGet('pld_fav', {});
  function isFav(p) { return !!FAV[p.id]; }
  function favCount() { return Object.keys(FAV).length; }

  var st = document.createElement('style');
  st.textContent = '.fav.on{color:#e5483c;border-color:#e5483c}.motd{border-color:#f59e0b}';
  document.head.appendChild(st);

  var oldRow = rowHtml;
  rowHtml = function (p) {
    var h = oldRow(p);
    var btn = '<button class="btn btn-sm fav' + (isFav(p) ? ' on' : '') + '" type="button" data-fav="' + esc(p.id) + '" aria-label="Save">' + (isFav(p) ? '\u2764 Saved' : '\u2661 Save') + '</button>';
    return h.replace('>Share</button>', '>Share</button>' + btn);
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-fav]') : null;
    if (!b) return;
    e.preventDefault();
    var id = b.getAttribute('data-fav');
    if (FAV[id]) { delete FAV[id]; toast('Removed from Saved.'); }
    else { FAV[id] = 1; toast('Saved on this device.'); }
    lsSet('pld_fav', FAV);
    render();
  });

  var oldFilt = filt;
  filt = function () {
    if (S.cat !== 'Saved') return oldFilt();
    S.cat = 'All';
    var r = oldFilt();
    S.cat = 'Saved';
    return r.filter(isFav);
  };

  var oldTabs = renderTabs;
  renderTabs = function () {
    oldTabs();
    var el = document.getElementById('tabs');
    if (!el) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (S.cat === 'Saved' ? ' on' : '');
    b.setAttribute('data-cat', 'Saved');
    b.innerHTML = '\u2764 Saved<span class="cnt">' + favCount() + '</span>';
    el.appendChild(b);
  };

  // ===== FEATURE 4: Product of the Day =====
  function pickDay() {
    var list = S.products.filter(visible).slice();
    if (!list.length) return null;
    list.sort(function (a, b) { return b.upvotes - a.upvotes; });
    list = list.slice(0, 20);
    var day = Math.floor(Date.now() / 86400000);
    return list[day % list.length];
  }
  function drawMotd() {
    var side = document.querySelector('.side');
    if (!side) return;
    var p = pickDay();
    var box = document.getElementById('motdBox');
    if (!p) { if (box) box.style.display = 'none'; return; }
    if (!box) {
      box = document.createElement('div');
      box.id = 'motdBox';
      box.className = 'box motd';
      side.insertBefore(box, side.firstChild);
    }
    box.style.display = '';
    box.innerHTML = '<h3>\uD83D\uDC51 Product of the Day</h3>' + miniHtml(p, '\u25B2 ' + p.upvotes) +
      '<p class="note" style="margin:6px 0 0">' + esc(p.tagline) + '</p>';
  }
  var oldSide = renderSide;
  renderSide = function () { oldSide(); drawMotd(); };

  if (S.loaded) render();
})();

(function () {
  // ===== FEATURE 5: better share text =====
  var TAIL = ' Launch your free tool too, no sign-up: ' + CFG.SITE;

  // thank-you popup buttons (WhatsApp, X, Facebook, Copy link)
  function txt() {
    var p = S.lastP || { name: 'my product' };
    return 'I just launched ' + p.name + ' on Product Launch Directory!';
  }
  function link() { return S.lastP ? pUrl(S.lastP.id) : CFG.SITE; }
  function open(u) { window.open(u, '_blank', 'noopener'); }
  function rebind(id, fn) {
    var old = document.getElementById(id);
    if (!old) return;
    var neu = old.cloneNode(true);
    old.parentNode.replaceChild(neu, old);
    neu.addEventListener('click', fn);
  }
  rebind('shWa', function () { open('https://wa.me/?text=' + encodeURIComponent(txt() + ' ' + link() + '\n' + TAIL)); });
  rebind('shX', function () { open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(txt() + TAIL) + '&url=' + encodeURIComponent(link())); });
  rebind('shFb', function () { open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link())); });
  rebind('shCp', function () { copyText(txt() + ' ' + link() + '\n' + TAIL); });

  // Share button on product cards: native share with a promo line
  shareP = function (id) {
    var p = findP(id);
    if (!p) return;
    var url = pUrl(id);
    var text = p.name + ': ' + p.tagline + '\nDiscover more free tools on Product Launch Directory.';
    if (navigator.share) {
      navigator.share({ title: p.name, text: text, url: url }).catch(function () {});
    } else {
      copyText(text + '\n' + url);
    }
  };
})();
(function () {
  var box = document.getElementById('mDone');
  if (!box) return;
  var mb = box.querySelector('.mbox');
  var p = document.createElement('p');
  p.className = 'note';
  p.id = 'doneTip';
  p.style.marginTop = '12px';
  mb.appendChild(p);
  var old = openM;
  openM = function (id) {
    if (id === 'mDone' && S.lastP) {
      var url = CFG.SITE + 'p/' + String(S.lastP.id).replace(/[^A-Za-z0-9_-]/g, '') + '.html';
      p.innerHTML = 'Proud of your launch? Share your listing page on your website, blog or social media: <br><b>' + esc(url) + '</b>';
    }
    return old(id);
  };
})();
