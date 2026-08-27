#!/usr/bin/env node
// Simple auth proxy — validates API key then forwards to local Ollama
// Only requests with correct X-API-Key header are allowed

const http = require('http');
const { request } = require('https');

const PORT = 11500;
const OLLAMA_URL = 'http://localhost:11434';
const API_KEY = process.env.OLLAMA_PROXY_KEY || '4491b5585943d6f1544d56b13154cb2589d5b321e86f9ae7cf5d737513724b61';

const server = http.createServer((req, res) => {
  // Check API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized — invalid or missing API key' }));
    return;
  }

  // Only allow /api/generate endpoint
  if (!req.url.startsWith('/api/')) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Only /api/* endpoints allowed' }));
    return;
  }

  // Forward to Ollama
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const ollamaReq = http.request(OLLAMA_URL + req.url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    }, (ollamaRes) => {
      res.writeHead(ollamaRes.statusCode || 200, { 'Content-Type': 'application/json' });
      ollamaRes.pipe(res);
    });
    
    ollamaReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Ollama unreachable: ${err.message}` }));
    });
    
    if (body) ollamaReq.write(body);
    ollamaReq.end();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Ollama auth proxy running on 127.0.0.1:${PORT}`);
  console.log(`API key required: X-API-Key header`);
});