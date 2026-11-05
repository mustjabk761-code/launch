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
