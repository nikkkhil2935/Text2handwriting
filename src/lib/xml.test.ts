import { describe, it, expect } from 'vitest';
import { escapeXml } from './xml';

describe('escapeXml', () => {
  it('escapes each of the five XML special characters', () => {
    expect(escapeXml('&')).toBe('&amp;');
    expect(escapeXml('<')).toBe('&lt;');
    expect(escapeXml('>')).toBe('&gt;');
    expect(escapeXml('"')).toBe('&quot;');
    expect(escapeXml("'")).toBe('&apos;');
  });

  it('escapes realistic names containing special characters', () => {
    expect(escapeXml('John & Jane')).toBe('John &amp; Jane');
    expect(escapeXml('A < B > C')).toBe('A &lt; B &gt; C');
    expect(escapeXml("O'Brien \"The Boss\"")).toBe('O&apos;Brien &quot;The Boss&quot;');
  });

  it('leaves plain names and empty strings untouched', () => {
    expect(escapeXml('John Doe')).toBe('John Doe');
    expect(escapeXml('')).toBe('');
    expect(escapeXml('José García 2024')).toBe('José García 2024');
  });

  it('produces a well-formed SVG <text> element for hostile input', () => {
    // The escaped output must never be able to close the <text> tag or inject attributes
    const escaped = escapeXml('</text><script>alert(1)</script>');
    expect(escaped).not.toContain('</text>');
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;/text&gt;');
  });
});
