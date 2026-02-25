const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      secure: false,
      followRedirects: true,
      onProxyRes: function (proxyRes, req, res) {
        // Rewrite redirect location headers to go through proxy
        if (proxyRes.headers['location']) {
          proxyRes.headers['location'] = proxyRes.headers['location'].replace(
            'http://localhost:8080',
            'http://localhost:3000'
          );
        }
      },
    })
  );
};
