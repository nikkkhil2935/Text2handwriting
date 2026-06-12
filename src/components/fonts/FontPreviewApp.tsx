import React, { useState } from 'react';
import { FONTS, CATEGORIES } from '../../lib/fonts';

export default function FontPreviewApp() {
  const [testPhrase, setTestPhrase] = useState('The quick brown fox jumps over the lazy dog. 1234567890');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [fontSize, setFontSize] = useState(24);
  const [lineHeight, setLineHeight] = useState(1.4);

  const filteredFonts = selectedCategory === 'all' 
    ? FONTS 
    : FONTS.filter(f => f.category === selectedCategory);

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Playground Controller Card */}
      <div className="border border-hairline bg-canvas rounded-lg p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-mono font-bold uppercase text-body mb-2">Test Sentence / Phrase Input</label>
          <textarea
            value={testPhrase}
            onChange={(e) => setTestPhrase(e.target.value)}
            placeholder="Type anything here to preview all fonts..."
            className="w-full h-16 border border-hairline bg-canvas text-ink p-3 rounded font-mono text-sm outline-none focus:border-hairline-strong resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="block font-semibold uppercase text-body mb-1.5">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field bg-canvas"
            >
              <option value="all">All Font Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-body mb-1">
              <span>Font Sizing</span>
              <span>{fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="48"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer mt-3"
            />
          </div>

          <div>
            <div className="flex justify-between text-body mb-1">
              <span>Line Height</span>
              <span>{lineHeight}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.2"
              step="0.1"
              value={lineHeight}
              onChange={(e) => setLineHeight(parseFloat(e.target.value))}
              className="w-full accent-primary bg-hairline h-1 rounded-lg cursor-pointer mt-3"
            />
          </div>
        </div>
      </div>

      {/* Fonts List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {filteredFonts.map(font => (
          <div 
            key={font.name} 
            className="border border-hairline bg-canvas rounded-lg p-5 flex flex-col gap-4 shadow-sm hover:shadow-md hover:border-hairline-strong transition-all"
          >
            {/* Header metadata */}
            <div className="flex items-center justify-between border-b border-hairline pb-2.5 text-[10px] font-mono text-mute">
              <span className="font-semibold text-primary">{font.family}</span>
              <span className="bg-canvas-soft-2 px-2 py-0.5 rounded text-body capitalize font-medium">{font.category}</span>
            </div>

            {/* Font Preview Render */}
            <div 
              className="flex-grow min-h-[100px] flex items-center justify-center p-3 rounded bg-canvas-soft-2/30 border border-hairline/50 overflow-hidden"
              style={{
                fontFamily: `"${font.family}", cursive, sans-serif`,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                wordBreak: 'break-word',
                textAlign: 'center'
              }}
            >
              {testPhrase || <span className="text-mute font-mono text-xs">Empty preview</span>}
            </div>

            {/* Quick action buttons */}
            <div className="flex justify-end pt-2 border-t border-hairline mt-auto">
              <a
                href={`/?font=${encodeURIComponent(font.family)}`}
                className="text-[10px] font-mono text-link hover:underline font-semibold flex items-center space-x-1"
              >
                <span>USE FONT IN CONVERTER</span>
                <span>→</span>
              </a>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
