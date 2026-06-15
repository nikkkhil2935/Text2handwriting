import React, { useState, useEffect, useRef } from 'react';
import { 
  Undo2, Redo2, Download, RefreshCw, Save, FolderOpen, 
  Settings, Type, FileText, Sparkles, Sliders, Keyboard, 
  Info, Check, Moon, Sun, PanelLeftClose, PanelLeftOpen, Upload, Trash2 
} from 'lucide-react';
import katex from 'katex';
import * as htmlToImage from 'html-to-image';
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

interface CanvasElement {
  id: string;
  type: 'image' | 'formula' | 'table' | 'sketch';
  pageIndex: number;
  x: number; // percentage-based X coordinate
  y: number; // percentage-based Y coordinate
  width: number; // percentage-based width
  height: number; // percentage-based height
  dataUrl?: string; // image source URL
  strokes?: Array<{ x: number; y: number; type: 'start' | 'move' }>; // vector sketch paths
}

const drawTableToDataUrl = (
  rows: string[][],
  fontFamily: string,
  inkColor: string
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    const cellWidth = 120;
    const cellHeight = 40;
    const padding = 10;
    const totalWidth = cellWidth * rows[0].length + padding * 2;
    const totalHeight = cellHeight * rows.length + padding * 2;
    
    canvas.width = totalWidth * 2;
    canvas.height = totalHeight * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, totalWidth, totalHeight);

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = inkColor;
    
    const drawWobblyLine = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const segments = Math.max(5, Math.floor(length / 10));
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const px = x1 + dx * t;
        const py = y1 + dy * t;
        const wobble = (Math.random() - 0.5) * 1.2;
        if (dx === 0) {
          ctx.lineTo(px + wobble, py);
        } else {
          ctx.lineTo(px, py + wobble);
        }
      }
      ctx.stroke();
    };

    for (let r = 0; r <= rows.length; r++) {
      const y = padding + r * cellHeight;
      drawWobblyLine(padding, y, totalWidth - padding, y);
    }
    for (let c = 0; c <= rows[0].length; c++) {
      const x = padding + c * cellWidth;
      drawWobblyLine(x, padding, x, totalHeight - padding);
    }

    ctx.font = `14px "${fontFamily}", "Architects Daughter", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const text = rows[r][c] || '';
        const tx = padding + c * cellWidth + 10;
        const ty = padding + r * cellHeight + cellHeight / 2;
        ctx.fillText(text, tx, ty);
      }
    }

    resolve(canvas.toDataURL());
  });
};

const drawFormulaToDataUrl = async (
  latex: string,
  inkColor: string
): Promise<string> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-100';
  container.style.padding = '15px';
  container.style.background = 'transparent';
  container.style.color = inkColor;
  container.style.fontSize = '24px';
  container.style.display = 'inline-block';
  document.body.appendChild(container);

  try {
    katex.render(latex, container, {
      throwOnError: false,
      displayMode: true
    });
    
    await document.fonts.ready;
    // Wait for browser painting & font rendering
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    const dataUrl = await htmlToImage.toPng(container, {
      backgroundColor: 'transparent',
      style: {
        transform: 'scale(1)',
        color: inkColor
      }
    });

    document.body.removeChild(container);
    return dataUrl;
  } catch (err) {
    console.error('KaTeX rendering error', err);
    if (container.parentNode) document.body.removeChild(container);
    return '';
  }
};

const prepareElementsForWorker = async (elements: CanvasElement[]): Promise<any[]> => {
  return Promise.all(
    elements.map(async (el) => {
      if (el.type === 'sketch') {
        return {
          id: el.id,
          type: el.type,
          pageIndex: el.pageIndex,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          strokes: el.strokes
        };
      }
      
      if (!el.dataUrl) {
        return {
          id: el.id,
          type: el.type,
          pageIndex: el.pageIndex,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height
        };
      }

      try {
        const img = new Image();
        img.src = el.dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const bitmap = await createImageBitmap(img);
        return {
          id: el.id,
          type: el.type,
          pageIndex: el.pageIndex,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          bitmap
        };
      } catch (err) {
        console.error('Failed to create ImageBitmap for element', el.id, err);
        return {
          id: el.id,
          type: el.type,
          pageIndex: el.pageIndex,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height
        };
      }
    })
  );
};

export default function ConverterApp({ 
  defaultFont, 
  defaultPaper,
  isAssignmentMode = false
}: { 
  defaultFont?: string; 
  defaultPaper?: string; 
  isAssignmentMode?: boolean 
}) {
  // Config state
  const [text, setText] = useState(SAMPLE_TEXT);
  const [fontFamily, setFontFamily] = useState(defaultFont || 'Architects Daughter');
  const [paperStyle, setPaperStyle] = useState(defaultPaper || 'single-ruled');
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
  
  const [headerLeft, setHeaderLeft] = useState('Name: ____________');
  const [headerCenter, setHeaderCenter] = useState('');
  const [headerRight, setHeaderRight] = useState('Date: ________');
  const [footerLeft, setFooterLeft] = useState('');
  const [footerCenter, setFooterCenter] = useState('');
  const [footerRight, setFooterRight] = useState('Page {page} of {pages}');
  const [sameHeaderAllPages, setSameHeaderAllPages] = useState(true);

  // Assignment Header States
  const [isAssignmentHeaderEnabled, setIsAssignmentHeaderEnabled] = useState(isAssignmentMode);
  const [assignmentFields, setAssignmentFields] = useState<Array<{
    id: string;
    label: string;
    value: string;
    alignment: 'left' | 'right';
  }>>([
    { id: '1', label: 'Name', value: '', alignment: 'left' },
    { id: '2', label: 'Roll No', value: '', alignment: 'right' },
    { id: '3', label: 'Subject', value: '', alignment: 'left' },
    { id: '4', label: 'Class/Sec', value: '', alignment: 'right' },
    { id: '5', label: 'Date', value: (() => {
      const d = new Date();
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    })(), alignment: 'left' }
  ]);

  // Left Margin Padding State
  const [lineMarginPadding, setLineMarginPadding] = useState(15);
  
  // Custom paper background
  const [customBgBitmap, setCustomBgBitmap] = useState<ImageBitmap | null>(null);
  const [customBgName, setCustomBgName] = useState<string>('');

  // Exporter Config
  const [exportDpi, setExportDpi] = useState('1.0'); // 1.0 = screen, 2.0 = medium, 3.0 = 300dpi print
  const [exportPaper, setExportPaper] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [jpgQuality, setJpgQuality] = useState(0.9);

  // Layout toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<'fonts' | 'paper' | 'realism' | 'header' | 'insert'>('fonts');
  const [presets, setPresets] = useState<Record<string, Preset>>(DEFAULT_PRESETS);
  const [newPresetName, setNewPresetName] = useState('');

  // Canvas elements state
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Sketching mode state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentSketchStrokes, setCurrentSketchStrokes] = useState<Array<{ x: number; y: number; type: 'start' | 'move' }>>([]);
  
  // Formula dialog/input state
  const [latexInput, setLatexInput] = useState('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  
  // Table input state
  const [tableRowsInput, setTableRowsInput] = useState(3);
  const [tableColsInput, setTableColsInput] = useState(3);
  const [tableCells, setTableCells] = useState<string[][]>([
    ['Header 1', 'Header 2', 'Header 3'],
    ['Value A', 'Value B', 'Value C'],
    ['Value D', 'Value E', 'Value F']
  ]);

  // History state for undo/redo
  const [history, setHistory] = useState<string[]>([SAMPLE_TEXT]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Render output state
  const [pages, setPages] = useState<string[]>([]);
  const [pagesBuffers, setPagesBuffers] = useState<ArrayBuffer[]>([]);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [previewPageIdx, setPreviewPageIdx] = useState(0);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [editMode, setEditMode] = useState<'edit' | 'preview'>('edit');
  const [scale, setScale] = useState(1);

  const [customFonts, setCustomFonts] = useState<Array<{ name: string; family: string; buffer: ArrayBuffer }>>([]);

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9\s-]/g, "");
        
        // Register the font in the browser main thread
        const fontFace = new FontFace(fontName, buffer);
        const loadedFace = await fontFace.load();
        document.fonts.add(loadedFace);

        const newCustomFont = {
          name: fontName,
          family: fontName,
          buffer
        };

        setCustomFonts(prev => [...prev, newCustomFont]);
        setFontFamily(fontName);
        showToast(`Custom font loaded: ${fontName}`);
      } catch (err) {
        console.error('Failed to load custom font', err);
        showToast('Invalid font file', true);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Preload selected fonts programmatically to ensure instant render
  useEffect(() => {
    if (fontFamily) {
      document.fonts.load(`1em "${fontFamily}"`).then(() => {
        triggerRender();
      });
    }
  }, [fontFamily]);

  const workerRef = useRef<Worker | null>(null);
  const renderTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pagesRef = useRef<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTextAtCursor = (insertedText: string) => {
    const el = textareaRef.current;
    if (!el) {
      handleTextChange(text + insertedText);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = text.substring(0, start) + insertedText + text.substring(end);
    handleTextChange(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + insertedText.length, start + insertedText.length);
    }, 0);
  };

  const handleToggleFormat = (tag: '**' | '*' | '__') => {
    const el = textareaRef.current;
    if (!el) {
      if (tag === '**') setIsBold(!isBold);
      if (tag === '*') setIsItalic(!isItalic);
      if (tag === '__') setIsUnderline(!isUnderline);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selText = text.substring(start, end);
    if (start !== end) {
      let newText;
      if (selText.startsWith(tag) && selText.endsWith(tag)) {
        newText = text.substring(0, start) + selText.slice(tag.length, -tag.length) + text.substring(end);
      } else {
        newText = text.substring(0, start) + tag + selText + tag + text.substring(end);
      }
      handleTextChange(newText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start, start + newText.length - text.length + (end - start));
      }, 0);
    } else {
      const newText = text.substring(0, start) + tag + tag + text.substring(end);
      handleTextChange(newText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    }
  };

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

    renderTimeoutRef.current = window.setTimeout(async () => {
      const font = FONTS.find(f => f.family === fontFamily);
      const fontName = fontFamily;
      const fontUrl = font ? font.path : '';
      
      let paperWidth = 800;
      let paperHeight = 1130;
      if (exportPaper === 'letter') {
        paperHeight = 1035;
      } else if (exportPaper === 'legal') {
        paperHeight = 1318;
      }

      // Prepare overlay elements for worker
      const workerElements = await prepareElementsForWorker(canvasElements);

      const payload = {
        text,
        fontName,
        fontUrl,
        customFonts: customFonts.map(cf => ({ name: cf.name, buffer: cf.buffer })),
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
        headerLeft,
        headerCenter,
        headerRight,
        footerLeft,
        footerCenter,
        footerRight,
        sameHeaderAllPages,
        isAssignmentHeaderEnabled,
        assignmentFields,
        lineMarginPadding,
        backgroundImageBitmap: customBgBitmap,
        dpiMultiplier: 1.0, // Render on screen at 1x
        paperWidth,
        paperHeight,
        elements: workerElements,
        isBold,
        isItalic,
        isUnderline
      };

      const transferList: Transferable[] = [];
      workerElements.forEach(el => {
        if (el.bitmap) {
          transferList.push(el.bitmap);
        }
      });

      workerRef.current?.postMessage(payload, transferList);
    }, 250);
  };

  // Re-run render when parameters change
  useEffect(() => {
    triggerRender();
  }, [
    text, fontFamily, paperStyle, gridSize, inkColor, inkType, fontSize, lineHeight,
    wordSpacing, letterSpacing, alignment, margins, messiness, rotation, vJitter,
    hJitter, baselineDrift, pressureVariation, smudge, seed, headerLeft, headerCenter, headerRight, footerLeft, footerCenter, footerRight, sameHeaderAllPages,
    isAssignmentHeaderEnabled, assignmentFields, lineMarginPadding,
    customBgBitmap, exportPaper, canvasElements, isBold, isItalic, isUnderline, customFonts
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

  const [customBgUrl, setCustomBgUrl] = useState<string>('');

  // Custom paper file upload
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const bitmap = await createImageBitmap(file);
      setCustomBgBitmap(bitmap);
      if (customBgUrl) URL.revokeObjectURL(customBgUrl);
      setCustomBgUrl(URL.createObjectURL(file));
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
    return new Promise(async (resolve, reject) => {
      const exportWorker = new Worker('/workers/render.worker.js');
      const font = FONTS.find(f => f.family === fontFamily);
      const fontName = fontFamily;
      const fontUrl = font ? font.path : '';
      
      let paperWidth = 800;
      let paperHeight = 1130;
      if (exportPaper === 'letter') {
        paperHeight = 1035;
      } else if (exportPaper === 'legal') {
        paperHeight = 1318;
      }

      // Prepare overlay elements for worker
      const workerElements = await prepareElementsForWorker(canvasElements);

      exportWorker.onmessage = (e) => {
        const { type, pages: buffers, message } = e.data;
        exportWorker.terminate();
        if (type === 'success') {
          resolve(buffers);
        } else {
          reject(new Error(message || 'Failed render'));
        }
      };

      const transferList: Transferable[] = [];
      workerElements.forEach(el => {
        if (el.bitmap) {
          transferList.push(el.bitmap);
        }
      });

      exportWorker.postMessage({
        text,
        fontName,
        fontUrl,
        customFonts: customFonts.map(cf => ({ name: cf.name, buffer: cf.buffer })),
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
        headerLeft,
        headerCenter,
        headerRight,
        footerLeft,
        footerCenter,
        footerRight,
        sameHeaderAllPages,
        isAssignmentHeaderEnabled,
        assignmentFields,
        lineMarginPadding,
        backgroundImageBitmap: customBgBitmap,
        dpiMultiplier: dpi,
        paperWidth,
        paperHeight,
        elements: workerElements,
        isBold,
        isItalic,
        isUnderline
      }, transferList);
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

  const handleDragStart = (e: React.MouseEvent, el: CanvasElement) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElementId(el.id);
    
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startElX = el.x;
    const startElY = el.y;

    const container = document.getElementById('preview-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = ((moveEvent.clientX - startMouseX) / containerWidth) * 100;
      const deltaY = ((moveEvent.clientY - startMouseY) / containerHeight) * 100;

      const newX = Math.max(0, Math.min(100 - el.width, startElX + deltaX));
      const newY = Math.max(0, Math.min(100 - el.height, startElY + deltaY));

      setCanvasElements(prev => prev.map(item => item.id === el.id ? { ...item, x: newX, y: newY } : item));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent, el: CanvasElement) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElementId(el.id);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startElWidth = el.width;
    const startElHeight = el.height;

    const container = document.getElementById('preview-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaWidth = ((moveEvent.clientX - startMouseX) / containerWidth) * 100;
      const deltaHeight = ((moveEvent.clientY - startMouseY) / containerHeight) * 100;

      const newWidth = Math.max(5, Math.min(100 - el.x, startElWidth + deltaWidth));
      const newHeight = Math.max(5, Math.min(100 - el.y, startElHeight + deltaHeight));

      setCanvasElements(prev => prev.map(item => item.id === el.id ? { ...item, width: newWidth, height: newHeight } : item));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getCoordinatesFromEvent = (clientX: number, clientY: number) => {
    const container = document.getElementById('preview-container');
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };
  };

  const handleSketchStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getCoordinatesFromEvent(e.clientX, e.clientY);
    setCurrentSketchStrokes([{ x: coords.x, y: coords.y, type: 'start' }]);
  };

  const handleSketchMove = (e: React.MouseEvent) => {
    if (currentSketchStrokes.length === 0) return;
    const coords = getCoordinatesFromEvent(e.clientX, e.clientY);
    setCurrentSketchStrokes(prev => [...prev, { x: coords.x, y: coords.y, type: 'move' }]);
  };

  const handleSketchEnd = () => {
    if (currentSketchStrokes.length === 0) return;
    
    const newElement: CanvasElement = {
      id: String(Date.now()),
      type: 'sketch',
      pageIndex: previewPageIdx,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      strokes: currentSketchStrokes
    };
    
    setCanvasElements(prev => [...prev, newElement]);
    setCurrentSketchStrokes([]);
  };

  const handleSketchTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const coords = getCoordinatesFromEvent(touch.clientX, touch.clientY);
    setCurrentSketchStrokes([{ x: coords.x, y: coords.y, type: 'start' }]);
  };

  const handleSketchTouchMove = (e: React.TouchEvent) => {
    if (currentSketchStrokes.length === 0) return;
    const touch = e.touches[0];
    const coords = getCoordinatesFromEvent(touch.clientX, touch.clientY);
    setCurrentSketchStrokes(prev => [...prev, { x: coords.x, y: coords.y, type: 'move' }]);
  };

  const handleSketchTouchEnd = () => {
    handleSketchEnd();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newElement: CanvasElement = {
        id: String(Date.now()),
        type: 'image',
        pageIndex: previewPageIdx,
        x: 20,
        y: 20,
        width: 30,
        height: 20,
        dataUrl
      };
      setCanvasElements(prev => [...prev, newElement]);
      showToast('Image inserted!');
    };
    reader.readAsDataURL(file);
  };

  // Measure preview container scale relative to 800px design width
  useEffect(() => {
    const container = document.getElementById('preview-container');
    if (!container) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / 800);
      }
    });
    observer.observe(container);
    
    // Initial measurement
    setScale(container.getBoundingClientRect().width / 800);
    
    return () => observer.disconnect();
  }, [editMode, paperStyle]);

  const getPaperBackgroundStyle = (): React.CSSProperties => {
    if (paperStyle === 'plain') {
      return { backgroundColor: '#ffffff' };
    }
    
    const scaledGridSize = gridSize * scale;
    const scaledLeftMargin = margins.left * scale;
    const scaledTopMargin = margins.top * scale;
    
    if (paperStyle === 'single-ruled' || paperStyle === 'a4-notebook') {
      return {
        backgroundColor: '#ffffff',
        backgroundImage: `
          linear-gradient(to right, transparent ${scaledLeftMargin - 1}px, #ff8a8a ${scaledLeftMargin - 1}px, #ff8a8a ${scaledLeftMargin + 1}px, transparent ${scaledLeftMargin + 1}px),
          repeating-linear-gradient(transparent, transparent ${scaledGridSize - 1}px, #e5e7eb ${scaledGridSize - 1}px, #e5e7eb ${scaledGridSize}px)
        `,
        backgroundSize: `100% 100%, 100% ${scaledGridSize}px`,
        backgroundPosition: `0 0, 0 ${scaledTopMargin}px`
      };
    }
    
    if (paperStyle === 'legal') {
      return {
        backgroundColor: '#fdfbbe',
        backgroundImage: `
          linear-gradient(to right, transparent ${scaledLeftMargin - 3}px, #ff8a8a ${scaledLeftMargin - 3}px, #ff8a8a ${scaledLeftMargin - 1}px, transparent ${scaledLeftMargin - 1}px, transparent ${scaledLeftMargin + 1}px, #ff8a8a ${scaledLeftMargin + 1}px, #ff8a8a ${scaledLeftMargin + 3}px, transparent ${scaledLeftMargin + 3}px),
          repeating-linear-gradient(transparent, transparent ${scaledGridSize - 1}px, #cbd5e1 ${scaledGridSize - 1}px, #cbd5e1 ${scaledGridSize}px)
        `,
        backgroundSize: `100% 100%, 100% ${scaledGridSize}px`,
        backgroundPosition: `0 0, 0 ${scaledTopMargin}px`
      };
    }
    
    if (paperStyle === 'double-ruled') {
      const innerStep = scaledGridSize * 0.35;
      return {
        backgroundColor: '#ffffff',
        backgroundImage: `
          linear-gradient(to right, transparent ${scaledLeftMargin - 1}px, #ff8a8a ${scaledLeftMargin - 1}px, #ff8a8a ${scaledLeftMargin + 1}px, transparent ${scaledLeftMargin + 1}px),
          repeating-linear-gradient(
            transparent, 
            transparent 0px, 
            #b8cce8 0px, #b8cce8 1px, 
            transparent 1px, transparent ${innerStep}px, 
            #aaaaaa ${innerStep}px, #aaaaaa ${innerStep + 1}px, 
            transparent ${innerStep + 1}px, transparent ${innerStep * 2}px, 
            #b8cce8 ${innerStep * 2}px, #b8cce8 ${innerStep * 2 + 1}px, 
            transparent ${innerStep * 2 + 1}px, transparent ${scaledGridSize}px
          )
        `,
        backgroundSize: `100% 100%, 100% ${scaledGridSize}px`,
        backgroundPosition: `0 0, 0 ${scaledTopMargin}px`
      };
    }
    
    if (paperStyle === 'graph') {
      return {
        backgroundColor: '#ffffff',
        backgroundImage: `
          repeating-linear-gradient(transparent, transparent ${scaledGridSize - 1}px, #e2e8f0 ${scaledGridSize - 1}px, #e2e8f0 ${scaledGridSize}px),
          repeating-linear-gradient(to right, transparent, transparent ${scaledGridSize - 1}px, #e2e8f0 ${scaledGridSize - 1}px, #e2e8f0 ${scaledGridSize}px)
        `,
        backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`
      };
    }
    
    if (paperStyle === 'dot-grid') {
      return {
        backgroundColor: '#ffffff',
        backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
        backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`
      };
    }

    if (paperStyle === 'custom' && customBgUrl) {
      return {
        backgroundImage: `url(${customBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#ffffff'
      };
    }

    return { backgroundColor: '#ffffff' };
  };

  const renderElementsOverlay = (isInteractive: boolean) => {
    return canvasElements
      .filter(el => el.pageIndex === previewPageIdx && el.type !== 'sketch')
      .map(el => (
        <div
          key={el.id}
          onClick={(e) => {
            if (!isInteractive) return;
            e.stopPropagation();
            setSelectedElementId(el.id);
          }}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.width}%`,
            height: `${el.height}%`,
            border: selectedElementId === el.id 
              ? '1.5px dashed #0070f3' 
              : isInteractive ? '1.5px dashed #cbd5e1' : 'none',
            backgroundColor: isInteractive ? 'rgba(255, 255, 255, 0.75)' : 'transparent',
            pointerEvents: isInteractive ? 'auto' : 'none',
            zIndex: 10
          }}
          className="group"
        >
          {el.type === 'image' && el.dataUrl && (
            <img src={el.dataUrl} className="w-full h-full object-contain pointer-events-none" />
          )}
          {el.type === 'formula' && el.dataUrl && (
            <img src={el.dataUrl} className="w-full h-full object-contain pointer-events-none" />
          )}
          {el.type === 'table' && el.dataUrl && (
            <img src={el.dataUrl} className="w-full h-full object-contain pointer-events-none" />
          )}
          
          {isInteractive && (
            <>
              {/* Drag Handle (top/center bar) */}
              <div
                className="absolute -top-1 left-4 right-4 h-2 bg-transparent cursor-move group-hover:bg-primary/20 rounded transition-colors"
                onMouseDown={(e) => handleDragStart(e, el)}
                title="Drag Element"
              />

              {/* Resize Handle (bottom right corner) */}
              <div
                className="absolute right-0 bottom-0 w-3 h-3 bg-link border border-white cursor-se-resize rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseDown={(e) => handleResizeStart(e, el)}
                title="Resize Element"
              />

              {/* Delete Handle (top right corner) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCanvasElements(canvasElements.filter(item => item.id !== el.id));
                  setSelectedElementId(null);
                }}
                className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer font-bold"
                title="Delete Element"
              >
                ×
              </button>
            </>
          )}
        </div>
      ));
  };

  return (
    <div className="w-full flex flex-col gap-4 relative min-h-[calc(100vh-100px)]">
      
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

      {/* Modern Formatting Toolbar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 p-3 bg-canvas border border-hairline rounded-lg shadow-sm font-mono text-xs">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Select Handwriting Font */}
          <div className="flex flex-col">
            <span className="text-[10px] text-mute font-bold uppercase mb-1">Handwriting Style</span>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="input-field h-8 bg-canvas text-xs font-mono py-1 px-2 border border-hairline rounded-md outline-none cursor-pointer"
            >
              <optgroup label="Standard Fonts">
                {FONTS.map(font => (
                  <option key={font.name} value={font.family}>
                    {font.family} ({font.category})
                  </option>
                ))}
              </optgroup>
              {customFonts.length > 0 && (
                <optgroup label="Custom Fonts">
                  {customFonts.map(cf => (
                    <option key={cf.name} value={cf.family}>
                      {cf.family} (custom)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Text Formatting Toolbar */}
          <div className="flex flex-col">
            <span className="text-[10px] text-mute font-bold uppercase mb-1">Format</span>
            <div className="flex items-center border border-hairline rounded-md h-8 bg-canvas overflow-hidden">
              <button
                onClick={() => handleToggleFormat('**')}
                className={`px-3 h-full font-bold border-r border-hairline transition-colors cursor-pointer ${isBold ? 'bg-primary text-on-primary' : 'hover:bg-canvas-soft text-body'}`}
                title="Toggle Bold Handwriting"
              >
                B
              </button>
              <button
                onClick={() => handleToggleFormat('*')}
                className={`px-3 h-full italic border-r border-hairline transition-colors cursor-pointer ${isItalic ? 'bg-primary text-on-primary' : 'hover:bg-canvas-soft text-body'}`}
                title="Toggle Italic (Slant)"
              >
                I
              </button>
              <button
                onClick={() => handleToggleFormat('__')}
                className={`px-3 h-full underline transition-colors cursor-pointer ${isUnderline ? 'bg-primary text-on-primary' : 'hover:bg-canvas-soft text-body'}`}
                title="Toggle Underline"
              >
                U
              </button>
            </div>
          </div>

          {/* Ruled Paper Style */}
          <div className="flex flex-col">
            <span className="text-[10px] text-mute font-bold uppercase mb-1">Paper Lines</span>
            <select
              value={paperStyle}
              onChange={(e) => setPaperStyle(e.target.value)}
              className="input-field h-8 bg-canvas text-xs py-1 px-2 border border-hairline rounded-md outline-none cursor-pointer"
            >
              <option value="plain">Plain White</option>
              <option value="single-ruled">Single Ruled</option>
              <option value="double-ruled">Double Ruled</option>
              <option value="a4-notebook">A4 Notebook</option>
              <option value="legal">Yellow Legal Pad</option>
              <option value="graph">Graph Grid</option>
              <option value="dot-grid">Dot Grid</option>
              <option value="custom">Custom Background</option>
            </select>
          </div>

          {/* Ink Color */}
          <div className="flex flex-col">
            <span className="text-[10px] text-mute font-bold uppercase mb-1">Ink Color</span>
            <div className="flex items-center gap-1.5 h-8 px-2 border border-hairline rounded-md bg-canvas">
              {['#0000ff', '#1c1917', '#dc2626'].map(color => (
                <button
                  key={color}
                  onClick={() => setInkColor(color)}
                  className="w-4 h-4 rounded-full border border-hairline cursor-pointer relative flex items-center justify-center shrink-0"
                  style={{ backgroundColor: color }}
                  title={color === '#0000ff' ? 'Blue Ink' : color === '#1c1917' ? 'Black Ink' : 'Red Ink'}
                >
                  {inkColor === color && (
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                  )}
                </button>
              ))}
              <input
                type="color"
                value={inkColor}
                onChange={(e) => setInkColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border border-hairline p-0 bg-transparent shrink-0"
                title="Custom Ink Color"
              />
            </div>
          </div>

          {/* Font Size */}
          <div className="flex flex-col">
            <span className="text-[10px] text-mute font-bold uppercase mb-1">Size ({fontSize}px)</span>
            <div className="flex items-center gap-2 h-8">
              <input
                type="range"
                min="14"
                max="40"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-20 md:w-28 accent-primary bg-hairline h-1 rounded-lg cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-mute font-bold uppercase mb-1">View Mode</span>
          <div className="flex items-center bg-canvas-soft-2 p-0.5 rounded-md border border-hairline h-8 text-[11px]">
            <button
              onClick={() => setEditMode('edit')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${editMode === 'edit' && activePanel !== 'insert' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Edit Paper
            </button>
            <button
              onClick={() => {
                setEditMode('preview');
                triggerRender();
              }}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${editMode === 'preview' && activePanel !== 'insert' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Realism Preview
            </button>
            <button
              onClick={() => {
                setEditMode('preview');
                setActivePanel('insert');
                triggerRender();
              }}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${editMode === 'preview' && activePanel === 'insert' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Insert Elements
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
        
        {/* Left Column: Interactive A4 Paper (65%) */}
        <div className="w-full lg:w-[65%] flex flex-col items-center justify-start py-4 bg-canvas-soft border border-hairline rounded-lg shadow-sm min-h-[500px]">
          
          {/* A4 Bounding Sheet Container */}
          <div 
            id="preview-container" 
            className="relative w-full max-w-[480px] aspect-[800/1130] bg-white rounded border border-hairline shadow-md overflow-hidden select-none"
          >
            {editMode === 'edit' ? (
              /* Inline Editable Textarea styled exactly like ruled notebook paper */
              <div className="relative w-full h-full">
                {/* Overlay standard headers if not assignment header */}
                {!isAssignmentHeaderEnabled && (headerLeft || headerCenter || headerRight) && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${margins.top * scale}px`,
                      paddingLeft: `${margins.left * scale}px`,
                      paddingRight: `${margins.right * scale}px`,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'flex-end',
                      paddingBottom: `${fontSize * 0.4 * scale}px`,
                      fontFamily: `"${fontFamily}", "Architects Daughter", sans-serif`,
                      fontSize: `${fontSize * 0.7 * scale}px`,
                      color: inkColor,
                      opacity: 0.8,
                      zIndex: 15
                    }}
                    className="select-none font-mono"
                  >
                    <div className="w-1/3 text-left truncate">{headerLeft}</div>
                    <div className="w-1/3 text-center truncate">{headerCenter}</div>
                    <div className="w-1/3 text-right truncate">{headerRight}</div>
                  </div>
                )}

                {/* Overlay Assignment Header */}
                {isAssignmentHeaderEnabled && assignmentFields && assignmentFields.length > 0 && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: `${margins.top * scale}px`,
                      left: 0,
                      width: '100%',
                      height: `${(Math.max(
                        assignmentFields.filter(f => f.alignment === 'left').length,
                        assignmentFields.filter(f => f.alignment === 'right').length
                      ) + 1) * gridSize * scale}px`,
                      paddingLeft: `${(margins.left + lineMarginPadding) * scale}px`,
                      paddingRight: `${margins.right * scale}px`,
                      pointerEvents: 'none',
                      fontFamily: `"${fontFamily}", "Architects Daughter", sans-serif`,
                      fontSize: `${fontSize * 0.95 * scale}px`,
                      color: inkColor,
                      opacity: 0.9,
                      zIndex: 15,
                      display: 'flex',
                      flexDirection: 'column',
                      paddingBottom: `${8 * scale}px`
                    }}
                    className="select-none font-mono"
                  >
                    {/* Render fields row by row */}
                    {(() => {
                      const leftFields = assignmentFields.filter(f => f.alignment === 'left');
                      const rightFields = assignmentFields.filter(f => f.alignment === 'right');
                      const maxRows = Math.max(leftFields.length, rightFields.length);
                      const rows = [];
                      for (let r = 0; r < maxRows; r++) {
                        rows.push(
                          <div 
                            key={r} 
                            className="flex justify-between" 
                            style={{ height: `${gridSize * scale}px`, lineHeight: `${gridSize * scale}px` }}
                          >
                            <span className="truncate">
                              {leftFields[r] ? `${leftFields[r].label}: ${leftFields[r].value || '____________________'}` : ''}
                            </span>
                            <span className="truncate pr-4 text-right">
                              {rightFields[r] ? `${rightFields[r].label}: ${rightFields[r].value || '_________'}` : ''}
                            </span>
                          </div>
                        );
                      }
                      return rows;
                    })()}

                    {/* Divider Line on the last ruled line */}
                    <div 
                      className="absolute left-0 right-0 border-t-2 border-double border-[#ff8a8a]" 
                      style={{ 
                        top: `${Math.max(
                          assignmentFields.filter(f => f.alignment === 'left').length,
                          assignmentFields.filter(f => f.alignment === 'right').length
                        ) * gridSize * scale}px`,
                        left: `${margins.left * scale}px`,
                        right: `${margins.right * scale}px`
                      }} 
                    />
                  </div>
                )}

                {/* Overlay Footers */}
                {(footerLeft || footerCenter || footerRight) && (
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height: `${margins.bottom * scale}px`,
                      paddingLeft: `${margins.left * scale}px`,
                      paddingRight: `${margins.right * scale}px`,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      paddingTop: `${fontSize * 0.4 * scale}px`,
                      fontFamily: `"${fontFamily}", "Architects Daughter", sans-serif`,
                      fontSize: `${fontSize * 0.7 * scale}px`,
                      color: inkColor,
                      opacity: 0.8,
                      zIndex: 15
                    }}
                    className="select-none font-mono"
                  >
                    <div className="w-1/3 text-left truncate">{footerLeft.replace(/{page}/g, '1').replace(/{pages}/g, '1')}</div>
                    <div className="w-1/3 text-center truncate">{footerCenter.replace(/{page}/g, '1').replace(/{pages}/g, '1')}</div>
                    <div className="w-1/3 text-right truncate">{footerRight.replace(/{page}/g, '1').replace(/{pages}/g, '1')}</div>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Type or paste your text directly on the page. All edits are saved instantly..."
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    paddingTop: `${(margins.top + (isAssignmentHeaderEnabled ? (Math.max(
                      assignmentFields.filter(f => f.alignment === 'left').length,
                      assignmentFields.filter(f => f.alignment === 'right').length
                    ) + 1) * (gridSize || 30) : 0)) * scale}px`,
                    paddingBottom: `${margins.bottom * scale}px`,
                    paddingLeft: `${(margins.left + lineMarginPadding) * scale}px`,
                    paddingRight: `${margins.right * scale}px`,
                    fontSize: `${fontSize * scale}px`,
                    lineHeight: paperStyle === 'plain'
                      ? `${fontSize * lineHeight * scale}px`
                      : `${gridSize * scale}px`,
                    color: inkColor,
                    fontFamily: `"${fontFamily}", "Architects Daughter", sans-serif`,
                    textAlign: alignment as any,
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    letterSpacing: `${letterSpacing * scale}px`,
                    wordSpacing: `${wordSpacing * scale}px`,
                    fontWeight: isBold ? 'bold' : 'normal',
                    fontStyle: isItalic ? 'italic' : 'normal',
                    textDecoration: isUnderline ? 'underline' : 'none',
                    backgroundAttachment: 'local',
                    overflowY: 'auto',
                    ...getPaperBackgroundStyle()
                  }}
                  className="select-text focus:outline-none placeholder:text-gray-300 transition-colors"
                />
                <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                  {renderElementsOverlay(true)}
                </div>
              </div>
            ) : (
              /* Realistic handwriting preview from worker */
              <div className="relative w-full h-full">
                {rendering && pages.length === 0 ? (
                  <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center space-y-3">
                    <RefreshCw size={24} className="animate-spin text-mute" />
                    <span className="text-[10px] text-mute font-mono tracking-widest uppercase">RENDERING REALISM ENGINE...</span>
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center text-xs text-red-500 font-mono">
                    <Info size={20} className="mb-2" />
                    <span>{error}</span>
                  </div>
                ) : pages.length > 0 ? (
                  <div className="relative w-full h-full">
                    <img
                      src={pages[previewPageIdx]}
                      alt={`Handwritten page ${previewPageIdx + 1}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                    
                    {/* Elements Overlay Layer (draggable/resizable on top of the preview) */}
                    <div className="absolute inset-0 top-0 left-0 w-full h-full pointer-events-auto">
                      {canvasElements
                        .filter(el => el.pageIndex === previewPageIdx)
                        .map(el => (
                          <div
                            key={el.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElementId(el.id);
                            }}
                            style={{
                              position: 'absolute',
                              left: `${el.x}%`,
                              top: `${el.y}%`,
                              width: `${el.width}%`,
                              height: `${el.height}%`,
                              border: selectedElementId === el.id ? '1.5px dashed #0070f3' : '1px dashed transparent'
                            }}
                            className="group hover:border-hairline-strong pointer-events-auto"
                          >
                            {/* Render content */}
                            {el.type === 'image' && el.dataUrl && (
                              <img src={el.dataUrl} className="w-full h-full object-contain pointer-events-none" />
                            )}
                            {el.type === 'formula' && el.dataUrl && (
                              <img src={el.dataUrl} className="w-full h-full object-contain pointer-events-none" />
                            )}
                            {el.type === 'table' && el.dataUrl && (
                              <img src={el.dataUrl} className="w-full h-full object-contain pointer-events-none" />
                            )}
                            
                            {/* Drag Handle (top/center bar) */}
                            <div
                              className="absolute -top-1 left-4 right-4 h-2 bg-transparent cursor-move group-hover:bg-primary/20 rounded transition-colors"
                              onMouseDown={(e) => handleDragStart(e, el)}
                              title="Drag Element"
                            />

                            {/* Resize Handle (bottom right corner) */}
                            <div
                              className="absolute right-0 bottom-0 w-3 h-3 bg-link border border-white cursor-se-resize rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => handleResizeStart(e, el)}
                              title="Resize Element"
                            />

                            {/* Delete Handle (top right corner) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCanvasElements(canvasElements.filter(item => item.id !== el.id));
                                setSelectedElementId(null);
                              }}
                              className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer font-bold"
                              title="Delete Element"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      }
                      
                      {/* Drawing Canvas Overlays */}
                      {isDrawingMode && (
                        <div
                          className="absolute inset-0 bg-transparent cursor-crosshair pointer-events-auto touch-none"
                          onMouseDown={handleSketchStart}
                          onMouseMove={handleSketchMove}
                          onMouseUp={handleSketchEnd}
                          onTouchStart={handleSketchTouchStart}
                          onTouchMove={handleSketchTouchMove}
                          onTouchEnd={handleSketchTouchEnd}
                        >
                          <svg className="w-full h-full pointer-events-none">
                            {canvasElements
                              .filter(el => el.pageIndex === previewPageIdx && el.type === 'sketch')
                              .map(el => {
                                let pathData = '';
                                el.strokes?.forEach((pt) => {
                                  if (pt.type === 'start') {
                                    pathData += ` M ${pt.x}% ${pt.y}%`;
                                  } else {
                                    pathData += ` L ${pt.x}% ${pt.y}%`;
                                  }
                                });
                                return (
                                  <path
                                    key={el.id}
                                    d={pathData}
                                    fill="none"
                                    stroke={inkColor}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity="0.9"
                                  />
                                );
                              })
                            }
                            {currentSketchStrokes.length > 0 && (
                              <path
                                  d={currentSketchStrokes.reduce((acc, pt) => {
                                    if (pt.type === 'start') {
                                      return `${acc} M ${pt.x}% ${pt.y}%`;
                                    } else {
                                      return `${acc} L ${pt.x}% ${pt.y}%`;
                                    }
                                  }, '')}
                                  fill="none"
                                  stroke={inkColor}
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  opacity="0.9"
                                />
                              )}
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-mute font-mono text-xs">
                    <span>Click "Generate Image" to render the realism effects.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Trigger Buttons & Page Indicators */}
          <div className="flex flex-col items-center gap-3 mt-4 w-full px-8">
            
            {/* Generate Image Button */}
            <div className="flex gap-2 w-full max-w-[480px]">
              <button
                onClick={() => {
                  setEditMode('preview');
                  triggerRender();
                  showToast('Realism rendering triggered!');
                }}
                className="btn-primary w-full py-2.5 rounded-full font-mono text-xs font-bold uppercase tracking-wider cursor-pointer shadow flex items-center justify-center gap-1.5"
              >
                <Sparkles size={13} />
                <span>Generate Realistic Image</span>
              </button>
            </div>

            {/* Pagination Controls */}
            {pages.length > 1 && (
              <div className="flex items-center space-x-4 text-xs font-mono bg-canvas border border-hairline px-4 py-1.5 rounded-full shadow-sm mt-1">
                <button
                  disabled={previewPageIdx === 0}
                  onClick={() => setPreviewPageIdx(p => Math.max(0, p - 1))}
                  className="font-semibold disabled:opacity-30 cursor-pointer text-primary"
                  title="Previous Page"
                >
                  ◀ Prev
                </button>
                <span className="text-body font-medium select-none">
                  Page {previewPageIdx + 1} of {pages.length}
                </span>
                <button
                  disabled={previewPageIdx >= pages.length - 1}
                  onClick={() => setPreviewPageIdx(p => Math.min(pages.length - 1, p + 1))}
                  className="font-semibold disabled:opacity-30 cursor-pointer text-primary"
                  title="Next Page"
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Advanced Customization Sidebar (35%) */}
        <div className="w-full lg:w-[35%] flex flex-col border border-hairline bg-canvas rounded-lg p-5 shadow-sm min-h-[500px]">
          
          {/* Sidebar tabs */}
          <div className="grid grid-cols-5 gap-1 bg-canvas-soft-2 p-1 rounded-md text-[10px] font-mono mb-4 text-center">
            <button 
              onClick={() => setActivePanel('fonts')}
              className={`py-1.5 rounded transition-all cursor-pointer ${activePanel === 'fonts' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Layout
            </button>
            <button 
              onClick={() => setActivePanel('realism')}
              className={`py-1.5 rounded transition-all cursor-pointer ${activePanel === 'realism' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Realism
            </button>
            <button 
              onClick={() => setActivePanel('header')}
              className={`py-1.5 rounded transition-all cursor-pointer ${activePanel === 'header' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Headers
            </button>
            <button 
              onClick={() => setActivePanel('insert')}
              className={`py-1.5 rounded transition-all cursor-pointer ${activePanel === 'insert' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Insert
            </button>
            <button 
              onClick={() => setActivePanel('paper')}
              className={`py-1.5 rounded transition-all cursor-pointer ${activePanel === 'paper' ? 'bg-canvas text-primary font-semibold shadow-sm' : 'text-mute hover:text-body'}`}
            >
              Presets
            </button>
          </div>

          {/* Active Sidebar Panels */}
          <div className="flex-grow overflow-y-auto space-y-6 text-xs text-body">
            
            {/* Panel: Layout & Margins */}
            {activePanel === 'fonts' && (
              <div className="space-y-4">
                <h3 className="font-mono font-bold uppercase text-primary border-b border-hairline pb-1 text-[10px]">Layout & Spacing</h3>
                
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div>
                    <span>Word Spacing</span>
                    <input
                      type="range"
                      min="-5"
                      max="15"
                      value={wordSpacing}
                      onChange={(e) => setWordSpacing(parseInt(e.target.value))}
                      className="w-full accent-primary h-1 bg-hairline rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <span>Letter Spacing</span>
                    <input
                      type="range"
                      min="-5"
                      max="10"
                      value={letterSpacing}
                      onChange={(e) => setLetterSpacing(parseInt(e.target.value))}
                      className="w-full accent-primary h-1 bg-hairline rounded-lg mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-2 font-mono">
                  <div className="flex justify-between">
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
                    className="w-full accent-primary h-1 bg-hairline rounded-lg mt-1"
                  />
                </div>

                <div className="space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span>Rule Grid Line size</span>
                    <span>{gridSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="60"
                    value={gridSize}
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                    className="w-full accent-primary h-1 bg-hairline rounded-lg mt-1"
                  />
                </div>

                <div className="space-y-2 font-mono">
                  <span>Text Alignment</span>
                  <div className="grid grid-cols-3 gap-1 bg-canvas-soft-2 p-0.5 rounded text-[10px] mt-1">
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

                <div className="border-t border-hairline pt-3 space-y-2 font-mono">
                  <span className="block font-bold text-primary text-[10px] uppercase">Upload Custom Font</span>
                  <p className="text-[10px] text-mute leading-normal">Upload a handwriting font file (.ttf, .otf, .woff, .woff2) to type directly in your own style.</p>
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleFontUpload}
                    className="text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-mono file:bg-canvas-soft-2 file:text-body hover:file:bg-hairline w-full"
                  />
                  {customFonts.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <span className="block text-[9px] uppercase text-mute">Uploaded Custom Fonts:</span>
                      <div className="flex flex-wrap gap-1">
                        {customFonts.map(cf => (
                          <div key={cf.name} className="flex items-center bg-canvas-soft-2 text-[9px] px-2 py-0.5 rounded">
                            <span className="text-body font-medium truncate max-w-[100px]">{cf.family}</span>
                            <button
                              onClick={() => {
                                setCustomFonts(prev => prev.filter(item => item.name !== cf.name));
                                if (fontFamily === cf.name) {
                                  setFontFamily(FONTS[0].family);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 ml-1.5 font-bold cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel: Realism Parameters */}
            {activePanel === 'realism' && (
              <div className="space-y-4">
                <h3 className="font-mono font-bold uppercase text-primary border-b border-hairline pb-1 text-[10px]">Realism Jitters</h3>

                <div className="space-y-3 font-mono">
                  <div>
                    <div className="flex justify-between">
                      <span>Overall Messiness</span>
                      <span>{messiness}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.5"
                      step="0.1"
                      value={messiness}
                      onChange={(e) => setMessiness(parseFloat(e.target.value))}
                      className="w-full accent-primary h-1 bg-hairline rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span>Baseline Slant/Drift</span>
                      <span>{baselineDrift}px</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="3.0"
                      step="0.1"
                      value={baselineDrift}
                      onChange={(e) => setBaselineDrift(parseFloat(e.target.value))}
                      className="w-full accent-primary h-1 bg-hairline rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span>Character Jitter</span>
                      <span>{vJitter}px</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="4.0"
                      step="0.1"
                      value={vJitter}
                      onChange={(e) => {
                        setVJitter(parseFloat(e.target.value));
                        setHJitter(parseFloat(e.target.value) / 2);
                      }}
                      className="w-full accent-primary h-1 bg-hairline rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span>Letter Rotation (deg)</span>
                      <span>{rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="8.0"
                      step="0.2"
                      value={rotation}
                      onChange={(e) => setRotation(parseFloat(e.target.value))}
                      className="w-full accent-primary h-1 bg-hairline rounded-lg mt-1"
                    />
                  </div>
                </div>

                <div className="border-t border-hairline pt-3 space-y-3">
                  <span className="font-mono font-bold uppercase text-[9px] text-mute">Textures & Pen Presets</span>
                  <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
                    {['ballpoint', 'fountain', 'pencil'].map(type => (
                      <button
                        key={type}
                        onClick={() => setInkType(type)}
                        className={`py-1 rounded capitalize border border-hairline cursor-pointer ${inkType === type ? 'bg-primary text-on-primary border-primary font-semibold' : 'bg-canvas hover:bg-canvas-soft text-body'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between font-mono mt-2">
                    <span>Smudge overlay</span>
                    <input
                      type="checkbox"
                      checked={smudge}
                      onChange={(e) => setSmudge(e.target.checked)}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span>Consistency Seed</span>
                    <button 
                      onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                      className="text-[10px] font-mono hover:underline text-link font-semibold cursor-pointer"
                    >
                      {seed} (Regen)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Panel: Margins, Headers & Footers */}
            {activePanel === 'header' && (
              <div className="space-y-4">
                <h3 className="font-mono font-bold uppercase text-primary border-b border-hairline pb-1 text-[10px]">Margins & Header Settings</h3>
                
                {isAssignmentMode && (
                  <div className="space-y-3 border-b border-hairline pb-3">
                    <div className="flex items-center justify-between">
                      <span className="block font-bold text-primary text-[10px] uppercase">Assignment Cover Header</span>
                      <input
                        type="checkbox"
                        checked={isAssignmentHeaderEnabled}
                        onChange={(e) => setIsAssignmentHeaderEnabled(e.target.checked)}
                        className="accent-primary w-4 h-4 cursor-pointer"
                      />
                    </div>
                    {isAssignmentHeaderEnabled && (
                      <div className="space-y-3 text-[10px] font-mono">
                        {assignmentFields.map((field, index) => (
                          <div key={field.id} className="p-2 border border-hairline bg-canvas-soft rounded space-y-2">
                            <div className="flex items-center justify-between gap-1">
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => {
                                  const nextFields = [...assignmentFields];
                                  nextFields[index] = { ...field, label: e.target.value };
                                  setAssignmentFields(nextFields);
                                }}
                                placeholder="Field Label"
                                className="font-bold bg-transparent border-b border-hairline focus:border-hairline-strong outline-none text-xs w-[60%] py-0.5 text-primary"
                              />
                              <div className="flex items-center gap-1">
                                <select
                                  value={field.alignment}
                                  onChange={(e) => {
                                    const nextFields = [...assignmentFields];
                                    nextFields[index] = { ...field, alignment: e.target.value as 'left' | 'right' };
                                    setAssignmentFields(nextFields);
                                  }}
                                  className="bg-canvas border border-hairline rounded text-[9px] py-0.5 px-1 cursor-pointer outline-none text-body"
                                >
                                  <option value="left">Left Col</option>
                                  <option value="right">Right Col</option>
                                </select>
                                <button
                                  onClick={() => {
                                    setAssignmentFields(assignmentFields.filter(f => f.id !== field.id));
                                  }}
                                  className="text-red-500 hover:text-red-600 font-bold px-1.5 text-xs cursor-pointer"
                                  title="Delete Field"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => {
                                const nextFields = [...assignmentFields];
                                nextFields[index] = { ...field, value: e.target.value };
                                setAssignmentFields(nextFields);
                              }}
                              placeholder={`Enter ${field.label || 'value'}...`}
                              className="input-field h-7 bg-canvas text-xs w-full"
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newId = String(Date.now());
                            setAssignmentFields([
                              ...assignmentFields,
                              { id: newId, label: 'Custom Field', value: '', alignment: 'left' }
                            ]);
                          }}
                          className="btn-secondary h-7 text-[10px] w-full cursor-pointer flex items-center justify-center font-bold"
                        >
                          + Add Custom Field
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 font-mono text-[10px]">
                  <div>
                    <span>Top Margin (px)</span>
                    <input
                      type="number"
                      value={margins.top}
                      onChange={(e) => setMargins(m => ({ ...m, top: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="input-field h-7 bg-canvas text-xs"
                    />
                  </div>
                  <div>
                    <span>Bottom Margin (px)</span>
                    <input
                      type="number"
                      value={margins.bottom}
                      onChange={(e) => setMargins(m => ({ ...m, bottom: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="input-field h-7 bg-canvas text-xs"
                    />
                  </div>
                  <div>
                    <span>Left Margin (px)</span>
                    <input
                      type="number"
                      value={margins.left}
                      onChange={(e) => setMargins(m => ({ ...m, left: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="input-field h-7 bg-canvas text-xs"
                    />
                  </div>
                  <div>
                    <span>Right Margin (px)</span>
                    <input
                      type="number"
                      value={margins.right}
                      onChange={(e) => setMargins(m => ({ ...m, right: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="input-field h-7 bg-canvas text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-[10px] border-t border-hairline pt-3">
                  <div className="flex justify-between font-bold text-primary uppercase">
                    <span>Left Margin Padding</span>
                    <span>{lineMarginPadding}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lineMarginPadding}
                    onChange={(e) => setLineMarginPadding(parseInt(e.target.value) || 0)}
                    className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer"
                  />
                  <span className="text-[9px] text-mute">Adjust spacing between vertical red margin line and text start.</span>
                </div>

                <div className="space-y-3 border-t border-hairline pt-3 font-mono">
                  <span className="block font-bold text-primary text-[10px] uppercase">Page Header</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[9px] text-mute">Left</span>
                      <input
                        type="text"
                        value={headerLeft}
                        onChange={(e) => setHeaderLeft(e.target.value)}
                        placeholder="Name: ____"
                        className="input-field h-8 bg-canvas text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-mute">Center</span>
                      <input
                        type="text"
                        value={headerCenter}
                        onChange={(e) => setHeaderCenter(e.target.value)}
                        placeholder="Title"
                        className="input-field h-8 bg-canvas text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-mute">Right</span>
                      <input
                        type="text"
                        value={headerRight}
                        onChange={(e) => setHeaderRight(e.target.value)}
                        placeholder="Date: ____"
                        className="input-field h-8 bg-canvas text-xs mt-0.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-mute">Same Header on All Pages</span>
                    <input
                      type="checkbox"
                      checked={sameHeaderAllPages}
                      onChange={(e) => setSameHeaderAllPages(e.target.checked)}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <span className="block font-bold text-primary text-[10px] uppercase pt-2 border-t border-hairline/50">Page Footer</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[9px] text-mute">Left</span>
                      <input
                        type="text"
                        value={footerLeft}
                        onChange={(e) => setFooterLeft(e.target.value)}
                        placeholder=""
                        className="input-field h-8 bg-canvas text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-mute">Center</span>
                      <input
                        type="text"
                        value={footerCenter}
                        onChange={(e) => setFooterCenter(e.target.value)}
                        placeholder=""
                        className="input-field h-8 bg-canvas text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-mute">Right</span>
                      <input
                        type="text"
                        value={footerRight}
                        onChange={(e) => setFooterRight(e.target.value)}
                        placeholder="Page {page}"
                        className="input-field h-8 bg-canvas text-xs mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Panel: Insert Elements */}
            {activePanel === 'insert' && (
              <div className="space-y-4">
                <h3 className="font-mono font-bold uppercase text-primary border-b border-hairline pb-1 text-[10px]">Insert Media & Overlays</h3>
                
                <div>
                  <span className="block font-mono font-bold text-primary text-[10px] uppercase mb-1">Insert Image / Signature</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs font-mono file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-mono file:bg-canvas-soft-2 file:text-body hover:file:bg-hairline w-full"
                  />
                </div>

                <div className="border-t border-hairline pt-3 font-mono">
                  <span className="block font-bold text-primary text-[10px] uppercase mb-1">LaTeX Math Formula</span>
                  <textarea
                    value={latexInput}
                    onChange={(e) => setLatexInput(e.target.value)}
                    placeholder="\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}"
                    className="w-full h-16 border border-hairline bg-canvas p-2 rounded text-xs outline-none focus:border-hairline-strong resize-none"
                  />
                  <button
                    onClick={async () => {
                      showToast('Rendering equation...');
                      const url = await drawFormulaToDataUrl(latexInput, inkColor);
                      if (url) {
                        const newElement: CanvasElement = {
                          id: String(Date.now()),
                          type: 'formula',
                          pageIndex: previewPageIdx,
                          x: 25,
                          y: 35,
                          width: 35,
                          height: 8,
                          dataUrl: url
                        };
                        setCanvasElements(prev => [...prev, newElement]);
                        showToast('LaTeX Formula Inserted!');
                      } else {
                        showToast('Rendering error!', true);
                      }
                    }}
                    className="btn-secondary h-7 text-[10px] mt-1.5 w-full cursor-pointer flex items-center justify-center font-bold"
                  >
                    Insert LaTeX Equation
                  </button>
                </div>

                <div className="border-t border-hairline pt-3">
                  <span className="block font-mono font-bold text-primary text-[10px] uppercase mb-2">Sketch Annotation Layer</span>
                  <button
                    onClick={() => {
                      setIsDrawingMode(!isDrawingMode);
                      if (!isDrawingMode) setEditMode('preview');
                    }}
                    className={`w-full h-7 text-[10px] font-mono rounded border flex items-center justify-center space-x-1 transition-colors cursor-pointer ${
                      isDrawingMode 
                        ? 'bg-link text-white border-link font-semibold animate-pulse' 
                        : 'bg-canvas hover:bg-canvas-soft border-hairline text-body'
                    }`}
                  >
                    <span>{isDrawingMode ? 'Drawing Active (Click to Complete)' : 'Enable Sketch Drawing'}</span>
                  </button>
                </div>

                <div className="border-t border-hairline pt-3 font-mono">
                  <span className="block font-bold text-primary text-[10px] uppercase mb-1">Hand-Drawn Grid Table</span>
                  <div className="grid grid-cols-2 gap-2 text-[9px] mb-1.5">
                    <div>
                      <span>Rows:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={tableRowsInput}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setTableRowsInput(val);
                          const newCells = Array(val).fill(null).map((_, rIdx) => 
                            Array(tableColsInput).fill(null).map((_, cIdx) => 
                              (tableCells[rIdx]?.[cIdx] || '')
                            )
                          );
                          setTableCells(newCells);
                        }}
                        className="input-field h-6 bg-canvas text-xs"
                      />
                    </div>
                    <div>
                      <span>Columns:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={tableColsInput}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setTableColsInput(val);
                          const newCells = Array(tableRowsInput).fill(null).map((_, rIdx) => 
                            Array(val).fill(null).map((_, cIdx) => 
                              (tableCells[rIdx]?.[cIdx] || '')
                            )
                          );
                          setTableCells(newCells);
                        }}
                        className="input-field h-6 bg-canvas text-xs"
                      />
                    </div>
                  </div>

                  <div className="max-h-[80px] overflow-y-auto border border-hairline rounded p-1 space-y-1 bg-canvas-soft-2/50 mb-2">
                    {tableCells.map((row, rIdx) => (
                      <div key={rIdx} className="flex gap-1">
                        {row.map((cell, cIdx) => (
                          <input
                            key={cIdx}
                            type="text"
                            value={cell}
                            onChange={(e) => {
                              const newCells = [...tableCells];
                              newCells[rIdx] = [...newCells[rIdx]];
                              newCells[rIdx][cIdx] = e.target.value;
                              setTableCells(newCells);
                            }}
                            placeholder={`R${rIdx+1}C${cIdx+1}`}
                            className="w-full border border-hairline bg-canvas p-1 rounded font-mono text-[8px] outline-none"
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={async () => {
                      showToast('Generating hand-drawn table...');
                      const url = await drawTableToDataUrl(tableCells, fontFamily, inkColor);
                      if (url) {
                        const newElement: CanvasElement = {
                          id: String(Date.now()),
                          type: 'table',
                          pageIndex: previewPageIdx,
                          x: 15,
                          y: 40,
                          width: 50,
                          height: 25,
                          dataUrl: url
                        };
                        setCanvasElements(prev => [...prev, newElement]);
                        showToast('Grid Table inserted!');
                      }
                    }}
                    className="btn-secondary h-7 text-[10px] w-full cursor-pointer flex items-center justify-center font-bold"
                  >
                    Draw & Insert Grid Table
                  </button>
                </div>
              </div>
            )}

            {/* Panel: Presets & Layout loading */}
            {activePanel === 'paper' && (
              <div className="space-y-4">
                <h3 className="font-mono font-bold uppercase text-primary border-b border-hairline pb-1 text-[10px]">Presets & Page Backgrounds</h3>
                
                {paperStyle === 'custom' && (
                  <div className="border border-dashed border-hairline rounded-lg p-3 bg-canvas-soft-2/50 text-center space-y-2">
                    {customBgName ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-mono text-body truncate">{customBgName}</p>
                        <button 
                          onClick={() => { setCustomBgBitmap(null); if (customBgUrl) URL.revokeObjectURL(customBgUrl); setCustomBgUrl(''); setPaperStyle('plain'); }}
                          className="text-[10px] font-mono text-red-500 hover:underline flex items-center justify-center mx-auto"
                        >
                          Clear Image Background
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBgUpload}
                          className="text-[10px] font-mono w-full"
                        />
                      </div>
                    )}
                  </div>
                )}
                {paperStyle !== 'custom' && (
                  <div className="border border-hairline p-3 rounded bg-canvas-soft font-mono text-[10px]">
                    <span>Upload custom ruled paper scan/photo:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBgUpload}
                      className="mt-2 text-[10px] w-full"
                    />
                  </div>
                )}

                <div className="border-t border-hairline pt-3 space-y-2 font-mono">
                  <span className="block font-bold text-primary text-[10px] uppercase">Load Preset Styles</span>
                  <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto">
                    {Object.keys(presets).map(name => (
                      <div key={name} className="group flex items-center bg-canvas-soft-2 text-[9px] font-mono px-2 py-0.5 rounded">
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
                  <div className="flex gap-1 mt-2">
                    <input
                      type="text"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Preset name..."
                      className="input-field h-7 text-xs bg-canvas"
                    />
                    <button
                      onClick={savePreset}
                      disabled={!newPresetName.trim()}
                      className="p-1 border border-hairline bg-canvas hover:bg-canvas-soft text-body rounded disabled:opacity-40 cursor-pointer flex items-center justify-center shrink-0 w-7 h-7"
                      title="Save current layout config"
                    >
                      <Save size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Exporter Block (Always anchored at the bottom of the sidebar) */}
          <div className="border-t border-hairline pt-4 space-y-3 mt-4">
            <h4 className="text-[10px] font-mono font-bold uppercase text-primary flex items-center">
              <Download size={12} className="mr-1.5" />
              <span>Export document options</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <span>DPI Quality</span>
                <select
                  value={exportDpi}
                  onChange={(e) => setExportDpi(e.target.value)}
                  className="input-field h-7 text-xs bg-canvas mt-1 outline-none"
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
                  className="input-field h-7 text-xs bg-canvas mt-1 outline-none"
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
                className="btn-secondary text-[11px] w-full py-1.5 cursor-pointer font-mono font-bold disabled:opacity-30 flex items-center justify-center"
              >
                ZIP (PNGs)
              </button>
              <button
                disabled={pagesBuffers.length === 0}
                onClick={handleDownloadPdf}
                className="btn-primary text-[11px] w-full py-1.5 cursor-pointer font-mono font-bold disabled:opacity-30 flex items-center justify-center"
              >
                PDF Document
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
