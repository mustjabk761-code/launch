(function () {
  var URL = 'https://productnest.online';
  var KEY = '3daa1214cf85568f02584f17bb088a59';
  var shown = false;
  var loaded = false;

  var o = document.createElement('div');
  o.className = 'ov';
  o.id = 'mPromo';
  o.innerHTML = '<div class="mbox">' +
    '<button class="close" type="button" data-close="mPromo" aria-label="Close">&times;</button>' +
    '<h2>\uD83D\uDE80 Launch your product on ProductNest for free</h2>' +
    '<p class="note">Your product is live here. Want more visibility? Share it on ProductNest too, a free place for makers to post what they built and get feedback.</p>' +
    '<a class="btn btn-pri" href="' + URL + '" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none">Submit now</a>' +
    '<div id="promoAd" style="margin-top:12px;text-align:center"><small class="note" style="display:block">Advertisement</small></div>' +
    '</div>';
  document.body.appendChild(o);

  function loadAd() {
    if (loaded) return;
    loaded = true;
    var box = document.getElementById('promoAd');
    var f = document.createElement('iframe');
    f.width = 300;
    f.height = 250;
    f.setAttribute('scrolling', 'no');
    f.setAttribute('title', 'Advertisement');
    f.style.cssText = 'border:0;display:block;margin:0 auto;max-width:100%';
    f.srcdoc = '<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0"><script>atOptions={"key":"' + KEY + '","format":"iframe","height":250,"width":300,"params":{}};<\/script><script src="https://bauval.org/22/' + KEY + '"><\/script></body></html>';
    box.appendChild(f);
  }

  var oldClose = closeM;
  closeM = function (id) {
    oldClose(id);
    if (id === 'mDone' && !shown) {
      shown = true;
      setTimeout(function () { openM('mPromo'); loadAd(); }, 400);
    }
  };
})();
