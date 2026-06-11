import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

// Standard paper dimensions in PDF points (72 points = 1 inch)
export const PAPER_SIZES = {
  a4: { width: 595.27, height: 841.89, label: 'A4 (210 x 297 mm)' },
  letter: { width: 612, height: 792, label: 'Letter (8.5 x 11 in)' },
  legal: { width: 612, height: 1008, label: 'Legal (8.5 x 14 in)' }
};

export async function createPdfFromImages(
  pagesBuffers: ArrayBuffer[],
  paperSize: 'a4' | 'letter' | 'legal'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const dimensions = PAPER_SIZES[paperSize] || PAPER_SIZES.a4;

  for (const buffer of pagesBuffers) {
    const page = pdfDoc.addPage([dimensions.width, dimensions.height]);
    
    // Embed the PNG buffer
    const pngImage = await pdfDoc.embedPng(new Uint8Array(buffer));
    
    // Draw image to fill page
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: dimensions.width,
      height: dimensions.height,
    });
  }

  return await pdfDoc.save();
}

export async function createZipFromImages(
  pagesBuffers: ArrayBuffer[],
  filenamePrefix: string
): Promise<Blob> {
  const zip = new JSZip();
  const padDigits = Math.max(2, String(pagesBuffers.length).length);

  pagesBuffers.forEach((buffer, idx) => {
    const pageNum = String(idx + 1).padStart(padDigits, '0');
    const filename = `${filenamePrefix}-page-${pageNum}.png`;
    zip.file(filename, buffer);
  });

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    if (a.parentNode) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
