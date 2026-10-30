/**
 * Media preservation checks for the in-place editors.
 *
 * The native adapters never re-encode pictures, so the check is a fingerprint of
 * the original container compared against the edited one. Anything that does not
 * match is reported instead of being silently accepted.
 */

import crypto from 'crypto';
import {PDFDocument, PDFName, PDFRawStream} from 'pdf-lib';
import type {NativeFileType} from './native-document';

export interface MediaFingerprint {
  kind: 'pdf' | 'ooxml' | 'none';
  images: number;
  bytes: number;
  /** Sorted, stable digests of every picture found in the container. */
  digests: string[];
  error?: string;
}

export interface MediaComparison {
  checked: boolean;
  identical: boolean;
  inputImages: number;
  outputImages: number;
  notes: string[];
}

const IMAGE_NAME = /(^|\/)media\/|\.(png|jpe?g|gif|bmp|tiff?|emf|wmf|ico|jpx|jp2|svgz?)$/iu;

function digest(parts: Array<string | Buffer>): string {
  const h = crypto.createHash('sha256');
  for (const part of parts) h.update(typeof part === 'string' ? part : new Uint8Array(part));
  return h.digest('hex');
}

/** Reads only the ZIP central directory: names, CRCs and declared sizes. */
function ooxmlEntries(buffer: Buffer): Map<string, string> {
  let eo = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eo = i;
      break;
    }
  }
  if (eo < 0) throw new Error('missing ZIP end-of-central-directory');
  const count = buffer.readUInt16LE(eo + 10);
  let at = buffer.readUInt32LE(eo + 16);
  const found = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== 0x02014b50) break;
    const crc = buffer.readUInt32LE(at + 16);
    const size = buffer.readUInt32LE(at + 24);
    const nameLength = buffer.readUInt16LE(at + 28);
    const name = buffer.subarray(at + 46, at + 46 + nameLength).toString('utf-8');
    if (IMAGE_NAME.test(name)) found.set(name, `${crc.toString(16)}:${size}`);
    at += 46 + nameLength + buffer.readUInt16LE(at + 30) + buffer.readUInt16LE(at + 32);
  }
  return found;
}

export async function fingerprintMedia(buffer: Buffer, fileType: NativeFileType): Promise<MediaFingerprint> {
  try {
    if (fileType === 'PDF') {
      const doc = await PDFDocument.load(buffer, {ignoreEncryption: true, throwOnInvalidObject: false});
      const digests: string[] = [];
      let bytes = 0;
      for (const [, obj] of doc.context.enumerateIndirectObjects()) {
        if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
          const contents = Buffer.from(obj.contents);
          bytes += contents.length;
          // The dictionary carries filters, dimensions and colour space: any restap changes it.
          digests.push(digest([obj.dict.toString(), contents]));
        }
      }
      return {kind: 'pdf', images: digests.length, bytes, digests: digests.sort()};
    }

    if (fileType === 'DOCX' || fileType === 'XLSX') {
      const entries = ooxmlEntries(buffer);
      const digests = [...entries].map(([name, value]) => digest([name, value])).sort();
      const bytes = [...entries.values()].reduce((sum, v) => sum + Number(v.split(':')[1] || 0), 0);
      return {
        kind: 'ooxml',
        images: entries.size,
        bytes,
        digests,
      };
    }

    return {kind: 'none', images: 0, bytes: 0, digests: []};
  } catch (err) {
    return {
      kind: fileType === 'PDF' ? 'pdf' : fileType === 'DOCX' || fileType === 'XLSX' ? 'ooxml' : 'none',
      images: 0,
      bytes: 0,
      digests: [],
      error: err instanceof Error ? err.message : 'unreadable container',
    };
  }
}

export async function compareMediaPreservation(
  input: Buffer,
  output: Buffer,
  fileType: NativeFileType
): Promise<MediaComparison> {
  const before = await fingerprintMedia(input, fileType);
  const after = await fingerprintMedia(output, fileType);

  if (before.kind === 'none') {
    return {
      checked: false,
      identical: true,
      inputImages: 0,
      outputImages: 0,
      notes: [`${fileType} has no separately addressable picture streams; text was edited inside the original bytes.`],
    };
  }

  const notes: string[] = [];
  if (before.error) notes.push(`original container could not be re-read: ${before.error}`);
  if (after.error) notes.push(`output container could not be re-read: ${after.error}`);
  if (before.images !== after.images) {
    notes.push(`picture count changed from ${before.images} to ${after.images}`);
  }
  if (before.digests.length !== after.digests.length || before.digests.some((d, i) => d !== after.digests[i])) {
    notes.push('at least one picture stream or its dictionary differs from the original bytes');
  }

  return {
    checked: before.images > 0 || after.images > 0,
    identical: notes.length === 0,
    inputImages: before.images,
    outputImages: after.images,
    notes,
  };
}
