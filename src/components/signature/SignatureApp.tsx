import React, { useState, useEffect, useRef } from 'react';
import { Download, Trash2, RefreshCw, Undo2, Redo2, Copy, Check, Sparkles, PenTool, Type } from 'lucide-react';
import { FONTS } from '../../lib/fonts';
import { downloadBlob } from '../../lib/exporter';
import { escapeXml } from '../../lib/xml';

const SAMPLE_NAMES = ['John Doe', 'Alexander Hamilton', 'Jane Austen', 'Dr. Victor Frank', 'Sarah Jenkins'];

export default function SignatureApp() {
  const [activeTab, setActiveTab] = useState<'text' | 'draw'>('text');
  const [typedName, setTypedName] = useState('John Doe');
  const [fontFamily, setFontFamily] = useState('Mr De Haviland');
  const [inkColor, setInkColor] = useState('#0000ff');
  const [fontSize, setFontSize] = useState(56);
  const [slant, setSlant] = useState(0); // in degrees
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isTransparent, setIsTransparent] = useState(true);
  
  // Drawing pad state with Undo / Redo
  const [strokes, setStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  const signatureFonts = FONTS.filter(f => f.category === 'signature' || f.category === 'cursive' || f.category === 'calligraphy');

  // Re-draw text signature on canvas
  useEffect(() => {
    if (activeTab === 'text') {
      document.fonts.load(`${fontSize}px "${fontFamily}"`)
        .then(() => {
          drawTextSignature();
        })
        .catch(() => {
          drawTextSignature();
        });
    }
  }, [typedName, fontFamily, inkColor, fontSize, slant, activeTab, isTransparent]);

  const drawTextSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isTransparent) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = inkColor;
    ctx.font = `${fontSize}px "${fontFamily}"`;

    // Apply rotation slant
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((slant * Math.PI) / 180);
    ctx.fillText(typedName, 0, 0);
    ctx.restore();
  };

  const redrawDrawingCanvas = (strokeList: Array<Array<{ x: number; y: number }>>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isTransparent) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokeList.forEach((stroke) => {
      if (stroke.length === 0) return;
      if (stroke.length === 1) {
        ctx.fillStyle = inkColor;
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, strokeWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };

  useEffect(() => {
    if (activeTab === 'draw') {
      redrawDrawingCanvas(strokes);
    }
  }, [isTransparent, inkColor, strokeWidth, activeTab]);

  const getCanvasCoordinates = (clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Freehand drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, canvas);
    
    setIsDrawing(true);
    setUndoneStrokes([]);
    setStrokes(prev => [...prev, [{ x, y }]]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || strokes.length === 0) return;
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, canvas);

    const currentStroke = strokes[strokes.length - 1];
    if (!currentStroke || currentStroke.length === 0) return;
    const updatedStroke = [...currentStroke, { x, y }];
    const updatedStrokes = [...strokes.slice(0, -1), updatedStroke];
    setStrokes(updatedStrokes);

    // Draw segment
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(currentStroke[currentStroke.length - 1].x, currentStroke[currentStroke.length - 1].y);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY, canvas);
    
    setIsDrawing(true);
    setUndoneStrokes([]);
    setStrokes(prev => [...prev, [{ x, y }]]);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || strokes.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY, canvas);

    const currentStroke = strokes[strokes.length - 1];
    if (!currentStroke || currentStroke.length === 0) return;
    const updatedStroke = [...currentStroke, { x, y }];
    const updatedStrokes = [...strokes.slice(0, -1), updatedStroke];
    setStrokes(updatedStrokes);

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(currentStroke[currentStroke.length - 1].x, currentStroke[currentStroke.length - 1].y);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const undoStroke = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const nextStrokes = strokes.slice(0, -1);
    setStrokes(nextStrokes);
    setUndoneStrokes(prev => [...prev, last]);
    redrawDrawingCanvas(nextStrokes);
  };

  const redoStroke = () => {
    if (undoneStrokes.length === 0) return;
    const restore = undoneStrokes[undoneStrokes.length - 1];
    const nextUndone = undoneStrokes.slice(0, -1);
    const nextStrokes = [...strokes, restore];
    setStrokes(nextStrokes);
    setUndoneStrokes(nextUndone);
    redrawDrawingCanvas(nextStrokes);
  };

  const clearDrawing = () => {
    setStrokes([]);
    setUndoneStrokes([]);
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!isTransparent) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Keyboard shortcut listener for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'draw') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redoStroke();
        } else {
          e.preventDefault();
          undoStroke();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redoStroke();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokes, undoneStrokes, activeTab, isTransparent, inkColor, strokeWidth]);

  // Exporters
  const exportPng = () => {
    const sourceCanvas = activeTab === 'text' ? canvasRef.current : drawingCanvasRef.current;
    if (!sourceCanvas) return;

    sourceCanvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, 'signature.png');
        showToast('PNG signature downloaded!');
      }
    }, 'image/png');
  };

  const copyToClipboard = async () => {
    const sourceCanvas = activeTab === 'text' ? canvasRef.current : drawingCanvasRef.current;
    if (!sourceCanvas) return;

    try {
      sourceCanvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Signature copied to clipboard! Ready to paste (Ctrl+V)');
      }, 'image/png');
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      showToast('Clipboard access denied. Please click Download PNG.', true);
    }
  };

  const exportSvg = async () => {
    if (activeTab === 'draw') {
      const width = drawingCanvasRef.current?.width || 600;
      const height = drawingCanvasRef.current?.height || 200;
      let pathData = '';
      strokes.forEach((stroke) => {
        if (stroke.length === 0) return;
        pathData += ` M ${stroke[0].x} ${stroke[0].y}`;
        for (let i = 1; i < stroke.length; i++) {
          pathData += ` L ${stroke[i].x} ${stroke[i].y}`;
        }
      });

      const bgRect = !isTransparent ? `<rect width="100%" height="100%" fill="#ffffff"/>` : '';

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
        ${bgRect}
        <path d="${pathData}" fill="none" stroke="${inkColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
      </svg>`;
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      downloadBlob(blob, 'signature.svg');
      showToast('Vector SVG downloaded!');
    } else {
      const width = canvasRef.current?.width || 600;
      const height = canvasRef.current?.height || 200;
      const font = signatureFonts.find(f => f.family === fontFamily) || signatureFonts[0];
      let fontSrc = `url('${window.location.origin}${font.path}') format('woff2')`;

      try {
        const res = await fetch(font.path);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          let binary = '';
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          fontSrc = `url('data:font/woff2;base64,${base64}') format('woff2')`;
        }
      } catch (err) {
        console.warn('Could not embed font base64 in SVG', err);
      }
      
      const bgRect = !isTransparent ? `<rect width="100%" height="100%" fill="#ffffff"/>` : '';

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
        <defs>
          <style>
            @font-face {
              font-family: '${fontFamily}';
              src: ${fontSrc};
            }
            .sig-text {
              font-family: '${fontFamily}', cursive;
              font-size: ${fontSize}px;
              fill: ${inkColor};
              text-anchor: middle;
              dominant-baseline: middle;
            }
          </style>
        </defs>
        ${bgRect}
        <text x="50%" y="50%" class="sig-text" transform="rotate(${slant}, ${width/2}, ${height/2})">${escapeXml(typedName)}</text>
      </svg>`;
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      downloadBlob(blob, 'signature.svg');
      showToast('Vector SVG downloaded!');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg z-50 text-xs font-mono font-medium border flex items-center space-x-2 transition-all transform translate-y-0 ${
          toast.isError
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-300'
            : 'bg-canvas border-hairline-strong text-primary'
        }`}>
          <span className="w-1.5 h-1.5 bg-current rounded-full animate-ping"></span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 w-full items-start">
        
        {/* Left Column: Canvas Preview */}
        <div className="w-full md:w-1/2 flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-hairline pb-2.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-body flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Signature Canvas
            </span>
            <div className="flex bg-canvas-soft-2 p-0.5 rounded text-[10px] font-mono border border-hairline">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${activeTab === 'text' ? 'bg-canvas text-primary font-semibold shadow-xs' : 'text-mute hover:text-body'}`}
              >
                <Type size={11} />
                <span>Text Signature</span>
              </button>
              <button
                onClick={() => setActiveTab('draw')}
                className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${activeTab === 'draw' ? 'bg-canvas text-primary font-semibold shadow-xs' : 'text-mute hover:text-body'}`}
              >
                <PenTool size={11} />
                <span>Draw Freehand</span>
              </button>
            </div>
          </div>

          {/* Canvas container with subtle grid texture background */}
          <div className="flex-grow bg-canvas-soft p-6 rounded-lg border border-hairline flex flex-col items-center justify-center overflow-auto min-h-[240px]">
            {activeTab === 'text' ? (
              <div className="relative w-full max-w-[500px]">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className={`w-full border border-hairline rounded-lg shadow-sm transition-colors ${
                    isTransparent
                      ? 'bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] dark:bg-[linear-gradient(45deg,#1f2937_25%,transparent_25%),linear-gradient(-45deg,#1f2937_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1f2937_75%),linear-gradient(-45deg,transparent_75%,#1f2937_75%)]'
                      : 'bg-white'
                  }`}
                />
              </div>
            ) : (
              <div className="relative w-full max-w-[500px]">
                <canvas
                  ref={drawingCanvasRef}
                  width={600}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={stopDrawing}
                  className={`w-full border border-hairline rounded-lg shadow-sm cursor-crosshair touch-none transition-colors ${
                    isTransparent
                      ? 'bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] dark:bg-[linear-gradient(45deg,#1f2937_25%,transparent_25%),linear-gradient(-45deg,#1f2937_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1f2937_75%),linear-gradient(-45deg,transparent_75%,#1f2937_75%)]'
                      : 'bg-white'
                  }`}
                />

                {/* Floating Canvas Controls (Undo / Redo / Clear) */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-canvas/90 backdrop-blur-xs border border-hairline p-1 rounded-md shadow-sm">
                  <button
                    onClick={undoStroke}
                    disabled={strokes.length === 0}
                    className="p-1 hover:bg-canvas-soft rounded text-body disabled:opacity-30 cursor-pointer transition-colors"
                    title="Undo Stroke (Ctrl+Z)"
                  >
                    <Undo2 size={13} />
                  </button>
                  <button
                    onClick={redoStroke}
                    disabled={undoneStrokes.length === 0}
                    className="p-1 hover:bg-canvas-soft rounded text-body disabled:opacity-30 cursor-pointer transition-colors"
                    title="Redo Stroke (Ctrl+Y)"
                  >
                    <Redo2 size={13} />
                  </button>
                  <div className="w-[1px] h-3 bg-hairline"></div>
                  <button
                    onClick={clearDrawing}
                    disabled={strokes.length === 0}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded disabled:opacity-30 cursor-pointer transition-colors flex items-center gap-1 text-[10px] font-mono font-bold"
                    title="Clear All Strokes"
                  >
                    <Trash2 size={12} />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Buttons (Copy & Download) */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-hairline font-mono text-[11px]">
            <button
              onClick={copyToClipboard}
              className="btn-secondary h-8 w-full flex items-center justify-center gap-1.5 cursor-pointer font-bold"
              title="Copy signature PNG to system clipboard"
            >
              <Copy size={12} />
              <span>Copy Image</span>
            </button>
            <button
              onClick={exportPng}
              className="btn-primary h-8 w-full flex items-center justify-center gap-1.5 cursor-pointer font-bold"
            >
              <Download size={12} />
              <span>Download PNG</span>
            </button>
            <button
              onClick={exportSvg}
              className="btn-secondary h-8 w-full flex items-center justify-center gap-1.5 cursor-pointer font-bold"
            >
              <Download size={12} />
              <span>Vector SVG</span>
            </button>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="w-full md:w-1/2 flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-hairline pb-2.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-body">Signature Styling</span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {activeTab === 'text' ? (
              <>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-semibold uppercase text-body">Type Your Name</label>
                    <span className="text-[10px] text-mute">{typedName.length} chars</span>
                  </div>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Enter your name or initials..."
                    className="input-field bg-canvas font-mono"
                  />
                  {/* Quick sample name chips */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {SAMPLE_NAMES.map(name => (
                      <button
                        key={name}
                        onClick={() => setTypedName(name)}
                        className={`text-[10px] px-2 py-0.5 rounded border border-hairline transition-colors cursor-pointer ${typedName === name ? 'bg-primary text-on-primary font-bold' : 'bg-canvas hover:bg-canvas-soft text-mute hover:text-primary'}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-body mb-1">Cursive Script Style</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="input-field bg-canvas"
                  >
                    {signatureFonts.map(font => (
                      <option key={font.name} value={font.family}>
                        {font.family} ({font.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-body mb-1">
                      <span>Font Size</span>
                      <span className="text-primary font-bold">{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="90"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-body mb-1">
                      <span>Slant Angle</span>
                      <span className="text-primary font-bold">{slant}°</span>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      value={slant}
                      onChange={(e) => setSlant(parseInt(e.target.value))}
                      className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="flex justify-between text-body mb-1">
                  <span>Stroke Thickness</span>
                  <span className="text-primary font-bold">{strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-mute mt-2 leading-relaxed">
                  Use your mouse or touchscreen to draw smoothly. Keyboard shortcut: <kbd className="px-1 py-0.5 border border-hairline rounded bg-canvas">Ctrl+Z</kbd> to undo a stroke.
                </p>
              </div>
            )}

            {/* Ink Color Picker */}
            <div>
              <span className="block font-semibold uppercase text-body mb-2">Signature Ink Color</span>
              <div className="flex items-center space-x-2">
                {[
                  { color: '#0000ff', name: 'Royal Blue' },
                  { color: '#1c1917', name: 'Dark Ink' },
                  { color: '#047857', name: 'Emerald' },
                  { color: '#dc2626', name: 'Crimson' }
                ].map(preset => (
                  <button
                    key={preset.color}
                    onClick={() => setInkColor(preset.color)}
                    className="w-6 h-6 rounded-full border border-hairline cursor-pointer flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  >
                    {inkColor === preset.color && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </button>
                ))}
                <input
                  type="color"
                  value={inkColor}
                  onChange={(e) => setInkColor(e.target.value)}
                  className="w-6 h-6 p-0 border border-hairline rounded-full cursor-pointer overflow-hidden"
                  title="Pick Custom Color"
                />
              </div>
            </div>

            {/* Background Transparency Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-hairline bg-canvas-soft">
              <div>
                <div className="font-semibold text-primary">Transparent Background</div>
                <div className="text-[10px] text-mute">Export transparent PNG (for document overlay) vs white paper background</div>
              </div>
              <input
                type="checkbox"
                checked={isTransparent}
                onChange={(e) => setIsTransparent(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
