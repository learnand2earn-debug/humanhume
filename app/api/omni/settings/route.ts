import { NextRequest, NextResponse } from 'next/server';
import { OmniRepository } from '@/lib/omni/repository';
import { OmniUserSettings } from '@/lib/omni/types';

export async function GET() {
  try {
    const settings = OmniRepository.getSettings();
    // Mask sensitive keys for client
    const safeSettings = {
      ...settings,
      openaiApiKey: settings.openaiApiKey ? `sk-...${settings.openaiApiKey.slice(-4)}` : '',
      anthropicApiKey: settings.anthropicApiKey ? `sk-ant-...${settings.anthropicApiKey.slice(-4)}` : '',
      geminiApiKey: settings.geminiApiKey ? `AIza...${settings.geminiApiKey.slice(-4)}` : '',
      hasOpenaiKey: Boolean(settings.openaiApiKey),
      hasAnthropicKey: Boolean(settings.anthropicApiKey),
      hasGeminiKey: Boolean(settings.geminiApiKey),
    };
    return NextResponse.json({ success: true, settings: safeSettings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: Partial<OmniUserSettings> = await req.json();
    const current = OmniRepository.getSettings();

    // Only update API keys if non-empty and not masked placeholder
    const updatePayload: Partial<OmniUserSettings> = { ...body };
    if (body.openaiApiKey && body.openaiApiKey.includes('...')) {
      delete updatePayload.openaiApiKey;
    }
    if (body.anthropicApiKey && body.anthropicApiKey.includes('...')) {
      delete updatePayload.anthropicApiKey;
    }
    if (body.geminiApiKey && body.geminiApiKey.includes('...')) {
      delete updatePayload.geminiApiKey;
    }

    const updated = OmniRepository.updateSettings({ ...current, ...updatePayload });
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
