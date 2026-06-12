// Web Worker for Text-to-Handwriting Rendering

// Pseudo-random number generator (mulberry32) for consistency seed
function createRandom(seed) {
  let s = seed || Math.floor(Math.random() * 1000000);
  return function() {
    let t = s += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const loadedFonts = new Set();

async function loadFontInWorker(name, url) {
  const cacheKey = `${name}:${url}`;
  if (loadedFonts.has(cacheKey)) {
    return true;
  }
  try {
    if (typeof FontFace === 'undefined' || typeof self.fonts === 'undefined') {
      console.warn(`FontFace or self.fonts is not supported in this worker context. Cannot register ${name}.`);
      return true; // proceed anyway, hope browser has it cached or falls back
    }
    const font = new FontFace(name, `url(${url})`);
    const loadedFont = await font.load();
    self.fonts.add(loadedFont);
    loadedFonts.add(cacheKey);
    return true;
  } catch (err) {
    console.error(`Worker failed to load font ${name} from ${url}:`, err);
    return false;
  }
}

self.onmessage = async function(e) {
  const {
    text,
    fontName,
    fontUrl,
    paperStyle,
    gridSize = 30, // in px
    inkColor = '#0000ff', // blue by default
    inkType = 'ballpoint', // ballpoint | fountain | pencil
    fontSize = 20, // in px
    lineHeight = 1.4,
    wordSpacing = 0, // offset in px
    letterSpacing = 0, // offset in px
    alignment = 'left', // left | center | right
    margins = { top: 60, bottom: 60, left: 60, right: 60 },
    realism = {
      messiness: 1.0, // multiplier
      rotation: 2.0, // max rotation in degrees
      vJitter: 1.5, // max vertical jitter in px
      hJitter: 0.8, // max horizontal jitter in px
      baselineDrift: 1.2, // max baseline drift per line in px
      pressureVariation: 0.15, // opacity deviation
      smudge: false,
      seed: 12345
    },
    paperWidth = 800, // canvas size
    paperHeight = 1130, // A4 ratio (~1.41)
    pageHeader = '',
    pageFooter = '',
    backgroundImageBitmap = null, // Custom paper background
    dpiMultiplier = 1.0, // for high-res exports
    elements = [],
    isBold = false,
    isItalic = false,
    isUnderline = false,
    customFonts = [] // array of { name, buffer }
  } = e.data;

  // 1. Ensure font is loaded
  let fontLoaded = false;
  if (customFonts && customFonts.length > 0) {
    const customFont = customFonts.find(cf => cf.name === fontName);
    if (customFont) {
      try {
        const cacheKey = `custom:${customFont.name}`;
        if (!loadedFonts.has(cacheKey)) {
          const font = new FontFace(customFont.name, customFont.buffer);
          const loadedFont = await font.load();
          self.fonts.add(loadedFont);
          loadedFonts.add(cacheKey);
        }
        fontLoaded = true;
      } catch (err) {
        console.error(`Worker failed to load custom font ${customFont.name}:`, err);
      }
    }
  }

  if (!fontLoaded && fontName && fontUrl) {
    const ok = await loadFontInWorker(fontName, fontUrl);
    if (!ok) {
      self.postMessage({ type: 'error', message: `Font load failure: ${fontName}` });
      return;
    }
  }

  // Set up Random number generator
  const rand = createRandom(realism.seed);

  // Apply DPI multiplier to dimensions
  const scale = dpiMultiplier || 1.0;
  const w = paperWidth * scale;
  const h = paperHeight * scale;
  const mTop = margins.top * scale;
  const mBottom = margins.bottom * scale;
  const mLeft = margins.left * scale;
  const mRight = margins.right * scale;
  const fSize = fontSize * scale;
  const lHeight = fSize * lineHeight;
  const wSpace = wordSpacing * scale;
  const lSpace = letterSpacing * scale;

  const lineStep = paperStyle === 'plain'
    ? (fSize * lineHeight)
    : (gridSize * scale || 30 * scale);

  // Set up virtual canvas to measure text wrapping
  const measureCanvas = new OffscreenCanvas(100, 100);
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fSize}px "${fontName}"`;

  // 2. Wrap text into lines & paginate
  const paragraphs = text.split('\n');
  const pages = [];
  let currentPageLines = [];

  const printableWidth = w - mLeft - mRight;
  const printableHeight = h - mTop - mBottom;
  const maxLinesPerPage = Math.floor(printableHeight / lineStep);

  // Pagination loop
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    
    // Check manual page break
    if (para.trim() === '---page break---') {
      if (currentPageLines.length > 0) {
        pages.push(currentPageLines);
        currentPageLines = [];
      }
      continue;
    }

    if (para === '') {
      currentPageLines.push({ type: 'empty' });
      if (currentPageLines.length >= maxLinesPerPage) {
        pages.push(currentPageLines);
        currentPageLines = [];
      }
      continue;
    }

    const words = para.split(' ');
    let currentLineWords = [];
    let currentLineWidth = 0;

    for (let j = 0; j < words.length; j++) {
      const word = words[j];
      const wordMetrics = measureCtx.measureText(word);
      const spaceMetrics = measureCtx.measureText(' ');
      
      const isComplex = /[^\u0000-\u024F\u2000-\u206F]/.test(word);
      const wordWidth = isComplex ? wordMetrics.width : wordMetrics.width + (word.length - 1) * lSpace;
      const spaceWidth = spaceMetrics.width + wSpace;

      const addedWidth = currentLineWords.length === 0 ? wordWidth : spaceWidth + wordWidth;

      if (currentLineWidth + addedWidth <= printableWidth) {
        currentLineWords.push(word);
        currentLineWidth += addedWidth;
      } else {
        // Line wrap
        if (currentLineWords.length > 0) {
          currentPageLines.push({ type: 'text', words: currentLineWords, width: currentLineWidth });
        }
        
        currentLineWords = [word];
        currentLineWidth = wordWidth;

        // Check if page needs to break
        if (currentPageLines.length >= maxLinesPerPage) {
          pages.push(currentPageLines);
          currentPageLines = [];
        }
      }
    }

    if (currentLineWords.length > 0) {
      currentPageLines.push({ type: 'text', words: currentLineWords, width: currentLineWidth });
    }

    // Paragraph spacing (add empty line or spacer)
    if (currentPageLines.length >= maxLinesPerPage) {
      pages.push(currentPageLines);
      currentPageLines = [];
    }
  }

  if (currentPageLines.length > 0) {
    pages.push(currentPageLines);
  }
  
  if (pages.length === 0) {
    pages.push([{ type: 'empty' }]);
  }

  // 3. Render pages
  const renderedPagesBuffers = [];

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const lines = pages[pageIdx];
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');

    // Make canvas smooth
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // A. Draw background / paper styling
    drawPaperBackground(ctx, w, h, paperStyle, mLeft, mRight, mTop, mBottom, gridSize * scale, scale, backgroundImageBitmap);

    // B. Draw Header
    if (pageHeader) {
      ctx.save();
      ctx.font = `${fSize * 0.7}px "${fontName}"`;
      ctx.fillStyle = inkColor;
      ctx.globalAlpha = 0.8;
      ctx.fillText(pageHeader, mLeft, mTop - fSize * 0.8);
      ctx.restore();
    }

    // C. Draw Footer (page numbering optionally formatted)
    if (pageFooter) {
      ctx.save();
      ctx.font = `${fSize * 0.7}px "${fontName}"`;
      ctx.fillStyle = inkColor;
      ctx.globalAlpha = 0.8;
      const formattedFooter = pageFooter
        .replace(/{page}/g, String(pageIdx + 1))
        .replace(/{pages}/g, String(pages.length));
      
      const footMetrics = ctx.measureText(formattedFooter);
      ctx.fillText(formattedFooter, w - mRight - footMetrics.width, h - mBottom + fSize * 1.2);
      ctx.restore();
    }

    // D. Render lines - align text baseline to paper lines
    ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fSize}px "${fontName}"`;
    ctx.textBaseline = 'alphabetic';

    const firstLineY = mTop + lineStep;
    let currentY = firstLineY;

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      if (line.type === 'empty') {
        currentY += lineStep;
        continue;
      }

      const words = line.words;
      let startX = mLeft;

      // Handle alignment
      if (alignment === 'center') {
        startX = mLeft + (printableWidth - line.width) / 2;
      } else if (alignment === 'right') {
        startX = w - mRight - line.width;
      }

      // Render line with baseline drift
      const lineDriftMax = realism.baselineDrift * realism.messiness * scale;
      // Linear drift across the line (e.g. rising or falling)
      const lineAngleDrift = (rand() - 0.5) * lineDriftMax * 2; 

      let currentX = startX;

      for (let wIdx = 0; wIdx < words.length; wIdx++) {
        const word = words[wIdx];
        
        // Add word spacing if not first word
        if (wIdx > 0) {
          const spaceMetrics = ctx.measureText(' ');
          currentX += spaceMetrics.width + wSpace;
        }

        const isComplex = /[^\u0000-\u024F\u2000-\u206F]/.test(word);

        if (isComplex) {
          // Render the entire word as a single shaped unit to preserve Devanagari/Hindi ligatures & combining marks
          const wordMetrics = ctx.measureText(word);

          // Realism calculations for the entire word
          const wordRot = (rand() - 0.5) * realism.rotation * realism.messiness * (Math.PI / 180);
          const vJitter = (rand() - 0.5) * realism.vJitter * realism.messiness * scale;
          const hJitter = (rand() - 0.5) * realism.hJitter * realism.messiness * scale;
          const pressure = 1.0 - (rand() * realism.pressureVariation * realism.messiness);

          const progress = (currentX - mLeft) / printableWidth;
          const cumulativeDrift = progress * lineAngleDrift;

          ctx.save();
          ctx.fillStyle = inkColor;
          applyInkType(ctx, inkType, pressure);

          const drawX = currentX + hJitter;
          const drawY = currentY + vJitter + cumulativeDrift;

          ctx.translate(drawX + wordMetrics.width / 2, drawY - fSize / 3);
          ctx.rotate(wordRot);
          ctx.fillText(word, -wordMetrics.width / 2, fSize / 3);
          
          if (isUnderline) {
            ctx.beginPath();
            ctx.moveTo(-wordMetrics.width / 2, fSize / 3 + 2 * scale);
            ctx.lineTo(wordMetrics.width / 2, fSize / 3 + 2 * scale);
            ctx.strokeStyle = inkColor;
            ctx.lineWidth = 1.2 * scale;
            ctx.stroke();
          }

          ctx.restore();

          currentX += wordMetrics.width;
        } else {
          // Character-by-character rendering for standard Latin/English scripts
          for (let charIdx = 0; charIdx < word.length; charIdx++) {
            const char = word[charIdx];
            const charMetrics = ctx.measureText(char);

            // Realism calculations
            const charRot = (rand() - 0.5) * realism.rotation * realism.messiness * (Math.PI / 180);
            const vJitter = (rand() - 0.5) * realism.vJitter * realism.messiness * scale;
            const hJitter = (rand() - 0.5) * realism.hJitter * realism.messiness * scale;
            const pressure = 1.0 - (rand() * realism.pressureVariation * realism.messiness);

            // Baseline drift based on progress across the page
            const progress = (currentX - mLeft) / printableWidth;
            const cumulativeDrift = progress * lineAngleDrift;

            ctx.save();
            ctx.fillStyle = inkColor;

            // Apply opacity based on pressure and ink preset
            applyInkType(ctx, inkType, pressure);

            // Position character
            const drawX = currentX + hJitter;
            const drawY = currentY + vJitter + cumulativeDrift;

            // Translate, rotate, and draw
            ctx.translate(drawX + charMetrics.width / 2, drawY - fSize / 3);
            ctx.rotate(charRot);
            ctx.fillText(char, -charMetrics.width / 2, fSize / 3);
            
            if (isUnderline) {
              ctx.beginPath();
              ctx.moveTo(-charMetrics.width / 2, fSize / 3 + 2 * scale);
              ctx.lineTo(charMetrics.width / 2, fSize / 3 + 2 * scale);
              ctx.strokeStyle = inkColor;
              ctx.lineWidth = 1.2 * scale;
              ctx.stroke();
            }

            ctx.restore();

            // Advance cursor
            currentX += charMetrics.width + lSpace;
          }
        }
      }

      currentY += lineStep;
    }

    // E. Draw Custom Elements (Images, Formulas, Tables, Sketches)
    const pageElements = elements ? elements.filter(el => el.pageIndex === pageIdx) : [];

    for (const el of pageElements) {
      const elX = (el.x / 100) * w;
      const elY = (el.y / 100) * h;
      const elW = (el.width / 100) * w;
      const elH = (el.height / 100) * h;

      if (el.type === 'sketch' && el.strokes) {
        ctx.save();
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = 2 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        applyInkType(ctx, inkType, 0.95);

        for (const stroke of el.strokes) {
          const sx = (stroke.x / 100) * w;
          const sy = (stroke.y / 100) * h;
          if (stroke.type === 'start') {
            ctx.beginPath();
            ctx.moveTo(sx, sy);
          } else if (stroke.type === 'move') {
            ctx.lineTo(sx, sy);
            ctx.stroke();
          }
        }
        ctx.restore();
      } else if (el.bitmap) {
        ctx.save();
        ctx.drawImage(el.bitmap, elX, elY, elW, elH);
        ctx.restore();
      }
    }

    // F. Smudge/Grain filter overlay
    if (realism.smudge) {
      applySmudgeFilter(ctx, w, h, rand, scale);
    }

    // Convert canvas to Blob
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const buffer = await blob.arrayBuffer();
    renderedPagesBuffers.push(buffer);
  }

  self.postMessage({ type: 'success', pages: renderedPagesBuffers }, renderedPagesBuffers);
};

// Paper drawer function
function drawPaperBackground(ctx, w, h, style, mLeft, mRight, mTop, mBottom, gSize, scale, backgroundImageBitmap) {
  ctx.save();
  
  // Base background color (near white, Vercel-like canvas soft)
  if (style === 'legal') {
    ctx.fillStyle = '#fdfbbe'; // Legal pad yellow
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillRect(0, 0, w, h);

  if (backgroundImageBitmap) {
    // Custom paper upload
    ctx.drawImage(backgroundImageBitmap, 0, 0, w, h);
    ctx.restore();
    return;
  }

  ctx.strokeStyle = '#c8c8c8'; // darker grey for visible paper lines
  ctx.lineWidth = 1.5 * scale;

  if (style === 'single-ruled' || style === 'a4-notebook' || style === 'legal') {
    // Draw horizontal lines
    const startY = mTop;
    const endY = h - mBottom;
    const step = gSize || 30 * scale;

    ctx.beginPath();
    for (let y = startY; y <= endY; y += step) {
      ctx.moveTo(mLeft, y);
      ctx.lineTo(w - mRight, y);
    }
    ctx.stroke();

    // Draw vertical margin line (usually red/pink on notebooks)
    ctx.beginPath();
    ctx.strokeStyle = '#ff8a8a'; // more visible red margin
    ctx.lineWidth = 2 * scale;
    ctx.moveTo(mLeft, 0);
    ctx.lineTo(mLeft, h);
    ctx.stroke();

    // Legal pad has double red margin
    if (style === 'legal') {
      ctx.beginPath();
      ctx.moveTo(mLeft + 4 * scale, 0);
      ctx.lineTo(mLeft + 4 * scale, h);
      ctx.stroke();
    }
  } else if (style === 'double-ruled') {
    // Draw double guidelines (common for children/calligraphy)
    const startY = mTop;
    const endY = h - mBottom;
    const step = gSize || 45 * scale;
    const innerStep = step * 0.35;

    ctx.beginPath();
    for (let y = startY; y <= endY; y += step) {
      // Top guideline (solid light blue/grey)
      ctx.strokeStyle = '#b8cce8';
      ctx.moveTo(mLeft, y);
      ctx.lineTo(w - mRight, y);
      
      // Middle baseline (solid grey)
      ctx.strokeStyle = '#aaaaaa';
      ctx.moveTo(mLeft, y + innerStep);
      ctx.lineTo(w - mRight, y + innerStep);
      
      // Bottom guideline (solid light blue/grey)
      ctx.strokeStyle = '#b8cce8';
      ctx.moveTo(mLeft, y + innerStep * 2);
      ctx.lineTo(w - mRight, y + innerStep * 2);
    }
    ctx.stroke();

    // Margin
    ctx.beginPath();
    ctx.strokeStyle = '#ff8a8a';
    ctx.lineWidth = 2 * scale;
    ctx.moveTo(mLeft, 0);
    ctx.lineTo(mLeft, h);
    ctx.stroke();
  } else if (style === 'graph') {
    // Draw grids
    const step = gSize || 30 * scale;

    ctx.beginPath();
    // vertical lines
    for (let x = mLeft; x <= w - mRight; x += step) {
      ctx.moveTo(x, mTop);
      ctx.lineTo(x, h - mBottom);
    }
    // horizontal lines
    for (let y = mTop; y <= h - mBottom; y += step) {
      ctx.moveTo(mLeft, y);
      ctx.lineTo(w - mRight, y);
    }
    ctx.stroke();
  } else if (style === 'dot-grid') {
    // Draw dots
    const step = gSize || 30 * scale;
    ctx.fillStyle = '#a3a3a3';

    for (let x = mLeft; x <= w - mRight; x += step) {
      for (let y = mTop; y <= h - mBottom; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (style === 'a4-notebook') {
    // A4 notebook has horizontal ruling + extra top margin bounding space
    const startY = mTop + 40 * scale; // header space
    const endY = h - mBottom;
    const step = gSize || 30 * scale;

    // Draw header divider line
    ctx.beginPath();
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2 * scale;
    ctx.moveTo(mLeft, startY);
    ctx.lineTo(w - mRight, startY);
    ctx.stroke();

    // Draw horizontal lines
    ctx.beginPath();
    ctx.strokeStyle = '#c8c8c8';
    ctx.lineWidth = 1.5 * scale;
    for (let y = startY + step; y <= endY; y += step) {
      ctx.moveTo(mLeft, y);
      ctx.lineTo(w - mRight, y);
    }
    ctx.stroke();

    // Draw red margin line
    ctx.beginPath();
    ctx.strokeStyle = '#ff8a8a';
    ctx.lineWidth = 2 * scale;
    ctx.moveTo(mLeft, 0);
    ctx.lineTo(mLeft, h);
    ctx.stroke();
  }

  ctx.restore();
}

function applyInkType(ctx, type, pressure) {
  if (type === 'fountain') {
    // Fountain pen: slightly bleeds, varying opacity, thicker stroke
    ctx.globalAlpha = pressure * 0.98;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 0.5; // slight feathering
  } else if (type === 'pencil') {
    // Pencil: lighter gray tint, textured
    ctx.globalAlpha = pressure * 0.75;
    ctx.shadowBlur = 0;
  } else {
    // Ballpoint: standard pen
    ctx.globalAlpha = pressure * 0.95;
    ctx.shadowBlur = 0;
  }
}

function applySmudgeFilter(ctx, w, h, rand, scale) {
  ctx.save();
  // Draw subtle smudge spots
  const numSmudges = 4;
  ctx.fillStyle = '#a3a3a3';
  
  for (let i = 0; i < numSmudges; i++) {
    const sx = rand() * w;
    const sy = rand() * h;
    const radius = (20 + rand() * 40) * scale;
    const alpha = 0.01 + rand() * 0.02;

    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
    grad.addColorStop(0, `rgba(163, 163, 163, ${alpha})`);
    grad.addColorStop(1, 'rgba(163, 163, 163, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw very faint graphite noise/smudge across canvas
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 40) { // check every 10 pixels for speed
    const noise = (rand() - 0.5) * 5; // tiny noise
    data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
    data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise)); // G
    data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise)); // B
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.restore();
}
