(function () {
  var FEED = 'https://script.google.com/macros/s/AKfycbxLtGXBecFvROe5dDKpJMPRSaOeWmtAQxdDdNux7Y0n0R6gOmi6KEeIPAP-mp-A48Q/exec';
  var PROF = lsGet('pld_fprof', null);
  var TOKEN = lsGet('pld_ftoken', '');
  if (!TOKEN) {
    var ra = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(ra);
    TOKEN = Array.prototype.map.call(ra, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    lsSet('pld_ftoken', TOKEN);
  }
  var ST = { posts: [], offset: 0, more: true, busy: false, open: {}, cms: {}, img: '', avatar: '' };
  var LIKED = lsGet('pld_flike', {});

  function g(p) { return apiGet(FEED, p); }
  function post(b) { b.token = TOKEN; return apiPost(FEED, b, 40000); }
  function initial(n) { return esc(String(n || '?').charAt(0).toUpperCase()); }
  function av(name, url) {
    if (url) return '<img class="fav" src="' + esc(url) + '" alt="" onerror="this.outerHTML=\'<span class=fav>' + initial(name) + '</span>\'">';
    return '<span class="fav">' + initial(name) + '</span>';
  }

  // ===== image compress (canvas) =====
  function compress(file, maxDim, maxBytes, cb) {
    var rd = new FileReader();
    rd.onerror = function () { cb(null); };
    rd.onload = function () {
      var im = new Image();
      im.onerror = function () { cb(null); };
      im.onload = function () {
        var dim = maxDim, out = null;
        for (var round = 0; round < 4; round++) {
          var sc = Math.min(1, dim / Math.max(im.width, im.height));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * sc));
          c.height = Math.max(1, Math.round(im.height * sc));
          var x = c.getContext('2d');
          x.fillStyle = '#ffffff';
          x.fillRect(0, 0, c.width, c.height);
          x.drawImage(im, 0, 0, c.width, c.height);
          var q = 0.8;
          while (q >= 0.3) {
            out = c.toDataURL('image/jpeg', q);
            if (out.length * 0.75 <= maxBytes) { cb(out); return; }
            q -= 0.1;
          }
          dim = Math.round(dim * 0.8);
        }
        cb(out && out.length * 0.75 <= maxBytes * 1.5 ? out : null);
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  // ===== styles + overlay =====
  var st = document.createElement('style');
  st.textContent =
    '#fOv{position:fixed;inset:0;z-index:95;background:var(--bg);color:var(--tx);overflow-y:auto;display:none}' +
    '#fOv.show{display:block}' +
    '.fTop{position:sticky;top:0;z-index:2;background:var(--card);border-bottom:1px solid var(--bd);padding:8px 12px;display:flex;align-items:center;gap:10px}' +
    '.fWrap{max-width:640px;margin:0 auto;padding:10px 12px 60px}' +
    '.fCard{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px;margin-bottom:10px}' +
    '.fHead{display:flex;align-items:center;gap:8px;margin-bottom:6px}' +
    '.fav{width:36px;height:36px;border-radius:50%;object-fit:cover;background:var(--pri);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;flex:0 0 36px}' +
    '.fName{font-weight:800;font-size:14px}.fTime{color:var(--mut);font-size:11px}' +
    '.fTitle{font-weight:800;margin:2px 0}.fText{white-space:pre-wrap;word-break:break-word;font-size:14px}' +
    '.fImg{display:block;max-width:100%;max-height:420px;border-radius:10px;margin-top:8px;border:1px solid var(--bd)}' +
    '.fRep{border:1px solid var(--bd);border-radius:10px;padding:8px;margin-top:8px;font-size:13px}' +
    '.fAct{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
    '.fAct .on{color:#e5483c;border-color:#e5483c}' +
    '.fCom input,.fCom textarea,.fComp input,.fComp textarea{width:100%;padding:9px 10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit;margin-bottom:6px}' +
    '.fComp textarea{min-height:90px;resize:vertical}';
  document.head.appendChild(st);

  var ov = document.createElement('div');
  ov.id = 'fOv';
  ov.innerHTML = '<div class="fTop"><button class="btn btn-sm" type="button" id="fBack">\u2190 Back</button><b>Community Feed</b></div>' +
    '<div class="fWrap"><div id="fComp"></div><div id="fList"></div><div id="fMore" class="note" style="text-align:center"></div></div>';
  document.body.appendChild(ov);

  function openFeed() {
    ov.classList.add('show');
    document.body.style.overflow = 'hidden';
    drawComp();
    if (!ST.posts.length) loadMore(true);
    g({ action: 'profile', token: TOKEN }).then(function (r) {
      if (r && r.ok) {
        var had = !!PROF;
        PROF = r.profile ? { name: r.profile.name, avatar: r.profile.avatar } : null;
        lsSet('pld_fprof', PROF);
        if (had !== !!PROF) drawComp();
      }
    }).catch(function () {});
  }
  function closeFeed() { ov.classList.remove('show'); document.body.style.overflow = ''; }
  document.getElementById('fBack').addEventListener('click', closeFeed);

  // ===== composer / profile =====
  function drawComp() {
    var box = document.getElementById('fComp');
    if (!PROF) {
      box.innerHTML = '<div class="fCard fComp"><b>Create your profile</b>' +
        '<p class="note">Pick a name and a photo once. The name is locked after that (one change every 7 days).</p>' +
        '<input id="pfName" type="text" maxlength="30" placeholder="Your name (2 to 30 characters, no links)">' +
        '<input id="pfImg" type="file" accept="image/*">' +
        '<input class="hp" id="pfHp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<div class="note" id="pfMsg"></div><button class="btn btn-pri" id="pfGo" type="button">Create profile</button></div>';
      document.getElementById('pfImg').addEventListener('change', function () {
        var f = this.files[0];
        if (!f) return;
        compress(f, 128, 15000, function (d) { ST.avatar = d || ''; setNote('pfMsg', d ? 'Photo ready.' : 'Could not read this photo.', d ? 'ok' : 'err'); });
      });
      document.getElementById('pfGo').addEventListener('click', makeProfile);
      return;
    }
    box.innerHTML = '<div class="fCard fComp"><div class="fHead">' + av(PROF.name, PROF.avatar) + '<div><div class="fName">' + esc(PROF.name) + '</div><div class="fTime">Posting as you</div></div></div>' +
      '<input id="cpTitle" type="text" maxlength="80" placeholder="Title (optional)">' +
      '<textarea id="cpText" maxlength="480" placeholder="What are you building or thinking? (no links)"></textarea>' +
      '<small class="note" id="cpCnt">0 / 480</small>' +
      '<input id="cpImg" type="file" accept="image/*" style="display:none">' +
      '<div id="cpPrev"></div>' +
      '<input class="hp" id="cpHp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="note" id="cpMsg"></div>' +
      '<div class="acts"><button class="btn btn-sm" type="button" id="cpPick">\uD83D\uDDBC Add image</button><button class="btn btn-pri btn-sm" type="button" id="cpGo">Post</button></div></div>';
    ST.img = '';
    document.getElementById('cpText').addEventListener('input', function () {
      document.getElementById('cpCnt').textContent = this.value.length + ' / 480';
    });
    document.getElementById('cpPick').addEventListener('click', function () { document.getElementById('cpImg').click(); });
    document.getElementById('cpImg').addEventListener('change', function () {
      var f = this.files[0];
      if (!f) return;
      setNote('cpMsg', 'Compressing image...');
      compress(f, 800, 100000, function (d) {
        if (!d) { setNote('cpMsg', 'Could not read this image.', 'err'); return; }
        ST.img = d;
        document.getElementById('cpPrev').innerHTML = '<img class="fImg" src="' + d + '" alt="">';
        setNote('cpMsg', 'Image ready (about ' + Math.round(d.length * 0.75 / 1000) + ' KB).', 'ok');
      });
    });
    document.getElementById('cpGo').addEventListener('click', sendPost);
  }
  function makeProfile() {
    var name = document.getElementById('pfName').value.trim();
    var b = document.getElementById('pfGo');
    if (name.length < 2) { setNote('pfMsg', 'Please enter a name.', 'err'); return; }
    if (/(https?:\/\/|www\.|\.com|\.net|\.org|\.io)/i.test(name)) { setNote('pfMsg', 'Links are not allowed in names.', 'err'); return; }
    b.disabled = true;
    setNote('pfMsg', 'Creating...');
    post({ action: 'profile', name: name, avatar: '', hp: document.getElementById('pfHp').value }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || 'Could not create profile.');
      PROF = { name: r.profile.name, avatar: '' };
      lsSet('pld_fprof', PROF);
      if (ST.avatar) {
        return post({ action: 'avatar', data: ST.avatar }).then(function (a) {
          if (a && a.ok) { PROF.avatar = a.avatar; lsSet('pld_fprof', PROF); }
        }).catch(function () {});
      }
    }).then(function () { drawComp(); }).catch(function (e) {
      setNote('pfMsg', errMsg(e), 'err');
      b.disabled = false;
    });
  }
  function sendPost() {
    var text = document.getElementById('cpText').value.trim();
    var title = document.getElementById('cpTitle').value.trim();
    var b = document.getElementById('cpGo');
    if (document.getElementById('cpHp').value) return;
    if (text.length < 3) { setNote('cpMsg', 'Please write something (at least 3 characters).', 'err'); return; }
    if (/(https?:\/\/|www\.|\.com|\.net|\.org|\.io|\bdot\s*com\b)/i.test(title + ' ' + text)) { setNote('cpMsg', 'Links are not allowed in posts.', 'err'); return; }
    b.disabled = true;
    setNote('cpMsg', 'Posting...');
    var up = ST.img ? post({ action: 'upload', data: ST.img }) : Promise.resolve({ ok: true, url: '' });
    up.then(function (u) {
      if (!u || !u.ok) throw new Error((u && u.error) || 'Image upload failed.');
      return post({ action: 'post', text: text, title: title, image: u.url || '', hp: document.getElementById('cpHp').value });
    }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || 'Could not post.');
      ST.posts.unshift(r.post);
      drawComp();
      drawList();
      toast('Posted.');
    }).catch(function (e) {
      setNote('cpMsg', errMsg(e), 'err');
      b.disabled = false;
    });
  }

  // ===== list =====
  function postHtml(p) {
    var id = esc(p.id);
    var h = '<div class="fCard" data-id="' + id + '"><div class="fHead">' + av(p.name, p.avatar) + '<div><div class="fName">' + esc(p.name) + '</div><div class="fTime">' + esc(ago(p.created)) + '</div></div></div>';
    if (p.repostOf) {
      h += '<div class="note" style="margin:0">\u21BB Reposted</div><div class="fRep"><b>' + esc(p.repostOf.name) + '</b>' +
        (p.repostOf.title ? '<div class="fTitle">' + esc(p.repostOf.title) + '</div>' : '') +
        '<div class="fText">' + esc(p.repostOf.text) + '</div>' +
        (p.repostOf.image ? '<img class="fImg" loading="lazy" src="' + esc(p.repostOf.image) + '" alt="">' : '') + '</div>';
    } else {
      if (p.title) h += '<div class="fTitle">' + esc(p.title) + '</div>';
      h += '<div class="fText">' + esc(p.text) + '</div>';
      if (p.image) h += '<img class="fImg" loading="lazy" src="' + esc(p.image) + '" alt="">';
    }
    h += '<div class="fAct">' +
      '<button class="btn btn-sm" type="button" data-f="cm" data-id="' + id + '">\uD83D\uDCAC ' + (p.comments || 0) + '</button>' +
      '<button class="btn btn-sm" type="button" data-f="rp" data-id="' + id + '">\u21BB ' + (p.reposts || 0) + '</button>' +
      '<button class="btn btn-sm' + (LIKED[p.id] ? ' on' : '') + '" type="button" data-f="lk" data-id="' + id + '">' + (LIKED[p.id] ? '\u2764' : '\u2661') + ' ' + (p.likes || 0) + '</button>' +
      '<button class="btn btn-sm" type="button" data-f="rt" data-id="' + id + '">Report</button></div>';
    if (ST.open[p.id]) {
      var list = ST.cms[p.id];
      h += '<div class="fCom" style="margin-top:8px">';
      if (!list) h += '<p class="note">Loading comments...</p>';
      else if (!list.length) h += '<p class="note">No comments yet.</p>';
      else h += list.map(function (c) { return '<div class="cm"><b>' + esc(c.name) + '</b><span>' + esc(ago(c.created)) + '</span><p>' + esc(c.text) + '</p></div>'; }).join('');
      h += '<textarea class="cmT" maxlength="300" placeholder="Write a comment (no links)" style="min-height:56px"></textarea>' +
        '<button class="btn btn-sm btn-pri" type="button" data-f="cs" data-id="' + id + '">Comment</button> <span class="note cmM"></span></div>';
    }
    return h + '</div>';
  }
  function drawList() {
    var el = document.getElementById('fList');
    el.innerHTML = ST.posts.length ? ST.posts.map(postHtml).join('') : '<p class="note" style="text-align:center">No posts yet. Be the first!</p>';
    document.getElementById('fMore').textContent = ST.more ? '' : (ST.posts.length ? 'You reached the end.' : '');
  }
  function loadMore(first) {
    if (ST.busy || (!ST.more && !first)) return;
    ST.busy = true;
    document.getElementById('fMore').textContent = 'Loading...';
    g({ action: 'feed', offset: ST.offset }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || 'Could not load the feed.');
      var seen = {};
      ST.posts.forEach(function (p) { seen[p.id] = 1; });
      (r.posts || []).forEach(function (p) { if (!seen[p.id]) ST.posts.push(p); });
      ST.offset += 15;
      ST.more = !!r.hasMore;
      drawList();
    }).catch(function (e) {
      document.getElementById('fMore').textContent = errMsg(e);
    }).then(function () { ST.busy = false; });
  }
  ov.addEventListener('scroll', function () {
    if (ov.scrollTop + ov.clientHeight > ov.scrollHeight - 400) loadMore(false);
  }, { passive: true });

  // ===== actions =====
  function findPost(id) {
    for (var i = 0; i < ST.posts.length; i++) { if (ST.posts[i].id === id) return ST.posts[i]; }
    return null;
  }
  ov.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-f]') : null;
    if (!b) return;
    var f = b.getAttribute('data-f'), id = b.getAttribute('data-id'), p = findPost(id);
    if (!p) return;
    if (!PROF && f !== 'cm') { toast('Create your profile first.'); window.scrollTo(0, 0); ov.scrollTop = 0; return; }
    if (f === 'cm') {
      ST.open[id] = !ST.open[id];
      drawList();
      if (ST.open[id] && !ST.cms[id]) {
        g({ action: 'comments', fid: id }).then(function (r) { ST.cms[id] = (r && r.ok) ? r.comments : []; drawList(); }).catch(function () { ST.cms[id] = []; drawList(); });
      }
    } else if (f === 'lk') {
      if (LIKED[id]) { toast('You already liked this post.'); return; }
      LIKED[id] = 1; lsSet('pld_flike', LIKED); p.likes = (p.likes || 0) + 1; drawList();
      post({ action: 'like', id: id }).then(function (r) { if (!r || !r.ok) throw new Error((r && r.error) || 'fail'); })
        .catch(function (er) { delete LIKED[id]; lsSet('pld_flike', LIKED); p.likes = Math.max((p.likes || 1) - 1, 0); drawList(); toast(errMsg(er)); });
    } else if (f === 'rp') {
      if (!confirm('Repost this to your profile?')) return;
      post({ action: 'repost', id: id }).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || 'Could not repost.');
        p.reposts = r.reposts || ((p.reposts || 0) + 1);
        ST.posts.unshift(r.post);
        drawList();
        toast('Reposted.');
      }).catch(function (er) { toast(errMsg(er)); });
    } else if (f === 'rt') {
      if (!confirm('Report this post?')) return;
      post({ action: 'report', id: id, reason: 'Report' }).then(function (r) {
        toast(r && r.ok ? 'Thank you. Report sent.' : ((r && r.error) || 'Could not send the report.'));
      }).catch(function (er) { toast(errMsg(er)); });
    } else if (f === 'cs') {
      var card = b.parentNode;
      var t = card.querySelector('.cmT').value.trim();
      var m = card.querySelector('.cmM');
      if (t.length < 2) { m.textContent = 'Please write a comment.'; return; }
      if (/(https?:\/\/|www\.|\.com|\.net|\.org|\.io)/i.test(t)) { m.textContent = 'Links are not allowed.'; return; }
      b.disabled = true;
      m.textContent = 'Posting...';
      post({ action: 'comment', fid: id, text: t }).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || 'Could not comment.');
        (ST.cms[id] = ST.cms[id] || []).push({ name: PROF.name, text: t, created: new Date().toISOString() });
        p.comments = r.comments || ((p.comments || 0) + 1);
        drawList();
      }).catch(function (er) { m.textContent = errMsg(er); b.disabled = false; });
    }
  });

  // ===== entry points: header button + menu =====
  var hb = document.querySelector('.hdr .hbtns');
  if (hb) {
    var fb2 = document.createElement('button');
    fb2.className = 'btn';
    fb2.type = 'button';
    fb2.textContent = 'Feed';
    fb2.addEventListener('click', openFeed);
    hb.insertBefore(fb2, hb.firstChild);
  }
  var mp = document.getElementById('mnuP');
  if (mp) {
    var a = document.createElement('a');
    a.href = '#';
    a.textContent = '\uD83D\uDCAC Community Feed';
    a.addEventListener('click', function (e) { e.preventDefault(); setTimeout(openFeed, 60); });
    mp.insertBefore(a, mp.children[1] || null);
  }
})();
