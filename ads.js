(function () {
  var ENABLED = true;
  var NATIVE = { src: 'https://bauval.org/21/c6d7f39358f4fa4892d5bac85e48ce99', id: 'container-c6d7f39358f4fa4892d5bac85e48ce99' };
  var SMALL = { key: '9339f9939e2605b64b31a43c44f2fbac', w: 320, h: 50 };
  var BIG = { key: '3daa1214cf85568f02584f17bb088a59', w: 300, h: 250 };
  var NATIVE_AFTER = 3, BIG_EVERY = 10, BIG_MAX = 6, MAX_LOADS = 5;
  var loads = {};
  var timer;

  function mk(name) {
    var d = document.createElement('div');
    d.className = 'ad';
    d.setAttribute('data-ad', name);
    d.innerHTML = '<small>Advertisement</small>';
    return d;
  }

  function bannerHtml(b) {
    return '<script>atOptions={"key":"' + b.key + '","format":"iframe","height":' + b.h + ',"width":' + b.w + ',"params":{}};<\/script>' +
      '<script src="https://bauval.org/22/' + b.key + '"><\/script>';
  }

  function build(el, html, w, h, auto) {
    var f = document.createElement('iframe');
    f.setAttribute('scrolling', 'no');
    f.setAttribute('title', 'Advertisement');
    f.style.border = '0';
    f.style.display = 'block';
    f.style.margin = '0 auto';
    f.style.maxWidth = '100%';
    if (auto) { f.style.width = '100%'; f.style.height = '1px'; }
    else { f.width = w; f.height = h; }
    f.srcdoc = '<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0">' + html + '</body></html>';
    el.appendChild(f);
    if (auto) {
      var n = 0;
      var iv = setInterval(function () {
        n++;
        try {
          var d = f.contentDocument;
          var hh = d.documentElement.scrollHeight;
          if (hh > 60) { f.style.height = (hh + 4) + 'px'; el.classList.add('show'); }
        } catch (e) {}
        if (n > 14) { clearInterval(iv); }
      }, 700);
    } else {
      f.onload = function () { el.classList.add('show'); };
    }
  }

  function run() {
    var slots = document.querySelectorAll('#list .ad');
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i];
      var name = el.getAttribute('data-ad');
      loads[name] = (loads[name] || 0) + 1;
      if (loads[name] > MAX_LOADS) { continue; }
      if (name === 'n') {
        build(el, '<script async data-cfasync="false" src="' + NATIVE.src + '"><\/script><div id="' + NATIVE.id + '"></div>', 0, 0, true);
      } else if (name === 's') {
        build(el, bannerHtml(SMALL), SMALL.w, SMALL.h, false);
      } else {
        build(el, bannerHtml(BIG), BIG.w, BIG.h, false);
      }
    }
  }

  function place() {
    clearTimeout(timer);
    if (!ENABLED) return;
    var list = document.getElementById('list');
    if (!list) return;
    var rows = Array.prototype.slice.call(list.querySelectorAll('.row'));
    if (!rows.length) return;
    if (rows.length > NATIVE_AFTER) { rows[NATIVE_AFTER - 1].insertAdjacentElement('afterend', mk('n')); }
    var b = 0;
    for (var i = BIG_EVERY - 1; i < rows.length - 1 && b < BIG_MAX; i += BIG_EVERY) {
      b++;
      rows[i].insertAdjacentElement('afterend', mk('b' + b));
    }
    list.appendChild(mk('s'));
    timer = setTimeout(run, 1200);
  }

  var oldList = renderList;
  renderList = function () { oldList(); place(); };
  if (S.loaded) { renderList(); }
})();
