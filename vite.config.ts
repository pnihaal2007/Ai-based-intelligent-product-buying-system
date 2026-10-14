import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { defineConfig, Plugin } from 'vite';

function flaskProxyPlugin(): Plugin {
  function ensureFlask() {
    const testReq = http.get('http://127.0.0.1:5000/', () => {});
    testReq.on('error', () => {
      try {
        const proc = spawn('python3', ['/app/applet/AI_Intelligent_Product_Buying_System/app.py'], {
          cwd: '/app/applet/AI_Intelligent_Product_Buying_System',
          env: { ...process.env, FLASK_PORT: '5000', FLASK_DEBUG: '0' },
          stdio: 'ignore',
          detached: true
        });
        proc.unref();
      } catch (err) {
        console.error('Flask auto-start error:', err);
      }
    });
  }

  return {
    name: 'flask-proxy-plugin',
    configureServer(server) {
      ensureFlask();
      server.middlewares.use((req, res, next) => {
        if (!req.url || req.url.startsWith('/@') || req.url.startsWith('/src') || req.url.startsWith('/node_modules')) {
          return next();
        }

        const proxyReq = http.request({
          hostname: '127.0.0.1',
          port: 5000,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: '127.0.0.1:5000'
          }
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', () => {
          next();
        });

        req.pipe(proxyReq);
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), flaskProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
