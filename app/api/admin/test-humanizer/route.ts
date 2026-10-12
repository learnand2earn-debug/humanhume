import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { HumanizerClient } from '@/lib/humanizer/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const settings = repository.getSettings();

    const apiUrl = body.apiUrl || settings.humanizer.apiUrl;
    let apiKey = body.apiKey || settings.humanizer.apiKey;

    // If masked asterisks sent, use the raw stored key
    if (apiKey && apiKey.includes('****')) {
      apiKey = settings.humanizer.apiKey;
    }

    if (!apiUrl) {
      return NextResponse.json(
        { success: false, message: 'Humanizer API URL is required.' },
        { status: 400 }
      );
    }

    if (settings.mode === 'demo' && !apiKey) {
      return NextResponse.json({
        success: true,
        latencyMs: 12,
        message: 'Demo Mode Active: Built-in local humanization engine is responsive.',
      });
    }

    const client = new HumanizerClient({
      apiUrl,
      apiKey,
      model: body.model || settings.humanizer.model || 'gpt-4o-mini',
      responsePath: body.responsePath || settings.humanizer.responsePath,
      authHeader: body.authHeader || settings.humanizer.authHeader,
      authPrefix: body.authPrefix || settings.humanizer.authPrefix,
      timeoutMs: 15000,
    });

    const result = await client.testConnection();

    repository.addLog({
      traceId: 'SYSTEM',
      level: result.success ? 'info' : 'warn',
      module: 'AdminTestProbe',
      action: 'test_humanizer_api',
      message: `Humanizer test probe completed in ${result.latencyMs}ms: ${result.message}`,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
