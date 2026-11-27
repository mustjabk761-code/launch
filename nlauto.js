(function () {
  var wrap = document.getElementById('fEmailWrap');
  if (!wrap) return;
  var d = document.createElement('div');
  d.className = 'fld';
  d.id = 'nlOptWrap';
  d.innerHTML = '<label style="display:flex;gap:8px;align-items:flex-start;font-weight:400"><input type="checkbox" id="nlOpt" checked style="width:auto;margin-top:3px"><span>Also send me the weekly top tools email (optional). You can unsubscribe at any time.</span></label>';
  wrap.parentNode.insertBefore(d, wrap.nextSibling);

  function show() { d.style.display = ''; }
  var b1 = document.getElementById('subBtn');
  var b2 = document.getElementById('subBtn2');
  if (b1) b1.addEventListener('click', show);
  if (b2) b2.addEventListener('click', show);

  var oldEdit = openEdit;
  openEdit = function (id) { oldEdit(id); d.style.display = 'none'; };

  var oldPost = apiPost;
  apiPost = function (base, body, ms) {
    var p = oldPost(base, body, ms);
    if (base === CFG.MAIN_API && body && body.action === 'submit') {
      var want = document.getElementById('nlOpt').checked;
      var em = body.email;
      return p.then(function (r) {
        if (r && r.ok && want && em) {
          oldPost(CFG.MAIN_API, { action: 'subscribe', email: em, hp: '' }).catch(function () {});
        }
        return r;
      });
    }
    return p;
  };
})();
