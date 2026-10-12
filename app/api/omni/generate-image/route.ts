import { NextRequest, NextResponse } from 'next/server';
import { OmniImageGenerator, ImageGenOptions } from '@/lib/omni/image-generator';
import { OmniRepository } from '@/lib/omni/repository';

export async function POST(req: NextRequest) {
  try {
    const body: ImageGenOptions = await req.json();

    if (!body.prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const settings = OmniRepository.getSettings();
    const result = await OmniImageGenerator.generateImage({
      ...body,
      apiKey: body.apiKey || settings.openaiApiKey,
    });

    return NextResponse.json({ success: true, image: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
