import { NextRequest, NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';
import { DiffEngine } from '@/lib/document/diff';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = legalRepository.getDocument(id);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Get versions
    const versions = legalRepository.getVersions(id);
    const draftVersion = versions.find((v) => v.versionNumber === 1);
    const finalVersion = versions.find((v) => v.versionNumber === 4) || versions[versions.length - 1];
    const humanizedVersion = versions.find((v) => v.versionNumber === 2);

    // Compute diff between draft and final
    let diff = null;
    if (draftVersion && finalVersion) {
      diff = DiffEngine.compare(draftVersion.content, finalVersion.content);
    }

    return NextResponse.json({
      success: true,
      document: doc,
      versions,
      draftVersion,
      humanizedVersion,
      finalVersion,
      diff,
      report: doc.report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const doc = legalRepository.getDocument(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // If updating current content / manual edit:
    if (body.content) {
      const latestVer = doc.versions[doc.versions.length - 1];
      const newVersionNumber = (latestVer?.versionNumber || 4) + 1;

      doc.versions.push({
        id: `ver_${id}_v${newVersionNumber}_manual`,
        documentId: id,
        versionNumber: newVersionNumber,
        label: 'v4 Final',
        content: body.content,
        sections: body.sections || latestVer?.sections || [],
        createdAt: new Date().toISOString(),
      });
      doc.final_version_id = `ver_${id}_v${newVersionNumber}_manual`;
      doc.updated_at = new Date().toISOString();

      legalRepository.saveDocument(doc);
      legalRepository.addAuditLog({
        user: body.userId || 'user',
        action: 'EDIT_DOCUMENT_CONTENT',
        documentId: id,
        version: `v${newVersionNumber}`,
      });
    }

    if (body.status) {
      doc.status = body.status;
      legalRepository.saveDocument(doc);
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = legalRepository.deleteDocument(id);
    if (success) {
      legalRepository.addAuditLog({
        user: 'user',
        action: 'DELETE_LEGAL_DOCUMENT',
        documentId: id,
      });
    }
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
