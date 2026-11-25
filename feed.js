(function () {
  var FEED = 'https://script.google.com/macros/s/AKfycbxLtGXBecFvROe5dDKpJMPRSaOeWmtAQxdDdNux7Y0n0R6gOmi6KEeIPAP-mp-A48Q/exec';
  var errMsg = window.errMsg || function (e) { return (e && e.message) ? e.message : 'Something went wrong.'; };
  var PROF = lsGet('pld_fprof', null);
  var TOKEN = lsGet('pld_ftoken', '');
  if (!TOKEN) {
    var ra = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(ra);
    TOKEN = Array.prototype.map.call(ra, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    lsSet('pld_ftoken', TOKEN);
  }
  var ST = { posts: [], offset: 0, more: true, busy: false, open: {}, cms: {}, full: {}, img: '', avatar: '' };
  var LIKED = lsGet('pld_flike', {});
  var MINE = lsGet('pld_fmine', {});

  function g(p) { return apiGet(FEED, p); }
  function post(b) { b.token = TOKEN; return apiPost(FEED, b, 40000); }
  function initial(n) { return esc(String(n || '?').charAt(0).toUpperCase()); }
  function av(name, url, sz) {
    sz = sz || 40;
    var sty = 'width:' + sz + 'px;height:' + sz + 'px;flex:0 0 ' + sz + 'px;font-size:' + Math.round(sz * 0.42) + 'px';
    if (url) return '<img class="fav" style="' + sty + '" src="' + esc(url) + '" alt="" onerror="this.outerHTML=\'<span class=fav style=&quot;' + sty + '&quot;>' + initial(name) + '</span>\'">';
    return '<span class="fav" style="' + sty + '">' + initial(name) + '</span>';
  }
  function handle(n) { return '@' + (String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'); }
  function lk(t) {
    return esc(t).replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="nofollow ugc noopener noreferrer">' + u + '</a>';
    });
  }
  function body(t, id) {
    t = String(t || '');
    if (t.length > 260 && !ST.full[id]) {
      var c = t.slice(0, 260), sp = c.lastIndexOf(' ');
      if (sp > 150) c = c.slice(0, sp);
      return lk(c) + '\u2026 <a href="#" class="fMoreL" data-f="rm" data-id="' + esc(id) + '">Read More</a>';
    }
    return lk(t);
  }
  function isMine(p) { return !!(MINE[p.id] || (PROF && p.name === PROF.name)); }

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
  st.textContent = [
    '#fOv{position:fixed;inset:0;z-index:95;background:var(--bg);color:var(--tx);overflow-y:auto;display:none;font-size:15px;-webkit-text-size-adjust:100%}',
    '#fOv.show{display:block}',
    '.fTop{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--bd);padding:10px 14px;display:flex;align-items:center;gap:12px;font-size:16px}',
        '.fWrap{max-width:none;margin:0;padding-bottom:90px}',
    '@media(min-width:1200px){.fWrap{max-width:760px;margin:0 auto}}',
    '.fPost{padding:14px 14px 10px;border-bottom:1px solid var(--bd)}',
    '.fRow{display:flex;gap:10px}.fCol{flex:1;min-width:0}',
    '.fav{border-radius:50%;object-fit:cover;background:var(--pri);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800}',
    '.fHd{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
    '.fName{font-weight:700;font-size:15px}.fMut{color:var(--mut);font-size:13px}',
    '.fLnk{margin-left:auto;background:none;border:0;color:var(--mut);font-size:13px;cursor:pointer;padding:2px 4px}',
    '.fTitle{font-weight:700;font-size:16px;margin:4px 0 2px}',
    '.fText{white-space:pre-wrap;word-break:break-word;line-height:1.45;margin-top:2px}',
    '.fText a,.fCmT a{color:var(--pri)}.fMoreL{color:var(--pri);text-decoration:none;font-weight:600}',
    '.fImg{display:block;max-width:100%;max-height:440px;border-radius:12px;margin-top:8px;border:1px solid var(--bd)}',
    '.fRep{border:1px solid var(--bd);border-radius:12px;padding:10px;margin-top:6px}',
    '.fAct{display:flex;gap:4px;align-items:center;margin-top:6px}',
    '.fb{background:none;border:0;color:var(--mut);font:inherit;font-size:14px;padding:8px 12px 8px 0;margin-right:10px;cursor:pointer}',
    '.fb.on{color:var(--pri);font-weight:700}.fb.fRt{margin-left:auto;margin-right:0;padding-right:0;font-size:13px}',
    '.fTopC{display:flex;gap:8px;margin-top:6px;padding:8px 10px;background:var(--card);border-radius:12px;font-size:14px}',
    '.fCom{margin-top:8px}.fCom .cmRow{display:flex;gap:8px;margin-bottom:10px}',
    '.fCmT{word-break:break-word;font-size:14px;margin-top:1px}',
    '.fComp input[type=text],.fComp textarea,.fPf input[type=text]{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit;margin-bottom:6px}',
    '.fComp textarea{min-height:84px;resize:vertical}.fCom textarea{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit;min-height:56px;margin-bottom:6px}',
    '.fPf{padding:16px 14px;border-bottom:1px solid var(--bd)}'
  ].join('');
  document.head.appendChild(st);

  var ov = document.createElement('div');
  ov.id = 'fOv';
  ov.innerHTML = '<div class="fTop"><button class="btn btn-sm" type="button" id="fBack">\u2190 Back</button><b>Community Feed</b></div>' +
    '<div class="fWrap"><div id="fComp"></div><div id="fList"></div><div id="fMore" class="note" style="text-align:center;padding:14px"></div></div>';
  document.body.appendChild(ov);

  function openFeed() {
    ov.classList.add('show');
    document.body.style.overflow = 'hidden';
    drawComp();
    if (!ST.posts.length) loadMore(true);
    g({ action: 'profile', token: TOKEN }).then(function (r) {
      if (r && r.ok) {
        var had = !!PROF, hadAv = PROF ? PROF.avatar : '';
        PROF = r.profile ? { name: r.profile.name, avatar: r.profile.avatar } : null;
        lsSet('pld_fprof', PROF);
        if (had !== !!PROF || hadAv !== (PROF ? PROF.avatar : '')) drawComp();
      }
    }).catch(function () {});
  }
  function closeFeed() { ov.classList.remove('show'); document.body.style.overflow = ''; }
  document.getElementById('fBack').addEventListener('click', closeFeed);

  // ===== composer / profile =====
  function drawComp() {
    var box = document.getElementById('fComp');
    if (!PROF) {
      box.innerHTML = '<div class="fPf fComp"><b style="font-size:17px">Create your profile</b>' +
        '<p class="note">Pick a name and a photo once. The name can be changed once every 7 days.</p>' +
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
    box.innerHTML = '<div class="fPost fComp"><div class="fRow"><span id="cpAv" style="cursor:pointer">' + av(PROF.name, PROF.avatar, 40) + '</span><div class="fCol">' +
      '<div class="fName">' + esc(PROF.name) + '</div>' +
      '<div class="fMut" id="cpHint" style="margin-bottom:6px">' + (PROF.avatar ? 'Posting as you' : 'Tap your picture to add a photo') + '</div>' +
      '<input id="cpAvF" type="file" accept="image/*" style="display:none">' +
      '<input id="cpTitle" type="text" maxlength="80" placeholder="Title (optional)">' +
      '<textarea id="cpText" maxlength="480" placeholder="What are you building or thinking?"></textarea>' +
      '<small class="note" id="cpCnt">0 / 480</small>' +
      '<input id="cpImg" type="file" accept="image/*" style="display:none">' +
      '<div id="cpPrev"></div>' +
      '<input class="hp" id="cpHp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="note" id="cpMsg"></div>' +
      '<div class="acts"><button class="btn btn-sm" type="button" id="cpPick">\uD83D\uDDBC Add image</button><button class="btn btn-pri btn-sm" type="button" id="cpGo">Post</button></div></div></div></div>';
    ST.img = '';
    document.getElementById('cpText').addEventListener('input', function () {
      document.getElementById('cpCnt').textContent = this.value.length + ' / 480';
    });
    document.getElementById('cpAv').addEventListener('click', function () { document.getElementById('cpAvF').click(); });
    document.getElementById('cpAvF').addEventListener('change', function () {
      var f = this.files[0];
      if (!f) return;
      setNote('cpMsg', 'Updating photo...');
      compress(f, 128, 15000, function (d) {
        if (!d) { setNote('cpMsg', 'Could not read this photo.', 'err'); return; }
        post({ action: 'avatar', data: d }).then(function (a) {
          if (!a || !a.ok) throw new Error((a && a.error) || 'Could not update photo.');
          PROF.avatar = a.avatar;
          lsSet('pld_fprof', PROF);
          document.getElementById('cpAv').innerHTML = av(PROF.name, PROF.avatar, 40);
          document.getElementById('cpHint').textContent = 'Posting as you';
          ST.posts.forEach(function (p) { if (p.name === PROF.name) p.avatar = a.avatar; });
          drawList();
          setNote('cpMsg', 'Photo updated.', 'ok');
        }).catch(function (e) { setNote('cpMsg', errMsg(e), 'err'); });
      });
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
    b.disabled = true;
    setNote('cpMsg', 'Posting...');
    var up = ST.img ? post({ action: 'upload', data: ST.img }) : Promise.resolve({ ok: true, url: '' });
    up.then(function (u) {
      if (!u || !u.ok) throw new Error((u && u.error) || 'Image upload failed.');
      return post({ action: 'post', text: text, title: title, image: u.url || '', hp: document.getElementById('cpHp').value });
    }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || 'Could not post.');
      MINE[r.post.id] = 1;
      lsSet('pld_fmine', MINE);
      ST.posts.unshift(r.post);
      drawComp();
      drawList();
      ov.scrollTop = 0;
      toast('Posted.');
    }).catch(function (e) {
      setNote('cpMsg', errMsg(e), 'err');
      b.disabled = false;
    });
  }

  // ===== list =====
  function postHtml(p) {
    var id = esc(p.id), mine = isMine(p);
    var h = '<div class="fPost" data-id="' + id + '"><div class="fRow">' + av(p.name, p.avatar, 40) + '<div class="fCol">';
    h += '<div class="fHd"><span class="fName">' + esc(p.name) + '</span><span class="fMut">' + esc(handle(p.name)) + ' \u00B7 ' + esc(ago(p.created)) + '</span>' +
      (mine ? '<button class="fLnk" type="button" data-f="dl" data-id="' + id + '">Delete</button>' : '') + '</div>';
    if (p.repostOf) {
      h += '<div class="fMut" style="margin:2px 0">\u21BB Reposted</div><div class="fRep"><b>' + esc(p.repostOf.name) + '</b>' +
        (p.repostOf.title ? '<div class="fTitle">' + esc(p.repostOf.title) + '</div>' : '') +
        '<div class="fText">' + body(p.repostOf.text, p.id + 'r') + '</div>' +
        (p.repostOf.image ? '<img class="fImg" loading="lazy" src="' + esc(p.repostOf.image) + '" alt="">' : '') + '</div>';
    } else {
      if (p.title) h += '<div class="fTitle">' + esc(p.title) + '</div>';
      h += '<div class="fText">' + body(p.text, p.id) + '</div>';
      if (p.image) h += '<img class="fImg" loading="lazy" src="' + esc(p.image) + '" alt="">';
    }
    h += '<div class="fAct">' +
      '<button class="fb" type="button" data-f="cm" data-id="' + id + '">\uD83D\uDCAC ' + (p.comments || 0) + '</button>' +
      '<button class="fb" type="button" data-f="rp" data-id="' + id + '">\u21BB ' + (p.reposts || 0) + '</button>' +
      '<button class="fb' + (LIKED[p.id] ? ' on' : '') + '" type="button" data-f="lk" data-id="' + id + '">\u25B2 ' + (p.likes || 0) + '</button>' +
      (mine ? '' : '<button class="fb fRt" type="button" data-f="rt" data-id="' + id + '">Report</button>') + '</div>';
    if (ST.open[p.id]) {
      var list = ST.cms[p.id];
      h += '<div class="fCom">';
      if (!list) h += '<p class="note">Loading comments...</p>';
      else if (!list.length) h += '<p class="note">No comments yet.</p>';
      else h += list.map(function (c) {
        return '<div class="cmRow">' + av(c.name, c.avatar, 28) + '<div><span class="fName" style="font-size:14px">' + esc(c.name) + '</span> <span class="fMut">' + esc(ago(c.created)) + '</span><div class="fCmT">' + esc(c.text) + '</div></div></div>';
      }).join('');
      h += '<textarea class="cmT" maxlength="300" placeholder="Write a comment (no links)"></textarea>' +
        '<button class="btn btn-sm btn-pri" type="button" data-f="cs" data-id="' + id + '">Comment</button> <span class="note cmM"></span></div>';
    } else if (p.top) {
      h += '<div class="fTopC" data-f="cm" data-id="' + id + '" style="cursor:pointer">' + av(p.top.name, p.top.avatar, 26) + '<div><b>' + esc(p.top.name) + '</b> <span class="fMut">' + esc(ago(p.top.created)) + '</span><div class="fCmT">' + esc(String(p.top.text).slice(0, 140)) + '</div></div></div>';
    }
    return h + '</div></div></div>';
  }
  function drawList() {
    var el = document.getElementById('fList');
    el.innerHTML = ST.posts.length ? ST.posts.map(postHtml).join('') : '<p class="note" style="text-align:center;padding:20px">No posts yet. Be the first!</p>';
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
    if (f === 'rm') { e.preventDefault(); ST.full[id] = 1; ST.full[id + 'r'] = 1; drawList(); return; }
    if (!PROF && f !== 'cm') { toast('Create your profile first.'); ov.scrollTop = 0; return; }
    if (f === 'cm') {
      ST.open[id] = !ST.open[id];
      drawList();
      if (ST.open[id] && !ST.cms[id]) {
        g({ action: 'comments', fid: id }).then(function (r) { ST.cms[id] = (r && r.ok) ? r.comments : []; drawList(); }).catch(function () { ST.cms[id] = []; drawList(); });
      }
    } else if (f === 'lk') {
      if (isMine(p)) { toast('You cannot like your own post.'); return; }
      if (LIKED[id]) { toast('You already liked this post.'); return; }
      LIKED[id] = 1; lsSet('pld_flike', LIKED); p.likes = (p.likes || 0) + 1; drawList();
      post({ action: 'like', id: id }).then(function (r) { if (!r || !r.ok) throw new Error((r && r.error) || 'fail'); })
        .catch(function (er) { delete LIKED[id]; lsSet('pld_flike', LIKED); p.likes = Math.max((p.likes || 1) - 1, 0); drawList(); toast(errMsg(er)); });
    } else if (f === 'rp') {
      if (isMine(p)) { toast('You cannot repost your own post.'); return; }
      if (!confirm('Repost this to your profile?')) return;
      post({ action: 'repost', id: id }).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || 'Could not repost.');
        p.reposts = r.reposts || ((p.reposts || 0) + 1);
        MINE[r.post.id] = 1; lsSet('pld_fmine', MINE);
        ST.posts.unshift(r.post);
        drawList();
        ov.scrollTop = 0;
        toast('Reposted.');
      }).catch(function (er) { toast(errMsg(er)); });
    } else if (f === 'rt') {
      if (!confirm('Report this post?')) return;
      post({ action: 'report', id: id, reason: 'Report' }).then(function (r) {
        toast(r && r.ok ? 'Thank you. Report sent.' : ((r && r.error) || 'Could not send the report.'));
      }).catch(function (er) { toast(errMsg(er)); });
    } else if (f === 'dl') {
      if (!confirm('Delete this post?')) return;
      post({ action: 'delete', id: id }).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || 'Could not delete.');
        ST.posts = ST.posts.filter(function (x) { return x.id !== id; });
        drawList();
        toast('Deleted.');
      }).catch(function (er) { toast(errMsg(er)); });
    } else if (f === 'cs') {
      var card = b.parentNode;
      var t = card.querySelector('.cmT').value.trim();
      var m = card.querySelector('.cmM');
      if (t.length < 2) { m.textContent = 'Please write a comment.'; return; }
      if (/(https?:\/\/|www\.|\.com|\.net|\.org|\.io)/i.test(t)) { m.textContent = 'Links are not allowed in comments.'; return; }
      b.disabled = true;
      m.textContent = 'Posting...';
      post({ action: 'comment', fid: id, text: t }).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || 'Could not comment.');
        var nc = { name: PROF.name, avatar: PROF.avatar, text: t, created: new Date().toISOString() };
        (ST.cms[id] = ST.cms[id] || []).push(nc);
        p.top = nc;
        p.comments = r.comments || ((p.comments || 0) + 1);
        drawList();
      }).catch(function (er) { m.textContent = errMsg(er); b.disabled = false; });
    }
  });

  // ===== entry points: header button + menu =====
  var hb = document.querySelector('.hdr .hbtns') || document.querySelector('.hdr .wrap');
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
