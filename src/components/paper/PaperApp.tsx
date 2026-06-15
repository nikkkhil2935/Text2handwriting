import React, { useState, useEffect, useRef } from 'react';
import { Download, Grid, Settings, Layers, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';
import { downloadBlob } from '../../lib/exporter';

export default function PaperApp() {
  const [paperStyle, setPaperStyle] = useState('single-ruled');
  const [gridSize, setGridSize] = useState(30);
  const [lineColor, setLineColor] = useState('#ebebeb');
  const [marginColor, setMarginColor] = useState('#ffadad');
  const [paperColor, setPaperColor] = useState('#ffffff');
  const [hasVerticalMargin, setHasVerticalMargin] = useState(true);
  const [marginLeft, setMarginLeft] = useState(60);
  const [marginTop, setMarginTop] = useState(60);
  const [marginRight, setMarginRight] = useState(60);
  const [marginBottom, setMarginBottom] = useState(60);
  const [pageCount, setPageCount] = useState(5);

  const [previewUrl, setPreviewUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawPaperPreview();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [paperStyle, gridSize, lineColor, marginColor, paperColor, hasVerticalMargin, marginLeft, marginTop, marginRight, marginBottom]);

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
    const mRight = marginRight * scale;
    const mTop = marginTop * scale;
    const mBottom = marginBottom * scale;
    const gSize = gridSize * scale;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1 * scale;

    if (paperStyle === 'single-ruled' || paperStyle === 'a4-notebook') {
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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
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
      downloadBlob(zipBlob, 'paper-pages.zip');
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-6 w-full items-start">
        <div className="w-full md:w-1/2 flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-hairline pb-2.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-body">Paper Preview</span>
          </div>
          <div className="flex-grow bg-canvas-soft p-4 rounded border border-hairline flex items-center justify-center overflow-auto min-h-[400px]">
            {previewUrl ? (
              <img src={previewUrl} alt="Paper preview" className="w-full max-w-[400px] shadow rounded border object-contain bg-white" />
            ) : (
              <div className="w-full aspect-[1/1.41] max-w-[400px] bg-white flex items-center justify-center rounded shadow">
                <RefreshCw size={24} className="animate-spin text-mute" />
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-hairline pb-2.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-body">Paper Settings</span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block font-semibold uppercase text-body mb-1">Paper Style</label>
              <select value={paperStyle} onChange={(e) => setPaperStyle(e.target.value)} className="input-field w-full bg-canvas">
                <option value="plain">Plain White</option>
                <option value="single-ruled">Single Ruled</option>
                <option value="double-ruled">Double Ruled</option>
                <option value="a4-notebook">A4 Notebook</option>
                <option value="legal">Legal Pad</option>
                <option value="graph">Graph Grid</option>
                <option value="dot-grid">Dot Grid</option>
              </select>
            </div>

            {paperStyle !== 'plain' && (
              <div>
                <div className="flex justify-between text-body mb-1">
                  <span>Grid Size</span>
                  <span>{gridSize}px</span>
                </div>
                <input type="range" min="15" max="60" value={gridSize} onChange={(e) => setGridSize(parseInt(e.target.value))} className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Line Color</label>
                <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} className="w-full h-8 border border-hairline rounded cursor-pointer" />
              </div>
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Paper Color</label>
                <input type="color" value={paperColor} onChange={(e) => setPaperColor(e.target.value)} className="w-full h-8 border border-hairline rounded cursor-pointer" />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 bg-canvas-soft-2 px-2.5 rounded">
              <label className="cursor-pointer select-none">Show Margin Line</label>
              <input type="checkbox" checked={hasVerticalMargin} onChange={(e) => setHasVerticalMargin(e.target.checked)} className="w-4 h-4 accent-primary" />
            </div>

            {hasVerticalMargin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-body mb-1">Margin Color</label>
                  <input type="color" value={marginColor} onChange={(e) => setMarginColor(e.target.value)} className="w-full h-8 border border-hairline rounded cursor-pointer" />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-body mb-1">Left Margin</label>
                  <input type="number" value={marginLeft} onChange={(e) => setMarginLeft(parseInt(e.target.value) || 0)} className="input-field w-full h-8 bg-canvas" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Top Margin</label>
                <input type="number" value={marginTop} onChange={(e) => setMarginTop(parseInt(e.target.value) || 0)} className="input-field w-full h-8 bg-canvas" />
              </div>
              <div>
                <label className="block font-semibold uppercase text-body mb-1">Bottom Margin</label>
                <input type="number" value={marginBottom} onChange={(e) => setMarginBottom(parseInt(e.target.value) || 0)} className="input-field w-full h-8 bg-canvas" />
              </div>
            </div>

            <div className="border-t border-hairline pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold uppercase text-body flex items-center"><Layers size={12} className="mr-1" /> Multi-Page Export</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block font-semibold uppercase text-body mb-1">Pages</label>
                  <input type="number" min="1" max="100" value={pageCount} onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))} className="input-field w-full h-8 bg-canvas" />
                </div>
                <button
                  onClick={generateMultiPage}
                  disabled={generating}
                  className="btn-primary h-8 px-4 mt-5 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Download size={14} />
                  {generating ? 'Generating...' : 'Export ZIP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
