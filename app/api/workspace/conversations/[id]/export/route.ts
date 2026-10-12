import { NextRequest, NextResponse } from 'next/server';
import { ConversationRepository } from '@/lib/agent/repository';
import { DocumentGenerator } from '@/lib/document/generator';
import { SupportedFileType } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conv = ConversationRepository.getConversation(id);
    if (!conv) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'docx').toLowerCase();
    const artifactId = searchParams.get('artifactId');

    // Find requested artifact or latest artifact in conversation
    let targetArtifact;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].artifact) {
        if (!artifactId || conv.messages[i].artifact?.id === artifactId) {
          targetArtifact = conv.messages[i].artifact;
          break;
        }
      }
    }

    if (!targetArtifact) {
      return NextResponse.json({ success: false, error: 'No artifact found in conversation' }, { status: 400 });
    }

    const text = targetArtifact.content;
    const cleanTitle = targetArtifact.title.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'html') {
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${targetArtifact.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 860px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  ${text.replace(/\n/g, '<br/>')}
</body>
</html>`;
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${cleanTitle}.html"`,
        },
      });
    }

    if (format === 'docx' || format === 'pdf' || format === 'rtf') {
      const buffer = await DocumentGenerator.generate(text, format as SupportedFileType, cleanTitle);
      const mime =
        format === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : format === 'pdf'
          ? 'application/pdf'
          : 'application/rtf';

      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': mime,
          'Content-Disposition': `attachment; filename="${cleanTitle}.${format}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    // Markdown or plain text
    const ext = format === 'txt' ? 'txt' : 'md';
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${cleanTitle}.${ext}"`,
      },
    });
  } catch (err: any) {
    console.error('Workspace export error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
