import { NextRequest, NextResponse } from 'next/server';
import { OmniFileGenerator, FileGenPayload } from '@/lib/omni/file-generator';
import { GroqAgent, GroqChatMessage } from '@/lib/ai/groq-agent';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId') || searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId parameter required' }, { status: 400 });
    }

    const cached = OmniFileGenerator.getCachedFile(fileId);
    if (!cached) {
      return NextResponse.json({ error: 'File expired or not found' }, { status: 404 });
    }

    const uint8 = new Uint8Array(cached.buffer);
    const cleanFileName = cached.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': cached.mimeType,
        'Content-Disposition': `attachment; filename="${cleanFileName}"`,
        'Content-Length': cached.buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileName,
      fileType,
      content: rawContent,
      prompt,
      title,
      dataRows,
      bundleFiles,
    } = body as {
      fileName?: string;
      fileType?: string;
      content?: string;
      prompt?: string;
      title?: string;
      dataRows?: any[];
      bundleFiles?: Array<{ name: string; content: string }>;
    };

    if (!fileType && !prompt) {
      return NextResponse.json(
        { error: 'fileType or prompt is required' },
        { status: 400 }
      );
    }

    const resolvedType = (fileType || 'txt').toLowerCase().replace(/^\./, '');
    let resolvedName = fileName || `Generated_${resolvedType.toUpperCase()}_Document`;

    let finalContent = rawContent || '';

    // If content not provided or prompt given, invoke AI LLM authoring agent
    if (!finalContent && prompt) {
      const authoringPrompt: GroqChatMessage[] = [
        {
          role: 'system',
          content:
            `You are the Omni Universal File Authoring Engine.\n` +
            `Task: Generate the COMPLETE, IN-DEPTH, FULL CONTENT for a .${resolvedType.toUpperCase()} file.\n` +
            `Rules:\n` +
            `1. Provide full, production-ready, highly detailed content. Never truncate with placeholders like '// implement here' or '[add text]'.\n` +
            `2. If XLSX/CSV/TSV: Write structured tabular data with headers, realistic rows, and numeric values.\n` +
            `3. If DOCX/PDF/MD/RTF: Write an extensive document with title, executive summary, sections, bullet points, and tables.\n` +
            `4. If SVG: Write valid, stunning, complete SVG XML with gradients, paths, shapes, and responsive viewBox.\n` +
            `5. If HTML: Write a self-contained, responsive modern HTML5 single-page application with Tailwind CSS and interactive JS.\n` +
            `6. If Code (Python, TS, JS, Go, Rust, Java, C++, Bash, SQL): Write complete, bug-free, syntactically flawless code.\n` +
            `Return ONLY the raw file content, without markdown code fences unless the file itself is markdown.`,
        },
        {
          role: 'user',
          content: `Generate complete content for file "${resolvedName}.${resolvedType}":\n${prompt}`,
        },
      ];

      const generatedText = await GroqAgent.callLLM(authoringPrompt, 0.7);
      finalContent = generatedText || `# ${resolvedName}\n\nGenerated automatically for: ${prompt}`;
    }

    if (!finalContent) {
      finalContent = `HumanFlow Universal File Studio Deliverable: ${resolvedName}.${resolvedType}`;
    }

    const fileResult = await OmniFileGenerator.generateFile({
      fileName: resolvedName,
      fileType: resolvedType,
      title: title || resolvedName,
      content: finalContent,
      dataRows,
      bundleFiles,
    });

    return NextResponse.json({
      success: true,
      file: fileResult,
      content: finalContent,
    });
  } catch (err: unknown) {
    console.error('File generation error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
