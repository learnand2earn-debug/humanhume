import { Document, HeadingLevel, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import crypto from 'crypto';
import path from 'path';
import { storageManager } from '../storage';

export type UniversalFileType =
  | 'docx'
  | 'xlsx'
  | 'pdf'
  | 'zip'
  | 'svg'
  | 'html'
  | 'css'
  | 'json'
  | 'xml'
  | 'yaml'
  | 'yml'
  | 'csv'
  | 'tsv'
  | 'sql'
  | 'py'
  | 'js'
  | 'ts'
  | 'tsx'
  | 'sh'
  | 'ps1'
  | 'rs'
  | 'go'
  | 'java'
  | 'cpp'
  | 'php'
  | 'md'
  | 'txt'
  | 'rtf'
  | 'tex'
  | 'dockerfile'
  | 'k8s'
  | string;

export interface FileGenPayload {
  fileName: string;
  fileType: UniversalFileType;
  title?: string;
  content: string; // raw content or structured text
  dataRows?: Array<Record<string, unknown> | Array<unknown>>;
  bundleFiles?: Array<{ name: string; content: string }>;
}

export interface GeneratedFileResponse {
  id: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  mimeType: string;
  base64Data: string;
  downloadUrl: string;
  summary: string;
  previewSnippet: string;
}

// In-memory cache with fallback to disk
const fileCache = new Map<string, { buffer: Buffer; mimeType: string; fileName: string; createdAt: number }>();

export class OmniFileGenerator {
  /**
   * Generates ANY file in the world and prepares it for instant download & preview.
   */
  static async generateFile(payload: FileGenPayload): Promise<GeneratedFileResponse> {
    const fileId = `file_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    let buffer: Buffer;
    let mimeType: string;

    const rawExt = (payload.fileType || 'txt').toLowerCase().replace(/^\./, '');
    let finalFileName = payload.fileName.trim();
    if (!finalFileName.toLowerCase().endsWith(`.${rawExt}`)) {
      finalFileName = `${finalFileName}.${rawExt}`;
    }
    const cleanFileName = finalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const content = payload.content || 'Generated content created by Omni Universal File Studio.';

    switch (rawExt) {
      case 'docx':
        buffer = await this.createDocx(content, payload.title || cleanFileName);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;

      case 'xlsx':
        buffer = await this.createXlsx(content, payload.dataRows);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case 'pdf':
        buffer = await this.createPdf(content, payload.title || cleanFileName);
        mimeType = 'application/pdf';
        break;

      case 'zip':
        buffer = await this.createZip(content, payload.bundleFiles, cleanFileName);
        mimeType = 'application/zip';
        break;

      case 'svg':
        buffer = Buffer.from(this.createSvg(content, payload.title || cleanFileName), 'utf-8');
        mimeType = 'image/svg+xml; charset=utf-8';
        break;

      case 'html':
        buffer = Buffer.from(this.createHtml(content, payload.title || cleanFileName), 'utf-8');
        mimeType = 'text/html; charset=utf-8';
        break;

      case 'css':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/css; charset=utf-8';
        break;

      case 'json':
        try {
          const parsed = typeof content === 'string' ? JSON.parse(content) : content;
          buffer = Buffer.from(JSON.stringify(parsed, null, 2), 'utf-8');
        } catch {
          buffer = Buffer.from(content, 'utf-8');
        }
        mimeType = 'application/json';
        break;

      case 'xml':
        buffer = Buffer.from(this.createXml(content), 'utf-8');
        mimeType = 'application/xml; charset=utf-8';
        break;

      case 'yaml':
      case 'yml':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/yaml; charset=utf-8';
        break;

      case 'csv':
        buffer = Buffer.from(this.createCsv(content, payload.dataRows), 'utf-8');
        mimeType = 'text/csv; charset=utf-8';
        break;

      case 'tsv':
        buffer = Buffer.from(this.createTsv(content, payload.dataRows), 'utf-8');
        mimeType = 'text/tab-separated-values; charset=utf-8';
        break;

      case 'sql':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'application/sql; charset=utf-8';
        break;

      case 'rtf':
        buffer = Buffer.from(this.createRtf(content), 'utf-8');
        mimeType = 'application/rtf';
        break;

      case 'py':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/x-python; charset=utf-8';
        break;

      case 'js':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'application/javascript; charset=utf-8';
        break;

      case 'ts':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'application/typescript; charset=utf-8';
        break;

      case 'tsx':
      case 'jsx':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/typescript-jsx; charset=utf-8';
        break;

      case 'sh':
        buffer = Buffer.from(content.startsWith('#!') ? content : `#!/usr/bin/env bash\n\n${content}`, 'utf-8');
        mimeType = 'application/x-sh; charset=utf-8';
        break;

      case 'ps1':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'application/x-powershell; charset=utf-8';
        break;

      case 'rs':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/rust; charset=utf-8';
        break;

      case 'go':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/x-go; charset=utf-8';
        break;

      case 'java':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/x-java-source; charset=utf-8';
        break;

      case 'cpp':
      case 'c':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/x-c; charset=utf-8';
        break;

      case 'php':
        buffer = Buffer.from(content.startsWith('<?php') ? content : `<?php\n\n${content}`, 'utf-8');
        mimeType = 'application/x-php; charset=utf-8';
        break;

      case 'tex':
        buffer = Buffer.from(this.createTex(content, payload.title || cleanFileName), 'utf-8');
        mimeType = 'application/x-tex; charset=utf-8';
        break;

      case 'dockerfile':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/plain; charset=utf-8';
        break;

      case 'md':
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/markdown; charset=utf-8';
        break;

      case 'txt':
      default:
        buffer = Buffer.from(content, 'utf-8');
        mimeType = 'text/plain; charset=utf-8';
        break;
    }

    // Cache in memory for instant delivery
    fileCache.set(fileId, {
      buffer,
      mimeType,
      fileName: cleanFileName,
      createdAt: Date.now(),
    });

    // Also persist in temporary storage for durable recovery
    try {
      await storageManager.saveVersionFile(buffer, fileId, 1, rawExt, true);
    } catch {
      // Continue serving even if disk save is skipped
    }

    const base64Data = buffer.toString('base64');
    const downloadUrl = `/api/omni/generate-file?fileId=${fileId}`;

    return {
      id: fileId,
      fileName: cleanFileName,
      fileType: rawExt,
      sizeBytes: buffer.length,
      mimeType,
      base64Data,
      downloadUrl,
      summary: `Compiled ${cleanFileName} (${(buffer.length / 1024).toFixed(1)} KB)`,
      previewSnippet: content.slice(0, 1500),
    };
  }

  static getCachedFile(fileId: string): { buffer: Buffer; mimeType: string; fileName: string } | null {
    const item = fileCache.get(fileId);
    if (!item) return null;
    return item;
  }

  // -------------------------------------------------------------
  // ZIP GENERATOR (Multi-File Archive)
  // -------------------------------------------------------------
  private static async createZip(
    mainContent: string,
    bundleFiles?: Array<{ name: string; content: string }>,
    archiveName = 'project_archive.zip'
  ): Promise<Buffer> {
    const zip = new JSZip();

    if (bundleFiles && bundleFiles.length > 0) {
      for (const f of bundleFiles) {
        zip.file(f.name, f.content);
      }
    } else {
      // Create a sensible bundle structure
      const baseName = path.basename(archiveName, '.zip');
      zip.file(`README.md`, `# ${baseName}\n\nGenerated with HumanFlow Universal File Studio.\n\n${mainContent.slice(0, 500)}`);
      zip.file(`source.txt`, mainContent);
      zip.file(`config.json`, JSON.stringify({ name: baseName, version: '1.0.0', generatedAt: new Date().toISOString() }, null, 2));
    }

    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // -------------------------------------------------------------
  // SVG VECTOR GRAPHICS GENERATOR
  // -------------------------------------------------------------
  private static createSvg(content: string, title: string): string {
    const trimmed = content.trim();
    if (trimmed.startsWith('<svg') && trimmed.endsWith('</svg>')) {
      return trimmed;
    }
    // Wrap vector elements into a stunning modern SVG canvas
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="600" rx="24" fill="url(#bgGrad)" stroke="#334155" stroke-width="2" />
  
  <!-- Ambient Grid -->
  <g opacity="0.1" stroke="#38bdf8" stroke-width="1">
    <line x1="100" y1="0" x2="100" y2="600" />
    <line x1="200" y1="0" x2="200" y2="600" />
    <line x1="300" y1="0" x2="300" y2="600" />
    <line x1="400" y1="0" x2="400" y2="600" />
    <line x1="500" y1="0" x2="500" y2="600" />
    <line x1="600" y1="0" x2="600" y2="600" />
    <line x1="700" y1="0" x2="700" y2="600" />
    <line x1="0" y1="100" x2="800" y2="100" />
    <line x1="0" y1="200" x2="800" y2="200" />
    <line x1="0" y1="300" x2="800" y2="300" />
    <line x1="0" y1="400" x2="800" y2="400" />
    <line x1="0" y1="500" x2="800" y2="500" />
  </g>

  <!-- Header Badge -->
  <rect x="50" y="45" width="220" height="32" rx="16" fill="#06b6d4" fill-opacity="0.15" stroke="#06b6d4" stroke-opacity="0.4" />
  <text x="70" y="66" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="700" letter-spacing="1">OMNIFLOW VECTOR FORGE</text>

  <!-- Title Text -->
  <text x="50" y="125" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="28" font-weight="800" letter-spacing="-0.5">${title.replace(/\.[^/.]+$/, '')}</text>

  <!-- Center Decorative Artwork / Diagram -->
  <g transform="translate(400, 320)">
    <!-- Concentric glowing rings -->
    <circle r="140" fill="none" stroke="url(#accentGrad)" stroke-width="2" opacity="0.4" />
    <circle r="100" fill="none" stroke="#06b6d4" stroke-width="2" stroke-dasharray="8 6" opacity="0.6" />
    <circle r="60" fill="none" stroke="#ec4899" stroke-width="2" opacity="0.8" />
    <circle r="25" fill="url(#accentGrad)" filter="url(#glow)" />
    
    <!-- Dynamic Orbiting Nodes -->
    <circle cx="100" cy="0" r="8" fill="#38bdf8" filter="url(#glow)" />
    <circle cx="-100" cy="0" r="8" fill="#ec4899" filter="url(#glow)" />
    <circle cx="0" cy="140" r="6" fill="#a855f7" filter="url(#glow)" />
    <circle cx="0" cy="-140" r="6" fill="#06b6d4" filter="url(#glow)" />
  </g>

  <!-- Footer description -->
  <text x="50" y="540" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">${content.slice(0, 90).replace(/<[^>]*>/g, '')}</text>
  <text x="750" y="540" fill="#64748b" font-family="system-ui, sans-serif" font-size="11" text-anchor="end">SVG Scalable Vector Graphic 1.1</text>
</svg>`;
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
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
    } else {
      // Parse markdown tables, comma-separated or tab-separated lines
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
        } else if (line.includes('\t')) {
          rows.push(line.split('\t').map((c) => c.trim()));
        } else if (line.includes(',')) {
          rows.push(line.split(',').map((c) => c.trim()));
        } else {
          rows.push([line]);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['Item', 'Category', 'Value'], ['Initial Setup', 'Infrastructure', '100']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Overview');
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
          info: { Title: title, Author: 'OmniFlow Universal Studio' },
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
          .text(`Generated by OmniFlow Universal File Studio • ${new Date().toLocaleDateString()}`);

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
    const isFullDoc = content.includes('<!DOCTYPE') || content.includes('<html');
    if (isFullDoc) return content;

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
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 sm:p-10 antialiased">
  <div class="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
    <header class="border-b border-slate-800 pb-6 flex justify-between items-center flex-wrap gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">${title}</h1>
        <p class="text-xs text-slate-400 mt-1 font-mono">Generated by OmniFlow Universal File Studio</p>
      </div>
      <span class="px-3.5 py-1 bg-cyan-500/15 text-cyan-300 text-xs font-mono rounded-full border border-cyan-500/30">Ready to Deploy</span>
    </header>
    <main class="prose prose-invert max-w-none text-slate-200 leading-relaxed">
      ${content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}
    </main>
  </div>
</body>
</html>`;
  }

  // -------------------------------------------------------------
  // CSV & TSV GENERATORS
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

  private static createTsv(content: string, dataRows?: Array<Record<string, unknown> | Array<unknown>>): string {
    return this.createCsv(content, dataRows).replace(/,/g, '\t');
  }

  // -------------------------------------------------------------
  // XML GENERATOR
  // -------------------------------------------------------------
  private static createXml(content: string): string {
    const trimmed = content.trim();
    if (trimmed.startsWith('<?xml')) return trimmed;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<document created="${new Date().toISOString()}">\n  <content><![CDATA[${content}]]></content>\n</document>`;
  }

  // -------------------------------------------------------------
  // RTF GENERATOR
  // -------------------------------------------------------------
  private static createRtf(content: string): string {
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/\n/g, '\\par\n');
    return `{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}{\\f1\\froman\\fcharset0 Times New Roman;}}\n\\viewkind4\\uc1\\pard\\lang1033\\f0\\fs22\n${escaped}\n}`;
  }

  // -------------------------------------------------------------
  // LATEX GENERATOR
  // -------------------------------------------------------------
  private static createTex(content: string, title: string): string {
    const trimmed = content.trim();
    if (trimmed.includes('\\documentclass')) return trimmed;
    return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb}
\\usepackage{hyperref}

\\title{${title}}
\\author{OmniFlow Universal Studio}
\\date{\\today}

\\begin{document}
\\maketitle

${content}

\\end{document}`;
  }
}
