import {NextRequest, NextResponse} from 'next/server';
import {getDocumentById} from '@/lib/db/store';
import {readBinaryFromPrivateStorage, storagePathFor} from '@/lib/storage';

/**
 * Serves the on-screen copy of a figure from an in-place document. The document
 * record keeps no base64 for these, so the preview comes from storage instead of
 * inflating every saved snapshot. The file the user downloads still carries its
 * own untouched picture bytes.
 */
export async function GET(req: NextRequest, context: {params: Promise<{id: string; imageId: string}>}) {
  const {id, imageId} = await context.params;
  const doc = getDocumentById(id);
  const image = (doc?.embeddedImages || []).find((img) => img.id === imageId);
  if (!doc || !image) {
    return NextResponse.json({error: 'Figure not found'}, {status: 404});
  }

  const bytes = readBinaryFromPrivateStorage(
    storagePathFor('preview', doc.id, `${image.id}.${image.mimeType === 'image/jpeg' ? 'jpg' : 'png'}`)
      .virtualPath
  );
  if (!bytes || bytes.length === 0) {
    return NextResponse.json({error: 'Figure preview is no longer held by this server instance.'}, {status: 410});
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': image.mimeType,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
