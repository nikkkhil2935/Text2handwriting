import { describe, it, expect } from 'vitest';
import { PAPER_SIZES } from './exporter';
import {
  computePdfLayout,
  flipY,
  hexToRgb,
  horizontalRuleYs,
  horizontalRulePdfYs,
  verticalRuleXs,
  dotPdfPositions
} from './paper-pdf';

describe('PAPER_SIZES', () => {
  it('defines standard physical dimensions in PDF points', () => {
    expect(PAPER_SIZES.a4.width).toBeCloseTo(595.27, 1);
    expect(PAPER_SIZES.a4.height).toBeCloseTo(841.89, 1);
    expect(PAPER_SIZES.letter).toEqual({ width: 612, height: 792, label: 'Letter (8.5 x 11 in)' });
    expect(PAPER_SIZES.legal).toEqual({ width: 612, height: 1008, label: 'Legal (8.5 x 14 in)' });
  });
});

describe('hexToRgb', () => {
  it('converts 6-digit hex colors to 0-1 tuples', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#ffffff')).toEqual([1, 1, 1]);
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 1]);
  });

  it('converts 3-digit shorthand hex colors', () => {
    expect(hexToRgb('#fff')).toEqual([1, 1, 1]);
    expect(hexToRgb('#f00')).toEqual([1, 0, 0]);
    expect(hexToRgb('#0f0')).toEqual([0, 1, 0]);
  });

  it('tolerates a missing # prefix', () => {
    expect(hexToRgb('00ff00')).toEqual([0, 1, 0]);
  });

  it('produces correct fractional values', () => {
    const [r, g, b] = hexToRgb('#808080');
    expect(r).toBeCloseTo(128 / 255, 5);
    expect(g).toBeCloseTo(128 / 255, 5);
    expect(b).toBeCloseTo(128 / 255, 5);
  });
});

describe('computePdfLayout', () => {
  const margins = { left: 60, right: 60, top: 60, bottom: 60 };

  it('scales the 800px design space onto the physical page width', () => {
    const layout = computePdfLayout('a4', margins, 30);
    expect(layout.width).toBeCloseTo(PAPER_SIZES.a4.width, 2);
    expect(layout.height).toBeCloseTo(PAPER_SIZES.a4.height, 2);
    expect(layout.scale).toBeCloseTo(layout.width / 800, 5);
    expect(layout.marginLeft).toBeCloseTo(60 * layout.scale, 5);
    expect(layout.gridSize).toBeCloseTo(30 * layout.scale, 5);
  });

  it('handles letter and legal sizes', () => {
    const letter = computePdfLayout('letter', { left: 0, right: 0, top: 0, bottom: 0 }, 30);
    expect(letter.width).toBe(612);
    expect(letter.height).toBe(792);
    expect(letter.scale).toBeCloseTo(612 / 800, 5);

    const legal = computePdfLayout('legal', { left: 0, right: 0, top: 0, bottom: 0 }, 30);
    expect(legal.width).toBe(612);
    expect(legal.height).toBe(1008);
  });
});

describe('flipY', () => {
  it('mirrors canvas y-down coordinates into pdf y-up space', () => {
    expect(flipY(0, 841.89)).toBeCloseTo(841.89, 5);
    expect(flipY(841.89, 841.89)).toBeCloseTo(0, 5);
    expect(flipY(100, 200)).toBe(100);
  });
});

describe('rule geometry', () => {
  const layout = computePdfLayout('a4', { left: 60, right: 60, top: 60, bottom: 60 }, 30);

  it('keeps horizontal rules inside the printable area', () => {
    const ys = horizontalRuleYs(layout);
    expect(ys.length).toBeGreaterThan(0);
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(layout.marginTop);
      expect(y).toBeLessThanOrEqual(layout.height - layout.marginBottom);
    }
  });

  it('spaces horizontal rules exactly one grid step apart', () => {
    const ys = horizontalRuleYs(layout);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBeCloseTo(layout.gridSize, 5);
    }
  });

  it('flips canvas rule positions into pdf space', () => {
    const canvas = horizontalRuleYs(layout);
    const pdf = horizontalRulePdfYs(layout);
    expect(pdf.length).toBe(canvas.length);
    canvas.forEach((y, i) => {
      expect(pdf[i]).toBeCloseTo(layout.height - y, 5);
    });
  });

  it('keeps vertical grid lines inside the margins for graph paper', () => {
    const xs = verticalRuleXs(layout);
    expect(xs.length).toBeGreaterThan(0);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(layout.marginLeft);
      expect(x).toBeLessThanOrEqual(layout.width - layout.marginRight);
    }
  });

  it('produces one dot per grid intersection for dot-grid', () => {
    const dots = dotPdfPositions(layout);
    expect(dots.length).toBe(verticalRuleXs(layout).length * horizontalRuleYs(layout).length);
    for (const dot of dots) {
      expect(dot.y).toBeGreaterThanOrEqual(0);
      expect(dot.y).toBeLessThanOrEqual(layout.height);
    }
  });
});

describe('PDF round-trip (integration)', () => {
  it('builds a parseable multi-page PDF with correct geometry via pdf-lib', async () => {
    const { PDFDocument, rgb } = await import('pdf-lib');
    const layout = computePdfLayout('a4', { left: 60, right: 60, top: 60, bottom: 60 }, 30);
    const { width: w, height: h, scale: s, marginLeft: mLeft, marginRight: mRight } = layout;
    const rules = horizontalRulePdfYs(layout);

    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < 5; i++) {
      const page = pdfDoc.addPage([w, h]);
      const lineColor = rgb(...hexToRgb('#ebebeb'));
      page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: rgb(...hexToRgb('#ffffff')) });
      for (const y of rules) {
        page.drawLine({ start: { x: mLeft, y }, end: { x: w - mRight, y }, thickness: 1 * s, color: lineColor });
      }
    }

    const bytes = await pdfDoc.save();
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toBe('%PDF-1.7');

    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(5);
    const { width, height } = loaded.getPage(0).getSize();
    expect(width).toBeCloseTo(PAPER_SIZES.a4.width, 1);
    expect(height).toBeCloseTo(PAPER_SIZES.a4.height, 1);
    expect(rules.length).toBeGreaterThan(0);
  });
});
