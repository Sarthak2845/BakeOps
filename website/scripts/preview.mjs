// Serves the built site (out/) like the real host does, including the
// /track/* rewrite that `next dev` can't do. Usage: npm run build && npm run preview
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'out');
const PORT = Number(process.env.PORT ?? 3000);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(ROOT)) {
  console.error('No build found. Run `npm run build` first.');
  process.exit(1);
}

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (/^\/track\/[^/]+\/[^/]+\/?$/.test(p)) p = '/track/index.html'; // same rewrite as render.yaml
    let file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) file = path.join(ROOT, '404.html');
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    const found = fs.existsSync(file);
    if (!found) file = path.join(ROOT, '404.html');
    res.writeHead(found ? 200 : 404, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`BakeOps site: http://localhost:${PORT}`));
