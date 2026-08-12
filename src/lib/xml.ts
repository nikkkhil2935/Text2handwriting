/**
 * Escape a string for safe inclusion in XML/SVG markup. Escapes the five XML
 * special characters: & < > " '. Used e.g. when interpolating user-typed names
 * into exported SVG documents so the file stays well-formed and cannot be used
 * to inject markup.
 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
