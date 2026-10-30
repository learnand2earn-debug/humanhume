import {NextRequest, NextResponse} from 'next/server';
import {getDocumentById} from '@/lib/db/store';
import {readBinaryFromPrivateStorage, storagePathFor} from '@/lib/storage';
import {
  buildPreservationAuditReportText,
  generatePreservationAuditReportPdf,
  generateRealPdfBinary,
} from '@/lib/document/pdf-exporter';

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  rtf: 'application/rtf',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
};

function sourceExtension(doc: {originalName: string; fileType: string}): string {
  const ext = (doc.originalName.split('.').pop() || '').toLowerCase();
  return ['pdf', 'docx', 'xlsx', 'rtf', 'txt', 'md'].includes(ext) ? ext : doc.fileType.toLowerCase();
}

function binaryResponse(
  buffer: Buffer,
  fileName: string,
  mime: string
): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Supports downloading:
 * - Original
 * - Draft (v1 Draft)
 * - Best Version
 * - Final Version
 * - Preservation & Masked Elements Summary Audit Report (target=report)
 *
 * Documents that were humanized inside their own container (nativeArtifact) are
 * returned as that container — the uploaded file with new words — so pictures,
 * fonts and positions are exactly the ones that were uploaded. Plain-text
 * formats (txt/md) return the text itself.
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
  const format = (searchParams.get('format') || 'pdf').toLowerCase(); // 'pdf' | 'docx' | 'txt' | 'md' | 'native'

  const baseName = doc.originalName.replace(/\.[^.]+$/, '');
  const srcExt = sourceExtension(doc);
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

  // In-place edited containers: hand back the real bytes, never a regeneration.
  const native = doc.nativeArtifact;
  if (native && native.layoutMode === 'IN_PLACE') {
    const wantsText = format === 'txt' || format === 'md';
    if (!wantsText) {
      const isOriginal = target === 'original';
      const virtualPath = isOriginal ? native.originalFilePath : native.filePath;
      const bytes =
        readBinaryFromPrivateStorage(virtualPath) ??
        readBinaryFromPrivateStorage(storagePathFor('final', doc.id, `Final_${doc.originalName}`).virtualPath);
      if (bytes && bytes.length > 0) {
        const prefix = isOriginal ? 'Original' : 'Final';
        return binaryResponse(
          bytes,
          `${prefix}_${doc.originalName}`,
          MIME_BY_EXT[srcExt] || 'application/octet-stream'
        );
      }
      return NextResponse.json(
        {
          error: `The humanized ${srcExt.toUpperCase()} for this document is no longer held by this server instance. Re-run the document to regenerate it; the app never rebuilds it from text, because that would replace your original pictures.`,
          documentId: doc.id,
          traceId: doc.traceId,
        },
        {status: 410}
      );
    }
  }

  let bodyText = doc.finalContent;
  let versionPrefix = 'Final';

  if (target === 'original' || target === 'draft') {
    bodyText = doc.originalContent;
    versionPrefix = doc.sourceModule === 'DOCUMENTATION_STUDIO' ? 'Draft' : 'Original';
    // A raw upload was kept as bytes: return those bytes for "Original".
    if (format === 'native') {
      const bytes = readBinaryFromPrivateStorage(storagePathFor('original', doc.id, doc.originalName).virtualPath);
      if (bytes && bytes.length > 0) {
        return binaryResponse(bytes, `Original_${doc.originalName}`, MIME_BY_EXT[srcExt] || 'application/octet-stream');
      }
    }
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

}
