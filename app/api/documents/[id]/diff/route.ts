import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { DiffEngine } from '@/lib/document/diff';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const versionId = searchParams.get('versionId');

    const doc = repository.getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const versions = repository.listVersions(id);
    const v0 = versions.find((v) => v.versionNumber === 0) || versions[0];

    let targetVersion = versions.find((v) => v.isFinal);
    if (versionId) {
      targetVersion = versions.find((v) => v.id === versionId) || targetVersion;
    }
    if (!targetVersion && versions.length > 1) {
      targetVersion = versions[versions.length - 1];
    }

    if (!v0 || !targetVersion) {
      return NextResponse.json({
        diff: null,
        message: 'Diff unavailable: not enough versions generated yet.',
      });
    }

    const diff = DiffEngine.compare(v0.text, targetVersion.text, {
      preservationScore: targetVersion.preservationScore ?? doc.preservationScore ?? 99,
      readabilityScore: targetVersion.readabilityScore ?? doc.readabilityScore ?? 75,
      aiCheckScore: targetVersion.checkerScore ?? doc.aiCheckScore ?? 8,
    });

    return NextResponse.json({
      diff,
      originalText: v0.text,
      humanizedText: targetVersion.text,
      versionLabel: targetVersion.label,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
