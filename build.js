const fs = require('fs');
const API = 'https://script.google.com/macros/s/AKfycbzOk74whjsJmjo3oLQIklsYDvgc3hvrGkikR-P__hD-Rq9U23emuEfE_f7bAOlXCQtDSw/exec?action=list';
const SITE = 'https://launch.globaltoolsbox.online';
const STATIC = ['/', '/guide.html', '/about.html', '/contact.html', '/privacy.html', '/terms.html', '/disclaimer.html', '/all.html'];

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function okUrl(u) { return /^https?:\/\//i.test(String(u || '').trim()); }
function truthy(v) { return v === true || v === 1 || v === '1' || /^(true|yes)$/i.test(String(v)); }
function safeId(id) { return String(id).replace(/[^A-Za-z0-9_-]/g, ''); }
function cut(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 3).trim() + '...' : s; }
function day(p) { var d = String(p.created || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '2026-11-05'; }

const NAV = '<nav class="top"><div><a class="b" href="/"><img src="/logo.png" alt="">Launch Directory</a><a href="/">Home</a><a href="/all.html">All products</a><a href="/guide.html">Guide</a><a href="/about.html">About</a><a href="/contact.html">Contact</a></div></nav>';
const FOOT = '<footer><a href="/">Home</a><a href="/all.html">All products</a><a href="/guide.html">Guide</a><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/disclaimer.html">Disclaimer</a><p>&copy; 2026 Product Launch Directory. A project by <a href="https://www.globaltoolsbox.online/">Global Tools Box</a>.</p></footer></body></html>';

function head(title, desc, path, extra) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title) + '</title><meta name="description" content="' + esc(desc) + '"><link rel="canonical" href="' + SITE + path + '"><meta name="robots" content="index,follow"><link rel="icon" type="image/png" href="/logo.png"><link rel="stylesheet" href="/page.css"><script async src="/track.js"></script>' + (extra || '') + '</head><body>' + NAV;
}

function productPage(p, all) {
  const id = safeId(p.id);
  const path = '/p/' + id + '.html';
  const tags = (Array.isArray(p.tags) ? p.tags : []).slice(0, 4);
  const title = cut(p.name + ': ' + p.tagline, 62) + ' | Launch Directory';
  const desc = cut(p.tagline + '. ' + p.description, 155);
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: p.name,
    description: cut(p.description, 300),
    applicationCategory: 'WebApplication',
    url: okUrl(p.website) ? p.website : SITE + path
  }).replace(/</g, '\\u003c');
  const rel = all.filter(function (x) { return x.category === p.category && x.id !== p.id; })
    .sort(function (a, b) { return (Number(b.upvotes) || 0) - (Number(a.upvotes) || 0); }).slice(0, 4);
  let h = head(title, desc, path, '<script type="application/ld+json">' + ld + '</script>');
  h += '<main><article>';
  if (okUrl(p.image)) h += '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + ' logo" width="72" height="72" style="border-radius:14px;float:right;margin:0 0 8px 10px" onerror="this.style.display=\'none\'">';
  h += '<h1>' + esc(p.name) + '</h1>';
  h += '<p><b>' + esc(p.tagline) + '</b></p>';
  h += '<p class="mut">Category: ' + esc(p.category) + (tags.length ? ' | Tags: ' + tags.map(function (t) { return '#' + esc(t); }).join(' ') : '') + ' | Listed: ' + day(p) + '</p>';
  h += '<p>' + esc(p.description) + '</p>';
  if (okUrl(p.website)) h += '<a class="btn" href="' + esc(p.website) + '" target="_blank" rel="nofollow noopener noreferrer">Visit ' + esc(p.name) + '</a><br>';
  h += '<a href="/#p-' + esc(id) + '">Upvote and comment in the directory</a>';
  h += '<div class="box">This listing was submitted by its maker. Links are nofollow. Please read our <a href="/disclaimer.html">Disclaimer</a>.</div>';
  if (rel.length) {
    h += '<h2>More in ' + esc(p.category) + '</h2><ul>';
    rel.forEach(function (x) { h += '<li><a href="/p/' + safeId(x.id) + '.html">' + esc(x.name) + '</a> - ' + esc(cut(x.tagline, 90)) + '</li>'; });
    h += '</ul>';
  }
  h += '</article></main>' + FOOT;
  return h;
}

function allPage(all) {
  let h = head('All Products | Launch Directory', 'Browse the full list of free web tools launched on Product Launch Directory, grouped by category: AI Tools, Developer Tools, Productivity, Marketing, Design, Finance and Education.', '/all.html');
  h += '<main><article><h1>All Products</h1><p class="mut">' + all.length + ' free tools, grouped by category.</p>';
  const cats = {};
  all.forEach(function (p) { (cats[p.category] = cats[p.category] || []).push(p); });
  Object.keys(cats).sort().forEach(function (c) {
    h += '<h2>' + esc(c) + '</h2><ul>';
    cats[c].forEach(function (p) { h += '<li><a href="/p/' + safeId(p.id) + '.html">' + esc(p.name) + '</a> - ' + esc(cut(p.tagline, 90)) + '</li>'; });
    h += '</ul>';
  });
  return h + '</article></main>' + FOOT;
}

async function main() {
  const r = await fetch(API, { redirect: 'follow' });
  const j = await r.json();
  if (!j || !j.ok || !Array.isArray(j.products) || j.products.length < 5) throw new Error('Bad product list, nothing changed.');
  const all = j.products.filter(function (p) { return !truthy(p.pending) && safeId(p.id); });
  fs.rmSync('p', { recursive: true, force: true });
  fs.mkdirSync('p', { recursive: true });
  all.forEach(function (p) { fs.writeFileSync('p/' + safeId(p.id) + '.html', productPage(p, all)); });
  fs.writeFileSync('all.html', allPage(all));
  const today = new Date().toISOString().slice(0, 10);
  let sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  STATIC.forEach(function (u) { sm += '<url><loc>' + SITE + u + '</loc><lastmod>' + today + '</lastmod></url>\n'; });
  all.forEach(function (p) { sm += '<url><loc>' + SITE + '/p/' + safeId(p.id) + '.html</loc><lastmod>' + day(p) + '</lastmod></url>\n'; });
  sm += '</urlset>\n';
  fs.writeFileSync('sitemap.xml', sm);
  console.log('Built ' + all.length + ' product pages.');
}
main().catch(function (e) { console.error(e); process.exit(1); });
