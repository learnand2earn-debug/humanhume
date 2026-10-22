import {NextRequest, NextResponse} from 'next/server';
import {getDbState, updatePlatformSettings, addSystemLog} from '@/lib/db/store';

export async function GET() {
  const state = getDbState();
  // Returns only masked keys (sk-***************92), never raw secrets
  return NextResponse.json({
    settings: state.settings,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const updated = updatePlatformSettings(body);

  addSystemLog({
    traceId: 'HF-ADMIN-CONFIG',
    level: 'SECURITY',
    stage: 'SETTINGS_UPDATE',
    message: `Administrator updated platform settings (Mode: ${updated.processingMode}, Max Retries: ${updated.maxRetries}). API keys remain masked.`,
  });

  return NextResponse.json({
    success: true,
    settings: updated,
  });
}
