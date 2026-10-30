import { deflateSync, Inflate } from 'fflate';
import type { NativeDocument, NativeTextUnit } from './native-types';

// Deliberately finite: reject, never truncate. Inflation is fed 1 KiB at a time,
// so a forged ZIP size cannot cause a whole zip bomb to be allocated first.
const MAX_INPUT = 128 * 1024 * 1024;
const MAX_ENTRY = 32 * 1024 * 1024;
const MAX_TOTAL = 128 * 1024 * 1024;
const MAX_XML = 8 * 1024 * 1024;
const MAX_ENTRIES = 4096;
const MAX_UNITS = 100_000;
type FileType = 'DOCX' | 'XLSX' | 'RTF' | 'TXT' | 'MD';
type Span = { start: number; end: number; text: string; encode: (s: string) => string; accept?: (s: string) => boolean };
type Source = { name: string; text: string; encode: (s: string) => Buffer; spans: Span[] };
const REFLOW = 'Text is edited inside the original file: media, styles and markup stay byte-identical. Word/Excel reflow their own layout, so line and page breaks can move when a sentence changes length.';

function unsupported(type: string, reason: string): never {
  throw new Error(`Unsupported ${type} document: ${reason}. Supported formats: genuine DOCX/XLSX OOXML, conservative RTF, UTF-8 or BOM-marked UTF-16 TXT/MD.`);
}
function check(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}
function decodeText(data: Buffer): { text: string; encode: (s: string) => Buffer } {
  let bom: Uint8Array = Buffer.alloc(0);
  let encoding: 'utf8' | 'utf16le' | 'utf16be' = 'utf8';
  if (data.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) bom = data.subarray(0, 3);
  else if (data.subarray(0, 2).equals(Buffer.from([0xff, 0xfe]))) { bom = data.subarray(0, 2); encoding = 'utf16le'; }
  else if (data.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]))) { bom = data.subarray(0, 2); encoding = 'utf16be'; }
  const body = data.subarray(bom.length);
  check(encoding === 'utf8' || body.length % 2 === 0, 'Incomplete UTF-16 code unit');
  const text = new TextDecoder(encoding === 'utf8' ? 'utf-8' : encoding === 'utf16le' ? 'utf-16le' : 'utf-16be', { fatal: true, ignoreBOM: true }).decode(body);
  const encode = (s: string): Buffer => {
    const bytes = Buffer.from(s, encoding === 'utf8' ? 'utf8' : 'utf16le');
    if (encoding === 'utf16be') bytes.swap16();
    return Buffer.concat([bom, bytes]);
  };
  check(encode(text).equals(data), 'Encoding is not losslessly round-trippable');
  return { text, encode };
}
function validChars(s: string): boolean {
  // Exclude unpaired surrogates, controls, and Unicode noncharacters.
  for (const c of s) {
    const n = c.codePointAt(0)!;
    if ((n < 32 && n !== 9 && n !== 10 && n !== 13) || (n >= 0xd800 && n <= 0xdfff) || (n & 0xffff) >= 0xfffe) return false;
  }
  return true;
}
function addSpan(source: Source, start: number, end: number, decode = (s: string) => s, encode = (s: string) => s, accept?: Span['accept']): void {
  const raw = source.text.slice(start, end);
  // Keep literal spacing wrappers in the source rather than regenerating them.
  const left = raw.match(/^\s*/u)![0].length;
  const right = raw.match(/\s*$/u)![0].length;
  if (left + right >= raw.length) return;
  const text = decode(raw.slice(left, raw.length - right));
  // Entity-encoded whitespace and multiline runs are left alone conservatively.
  if (text.trim() !== text || /[\r\n\t]/u.test(text) || !/[\p{L}]/u.test(text)) return;
  source.spans.push({ start: start + left, end: end - right, text, encode, accept });
  check(source.spans.length <= MAX_UNITS, 'Too many editable text spans');
}
function documentFromSources(original: Buffer, sources: Source[], warnings: string[], imageCount: number, finish: (changes: Map<string, Buffer>) => Buffer): NativeDocument {
  const entries = sources.flatMap(source => source.spans.map(span => ({ source, span })));
  check(entries.length <= MAX_UNITS, 'Too many editable text spans');
  const units: NativeTextUnit[] = entries.map(({ source, span }, i) => ({ id: `${source.name}:${i}`, text: span.text }));
  if (!units.length) warnings.push('No safely editable prose spans were found; the document will remain byte-identical.');
  const initialWarnings = [...new Set(warnings)];
  return {
    units, imageCount, pageCount: 0, warnings: [...initialWarnings],
    async apply(replacements) {
      check(Array.isArray(replacements) && replacements.length === entries.length && replacements.every(s => typeof s === 'string'), 'Provide exactly one string replacement per native text unit');
      const appliedWarnings = [...initialWarnings];
      const texts = entries.map(({ span }) => span.text);
      const edits = new Map<Source, { span: Span; value: string }[]>();
      let changedUnits = 0;
      entries.forEach(({ source, span }, i) => {
        const next = replacements[i];
        if (next === span.text) return;
        if (!validChars(next) || next.trim() !== next || /[\r\n\t]/u.test(next) || next.length > span.text.length || Array.from(next).length > Array.from(span.text).length || (span.accept && !span.accept(next))) {
          appliedWarnings.push(`Replacement ${i} was left unchanged: only shorter/equal-length, single-line, format-safe text is supported.`);
          return;
        }
        const list = edits.get(source) ?? [];
        list.push({ span, value: span.encode(next) });
        edits.set(source, list);
        texts[i] = next;
        changedUnits++;
      });
      const changes = new Map<string, Buffer>();
      for (const [source, list] of edits) {
        // Reverse patching preserves all original offsets and every other character.
        let text = source.text;
        for (const { span, value } of list.sort((a, b) => b.span.start - a.span.start)) text = text.slice(0, span.start) + value + text.slice(span.end);
        changes.set(source.name, source.encode(text));
      }
      return { buffer: changes.size ? finish(changes) : Buffer.from(original), texts, changedUnits, warnings: appliedWarnings };
    },
  };
}

const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let n = i;
  for (let j = 0; j < 8; j++) n = (n >>> 1) ^ ((n & 1) ? 0xedb88320 : 0);
  return n >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let n = 0xffffffff;
  for (const b of bytes) n = crcTable[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
}
type ZipEntry = { name: string; data: Buffer; offset: number; end: number; headerEnd: number; central: Buffer; flags: number; method: number };
type Archive = { entries: ZipEntry[]; byName: Map<string, ZipEntry>; eocd: Buffer };
function safeName(name: string): boolean {
  return !!name && !/[\\:\x00-\x1f\x7f%]/u.test(name) && !name.startsWith('/') && name.split('/').every((part, i, parts) => (part !== '' || i === parts.length - 1) && part !== '.' && part !== '..');
}
function readZip(buffer: Buffer): Archive {
  check(buffer.length >= 22 && buffer.readUInt32LE(0) === 0x04034b50, 'Not a ZIP/OOXML signature');
  let eo = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) { eo = i; break; }
  }
  check(eo >= 0, 'Missing ZIP end-of-central-directory');
  check(buffer.readUInt16LE(eo + 4) === 0 && buffer.readUInt16LE(eo + 6) === 0, 'Multi-disk ZIP is not supported');
  const count = buffer.readUInt16LE(eo + 10);
  const centralSize = buffer.readUInt32LE(eo + 12);
  const centralOffset = buffer.readUInt32LE(eo + 16);
  check(count > 0 && count <= MAX_ENTRIES && count === buffer.readUInt16LE(eo + 8), 'ZIP entry count exceeds limits or is inconsistent');
  check(centralOffset + centralSize === eo, 'ZIP64, signatures, or inconsistent ZIP directory are not supported');
  const entries: ZipEntry[] = [];
  const byName = new Map<string, ZipEntry>();
  const caseNames = new Set<string>();
  let at = centralOffset;
  let total = 0;
  for (let i = 0; i < count; i++) {
    check(at + 46 <= eo && buffer.readUInt32LE(at) === 0x02014b50, 'Invalid ZIP central entry');
    const flags = buffer.readUInt16LE(at + 8);
    const method = buffer.readUInt16LE(at + 10);
    const crc = buffer.readUInt32LE(at + 16);
    const size = buffer.readUInt32LE(at + 20);
    const originalSize = buffer.readUInt32LE(at + 24);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const length = 46 + nameLength + extraLength + buffer.readUInt16LE(at + 32);
    const offset = buffer.readUInt32LE(at + 42);
    check(at + length <= eo && buffer.readUInt16LE(at + 34) === 0, 'Invalid ZIP entry bounds');
    check((flags & ~0x080e) === 0 && (method === 0 || method === 8), 'Encrypted or unsupported ZIP compression/flags');
    check(originalSize <= MAX_ENTRY && (total += originalSize) <= MAX_TOTAL, 'ZIP uncompressed size exceeds safety limits');
    check(size !== 0xffffffff && offset !== 0xffffffff, 'ZIP64 is not supported');
    check(((buffer.readUInt32LE(at + 38) >>> 16) & 0xf000) !== 0xa000, 'ZIP symbolic links are not supported');
    const nameBytes = buffer.subarray(at + 46, at + 46 + nameLength);
    check((flags & 0x800) !== 0 || nameBytes.every(n => n < 128), 'Non-UTF-8 ZIP entry names are unsupported');
    const name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes);
    check(safeName(name) && !caseNames.has(name.toLowerCase()), 'Unsafe, duplicate, or traversal-containing ZIP entry name');
    caseNames.add(name.toLowerCase());
    // Alternate Unicode names/ZIP64 extras could disagree with the validated path.
    const validateExtra = (start: number, end: number) => {
      while (start < end) {
        check(start + 4 <= end, 'Malformed ZIP extra field');
        const id = buffer.readUInt16LE(start);
        const len = buffer.readUInt16LE(start + 2);
        check(id !== 1 && id !== 0x7075 && start + 4 + len <= end, 'ZIP64/alternate path or malformed ZIP extra field');
        start += 4 + len;
      }
    };
    validateExtra(at + 46 + nameLength, at + 46 + nameLength + extraLength);
    check(offset + 30 <= centralOffset && buffer.readUInt32LE(offset) === 0x04034b50, 'Invalid ZIP local entry');
    check(buffer.readUInt16LE(offset + 6) === flags && buffer.readUInt16LE(offset + 8) === method, 'Local/central ZIP flags differ');
    const localNameLength = buffer.readUInt16LE(offset + 26);
    const localExtraLength = buffer.readUInt16LE(offset + 28);
    const headerEnd = offset + 30 + localNameLength + localExtraLength;
    check(headerEnd + size <= centralOffset && nameBytes.equals(buffer.subarray(offset + 30, offset + 30 + localNameLength)), 'Local/central ZIP paths or bounds differ');
    validateExtra(offset + 30 + localNameLength, headerEnd);
    let end = headerEnd + size;
    if (flags & 8) {
      const signed = end + 4 <= centralOffset && buffer.readUInt32LE(end) === 0x08074b50;
      const d = end + (signed ? 4 : 0);
      check(d + 12 <= centralOffset && buffer.readUInt32LE(d) === crc && buffer.readUInt32LE(d + 4) === size && buffer.readUInt32LE(d + 8) === originalSize, 'Invalid ZIP data descriptor');
      end = d + 12;
    } else check(buffer.readUInt32LE(offset + 14) === crc && buffer.readUInt32LE(offset + 18) === size && buffer.readUInt32LE(offset + 22) === originalSize, 'Local/central ZIP sizes differ');
    const packed = buffer.subarray(headerEnd, headerEnd + size);
    let data: Buffer;
    if (method === 0) { check(size === originalSize, 'Invalid stored ZIP size'); data = Buffer.from(packed); }
    else {
      const chunks: Buffer[] = [];
      let actualSize = 0;
      const inflator = new Inflate((chunk) => {
        actualSize += chunk.length;
        check(actualSize <= originalSize && actualSize <= MAX_ENTRY, 'Inflated ZIP data exceeds declared size or safety limit');
        chunks.push(Buffer.from(chunk));
      });
      check(packed.length > 0, 'Empty DEFLATE stream');
      for (let p = 0; p < packed.length; p += 1024) inflator.push(packed.subarray(p, p + 1024), p + 1024 >= packed.length);
      check(actualSize === originalSize, 'Truncated ZIP entry');
      data = Buffer.concat(chunks, actualSize);
    }
    check(crc32(data) === crc, 'ZIP entry CRC mismatch');
    const entry = { name, data, offset, end, headerEnd, central: Buffer.from(buffer.subarray(at, at + length)), flags, method };
    entries.push(entry); byName.set(name, entry); at += length;
  }
  check(at === eo, 'Unexpected ZIP directory data');
  let next = 0;
  for (const entry of [...entries].sort((a, b) => a.offset - b.offset)) {
    check(entry.offset === next, 'Overlapping ZIP entries or unlisted archive data');
    next = entry.end;
  }
  check(next === centralOffset, 'Unlisted ZIP local entries');
  check(!entries.some(e => e.name.toLowerCase().startsWith('_xmlsignatures/')), 'Digitally signed packages cannot be rewritten without invalidating their signatures');
  return { entries, byName, eocd: Buffer.from(buffer.subarray(eo)) };
}
function rewriteZip(original: Buffer, archive: Archive, changes: Map<string, Buffer>): Buffer {
  const parts: Buffer[] = [];
  const centralByName = new Map<string, Buffer>();
  let offset = 0;
  for (const e of [...archive.entries].sort((a, b) => a.offset - b.offset)) {
    const central = Buffer.from(e.central);
    central.writeUInt32LE(offset, 42);
    const changed = changes.get(e.name);
    let local: Buffer;
    if (!changed) local = original.subarray(e.offset, e.end);
    else {
      const compressed = e.method === 0 ? changed : Buffer.from(deflateSync(changed));
      const header = Buffer.from(original.subarray(e.offset, e.headerEnd));
      const crc = crc32(changed);
      // Convert only changed entries from descriptors to explicit header sizes.
      header.writeUInt16LE(e.flags & ~8, 6); central.writeUInt16LE(e.flags & ~8, 8);
      header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(changed.length, 22);
      central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(changed.length, 24);
      local = Buffer.concat([header, compressed]);
    }
    parts.push(local); offset += local.length; centralByName.set(e.name, central);
  }
  const central = Buffer.concat(archive.entries.map(e => centralByName.get(e.name)!));
  const end = Buffer.from(archive.eocd);
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, central, end]);
}

const WORD = new Set(['http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'http://purl.oclc.org/ooxml/wordprocessingml/main']);
const SHEET = new Set(['http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'http://purl.oclc.org/ooxml/spreadsheetml/main']);
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
const XML = 'http://www.w3.org/XML/1998/namespace';
type Node = { qname: string; local: string; ns: string; attrs: Map<string, string>; parent?: Node; children: Node[]; texts: { start: number; end: number; value: string }[]; namespaces: Map<string, string> };
type Xml = { source: Source; root: Node; nodes: Node[] };
function unescapeXml(s: string): string {
  const value = s.replace(/&([^;]*);/gu, (_, entity: string) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (Object.hasOwn(named, entity)) return named[entity];
    check(/^#(?:[0-9]+|x[0-9a-fA-F]+)$/u.test(entity), 'Unsupported XML entity');
    const n = entity.startsWith('#x') ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    check(Number.isInteger(n) && n > 0 && n <= 0x10ffff, 'Invalid XML character reference');
    return String.fromCodePoint(n);
  });
  check(!/&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/u.test(s) && validChars(value), 'Malformed XML entity or character');
  return value;
}
function escapeXml(s: string): string { return s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;'); }
function parseXml(name: string, data: Buffer): Xml {
  check(data.length <= MAX_XML, `XML part ${name} exceeds safety limit`);
  const decoded = decodeText(data);
  const source: Source = { name, ...decoded, spans: [] };
  const { text } = source;
  check(validChars(text), 'Invalid XML characters');
  const declaration = text.match(/^<\?xml\s[^?]*\?>/u)?.[0];
  if (declaration) {
    const enc = declaration.match(/\bencoding\s*=\s*['"]([^'"]+)['"]/u)?.[1].toLowerCase();
    check(!enc || /^(utf-8|utf-16|utf-16le|utf-16be)$/u.test(enc), 'Unsupported XML encoding');
    const utf16 = data[0] === 0xff || data[0] === 0xfe;
    check(!enc || (utf16 ? enc !== 'utf-8' : enc === 'utf-8'), 'XML encoding declaration does not match its bytes');
  }
  let root: Node | undefined;
  const nodes: Node[] = [];
  const stack: Node[] = [];
  let at = 0;
  while (at < text.length) {
    if (text[at] !== '<') {
      let end = text.indexOf('<', at); if (end < 0) end = text.length;
      const raw = text.slice(at, end);
      check(!raw.includes(']]>'), 'Invalid XML text');
      const value = unescapeXml(raw);
      if (stack.length) stack[stack.length - 1].texts.push({ start: at, end, value });
      else check(!raw.trim(), 'Text outside XML root');
      at = end; continue;
    }
    if (text.startsWith('<!--', at)) {
      const end = text.indexOf('-->', at + 4);
      check(end >= 0 && !text.slice(at + 4, end).includes('--'), 'Invalid XML comment'); at = end + 3; continue;
    }
    if (text.startsWith('<![CDATA[', at)) {
      const end = text.indexOf(']]>', at + 9);
      check(end >= 0 && stack.length, 'Invalid XML CDATA');
      // Mark CDATA so that its parent is not treated as an ordinary text-only node.
      stack[stack.length - 1].attrs.set('#cdata', 'true'); at = end + 3; continue;
    }
    if (text.startsWith('<?', at)) {
      const end = text.indexOf('?>', at + 2); check(end >= 0, 'Invalid XML processing instruction');
      check(!/^<\?xml\b/iu.test(text.slice(at)) || at === 0, 'Misplaced XML declaration'); at = end + 2; continue;
    }
    check(!text.startsWith('<!', at), 'DTD and XML declarations other than the XML header are not supported');
    const match = /^<(\/?)([A-Za-z_][\w.:-]*)(\s+(?:[^<>"']|"[^"]*"|'[^']*')*?)?\s*(\/?)>/u.exec(text.slice(at));
    check(match, 'Malformed or unsupported XML tag');
    const closing = !!match[1]; const selfClosing = !!match[4]; const qname = match[2];
    if (closing) {
      check(!selfClosing && !match[3]?.trim() && stack.length && stack[stack.length - 1].qname === qname, 'Unbalanced XML tags'); stack.pop();
    } else {
      const attrs = new Map<string, string>();
      const namespaces = new Map(stack.length ? stack[stack.length - 1].namespaces : [['xml', XML]]);
      let rest = match[3] ?? '';
      while (rest.trim()) {
        const a = /^\s+([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/u.exec(rest);
        check(a && !attrs.has(a[1]), 'Invalid or duplicate XML attribute');
        const value = unescapeXml(a[2] ?? a[3]); attrs.set(a[1], value);
        if (a[1] === 'xmlns') namespaces.set('', value);
        else if (a[1].startsWith('xmlns:')) namespaces.set(a[1].slice(6), value);
        rest = rest.slice(a[0].length);
      }
      const pieces = qname.split(':'); check(pieces.length <= 2, 'Invalid XML namespace name');
      const prefix = pieces.length === 2 ? pieces[0] : '';
      check(!prefix || namespaces.has(prefix), 'Undeclared XML namespace');
      for (const key of attrs.keys()) if (key.includes(':')) check(key.startsWith('xmlns:') || namespaces.has(key.split(':')[0]), 'Undeclared XML attribute namespace');
      const node: Node = { qname, local: pieces[pieces.length - 1], ns: namespaces.get(prefix) ?? '', attrs, namespaces, parent: stack[stack.length - 1], children: [], texts: [] };
      if (node.parent) node.parent.children.push(node); else { check(!root, 'Multiple XML roots'); root = node; }
      nodes.push(node); check(nodes.length <= 200_000 && stack.length < 256, 'XML nesting or node count exceeds safety limits');
      if (!selfClosing) stack.push(node);
    }
    at += match[0].length;
  }
  check(root && !stack.length, 'Incomplete XML document');
  return { source, root, nodes };
}
function ancestors(node: Node): Node[] { const result: Node[] = []; for (let n: Node | undefined = node; n; n = n.parent) result.push(n); return result; }
function attr(node: Node, ns: Set<string>, local: string): string | undefined {
  for (const [key, value] of node.attrs) {
    const [prefix, name] = key.split(':');
    if (name === local && ns.has(node.namespaces.get(prefix) ?? '')) return value;
  }
  return undefined;
}
function editableXmlText(xml: Xml, node: Node): void {
  if (node.children.length || node.texts.length !== 1 || node.attrs.has('#cdata')) return;
  const t = node.texts[0];
  // Spreadsheet escape sequences encode characters outside normal XML escaping.
  if (SHEET.has(node.ns) && /_x[0-9a-f]{4}_/iu.test(t.value)) return;
  addSpan(xml.source, t.start, t.end, unescapeXml, escapeXml, s => !/_x[0-9a-f]{4}_/iu.test(s));
}
function packageParts(archive: Archive, type: 'DOCX' | 'XLSX'): Map<string, string> {
  const required = (name: string) => { const entry = archive.byName.get(name); check(entry, `Missing OOXML part ${name}`); return parseXml(name, entry.data); };
  const types = required('[Content_Types].xml');
  check(types.root.local === 'Types' && types.root.ns === CT, 'Invalid OOXML content types');
  const overrides = new Map<string, string>(); const defaults = new Map<string, string>();
  for (const n of types.root.children) {
    check(n.ns === CT, 'Invalid OOXML content type namespace');
    if (n.local === 'Override') {
      const part = n.attrs.get('PartName'); const contentType = n.attrs.get('ContentType');
      check(typeof part === 'string' && part.startsWith('/') && safeName(part.slice(1)), 'Invalid OOXML part override');
      check(typeof contentType === 'string' && !overrides.has(part.slice(1)), 'Invalid OOXML part content type');
      check(archive.byName.has(part.slice(1)), 'OOXML content type references a missing part');
      overrides.set(part.slice(1), contentType);
    } else if (n.local === 'Default') {
      const ext = n.attrs.get('Extension'); const contentType = n.attrs.get('ContentType');
      check(ext && contentType && !defaults.has(ext.toLowerCase()), 'Invalid OOXML default content type'); defaults.set(ext.toLowerCase(), contentType);
    } else check(false, 'Unsupported content type declaration');
  }
  const main = type === 'DOCX' ? 'word/document.xml' : 'xl/workbook.xml';
  const expected = type === 'DOCX' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
  check(overrides.get(main) === expected, 'Extension does not match a supported OOXML main document');
  const relationships = required('_rels/.rels');
  check(relationships.root.local === 'Relationships' && relationships.root.ns === REL, 'Invalid package relationships');
  const office = relationships.root.children.filter(n => n.local === 'Relationship' && /\/(?:officeDocument)$/u.test(n.attrs.get('Type') ?? ''));
  check(office.length === 1 && !office[0].attrs.has('TargetMode') && office[0].attrs.get('Target')?.replace(/^\//u, '') === main, 'Missing or unsupported OOXML officeDocument relationship');
  required(main);
  const contentTypes = new Map<string, string>();
  for (const e of archive.entries) {
    if (e.name.endsWith('/') || e.name === '[Content_Types].xml') continue;
    const ct = overrides.get(e.name) ?? defaults.get(e.name.split('.').pop()!.toLowerCase());
    check(ct, `Missing OOXML content type for ${e.name}`); contentTypes.set(e.name, ct);
  }
  return contentTypes;
}
function prepareOoxml(buffer: Buffer, type: 'DOCX' | 'XLSX'): NativeDocument {
  const archive = readZip(buffer);
  const types = packageParts(archive, type);
  const warnings = [REFLOW, 'Page count is unknown without the native renderer. Fields, drawings/textboxes, formulas, comments, and unsupported text constructs are left untouched.'];
  const sources: Source[] = [];
  const imageCount = [...types].filter(([, ct]) => ct.toLowerCase().startsWith('image/')).length;
  if (type === 'DOCX') {
    const blocked = new Set(['drawing', 'pict', 'object', 'txbxContent', 'fldSimple', 'sdt', 'del', 'moveFrom']);
    for (const e of archive.entries) {
      if (!/^word\/(?:document|header[^/]*|footer[^/]*|footnotes|endnotes)\.xml$/u.test(e.name)) continue;
      const xml = parseXml(e.name, e.data);
      const expectedRoot = e.name === 'word/document.xml' ? 'document' : e.name.startsWith('word/header') ? 'hdr' : e.name.startsWith('word/footer') ? 'ftr' : e.name.includes('footnotes') ? 'footnotes' : 'endnotes';
      check(WORD.has(xml.root.ns) && xml.root.local === expectedRoot, 'Invalid WordprocessingML part');
      const protectedParagraphs = new Set<Node>();
      for (const node of xml.nodes) if (WORD.has(node.ns) && ['fldChar', 'fldSimple', 'instrText'].includes(node.local)) {
        const p = ancestors(node).find(n => WORD.has(n.ns) && n.local === 'p'); if (p) protectedParagraphs.add(p);
      }
      let fieldDepth = 0; let malformedField = false;
      for (const node of xml.nodes) {
        if (WORD.has(node.ns) && node.local === 'fldChar') {
          const kind = attr(node, WORD, 'fldCharType');
          if (kind === 'begin') fieldDepth++;
          else if (kind === 'end') { if (!fieldDepth) malformedField = true; else fieldDepth--; }
        }
        if (!WORD.has(node.ns) || node.local !== 't' || node.parent?.local !== 'r' || fieldDepth) continue;
        const parents = ancestors(node);
        if (parents.some(n => !WORD.has(n.ns) || blocked.has(n.local) || protectedParagraphs.has(n))) continue;
        editableXmlText(xml, node);
      }
      if (fieldDepth || malformedField) { xml.source.spans = []; warnings.push(`${e.name}: unbalanced fields; this entire part was left unchanged.`); }
      sources.push(xml.source);
    }
  } else {
    const workbook = parseXml('xl/workbook.xml', archive.byName.get('xl/workbook.xml')!.data);
    check(SHEET.has(workbook.root.ns) && workbook.root.local === 'workbook', 'Invalid SpreadsheetML workbook');
    const shared = archive.byName.get('xl/sharedStrings.xml');
    const strings = shared ? parseXml(shared.name, shared.data) : undefined;
    if (strings) check(SHEET.has(strings.root.ns) && strings.root.local === 'sst', 'Invalid shared-string table');
    const stringItems = strings?.root.children.filter(n => n.ns === strings.root.ns && n.local === 'si') ?? [];
    const protectedStrings = new Set<number>();
    for (const e of archive.entries) {
      if (!/^xl\/worksheets\/[^/]+\.xml$/u.test(e.name)) continue;
      const xml = parseXml(e.name, e.data);
      check(SHEET.has(xml.root.ns) && xml.root.local === 'worksheet', 'Invalid worksheet part');
      for (const cell of xml.nodes.filter(n => n.ns === xml.root.ns && n.local === 'c' && n.parent?.local === 'row' && n.parent.parent?.local === 'sheetData')) {
        const formula = cell.children.some(n => n.ns === cell.ns && n.local === 'f');
        if (cell.attrs.get('t') === 's') {
          const v = cell.children.find(n => n.local === 'v' && n.ns === cell.ns);
          const value = v?.texts.map(t => t.value).join('') ?? '';
          check(/^\d+$/u.test(value) && Number(value) < stringItems.length, 'Invalid shared-string cell reference');
          if (formula) protectedStrings.add(Number(value));
        }
        if (cell.attrs.get('t') !== 'inlineStr' || formula) continue;
        const inline = cell.children.find(n => n.ns === cell.ns && n.local === 'is');
        if (!inline) continue;
        for (const n of [inline, ...inline.children.flatMap(c => [c, ...c.children])]) {
          if (n.local === 't' && n.ns === cell.ns && (n.parent === inline || (n.parent?.local === 'r' && n.parent.parent === inline))) editableXmlText(xml, n);
        }
      }
      sources.push(xml.source);
    }
    if (strings) {
      stringItems.forEach((si, i) => {
        if (protectedStrings.has(i)) return;
        for (const n of si.children.flatMap(c => [c, ...c.children])) if (n.ns === si.ns && n.local === 't' && (n.parent === si || (n.parent?.local === 'r' && n.parent.parent === si))) editableXmlText(strings, n);
      });
      sources.push(strings.source);
      warnings.push('Shared-string edits affect every referencing cell. Formula text and cached values are untouched, but formulas that depend on edited cells may recalculate differently. Phonetic/escaped strings remain unchanged.');
    }
  }
  return documentFromSources(buffer, sources, warnings, imageCount, changes => rewriteZip(buffer, archive, changes));
}

function proseSpans(source: Source, start: number, end: number, markdown: boolean): void {
  const text = source.text.slice(start, end);
  const protectedPattern = markdown ? /(?:https?:\/\/|ftp:\/\/|www\.|mailto:|data:)\S+|[*_~]+/giu : /(?:https?:\/\/|ftp:\/\/|www\.|mailto:|data:)\S+/giu;
  let at = 0;
  const accept = markdown ? (s: string) => !/[`*_~\[\]<>!|#\\]/u.test(s) && !/(?:https?:|data:|www\.)/iu.test(s) && !/^\s*(?:[-+>]\s|\d+[.)]\s|={3,}|-{3,})/u.test(s) : undefined;
  for (const match of text.matchAll(protectedPattern)) {
    addSpan(source, start + at, start + match.index!, undefined, undefined, accept);
    at = match.index! + match[0].length;
  }
  addSpan(source, start + at, end, undefined, undefined, accept);
}
function preparePlain(buffer: Buffer, type: 'TXT' | 'MD'): NativeDocument {
  const source: Source = { name: type.toLowerCase(), ...decodeText(buffer), spans: [] };
  check(!/^(?:%PDF-|PK\x03\x04|\{\\rtf|\x89PNG|GIF8|\x7fELF|MZ)/u.test(source.text) && validChars(source.text), 'Binary or mismatched document signature');
  const warnings = ['Original BOM, encoding, line endings, and spacing wrappers are preserved; only shorter/equal-length single-line prose is editable. Page count is unknown.'];
  const lines = [...source.text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/gu)].filter(m => m[0].length);
  if (type === 'TXT') {
    for (const line of lines) proseSpans(source, line.index!, line.index! + line[0].replace(/[\r\n]+$/u, '').length, false);
  } else {
    warnings.push('Markdown headings, tables, lists, fenced/indented code, HTML, image/link/reference paragraphs, and other ambiguous blocks are deliberately not rewritten.');
    // Raw HTML can span blank lines and contain arbitrary embedded languages.
    // Rather than guessing its boundaries, leave such Markdown documents intact.
    if (/<\/?[A-Za-z][^>]*>|<!--/u.test(source.text)) warnings.push('Raw HTML detected: all Markdown text was conservatively left unchanged.');
    else {
      let fence: { marker: string; length: number } | undefined;
      let frontmatter = false;
      let paragraph: typeof lines = [];
      const flush = () => {
        if (!paragraph.length) return;
        const values = paragraph.map(l => l[0].replace(/[\r\n]+$/u, ''));
        const unsafe = values.some(l => /^\s*(?:#{1,6}(?:\s|$)|>|[-+*]\s|\d+[.)]\s|[-=]{2,}\s*$|\[[^\]]+\]:)/u.test(l) || /[\[\]`|<>\\]/u.test(l) || /^(?: {4}|\t)/u.test(l));
        if (!unsafe) for (const l of paragraph) proseSpans(source, l.index!, l.index! + l[0].replace(/[\r\n]+$/u, '').length, true);
        paragraph = [];
      };
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i][0].replace(/[\r\n]+$/u, '');
        if (i === 0 && /^(?:---|\+\+\+)\s*$/u.test(line)) { frontmatter = true; continue; }
        if (frontmatter) { if (/^(?:---|\+\+\+|\.\.\.)\s*$/u.test(line)) frontmatter = false; continue; }
        const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line);
        if (fence) { if (marker && marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined; continue; }
        if (marker) { flush(); fence = { marker: marker[1][0], length: marker[1].length }; continue; }
        if (!line.trim()) flush(); else paragraph.push(lines[i]);
      }
      flush();
      if (fence || frontmatter) warnings.push('Unclosed fence/front matter was left untouched through end-of-file.');
    }
  }
  return documentFromSources(buffer, [source], warnings, 0, changes => changes.get(source.name)!);
}

type RtfGroup = { parent?: RtfGroup; blocked: boolean; first?: string };
type RtfToken = { start: number; end: number; group: RtfGroup; kind: 'text' | 'control' | 'symbol' | 'binary'; word?: string; value?: number };
function prepareRtf(buffer: Buffer): NativeDocument {
  const text = buffer.toString('latin1');
  check(/^\{\\rtf1(?=[\\\s])/u.test(text), 'Not an RTF version 1 signature');
  const source: Source = { name: 'rtf', text, encode: s => Buffer.from(s, 'latin1'), spans: [] };
  const tokens: RtfToken[] = []; const groups: RtfGroup[] = []; const stack: RtfGroup[] = [];
  // Unknown destination groups are opaque, not guessed to be body text.
  const formatting = new Set(['rtf', 'ansi', 'ansicpg', 'deff', 'deflang', 'pard', 'plain', 'b', 'i', 'ul', 'ulnone', 'strike', 'f', 'fs', 'cf', 'highlight', 'lang', 'qc', 'ql', 'qr', 'qj', 'sa', 'sb', 'fi', 'li', 'ri', 'sl', 'slmult', 'super', 'sub', 'nosupersub']);
  const opaque = new Set(['pict', 'object', 'objdata', 'field', 'fldinst', 'fldrslt', 'fonttbl', 'colortbl', 'stylesheet', 'info', 'header', 'headerl', 'headerr', 'footer', 'footerl', 'footerr', 'footnote', 'annotation', 'shp', 'shpinst', 'shptxt', 'nonshppict', 'shppict', 'listtable', 'listoverridetable', 'datafield', 'upr', 'ud']);
  let at = 0; let closed = false; let imageCount = 0;
  while (at < text.length) {
    const c = text[at];
    if (closed) { check(!text.slice(at).trim(), 'Data after RTF root'); break; }
    if (c === '{') { const group: RtfGroup = { parent: stack[stack.length - 1], blocked: false }; stack.push(group); groups.push(group); check(stack.length <= 256 && groups.length <= 200_000, 'RTF nesting exceeds limits'); at++; continue; }
    if (c === '}') { check(stack.length, 'Unbalanced RTF group'); stack.pop(); at++; if (!stack.length) closed = true; continue; }
    check(stack.length, 'Text outside RTF root'); const group = stack[stack.length - 1];
    if (c !== '\\') {
      const start = at; while (at < text.length && !/[{}\\]/u.test(text[at])) at++;
      tokens.push({ start, end: at, group, kind: 'text' });
      if (text.slice(start, at).trim() && !group.first) group.first = 'text';
    } else {
      const start = at++;
      check(at < text.length, 'Truncated RTF escape');
      const control = /^([a-zA-Z]{1,32})(-?\d+)? ?/u.exec(text.slice(at));
      if (control) {
        at += control[0].length; const word = control[1]; const value = control[2] === undefined ? undefined : Number(control[2]);
        check(value === undefined || (Number.isSafeInteger(value) && Math.abs(value) <= 2147483648), 'Invalid RTF control parameter');
        if (!group.first) { group.first = word; if (!formatting.has(word)) group.blocked = true; }
        if (opaque.has(word)) group.blocked = true;
        if (word === 'pict') imageCount++;
        tokens.push({ start, end: at, group, kind: 'control', word, value });
        if (word === 'bin') { check(value !== undefined && value >= 0 && at + value <= text.length, 'Invalid RTF binary payload length'); tokens.push({ start: at, end: at + value, group, kind: 'binary' }); at += value; }
      } else {
        const symbol = text[at++];
        if (symbol === "'") { check(/^[0-9a-fA-F]{2}$/u.test(text.slice(at, at + 2)), 'Invalid RTF hex escape'); at += 2; }
        if (symbol === '*') group.blocked = true;
        tokens.push({ start, end: at, group, kind: 'symbol', word: symbol });
      }
    }
    check(tokens.length <= 400_000, 'RTF token count exceeds limits');
  }
  check(closed && !stack.length, 'Incomplete RTF document');
  const warnings = [REFLOW, 'Conservative RTF: only literal ASCII body prose is edited. Destinations, fields, tables, hidden text, escaped/Unicode paragraphs, binary data and unknown groups remain unchanged. Non-ASCII replacements are not supported. Page count is unknown.'];
  const blocked = (g: RtfGroup): boolean => { for (let n: RtfGroup | undefined = g; n; n = n.parent) if (n.blocked) return true; return false; };
  let paragraph: RtfToken[] = []; let unsafe = false; let table = false;
  const flush = () => {
    if (!unsafe && !table) for (const token of paragraph) if (token.kind === 'text') {
      const raw = text.slice(token.start, token.end);
      for (const line of raw.matchAll(/[^\r\n]+/gu)) addSpan(source, token.start + line.index!, token.start + line.index! + line[0].length, undefined,
        // Hex-escape every replacement byte: braces/backslashes cannot become
        // control syntax, nor can text merge with a preceding control word.
        s => Array.from(s, c => `\\'${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''), s => /^[\x20-\x7e]*$/u.test(s));
    }
    paragraph = []; unsafe = false;
  };
  for (const token of tokens) {
    if (blocked(token.group)) continue;
    if (token.kind === 'control' && token.word === 'trowd') { flush(); table = true; }
    if (token.kind === 'control' && ['intbl', 'cell', 'nestcell', 'nestrow', 'u', 'v'].includes(token.word!)) unsafe = true;
    if (token.kind === 'symbol' || token.kind === 'binary' || (token.kind === 'text' && /[^\x20-\x7e\r\n]/u.test(text.slice(token.start, token.end)))) unsafe = true;
    if (token.kind === 'control' && ['par', 'row', 'pard'].includes(token.word!)) { flush(); if (token.word === 'row') table = false; }
    else paragraph.push(token);
  }
  flush();
  return documentFromSources(buffer, [source], warnings, imageCount, changes => changes.get(source.name)!);
}

/** Lossless native-container edits, not a document conversion or layout engine. */
export async function prepareOfficeDocument(buffer: Buffer, fileType: FileType): Promise<NativeDocument> {
  try {
    check(Buffer.isBuffer(buffer) && buffer.length > 0 && buffer.length <= MAX_INPUT, 'Empty input or input exceeds 128 MiB safety limit');
    const original = Buffer.from(buffer);
    if (fileType === 'DOCX' || fileType === 'XLSX') return prepareOoxml(original, fileType);
    if (fileType === 'RTF') return prepareRtf(original);
    if (fileType === 'TXT' || fileType === 'MD') return preparePlain(original, fileType);
    unsupported(String(fileType), 'Unknown file extension');
  } catch (error) {
    unsupported(fileType, error instanceof Error ? error.message : String(error));
  }
}
