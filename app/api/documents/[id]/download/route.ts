import {NextRequest, NextResponse} from 'next/server';
import {getDocumentById} from '@/lib/db/store';
import {
  buildPreservationAuditReportText,
  generatePreservationAuditReportPdf,
  generateRealPdfBinary,
} from '@/lib/document/pdf-exporter';

/**
 * Supports downloading:
 * - Original
 * - Draft (v1 Draft)
 * - Best Version
 * - Final Version
 * - Preservation & Masked Elements Summary Audit Report (target=report)
 * in PDF (real binary), DOCX, TXT, or MD formats.
 */
export async function GET(
  req: NextRequest,
  context: {params: Promise<{id: string}>}
) {
  const {id} = await context.params;
  const doc = getDocumentById(id);
  if (!doc) {
    return NextResponse.json({error: 'Document not found'}, {status: 404});
  }

  const {searchParams} = new URL(req.url);
  const target = (searchParams.get('target') || 'final').toLowerCase(); // 'original' | 'draft' | 'best' | 'final' | 'report'
  const format = (searchParams.get('format') || 'pdf').toLowerCase(); // 'pdf' | 'docx' | 'txt' | 'md'

  const baseName = doc.originalName.replace(/\.[^.]+$/, '');
  const ext = ['docx', 'pdf', 'txt', 'md'].includes(format) ? format : 'pdf';

  // Dedicated Preservation Score & Masked Elements PDF Audit Summary Report
  if (target === 'report' || target === 'audit') {
    if (ext === 'pdf') {
      const auditPdfBuffer = generatePreservationAuditReportPdf(doc);
      const auditFileName = `Preservation_Audit_Report_${baseName}.pdf`;
      return new NextResponse(new Uint8Array(auditPdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(auditPdfBuffer.length),
          'Content-Disposition': `attachment; filename="${auditFileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const reportText = buildPreservationAuditReportText(doc);
    return new NextResponse(reportText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="Preservation_Audit_Report_${baseName}.${ext}"`,
      },
    });
  }

  let bodyText = doc.finalContent;
  let versionPrefix = 'Final';

  if (target === 'original' || target === 'draft') {
    bodyText = doc.originalContent;
    versionPrefix = doc.sourceModule === 'DOCUMENTATION_STUDIO' ? 'Draft' : 'Original';
  } else if (target === 'best') {
    const nonOrig = doc.versions.filter((v) => v.versionNumber > 0);
    const best =
      nonOrig.sort((a, b) => b.qualityScore - a.qualityScore)[0] ||
      doc.versions[doc.versions.length - 1];
    bodyText = best?.content || doc.finalContent;
    versionPrefix = 'Best_Version';
  }

  const downloadFileName = `${versionPrefix}_${baseName}.${ext}`;

  // When format === 'pdf', generate a real, non-corrupt PDF binary with preserved layout & embedded images
  if (ext === 'pdf') {
    const pdfBuffer = generateRealPdfBinary({
      docRecord: doc,
      bodyText,
      versionPrefix,
      includeImages: true,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
        'Content-Disposition': `attachment; filename="${downloadFileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return new NextResponse(bodyText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${downloadFileName}"`,
    },
  });
}
