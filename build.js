const fs = require('fs');
const API = 'https://script.google.com/macros/s/AKfycbzK9E_RqCcEFKqqUZlcq49r-JO0U-dyhBEhcrHBVnKvumFoD1aQB4iq-ZiwudycP6YpDQ/exec?action=list';
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

const CAT_INFO = {
  'AI Tools': 'AI tools use machine learning to write, design, analyze or automate tasks. Test any AI tool on a small task first, and check what data it asks you to upload.',
  'Developer Tools': 'Developer tools help with building, testing and shipping software. Check the documentation, pricing limits and whether it fits your stack before adopting it.',
  'Productivity': 'Productivity tools aim to save time on everyday work like notes, planning and automation. Try the free version on one real task before moving your workflow.',
  'Marketing': 'Marketing tools help with content, SEO, outreach and analytics. Check the free limits and whether results can be exported.',
  'Design': 'Design tools cover images, fonts, layouts and branding. Check export quality, file formats and the license for commercial use.',
  'Finance': 'Finance tools cover calculations, budgeting and money tracking. Treat results as estimates and verify important numbers yourself.',
  'Education': 'Education tools help with learning, teaching and practice. Check the age suitability and whether progress can be saved.'
};
function hash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; }
function tagsOf(p) { return (Array.isArray(p.tags) ? p.tags : []).map(function (t) { return String(t).toLowerCase(); }); }
function related(p, all, n) {
  var pt = tagsOf(p);
  return all.filter(function (x) { return x.id !== p.id; }).map(function (x) {
    var shared = tagsOf(x).filter(function (t) { return pt.indexOf(t) > -1; }).length;
    return { x: x, s: (x.category === p.category ? 10 : 0) + shared * 3 + (hash(p.id + '|' + x.id) % 100) / 100 };
  }).sort(function (a, b) { return b.s - a.s; }).slice(0, n).map(function (o) { return o.x; });
}
function aboutText(p, all) {
  var same = all.filter(function (x) { return x.category === p.category; }).length;
  var tags = (Array.isArray(p.tags) ? p.tags : []).slice(0, 4);
  var votes = Number(p.upvotes) || 0;
  var h = '<h2>About ' + esc(p.name) + ' on this directory</h2>';
  h += '<p>' + esc(p.name) + ' is listed under ' + esc(p.category) + ', one of ' + same + ' tools in this category out of ' + all.length + ' products in the directory. It was listed on ' + day(p) + (votes > 0 ? ' and has ' + votes + ' upvote' + (votes > 1 ? 's' : '') + ' from visitors.' : '.') + '</p>';
  if (tags.length) h += '<p>The maker tagged it with ' + tags.map(esc).join(', ') + ', which shows what it focuses on.</p>';
  h += '<p>' + (CAT_INFO[p.category] || '') + '</p>';
  h += '<h3>Before you try it</h3><ul><li>Open the official website and read its terms and privacy policy.</li><li>Do not share passwords or sensitive data with a new tool.</li><li>Compare it with the similar tools listed below.</li></ul>';
  return h;
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
  const rel = related(p, all, 8);
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
  h += aboutText(p, all);
  if (rel.length) {
    h += '<h2>Similar tools</h2><ul>';
    rel.forEach(function (x) { h += '<li><a href="/p/' + safeId(x.id) + '.html">' + esc(x.name) + '</a> - ' + esc(cut(x.tagline, 90)) + '</li>'; });
    h += '</ul>';
  }
  h += '</article></main>' + FOOT;
  return h;
}
function homeList(all) {
  var latest = all.slice().sort(function (a, b) { return day(b).localeCompare(day(a)); }).slice(0, 30);
  var h = '';
  latest.forEach(function (p) {
    h += '<div class="row"><div class="info"><a class="name" href="/p/' + safeId(p.id) + '.html">' + esc(p.name) + '</a><div class="tagline">' + esc(cut(p.tagline, 110)) + '</div></div></div>';
  });
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
    const re = /<!--STATIC_LIST-->[\s\S]*?<!--\/STATIC_LIST-->/;
  let idx = fs.readFileSync('index.html', 'utf8');
  if (re.test(idx)) {
    idx = idx.replace(re, function () { return '<!--STATIC_LIST-->' + homeList(all) + '<!--/STATIC_LIST-->'; });
    fs.writeFileSync('index.html', idx);
  }
  const today = new Date().toISOString().slice(0, 10);
  let sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  STATIC.forEach(function (u) { sm += '<url><loc>' + SITE + u + '</loc><lastmod>' + today + '</lastmod></url>\n'; });
  all.forEach(function (p) { sm += '<url><loc>' + SITE + '/p/' + safeId(p.id) + '.html</loc><lastmod>' + day(p) + '</lastmod></url>\n'; });
  sm += '</urlset>\n';
  fs.writeFileSync('sitemap.xml', sm);
  console.log('Built ' + all.length + ' product pages.');
}
main().catch(function (e) { console.error(e); process.exit(1); });
