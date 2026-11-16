// Static server for game/ directory (Node 22 standard library only)
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Method Not Allowed\n');
    return;
  }
  let pathname = '/';
  try {
    pathname = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname;
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Bad Request\n');
    return;
  }
  let clean = normalize(decodeURIComponent(pathname));
  if (clean === '/' || clean === '\\' || clean.endsWith('/') || clean.endsWith('\\')) {
    clean = join(clean, 'index.html');
  }
  const target = join(root, clean);
  if (!target.startsWith(root)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden\n');
    return;
  }
  try {
    const stats = statSync(target);
    if (!stats.isFile()) throw new Error('Not a file');
    const ext = extname(target).toLowerCase();
    const type = MIME[ext] ?? 'application/octet-stream';
    response.writeHead(200, {
      'content-type': type,
      'content-length': stats.size,
      'cache-control': 'no-cache',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not Found\n');
  }
});

server.listen(port, () => {
  console.log(`Serving game on http://localhost:${port}`);
});
