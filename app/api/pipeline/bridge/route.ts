import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { storageManager } from '@/lib/storage';
import { repository } from '@/lib/db/repository';
import { JobQueue } from '@/lib/queue/queue';
import { DocumentRecord } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, fileName } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text content is required to send to pipeline' },
        { status: 400 }
      );
    }

    const safeName = fileName || `artifact_${Date.now()}.txt`;
    const documentId = `doc_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const traceId = `HF-${dateStr}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const settings = repository.getSettings();

    const buffer = Buffer.from(text, 'utf-8');

    const { originalPath, workingPath } = await storageManager.saveOriginalFile(
      buffer,
      safeName,
      documentId
    );

    const documentRecord: DocumentRecord = {
      id: documentId,
      userId: 'default_user',
      originalName: safeName,
      fileType: 'txt',
      fileSize: buffer.length,
      originalPath,
      workingPath,
      status: 'QUEUED',
      traceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: settings.maxRetries || 3,
    };

    repository.saveDocument(documentRecord);

    repository.addLog({
      traceId,
      level: 'info',
      module: 'PipelineBridge',
      action: 'file_bridged',
      message: `Artifact "${safeName}" (${buffer.length} bytes) bridged to Fact-Preserving Humanizer pipeline.`,
    });

    JobQueue.enqueue(documentId);

    return NextResponse.json({
      success: true,
      document: documentRecord,
      documentId,
    });
  } catch (err: any) {
    console.error('Failed to bridge to pipeline:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
