// Optional local preview helper. The published static app does not run this file.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const publicEntries = new Set(['index.html', 'README.md', '.nojekyll', 'version.js', 'preview.mjs', 'release-manifest.json', 'finishedmockups', 'sharedrefs']);
const port = Number(process.argv[2] || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a port from 1024 to 65535.');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf' };
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let path = resolve(root, '.' + pathname);
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) { response.writeHead(403); response.end(); return; }
    const firstEntry = path.slice(resolve(root).length).split(sep).filter(Boolean)[0];
    if (firstEntry && !publicEntries.has(firstEntry)) { response.writeHead(404); response.end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('File not found'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try: node preview.mjs ${port + 1}` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Open http://127.0.0.1:${port}/ — press Ctrl+C to stop.`));
