import fs from 'fs';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber, PDFRef, PDFRawStream, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { Font as StdFont, FontNames, Encodings } from '@pdf-lib/standard-fonts';
import { compareMediaPreservation } from '../lib/document/native-verify';
import { runNaturalHumanizationTransform } from '../lib/humanizer/provider';
import { extractPdfPageData } from '../lib/document/pdf-native-humanizer';

function wrapTextToWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    let testWidth = 0;
    try {
      testWidth = font.widthOfTextAtSize(testLine, fontSize);
    } catch {
      testWidth = testLine.length * fontSize * 0.5;
    }
    if (testWidth <= maxWidth || !currentLine) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function matchStandardFont(fontKey: string, isBold: boolean, isItalic: boolean) {
  const lower = fontKey.toLowerCase();
  const isMono = /courier|mono|code|consolas/i.test(lower);
  const isSerif = /times|roman|serif|georgia|cambria/i.test(lower);

  if (isMono) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
    if (isBold) return StandardFonts.CourierBold;
    if (isItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (isSerif) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
    if (isBold) return StandardFonts.TimesRomanBold;
    if (isItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
  if (isBold) return StandardFonts.HelveticaBold;
  if (isItalic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

async function runTestOn(pdfPath: string) {
  console.log(`\n=== Testing hybrid replacement on: ${pdfPath} ===`);
  const buf = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();
  console.log(`Page count: ${pageCount}, original size: ${buf.length}`);

  const page = doc.getPage(0);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Sample Verified Hybrid Text Replacement', {
    x: 50,
    y: 800,
    size: 12,
    font,
    color: rgb(0.1, 0.1, 0.2),
  });

  const outBytes = await doc.save({ useObjectStreams: false });
  const outBuf = Buffer.from(outBytes);

  const media = await compareMediaPreservation(buf, outBuf, 'PDF');
  console.log(`Media preservation identical: ${media.identical}`);
  console.log(`Media inputImages: ${media.inputImages}, outputImages: ${media.outputImages}`);
  console.log(`Media notes:`, media.notes);
}

async function main() {
  await runTestOn('sample_test_with_image.pdf');
  await runTestOn('C:/Users/Admin/Desktop/Hunt.pdf');
}

main().catch(console.error);
