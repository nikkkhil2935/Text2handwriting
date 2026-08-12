import { describe, it, expect } from 'vitest';
import { FONTS, resolveFontFamily, getFontsByCategory, getDefaultBaselineOffset } from './fonts';

describe('resolveFontFamily', () => {
  it('resolves exact family names to themselves', () => {
    expect(resolveFontFamily('Dancing Script')).toBe('Dancing Script');
    expect(resolveFontFamily('Architects Daughter')).toBe('Architects Daughter');
  });

  it('is case-insensitive and tolerant of surrounding whitespace', () => {
    expect(resolveFontFamily('dancing script')).toBe('Dancing Script');
    expect(resolveFontFamily('  DANCING SCRIPT  ')).toBe('Dancing Script');
  });

  it('returns undefined for unknown or empty names', () => {
    expect(resolveFontFamily('NotARealFont')).toBeUndefined();
    expect(resolveFontFamily('')).toBeUndefined();
    expect(resolveFontFamily('   ')).toBeUndefined();
  });

  it('resolves every registered font against itself', () => {
    for (const font of FONTS) {
      expect(resolveFontFamily(font.family)).toBe(font.family);
      expect(resolveFontFamily(font.family.toUpperCase())).toBe(font.family);
    }
  });

  it('does not match partial or substring names', () => {
    expect(resolveFontFamily('Dancing')).toBeUndefined();
    expect(resolveFontFamily('Script')).toBeUndefined();
  });
});

describe('font registry invariants', () => {
  it('has unique family names', () => {
    const families = FONTS.map(f => f.family.toLowerCase());
    expect(new Set(families).size).toBe(families.length);
  });

  it('has unique file names', () => {
    const names = FONTS.map(f => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('only uses known categories', () => {
    const known = new Set(['neat', 'cursive', 'messy', 'kids', 'signature', 'calligraphy']);
    for (const font of FONTS) {
      expect(known.has(font.category)).toBe(true);
    }
  });

  it('has a default baseline offset for every family', () => {
    for (const font of FONTS) {
      expect(getDefaultBaselineOffset(font.family)).toBeTypeOf('number');
    }
  });

  it('getFontsByCategory returns only matching fonts', () => {
    const cursive = getFontsByCategory('cursive');
    expect(cursive.length).toBeGreaterThan(0);
    expect(cursive.every(f => f.category === 'cursive')).toBe(true);
  });
});
