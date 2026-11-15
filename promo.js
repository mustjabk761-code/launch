(function () {
  var URL = 'https://productnest.online';
  var NATIVE = { src: 'https://bauval.org/21/c6d7f39358f4fa4892d5bac85e48ce99', id: 'container-c6d7f39358f4fa4892d5bac85e48ce99' };
  var shown = false;

  var o = document.createElement('div');
  o.className = 'ov';
  o.id = 'mPromo';
  o.innerHTML = '<div class="mbox">' +
    '<button class="close" type="button" data-close="mPromo" aria-label="Close">&times;</button>' +
    '<h2>\uD83D\uDE80 Launch your product on ProductNest for free</h2>' +
    '<p class="note">Your product is live here. Want more visibility? Share it on ProductNest too, a free place for makers to post what they built and get feedback.</p>' +
    '<a class="btn btn-pri" href="' + URL + '" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none">Submit now</a>' +
    '<div class="ad show" id="promoAd" style="margin-top:12px"><small>Advertisement</small></div>' +
    '</div>';
  document.body.appendChild(o);

  function loadAd() {
    var box = document.getElementById('promoAd');
    if (!box || box.querySelector('iframe')) return;
    var f = document.createElement('iframe');
    f.setAttribute('scrolling', 'no');
    f.setAttribute('title', 'Advertisement');
    f.style.cssText = 'border:0;display:block;margin:0 auto;width:100%;height:1px;max-width:100%';
    f.srcdoc = '<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0"><script async data-cfasync="false" src="' + NATIVE.src + '"><\/script><div id="' + NATIVE.id + '"></div></body></html>';
    box.appendChild(f);
    var n = 0;
    var iv = setInterval(function () {
      n++;
      try {
        var h = f.contentDocument.documentElement.scrollHeight;
        if (h > 20) { f.style.height = (h + 4) + 'px'; }
      } catch (e) {}
      if (n > 14) { clearInterval(iv); }
    }, 700);
  }

  // open this popup after the Edit Key popup is closed
  var oldClose = closeM;
  closeM = function (id) {
    oldClose(id);
    if (id === 'mDone' && !shown) {
      shown = true;
      setTimeout(function () { openM('mPromo'); loadAd(); }, 400);
    }
  };
})();
