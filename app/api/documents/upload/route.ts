import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { storageManager } from '@/lib/storage';
import { repository } from '@/lib/db/repository';
import { isSupportedFile, validateFileType } from '@/lib/document/extractor';
import { JobQueue } from '@/lib/queue/queue';
import { DocumentRecord } from '@/lib/types';
import { DiscordNotifier } from '@/lib/notifications/discord';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name;
    const settings = repository.getSettings();
    const maxSizeBytes = (settings.maxFileSizeMb || 50) * 1024 * 1024;

    if (file.size === 0) {
      return NextResponse.json(
        {
          error: `The file "${fileName}" is completely empty (0 bytes). Please upload a document with readable content.`,
        },
        { status: 400 }
      );
    }

    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size exceeds the limit of ${settings.maxFileSizeMb}MB` },
        { status: 400 }
      );
    }

    if (!isSupportedFile(fileName)) {
      return NextResponse.json(
        {
          error: `Unsupported file format. HumanFlow AI supports: DOCX, PDF, TXT, MD, RTF, and XLSX.`,
        },
        { status: 400 }
      );
    }

    const fileType = validateFileType(fileName);
    const documentId = `doc_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const traceId = `HF-${dateStr}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save untouched original copy and working copy
    const { originalPath, workingPath } = await storageManager.saveOriginalFile(
      buffer,
      fileName,
      documentId
    );

    const documentRecord: DocumentRecord = {
      id: documentId,
      userId: 'default_user',
      originalName: fileName,
      fileType,
      fileSize: file.size,
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
      module: 'UploadAPI',
      action: 'file_uploaded',
      message: `File "${fileName}" (${(file.size / 1024).toFixed(1)} KB) successfully uploaded. Original stored safely.`,
    });

    // Notify Discord
    await DiscordNotifier.notify({
      event: 'document_uploaded',
      fileName,
      status: 'QUEUED',
      traceId,
    });

    // Automatically begin processing in background queue
    JobQueue.enqueue(documentId);

    return NextResponse.json({
      success: true,
      document: documentRecord,
      message: 'File uploaded successfully and automatic processing started.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
