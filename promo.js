(function () {
  var URL = 'https://productnest.online';
  var SRC = 'https://bauval.org/21/c6d7f39358f4fa4892d5bac85e48ce99';
  var CID = 'container-c6d7f39358f4fa4892d5bac85e48ce99';
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
    var c = document.createElement('div');
    c.id = CID;
    box.appendChild(c);
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    s.src = SRC;
    box.appendChild(s);
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
