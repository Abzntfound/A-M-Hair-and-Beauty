const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    ok: true,
    service: 'A&M Hair & Beauty',
    message: 'Render service is running'
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`A&M Render service listening on port ${PORT}`);
});
