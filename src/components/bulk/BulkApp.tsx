import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Plus, Upload, Trash2, Settings, Download,
  RefreshCw, Check, Info, FileSpreadsheet, Eye
} from 'lucide-react';
import { FONTS, getDefaultBaselineOffset } from '../../lib/fonts';
import { createPdfFromImages, createZipFromImages, downloadBlob } from '../../lib/exporter';
import JSZip from 'jszip';

function Toast({ toast }: { toast: { message: string; isError?: boolean } | null }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg z-50 text-xs font-medium border flex items-center space-x-2 transition-all transform translate-y-0 ${toast.isError
        ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-300'
        : 'bg-canvas border-hairline-strong text-primary'
        }`}
    >
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-ping"></span>
      <span>{toast.message}</span>
    </div>
  );
}


interface DocumentItem {
  id: string;
  title: string;
  text: string;
  overrideSettings?: {
    fontFamily?: string;
    paperStyle?: string;
    inkColor?: string;
    fontSize?: number;
  };
  renderedPages?: ArrayBuffer[];
  renderingStatus?: 'idle' | 'rendering' | 'done' | 'error';
  pageCount?: number;
}

export default function BulkApp() {
  // Local toast helper for non-blocking UX (kept minimal; avoids alert interruption)
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };
  const [docs, setDocs] = useState<DocumentItem[]>([
    { id: '1', title: 'Doc 01', text: 'Document one content for handwriting generation.', renderingStatus: 'idle' },
    { id: '2', title: 'Doc 02', text: 'Document two content. Customize your font settings.', renderingStatus: 'idle' }
  ]);

  // Bulk paste text mode
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [delimiter, setDelimiter] = useState('===');
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);

  // Global Settings
  const [globalFont, setGlobalFont] = useState('Architects Daughter');
  const [globalPaper, setGlobalPaper] = useState('single-ruled');
  const [globalInkColor, setGlobalInkColor] = useState('#0000ff');
  const [globalInkType, setGlobalInkType] = useState('ballpoint');
  const [globalFontSize, setGlobalFontSize] = useState(20);
  const [globalLineHeight, setGlobalLineHeight] = useState(1.4);
  const [globalWordSpacing, setGlobalWordSpacing] = useState(0);
  const [globalLetterSpacing, setGlobalLetterSpacing] = useState(0);

  const [globalMargins, setGlobalMargins] = useState({ top: 60, bottom: 60, left: 60, right: 60 });
  const [globalMessiness, setGlobalMessiness] = useState(0.8);
  const [globalSeed, setGlobalSeed] = useState(12345);
  const [globalBaselineOffset, setGlobalBaselineOffset] = useState(4);

  // Queue system state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0 });
  const [warnLimit, setWarnLimit] = useState(false);

  // Export Settings
  const [filenamePrefix, setFilenamePrefix] = useState('bulk-handwriting');
  const [exportPaperSize, setExportPaperSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [exportDpi, setExportDpi] = useState('1.0');

  // Preview state
  const [activeDocPreview, setActiveDocPreview] = useState<DocumentItem | null>(null);
  const [activeDocPreviewUrls, setActiveDocPreviewUrls] = useState<string[]>([]);
  const [previewPageIdx, setPreviewPageIdx] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update warnings based on doc counts
  useEffect(() => {
    const totalPagesEst = docs.reduce((acc, d) => acc + Math.ceil(d.text.length / 500), 0);
    if (docs.length > 30 || totalPagesEst > 100) {
      setWarnLimit(true);
    } else {
      setWarnLimit(false);
    }
  }, [docs]);

  // Set default baseline offset when global font changes
  useEffect(() => {
    setGlobalBaselineOffset(getDefaultBaselineOffset(globalFont));
  }, [globalFont]);

  // Clean active previews
  useEffect(() => {
    return () => {
      activeDocPreviewUrls.forEach(URL.revokeObjectURL);
    };
  }, [activeDocPreviewUrls]);

  // Show active preview
  const showPreview = (doc: DocumentItem) => {
    if (!doc.renderedPages || doc.renderedPages.length === 0) {
      showToast('This document has not been rendered yet. Click "Generate Handwriting" first.', true);
      return;
    }

    // Revoke old
    activeDocPreviewUrls.forEach(URL.revokeObjectURL);
    const urls = doc.renderedPages.map(buf => URL.createObjectURL(new Blob([buf], { type: 'image/png' })));

    setActiveDocPreview(doc);
    setActiveDocPreviewUrls(urls);
    setPreviewPageIdx(0);
  };

  // Add document manual
  const handleAddDoc = () => {
    const nextId = String(Date.now());
    const titleNum = String(docs.length + 1).padStart(2, '0');
    setDocs([...docs, {
      id: nextId,
      title: `Doc ${titleNum}`,
      text: '',
      renderingStatus: 'idle'
    }]);
  };

  const handleUpdateDocText = (id: string, text: string) => {
    setDocs(docs.map(d => d.id === id ? { ...d, text, renderingStatus: 'idle' } : d));
  };

  const handleUpdateDocTitle = (id: string, title: string) => {
    setDocs(docs.map(d => d.id === id ? { ...d, title } : d));
  };

  const handleDeleteDoc = (id: string) => {
    setDocs(docs.filter(d => d.id !== id));
    if (activeDocPreview?.id === id) {
      setActiveDocPreview(null);
      setActiveDocPreviewUrls([]);
    }
  };

  const handleAddOverride = (id: string, key: string, value: any) => {
    setDocs(docs.map(d => {
      if (d.id === id) {
        const overrides = d.overrideSettings || {};
        return {
          ...d,
          overrideSettings: {
            ...overrides,
            [key]: value
          },
          renderingStatus: 'idle'
        };
      }
      return d;
    }));
  };

  const handleRemoveOverride = (id: string, key: string) => {
    setDocs(docs.map(d => {
      if (d.id === id && d.overrideSettings) {
        const overrides = { ...d.overrideSettings };
        delete overrides[key as keyof typeof overrides];
        return {
          ...d,
          overrideSettings: Object.keys(overrides).length > 0 ? overrides : undefined,
          renderingStatus: 'idle'
        };
      }
      return d;
    }));
  };

  // CSV/TXT importer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.csv')) {
        // Parse CSV simple (one line = one doc or simple rows)
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        const newDocs: DocumentItem[] = lines.map((line, idx) => {
          // clean quotes
          let cleanLine = line.replace(/^"(.*)"$/, '$1').trim();
          if (cleanLine.startsWith('title,text') || cleanLine.startsWith('"title"')) return null; // skip headers

          let title = `CSV Row ${String(idx + 1).padStart(2, '0')}`;
          let text = cleanLine;

          // Simple comma split if quote delimited
          const commaIdx = cleanLine.indexOf(',');
          if (commaIdx > 0) {
            title = cleanLine.substring(0, commaIdx).replace(/^"(.*)"$/, '$1');
            text = cleanLine.substring(commaIdx + 1).replace(/^"(.*)"$/, '$1').replace(/""/g, '"');
          }

          return {
            id: String(Date.now() + idx),
            title,
            text,
            renderingStatus: 'idle'
          };
        }).filter(Boolean) as DocumentItem[];

        setDocs([...docs, ...newDocs]);
      } else {
        // TXT: Treat file as one document
        setDocs([...docs, {
          id: String(Date.now()),
          title: file.name.replace(/\.txt$/, ''),
          text: content,
          renderingStatus: 'idle'
        }]);
      }
    };
    reader.readAsText(file);
  };

  // Delimiter split mode
  const handleBulkPasteSplit = () => {
    if (!bulkPasteText.trim()) return;
    const blocks = bulkPasteText.split(delimiter).map(b => b.trim()).filter(Boolean);
    const newDocs: DocumentItem[] = blocks.map((text, idx) => {
      const titleNum = String(docs.length + idx + 1).padStart(2, '0');
      return {
        id: String(Date.now() + idx),
        title: `Split Doc ${titleNum}`,
        text,
        renderingStatus: 'idle'
      };
    });
    setDocs([...docs, ...newDocs]);
    setBulkPasteText('');
    setIsBulkPasteOpen(false);
  };

  // Run the sequential worker rendering queue
  const handleGenerateAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCurrentProgress({ current: 0, total: docs.length });

    // Pre-fetch all unique font buffers required for the batch
    const fontBuffers: Record<string, ArrayBuffer> = {};
    try {
      const uniqueFontNames = new Set<string>();
      docs.forEach(doc => {
        uniqueFontNames.add(doc.overrideSettings?.fontFamily || globalFont);
      });

      showToast('Prefetching fonts for rendering...', false);
      await Promise.all(
        Array.from(uniqueFontNames).map(async (fontName) => {
          const font = FONTS.find(f => f.family === fontName) || FONTS[0];
          const res = await fetch(font.path);
          if (!res.ok) throw new Error(`Failed to fetch font: ${fontName}`);
          const buffer = await res.arrayBuffer();
          fontBuffers[fontName] = buffer;
        })
      );
    } catch (err) {
      console.error('Failed to prefetch fonts:', err);
      showToast('Failed to prefetch fonts', true);
      setIsProcessing(false);
      return;
    }

    // Helper function to render a single document in worker
    const renderDoc = (doc: DocumentItem): Promise<ArrayBuffer[]> => {
      return new Promise((resolve, reject) => {
        const worker = new Worker('/workers/render.worker.js');
        const fontName = doc.overrideSettings?.fontFamily || globalFont;
        const font = FONTS.find(f => f.family === fontName) || FONTS[0];
        const docBaselineOffset = doc.overrideSettings?.fontFamily
          ? getDefaultBaselineOffset(doc.overrideSettings.fontFamily)
          : globalBaselineOffset;

        let paperWidth = 800;
        let paperHeight = 1130;
        if (exportPaperSize === 'letter') {
          paperHeight = 1035;
        } else if (exportPaperSize === 'legal') {
          paperHeight = 1318;
        }

        worker.onmessage = (e) => {
          const { type, pages, message } = e.data;
          worker.terminate();
          if (type === 'success') {
            resolve(pages);
          } else {
            reject(new Error(message || 'Failed to render'));
          }
        };

        const customFontsPayload = [];
        if (fontBuffers[fontName]) {
          customFontsPayload.push({ name: fontName, buffer: fontBuffers[fontName] });
        }

        worker.postMessage({
          text: doc.text,
          fontName: font.family,
          fontUrl: font.path,
          customFonts: customFontsPayload,
          paperStyle: doc.overrideSettings?.paperStyle || globalPaper,
          gridSize: 30,
          inkColor: doc.overrideSettings?.inkColor || globalInkColor,
          inkType: globalInkType,
          fontSize: doc.overrideSettings?.fontSize || globalFontSize,
          lineHeight: globalLineHeight,
          wordSpacing: globalWordSpacing,
          letterSpacing: globalLetterSpacing,
          alignment: 'left',
          margins: globalMargins,
          realism: {
            messiness: globalMessiness,
            rotation: globalMessiness * 2.0,
            vJitter: globalMessiness * 1.2,
            hJitter: globalMessiness * 0.6,
            baselineDrift: globalMessiness * 0.8,
            pressureVariation: 0.12,
            smudge: false,
            seed: globalSeed
          },
          dpiMultiplier: parseFloat(exportDpi), // Use configuration quality
          paperWidth,
          paperHeight,
          baselineOffset: docBaselineOffset
        });
      });
    };

    // Clone and run through documents sequentially (chunked render)
    const updatedDocs = [...docs];

    for (let i = 0; i < updatedDocs.length; i++) {
      const doc = updatedDocs[i];
      if (!doc.text.trim()) {
        updatedDocs[i] = { ...doc, renderingStatus: 'done', renderedPages: [] };
        setDocs([...updatedDocs]);
        setCurrentProgress(prev => ({ ...prev, current: i + 1 }));
        continue;
      }

      updatedDocs[i] = { ...doc, renderingStatus: 'rendering' };
      setDocs([...updatedDocs]);

      try {
        const buffers = await renderDoc(doc);
        updatedDocs[i] = {
          ...doc,
          renderingStatus: 'done',
          renderedPages: buffers,
          pageCount: buffers.length
        };
      } catch (err) {
        console.error(err);
        updatedDocs[i] = { ...doc, renderingStatus: 'error' };
      }

      setDocs([...updatedDocs]);
      setCurrentProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsProcessing(false);
  };

  // EXPORT 1: ZIP of PNGs (e.g. doc-01-page-01.png, doc-01-page-02.png)
  const handleExportZip = async () => {
    const renderedDocs = docs.filter(d => d.renderedPages && d.renderedPages.length > 0);
    if (renderedDocs.length === 0) {
      alert('No documents have been rendered yet.');
      return;
    }

    const zip = new JSZip();
    const docDigits = Math.max(2, String(renderedDocs.length).length);

    renderedDocs.forEach((doc, docIdx) => {
      const docNum = String(docIdx + 1).padStart(docDigits, '0');
      const pages = doc.renderedPages || [];
      const pageDigits = Math.max(2, String(pages.length).length);

      pages.forEach((buf, pageIdx) => {
        const pageNum = String(pageIdx + 1).padStart(pageDigits, '0');
        const filename = `${filenamePrefix}-doc-${docNum}-page-${pageNum}.png`;
        zip.file(filename, buf);
      });
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${filenamePrefix}-images.zip`);
  };

  // EXPORT 2: Combined single PDF file containing all documents sequentially
  const handleExportCombinedPdf = async () => {
    const renderedDocs = docs.filter(d => d.renderedPages && d.renderedPages.length > 0);
    if (renderedDocs.length === 0) {
      alert('No documents have been rendered yet.');
      return;
    }

    // Collect all page buffers in order
    const allBuffers: ArrayBuffer[] = [];
    renderedDocs.forEach(d => {
      if (d.renderedPages) {
        allBuffers.push(...d.renderedPages);
      }
    });

    try {
      const pdfBytes = await createPdfFromImages(allBuffers, exportPaperSize);
      const pdfBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      downloadBlob(pdfBlob, `${filenamePrefix}-combined.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate combined PDF.');
    }
  };

  // EXPORT 3: ZIP of separate PDFs per document
  const handleExportSeparatePdfsZip = async () => {
    const renderedDocs = docs.filter(d => d.renderedPages && d.renderedPages.length > 0);
    if (renderedDocs.length === 0) {
      alert('No documents have been rendered yet.');
      return;
    }

    const zip = new JSZip();
    const docDigits = Math.max(2, String(renderedDocs.length).length);

    for (let docIdx = 0; docIdx < renderedDocs.length; docIdx++) {
      const doc = renderedDocs[docIdx];
      const docNum = String(docIdx + 1).padStart(docDigits, '0');

      try {
        const pdfBytes = await createPdfFromImages(doc.renderedPages || [], exportPaperSize);
        const filename = `${filenamePrefix}-doc-${docNum}.pdf`;
        zip.file(filename, pdfBytes);
      } catch (err) {
        console.error(`Failed to compile PDF for ${doc.title}`, err);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${filenamePrefix}-pdfs-bundle.zip`);
  };

  // Estimated size readout
  const getEstimatedSize = () => {
    let totalPages = 0;
    docs.forEach(d => {
      if (d.renderedPages) {
        totalPages += d.renderedPages.length;
      } else {
        // Estimate 1 page per 600 chars
        totalPages += Math.max(1, Math.ceil(d.text.length / 600));
      }
    });
    // Est. size: PNG is approx 150KB at 1x, 500KB at 2x, 1MB at 3x
    const dpi = parseFloat(exportDpi);
    let sizePerPageKb = 150;
    if (dpi === 2.0) sizePerPageKb = 500;
    if (dpi === 3.0) sizePerPageKb = 1000;

    const estBytes = totalPages * sizePerPageKb * 1024;
    if (estBytes > 1024 * 1024) {
      return `Est. Total Size: ${(estBytes / (1024 * 1024)).toFixed(1)} MB (${totalPages} pages)`;
    }
    return `Est. Total Size: ${Math.round(estBytes / 1024)} KB (${totalPages} pages)`;
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {/* Page Hero Title */}
      <div className="border-b border-hairline pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary uppercase font-mono">Bulk Handwriting Generator</h1>
          <p className="text-xs text-body font-mono mt-1">Text to Handwriting queue renderer. Run multiple text files or rows in parallel.</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* File Upload Trigger */}
          <input
            type="file"
            accept=".csv,.txt"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-xs flex items-center cursor-pointer shadow-sm"
          >
            <Upload size={14} className="mr-1.5" /> CSV/TXT Import
          </button>
          <button
            onClick={() => setIsBulkPasteOpen(!isBulkPasteOpen)}
            className="btn-secondary text-xs flex items-center cursor-pointer shadow-sm"
          >
            <FileSpreadsheet size={14} className="mr-1.5" /> Bulk Paste Split
          </button>
          <button
            onClick={handleAddDoc}
            className="btn-secondary text-xs flex items-center cursor-pointer shadow-sm"
          >
            <Plus size={14} className="mr-1.5" /> Add Document
          </button>
        </div>
      </div>

      {/* Warning Notice */}
      {warnLimit && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex items-start space-x-3 text-xs text-amber-800 dark:text-amber-300">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Large Batch Limit Warning</p>
            <p className="mt-0.5">You have more than 30 documents or a high page count. We recommend executing this in segments to avoid hitting browser memory allocation ceilings.</p>
          </div>
        </div>
      )}

      {/* Delimiter split popup */}
      {isBulkPasteOpen && (
        <div className="border border-hairline bg-canvas rounded-lg p-5 shadow-md flex flex-col gap-3">
          <h3 className="text-xs font-mono font-semibold uppercase text-primary">Bulk Paste Delimiter Splitter</h3>
          <div className="flex items-center space-x-4">
            <div className="w-1/3">
              <label className="block text-[10px] text-mute font-mono">Block Delimiter</label>
              <input
                type="text"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="input-field h-8 text-xs font-mono bg-canvas-soft"
              />
            </div>
            <p className="text-[10px] text-mute leading-normal">
              Paste your text in the text-area below. Each block separated by <strong>{delimiter}</strong> will be split into a distinct document in the generator.
            </p>
          </div>
          <textarea
            value={bulkPasteText}
            onChange={(e) => setBulkPasteText(e.target.value)}
            placeholder={`Document 01 text goes here...\n${delimiter}\nDocument 02 text goes here...`}
            className="w-full h-32 border border-hairline bg-canvas p-3 rounded font-mono text-xs outline-none"
          />
          <div className="flex justify-end space-x-2">
            <button onClick={() => setIsBulkPasteOpen(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
            <button onClick={handleBulkPasteSplit} className="btn-primary text-xs py-1.5">Import Blocks</button>
          </div>
        </div>
      )}

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Documents List & Override Editors */}
        <div className="lg:col-span-2 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-mute flex items-center justify-between">
            <span>Documents Pool ({docs.length})</span>
            <button
              onClick={() => setDocs([])}
              className="text-red-500 hover:text-red-700 text-[10px] lowercase"
            >
              Clear Pool
            </button>
          </h2>

          {docs.length === 0 ? (
            <div className="border border-hairline bg-canvas rounded-lg p-12 text-center text-xs text-mute font-mono">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <span>Your document list is empty. Add documents manually or upload files.</span>
            </div>
          ) : (
            docs.map((doc, idx) => (
              <div
                key={doc.id}
                className={`border rounded-lg bg-canvas p-4 shadow-sm flex flex-col gap-3 transition-colors ${doc.renderingStatus === 'rendering'
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : doc.renderingStatus === 'done'
                    ? 'border-green-200 dark:border-green-900 bg-green-50/20'
                    : doc.renderingStatus === 'error'
                      ? 'border-red-300'
                      : 'border-hairline'
                  }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-2 flex-grow">
                    <span className="text-xs font-mono text-mute">{String(idx + 1).padStart(2, '0')}.</span>
                    <input
                      type="text"
                      value={doc.title}
                      onChange={(e) => handleUpdateDocTitle(doc.id, e.target.value)}
                      className="text-xs font-semibold font-mono bg-transparent border-b border-transparent hover:border-hairline focus:border-hairline-strong outline-none py-0.5 px-1 max-w-[200px]"
                    />

                    {doc.renderingStatus === 'rendering' && (
                      <span className="text-[10px] font-mono text-blue-500 flex items-center space-x-1">
                        <RefreshCw size={10} className="animate-spin" />
                        <span>RENDERING...</span>
                      </span>
                    )}
                    {doc.renderingStatus === 'done' && (
                      <span className="text-[10px] font-mono text-green-600 flex items-center">
                        <Check size={10} className="mr-0.5" /> DONE ({doc.pageCount} Pages)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {doc.renderedPages && doc.renderedPages.length > 0 && (
                      <button
                        onClick={() => showPreview(doc)}
                        className="p-1.5 rounded hover:bg-canvas-soft-2 text-body cursor-pointer"
                        title="View Pages"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1.5 rounded hover:bg-canvas-soft-2 text-red-500 cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Text area */}
                <textarea
                  value={doc.text}
                  onChange={(e) => handleUpdateDocText(doc.id, e.target.value)}
                  placeholder="Text block content..."
                  className="w-full h-24 border border-hairline bg-canvas text-ink p-3 rounded font-mono text-xs outline-none focus:border-hairline-strong resize-y"
                />

                {/* Settings overrides collapsible */}
                <details className="text-[11px] font-mono">
                  <summary className="cursor-pointer text-mute hover:text-body select-none">
                    Per-Document Layout Overrides
                  </summary>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2.5 border-t border-hairline mt-1.5">
                    <div>
                      <span>Font</span>
                      <select
                        value={doc.overrideSettings?.fontFamily || ''}
                        onChange={(e) => e.target.value ? handleAddOverride(doc.id, 'fontFamily', e.target.value) : handleRemoveOverride(doc.id, 'fontFamily')}
                        className="input-field h-7 text-[10px] p-0.5 bg-canvas mt-1 font-mono"
                      >
                        <option value="">Global Default</option>
                        {FONTS.map(f => <option key={f.name} value={f.family}>{f.family}</option>)}
                      </select>
                    </div>

                    <div>
                      <span>Paper style</span>
                      <select
                        value={doc.overrideSettings?.paperStyle || ''}
                        onChange={(e) => e.target.value ? handleAddOverride(doc.id, 'paperStyle', e.target.value) : handleRemoveOverride(doc.id, 'paperStyle')}
                        className="input-field h-7 text-[10px] p-0.5 bg-canvas mt-1 font-mono"
                      >
                        <option value="">Global Default</option>
                        <option value="plain">Plain</option>
                        <option value="single-ruled">Notebook</option>
                        <option value="legal">Legal</option>
                        <option value="graph">Graph</option>
                      </select>
                    </div>

                    <div>
                      <span>Ink Color</span>
                      <select
                        value={doc.overrideSettings?.inkColor || ''}
                        onChange={(e) => e.target.value ? handleAddOverride(doc.id, 'inkColor', e.target.value) : handleRemoveOverride(doc.id, 'inkColor')}
                        className="input-field h-7 text-[10px] p-0.5 bg-canvas mt-1 font-mono"
                      >
                        <option value="">Global Default</option>
                        <option value="#0000ff">Blue</option>
                        <option value="#1c1917">Black</option>
                        <option value="#dc2626">Red</option>
                      </select>
                    </div>

                    <div>
                      <span>Font Size</span>
                      <input
                        type="number"
                        min="12"
                        max="40"
                        value={doc.overrideSettings?.fontSize || ''}
                        onChange={(e) => e.target.value ? handleAddOverride(doc.id, 'fontSize', parseInt(e.target.value)) : handleRemoveOverride(doc.id, 'fontSize')}
                        placeholder="Global Default"
                        className="input-field h-7 text-[10px] bg-canvas mt-1 font-mono"
                      />
                    </div>
                  </div>
                </details>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Global Configurations & Rendering / Export Actions */}
        <div className="space-y-6">

          {/* Global Configuration card */}
          <div className="border border-hairline bg-canvas rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-primary flex items-center pb-2 border-b border-hairline">
              <Settings size={14} className="mr-1.5" /> Global Defaults Settings
            </h3>

            <div>
              <label className="block text-[10px] font-mono text-mute mb-1">Global Font Family</label>
              <select
                value={globalFont}
                onChange={(e) => setGlobalFont(e.target.value)}
                className="input-field h-8 text-xs bg-canvas"
              >
                {FONTS.map(f => <option key={f.name} value={f.family}>{f.family} ({f.category})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-mute mb-1">Global Paper Background</label>
              <select
                value={globalPaper}
                onChange={(e) => setGlobalPaper(e.target.value)}
                className="input-field h-8 text-xs bg-canvas"
              >
                <option value="plain">Plain White Page</option>
                <option value="single-ruled">Single Ruled (Notebook)</option>
                <option value="legal">Legal Pad (Yellow)</option>
                <option value="graph">Graph Grid Paper</option>
                <option value="dot-grid">Dot Grid Sheet</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span>Ink Color</span>
                <select
                  value={globalInkColor}
                  onChange={(e) => setGlobalInkColor(e.target.value)}
                  className="input-field h-8 text-xs bg-canvas mt-1"
                >
                  <option value="#0000ff">Blue</option>
                  <option value="#1c1917">Black</option>
                  <option value="#dc2626">Red</option>
                </select>
              </div>
              <div>
                <span>Pen Type</span>
                <select
                  value={globalInkType}
                  onChange={(e) => setGlobalInkType(e.target.value)}
                  className="input-field h-8 text-xs bg-canvas mt-1"
                >
                  <option value="ballpoint">Ballpoint</option>
                  <option value="fountain">Fountain</option>
                  <option value="pencil">Pencil</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span>Font Size (px)</span>
                <input
                  type="number"
                  value={globalFontSize}
                  onChange={(e) => setGlobalFontSize(parseInt(e.target.value) || 20)}
                  className="input-field h-8 bg-canvas mt-1"
                />
              </div>
              <div>
                <span>Messiness</span>
                <select
                  value={globalMessiness}
                  onChange={(e) => setGlobalMessiness(parseFloat(e.target.value))}
                  className="input-field h-8 bg-canvas mt-1"
                >
                  <option value="0.4">Neat (0.4x)</option>
                  <option value="0.8">Standard (0.8x)</option>
                  <option value="1.4">Messy (1.4x)</option>
                  <option value="2.2">Chaotic (2.2x)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span>Line Offset (px)</span>
                <input
                  type="number"
                  value={globalBaselineOffset}
                  onChange={(e) => setGlobalBaselineOffset(parseInt(e.target.value) || 0)}
                  className="input-field h-8 bg-canvas mt-1"
                />
              </div>
            </div>

            <div className="border-t border-hairline pt-4 space-y-3">
              <button
                onClick={handleGenerateAll}
                disabled={isProcessing || docs.length === 0}
                className="btn-primary w-full py-2.5 flex items-center justify-center space-x-2 font-mono text-xs cursor-pointer shadow disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>GENERATING ({currentProgress.current}/{currentProgress.total})...</span>
                  </>
                ) : (
                  <span>GENERATE HANDWRITING BATCH</span>
                )}
              </button>
            </div>
          </div>

          {/* Export Panel card */}
          <div className="border border-hairline bg-canvas rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-primary flex items-center pb-2 border-b border-hairline">
              <Download size={14} className="mr-1.5" /> Batch Export Options
            </h3>

            <div>
              <label className="block text-[10px] font-mono text-mute mb-1">Configurable Filename Prefix</label>
              <input
                type="text"
                value={filenamePrefix}
                onChange={(e) => setFilenamePrefix(e.target.value)}
                placeholder="e.g. homework-run"
                className="input-field h-8 text-xs font-mono bg-canvas"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span>PDF Paper Size</span>
                <select
                  value={exportPaperSize}
                  onChange={(e) => setExportPaperSize(e.target.value as any)}
                  className="input-field h-8 text-xs bg-canvas mt-1"
                >
                  <option value="a4">A4 Size</option>
                  <option value="letter">Letter</option>
                  <option value="legal">Legal</option>
                </select>
              </div>

              <div>
                <span>Export Quality</span>
                <select
                  value={exportDpi}
                  onChange={(e) => setExportDpi(e.target.value)}
                  className="input-field h-8 text-xs bg-canvas font-mono mt-1"
                >
                  <option value="1.0">Standard 1x</option>
                  <option value="2.0">High-Res 2x</option>
                </select>
              </div>
            </div>

            <div className="text-[10px] font-mono text-mute text-center bg-canvas-soft-2/50 py-2 border border-hairline rounded">
              {getEstimatedSize()}
            </div>

            <div className="space-y-2">
              <button
                disabled={isProcessing || !docs.some(d => d.renderedPages && d.renderedPages.length > 0)}
                onClick={handleExportZip}
                className="btn-secondary w-full py-2 flex items-center justify-center font-mono text-xs cursor-pointer disabled:opacity-40"
              >
                Download Images ZIP
              </button>
              <button
                disabled={isProcessing || !docs.some(d => d.renderedPages && d.renderedPages.length > 0)}
                onClick={handleExportCombinedPdf}
                className="btn-primary w-full py-2 flex items-center justify-center font-mono text-xs cursor-pointer disabled:opacity-40"
              >
                Combined PDF File
              </button>
              <button
                disabled={isProcessing || !docs.some(d => d.renderedPages && d.renderedPages.length > 0)}
                onClick={handleExportSeparatePdfsZip}
                className="btn-secondary w-full py-2 flex items-center justify-center font-mono text-xs cursor-pointer disabled:opacity-40"
              >
                Separate PDFs ZIP
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Standalone Modal Preview of Rendered Pages */}
      {activeDocPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline rounded-lg w-full max-w-[650px] max-h-[90vh] flex flex-col p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
              <h4 className="text-xs font-mono font-bold uppercase text-primary">
                Preview: {activeDocPreview.title}
              </h4>
              <button
                onClick={() => { setActiveDocPreview(null); setActiveDocPreviewUrls([]); }}
                className="text-mute hover:text-primary font-bold text-sm"
              >
                Close ×
              </button>
            </div>

            {/* Modal preview image */}
            <div className="bg-neutral-200 p-4 rounded flex justify-center border border-hairline max-h-[60vh] overflow-y-auto">
              <img
                src={activeDocPreviewUrls[previewPageIdx]}
                alt="page preview"
                className="max-w-full max-h-[50vh] shadow rounded border bg-white object-contain"
              />
            </div>

            {/* Pagination inside Modal */}
            {activeDocPreviewUrls.length > 1 && (
              <div className="flex items-center justify-center space-x-3 text-xs font-mono mt-4">
                <button
                  disabled={previewPageIdx === 0}
                  onClick={() => setPreviewPageIdx(p => Math.max(0, p - 1))}
                  className="px-2 py-1 border border-hairline bg-canvas hover:bg-canvas-soft rounded disabled:opacity-40 font-semibold"
                >
                  PREV
                </button>
                <span>
                  Page {previewPageIdx + 1} of {activeDocPreviewUrls.length}
                </span>
                <button
                  disabled={previewPageIdx >= activeDocPreviewUrls.length - 1}
                  onClick={() => setPreviewPageIdx(p => Math.min(activeDocPreviewUrls.length - 1, p + 1))}
                  className="px-2 py-1 border border-hairline bg-canvas hover:bg-canvas-soft rounded disabled:opacity-40 font-semibold"
                >
                  NEXT
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
