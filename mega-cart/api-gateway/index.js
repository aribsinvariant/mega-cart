const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

app.use(cors());

app.use('/auth', createProxyMiddleware({ target: 'http://auth-service:3001', changeOrigin: true }));

app.use('/carts', createProxyMiddleware({ target: 'http://cart-service:3007', changeOrigin: true }));

app.listen(8080, () => console.log('Gateway running on 8080'));