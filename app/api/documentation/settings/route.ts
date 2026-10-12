import { NextRequest, NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';

export async function GET() {
  try {
    const settings = legalRepository.getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = legalRepository.updateSettings(body);
    legalRepository.addAuditLog({
      user: 'admin',
      action: 'UPDATE_DOCUMENTATION_SETTINGS',
      metadata: body,
    });
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
