import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import { generateValidPngDiagramDataUrl } from '../lib/document/image-utils';

export function createSamplePdfWithImages(outputPath: string) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 46;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 54;

  const drawHeaderAndFooter = (pageNum: number) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Enterprise Technical Architecture Specification', marginX, 36);
    pdf.text(`Doc Ref: ETA-2026-X1 | Page ${pageNum}`, pageWidth - marginX, 36, { align: 'right' });

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.75);
    pdf.line(marginX, 42, pageWidth - marginX, 42);

    pdf.line(marginX, pageHeight - 34, pageWidth - marginX, pageHeight - 34);
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Confidential | Technical & Operational Agreement', marginX, pageHeight - 22);
    pdf.text(`Page ${pageNum}`, pageWidth - marginX, pageHeight - 22, { align: 'right' });
  };

  drawHeaderAndFooter(1);

  // Document Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Global Infrastructure & Security Architecture Agreement', marginX, cursorY);
  cursorY += 24;

  // Section 1
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text('1. Operational Protocol & Distributed Systems', marginX, cursorY);
  cursorY += 16;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(51, 65, 85);
  const p1 =
    'In order to facilitate the implementation of this agreement, both parties utilize standard cryptographic protocols. Subsequent to the initial verification, the engineering team is able to commence development operations. In the event that unforeseen delays occur, both parties endeavor to resolve disputes promptly.';
  const wrapped1 = pdf.splitTextToSize(p1, contentWidth);
  pdf.text(wrapped1, marginX, cursorY);
  cursorY += wrapped1.length * 14.5 + 16;

  // Figure 1
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Figure 1: Architectural Security Matrix', marginX, cursorY);
  cursorY += 12;

  // Diagram 1
  const diag1DataUrl = generateValidPngDiagramDataUrl({ variant: 'architecture', width: 560, height: 220 });
  const img1W = Math.min(contentWidth - 20, 380);
  const img1H = img1W / (560 / 220);
  pdf.addImage(diag1DataUrl, 'PNG', marginX + (contentWidth - img1W) / 2, cursorY, img1W, img1H);
  cursorY += img1H + 20;

  // Section 2
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text('2. Telemetry Analysis & Performance Metrics', marginX, cursorY);
  cursorY += 16;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(51, 65, 85);
  const p2 =
    'Furthermore, it is important to note that all proprietary data remains confidential across regional clusters. The organization conducts a comprehensive review on a daily basis to ensure seamless integration.';
  const wrapped2 = pdf.splitTextToSize(p2, contentWidth);
  pdf.text(wrapped2, marginX, cursorY);
  cursorY += wrapped2.length * 14.5 + 16;

  // Figure 2
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Figure 2: Performance Latency and Reliability Analysis', marginX, cursorY);
  cursorY += 12;

  // Diagram 2
  const diag2DataUrl = generateValidPngDiagramDataUrl({ variant: 'latency_chart', width: 560, height: 220 });
  const img2W = Math.min(contentWidth - 20, 380);
  const img2H = img2W / (560 / 220);
  pdf.addImage(diag2DataUrl, 'PNG', marginX + (contentWidth - img2W) / 2, cursorY, img2W, img2H);
  cursorY += img2H + 20;

  // Final paragraph
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(51, 65, 85);
  const p3 =
    'All operational metrics demonstrate robust resilience under load. Both parties confirm full compliance with all technical requirements specified herein.';
  const wrapped3 = pdf.splitTextToSize(p3, contentWidth);
  pdf.text(wrapped3, marginX, cursorY);

  const outBytes = Buffer.from(pdf.output('arraybuffer'));
  fs.writeFileSync(outputPath, outBytes);
  console.log(`Generated ${outputPath}, size: ${outBytes.length} bytes`);
  return outBytes;
}

if (require.main === module) {
  const target = path.join(process.cwd(), 'sample_test_with_image.pdf');
  createSamplePdfWithImages(target);
  const publicTarget = path.join(process.cwd(), 'public', 'sample_document_with_images.pdf');
  createSamplePdfWithImages(publicTarget);
}
