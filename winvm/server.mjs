#!/usr/bin/env node
/* Tiny static server for the desktop — no dependencies.
   Usage: node server.mjs [port]   (default 8080)

   Besides the static files it exposes two endpoints that give the
   simulated Internet Explorer a real internet connection:

     GET /api/health          -> { ok, proxy: true }
     GET /api/fetch?url=...   -> { url, status, contentType, html }  (sanitised)
     GET /api/fetch?url=...&raw=1 -> the raw bytes (images, downloads)
*/

import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const MAX_HTML = 4 * 1024 * 1024;
const FETCH_TIMEOUT = 15000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
  '.img': 'application/octet-stream',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

/* ------------------------------------------------------------------ */
/*  the "real internet" proxy                                          */
/* ------------------------------------------------------------------ */

/** Refuse to talk to the machine we are running on, or its neighbours. */
function isBlockedHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === 'metadata.google.internal' || h === 'instance-data') return true;
  if (h.includes(':') && (h === '::1' || h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd'))) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
  }
  return false;
}

function checkUrl(raw) {
  let url;
  try { url = new URL(raw); } catch (e) { return { error: 'That is not a valid address.' }; }
  if (!/^https?:$/.test(url.protocol)) return { error: 'Only http:// and https:// addresses can be opened.' };
  if (isBlockedHost(url.hostname)) return { error: 'Local and private addresses are not reachable from the proxy.' };
  if (url.port && url.port !== '80' && url.port !== '443') return { error: 'Only the standard web ports (80 and 443) are allowed.' };
  return { url };
}

const stripTags = (html) => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script\b[^>]*\/?>/gi, '')
  .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
  .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
  .replace(/<iframe\b[^>]*\/?>/gi, '')
  .replace(/<frameset\b[^>]*>[\s\S]*?<\/frameset>/gi, '')
  .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
  .replace(/<embed\b[^>]*>/gi, '')
  .replace(/<applet\b[^>]*>[\s\S]*?<\/applet>/gi, '')
  .replace(/<link\b[^>]*rel=["']?preload["']?[^>]*>/gi, '')
  .replace(/<meta\b[^>]*http-equiv=["']?refresh["']?[^>]*>/gi, '')
  .replace(/<meta\b[^>]*http-equiv=["']?content-security-policy["']?[^>]*>/gi, '')
  .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
  .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
  .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
  .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');

/** Absolute links so clicks can be routed back through the proxy. */
function rewriteLinks(html, baseUrl) {
  return html.replace(/<a\b([^>]*?)href\s*=\s*(["'])(.*?)\2([^>]*)>/gi, (match, pre, q, href, post) => {
    let abs;
    try { abs = new URL(href.replace(/&amp;/g, '&'), baseUrl).href; } catch (e) { return match; }
    if (!/^https?:/i.test(abs)) return `<a${pre}${post}>`;
    const attrs = `${pre} ${post}`.replace(/data-wxp-href="[^"]*"/gi, '');
    return `<a${attrs} href="#" data-wxp-href="${abs.replace(/"/g, '&quot;')}">`;
  }).replace(/<form\b/gi, '<div data-wxp-form').replace(/<\/form>/gi, '</div>');
}

function sanitize(html, baseUrl) {
  let out = stripTags(html);
  out = rewriteLinks(out, baseUrl);
  // a base tag keeps relative images/stylesheets pointing at the real site
  const inject = `<base href="${baseUrl.replace(/"/g, '&quot;')}">
<style>
  html{-webkit-text-size-adjust:100%}
  body{overflow-x:auto}
  /* sites that assume JavaScript leave empty shells; make that obvious rather than blank */
  #wxp-notice{position:fixed;inset:auto 0 0 0;z-index:2147483647;background:#ffffcc;color:#333;
    font:11px/1.4 Tahoma,sans-serif;padding:3px 8px;border-top:1px solid #ddcc88}
</style>`;
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head([^>]*)>/i, `<head$1>${inject}`);
  else out = inject + out;
  return out;
}

async function proxy(req, res, url) {
  const target = url.searchParams.get('url') || '';
  const raw = url.searchParams.get('raw') === '1';
  const { url: checked, error } = checkUrl(target);
  if (error) {
    res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error }));
    return;
  }

  let upstream;
  try {
    upstream = await fetch(checked.href, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 WindowsXP-Proxy/1.0',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
  } catch (err) {
    res.writeHead(502, { 'content-type': 'application/json' })
      .end(JSON.stringify({ error: `Could not reach ${checked.hostname}: ${err.message}` }));
    return;
  }

  const finalUrl = upstream.url || checked.href;
  const type = upstream.headers.get('content-type') || 'application/octet-stream';

  if (raw) {
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.ok ? 200 : upstream.status, {
      'content-type': type,
      'content-length': buf.length,
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    }).end(buf);
    return;
  }

  if (!/text\/html|application\/xhtml/i.test(type)) {
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
      url: finalUrl,
      status: upstream.status,
      contentType: type,
      size: Number(upstream.headers.get('content-length') || 0),
      html: null,
    }));
    return;
  }

  let text = await upstream.text();
  if (text.length > MAX_HTML) text = text.slice(0, MAX_HTML);
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({
    url: finalUrl,
    status: upstream.status,
    contentType: type,
    size: text.length,
    html: sanitize(text, finalUrl),
  }));
}

/* ------------------------------------------------------------------ */
/*  static files                                                       */
/* ------------------------------------------------------------------ */

function serveStatic(req, res, pathname) {
  let file = join(ROOT, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found: ' + pathname);
    return;
  }
  try {
    const stat = statSync(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    });
    createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found: ' + pathname);
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      .end(JSON.stringify({ ok: true, proxy: true, server: 'winvm' }));
    return;
  }
  if (url.pathname === '/api/fetch') {
    try {
      await proxy(req, res, url);
    } catch (err) {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end('Method not allowed');
    return;
  }
  serveStatic(req, res, decodeURIComponent(url.pathname));
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Windows XP in the browser → http://0.0.0.0:${PORT}/`);
  console.log('Real internet proxy enabled at /api/fetch');
});
