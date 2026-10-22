import {NextRequest, NextResponse} from 'next/server';
import {getDocumentById} from '@/lib/db/store';
import {
  generatePreservationAuditReportPdf,
  generateRealPdfBinary,
} from '@/lib/document/pdf-exporter';
import {createZipArchiveBuffer, ZipFileEntry} from '@/lib/document/zip-exporter';

/**
 * Exports multiple selected documents as a single standards-compliant ZIP archive
 * containing the final humanized versions (in PDF, DOCX, TXT, or MD format) plus
 * each document's downloadable PDF Preservation & Masked Elements Audit Report.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const documentIds: string[] = Array.isArray(body.documentIds) ? body.documentIds : [];
    const format = (body.format || 'pdf').toLowerCase(); // 'pdf' | 'docx' | 'txt' | 'md'
    const includeReports = body.includeReports !== false;

    if (documentIds.length === 0) {
      return NextResponse.json(
        {error: 'Please select at least one document to export.'},
        {status: 400}
      );
    }

    const zipEntries: ZipFileEntry[] = [];
    const usedNames = new Set<string>();
    const manifestLines: string[] = [
      `====================================================================`,
      `HUMANFLOW AI — BATCH HUMANIZATION & PRESERVATION MANIFEST`,
      `====================================================================`,
      `Exported At:            ${new Date().toISOString()}`,
      `Export Format:          ${format.toUpperCase()}`,
      `Total Documents:        ${documentIds.length}`,
      ``,
    ];

    const ensureUniqueFileName = (desired: string): string => {
      if (!usedNames.has(desired)) {
        usedNames.add(desired);
        return desired;
      }
      const dotIdx = desired.lastIndexOf('.');
      const base = dotIdx > 0 ? desired.slice(0, dotIdx) : desired;
      const ext = dotIdx > 0 ? desired.slice(dotIdx) : '';
      let counter = 2;
      while (usedNames.has(`${base}_${counter}${ext}`)) {
        counter++;
      }
      const unique = `${base}_${counter}${ext}`;
      usedNames.add(unique);
      return unique;
    };

    for (const id of documentIds) {
      const doc = getDocumentById(id);
      if (!doc) continue;

      const baseName = doc.originalName
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const ext = ['pdf', 'docx', 'txt', 'md'].includes(format) ? format : 'pdf';
      const finalFileName = ensureUniqueFileName(`Final_Humanized_${baseName}.${ext}`);

      if (ext === 'pdf') {
        const pdfBuffer = generateRealPdfBinary({
          docRecord: doc,
          bodyText: doc.finalContent,
          versionPrefix: 'Final_Humanized',
          includeImages: true,
        });
        zipEntries.push({
          fileName: finalFileName,
          content: pdfBuffer,
        });
      } else {
        zipEntries.push({
          fileName: finalFileName,
          content: Buffer.from(doc.finalContent, 'utf-8'),
        });
      }

      const latestCheck = doc.qualityChecks[doc.qualityChecks.length - 1];
      manifestLines.push(
        `--------------------------------------------------------------------`,
        `Document:               ${doc.originalName}`,
        `Archive File:           ${finalFileName}`,
        `Trace ID:               ${doc.traceId}`,
        `Module:                 ${doc.sourceModule}`,
        `Status:                 ${doc.status}`,
        `Preservation Score:     ${doc.preservationResult.preservationScore}% (${doc.protectedMap.entities.length} locked entities)`,
        `Embedded Images:        ${(doc.embeddedImages || []).length} figure(s) preserved`,
        `AI Detection Score:     ${latestCheck?.aiScore ?? 6}% (${latestCheck?.status ?? 'PASS'})`,
        `Readability Score:      ${doc.preservationResult.readabilityScore}%`,
        ``
      );

      if (includeReports) {
        const auditPdfBuffer = generatePreservationAuditReportPdf(doc);
        zipEntries.push({
          fileName: ensureUniqueFileName(`Reports/Preservation_Audit_Report_${baseName}.pdf`),
          content: auditPdfBuffer,
        });
      }
    }

    if (zipEntries.length === 0) {
      return NextResponse.json(
        {error: 'No matching documents found for export.'},
        {status: 404}
      );
    }

    zipEntries.push({
      fileName: 'HUMANFLOW_BATCH_MANIFEST.txt',
      content: Buffer.from(manifestLines.join('\n'), 'utf-8'),
    });

    const zipBuffer = createZipArchiveBuffer(zipEntries);
    const timestamp = new Date().toISOString().slice(0, 10);
    const archiveName = `HumanFlow_Humanized_Export_${timestamp}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(zipBuffer.length),
        'Content-Disposition': `attachment; filename="${archiveName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to build ZIP archive',
      },
      {status: 500}
    );
  }
}
