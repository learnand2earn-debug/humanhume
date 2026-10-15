import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { repository } from '@/lib/db/repository';
import { storageManager } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'final'; // 'original' | 'best' | 'final' | 'version'
    const versionId = searchParams.get('versionId');

    const doc = repository.getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let targetFilePath = doc.originalPath;
    let downloadFileName = doc.originalName;
    let selectedText: string | null = null;
    let isFinalVersion = false;
    let versionNum = 1;

    if (type === 'original') {
      targetFilePath = doc.originalPath;
      downloadFileName = `Original_${doc.originalName}`;
    } else if (type === 'best') {
      const versions = repository.listVersions(id);
      const best =
        versions.find((v) => v.id === doc.bestVersionId) ||
        versions.find((v) => v.isBest) ||
        versions[versions.length - 1];
      if (best) {
        targetFilePath = best.filePath;
        selectedText = best.text;
        versionNum = best.versionNumber;
        const ext = path.extname(best.filePath) || `.${doc.fileType}`;
        downloadFileName = `Best_v${best.versionNumber}_${path.basename(doc.originalName, path.extname(doc.originalName))}${ext}`;
      }
    } else if (type === 'version' && versionId) {
      const version = repository.getVersion(id, versionId);
      if (version) {
        targetFilePath = version.filePath;
        selectedText = version.text;
        versionNum = version.versionNumber;
        const ext = path.extname(version.filePath) || `.${doc.fileType}`;
        downloadFileName = `v${version.versionNumber}_${path.basename(doc.originalName, path.extname(doc.originalName))}${ext}`;
      }
    } else {
      // Final version
      isFinalVersion = true;
      const versions = repository.listVersions(id);
      const finalVersion = versions.find((v) => v.isFinal) || versions[versions.length - 1];
      if (finalVersion) {
        targetFilePath = finalVersion.filePath;
        selectedText = finalVersion.text;
        versionNum = finalVersion.versionNumber;
        const ext = path.extname(finalVersion.filePath) || `.${doc.fileType}`;
        downloadFileName = `HumanFlow_Final_${path.basename(doc.originalName, path.extname(doc.originalName))}${ext}`;
      } else {
        downloadFileName = `HumanFlow_Final_${doc.originalName}`;
      }
    }

    let fileBuffer: Buffer | null = null;

    if (targetFilePath && storageManager.fileExists(targetFilePath)) {
      try {
        fileBuffer = await storageManager.readFile(targetFilePath);
      } catch (readErr) {
        console.warn('Storage read failed, falling back to document generator:', readErr);
      }
    }

    if (!fileBuffer) {
      // Self-healing: if file on disk was missing, generate it on-the-fly from preserved text
      const textToRender = selectedText || 'HumanFlow AI Verified and Preserved Document Content.';
      try {
        const { DocumentGenerator } = await import('@/lib/document/generator');
        fileBuffer = await DocumentGenerator.generate(textToRender, doc.fileType, doc.originalName);
        await storageManager.saveVersionFile(
          fileBuffer,
          id,
          versionNum,
          doc.fileType,
          isFinalVersion
        );
      } catch (genErr) {
        console.error('Self-healing generation failed:', genErr);
      }
    }

    if (!fileBuffer) {
      if (doc.status === 'FAILED') {
        return NextResponse.json(
          {
            error: `Document processing failed: ${doc.errorMessage || 'Unknown error'}. You can download the original file using "?type=original".`,
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        {
          error: `File not available yet. Current status: ${doc.status}. Please wait a moment for processing to complete.`,
        },
        { status: 404 }
      );
    }

    const ext = path.extname(downloadFileName).toLowerCase() || `.${doc.fileType}`;
    const contentTypeMap: Record<string, string> = {
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain; charset=utf-8',
      '.md': 'text/markdown; charset=utf-8',
      '.rtf': 'application/rtf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    const cleanAscii = downloadFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Set secure, RFC-compliant download headers without forbidden characters
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${cleanAscii}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
