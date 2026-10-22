import {NextRequest, NextResponse} from 'next/server';
import {validateUploadedFile, checkRateLimit} from '@/lib/security';
import {executeAutonomousDocumentPipeline} from '@/lib/queue/pipeline';
import {extractReadableTextFromBinaryBuffer} from '@/lib/document/image-utils';
import {extractPdfPageData} from '@/lib/document/pdf-native-humanizer';

export async function POST(req: NextRequest) {
  if (!checkRateLimit('upload-client', 60)) {
    return NextResponse.json(
      {error: 'Rate limit exceeded. Please wait a moment before uploading again.'},
      {status: 429}
    );
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let fileName = 'Uploaded-Document.docx';
    let fileSize = 0;
    let rawContent = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({error: 'No file provided in upload payload.'}, {status: 400});
      }
      const overrideName = formData.get('originalFileName');
      const overrideSize = Number(formData.get('originalFileSize') || 0);
      fileName = typeof overrideName === 'string' && overrideName.trim() ? overrideName : file.name;
      fileSize = overrideSize > 0 ? overrideSize : file.size;

      const validation = validateUploadedFile(fileName, fileSize, 50);
      if (!validation.valid || !validation.fileType) {
        return NextResponse.json(
          {
            error: validation.error,
            untouchedOriginal: true,
          },
          {status: 400}
        );
      }

      const arrayBuf = await file.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuf);

      // Extract clean readable text from DOCX/PDF/XLSX binary streams
      let extractedBinaryText = extractReadableTextFromBinaryBuffer(
        rawBuffer,
        validation.fileType
      );

      // Dedicated PDF stream decompressor fallback
      if ((!extractedBinaryText || extractedBinaryText.trim().length < 20) && validation.fileType === 'PDF') {
        try {
          const pages = extractPdfPageData(rawBuffer);
          const combined = pages.map((p) => p.rawText).filter(Boolean).join('\n\n');
          if (combined.trim().length > 20) {
            extractedBinaryText = combined;
          }
        } catch {
          // Keep best effort
        }
      }

      if (extractedBinaryText && extractedBinaryText.trim().length > 0) {
        rawContent = extractedBinaryText;
      } else if (validation.fileType === 'PDF' || validation.fileType === 'DOCX' || validation.fileType === 'XLSX') {
        rawContent = `# ${validation.sanitizedFileName.replace(/\.[^.]+$/, '')}\n\nThis document is a binary ${validation.fileType} file with embedded visual elements. The original file has been preserved intact in storage. For specialized page-by-page PDF reconstruction, use the dedicated PDF Humanizer studio tab.`;
      } else {
        rawContent = rawBuffer.subarray(0, Math.min(rawBuffer.length, 65536)).toString('utf-8');
      }

      const processedDoc = await executeAutonomousDocumentPipeline({
        fileName: validation.sanitizedFileName,
        fileType: validation.fileType,
        fileSize,
        rawContent,
        rawBuffer,
      });

      return NextResponse.json({
        success: true,
        document: processedDoc,
      });
    } else {
      const body = await req.json().catch(() => ({}));
      fileName = body.fileName || 'Document.txt';
      rawContent = body.content || '';
      fileSize = body.fileSize || Buffer.byteLength(rawContent, 'utf-8');
    }

    const validation = validateUploadedFile(fileName, fileSize, 50);
    if (!validation.valid || !validation.fileType) {
      return NextResponse.json(
        {
          error: validation.error,
          untouchedOriginal: true,
        },
        {status: 400}
      );
    }

    // Automatically run the complete 15-stage pipeline without requiring manual user intervention
    const processedDoc = await executeAutonomousDocumentPipeline({
      fileName: validation.sanitizedFileName,
      fileType: validation.fileType,
      fileSize,
      rawContent,
    });

    return NextResponse.json({
      success: true,
      document: processedDoc,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Unexpected upload processing failure',
      },
      {status: 500}
    );
  }
}
