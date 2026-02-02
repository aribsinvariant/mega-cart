const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/auth', createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true }));

app.use('/carts', createProxyMiddleware({ target: 'http://localhost:3007', changeOrigin: true }));

app.listen(8080, () => console.log('Gateway running on 8080'));