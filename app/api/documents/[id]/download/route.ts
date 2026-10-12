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

    if (type === 'original') {
      targetFilePath = doc.originalPath;
      downloadFileName = `[Original]_${doc.originalName}`;
    } else if (type === 'best') {
      const versions = repository.listVersions(id);
      const best = versions.find((v) => v.id === doc.bestVersionId) || versions.find((v) => v.isBest) || versions[versions.length - 1];
      if (best) {
        targetFilePath = best.filePath;
        const ext = path.extname(best.filePath);
        downloadFileName = `[Best_v${best.versionNumber}]_${path.basename(doc.originalName, path.extname(doc.originalName))}${ext}`;
      }
    } else if (type === 'version' && versionId) {
      const version = repository.getVersion(id, versionId);
      if (version) {
        targetFilePath = version.filePath;
        const ext = path.extname(version.filePath);
        downloadFileName = `[v${version.versionNumber}]_${path.basename(doc.originalName, path.extname(doc.originalName))}${ext}`;
      }
    } else {
      // Final version
      const versions = repository.listVersions(id);
      const finalVersion = versions.find((v) => v.isFinal) || versions[versions.length - 1];
      if (finalVersion) {
        targetFilePath = finalVersion.filePath;
        const ext = path.extname(finalVersion.filePath);
        downloadFileName = `[HumanFlow_Final]_${path.basename(doc.originalName, path.extname(doc.originalName))}${ext}`;
      }
    }

    if (!storageManager.fileExists(targetFilePath)) {
      return NextResponse.json(
        { error: 'File not available on disk yet. Processing may still be underway.' },
        { status: 404 }
      );
    }

    const fileBuffer = await storageManager.readFile(targetFilePath);

    const ext = path.extname(targetFilePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain; charset=utf-8',
      '.md': 'text/markdown; charset=utf-8',
      '.rtf': 'application/rtf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Set secure download headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
