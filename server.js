// Tiny static server + screenshot sink (POST /shot?name=foo with a PNG dataURL body).
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT) || 5173;
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (req.method === 'POST' && url.pathname === '/shot') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const name = (url.searchParams.get('name') || 'shot').replace(/[^\w-]/g, '');
      const b64 = body.replace(/^data:image\/png;base64,/, '');
      const file = path.join(root, 'shots', `${name}.png`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
      res.end(file);
    });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  // empty music slots are normal: answer quietly instead of a console-noisy 404
  if (p.startsWith('/music/') && !fs.existsSync(file)) { res.statusCode = 204; return res.end(); }
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    return res.end('not found');
  }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`digiplanes on http://localhost:${port}`));
