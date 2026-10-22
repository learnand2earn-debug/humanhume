import {NextRequest, NextResponse} from 'next/server';
import {getDbState} from '@/lib/db/store';
import {validateDraftingInputs} from '@/lib/document/legal-engine';
import {executeDocumentationStudioPipeline} from '@/lib/queue/pipeline';
import {JurisdictionType} from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {documentTypeId, jurisdiction, variables = {}, customInstructions = ''} = body;

    const state = getDbState();
    const docType = state.documentTypes.find(
      (d) => d.id === documentTypeId || d.name === documentTypeId
    );

    if (!docType) {
      return NextResponse.json(
        {error: 'Selected Documentation Type was not found.'},
        {status: 400}
      );
    }

    // Run Missing Information & Jurisdiction Validation Engine
    const validation = validateDraftingInputs(docType, jurisdiction, variables);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.errorMessage,
          jurisdictionMissing: validation.jurisdictionMissing,
          missingFields: validation.missingFields,
        },
        {status: 400}
      );
    }

    const generatedDoc = await executeDocumentationStudioPipeline({
      documentTypeId: docType.id,
      jurisdiction: (jurisdiction || 'Not Applicable') as JurisdictionType,
      variables,
      customInstructions,
    });

    return NextResponse.json({
      success: true,
      document: generatedDoc,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Documentation Studio generation failed',
      },
      {status: 500}
    );
  }
}
