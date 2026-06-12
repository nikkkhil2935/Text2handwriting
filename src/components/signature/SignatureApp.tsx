import React, { useState, useEffect, useRef } from 'react';
import { Download, Type, Edit3, Trash2, RefreshCw } from 'lucide-react';
import { FONTS } from '../../lib/fonts';
import { downloadBlob } from '../../lib/exporter';

export default function SignatureApp() {
  const [activeTab, setActiveTab] = useState<'text' | 'draw'>('text');
  const [typedName, setTypedName] = useState('John Doe');
  const [fontFamily, setFontFamily] = useState('Mr De Haviland');
  const [inkColor, setInkColor] = useState('#0000ff');
  const [fontSize, setFontSize] = useState(56);
  const [slant, setSlant] = useState(0); // in degrees
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  // Drawing pad state
  const [strokes, setStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  const signatureFonts = FONTS.filter(f => f.category === 'signature' || f.category === 'cursive' || f.category === 'calligraphy');

  // Re-draw text signature on canvas
  useEffect(() => {
    if (activeTab === 'text') {
      drawTextSignature();
    }
  }, [typedName, fontFamily, inkColor, fontSize, slant, activeTab]);

  const drawTextSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  // Freehand drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStrokes([...strokes, [{ x, y }]]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const currentStroke = strokes[strokes.length - 1];
    const updatedStroke = [...currentStroke, { x, y }];
    const updatedStrokes = [...strokes.slice(0, -1), updatedStroke];
    setStrokes(updatedStrokes);

    // Draw line
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
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setIsDrawing(true);
    setStrokes([...strokes, [{ x, y }]]);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const currentStroke = strokes[strokes.length - 1];
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

  const clearDrawing = () => {
    setStrokes([]);
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Exporters
  const exportPng = () => {
    const sourceCanvas = activeTab === 'text' ? canvasRef.current : drawingCanvasRef.current;
    if (!sourceCanvas) return;

    sourceCanvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, 'signature.png');
      }
    }, 'image/png');
  };

  const exportSvg = () => {
    if (activeTab === 'draw') {
      // Generate SVG path for manual sketch
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

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
        <path d="${pathData}" fill="none" stroke="${inkColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
      </svg>`;
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      downloadBlob(blob, 'signature.svg');
    } else {
      // For text signatures, export SVG text with font-face
      const width = canvasRef.current?.width || 600;
      const height = canvasRef.current?.height || 200;
      const font = signatureFonts.find(f => f.family === fontFamily) || signatureFonts[0];
      const fontUrl = `${window.location.origin}${font.path}`;
      
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
        <defs>
          <style>
            @font-face {
              font-family: '${fontFamily}';
              src: url('${fontUrl}') format('woff2');
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
        <text x="50%" y="50%" class="sig-text" transform="rotate(${slant}, ${width/2}, ${height/2})">${typedName}</text>
      </svg>`;
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      downloadBlob(blob, 'signature.svg');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-6 w-full items-start">
        
        {/* Left Column: Canvas Preview */}
        <div className="w-full md:w-1/2 flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-hairline pb-2.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-body">Signature Output</span>
            <div className="flex bg-canvas-soft-2 p-0.5 rounded text-[10px] font-mono">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1 rounded cursor-pointer ${activeTab === 'text' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute'}`}
              >
                Text Signature
              </button>
              <button
                onClick={() => setActiveTab('draw')}
                className={`px-3 py-1 rounded cursor-pointer ${activeTab === 'draw' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute'}`}
              >
                Draw Signature
              </button>
            </div>
          </div>

          <div className="flex-grow bg-neutral-100 dark:bg-neutral-900 p-6 rounded border border-hairline flex items-center justify-center overflow-auto min-h-[220px]">
            {activeTab === 'text' ? (
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full max-w-[500px] border border-hairline rounded bg-white shadow-sm"
              />
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
                  className="w-full border border-hairline rounded bg-white shadow-sm cursor-crosshair touch-none"
                />
                {strokes.length > 0 && (
                  <button
                    onClick={clearDrawing}
                    className="absolute bottom-2 right-2 p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow flex items-center gap-1 text-[10px] font-mono font-bold"
                  >
                    <Trash2 size={11} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="w-full md:w-1/2 flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-hairline pb-2.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-body">Signature settings</span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {activeTab === 'text' ? (
              <>
                <div>
                  <label className="block font-semibold uppercase text-body mb-1">Type Your Name</label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="input-field bg-canvas"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-body mb-1">Choose Script Style</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="input-field bg-canvas"
                  >
                    {signatureFonts.map(font => (
                      <option key={font.name} value={font.family}>
                        {font.family}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-body mb-1">
                      <span>Font Size</span>
                      <span>{fontSize}px</span>
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
                      <span>{slant}°</span>
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
                  <span>{strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-mute mt-2">Use your mouse or touch screen to draw your signature on the canvas board.</p>
              </div>
            )}

            <div>
              <span className="block font-semibold uppercase text-body mb-2">Signature Ink Color</span>
              <div className="flex items-center space-x-2">
                {[
                  { color: '#0000ff', name: 'Blue' },
                  { color: '#1c1917', name: 'Black' },
                  { color: '#dc2626', name: 'Red' }
                ].map(preset => (
                  <button
                    key={preset.color}
                    onClick={() => setInkColor(preset.color)}
                    className="w-6 h-6 rounded-full border border-hairline cursor-pointer flex items-center justify-center"
                    style={{ backgroundColor: preset.color }}
                  >
                    {inkColor === preset.color && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </button>
                ))}
                <input
                  type="color"
                  value={inkColor}
                  onChange={(e) => setInkColor(e.target.value)}
                  className="w-6 h-6 p-0 border border-hairline rounded-full cursor-pointer overflow-hidden"
                />
              </div>
            </div>

            <div className="border-t border-hairline pt-4 mt-6">
              <span className="block font-semibold uppercase text-body mb-3">Download Signature (Transparent)</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={exportPng}
                  className="btn-secondary h-9 w-full flex items-center justify-center gap-1.5 cursor-pointer font-medium"
                >
                  <Download size={13} />
                  PNG Transparent
                </button>
                <button
                  onClick={exportSvg}
                  className="btn-primary h-9 w-full flex items-center justify-center gap-1.5 cursor-pointer font-medium"
                >
                  <Download size={13} />
                  Vector SVG
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
