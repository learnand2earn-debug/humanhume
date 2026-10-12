import { NextRequest, NextResponse } from 'next/server';
import { UniversalAgentEngine } from '@/lib/agent/universal-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = req.headers.get('content-type') || '';

    let prompt = '';
    const rawFiles: Array<{ name: string; buffer: Buffer }> = [];
    let userAnswers: Record<string, string> | undefined;
    let acknowledgedGapIds: string[] | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt =
        (formData.get('prompt') as string) ||
        (formData.get('text') as string) ||
        (formData.get('message') as string) ||
        (formData.get('content') as string) ||
        (formData.get('query') as string) ||
        (formData.get('input') as string) ||
        (formData.get('instruction') as string) ||
        (formData.get('task') as string) ||
        (formData.get('directive') as string) ||
        '';

      const answersStr =
        (formData.get('answers') as string) ||
        (formData.get('userAnswers') as string) ||
        (formData.get('clarifications') as string) ||
        (formData.get('responses') as string);
      if (answersStr) {
        try {
          userAnswers = JSON.parse(answersStr);
        } catch {}
      }

      const gapsStr =
        (formData.get('acknowledgedGapIds') as string) ||
        (formData.get('gaps') as string) ||
        (formData.get('gapIds') as string);
      if (gapsStr) {
        try {
          acknowledgedGapIds = JSON.parse(gapsStr);
        } catch {}
      }

      const fileEntries = formData.getAll('files') as File[];
      for (const file of fileEntries) {
        if (file && file.size > 0) {
          const ab = await file.arrayBuffer();
          rawFiles.push({
            name: file.name,
            buffer: Buffer.from(ab),
          });
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      prompt =
        body.prompt ||
        body.text ||
        body.message ||
        body.content ||
        body.query ||
        body.input ||
        body.instruction ||
        body.task ||
        body.directive ||
        '';
      userAnswers = body.answers || body.userAnswers || body.clarifications || body.responses;
      acknowledgedGapIds = body.acknowledgedGapIds || body.gaps || body.gapIds;
    }

    // Auto-generate contextual prompt when attachments or answers are submitted without explicit text
    if (!prompt.trim()) {
      if (rawFiles.length > 0) {
        prompt = `Analyze uploaded file(s): ${rawFiles.map((f) => f.name).join(', ')}`;
      } else if (userAnswers && Object.keys(userAnswers).length > 0) {
        prompt = 'Submitted clarifications for pending requirements.';
      } else if (acknowledgedGapIds && acknowledgedGapIds.length > 0) {
        prompt = 'Proceed with acknowledged gaps.';
      } else {
        prompt = 'Proceed with available information and synthesize deliverable.';
      }
    }

    const updatedConv = await UniversalAgentEngine.processUserInput(
      id,
      prompt,
      rawFiles,
      userAnswers,
      acknowledgedGapIds
    );

    return NextResponse.json({ success: true, conversation: updatedConv });
  } catch (err: any) {
    console.error('Agent message execution error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
