const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/auth', createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true }));
// need to add cart/cart-db service

app.listen(8080, () => console.log('Gateway running on 8080'));