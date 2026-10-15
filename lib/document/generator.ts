import { SupportedFileType } from '../types';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import PDFDocument from 'pdfkit';

export class DocumentGenerator {
  /**
   * Generates a final output document in the target file format preserving
   * typography, headings, paragraphs, and structure.
   */
  static async generate(
    text: string,
    fileType: SupportedFileType,
    title = 'HumanFlow_Document'
  ): Promise<Buffer> {
    const safeText = text && typeof text === 'string' && text.trim().length > 0
      ? text
      : 'HumanFlow AI Processed Document\n\nPreserved content generated successfully.';

    switch (fileType) {
      case 'docx':
        return await this.generateDocx(safeText, title);

      case 'pdf':
        return await this.generatePdf(safeText, title);

      case 'txt':
        return Buffer.from(safeText, 'utf-8');

      case 'md':
        return Buffer.from(safeText, 'utf-8');

      case 'rtf':
        return this.generateRtf(safeText);

      case 'xlsx':
        return await this.generateXlsx(safeText);

      default:
        return Buffer.from(safeText, 'utf-8');
    }
  }

  private static async generateDocx(text: string, title: string): Promise<Buffer> {
    const lines = text.split(/\r?\n/);
    const paragraphs: Paragraph[] = [];

    // Title / Header paragraph
    paragraphs.push(
      new Paragraph({
        text: title.replace(/\.[^/.]+$/, ''),
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 },
      })
    );

    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: codeBuffer.join('\n'),
                  font: 'Courier New',
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            })
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(rawLine);
        continue;
      }

      if (!line) {
        paragraphs.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^#\s+/, ''),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 150 },
          })
        );
      } else if (line.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^##\s+/, ''),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        );
      } else if (line.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^###\s+/, ''),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 100 },
          })
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^[-*]\s+/, ''),
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        );
      } else {
        // Standard body paragraph
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24, // 12pt
                font: 'Calibri',
              }),
            ],
            spacing: { line: 360, after: 160 }, // 1.5 line spacing
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  private static generatePdf(text: string, title: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: title,
          Author: 'HumanFlow AI',
          Producer: 'HumanFlow AI Document Engine',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(title.replace(/\.[^/.]+$/, ''), { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text('Processed by HumanFlow AI — Quality Controlled & Preserved', { align: 'center' });
      doc.moveDown(1.5);
      doc.fillColor('#111827');

      const lines = text.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          doc.moveDown(0.5);
          continue;
        }

        if (line.startsWith('# ')) {
          doc.moveDown(0.8);
          doc.fontSize(16).font('Helvetica-Bold').text(line.replace(/^#\s+/, ''));
          doc.moveDown(0.3);
        } else if (line.startsWith('## ')) {
          doc.moveDown(0.6);
          doc.fontSize(13).font('Helvetica-Bold').text(line.replace(/^##\s+/, ''));
          doc.moveDown(0.3);
        } else if (line.startsWith('### ')) {
          doc.moveDown(0.4);
          doc.fontSize(11).font('Helvetica-Bold').text(line.replace(/^###\s+/, ''));
          doc.moveDown(0.2);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          doc.fontSize(10).font('Helvetica').text(`•  ${line.replace(/^[-*]\s+/, '')}`, {
            indent: 15,
            lineGap: 3,
          });
        } else {
          doc.fontSize(10.5).font('Helvetica').text(line, {
            lineGap: 4,
            align: 'justify',
          });
          doc.moveDown(0.4);
        }
      }

      doc.end();
    });
  }

  private static generateRtf(text: string): Buffer {
    // Generate valid RTF 1.5 document
    const escaped = text
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/\n/g, '\\par\n');

    const rtf = `{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}{\\f1\\froman\\fcharset0 Times New Roman;}}\n\\viewkind4\\uc1\\pard\\lang1033\\f0\\fs22\n${escaped}\n}`;
    return Buffer.from(rtf, 'utf-8');
  }

  private static async generateXlsx(text: string): Promise<Buffer> {
    const xlsx = await import('xlsx');
    const lines = text.split(/\r?\n/).filter(Boolean);
    const rows: string[][] = lines.map((line) => {
      if (line.includes('\t')) return line.split('\t');
      if (line.includes(',')) return line.split(',');
      return [line];
    });

    const worksheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Humanized Content');

    const buf = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  }
}
