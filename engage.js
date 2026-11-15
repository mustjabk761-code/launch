(function () {
  // ===== 1) Weekly Leaderboard =====
  function drawLb() {
    var side = document.querySelector('.side');
    if (!side) return;
    var cut = Date.now() - 7 * 86400000;
    var list = S.products.filter(function (p) { return visible(p) && pdate(p).getTime() >= cut; });
    list.sort(function (a, b) { return (b.upvotes - a.upvotes) || (cmCount(b) - cmCount(a)); });
    list = list.slice(0, 5);
    var box = document.getElementById('lbBox');
    if (!list.length) { if (box) box.style.display = 'none'; return; }
    if (!box) {
      box = document.createElement('div');
      box.id = 'lbBox';
      box.className = 'box';
      var tb = document.getElementById('topBox');
      side.insertBefore(box, tb ? tb.nextSibling : side.firstChild);
    }
    var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49', '4.', '5.'];
    box.style.display = '';
    box.innerHTML = '<h3>\uD83C\uDFC6 Weekly leaderboard</h3>' +
      '<p class="note" style="margin-top:0">Winner of the week: <b>' + esc(list[0].name) + '</b></p>' +
      list.map(function (p, i) {
        return '<a class="mini" href="#p-' + esc(p.id) + '" data-act="det" data-id="' + esc(p.id) + '">' +
          '<span style="font-size:18px;min-width:26px;color:var(--tx)">' + medals[i] + '</span>' +
          '<div style="min-width:0"><b>' + esc(p.name) + '</b><span>' + esc(p.category) + '</span></div>' +
          '<em>\u25B2 ' + p.upvotes + '</em></a>';
      }).join('');
  }

  // ===== 2) Reply to comments =====
  var R = {};
  var openR = {};
  function keyOf(c) { return String(c.created); }
  cmHtml = function (list) {
    if (!list.length) return '<p class="note">No comments yet. Be the first!</p>';
    return list.map(function (c) {
      var k = keyOf(c);
      var reps = R[k] || [];
      var h = '<div class="cm"><b>' + esc(c.name) + '</b><span>' + esc(ago(c.created)) + '</span><p>' + esc(c.text) + '</p>' +
        '<button class="btn btn-sm" type="button" data-rp="' + esc(k) + '">Reply' + (reps.length ? ' (' + reps.length + ')' : '') + '</button>';
      reps.forEach(function (x) {
        h += '<div style="margin:6px 0 0 12px;padding-left:8px;border-left:2px solid var(--bd)"><b>' + esc(x.name) + '</b><span>' + esc(ago(x.created)) + '</span><p>' + esc(x.text) + '</p></div>';
      });
      if (openR[k]) {
        h += '<div style="margin:8px 0 0 12px"><div class="fld"><input class="rpn" type="text" maxlength="40" placeholder="Your name" value="' + esc(lsGet('pld_name', '')) + '"></div>' +
          '<div class="fld"><textarea class="rpt" maxlength="300" placeholder="Write a reply (no links)" style="min-height:56px"></textarea></div>' +
          '<button class="btn btn-sm btn-pri" type="button" data-rpsend="' + esc(k) + '">Send reply</button> <span class="note rpm"></span></div>';
      }
      return h + '</div>';
    }).join('');
  }
  function redrawCm() {
    var el = document.getElementById('detCm');
    if (el && S.cms) el.innerHTML = cmHtml(S.cms);
  }
  function loadReplies(id) {
    apiGet(CFG.MAIN_API, { action: 'comments', pid: '__reply' }).then(function (r) {
      if (!r || !r.ok || S.cur !== id) return;
      R = {};
      (r.comments || []).forEach(function (c) {
        var parts = String(c.text).split('|');
        if (parts.length < 3 || parts[0] !== id) return;
        (R[parts[1]] = R[parts[1]] || []).push({ name: c.name, text: parts.slice(2).join('|'), created: c.created });
      });
      redrawCm();
    }).catch(function () {});
  }
  var oldOpen = openDetail;
  openDetail = function (id) {
    id = String(id);
    R = {}; openR = {}; S.cms = null;
    oldOpen(id);
    loadReplies(id);
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    var k = b.getAttribute('data-rp');
    if (k) { openR[k] = !openR[k]; redrawCm(); return; }
    k = b.getAttribute('data-rpsend');
    if (!k) return;
    var wrap = b.parentNode;
    var nm = wrap.querySelector('.rpn').value.trim();
    var tx = wrap.querySelector('.rpt').value.trim();
    var msg = wrap.querySelector('.rpm');
    if (nm.length < 2) { msg.textContent = 'Please enter your name.'; return; }
    if (tx.length < 2) { msg.textContent = 'Please write a reply.'; return; }
    if (/(https?:\/\/|www\.)/i.test(tx)) { msg.textContent = 'Links are not allowed.'; return; }
    var id = S.cur;
    b.disabled = true;
    msg.textContent = 'Sending...';
    apiPost(CFG.MAIN_API, { action: 'comment', pid: '__reply', name: nm, text: id + '|' + k + '|' + tx }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || 'Could not send.');
      lsSet('pld_name', nm);
      (R[k] = R[k] || []).push({ name: nm, text: tx, created: new Date().toISOString() });
      openR[k] = false;
      redrawCm();
      toast('Reply posted.');
    }).catch(function (er) {
      msg.textContent = errMsg(er);
      b.disabled = false;
    });
  });

  // ===== 3) Visitor badges =====
  var C = lsGet('pld_eng', { c: 0 });
  var oldPost = apiPost;
  apiPost = function (base, body, ms) {
    var p = oldPost(base, body, ms);
    var count = base === CFG.MAIN_API && body && body.action === 'comment' &&
      (String(body.pid).indexOf('__') !== 0 || body.pid === '__reply');
    if (!count) return p;
    return p.then(function (r) {
      if (r && r.ok) { C.c = (C.c || 0) + 1; lsSet('pld_eng', C); drawBadges(); }
      return r;
    });
  };
  function drawBadges() {
    var side = document.querySelector('.side');
    if (!side) return;
    var up = Object.keys(S.voted || {}).length;
    var cm = C.c || 0;
    var defs = [
      ['Explorer', '\uD83E\uDDED', 'Upvote 5 tools', up >= 5],
      ['Fan', '\u2B50', 'Upvote 15 tools', up >= 15],
      ['Voice', '\uD83D\uDCAC', 'Write your first comment', cm >= 1],
      ['Supporter', '\uD83E\uDD1D', 'Write 10 comments', cm >= 10]
    ];
    var box = document.getElementById('bdBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'bdBox';
      box.className = 'box';
      side.appendChild(box);
    }
    box.innerHTML = '<h3>\uD83C\uDFC5 Your badges</h3>' +
      '<p class="note" style="margin-top:0">Upvotes: ' + up + ' | Comments: ' + cm + '</p>' +
      defs.map(function (d) {
        return '<div style="padding:4px 0;font-size:13px;' + (d[3] ? '' : 'opacity:.45') + '">' + d[1] + ' <b>' + d[0] + '</b> <span class="note">' + (d[3] ? 'Earned!' : d[2]) + '</span></div>';
      }).join('') +
      '<p class="note" style="margin-bottom:0">Saved in this browser only.</p>';
  }

  var oldSide = renderSide;
  renderSide = function () { oldSide(); drawLb(); drawBadges(); };
  if (S.loaded) render();
})();
