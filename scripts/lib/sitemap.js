const DEFAULT_SITE_BASE = 'https://texttohandwriting.me';

/**
 * Extract the origin (scheme + host) of the first <loc> in a sitemap, so the
 * unified sitemap index points at the correct deployment domain. Falls back to
 * `fallback` when no <loc> can be parsed.
 */
export function getSiteBaseFromSitemap(sitemapContent, fallback = DEFAULT_SITE_BASE) {
  if (!sitemapContent) return fallback;
  const locMatch = sitemapContent.match(/<loc>(https?:\/\/[^<]+)<\/loc>/);
  if (!locMatch) return fallback;
  try {
    return new URL(locMatch[1]).origin;
  } catch {
    return fallback;
  }
}

/** Build a minimal sitemap index pointing at the unified /sitemap.xml. */
export function buildSitemapIndexXml(siteBase) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <sitemap>\n` +
    `    <loc>${siteBase}/sitemap.xml</loc>\n` +
    `  </sitemap>\n` +
    `</sitemapindex>\n`;
}
