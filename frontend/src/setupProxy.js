const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8001/api',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',  // Strip /api since target already has /api
      },
    })
  );
};
