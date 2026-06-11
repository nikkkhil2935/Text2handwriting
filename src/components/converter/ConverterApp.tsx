import React, { useState, useEffect, useRef } from 'react';
import { 
  Undo2, Redo2, Download, RefreshCw, Save, FolderOpen, 
  Settings, Type, FileText, Sparkles, Sliders, Keyboard, 
  Info, Check, Moon, Sun, PanelLeftClose, PanelLeftOpen, Upload, Trash2 
} from 'lucide-react';
import { FONTS, CATEGORIES, getFontsByCategory } from '../../lib/fonts';
import { createPdfFromImages, createZipFromImages, downloadBlob } from '../../lib/exporter';

interface Preset {
  name: string;
  fontName: string;
  paperStyle: string;
  inkColor: string;
  inkType: string;
  fontSize: number;
  lineHeight: number;
  wordSpacing: number;
  letterSpacing: number;
  alignment: string;
  margins: { top: number; bottom: number; left: number; right: number };
  messiness: number;
  rotation: number;
  vJitter: number;
  hJitter: number;
  baselineDrift: number;
  pressureVariation: number;
  smudge: boolean;
}

const DEFAULT_PRESETS: Record<string, Preset> = {
  'Neat Assignment': {
    name: 'Neat Assignment',
    fontName: 'Architects Daughter',
    paperStyle: 'single-ruled',
    inkColor: '#0000ff',
    inkType: 'ballpoint',
    fontSize: 20,
    lineHeight: 1.5,
    wordSpacing: 1,
    letterSpacing: 0,
    alignment: 'left',
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    messiness: 0.6,
    rotation: 1.5,
    vJitter: 0.8,
    hJitter: 0.4,
    baselineDrift: 0.5,
    pressureVariation: 0.1,
    smudge: false
  },
  'Cursive Letter': {
    name: 'Cursive Letter',
    fontName: 'Dancing Script',
    paperStyle: 'plain',
    inkColor: '#1c1917',
    inkType: 'fountain',
    fontSize: 22,
    lineHeight: 1.6,
    wordSpacing: 2,
    letterSpacing: 1,
    alignment: 'left',
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    messiness: 0.8,
    rotation: 2.5,
    vJitter: 1.2,
    hJitter: 0.6,
    baselineDrift: 0.8,
    pressureVariation: 0.15,
    smudge: true
  },
  'Messy Notebook': {
    name: 'Messy Notebook',
    fontName: 'Reenie Beanie',
    paperStyle: 'a4-notebook',
    inkColor: '#0000ff',
    inkType: 'pencil',
    fontSize: 24,
    lineHeight: 1.3,
    wordSpacing: -1,
    letterSpacing: -1,
    alignment: 'left',
    margins: { top: 70, bottom: 60, left: 60, right: 60 },
    messiness: 1.4,
    rotation: 4.5,
    vJitter: 2.2,
    hJitter: 1.2,
    baselineDrift: 1.8,
    pressureVariation: 0.25,
    smudge: true
  }
};

const SAMPLE_TEXT = `Text to Handwriting Converter
==========================================

Write highly realistic handwritten notes instantly. 

Features list:
- Support for 20 handwriting fonts
- Customized paper grids, colors, margins, and headers
- Live multi-page rendering using Web Workers
- High fidelity single & bulk PDF/ZIP exports

---page break---
This is a new page manually inserted using a page break delimiter.

You can customize:
1. Baselines - make text slide slightly uphill/downhill.
2. Jitter - letters slightly rotate or shift up/down to simulate human inconsistency.
3. Stroke variations - opacity changes randomly per character.

Write assignments, cursive letters, signature cards or notebook worksheets seamlessly!`;

export default function ConverterApp() {
  // Config state
  const [text, setText] = useState(SAMPLE_TEXT);
  const [fontFamily, setFontFamily] = useState('Architects Daughter');
  const [paperStyle, setPaperStyle] = useState('single-ruled');
  const [gridSize, setGridSize] = useState(30);
  const [inkColor, setInkColor] = useState('#0000ff');
  const [inkType, setInkType] = useState('ballpoint');
  const [fontSize, setFontSize] = useState(20);
  const [lineHeight, setLineHeight] = useState(1.4);
  const [wordSpacing, setWordSpacing] = useState(0);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [alignment, setAlignment] = useState('left');
  
  const [margins, setMargins] = useState({ top: 60, bottom: 60, left: 60, right: 60 });
  const [messiness, setMessiness] = useState(0.8);
  const [rotation, setRotation] = useState(2.0);
  const [vJitter, setVJitter] = useState(1.2);
  const [hJitter, setHJitter] = useState(0.6);
  const [baselineDrift, setBaselineDrift] = useState(0.8);
  const [pressureVariation, setPressureVariation] = useState(0.12);
  const [smudge, setSmudge] = useState(false);
  const [seed, setSeed] = useState(12345);
  
  const [pageHeader, setPageHeader] = useState('Name: ____________  Date: ________');
  const [pageFooter, setPageFooter] = useState('Page {page} of {pages}');
  
  // Custom paper background
  const [customBgBitmap, setCustomBgBitmap] = useState<ImageBitmap | null>(null);
  const [customBgName, setCustomBgName] = useState<string>('');

  // Exporter Config
  const [exportDpi, setExportDpi] = useState('1.0'); // 1.0 = screen, 2.0 = medium, 3.0 = 300dpi print
  const [exportPaper, setExportPaper] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [jpgQuality, setJpgQuality] = useState(0.9);

  // Layout toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<'fonts' | 'paper' | 'realism' | 'header'>('fonts');
  const [presets, setPresets] = useState<Record<string, Preset>>(DEFAULT_PRESETS);
  const [newPresetName, setNewPresetName] = useState('');

  // History state for undo/redo
  const [history, setHistory] = useState<string[]>([SAMPLE_TEXT]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Render output state
  const [pages, setPages] = useState<string[]>([]);
  const [pagesBuffers, setPagesBuffers] = useState<ArrayBuffer[]>([]);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [previewPageIdx, setPreviewPageIdx] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const renderTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pagesRef = useRef<string[]>([]);

  // Keep pagesRef in sync with state
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  // Load presets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('scribble_presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load user presets', e);
      }
    }
  }, []);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker('/workers/render.worker.js');
    
    workerRef.current.onmessage = (e) => {
      const { type, pages: buffers, message } = e.data;
      
      if (type === 'success') {
        // Revoke old object URLs after a short delay to let browser transition images smoothly
        const urlsToRevoke = [...pagesRef.current];
        setTimeout(() => {
          urlsToRevoke.forEach(URL.revokeObjectURL);
        }, 3000);
        
        const urls = buffers.map((buf: ArrayBuffer) => 
          URL.createObjectURL(new Blob([buf], { type: 'image/png' }))
        );
        
        setPages(urls);
        setPagesBuffers(buffers);
        setRendering(false);
        setError('');
        
        setPreviewPageIdx(curr => curr >= urls.length ? 0 : curr);
      } else if (type === 'error') {
        setError(message || 'Failed to render canvas');
        setRendering(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Debounced trigger to post settings to worker
  const triggerRender = () => {
    if (renderTimeoutRef.current) {
      window.clearTimeout(renderTimeoutRef.current);
    }

    setRendering(true);

    renderTimeoutRef.current = window.setTimeout(() => {
      const font = FONTS.find(f => f.family === fontFamily) || FONTS[0];
      
      let paperWidth = 800;
      let paperHeight = 1130;
      if (exportPaper === 'letter') {
        paperHeight = 1035;
      } else if (exportPaper === 'legal') {
        paperHeight = 1318;
      }

      const payload = {
        text,
        fontName: font.family,
        fontUrl: font.path,
        paperStyle,
        gridSize,
        inkColor,
        inkType,
        fontSize,
        lineHeight,
        wordSpacing,
        letterSpacing,
        alignment,
        margins,
        realism: {
          messiness,
          rotation,
          vJitter,
          hJitter,
          baselineDrift,
          pressureVariation,
          smudge,
          seed
        },
        pageHeader,
        pageFooter,
        backgroundImageBitmap: customBgBitmap,
        dpiMultiplier: 1.0, // Render on screen at 1x
        paperWidth,
        paperHeight
      };

      // Transfer ImageBitmap if available to avoid cloning overhead
      if (customBgBitmap) {
        // Create a copy bitmap if we want to transfer, or just pass it by clone.
        // Chrome allows cloning ImageBitmap in worker. Transferring is faster but invalidates local state.
        // Let's pass it by cloning by default to keep local reference intact.
        workerRef.current?.postMessage(payload);
      } else {
        workerRef.current?.postMessage(payload);
      }
    }, 250);
  };

  // Re-run render when parameters change
  useEffect(() => {
    triggerRender();
  }, [
    text, fontFamily, paperStyle, gridSize, inkColor, inkType, fontSize, lineHeight,
    wordSpacing, letterSpacing, alignment, margins, messiness, rotation, vJitter,
    hJitter, baselineDrift, pressureVariation, smudge, seed, pageHeader, pageFooter,
    customBgBitmap, exportPaper
  ]);

  // Handle text undo/redo history
  const handleTextChange = (val: string) => {
    setText(val);
    
    // Add to history
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(val);
    
    // Cap history length at 50
    if (nextHistory.length > 50) {
      nextHistory.shift();
    }
    
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setText(history[idx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setText(history[idx]);
    }
  };

  // Keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleDownloadPdf();
      } else if (isCtrl && e.key === 'Enter') {
        e.preventDefault();
        triggerRender();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, pagesBuffers]);

  // Load Layout Preset
  const applyPreset = (preset: Preset) => {
    setFontFamily(preset.fontName);
    setPaperStyle(preset.paperStyle);
    setInkColor(preset.inkColor);
    setInkType(preset.inkType);
    setFontSize(preset.fontSize);
    setLineHeight(preset.lineHeight);
    setWordSpacing(preset.wordSpacing);
    setLetterSpacing(preset.letterSpacing);
    setAlignment(preset.alignment);
    setMargins(preset.margins);
    setMessiness(preset.messiness);
    setRotation(preset.rotation);
    setVJitter(preset.vJitter);
    setHJitter(preset.hJitter);
    setBaselineDrift(preset.baselineDrift);
    setPressureVariation(preset.pressureVariation);
    setSmudge(preset.smudge);
    showToast(`Loaded Preset: ${preset.name}`);
  };

  // Save Preset
  const savePreset = () => {
    if (!newPresetName.trim()) return;
    
    const presetObj: Preset = {
      name: newPresetName,
      fontName: fontFamily,
      paperStyle,
      inkColor,
      inkType,
      fontSize,
      lineHeight,
      wordSpacing,
      letterSpacing,
      alignment,
      margins,
      messiness,
      rotation,
      vJitter,
      hJitter,
      baselineDrift,
      pressureVariation,
      smudge
    };

    const nextPresets = { ...presets, [newPresetName]: presetObj };
    setPresets(nextPresets);
    localStorage.setItem('scribble_presets', JSON.stringify(nextPresets));
    setNewPresetName('');
    showToast(`Saved Layout Preset: ${newPresetName}`);
  };

  const deletePreset = (name: string) => {
    const nextPresets = { ...presets };
    delete nextPresets[name];
    setPresets(nextPresets);
    localStorage.setItem('scribble_presets', JSON.stringify(nextPresets));
  };

  // Custom paper file upload
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const bitmap = await createImageBitmap(file);
      setCustomBgBitmap(bitmap);
      setCustomBgName(file.name);
      setPaperStyle('custom');
      showToast(`Uploaded background: ${file.name}`);
    } catch (err) {
      console.error('Failed to parse uploaded image', err);
      showToast('Error uploading background image', true);
    }
  };

  // Exporters
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  // Run render specifically at high DPI to export
  const renderHighDpi = async (dpi: number): Promise<ArrayBuffer[]> => {
    return new Promise((resolve, reject) => {
      const exportWorker = new Worker('/workers/render.worker.js');
      const font = FONTS.find(f => f.family === fontFamily) || FONTS[0];
      
      let paperWidth = 800;
      let paperHeight = 1130;
      if (exportPaper === 'letter') {
        paperHeight = 1035;
      } else if (exportPaper === 'legal') {
        paperHeight = 1318;
      }

      exportWorker.onmessage = (e) => {
        const { type, pages: buffers, message } = e.data;
        exportWorker.terminate();
        if (type === 'success') {
          resolve(buffers);
        } else {
          reject(new Error(message || 'Failed render'));
        }
      };

      exportWorker.postMessage({
        text,
        fontName: font.family,
        fontUrl: font.path,
        paperStyle,
        gridSize,
        inkColor,
        inkType,
        fontSize,
        lineHeight,
        wordSpacing,
        letterSpacing,
        alignment,
        margins,
        realism: {
          messiness,
          rotation,
          vJitter,
          hJitter,
          baselineDrift,
          pressureVariation,
          smudge,
          seed
        },
        pageHeader,
        pageFooter,
        backgroundImageBitmap: customBgBitmap,
        dpiMultiplier: dpi,
        paperWidth,
        paperHeight
      });
    });
  };

  const handleDownloadImages = async () => {
    try {
      showToast('Compiling ZIP of handwritten pages...');
      const dpi = parseFloat(exportDpi);
      const buffers = dpi === 1.0 ? pagesBuffers : await renderHighDpi(dpi);
      
      const zipBlob = await createZipFromImages(buffers, 'handwritten-note');
      downloadBlob(zipBlob, 'handwritten-notes.zip');
      showToast('Downloaded ZIP successfully!');
    } catch (e) {
      showToast('ZIP export failed.', true);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      showToast('Compiling high fidelity PDF...');
      const dpi = parseFloat(exportDpi);
      const buffers = dpi === 1.0 ? pagesBuffers : await renderHighDpi(dpi);

      const pdfBytes = await createPdfFromImages(buffers, exportPaper);
      const pdfBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      downloadBlob(pdfBlob, 'handwritten-document.pdf');
      showToast('Downloaded PDF successfully!');
    } catch (e) {
      console.error(e);
      showToast('PDF export failed.', true);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 relative min-h-[calc(100vh-100px)]">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg z-50 text-xs font-medium border flex items-center space-x-2 transition-all transform translate-y-0 ${
          toast.isError 
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-300' 
            : 'bg-canvas border-hairline-strong text-primary'
        }`}>
          <span className="w-1.5 h-1.5 bg-current rounded-full animate-ping"></span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Section: Live Preview (Left) and Text Editor (Right) */}
      <div className="flex flex-col md:flex-row gap-6 w-full items-stretch">
        
        {/* Left Column: Live Canvas Preview (50%) */}
        <div className="w-full md:w-1/2 flex items-center justify-center min-h-[450px]">
          {rendering && pages.length === 0 ? (
            <div className="w-full max-w-[400px] aspect-[1/1.41] bg-white flex flex-col items-center justify-center space-y-3 rounded shadow animate-pulse">
              <RefreshCw size={24} className="animate-spin text-mute" />
              <span className="text-xs text-mute font-mono">GENERATING HANDWRITING...</span>
            </div>
          ) : error ? (
            <div className="w-full max-w-[400px] aspect-[1/1.41] bg-white flex flex-col items-center justify-center p-6 text-center text-xs text-red-500 font-mono rounded shadow border border-red-200">
              <Info size={24} className="mb-2" />
              <span>{error}</span>
            </div>
          ) : pages.length > 0 ? (
            <div className="relative">
              <img
                src={pages[previewPageIdx]}
                alt={`Handwritten page ${previewPageIdx + 1}`}
                className="w-full max-w-[400px] shadow rounded object-contain bg-white"
              />
              {pages.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center space-x-2 text-xs bg-canvas/80 backdrop-blur-sm px-3 py-1 rounded-full border border-hairline">
                  <button
                    disabled={previewPageIdx === 0}
                    onClick={() => setPreviewPageIdx(p => Math.max(0, p - 1))}
                    className="font-mono font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    ◀
                  </button>
                  <span className="font-mono text-body font-medium">
                    {previewPageIdx + 1}/{pages.length}
                  </span>
                  <button
                    disabled={previewPageIdx >= pages.length - 1}
                    onClick={() => setPreviewPageIdx(p => Math.min(pages.length - 1, p + 1))}
                    className="font-mono font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-[400px] aspect-[1/1.41] bg-white flex items-center justify-center rounded shadow">
              <span className="text-xs text-mute font-mono">No pages rendered</span>
            </div>
          )}
        </div>

        {/* Right Column: Text Editor Input (50%) */}
        <div className="w-full md:w-1/2 flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm min-h-[450px] transition-colors">
          <div className="flex items-center justify-between w-full mb-3 border-b border-hairline pb-2.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-body">Text Editor Input</span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleUndo} 
                disabled={historyIndex === 0}
                className="p-1 rounded hover:bg-canvas-soft-2 text-body disabled:opacity-30 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={15} />
              </button>
              <button 
                onClick={handleRedo} 
                disabled={historyIndex >= history.length - 1}
                className="p-1 rounded hover:bg-canvas-soft-2 text-body disabled:opacity-30 cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={15} />
              </button>
              <span className="text-hairline h-4 w-px bg-current mx-2"></span>
              <button 
                onClick={() => handleTextChange(text + '\n---page break---\n')}
                className="text-[10px] font-mono font-semibold text-body hover:text-primary bg-canvas-soft-2 hover:bg-hairline px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                + PAGE_BREAK
              </button>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Type your notes here. Delimit pages using '---page break---'."
            className="flex-grow w-full border border-hairline bg-canvas text-ink p-4 rounded font-mono text-sm leading-relaxed outline-none focus:border-hairline-strong resize-y min-h-[300px] transition-colors"
          />

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-mono border-b border-hairline pb-3">
            <span className="text-mute mr-1">Try Languages:</span>
            <button
              onClick={() => {
                handleTextChange("नमस्ते Text to Handwriting! यह देवनागरी लिखावट का एक सुंदर उदाहरण है।");
                setFontFamily("Yatra One");
              }}
              className="px-2 py-0.5 rounded bg-canvas-soft-2 hover:bg-hairline text-[10px] font-semibold text-body hover:text-primary transition-colors cursor-pointer"
            >
              Hindi (हिन्दी)
            </button>
            <button
              onClick={() => {
                handleTextChange("The quick brown fox jumps over the lazy dog. Realistic handwritten notes made easy.");
                setFontFamily("Architects Daughter");
              }}
              className="px-2 py-0.5 rounded bg-canvas-soft-2 hover:bg-hairline text-[10px] font-semibold text-body hover:text-primary transition-colors cursor-pointer"
            >
              English
            </button>
            <button
              onClick={() => {
                handleTextChange("Hola Text to Handwriting! Este es un ejemplo de texto escrito a mano en español.");
                setFontFamily("Dancing Script");
              }}
              className="px-2 py-0.5 rounded bg-canvas-soft-2 hover:bg-hairline text-[10px] font-semibold text-body hover:text-primary transition-colors cursor-pointer"
            >
              Spanish (Español)
            </button>
            <button
              onClick={() => {
                handleTextChange("Bonjour Text to Handwriting! Voici un exemple d'écriture manuscrite en français.");
                setFontFamily("Caveat");
              }}
              className="px-2 py-0.5 rounded bg-canvas-soft-2 hover:bg-hairline text-[10px] font-semibold text-body hover:text-primary transition-colors cursor-pointer"
            >
              French (Français)
            </button>
            <button
              onClick={() => {
                handleTextChange("Hallo Text to Handwriting! Dies ist ein Beispiel für eine deutsche Handschrift.");
                setFontFamily("Patrick Hand");
              }}
              className="px-2 py-0.5 rounded bg-canvas-soft-2 hover:bg-hairline text-[10px] font-semibold text-body hover:text-primary transition-colors cursor-pointer"
            >
              German (Deutsch)
            </button>
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-mute font-mono mt-3">
            <Keyboard size={11} />
            <div className="flex space-x-3">
              <span><kbd className="border border-hairline px-1 rounded bg-canvas font-sans">Ctrl+Enter</kbd> Render</span>
              <span><kbd className="border border-hairline px-1 rounded bg-canvas font-sans">Ctrl+Z/Y</kbd> History</span>
              <span><kbd className="border border-hairline px-1 rounded bg-canvas font-sans">Ctrl+S</kbd> Export PDF</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Section: Customization & Realism Controls */}
      <div className="w-full border border-hairline bg-canvas rounded-lg p-6 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-hairline pb-4 mb-4 gap-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-primary flex items-center">
            <Settings size={14} className="mr-1.5" />
            <span>Handwriting Configuration Settings</span>
          </h3>

          {/* Sub-panel Navigation tabs */}
          <div className="flex flex-wrap gap-1 bg-canvas-soft-2 p-1 rounded-md text-xs font-mono">
            <button 
              onClick={() => setActivePanel('fonts')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${activePanel === 'fonts' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Typography
            </button>
            <button 
              onClick={() => setActivePanel('paper')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${activePanel === 'paper' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Paper & Ink
            </button>
            <button 
              onClick={() => setActivePanel('realism')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${activePanel === 'realism' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Realism Engine
            </button>
            <button 
              onClick={() => setActivePanel('header')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${activePanel === 'header' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Margins & Header
            </button>
          </div>
        </div>

        {/* Configurations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1 & 2: Active Panel Settings */}
          <div className="lg:col-span-2 min-h-[220px]">
            
            {activePanel === 'fonts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase text-body mb-2">Select Font Category</label>
                    <select
                      value={FONTS.find(f => f.family === fontFamily)?.category || 'neat'}
                      onChange={(e) => {
                        const categoryFonts = getFontsByCategory(e.target.value);
                        if (categoryFonts.length > 0) {
                          setFontFamily(categoryFonts[0].family);
                        }
                      }}
                      className="input-field text-xs bg-canvas"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase text-body mb-2">Handwriting Font Variant</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="input-field text-xs bg-canvas font-mono"
                    >
                      {FONTS.map(font => (
                        <option key={font.name} value={font.family}>
                          {font.family} ({font.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-xs font-mono text-body mb-2">Text Alignment</span>
                    <div className="grid grid-cols-3 gap-1 bg-canvas-soft-2 p-0.5 rounded text-xs font-mono">
                      {['left', 'center', 'right'].map(align => (
                        <button
                          key={align}
                          onClick={() => setAlignment(align)}
                          className={`py-1 rounded capitalize cursor-pointer ${alignment === align ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="block text-[10px] font-mono font-bold uppercase text-mute mb-1">Layout Spacing Controls</span>
                  <div>
                    <div className="flex justify-between text-xs font-mono text-body mb-1">
                      <span>Font Size</span>
                      <span>{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="40"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono text-body mb-1">
                      <span>Line Height</span>
                      <span>{lineHeight}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.5"
                      step="0.05"
                      value={lineHeight}
                      onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                      className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono text-body mb-1">
                      <span>Word Spacing</span>
                      <span>{wordSpacing}px</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="15"
                      value={wordSpacing}
                      onChange={(e) => setWordSpacing(parseInt(e.target.value))}
                      className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono text-body mb-1">
                      <span>Letter Spacing</span>
                      <span>{letterSpacing}px</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="10"
                      value={letterSpacing}
                      onChange={(e) => setLetterSpacing(parseInt(e.target.value))}
                      className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'paper' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase text-body mb-2">Paper Background style</label>
                    <select
                      value={paperStyle}
                      onChange={(e) => setPaperStyle(e.target.value)}
                      className="input-field text-xs bg-canvas"
                    >
                      <option value="plain">Plain White Page</option>
                      <option value="single-ruled">Single Ruled (Notebook)</option>
                      <option value="double-ruled">Double Ruled (Calligraphy)</option>
                      <option value="a4-notebook">A4 Ruled with Top Margin</option>
                      <option value="legal">Legal Pad (Yellow Ruled)</option>
                      <option value="graph">Graph Grid Paper</option>
                      <option value="dot-grid">Dot Grid Sheet</option>
                      <option value="custom">Custom Image Background</option>
                    </select>
                  </div>

                  {paperStyle === 'custom' && (
                    <div className="border border-dashed border-hairline rounded-lg p-3 bg-canvas-soft-2/50 text-center">
                      {customBgName ? (
                        <div className="space-y-2">
                          <p className="text-xs font-mono text-body truncate">{customBgName}</p>
                          <button 
                            onClick={() => { setCustomBgBitmap(null); setCustomBgName(''); setPaperStyle('plain'); }}
                            className="text-[10px] font-mono text-red-500 hover:underline flex items-center justify-center mx-auto"
                          >
                            <Trash2 size={10} className="mr-1" /> Clear Image
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleBgUpload}
                            className="hidden"
                          />
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-mono text-body bg-canvas hover:bg-canvas-soft border border-hairline px-3 py-1.5 rounded flex items-center justify-center mx-auto"
                          >
                            <Upload size={12} className="mr-1.5" /> Upload Background
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {paperStyle !== 'plain' && paperStyle !== 'custom' && (
                    <div>
                      <div className="flex justify-between text-xs font-mono text-body mb-1">
                        <span>Ruler / Grid Size</span>
                        <span>{gridSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="60"
                        value={gridSize}
                        onChange={(e) => setGridSize(parseInt(e.target.value))}
                        className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <span className="block text-[10px] font-mono font-bold uppercase text-mute mb-1">Ink Attributes</span>
                  <div>
                    <span className="block text-xs font-mono text-body mb-2">Ink Color Preset</span>
                    <div className="flex space-x-2">
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
                          {inkColor === preset.color && <Check size={12} className="text-white" />}
                        </button>
                      ))}
                      <input
                        type="color"
                        value={inkColor}
                        onChange={(e) => setInkColor(e.target.value)}
                        className="w-6 h-6 p-0 border border-hairline rounded-full cursor-pointer overflow-hidden"
                        title="Custom Color"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-body mb-1.5">Pen / Texture Type</label>
                    <select
                      value={inkType}
                      onChange={(e) => setInkType(e.target.value)}
                      className="input-field text-xs bg-canvas"
                    >
                      <option value="ballpoint">Ballpoint Pen (Standard)</option>
                      <option value="fountain">Fountain Pen (Smooth Bleed)</option>
                      <option value="pencil">Pencil (Textured Grain)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'realism' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono text-body mb-1">
                      <span className="flex items-center"><Sparkles size={12} className="text-yellow-500 mr-1" /> Messiness Multiplier</span>
                      <span>{messiness.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.5"
                      step="0.1"
                      value={messiness}
                      onChange={(e) => {
                        const m = parseFloat(e.target.value);
                        setMessiness(m);
                        setRotation(m * 2.2);
                        setVJitter(m * 1.3);
                        setHJitter(m * 0.7);
                        setBaselineDrift(m * 0.9);
                        setPressureVariation(Math.min(0.3, m * 0.15));
                      }}
                      className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-mute font-mono mt-1">
                      <span>Neat</span>
                      <span>Chaotic</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono text-body mb-1">
                      <span>Max Rotation slant</span>
                      <span>{rotation.toFixed(1)}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="0.2"
                      value={rotation}
                      onChange={(e) => setRotation(parseFloat(e.target.value))}
                      className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono text-body mb-1">
                      <span>Vertical baseline Jitter</span>
                      <span>{vJitter.toFixed(1)}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="0.1"
                      value={vJitter}
                      onChange={(e) => setVJitter(parseFloat(e.target.value))}
                      className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono text-body mb-1">
                        <span>H-Jitter</span>
                        <span>{hJitter.toFixed(1)}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={hJitter}
                        onChange={(e) => setHJitter(parseFloat(e.target.value))}
                        className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-mono text-body mb-1">
                        <span>Baseline Drift</span>
                        <span>{baselineDrift.toFixed(1)}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={baselineDrift}
                        onChange={(e) => setBaselineDrift(parseFloat(e.target.value))}
                        className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 bg-canvas-soft-2 px-2.5 rounded text-xs font-mono">
                    <label className="cursor-pointer select-none" htmlFor="smudge-check">Pencil graphite Smudges</label>
                    <input
                      id="smudge-check"
                      type="checkbox"
                      checked={smudge}
                      onChange={(e) => setSmudge(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-body mb-1">Consistency Seed</label>
                      <input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                        className="input-field h-8 text-xs bg-canvas font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={() => setSeed(Math.floor(Math.random() * 99999))}
                        className="btn-secondary h-8 text-xs w-full font-mono cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <RefreshCw size={11} />
                        <span>Reseed</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'header' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase text-body mb-1">Page Header Text</label>
                    <input
                      type="text"
                      value={pageHeader}
                      onChange={(e) => setPageHeader(e.target.value)}
                      placeholder="e.g. Name: _______ Date: _______"
                      className="input-field text-xs bg-canvas"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase text-body mb-1">Page Footer Text</label>
                    <input
                      type="text"
                      value={pageFooter}
                      onChange={(e) => setPageFooter(e.target.value)}
                      placeholder="e.g. Page {page} of {pages}"
                      className="input-field text-xs bg-canvas"
                    />
                  </div>

                  <div className="border-t border-hairline pt-4">
                    <span className="block text-[10px] font-mono font-bold uppercase text-mute mb-3">Margin & Line Options</span>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 px-3 bg-canvas-soft-2 rounded">
                        <label className="text-xs font-mono text-body cursor-pointer select-none">Paper Margin</label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-mute font-mono">{margins.left > 0 ? 'on' : 'off'}</span>
                          <input
                            type="checkbox"
                            checked={margins.left > 0}
                            onChange={(e) => {
                              const val = e.target.checked ? 60 : 0;
                              setMargins(m => ({ ...m, left: val }));
                            }}
                            className="w-4 h-4 accent-primary"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 px-3 bg-canvas-soft-2 rounded">
                        <label className="text-xs font-mono text-body cursor-pointer select-none">Paper Lines</label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-mute font-mono">{paperStyle !== 'plain' ? 'on' : 'off'}</span>
                          <input
                            type="checkbox"
                            checked={paperStyle !== 'plain'}
                            onChange={(e) => setPaperStyle(e.target.checked ? 'single-ruled' : 'plain')}
                            className="w-4 h-4 accent-primary"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-body mb-1">Upload Paper Image as Background</label>
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleBgUpload}
                          className="text-xs font-mono text-body"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-mono font-semibold uppercase text-mute mb-2">Page margins (px)</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span>Top Margin</span>
                      <input
                        type="number"
                        value={margins.top}
                        onChange={(e) => setMargins(m => ({ ...m, top: parseInt(e.target.value) || 0 }))}
                        className="input-field h-8 bg-canvas text-xs"
                      />
                    </div>
                    <div>
                      <span>Bottom Margin</span>
                      <input
                        type="number"
                        value={margins.bottom}
                        onChange={(e) => setMargins(m => ({ ...m, bottom: parseInt(e.target.value) || 0 }))}
                        className="input-field h-8 bg-canvas text-xs"
                      />
                    </div>
                    <div>
                      <span>Left Margin</span>
                      <input
                        type="number"
                        value={margins.left}
                        onChange={(e) => setMargins(m => ({ ...m, left: parseInt(e.target.value) || 0 }))}
                        className="input-field h-8 bg-canvas text-xs"
                      />
                    </div>
                    <div>
                      <span>Right Margin</span>
                      <input
                        type="number"
                        value={margins.right}
                        onChange={(e) => setMargins(m => ({ ...m, right: parseInt(e.target.value) || 0 }))}
                        className="input-field h-8 bg-canvas text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Column 3: Presets & Exporter */}
          <div className="border-t lg:border-t-0 lg:border-l border-hairline pt-6 lg:pt-0 lg:pl-8 space-y-6">
            
            {/* Presets block */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-primary flex items-center">
                <FolderOpen size={13} className="mr-1.5" />
                <span>presets & layout load</span>
              </h4>
              <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto">
                {Object.keys(presets).map(name => (
                  <div key={name} className="group flex items-center bg-canvas-soft-2 text-[10px] font-mono px-2 py-1 rounded">
                    <button 
                      onClick={() => applyPreset(presets[name])}
                      className="hover:text-primary mr-1 text-body font-medium cursor-pointer"
                    >
                      {name}
                    </button>
                    {!DEFAULT_PRESETS[name] && (
                      <button 
                        onClick={() => deletePreset(name)}
                        className="text-red-500 hover:text-red-700 ml-1 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-2">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Save layout as..."
                  className="input-field h-8 text-xs bg-canvas"
                />
                <button
                  onClick={savePreset}
                  disabled={!newPresetName.trim()}
                  className="p-1 border border-hairline bg-canvas hover:bg-canvas-soft text-body rounded disabled:opacity-40 cursor-pointer flex items-center justify-center shrink-0 w-8"
                  title="Save current configuration"
                >
                  <Save size={14} />
                </button>
              </div>
            </div>

            {/* Exporter Block */}
            <div className="border-t border-hairline pt-4 space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-primary flex items-center">
                <Download size={13} className="mr-1.5" />
                <span>export document</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span>DPI Quality</span>
                  <select
                    value={exportDpi}
                    onChange={(e) => setExportDpi(e.target.value)}
                    className="input-field h-8 text-xs bg-canvas mt-1"
                  >
                    <option value="1.0">Screen (1x)</option>
                    <option value="2.0">Medium (2x)</option>
                    <option value="3.0">Print 300DPI (3x)</option>
                  </select>
                </div>
                <div>
                  <span>PDF Format</span>
                  <select
                    value={exportPaper}
                    onChange={(e) => setExportPaper(e.target.value as any)}
                    className="input-field h-8 text-xs bg-canvas mt-1"
                  >
                    <option value="a4">A4 Page</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  disabled={pagesBuffers.length === 0}
                  onClick={handleDownloadImages}
                  className="btn-secondary text-xs w-full py-2 cursor-pointer font-mono font-medium disabled:opacity-30"
                >
                  ZIP (PNGs)
                </button>
                <button
                  disabled={pagesBuffers.length === 0}
                  onClick={handleDownloadPdf}
                  className="btn-primary text-xs w-full py-2 cursor-pointer font-mono font-medium disabled:opacity-30"
                >
                  PDF Document
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
