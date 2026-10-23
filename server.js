// Pyro's Gateway: tiny backend. Needs Node 18+ and a YouTube Data API key. No npm install needed.
// Run:  YT_API_KEY=your_key node server.js      then open http://localhost:3000
const http = require('http'), fs = require('fs'), path = require('path');
const KEY = process.env.YT_API_KEY, PORT = process.env.PORT || 3000;
const API = process.env.YT_API_BASE || 'https://www.googleapis.com/youtube/v3/';
if (!KEY) { console.error('Missing YT_API_KEY. See README.md.'); process.exit(1); }

const cache = new Map();  // key -> {t, v}: the same channel is never fetched twice in 6 hours (saves API quota)
const hits = new Map();   // ip -> timestamps: 30 lookups per minute per visitor

async function yt(endpoint, params) {
  const u = new URL(API + endpoint);
  Object.entries({ ...params, key: KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  if (!r.ok) throw new Error('YouTube API ' + r.status);
  return r.json();
}

function parse(raw) {
  raw = String(raw || '').trim().slice(0, 200); let m;
  if ((m = raw.match(/^@([\w.\-]{2,})$/))) return { kind: 'handle', value: m[1] };
  let u; try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { return null; }
  if (!/(^|\.)youtube\.com$/i.test(u.hostname)) return null;
  const p = u.pathname;
  if ((m = p.match(/^\/@([\w.\-]+)/))) return { kind: 'handle', value: m[1] };
  if ((m = p.match(/^\/channel\/(UC[\w\-]{22})/))) return { kind: 'id', value: m[1] };
  if ((m = p.match(/^\/user\/([\w.\-]+)/))) return { kind: 'user', value: m[1] };
  if ((m = p.match(/^\/c\/([\w.\-]+)/))) return { kind: 'custom', value: m[1] };
  return null;
}

async function lookup(p) {
  let d;
  if (p.kind === 'handle') d = await yt('channels', { part: 'snippet', forHandle: p.value });
  else if (p.kind === 'id') d = await yt('channels', { part: 'snippet', id: p.value });
  else if (p.kind === 'user') d = await yt('channels', { part: 'snippet', forUsername: p.value });
  else { // /c/name links have no direct lookup, so search (costs 100 quota units, cached afterwards)
    const s = await yt('search', { part: 'snippet', type: 'channel', q: p.value, maxResults: '1' });
    const id = s.items && s.items[0] && s.items[0].snippet.channelId;
    if (id) d = await yt('channels', { part: 'snippet', id });
  }
  const c = d && d.items && d.items[0];
  if (!c) return null;
  const th = c.snippet.thumbnails || {};
  return { id: c.id, name: c.snippet.title, avatar: (th.medium || th.default || {}).url || '' };
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const flat = path.join(__dirname, 'index.html'), nested = path.join(__dirname, 'public', 'index.html');
    return res.end(fs.readFileSync(fs.existsSync(flat) ? flat : nested)); // works with index.html next to server.js, or inside public/
  }
  if (u.pathname !== '/api/channel') return send(res, 404, { error: 'Not found' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress, now = Date.now(); // on a host, use the visitor's real IP
  const h = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (h.length >= 30) return send(res, 429, { error: 'Too many requests. Try again in a minute.' });
  h.push(now); hits.set(ip, h);

  const p = parse(u.searchParams.get('url'));
  if (!p) return send(res, 400, { error: 'Not a YouTube channel link.' });
  const k = p.kind + ':' + p.value.toLowerCase(), hit = cache.get(k);
  if (hit && now - hit.t < 6 * 3600e3) return send(res, 200, hit.v);
  try {
    const v = await lookup(p);
    if (!v) return send(res, 404, { error: 'Channel not found.' });
    cache.set(k, { t: now, v });
    send(res, 200, v);
  } catch (e) { console.error(e.message); send(res, 502, { error: 'YouTube lookup failed.' }); }
}).listen(PORT, () => console.log('Pyro’s Gateway running at http://localhost:' + PORT));
