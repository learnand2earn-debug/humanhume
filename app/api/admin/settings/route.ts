import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';

export async function GET() {
  try {
    const masked = repository.getMaskedSettings();
    return NextResponse.json({ settings: masked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = repository.updateSettings(body);
    const masked = repository.getMaskedSettings();

    repository.addLog({
      traceId: 'SYSTEM',
      level: 'info',
      module: 'AdminSettings',
      action: 'settings_updated',
      message: `System configuration updated (Mode: ${updated.mode}, Retries: ${updated.maxRetries})`,
    });

    return NextResponse.json({
      success: true,
      settings: masked,
      message: 'Configuration successfully updated.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
