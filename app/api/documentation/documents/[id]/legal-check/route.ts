import { NextRequest, NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';
import { LegalQualityChecker } from '@/lib/legal/quality-checker';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = legalRepository.getDocument(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const latestVersion = doc.versions[doc.versions.length - 1];
    if (!latestVersion) {
      return NextResponse.json({ success: false, error: 'Document has no versions' }, { status: 400 });
    }

    const docType = legalRepository.getDocumentType(doc.document_type.toLowerCase().replace(/\s+/g, '-')) ||
      legalRepository.listDocumentTypes().find((dt) => dt.name.toLowerCase() === doc.document_type.toLowerCase());

    const templates = legalRepository.listTemplates({ documentType: doc.document_type });
    const template = templates[0] || null;

    const checkResult = LegalQualityChecker.evaluate(
      latestVersion.sections,
      latestVersion.content,
      docType || {
        id: 'custom',
        name: doc.document_type,
        category: 'legal',
        is_legal: true,
        description: '',
        default_instructions: [],
        required_sections: [],
        fields: [],
      },
      template,
      doc.jurisdiction
    );

    // Update document version quality report
    latestVersion.qualityReport = checkResult;
    legalRepository.saveDocument(doc);

    legalRepository.addAuditLog({
      user: 'user',
      action: 'RUN_LEGAL_CHECK',
      documentId: id,
      version: latestVersion.label,
      checkerRun: {
        provider: 'LegalQualityChecker',
        score: checkResult.score,
        status: checkResult.status,
      },
    });

    return NextResponse.json({
      success: true,
      checkResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
