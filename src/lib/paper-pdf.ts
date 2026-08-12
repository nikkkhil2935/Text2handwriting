import { PAPER_SIZES } from './exporter';

export type PaperSizeKey = keyof typeof PAPER_SIZES;

export interface PaperMargins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PdfLayout {
  /** Physical page width in PDF points */
  width: number;
  /** Physical page height in PDF points */
  height: number;
  /** Scale factor mapping the 800px-wide canvas design space onto the page width */
  scale: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  /** Grid spacing in PDF points */
  gridSize: number;
}

/**
 * Map the 800px-wide canvas coordinate space onto the chosen physical page,
 * scaling margins and grid spacing proportionally.
 */
export function computePdfLayout(
  paperSize: PaperSizeKey,
  margins: PaperMargins,
  gridSize: number
): PdfLayout {
  const { width, height } = PAPER_SIZES[paperSize] || PAPER_SIZES.a4;
  const scale = width / 800;
  return {
    width,
    height,
    scale,
    marginLeft: margins.left * scale,
    marginRight: margins.right * scale,
    marginTop: margins.top * scale,
    marginBottom: margins.bottom * scale,
    gridSize: gridSize * scale
  };
}

/** Canvas y grows downward; PDF y grows upward — mirror across the page height. */
export function flipY(y: number, pageHeight: number): number {
  return pageHeight - y;
}

/** Canvas-space x positions for vertical grid lines (graph paper). */
export function verticalRuleXs(layout: PdfLayout): number[] {
  const xs: number[] = [];
  for (let x = layout.marginLeft; x <= layout.width - layout.marginRight; x += layout.gridSize) {
    xs.push(x);
  }
  return xs;
}

/** Canvas-space y positions for horizontal rules inside the printable area. */
export function horizontalRuleYs(layout: PdfLayout): number[] {
  const ys: number[] = [];
  for (let y = layout.marginTop; y <= layout.height - layout.marginBottom; y += layout.gridSize) {
    ys.push(y);
  }
  return ys;
}

/** PDF-space y positions for horizontal rules (canvas positions flipped). */
export function horizontalRulePdfYs(layout: PdfLayout): number[] {
  return horizontalRuleYs(layout).map(y => flipY(y, layout.height));
}

export interface DotPosition {
  x: number;
  y: number;
}

/** Dot-grid positions in PDF space (one dot per grid intersection). */
export function dotPdfPositions(layout: PdfLayout): DotPosition[] {
  const dots: DotPosition[] = [];
  for (const x of verticalRuleXs(layout)) {
    for (const y of horizontalRuleYs(layout)) {
      dots.push({ x, y: flipY(y, layout.height) });
    }
  }
  return dots;
}

/** Convert a #rgb / #rrggbb hex color to a 0-1 rgb tuple (pdf-lib format). */
export function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
