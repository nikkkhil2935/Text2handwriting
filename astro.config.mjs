import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://texttohandwriting.me',
  trailingSlash: 'never',
  output: 'static',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/500'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
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
