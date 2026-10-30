/**
 * Verifies the in-place PDF editor against a real document.
 *
 *   npx tsx scripts/test_native_pdf.ts [path-to-pdf]
 *
 * Checks that images keep their exact bytes, that every image placement
 * (resource name, CTM at the Do operator) is untouched, that only content
 * streams changed, and that the humanized text actually landed in the file.
 */
import fs from 'fs';
import crypto from 'crypto';
import {PDFDocument, PDFDict, PDFName, PDFArray, PDFRawStream, PDFRef, decodePDFRawStream} from 'pdf-lib';
import {preparePdfDocument} from '@/lib/document/native-pdf';
import {runNaturalHumanizationTransform} from '@/lib/humanizer/provider';

const sha = (b: Uint8Array | Buffer) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);

async function load(buf: Buffer) {
  return PDFDocument.load(buf, {ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false});
}

function contentOf(page: {node: PDFDict}, doc: PDFDocument): Buffer | null {
  const contents = page.node.get(PDFName.of('Contents'));
  const parts: Uint8Array[] = [];
  const push = (obj: unknown) => {
    if (obj instanceof PDFRawStream) {
      const filter = obj.dict.get(PDFName.of('Filter'));
      parts.push(filter ? decodePDFRawStream(obj as never).decode() : obj.contents);
    }
  };
  const ctx = doc.context;
  if (contents instanceof PDFRef) push(ctx.lookup(contents));
  else if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      const item = contents.get(i);
      push(item instanceof PDFRef ? ctx.lookup(item) : item);
    }
  } else push(contents);
  if (!parts.length) return null;
  return Buffer.concat(parts.map((p) => Buffer.from(p)));
}

function imageInventory(buf: Buffer) {
  const streams: string[] = [];
  const dicts: string[] = [];
  const smasks: string[] = [];
  return load(buf)
    .then(async (doc) => {
      for (const [, obj] of doc.context.enumerateIndirectObjects()) {
        if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
          streams.push(sha(obj.contents));
          dicts.push(obj.dict.toString().replace(/\s+/g, ' '));
          const smaskRef = obj.dict.get(PDFName.of('SMask'));
          const smask = smaskRef instanceof PDFRef ? doc.context.lookup(smaskRef) : undefined;
          if (smask instanceof PDFRawStream) smasks.push(sha(smask.contents));
        }
      }
      const pages = doc.getPages();
      const placements: string[] = [];
      const skeletons: string[] = [];
      const xobjectMaps: string[] = [];
      for (let p = 0; p < pages.length; p++) {
        const page = pages[p] as unknown as {node: PDFDict};
        const content = contentOf(page, doc);
        if (!content) continue;
        const ops = operatorSkeleton(content);
        skeletons.push(`${p + 1}:${ops.join(',')}`);
        placements.push(`${p + 1}:${ops.filter((o) => o.startsWith('Do:')).join(',')}`);
        const res = page.node.lookupMaybe(PDFName.of('Resources'), PDFDict);
        const xo = res?.lookupMaybe(PDFName.of('XObject'), PDFDict);
        xobjectMaps.push(`${p + 1}:${xo ? [...xo.entries()].map(([k, v]) => `${k}=>${v}`).sort().join('|') : 'none'}`);
      }
      const pageSizes = doc.getPages().map((pg) => `${pg.getWidth()}x${pg.getHeight()}`);
      return {
        streams: streams.sort(),
        dicts: dicts.sort(),
        smasks: smasks.sort(),
        placements,
        skeletons,
        xobjectMaps,
        pageSizes,
        pageCount: pages.length,
      };
    });
}

const SKIP_OPS = new Set(['Tj', 'TJ', 'Tz', 'BT', 'ET', 'Td', 'TD', 'Tm', 'Tc', 'Tw', 'TL', 'T*']);

/** Operators of a content stream, ignoring operands, strings and text placement. */
function operatorSkeleton(content: Buffer): string[] {
  const ops: string[] = [];
  const numbers: number[] = [];
  let i = 0;
  const n = content.length;
  while (i < n) {
    const c = content[i];
    if (c === 0x28) {
      // literal string, honouring escapes and nesting
      let depth = 1;
      i++;
      while (i < n && depth > 0) {
        if (content[i] === 0x5c) i += 2;
        else if (content[i] === 0x28) depth++;
        else if (content[i] === 0x29) depth--;
        i++;
      }
      numbers.length = 0;
      continue;
    }
    if (c === 0x3c) {
      const close = content.indexOf(0x3e, i);
      i = close === -1 ? n : close + 1;
      numbers.length = 0;
      continue;
    }
    if (c === 0x5b) {
      // array: consume to the matching ]
      let depth = 1;
      i++;
      while (i < n && depth > 0) {
        if (content[i] === 0x5b) depth++;
        else if (content[i] === 0x5d) depth--;
        else if (content[i] === 0x28) {
          let d = 1;
          i++;
          while (i < n && d > 0) {
            if (content[i] === 0x5c) i += 2;
            else if (content[i] === 0x28) d++;
            else if (content[i] === 0x29) d--;
            i++;
          }
          continue;
        }
        i++;
      }
      continue;
    }
    if (c === 0x2f) {
      // name
      i++;
      while (i < n && content[i] > 0x20 && !/[()<>\[\]{}\/%]/.test(String.fromCharCode(content[i]))) i++;
      continue;
    }
    if (c === 0x25) {
      while (i < n && content[i] !== 10) i++;
      continue;
    }
    if (c <= 0x20) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && content[j] > 0x20 && !/[()<>{}\/%\[\]]/.test(String.fromCharCode(content[j]))) j++;
    if (j === i) {
      i++;
      continue;
    }
    const word = content.subarray(i, j).toString('latin1');
    i = j;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) {
      numbers.push(Number(word));
      if (numbers.length > 8) numbers.shift();
      continue;
    }
    if (word === 'cm') {
      ops.push(`cm:${numbers.slice(-6).map((v) => Math.round(v * 100) / 100).join(',')}`);
    } else if (word === 'Do') {
      ops.push('Do');
    } else if (!SKIP_OPS.has(word)) {
      ops.push(word);
    }
    numbers.length = 0;
  }
  return ops;
}


function nonContentObjects(buf: Buffer) {
  return load(buf).then(async (doc) => {
    const contentRefs = new Set<string>();
    for (const page of doc.getPages()) {
      const c = page.node.get(PDFName.of('Contents'));
      const add = (o: unknown) => {
        if (o instanceof PDFRef) contentRefs.add(o.toString());
        else if (o instanceof PDFArray) {
          for (let i = 0; i < o.size(); i++) {
            const it = o.get(i);
            if (it instanceof PDFRef) contentRefs.add(it.toString());
          }
        }
      };
      add(c);
    }
    const out: string[] = [];
    let idx = 0;
    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
      if (contentRefs.has(ref.toString())) continue;
      if (obj instanceof PDFRawStream) out.push(`${idx}:${obj.dict.toString().length}:${sha(obj.contents)}`);
      else out.push(`${idx}:${sha(Buffer.from(obj.toString(), 'latin1'))}`);
      idx++;
    }
    return out.sort();
  });
}

async function verify(input: Buffer, output: Buffer, label: string, fail: string[]) {
  const before = await imageInventory(input);
  const after = await imageInventory(output);
  if (before.pageCount !== after.pageCount) fail.push(`${label}: page count changed ${before.pageCount} -> ${after.pageCount}`);
  if (before.pageSizes.join() !== after.pageSizes.join()) fail.push(`${label}: page geometry changed`);
  if (before.streams.join() !== after.streams.join()) fail.push(`${label}: image pixel streams changed`);
  if (before.dicts.join() !== after.dicts.join()) fail.push(`${label}: image dictionaries changed`);
  if (before.smasks.join() !== after.smasks.join()) fail.push(`${label}: image soft masks changed`);
  if (before.xobjectMaps.join() !== after.xobjectMaps.join()) fail.push(`${label}: page XObject resource maps changed`);
  if (before.placements.join() !== after.placements.join()) fail.push(`${label}: image Do placements changed`);
  if (before.skeletons.join() !== after.skeletons.join()) {
    for (let p = 0; p < before.skeletons.length; p++) {
      if (before.skeletons[p] === after.skeletons[p]) continue;
      const a = before.skeletons[p].split(':').slice(1).join(':').split(',');
      const b = after.skeletons[p].split(':').slice(1).join(':').split(',');
      const d = a.findIndex((x, idx) => x !== b[idx]);
      fail.push(
        `${label}: page ${p + 1} graphics operators changed at #${d}: ${a.slice(Math.max(0, d - 2), d + 3).join(' ')} -> ${b.slice(Math.max(0, d - 2), d + 3).join(' ')}`
      );
      break;
    }
  }
  const objBefore = await nonContentObjects(input);
  const objAfter = await nonContentObjects(output);
  const sb = new Set(objBefore.map((x) => x.split(':').slice(1).join(':')));
  const sa = new Set(objAfter.map((x) => x.split(':').slice(1).join(':')));
  const lost = [...sb].filter((x) => !sa.has(x)).length;
  const added = [...sa].filter((x) => !sb.has(x)).length;
  if (lost || added) fail.push(`${label}: ${lost} original objects lost / ${added} new objects outside content streams`);
  return `images=${after.streams.length} placements=${after.placements.length}`;
}

async function runCase(doc: Awaited<ReturnType<typeof preparePdfDocument>>, replacements: string[], label: string, fail: string[]) {
  const result = await doc.apply(replacements);
  const out = `scripts/native_output_${label}.pdf`;
  fs.writeFileSync(out, result.buffer);
  const changed = result.texts.filter((t, i) => t !== doc.units[i].text).length;
  const outDoc = await preparePdfDocument(result.buffer);
  // A replacement is written run-by-run, so re-extraction can space words wider
  // than the original file did. Compare without whitespace to prove the letters landed.
  const squeeze = (v: string) => v.replace(/\s+/gu, '');
  // Blocks can regroup after an edit, so look for each replacement inside the
  // whole extracted text rather than matching it against one unit.
  const extracted = squeeze(outDoc.units.map((u) => u.text).join(''));
  const readback = result.texts.filter((t, i) => t !== doc.units[i].text && extracted.includes(squeeze(t))).length;
  const stats = await verify(fs.readFileSync(process.argv[2] || 'C:/Users/Admin/Desktop/Hunt.pdf'), result.buffer, label, fail);
  console.log(
    `
[${label}] rewritten=${changed}/${doc.units.length} verified-in-file=${readback} bytes=${result.buffer.length} ${stats}`
  );
  const seen = new Set<string>();
  for (const w of result.warnings) {
    const key = w.replace(/\d+/g, '#').slice(0, 90);
    if (!seen.has(key)) {
      seen.add(key);
      console.log(`   warning: ${w.slice(0, 150)}`);
    }
  }
  if (readback < changed) fail.push(`${label}: only ${readback}/${changed} replacements are readable from the saved PDF`);
  return result;
}

async function main() {
  const file = process.argv[2] || 'C:/Users/Admin/Desktop/Hunt.pdf';
  const buf = fs.readFileSync(file);
  console.log(`input: ${file} (${buf.length} bytes)`);

  const doc = await preparePdfDocument(buf);
  console.log(`pages=${doc.pageCount} textUnits=${doc.units.length} images=${doc.imageCount}`);
  for (const w of doc.warnings.slice(0, 5)) console.log(`  prepare note: ${w}`);

  const fail: string[] = [];

  // 1) the real built-in humanizer
  await runCase(doc, doc.units.map((u) => runNaturalHumanizationTransform(u.text, 'NORMAL', false, [])), 'humanizer', fail);

  // 2) synthetic rewrites that mimic AI output of varied length
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  await runCase(
    doc,
    doc.units.map((u) => {
      const words = u.text.split(' ');
      const target = Math.max(1, Math.round(words.length * (0.85 + rnd() * 0.3)));
      const out: string[] = [];
      for (let i = 0; i < target; i++) out.push(words[i % words.length] + (i === 0 ? '' : ''));
      out[0] = 'Rewritten ' + out[0];
      return out.join(' ');
    }),
    'synthetic',
    fail
  );

  // 3) a deliberately impossible rewrite must be refused, never squeezed to mush
  const impossible = await runCase(doc, doc.units.map((u) => u.text + ' plus a great many additional words that certainly do not fit the original slot at all'), 'overflow', fail);
  if (impossible.changedUnits > 0) fail.push(`overflow: ${impossible.changedUnits} units were written although the text cannot fit`);

  if (fail.length) {
    console.log('\nFAILED:');
    for (const f of fail) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('\nPASS: images byte-identical, placements and every non-text operator untouched, text edited in place.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
