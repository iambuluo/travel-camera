// 零依赖静态服务器（仅在国内主机想用 Node 托管时启用；当前免费版其实只要一个 index.html 即可）
// 用法：node server.js   （可选环境变量 PORT，默认 3000）
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // 预留：后端支付/授权路由（当前免费版未启用，接入商户号时在此转发到 api/ 逻辑）
  if (url.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, note: 'api stub — 当前为免费版，未启用后端', path: url }));
    return;
  }

  // 静态文件
  let filePath = path.join(ROOT, url === '/' ? 'index.html' : url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA 兜底：未知路径回 index.html
      fs.readFile(path.join(ROOT, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(html);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`旅游相机(国内部署) 已启动: http://localhost:${PORT}`);
});
