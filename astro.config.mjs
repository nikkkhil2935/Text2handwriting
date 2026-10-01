import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

/** Vite plugin to automatically reconcile stale browser cache hashes and prevent 504 Outdated Optimize Dep */
function handleStaleOptimizeDeps() {
  return {
    name: 'handle-stale-optimize-deps',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.includes('/node_modules/.vite/deps/lucide-react.js')) {
          res.writeHead(302, { Location: '/node_modules/lucide-react/dist/esm/lucide-react.mjs' });
          res.end();
          return;
        }
        if (req.url && req.url.includes('/node_modules/.vite/deps/')) {
          const meta = server._optimizeDepsMetadata;
          if (meta && meta.browserHash) {
            try {
              const u = new URL(req.url, 'http://localhost');
              const v = u.searchParams.get('v');
              if (v && v !== meta.browserHash) {
                u.searchParams.set('v', meta.browserHash);
                req.url = u.pathname + u.search;
              }
            } catch {
              // ignore url parse error
            }
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  site: 'https://texttohandwriting.me',
  trailingSlash: 'never',
  output: 'static',
  vite: {
    plugins: [tailwindcss(), handleStaleOptimizeDeps()],
    optimizeDeps: {
      include: [
        'pdf-lib',
        'jszip',
        'katex',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom/client'
      ],
      exclude: ['lucide-react']
    }
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/500'),
      changefreq: 'weekly',
      priority: 0.7,
      serialize(item) {
        // Higher priority for core tool pages
        if (item.url === 'https://texttohandwriting.me/') {
          item.priority = 1.0;
        } else if (
          item.url.includes('/bulk-generator') ||
          item.url.includes('/assignment-formatter') ||
          item.url.includes('/text-to-cursive')
        ) {
          item.priority = 0.9;
        } else if (
          item.url.includes('/signature-generator') ||
          item.url.includes('/notebook-paper-generator')
        ) {
          item.priority = 0.8;
        } else if (
          item.url.includes('/handwriting-font-preview') ||
          item.url.includes('/faq') ||
          item.url.includes('/blog')
        ) {
          item.priority = 0.7;
        } else if (
          item.url.includes('/about-us') ||
          item.url.includes('/contact-us')
        ) {
          item.priority = 0.5;
        } else if (
          item.url.includes('/privacy-policy') ||
          item.url.includes('/terms-and-conditions')
        ) {
          item.priority = 0.4;
        }
        return item;
      }
    })
  ]
});
