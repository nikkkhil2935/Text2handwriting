import React, { useState, useEffect, useRef } from 'react';
import { Download, Settings, Layers, RefreshCw, FileText, Sparkles } from 'lucide-react';
import { downloadBlob } from '../../lib/exporter';
import { computePdfLayout, dotPdfPositions, hexToRgb, horizontalRulePdfYs, verticalRuleXs } from '../../lib/paper-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';

interface PaperPreset {
  id: string;
  name: string;
  badge: string;
  paperStyle: string;
  gridSize: number;
  lineColor: string;
  paperColor: string;
  marginColor: string;
  hasVerticalMargin: boolean;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
}

const PAPER_PRESETS: PaperPreset[] = [
  {
    id: 'college-ruled',
    name: 'College Ruled',
    badge: '7.1mm',
    paperStyle: 'single-ruled',
    gridSize: 28,
    lineColor: '#b0c4de',
    paperColor: '#ffffff',
    marginColor: '#f87171',
    hasVerticalMargin: true,
    marginLeft: 75,
    marginRight: 40,
    marginTop: 65,
    marginBottom: 50
  },
  {
    id: 'wide-ruled',
    name: 'Wide Ruled',
    badge: '8.7mm',
    paperStyle: 'single-ruled',
    gridSize: 34,
    lineColor: '#b0c4de',
    paperColor: '#ffffff',
    marginColor: '#f87171',
    hasVerticalMargin: true,
    marginLeft: 80,
    marginRight: 40,
    marginTop: 70,
    marginBottom: 50
  },
  {
    id: 'engineering-grid',
    name: 'Engineering Grid',
    badge: '5mm',
    paperStyle: 'graph',
    gridSize: 20,
    lineColor: '#c2ded1',
    paperColor: '#fafdfb',
    marginColor: '#10b981',
    hasVerticalMargin: false,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 40,
    marginBottom: 40
  },
  {
    id: 'dot-journal',
    name: 'Dot Grid Journal',
    badge: 'Bullet',
    paperStyle: 'dot-grid',
    gridSize: 22,
    lineColor: '#9ca3af',
    paperColor: '#ffffff',
    marginColor: '#ffadad',
    hasVerticalMargin: false,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 40,
    marginBottom: 40
  },
  {
    id: 'legal-pad',
    name: 'Yellow Legal Pad',
    badge: 'Classic',
    paperStyle: 'legal',
    gridSize: 30,
    lineColor: '#b8b29f',
    paperColor: '#fff8dc',
    marginColor: '#ef4444',
    hasVerticalMargin: true,
    marginLeft: 80,
    marginRight: 40,
    marginTop: 70,
    marginBottom: 50
  }
];

export default function PaperApp() {
  const [paperStyle, setPaperStyle] = useState('single-ruled');
  const [gridSize, setGridSize] = useState(30);
  const [lineColor, setLineColor] = useState('#b0c4de');
  const [marginColor, setMarginColor] = useState('#f87171');
  const [paperColor, setPaperColor] = useState('#ffffff');
  const [hasVerticalMargin, setHasVerticalMargin] = useState(true);
  const [marginLeft, setMarginLeft] = useState(75);
  const [marginTop, setMarginTop] = useState(65);
  const [marginRight, setMarginRight] = useState(40);
  const [marginBottom, setMarginBottom] = useState(50);
  const [pageCount, setPageCount] = useState(5);
  const [exportPaperSize, setExportPaperSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [activePresetId, setActivePresetId] = useState<string>('college-ruled');

  const [previewUrl, setPreviewUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const lastPreviewUrlRef = useRef('');

  useEffect(() => {
    drawPaperPreview();
  }, [paperStyle, gridSize, lineColor, marginColor, paperColor, hasVerticalMargin, marginLeft, marginTop, marginRight, marginBottom]);

  useEffect(() => {
    return () => {
      if (lastPreviewUrlRef.current) {
        URL.revokeObjectURL(lastPreviewUrlRef.current);
      }
    };
  }, []);

  const applyPreset = (preset: PaperPreset) => {
    setActivePresetId(preset.id);
    setPaperStyle(preset.paperStyle);
    setGridSize(preset.gridSize);
    setLineColor(preset.lineColor);
    setPaperColor(preset.paperColor);
    setMarginColor(preset.marginColor);
    setHasVerticalMargin(preset.hasVerticalMargin);
    setMarginLeft(preset.marginLeft);
    setMarginRight(preset.marginRight);
    setMarginTop(preset.marginTop);
    setMarginBottom(preset.marginBottom);
  };

  const drawPaperToCanvas = (canvas: OffscreenCanvas, scale: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, w, h);

    const mLeft = marginLeft * scale;
    const mTop = marginTop * scale;
    const mRight = marginRight * scale;
    const mBottom = marginBottom * scale;
    const gSize = gridSize * scale;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1 * scale;

    if (paperStyle === 'single-ruled') {
      const startY = mTop;
      const endY = h - mBottom;
      for (let y = startY; y <= endY; y += gSize) {
        ctx.beginPath();
        ctx.moveTo(mLeft, y);
        ctx.lineTo(w - mRight, y);
        ctx.stroke();
      }
    }

    if (paperStyle === 'double-ruled') {
      const startY = mTop;
      const endY = h - mBottom;
      for (let y = startY; y <= endY; y += gSize) {
        ctx.beginPath();
        ctx.moveTo(mLeft, y);
        ctx.lineTo(w - mRight, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mLeft, y + 3 * scale);
        ctx.lineTo(w - mRight, y + 3 * scale);
        ctx.stroke();
      }
    }

    if (paperStyle === 'a4-notebook') {
      ctx.strokeStyle = marginColor;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(mLeft, 0);
      ctx.lineTo(mLeft, h);
      ctx.stroke();
    }

    if (paperStyle === 'graph') {
      const endX = w - mRight;
      const endY = h - mBottom;
      for (let x = mLeft; x <= endX; x += gSize) {
        ctx.beginPath();
        ctx.moveTo(x, mTop);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = mTop; y <= endY; y += gSize) {
        ctx.beginPath();
        ctx.moveTo(mLeft, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }

    if (paperStyle === 'dot-grid') {
      const endX = w - mRight;
      const endY = h - mBottom;
      ctx.fillStyle = lineColor;
      for (let x = mLeft; x <= endX; x += gSize) {
        for (let y = mTop; y <= endY; y += gSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (paperStyle === 'legal') {
      ctx.fillStyle = '#fff8dc';
      ctx.fillRect(0, 0, w, h);
      const startY = mTop;
      const endY = h - mBottom;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1 * scale;
      for (let y = startY; y <= endY; y += gSize) {
        ctx.beginPath();
        ctx.moveTo(mLeft, y);
        ctx.lineTo(w - mRight, y);
        ctx.stroke();
      }
      ctx.strokeStyle = marginColor;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(mLeft, 0);
      ctx.lineTo(mLeft, h);
      ctx.stroke();
    }

    if (hasVerticalMargin && paperStyle !== 'a4-notebook' && paperStyle !== 'legal') {
      ctx.strokeStyle = marginColor;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(mLeft, 0);
      ctx.lineTo(mLeft, h);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawPaperPreview = () => {
    const scale = 2;
    const width = 800;
    const height = 1130;
    const offscreen = new OffscreenCanvas(width * scale, height * scale);
    drawPaperToCanvas(offscreen, scale);
    offscreen.convertToBlob({ type: 'image/png' }).then((blob) => {
      const newUrl = URL.createObjectURL(blob);
      if (lastPreviewUrlRef.current) {
        URL.revokeObjectURL(lastPreviewUrlRef.current);
      }
      lastPreviewUrlRef.current = newUrl;
      setPreviewUrl(newUrl);
    });
  };

  const generateMultiPage = async () => {
    setGenerating(true);
    try {
      const scale = 2;
      const width = 800;
      const height = 1130;
      const zip = new JSZip();

      for (let i = 0; i < pageCount; i++) {
        const offscreen = new OffscreenCanvas(width * scale, height * scale);
        drawPaperToCanvas(offscreen, scale);
        const blob = await offscreen.convertToBlob({ type: 'image/png' });
        const buffer = await blob.arrayBuffer();
        const pageNum = String(i + 1).padStart(2, '0');
        zip.file(`paper-page-${pageNum}.png`, buffer);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'notebook-paper-pages.zip');
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setGenerating(false);
    }
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const layout = computePdfLayout(
        exportPaperSize,
        { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom },
        gridSize
      );
      const { width: w, height: h, scale: s } = layout;
      const { marginLeft: mLeft, marginRight: mRight, marginTop: mTop, marginBottom: mBottom } = layout;

      const lineColorRgb = rgb(...hexToRgb(lineColor));
      const marginColorRgb = rgb(...hexToRgb(marginColor));
      const baseColorRgb = paperStyle === 'legal' ? rgb(...hexToRgb('#fff8dc')) : rgb(...hexToRgb(paperColor));

      const horizontalRules = horizontalRulePdfYs(layout);
      const verticalRules = verticalRuleXs(layout);

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.addPage([w, h]);

        page.drawRectangle({
          x: 0,
          y: 0,
          width: w,
          height: h,
          color: baseColorRgb
        });

        const drawLine = (x1: number, y1: number, x2: number, y2: number, color: any, thickness: number) => {
          page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness,
            color
          });
        };

        if (paperStyle === 'single-ruled') {
          for (const y of horizontalRules) {
            drawLine(mLeft, y, w - mRight, y, lineColorRgb, 1 * s);
          }
        }

        if (paperStyle === 'double-ruled') {
          for (const y of horizontalRules) {
            drawLine(mLeft, y, w - mRight, y, lineColorRgb, 1 * s);
            drawLine(mLeft, y - 3 * s, w - mRight, y - 3 * s, lineColorRgb, 1 * s);
          }
        }

        if (paperStyle === 'a4-notebook') {
          drawLine(mLeft, 0, mLeft, h, marginColorRgb, 2 * s);
        }

        if (paperStyle === 'graph') {
          for (const x of verticalRules) {
            drawLine(x, mBottom, x, h - mTop, lineColorRgb, 1 * s);
          }
          for (const y of horizontalRules) {
            drawLine(mLeft, y, w - mRight, y, lineColorRgb, 1 * s);
          }
        }

        if (paperStyle === 'dot-grid') {
          for (const dot of dotPdfPositions(layout)) {
            page.drawCircle({ x: dot.x, y: dot.y, size: 1.5 * s, color: lineColorRgb });
          }
        }

        if (paperStyle === 'legal') {
          for (const y of horizontalRules) {
            drawLine(mLeft, y, w - mRight, y, lineColorRgb, 1 * s);
          }
          drawLine(mLeft, 0, mLeft, h, marginColorRgb, 2 * s);
        }

        if (hasVerticalMargin && paperStyle !== 'a4-notebook' && paperStyle !== 'legal') {
          drawLine(mLeft, 0, mLeft, h, marginColorRgb, 2 * s);
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, 'notebook-paper.pdf');
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setGenerating(false);
    }
  };

  const getDimensionLabel = () => {
    if (exportPaperSize === 'letter') return '8.5 × 11 in (216 × 279 mm) • US Letter';
    if (exportPaperSize === 'legal') return '8.5 × 14 in (216 × 356 mm) • US Legal';
    return '210 × 297 mm • Standard ISO A4';
  };

  return (
    <div className="w-full flex flex-col gap-6">

      {/* Preset Quick Chips Bar */}
      <div className="bg-canvas border border-hairline rounded-lg p-3.5 shadow-xs font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <span className="font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 shrink-0">
          <Sparkles size={14} className="text-amber-500" />
          <span>Paper Presets:</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {PAPER_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                activePresetId === preset.id
                  ? 'bg-primary text-on-primary border-primary font-bold shadow-xs'
                  : 'bg-canvas-soft border-hairline text-body hover:text-primary hover:border-hairline-strong'
              }`}
            >
              <span>{preset.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activePresetId === preset.id ? 'bg-white/20 text-white' : 'bg-canvas-soft-2 text-mute'
              }`}>
                {preset.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full items-start">
        
        {/* Left Column: Canvas Preview */}
        <div className="w-full md:w-1/2 flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-hairline pb-2.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-body flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live Sheet Preview
            </span>
            <span className="text-[10px] font-mono text-mute bg-canvas-soft px-2 py-0.5 rounded border border-hairline">
              Vector PDF Ready
            </span>
          </div>

          <div className="flex-grow bg-canvas-soft p-4 rounded-lg border border-hairline flex flex-col items-center justify-center overflow-auto min-h-[440px]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Paper preview"
                className="w-full max-w-[400px] shadow-lg rounded-sm border border-hairline object-contain bg-white transition-all hover:scale-[1.01]"
              />
            ) : (
              <div className="w-full aspect-[1/1.41] max-w-[400px] bg-white flex items-center justify-center rounded shadow">
                <RefreshCw size={24} className="animate-spin text-mute" />
              </div>
            )}

            <div className="mt-4 text-[11px] font-mono text-mute flex items-center gap-2">
              <span>{getDimensionLabel()}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="w-full md:w-1/2 flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-hairline pb-2.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-body">Paper Geometry & Colors</span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block font-semibold uppercase text-body mb-1">Paper Layout Style</label>
              <select
                value={paperStyle}
                onChange={(e) => {
                  setPaperStyle(e.target.value);
                  setActivePresetId('');
                }}
                className="input-field w-full bg-canvas cursor-pointer"
              >
                <option value="plain">Plain White Paper</option>
                <option value="single-ruled">Single Ruled (Notebook)</option>
                <option value="double-ruled">Double Ruled (Calligraphy / Handwriting)</option>
                <option value="a4-notebook">A4 School Notebook</option>
                <option value="legal">Yellow Legal Pad</option>
                <option value="graph">Engineering Graph Grid</option>
                <option value="dot-grid">Dot Grid Journal (Bullet)</option>
              </select>
            </div>

            {paperStyle !== 'plain' && (
              <div>
                <div className="flex justify-between text-body mb-1">
                  <span>Line Spacing / Grid Size</span>
                  <span className="text-primary font-bold">{gridSize}px</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  value={gridSize}
                  onChange={(e) => {
                    setGridSize(parseInt(e.target.value));
                    setActivePresetId('');
                  }}
                  className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Rule Line Color</label>
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => {
                    setLineColor(e.target.value);
                    setActivePresetId('');
                  }}
                  className="w-full h-8 border border-hairline rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Background Paper Color</label>
                <input
                  type="color"
                  value={paperColor}
                  onChange={(e) => {
                    setPaperColor(e.target.value);
                    setActivePresetId('');
                  }}
                  className="w-full h-8 border border-hairline rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 bg-canvas-soft-2 px-2.5 rounded border border-hairline">
              <label className="cursor-pointer select-none">Show Vertical Margin Line</label>
              <input
                type="checkbox"
                checked={hasVerticalMargin}
                onChange={(e) => {
                  setHasVerticalMargin(e.target.checked);
                  setActivePresetId('');
                }}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>

            {hasVerticalMargin && (
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Margin Line Color</label>
                <input
                  type="color"
                  value={marginColor}
                  onChange={(e) => {
                    setMarginColor(e.target.value);
                    setActivePresetId('');
                  }}
                  className="w-full h-8 border border-hairline rounded cursor-pointer"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Left Margin (px)</label>
                <input
                  type="number"
                  value={marginLeft}
                  onChange={(e) => {
                    setMarginLeft(parseInt(e.target.value) || 0);
                    setActivePresetId('');
                  }}
                  className="input-field w-full h-8 bg-canvas"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Right Margin (px)</label>
                <input
                  type="number"
                  value={marginRight}
                  onChange={(e) => {
                    setMarginRight(parseInt(e.target.value) || 0);
                    setActivePresetId('');
                  }}
                  className="input-field w-full h-8 bg-canvas"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Top Margin (px)</label>
                <input
                  type="number"
                  value={marginTop}
                  onChange={(e) => {
                    setMarginTop(parseInt(e.target.value) || 0);
                    setActivePresetId('');
                  }}
                  className="input-field w-full h-8 bg-canvas"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Bottom Margin (px)</label>
                <input
                  type="number"
                  value={marginBottom}
                  onChange={(e) => {
                    setMarginBottom(parseInt(e.target.value) || 0);
                    setActivePresetId('');
                  }}
                  className="input-field w-full h-8 bg-canvas"
                />
              </div>
            </div>

            {/* Export Configurations */}
            <div className="border-t border-hairline pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold uppercase text-body flex items-center">
                  <Layers size={12} className="mr-1.5" />
                  PDF & Batch Export
                </span>
                <span className="text-[10px] text-mute">{pageCount} page(s)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-body mb-1">Page Count</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={pageCount}
                    onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input-field w-full h-8 bg-canvas"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-body mb-1">Page Size</label>
                  <select
                    value={exportPaperSize}
                    onChange={(e) => setExportPaperSize(e.target.value as 'a4' | 'letter' | 'legal')}
                    className="input-field w-full h-8 bg-canvas cursor-pointer"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                    <option value="legal">Legal (8.5 × 14 in)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  onClick={generatePdf}
                  disabled={generating}
                  className="btn-primary h-9 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer font-bold font-mono"
                >
                  <FileText size={14} />
                  <span>{generating ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={generateMultiPage}
                  disabled={generating}
                  className="btn-secondary h-9 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer font-bold font-mono"
                >
                  <Download size={14} />
                  <span>Download ZIP</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
