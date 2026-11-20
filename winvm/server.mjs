#!/usr/bin/env node
/* Tiny static server for the desktop — no dependencies.
   Usage: node server.mjs [port]   (default 8080) */

import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

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
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = join(ROOT, normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found: ' + url);
    return;
  }
  try {
    const stat = statSync(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store',
      // allow embedding in the preview iframe
      'access-control-allow-origin': '*',
    });
    createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found: ' + url);
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Windows XP in the browser → http://0.0.0.0:${PORT}/`);
});
