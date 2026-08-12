import { describe, it, expect } from 'vitest';
import { getSiteBaseFromSitemap, buildSitemapIndexXml } from './sitemap.js';

const SAMPLE_URLSET = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://texttohandwriting.me/blog/some-post</loc></url>
  <url><loc>https://texttohandwriting.me/about-us</loc></url>
</urlset>`;

describe('getSiteBaseFromSitemap', () => {
  it('extracts the origin of the first <loc>', () => {
    expect(getSiteBaseFromSitemap(SAMPLE_URLSET)).toBe('https://texttohandwriting.me');
  });

  it('handles http and https schemes', () => {
    expect(getSiteBaseFromSitemap('<url><loc>http://example.com/page</loc></url>')).toBe('http://example.com');
    expect(getSiteBaseFromSitemap('<url><loc>https://example.com/page</loc></url>')).toBe('https://example.com');
  });

  it('falls back when there is no <loc>', () => {
    expect(getSiteBaseFromSitemap('<urlset></urlset>')).toBe('https://texttohandwriting.me');
    expect(getSiteBaseFromSitemap('')).toBe('https://texttohandwriting.me');
    expect(getSiteBaseFromSitemap(null)).toBe('https://texttohandwriting.me');
  });

  it('uses a custom fallback', () => {
    expect(getSiteBaseFromSitemap('<urlset></urlset>', 'https://example.com')).toBe('https://example.com');
  });

  it('ignores the XML namespace declaration in <loc> matching', () => {
    // The namespace URL lives in an attribute, not a <loc> element
    const xml = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
    expect(getSiteBaseFromSitemap(xml)).toBe('https://texttohandwriting.me');
  });
});

describe('buildSitemapIndexXml', () => {
  it('builds a sitemap index pointing at /sitemap.xml', () => {
    const xml = buildSitemapIndexXml('https://texttohandwriting.me');
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('<loc>https://texttohandwriting.me/sitemap.xml</loc>');
  });
});
