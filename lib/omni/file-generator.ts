import { Document, HeadingLevel, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import crypto from 'crypto';

export interface FileGenPayload {
  fileName: string;
  fileType: 'docx' | 'xlsx' | 'pdf' | 'html' | 'py' | 'tsx' | 'ts' | 'js' | 'json' | 'md' | 'csv' | 'txt';
  title?: string;
  content: string; // raw markdown/text or structured JSON
  dataRows?: Array<Record<string, unknown> | Array<unknown>>;
}

export interface GeneratedFileResponse {
  id: string;
  fileName: string;
  fileType: FileGenPayload['fileType'];
  sizeBytes: number;
  mimeType: string;
  base64Data: string;
  downloadUrl: string;
  summary: string;
}

// In-memory file cache for instant retrieval by ID
const fileCache = new Map<string, { buffer: Buffer; mimeType: string; fileName: string; createdAt: number }>();

export class OmniFileGenerator {
  /**
   * Generates a file in the requested format and caches it for downloading.
   */
  static async generateFile(payload: FileGenPayload): Promise<GeneratedFileResponse> {
    const fileId = `file_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    let buffer: Buffer;
    let mimeType: string;

    const ext = payload.fileType;
    let finalFileName = payload.fileName;
    if (!finalFileName.endsWith(`.${ext}`)) {
      finalFileName = `${finalFileName}.${ext}`;
    }

    switch (payload.fileType) {
      case 'docx':
        buffer = await this.createDocx(payload.content, payload.title || finalFileName);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;

      case 'xlsx':
        buffer = await this.createXlsx(payload.content, payload.dataRows);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case 'pdf':
        buffer = await this.createPdf(payload.content, payload.title || finalFileName);
        mimeType = 'application/pdf';
        break;

      case 'html':
        buffer = Buffer.from(this.createHtml(payload.content, payload.title || finalFileName), 'utf-8');
        mimeType = 'text/html; charset=utf-8';
        break;

      case 'json':
        try {
          const parsed = typeof payload.content === 'string' ? JSON.parse(payload.content) : payload.content;
          buffer = Buffer.from(JSON.stringify(parsed, null, 2), 'utf-8');
        } catch {
          buffer = Buffer.from(payload.content, 'utf-8');
        }
        mimeType = 'application/json';
        break;

      case 'csv':
        buffer = Buffer.from(this.createCsv(payload.content, payload.dataRows), 'utf-8');
        mimeType = 'text/csv; charset=utf-8';
        break;

      case 'py':
      case 'ts':
      case 'tsx':
      case 'js':
      case 'md':
      case 'txt':
      default:
        buffer = Buffer.from(payload.content, 'utf-8');
        mimeType = 'text/plain; charset=utf-8';
        break;
    }

    fileCache.set(fileId, {
      buffer,
      mimeType,
      fileName: finalFileName,
      createdAt: Date.now(),
    });

    const base64Data = buffer.toString('base64');
    const downloadUrl = `/api/omni/generate-file?fileId=${fileId}`;

    return {
      id: fileId,
      fileName: finalFileName,
      fileType: payload.fileType,
      sizeBytes: buffer.length,
      mimeType,
      base64Data,
      downloadUrl,
      summary: `Successfully generated ${finalFileName} (${(buffer.length / 1024).toFixed(1)} KB)`,
    };
  }

  static getCachedFile(fileId: string): { buffer: Buffer; mimeType: string; fileName: string } | null {
    const item = fileCache.get(fileId);
    if (!item) return null;
    return item;
  }

  // -------------------------------------------------------------
  // DOCX GENERATOR
  // -------------------------------------------------------------
  private static async createDocx(markdownText: string, title: string): Promise<Buffer> {
    const paragraphs: Paragraph[] = [];

    // Document Title Header
    paragraphs.push(
      new Paragraph({
        text: title.replace(/\.[^/.]+$/, ''),
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 },
      })
    );

    const lines = markdownText.split(/\r?\n/);
    let inCode = false;
    let codeAccumulator: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (line.startsWith('```')) {
        if (inCode) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: codeAccumulator.join('\n'),
                  font: 'Consolas',
                  size: 20,
                  color: '2D3748',
                }),
              ],
              spacing: { after: 200 },
            })
          );
          codeAccumulator = [];
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeAccumulator.push(rawLine);
        continue;
      }

      if (!line) {
        paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        continue;
      }

      if (line.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^#\s+/, ''),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 140 },
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
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24, // 12pt
                font: 'Calibri',
              }),
            ],
            spacing: { line: 360, after: 140 },
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

  // -------------------------------------------------------------
  // XLSX GENERATOR
  // -------------------------------------------------------------
  private static async createXlsx(
    content: string,
    dataRows?: Array<Record<string, unknown> | Array<unknown>>
  ): Promise<Buffer> {
    const wb = XLSX.utils.book_new();

    if (dataRows && dataRows.length > 0) {
      const isAoa = Array.isArray(dataRows[0]);
      const ws = isAoa
        ? XLSX.utils.aoa_to_sheet(dataRows as unknown[][])
        : XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    } else {
      // Parse markdown table or CSV lines from content
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const rows: string[][] = [];

      for (const line of lines) {
        if (line.includes('|')) {
          const cells = line
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c.length > 0 && !c.match(/^[-:]+$/));
          if (cells.length > 0) {
            rows.push(cells);
          }
        } else if (line.includes(',')) {
          rows.push(line.split(',').map((c) => c.trim()));
        } else {
          rows.push([line]);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['Title', 'Status', 'Date'], ['Project Plan', 'Active', new Date().toISOString()]]);
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // -------------------------------------------------------------
  // PDF GENERATOR
  // -------------------------------------------------------------
  private static async createPdf(markdownText: string, title: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          info: { Title: title, Author: 'OmniFlow AI' },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err: Error) => reject(err));

        // Header Title
        doc
          .font('Helvetica-Bold')
          .fontSize(22)
          .fillColor('#1E293B')
          .text(title.replace(/\.[^/.]+$/, ''), { align: 'left' });

        doc.moveDown(0.5);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#64748B')
          .text(`Generated by OmniFlow AI • ${new Date().toLocaleDateString()}`);

        doc.moveDown(1.5);
        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(1);

        const lines = markdownText.split(/\r?\n/);
        for (const rawLine of lines) {
          const line = rawLine.trim();

          if (!line) {
            doc.moveDown(0.4);
            continue;
          }

          if (line.startsWith('# ')) {
            doc.moveDown(0.8);
            doc.font('Helvetica-Bold').fontSize(16).fillColor('#0F172A').text(line.replace(/^#\s+/, ''));
            doc.moveDown(0.3);
          } else if (line.startsWith('## ')) {
            doc.moveDown(0.6);
            doc.font('Helvetica-Bold').fontSize(13).fillColor('#1E293B').text(line.replace(/^##\s+/, ''));
            doc.moveDown(0.2);
          } else if (line.startsWith('### ')) {
            doc.moveDown(0.4);
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#334155').text(line.replace(/^###\s+/, ''));
            doc.moveDown(0.2);
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.font('Helvetica').fontSize(10).fillColor('#334155').text(`•  ${line.replace(/^[-*]\s+/, '')}`, {
              indent: 15,
            });
            doc.moveDown(0.2);
          } else {
            doc.font('Helvetica').fontSize(10.5).fillColor('#334155').text(line, {
              lineGap: 3,
            });
            doc.moveDown(0.3);
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // -------------------------------------------------------------
  // HTML GENERATOR
  // -------------------------------------------------------------
  private static createHtml(content: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    pre, code { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-8 antialiased">
  <div class="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
    <header class="border-b border-slate-800 pb-6 mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-white tracking-tight">${title}</h1>
        <p class="text-xs text-slate-400 mt-1 font-mono">Generated by OmniFlow AI</p>
      </div>
      <span class="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-mono rounded-full border border-cyan-500/30">Ready to Use</span>
    </header>
    <main class="prose prose-invert max-w-none">
      ${content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}
    </main>
  </div>
</body>
</html>`;
  }

  // -------------------------------------------------------------
  // CSV GENERATOR
  // -------------------------------------------------------------
  private static createCsv(content: string, dataRows?: Array<Record<string, unknown> | Array<unknown>>): string {
    if (dataRows && dataRows.length > 0) {
      if (Array.isArray(dataRows[0])) {
        return (dataRows as unknown[][]).map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      } else {
        const headers = Object.keys(dataRows[0]);
        const lines = [headers.join(',')];
        for (const row of dataRows as Record<string, unknown>[]) {
          lines.push(headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
        }
        return lines.join('\n');
      }
    }
    return content;
  }
}
