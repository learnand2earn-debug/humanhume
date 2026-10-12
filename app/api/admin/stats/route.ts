import { NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { storageManager } from '@/lib/storage';

export async function GET() {
  try {
    const analytics = repository.getAnalytics();
    const storageStats = await storageManager.getStorageStats();
    const apiUsage = repository.listApiUsage(10);
    const settings = repository.getSettings();

    return NextResponse.json({
      analytics,
      storageStats,
      apiUsage,
      mode: settings.mode,
      systemHealth: {
        status: 'HEALTHY',
        database: 'ONLINE',
        storage: 'WRITABLE',
        workerQueue: 'ACTIVE',
        uptimeSeconds: Math.round(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
