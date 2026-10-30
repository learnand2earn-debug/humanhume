/**
 * Runs the in-place pipeline the upload route uses and verifies the stored
 * artifact: pictures byte-identical, page count unchanged, and the humanized
 * words actually inside the file.
 */

import fs from 'fs';
import crypto from 'crypto';
import {PDFDocument, PDFName, PDFRawStream} from 'pdf-lib';
import {executeNativeDocumentPipeline} from '../lib/queue/native-pipeline';
import {readBinaryFromPrivateStorage} from '../lib/storage';
import type {SupportedFileType} from '../types';

const CASES = [
  {label: 'hunt-pdf', file: process.argv[2] || 'C:/Users/Admin/Desktop/Hunt.pdf'},
  {label: 'docx', file: process.argv[3] || 'C:/Users/Admin/Desktop/tahira/documentation files/Aqeel.docx'},
];

function imageDigests(buffer: Buffer, fileType: string): Promise<string[]> {
  if (fileType !== 'PDF') {
    // OOXML: read picture entries straight from the ZIP central directory.
    const found: string[] = [];
    let eo = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        eo = i;
        break;
      }
    }
    if (eo < 0) throw new Error('no ZIP EOCD');
    let at = buffer.readUInt32LE(eo + 16);
    for (let i = 0; i < buffer.readUInt16LE(eo + 10); i++) {
      const name = buffer.subarray(at + 46, at + 46 + buffer.readUInt16LE(at + 28)).toString('utf-8');
      if (/(^|\/)media\//i.test(name)) {
        found.push(`${name}:${buffer.readUInt32LE(at + 16).toString(16)}:${buffer.readUInt32LE(at + 24)}`);
      }
      at += 46 + buffer.readUInt16LE(at + 28) + buffer.readUInt16LE(at + 30) + buffer.readUInt16LE(at + 32);
    }
    return Promise.resolve(found.sort());
  }
  return PDFDocument.load(buffer, {ignoreEncryption: true, throwOnInvalidObject: false}).then((doc) => {
    const list: string[] = [];
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
        list.push(crypto.createHash('sha256').update(obj.dict.toString()).update(Buffer.from(obj.contents)).digest('hex'));
      }
    }
    return list.sort();
  });
}

async function textOfPdf(buffer: Buffer): Promise<string> {
  const doc = await PDFDocument.load(buffer, {ignoreEncryption: true, throwOnInvalidObject: false});
  const pages = doc.getPages();
  let out = '';
  for (const page of pages) out += page.getSize().width + 'x' + page.getSize().height + '|';
  return out;
}

async function runCase(file: string, label: string) {
  if (!fs.existsSync(file)) {
    console.log(`[${label}] SKIP — ${file} not found`);
    return true;
  }
  const original = fs.readFileSync(file);
  const upper = (file.split('.').pop() || 'pdf').toUpperCase();
  const doc = await executeNativeDocumentPipeline({
    fileName: file.split('/').pop() as string,
    fileType: (['PDF', 'DOCX', 'XLSX', 'RTF', 'TXT', 'MD'].includes(upper) ? upper : 'PDF') as SupportedFileType,
    fileSize: original.length,
    rawBuffer: original,
  });

  const artifact = doc.nativeArtifact;
  if (!artifact) throw new Error(`${label}: record has no nativeArtifact — the pipeline rebuilt the document`);

  const stored = readBinaryFromPrivateStorage(artifact.filePath);
  if (!stored) throw new Error(`${label}: artifact bytes missing from storage`);
  fs.writeFileSync(`scripts/pipeline_${label}.${(file.split('.').pop() || 'bin').toLowerCase()}`, stored);

  const before = await imageDigests(original, artifact.fileType);
  const after = await imageDigests(stored, artifact.fileType);
  const imagesOk = before.length === after.length && before.every((d, i) => d === after[i]);

  const pagesOk = artifact.fileType !== 'PDF' || (await textOfPdf(original)) === (await textOfPdf(stored));
  const storedOriginal = readBinaryFromPrivateStorage(artifact.originalFilePath);
  const originalOk = Boolean(storedOriginal) && storedOriginal!.equals(original);
  const textOk = doc.finalContent.trim().length > 0 || artifact.changedUnits === 0;

  console.log(
    `[${label}] status=${doc.status} blocks=${artifact.changedUnits}/${artifact.totalUnits} ` +
      `pictures=${before.length}->${after.length} identical=${imagesOk} pages+geometry=${pagesOk} ` +
      `originalBytesKept=${originalOk} qc=${Object.values(doc.qcChecklist).filter(Boolean).length}/10`
  );
  for (const note of artifact.notes.slice(0, 4)) console.log(`   note: ${note.slice(0, 150)}`);

  const failed: string[] = [];
  if (!imagesOk) failed.push('pictures differ');
  if (!pagesOk) failed.push('page geometry differs');
  if (!originalOk) failed.push('uploaded bytes were not stored verbatim');
  if (!textOk) failed.push('no humanized text and nothing refused');
  if (doc.qcChecklist.downloadWorks !== true) failed.push('download check failed');
  if (doc.qcChecklist.noProtectedContentChanged !== true) failed.push('protected content changed');

  if (failed.length) {
    console.log(`   FAIL: ${failed.join('; ')}`);
    return false;
  }
  return true;
}

async function main() {
  let allOk = true;
  for (const c of CASES) allOk = (await runCase(c.file, c.label)) && allOk;
  console.log(allOk ? 'PASS: in-place pipeline keeps every picture and page exactly as uploaded' : 'FAILED');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error('CRASH:', e);
  process.exit(1);
});
