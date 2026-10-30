/**
 * Native in-place PDF text editor.
 *
 * The document is never rebuilt. Each page content stream is parsed, the text
 * showing operators are grouped into logical blocks (a line or paragraph that
 * shares one font and size), and the humanized replacement is written back into
 * the exact same byte ranges.
 *
 * Every text run keeps its own original advance slot: the replacement is
 * distributed over the runs and each run is horizontally scaled (Tz) so it ends
 * at precisely the width it had before. Origins, line breaks, word gaps, image
 * placements, vector graphics, fonts and every other byte of the file stay
 * untouched. A block whose replacement cannot fit its slots is left exactly as
 * it was and reported as a warning instead of being reflowed.
 */

import zlib from 'zlib';
import {
  PDFDocument,
  PDFName,
  PDFRef,
  PDFDict,
  PDFArray,
  PDFRawStream,
  PDFNumber,
  decodePDFRawStream,
} from 'pdf-lib';
import {Font as StdFont, FontNames, Encodings} from '@pdf-lib/standard-fonts';
import type {NativeDocument, NativeTextUnit, NativeApplyResult} from './native-types';

const MAX_UNITS = 20000;
/** A run may be squeezed at most this much to stay inside its original slot. */
const FIT_MIN = 0.85;

// ─── Font measurement ────────────────────────────────────────────────────────

interface FontMeasurer {
  /** Decode PDF string bytes into Unicode text, or null when a code is unknown. */
  decode(bytes: number[]): string | null;
  /** Encode Unicode text into PDF string bytes, or null when unsupported. */
  encode(text: string): number[] | null;
  /** Advance width of one encoded byte in 1/1000 em. */
  widthOfCode(code: number): number;
  /** True when every character can be encoded. */
  supports(text: string): boolean;
}

const STANDARD_FONT_NAMES: Record<string, string> = {
  Helvetica: FontNames.Helvetica,
  'Helvetica-Bold': FontNames.HelveticaBold,
  'Helvetica-Oblique': FontNames.HelveticaOblique,
  'Helvetica-BoldOblique': FontNames.HelveticaBoldOblique,
  Arial: FontNames.Helvetica,
  'Arial-Bold': FontNames.Helvetica,
  'Arial-BoldMT': FontNames.HelveticaBold,
  'ArialMT': FontNames.Helvetica,
  'Arial-Black': FontNames.Helvetica,
  Courier: FontNames.Courier,
  'Courier-Bold': FontNames.CourierBold,
  'Courier-Oblique': FontNames.CourierOblique,
  'Courier-BoldOblique': FontNames.CourierBoldOblique,
  TimesRoman: FontNames.TimesRoman,
  'Times-Roman': FontNames.TimesRoman,
  'Times-Bold': FontNames.TimesRomanBold,
  'Times-Italic': FontNames.TimesRomanItalic,
  'Times-BoldItalic': FontNames.TimesRomanBoldItalic,
  Symbol: FontNames.Symbol,
  ZapfDingbats: FontNames.ZapfDingbats,
};

type EncodingName = 'WinAnsi' | 'Standard' | 'MacRoman' | 'PDFDoc' | 'Symbol' | 'ZapfDingbats';

function encodingFor(name: string): EncodingName | null {
  switch (name) {
    case 'WinAnsiEncoding':
      return 'WinAnsi';
    case 'StandardEncoding':
      return 'Standard';
    case 'MacRomanEncoding':
      return 'MacRoman';
    case 'PDFDocEncoding':
      return 'PDFDoc';
    case 'SymbolEncoding':
      return 'Symbol';
    case 'ZapfDingbatsEncoding':
      return 'ZapfDingbats';
    default:
      return null;
  }
}

function stdEncoding(enc: EncodingName) {
  if (enc === 'Symbol') return Encodings.Symbol;
  if (enc === 'ZapfDingbats') return Encodings.ZapfDingbats;
  return Encodings.WinAnsi;
}

// Code -> unicode for the simple encodings @pdf-lib/standard-fonts does not ship.
const STANDARD_ENCODING_EXTRA: Record<number, string> = {
  0x24: '$', 0x27: "'", 0x60: '`', 0x7c: '|', 0x7e: '~', 0xa1: '¡',
};

const MACROMAN_EXTRA: Record<number, string> = {
  0x80: 'Ä', 0x81: 'Å', 0x82: 'Ç', 0x83: 'É', 0x84: 'Ñ', 0x85: 'Ö',
  0x86: 'Ü', 0x87: 'á', 0x88: 'à', 0x89: 'â', 0x8a: 'ä', 0x8b: 'ã',
  0x8c: 'å', 0x8d: 'ç', 0x8e: 'é', 0x8f: 'è', 0x90: 'ê', 0x91: 'ë',
  0x92: 'í', 0x93: 'ì', 0x94: 'î', 0x95: 'ï', 0x96: 'ñ', 0x97: 'ó',
  0x98: 'ò', 0x99: 'ô', 0x9a: 'ö', 0x9b: 'õ', 0x9c: 'ú', 0x9d: 'ù',
  0x9e: 'û', 0x9f: 'ü', 0xa0: '†', 0xa1: '°', 0xa2: '¢', 0xa3: '£',
  0xa4: '§', 0xa5: '•', 0xa6: '¶', 0xa7: 'â', 0xa8: '™', 0xa9: '´',
};

function buildCodeMaps(enc: EncodingName): {
  codeToChar: Map<number, string>;
  charToCode: Map<string, number>;
} {
  const codeToChar = new Map<number, string>();
  const charToCode = new Map<string, number>();

  const table =
    enc === 'Symbol' ? Encodings.Symbol :
    enc === 'ZapfDingbats' ? Encodings.ZapfDingbats :
    enc === 'WinAnsi' || enc === 'PDFDoc' ? Encodings.WinAnsi :
    null;

  if (table) {
    for (const cp of table.supportedCodePoints) {
      const mapped = table.encodeUnicodeCodePoint(cp as number);
      if (!mapped || codeToChar.has(mapped.code)) continue;
      codeToChar.set(mapped.code, String.fromCodePoint(cp as number));
    }
  } else if (enc === 'MacRoman') {
    for (let c = 0x20; c <= 0x7e; c++) codeToChar.set(c, String.fromCharCode(c));
    for (const [c, ch] of Object.entries(MACROMAN_EXTRA)) codeToChar.set(Number(c), ch);
  } else {
    for (let c = 0x20; c <= 0x7e; c++) codeToChar.set(c, String.fromCharCode(c));
    for (const [c, ch] of Object.entries(STANDARD_ENCODING_EXTRA)) codeToChar.set(Number(c), ch);
  }

  for (const [c, ch] of codeToChar) {
    if (!charToCode.has(ch)) charToCode.set(ch, c);
  }
  return {codeToChar, charToCode};
}

/** Glyph-name -> unicode code point, learned from the standard AFM tables. */
let glyphNameToUnicode: Map<string, number> | null = null;
function glyphUnicode(name: string): number | undefined {
  if (!glyphNameToUnicode) {
    glyphNameToUnicode = new Map();
    for (const table of [Encodings.WinAnsi, Encodings.Symbol, Encodings.ZapfDingbats]) {
      for (const cp of table.supportedCodePoints) {
        const mapped = table.encodeUnicodeCodePoint(cp as number);
        if (mapped && !glyphNameToUnicode.has(mapped.name)) {
          glyphNameToUnicode.set(mapped.name, cp as number);
        }
      }
    }
  }
  if (glyphNameToUnicode.has(name)) return glyphNameToUnicode.get(name);
  if (name.length === 1) return name.charCodeAt(0);
  const uni = /^uni([0-9A-Fa-f]{4})$/.exec(name);
  if (uni) return parseInt(uni[1], 16);
  return undefined;
}

function buildFontMeasurer(fontDict: PDFDict): {measurer: FontMeasurer | null; reason: string} {
  const dict = fontDict;
  const subtype = String(dict.get(PDFName.of('Subtype')) || '');
  if (subtype.includes('Type0') || subtype.includes('Type2') || subtype.includes('Type3')) {
    return {measurer: null, reason: 'composite/embedded bitmap font (glyph re-encoding not supported)'};
  }
  if (!subtype.includes('Type1') && !subtype.includes('TrueType') && !subtype.includes('MMType1')) {
    return {measurer: null, reason: `unsupported font subtype ${subtype || 'unknown'}`};
  }
  const baseName = String(dict.get(PDFName.of('BaseFont')) || '').replace(/^\//, '');
  const stripped = baseName.replace(/^[A-Z]{6}\+/, '');
  const encodingEntry = dict.get(PDFName.of('Encoding'));
  let encName: EncodingName | null = null;
  let differences: Map<number, string> | null = null;

  if (encodingEntry instanceof PDFName) {
    encName = encodingFor(encodingEntry.decodeText());
  } else if (encodingEntry instanceof PDFDict) {
    const base = encodingEntry.get(PDFName.of('BaseEncoding'));
    if (base instanceof PDFName) encName = encodingFor(base.decodeText());
    const diff = encodingEntry.get(PDFName.of('Differences'));
    if (diff instanceof PDFArray) {
      differences = new Map();
      let code = 0;
      for (let i = 0; i < diff.size(); i++) {
        const item = diff.get(i);
        if (item instanceof PDFNumber) {
          code = Number(item.toString());
        } else if (item instanceof PDFName) {
          differences.set(code, item.decodeText());
          code++;
        }
      }
    }
  }

  if (!encName) {
    if (stripped.startsWith('Symbol')) encName = 'Symbol';
    else if (stripped.startsWith('ZapfDingbats')) encName = 'ZapfDingbats';
    else encName = 'WinAnsi'; // PDF spec default for non-symbolic fonts
  }

  const {codeToChar, charToCode} = buildCodeMaps(encName);

  if (differences) {
    for (const [code, gname] of differences) {
      const cp = glyphUnicode(gname);
      if (cp === undefined) {
        return {measurer: null, reason: 'font /Differences maps to an unknown glyph name'};
      }
      const ch = String.fromCodePoint(cp);
      codeToChar.set(code, ch);
      charToCode.set(ch, code);
    }
  }

  // Widths: prefer the document's own /Widths array, fall back to the standard AFM.
  let widthOfCode: (code: number) => number;
  const firstCharEntry = dict.get(PDFName.of('FirstChar'));
  const widthsEntry = dict.get(PDFName.of('Widths'));
  const stdName = STANDARD_FONT_NAMES[stripped];

  if (widthsEntry instanceof PDFArray && firstCharEntry instanceof PDFNumber) {
    const firstChar = Number(firstCharEntry.toString());
    const widths: number[] = [];
    for (let i = 0; i < widthsEntry.size(); i++) {
      const v = widthsEntry.get(i);
      widths.push(v instanceof PDFNumber ? Number(v.toString()) : 0);
    }
    const fallback = stdName ? StdFont.load(stdName as never) : null;
    const fallbackMetrics = fallback
      ? (fallback.CharMetrics as unknown as Record<string, {WX?: number}>)
      : null;
    widthOfCode = (code: number) => {
      const idx = code - firstChar;
      if (idx >= 0 && idx < widths.length) return widths[idx];
      const metric = fallbackMetrics?.[String(code)];
      if (metric && typeof metric.WX === 'number') return metric.WX;
      return -1; // unknown: caller must treat the font as unmeasurable
    };
  } else if (stdName) {
    const loaded = StdFont.load(stdName as never);
    const metrics = loaded.CharMetrics as unknown as Record<string, {WX?: number}>;
    widthOfCode = (code: number) => metrics[String(code)]?.WX ?? -1;
  } else {
    return {measurer: null, reason: `no width table for font ${stripped || 'unnamed'}`};
  }

  // Only keep codes that are actually measurable, so fit checks never lie.
  for (const code of [...codeToChar.keys()]) {
    if (widthOfCode(code) < 0) {
      const ch = codeToChar.get(code)!;
      charToCode.delete(ch);
      codeToChar.delete(code);
    }
  }
  if (codeToChar.size === 0) {
    return {measurer: null, reason: `font ${stripped || 'unnamed'} has no measurable glyphs`};
  }

  const measurer: FontMeasurer = {
    decode(bytes: number[]) {
      let out = '';
      for (const b of bytes) {
        const ch = codeToChar.get(b);
        if (ch === undefined) return null;
        out += ch;
      }
      return out;
    },
    encode(text: string) {
      const bytes: number[] = [];
      for (const ch of text) {
        const code = charToCode.get(ch);
        if (code === undefined) return null;
        bytes.push(code);
      }
      return bytes;
    },
    widthOfCode,
    supports(text: string) {
      for (const ch of text) if (!charToCode.has(ch)) return false;
      return true;
    },
  };

  return {measurer, reason: ''};
}

// ─── Content stream tokenizer ────────────────────────────────────────────────

const DELIMITERS = new Set([
  0x20, 0x09, 0x0a, 0x0c, 0x0d, 0x2f /* / */, 0x28 /* ( */, 0x3c /* < */,
  0x3e /* > */, 0x5b /* [ */, 0x5d /* ] */, 0x7b /* { */, 0x7d /* } */,
]);

interface Token {
  start: number;
  end: number;
  kind: 'number' | 'name' | 'string' | 'hex' | 'array' | 'operator';
  value: string;
  /** Decoded PDF string bytes for string/hex tokens. */
  bytes?: number[];
  /** Tokens between [ and ] for array tokens. */
  items?: Token[];
}

function unescapePdfName(raw: string): string {
  return raw.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function readLiteralBytes(buf: Uint8Array, from: number): {bytes: number[]; end: number} {
  const bytes: number[] = [];
  let depth = 1;
  let i = from + 1;
  while (i < buf.length) {
    const c = buf[i];
    if (c === 0x5c /* \ */) {
      const n = buf[i + 1];
      if (n === 0x6e) bytes.push(10);
      else if (n === 0x72) bytes.push(13);
      else if (n === 0x74) bytes.push(9);
      else if (n === 0x62) bytes.push(8);
      else if (n === 0x66) bytes.push(12);
      else if (n === 0x28) bytes.push(40);
      else if (n === 0x29) bytes.push(41);
      else if (n === 0x5c) bytes.push(92);
      else if (n >= 0x30 && n <= 0x37) {
        let oct = '';
        let j = i + 1;
        while (j < buf.length && oct.length < 3 && buf[j] >= 0x30 && buf[j] <= 0x37) {
          oct += String.fromCharCode(buf[j]);
          j++;
        }
        bytes.push(parseInt(oct, 8) & 0xff);
        i = j;
        continue;
      } else if (n === 10) {
        i += 2;
        continue;
      } else if (n === 13) {
        i += buf[i + 2] === 10 ? 3 : 2;
        continue;
      } else {
        bytes.push(n === undefined ? 0x5c : n);
      }
      i += 2;
      continue;
    }
    if (c === 0x28) {
      depth++;
      bytes.push(c);
      i++;
      continue;
    }
    if (c === 0x29) {
      depth--;
      if (depth === 0) return {bytes, end: i + 1};
      bytes.push(c);
      i++;
      continue;
    }
    bytes.push(c);
    i++;
  }
  return {bytes, end: buf.length};
}

function hexToBytes(hex: string): number[] {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  const padded = clean.length % 2 ? `${clean}0` : clean;
  const out: number[] = [];
  for (let i = 0; i < padded.length; i += 2) out.push(parseInt(padded.slice(i, i + 2), 16));
  return out;
}

function indexOfByte(buf: Uint8Array, byte: number, from: number): number {
  for (let i = from; i < buf.length; i++) if (buf[i] === byte) return i;
  return -1;
}

function findInlineImageEnd(buf: Uint8Array, from: number): number {
  for (let i = from; i < buf.length - 1; i++) {
    if (buf[i] === 0x45 /* E */ && buf[i + 1] === 0x49 /* I */) {
      const before = i > 0 ? buf[i - 1] : 0x20;
      const after = buf[i + 2];
      const okBefore = before === 10 || before === 13 || before === 32 || before === 9;
      const okAfter =
        after === undefined || after === 10 || after === 13 || after === 32 || after === 9;
      if (okBefore && okAfter) return i + 2;
    }
  }
  return buf.length;
}

function tokenize(buf: Uint8Array): Token[] {
  const tokens: Token[] = [];
  const frames: Array<{start: number; items: Token[]}> = [];
  const emit = (t: Token) => (frames.length ? frames[frames.length - 1].items : tokens).push(t);

  let i = 0;
  while (i < buf.length) {
    const c = buf[i];
    if (c === 9 || c === 10 || c === 12 || c === 13 || c === 32) {
      i++;
      continue;
    }
    if (c === 0x25 /* % */) {
      while (i < buf.length && buf[i] !== 10 && buf[i] !== 13) i++;
      continue;
    }
    const start = i;

    if (c === 0x2f /* / */) {
      i++;
      while (i < buf.length && !DELIMITERS.has(buf[i])) i++;
      emit({
        start,
        end: i,
        kind: 'name',
        value: unescapePdfName(Buffer.from(buf.subarray(start + 1, i)).toString('latin1')),
      });
      continue;
    }
    if (c === 0x28 /* ( */) {
      const r = readLiteralBytes(buf, i);
      emit({start, end: r.end, kind: 'string', value: '', bytes: r.bytes});
      i = r.end;
      continue;
    }
    if (c === 0x3c /* < */) {
      if (buf[i + 1] === 0x3c) {
        let depth = 1;
        i += 2;
        while (i < buf.length && depth > 0) {
          if (buf[i] === 0x3c && buf[i + 1] === 0x3c) {
            depth++;
            i += 2;
            continue;
          }
          if (buf[i] === 0x3e && buf[i + 1] === 0x3e) {
            depth--;
            i += 2;
            continue;
          }
          if (buf[i] === 0x28) {
            i = readLiteralBytes(buf, i).end;
            continue;
          }
          i++;
        }
        emit({start, end: i, kind: 'operator', value: '<<dict>>'});
        continue;
      }
      const close = indexOfByte(buf, 0x3e, i + 1);
      const end = close === -1 ? buf.length : close + 1;
      emit({
        start,
        end,
        kind: 'hex',
        value: '',
        bytes: hexToBytes(Buffer.from(buf.subarray(i + 1, end - 1)).toString('latin1')),
      });
      i = end;
      continue;
    }
    if (c === 0x5b /* [ */) {
      frames.push({start, items: []});
      i++;
      continue;
    }
    if (c === 0x5d /* ] */) {
      const frame = frames.pop();
      i++;
      if (frame) emit({start: frame.start, end: i, kind: 'array', value: '', items: frame.items});
      continue;
    }

    while (i < buf.length && !DELIMITERS.has(buf[i])) i++;
    const word = Buffer.from(buf.subarray(start, i)).toString('latin1');
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(word)) {
      emit({start, end: i, kind: 'number', value: word});
    } else if (word === 'BI') {
      const ei = findInlineImageEnd(buf, start);
      emit({start, end: ei, kind: 'operator', value: 'BI'});
      i = ei;
    } else {
      emit({start, end: i, kind: 'operator', value: word});
    }
  }
  return tokens;
}

// ─── Text run / block extraction ─────────────────────────────────────────────

type ShowOp = 'Tj' | 'TJ' | 'quote';

interface Run {
  pageIndex: number;
  /** Byte offset of the first operand of the showing operator. */
  start: number;
  /** Byte offset just after its operator keyword. */
  end: number;
  op: ShowOp;
  fontKey: string;
  size: number;
  charSpacing: number;
  wordSpacing: number;
  /** Original horizontal scale (Tz/100). */
  hScale: number;
  /** Encoded bytes of the original text. */
  bytes: number[];
  /** Width of the glyphs plus kerning at Tz=100. */
  cap: number;
  /** Rendered device width of the run in the original file. */
  slot: number;
  text: string;
  /** Text-space origin after the operators that precede this run. */
  x: number;
  y: number;
}

interface Block {
  pageIndex: number;
  runs: Run[];
  text: string;
  fontKey: string;
  size: number;
  /** Usable page width in text space, used to judge trailing free space. */
  pageWidth: number;
}

/** Width in text units (Tz not applied) of one operand sequence. */
function baseWidthOf(
  bytes: number[],
  kern: number,
  measurer: FontMeasurer,
  size: number,
  charSpacing: number,
  wordSpacing: number
): number {
  let adv = 0;
  let spaces = 0;
  for (const b of bytes) {
    adv += measurer.widthOfCode(b);
    if (b === 32) spaces++;
  }
  return (adv / 1000) * size + ((charSpacing * bytes.length + wordSpacing * spaces) / 1000) * size + kern;
}

function pageContentBytes(page: {node: PDFDict}, ctx: PDFDocument['context']): Uint8Array | null {
  const contents = page.node.get(PDFName.of('Contents'));
  const parts: Uint8Array[] = [];
  let ok = true;
  const push = (obj: unknown) => {
    if (!(obj instanceof PDFRawStream)) return;
    const filter = obj.dict.get(PDFName.of('Filter'));
    if (!filter) {
      parts.push(obj.contents);
      return;
    }
    try {
      parts.push(decodePDFRawStream(obj as never).decode());
    } catch {
      ok = false;
    }
  };
  if (contents instanceof PDFRef) push(ctx.lookup(contents));
  else if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      const item = contents.get(i);
      push(item instanceof PDFRef ? ctx.lookup(item) : item);
    }
  } else push(contents);
  if (!ok || parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  const total = parts.reduce((n, p) => n + p.length + 1, 0);
  const out = Buffer.alloc(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
    out[off++] = 10;
  }
  return new Uint8Array(out.buffer, out.byteOffset, off);
}

interface PageResources {
  fonts: Map<string, {measurer: FontMeasurer | null; reason: string}>;
  extGState: Map<string, PDFDict>;
}

function lookupResources(page: {node: PDFDict}, ctx: PDFDocument['context']): PDFDict | null {
  let node: PDFDict | undefined = page.node;
  let guard = 0;
  while (node && guard++ < 40) {
    const res = node.lookupMaybe(PDFName.of('Resources'), PDFDict);
    if (res) return res;
    node = node.lookupMaybe(PDFName.of('Parent'), PDFDict);
  }
  return null;
}

function collectResources(
  page: {node: PDFDict},
  ctx: PDFDocument['context'],
  cache: Map<string, {measurer: FontMeasurer | null; reason: string}>
): PageResources {
  const fonts = new Map<string, {measurer: FontMeasurer | null; reason: string}>();
  const extGState = new Map<string, PDFDict>();
  const res = lookupResources(page, ctx);
  const fontDict = res?.lookupMaybe(PDFName.of('Font'), PDFDict);
  if (fontDict) {
    for (const [key, value] of fontDict.entries()) {
      const name = (key as PDFName).decodeText();
      const ref = value instanceof PDFRef ? value : null;
      const cacheKey = ref ? ref.toString() : '';
      let entry = cacheKey ? cache.get(cacheKey) : undefined;
      if (!entry) {
        const dict = ref ? ctx.lookup(ref) : value;
        entry = dict instanceof PDFDict ? buildFontMeasurer(dict) : {measurer: null, reason: 'font object not found'};
        if (cacheKey) cache.set(cacheKey, entry);
      }
      fonts.set(name, entry);
    }
  }
  const gsDict = res?.lookupMaybe(PDFName.of('ExtGState'), PDFDict);
  if (gsDict) {
    for (const [key, value] of gsDict.entries()) {
      const name = (key as PDFName).decodeText();
      const dict = value instanceof PDFRef ? ctx.lookup(value) : value;
      if (dict instanceof PDFDict) extGState.set(name, dict);
    }
  }
  return {fonts, extGState};
}

const TEXT_STATE_OPS = new Set(['Tc', 'Tw', 'Tz', 'TL', 'Ts', 'Tr', 'gs', 'Tf']);

function extractBlocks(
  buf: Uint8Array,
  pageIndex: number,
  res: PageResources,
  notes: Set<string>,
  pageWidth: number
): {blocks: Block[]; runs: Run[]} {
  const tokens = tokenize(buf);
  const blocks: Block[] = [];
  const allRuns: Run[] = [];

  let fontKey = '';
  let size = 0;
  let charSpacing = 0;
  let wordSpacing = 0;
  let hScale = 1;
  let leading = 0;
  let x = 0;
  let y = 0;
  let inTextObject = false;

  let current: Block | null = null;
  let lastRun: Run | null = null;
  let blockLeft = 0;

  const endRun = () => {
    lastRun = null;
  };
  const endBlock = () => {
    if (current && current.runs.length > 0) blocks.push(current);
    current = null;
    endRun();
  };

  const num = (index: number, back: number) => {
    const t = tokens[index - back];
    return t && t.kind === 'number' ? Number(t.value) || 0 : 0;
  };

  const addToBlock = (run: Run) => {
    allRuns.push(run);
    const sameLine =
      lastRun === null ||
      (Math.abs(run.y - lastRun.y) < Math.max(0.6, Math.abs(size) * 0.02) &&
        Math.abs(run.x - (lastRun.x + lastRun.slot)) <= Math.max(2, lastRun.slot * 0.35));
    const newLine =
      lastRun !== null &&
      run.y !== lastRun.y &&
      Math.abs(run.y - lastRun.y) <= Math.abs(size || 0) * 2.4 + 2 &&
      Math.abs(run.x - blockLeft) <= Math.abs(size || 0) * 1.2 + 3;

    if (!current || (!sameLine && !newLine) || current.fontKey !== run.fontKey || current.size !== run.size) {
      endBlock();
      current = {pageIndex, runs: [], text: '', fontKey: run.fontKey, size: run.size, pageWidth};
      blockLeft = run.x;
    }
    if (current.runs.length > 0) {
      const prev = current.runs[current.runs.length - 1];
      if (Math.abs(run.y - prev.y) < 0.5) {
        const gap = run.x - (prev.x + prev.slot);
        current.text += gap > Math.abs(size) * 0.15 ? ' ' : '';
      } else {
        current.text += ' ';
      }
    }
    current.text += run.text;
    current.runs.push(run);
    lastRun = run;
    if (run.x < blockLeft) blockLeft = run.x;
  };

  const showString = (index: number, op: ShowOp, strings: number[][], kern: number, startOverride?: number) => {
    const entry = res.fonts.get(fontKey);
    const measurer = entry?.measurer;
    if (!measurer || !inTextObject || size <= 0) {
      endBlock();
      if (!measurer) notes.add(fontKey ? 'text uses a font that cannot be measured' : 'text has no selected font');
      return;
    }
    const bytes: number[] = [];
    let text = '';
    for (const s of strings) {
      const decoded = measurer.decode(s);
      if (decoded === null) {
        endBlock();
        notes.add('text uses a code point outside the font encoding');
        return;
      }
      bytes.push(...s);
      text += decoded;
    }
    const cap = baseWidthOf(bytes, kern, measurer, size, charSpacing, wordSpacing);
    const run: Run = {
      pageIndex,
      start: startOverride ?? tokens[index - 1].start,
      end: tokens[index].end,
      op,
      fontKey,
      size,
      charSpacing,
      wordSpacing,
      hScale,
      bytes,
      cap,
      slot: cap * hScale,
      text,
      x,
      y,
    };
    addToBlock(run);
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== 'operator') continue;

    switch (t.value) {
      case 'BT':
        inTextObject = true;
        fontKey = '';
        size = 0;
        charSpacing = 0;
        wordSpacing = 0;
        hScale = 1;
        leading = 0;
        x = 0;
        y = 0;
        endBlock();
        break;
      case 'ET':
        inTextObject = false;
        endBlock();
        break;
      case 'Tf': {
        const nameTok = tokens[i - 2];
        fontKey = nameTok && nameTok.kind === 'name' ? nameTok.value : '';
        size = num(i, 1);
        if (fontKey && !res.fonts.has(fontKey)) {
          notes.add(`page ${pageIndex + 1}: font /${fontKey} is not in the page resources`);
        }
        break;
      }
      case 'Td': {
        x += num(i, 2);
        y += num(i, 1);
        break;
      }
      case 'TD': {
        leading = -num(i, 1);
        x += num(i, 2);
        y += num(i, 1);
        break;
      }
      case 'T*': {
        y -= leading;
        break;
      }
      case 'Tm': {
        x = num(i, 2);
        y = num(i, 1);
        endBlock();
        break;
      }
      case 'TL':
        leading = num(i, 1);
        break;
      case 'Tc':
        charSpacing = num(i, 1);
        break;
      case 'Tw':
        wordSpacing = num(i, 1);
        break;
      case 'Tz':
        hScale = (num(i, 1) || 100) / 100;
        break;
      case 'gs': {
        const nameTok = tokens[i - 1];
        const state = nameTok && nameTok.kind === 'name' ? res.extGState.get(nameTok.value) : undefined;
        if (state) {
          const tz = state.lookupMaybe(PDFName.of('TZ'), PDFNumber) || state.lookupMaybe(PDFName.of('Tz'), PDFNumber);
          if (tz) hScale = (Number(tz.toString()) || 100) / 100;
          const tc = state.lookupMaybe(PDFName.of('TC'), PDFNumber);
          if (tc) charSpacing = Number(tc.toString()) || 0;
          const tw = state.lookupMaybe(PDFName.of('TW'), PDFNumber);
          if (tw) wordSpacing = Number(tw.toString()) || 0;
        }
        break;
      }
      case 'Tj': {
        const str = tokens[i - 1];
        if (str && (str.kind === 'string' || str.kind === 'hex')) showString(i, 'Tj', [str.bytes || []], 0);
        else endBlock();
        break;
      }
      case "'": {
        const str = tokens[i - 1];
        if (str && (str.kind === 'string' || str.kind === 'hex')) showString(i, 'quote', [str.bytes || []], 0);
        else endBlock();
        break;
      }
      case '"':
        notes.add('text uses the " operator (spacing operands) and is left unchanged');
        endBlock();
        break;
      case 'TJ': {
        const arr = tokens[i - 1];
        if (!arr || arr.kind !== 'array' || !arr.items) {
          endBlock();
          break;
        }
        const strings: number[][] = [];
        let kern = 0;
        for (const it of arr.items) {
          if (it.kind === 'string' || it.kind === 'hex') {
            strings.push(it.bytes || []);
          } else if (it.kind === 'number') {
            kern -= ((Number(it.value) || 0) / 1000) * size;
          } else {
            strings.length = 0;
            break;
          }
        }
        if (strings.length === 0) {
          notes.add('a TJ array did not contain plain strings');
          endBlock();
          break;
        }
        // The splice range covers the whole [ ... ] TJ sequence.
        showString(i, 'TJ', strings, kern, arr.start);
        break;
      }
      case 'q':
      case 'Q':
      case 'cm':
      case 're':
      case 'Do':
      case 'BDC':
      case 'BMC':
      case 'MP':
        endBlock();
        break;
      default:
        if (!TEXT_STATE_OPS.has(t.value)) endBlock();
        break;
    }
  }
  endBlock();
  return {blocks, runs: allRuns};
}

function escapeLiteral(bytes: number[]): Uint8Array {
  const out: number[] = [0x28];
  for (const b of bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c, b);
    else if (b === 10) out.push(0x5c, 0x6e);
    else if (b === 13) out.push(0x5c, 0x72);
    else out.push(b);
  }
  out.push(0x29);
  return Uint8Array.from(out);
}

const PUNCT_FALLBACKS: Record<string, string> = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'",
  '“': '"', '”': '"', '„': '"', '‟': '"',
  '–': '-', '—': '-', '−': '-', '‑': '-',
  '…': '...', ' ': ' ', ' ': ' ', ' ': ' ',
  ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ',
  '​': '', '﻿': '', '­': '',
  '•': '*', '●': '*', '▪': '-',
  '™': 'TM', '©': '(c)', '®': '(r)',
};

function softenUnsupported(text: string): string {
  let out = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  let res = '';
  for (const ch of out) res += PUNCT_FALLBACKS[ch] ?? ch;
  return res.replace(/\s+/g, ' ').trim();
}

function fmt(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Number.isFinite(r) ? String(r) : '100';
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function preparePdfDocument(buffer: Buffer): Promise<NativeDocument> {
  const doc = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
    updateMetadata: false,
    throwOnInvalidObject: false,
  });

  const measurerCache = new Map<string, {measurer: FontMeasurer | null; reason: string}>();
  const notes = new Set<string>();
  const units: NativeTextUnit[] = [];
  const blocks: Block[] = [];
  const pageContentLength = new Map<number, number>();

  const pages = doc.getPages();
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex] as unknown as {node: PDFDict};
    const content = pageContentBytes(page, doc.context);
    if (!content) {
      notes.add(`page ${pageIndex + 1}: content stream could not be decoded`);
      continue;
    }
    pageContentLength.set(pageIndex, content.length);
    const res = collectResources(page, doc.context, measurerCache);
    const {blocks: pageBlocks} = extractBlocks(content, pageIndex, res, notes, pages[pageIndex].getWidth());
    for (const block of pageBlocks) {
      if (units.length >= MAX_UNITS) break;
      const text = softenUnsupported(block.text);
      const letters = (text.match(/[A-Za-z\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF]/g) || []).length;
      if (letters < 3) continue;
      if (block.runs.some((r) => r.op === 'quote')) continue;
      units.push({id: `p${pageIndex + 1}-b${blocks.length + 1}`, text, pageNumber: pageIndex + 1});
      blocks.push(block);
    }
  }

  let imageCount = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
      imageCount++;
    }
  }

  const warnings = [...notes];

  const apply = async (replacements: string[]): Promise<NativeApplyResult> => {
    const outDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });

    const texts: string[] = [];
    const applyWarnings: string[] = [];
    let changed = 0;

    // Plan each block: split the replacement over its runs, keeping every slot.
    interface Edit {
      run: Run;
      bytes: number[];
      tz: number;
    }
    const pageEdits = new Map<number, Edit[]>();
    const warnedBlocks = new Set<string>();
    const resCache = new Map<number, PageResources | null>();
    const resourcesFor = (pageIndex: number) => {
      let res = resCache.get(pageIndex);
      if (res === undefined) {
        res = pageResFor(outDoc, pageIndex, measurerCache);
        resCache.set(pageIndex, res);
      }
      return res;
    };
    const warnOnce = (key: string, message: string) => {
      if (warnedBlocks.has(key)) return;
      warnedBlocks.add(key);
      applyWarnings.push(message);
    };

    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b];
      const originalSoft = softenUnsupported(block.text);
      const requested = softenUnsupported(replacements[b] ?? '');
      const finalText = requested.length > 0 ? requested : originalSoft;
      texts.push(finalText);
      /** Leave the block's bytes exactly as they are. */
      const keepOriginal = () => {
        texts[b] = originalSoft;
      };
      if (finalText === originalSoft) continue;

      const res = resourcesFor(block.pageIndex);
      const measurer = res?.fonts.get(block.fontKey)?.measurer;
      if (!measurer) {
        keepOriginal();
        warnOnce(
          `font${block.pageIndex}:${block.fontKey}`,
          `page ${block.pageIndex + 1}: kept original text because font /${block.fontKey || '?'} cannot be measured`
        );
        continue;
      }
      if (!measurer.supports(finalText)) {
        const bad = [...finalText].find((ch) => !measurer.supports(ch))!;
        keepOriginal();
        warnOnce(
          `glyph${block.pageIndex}`,
          `page ${block.pageIndex + 1}: kept original text because "${bad}" is not in font /${block.fontKey}`
        );
        continue;
      }

      const first = block.runs[0];
      const lastRun = block.runs[block.runs.length - 1];
      const blockLeft = block.runs.reduce((m, r) => Math.min(m, r.x), Infinity);
      const trailingSpace =
        (block.pageWidth - blockLeft - (lastRun.x + lastRun.slot)) / Math.max(0.01, lastRun.hScale);
      const caps = block.runs.map((r, i) =>
        i === block.runs.length - 1 ? r.cap + Math.max(0, Math.min(trailingSpace, r.cap * 0.6)) : r.cap
      );
      const totalCap = caps.reduce((a, c) => a + c, 0);
      const bytesAll = measurer.encode(finalText);
      if (!bytesAll || totalCap <= 0) {
        keepOriginal();
        continue;
      }
      const widthAll = baseWidthOf(bytesAll, 0, measurer, first.size, first.charSpacing, first.wordSpacing);
      if (widthAll <= 0) {
        keepOriginal();
        continue;
      }

      // Fill the runs in reading order: each run takes whole words until its own
      // original slot is used up and the last run absorbs what is left, so the
      // text can never jump out of sequence.
      const words = finalText.split(' ');
      const parts: string[][] = block.runs.map(() => []);
      const widthOf = (text: string) => {
        const enc = measurer.encode(text);
        return enc ? baseWidthOf(enc, 0, measurer, first.size, first.charSpacing, first.wordSpacing) : Infinity;
      };
      const lastIndex = block.runs.length - 1;
      const reserve = words.length >= block.runs.length ? 1 : 0;
      let wi = 0;
      for (let r = 0; r <= lastIndex; r++) {
        const later = (lastIndex - r) * reserve;
        while (wi < words.length - (r === lastIndex ? 0 : later)) {
          const candidate = parts[r].length ? `${parts[r].join(' ')} ${words[wi]}` : words[wi];
          if (r !== lastIndex && parts[r].length >= 1 && widthOf(candidate) > caps[r]) break;
          parts[r].push(words[wi]);
          wi++;
        }
      }
      if (wi < words.length) {
        applyWarnings.push(
          `page ${block.pageIndex + 1}: replacement for "${block.text.slice(0, 40)}${block.text.length > 40 ? '…' : ''}" could not be placed in order, kept the original text`
        );
        texts[b] = originalSoft;
        continue;
      }

      const edits: Edit[] = [];
      let rejected: {factor: number; text: string} | null = null;
      for (let r = 0; r < block.runs.length; r++) {
        const run = block.runs[r];
        const piece = parts[r].join(' ');
        const pieceBytes = piece ? measurer.encode(piece) : [];
        if (piece && !pieceBytes) {
          rejected = {factor: 0, text: piece};
          break;
        }
        const pieceWidth = pieceBytes?.length
          ? baseWidthOf(pieceBytes, 0, measurer, run.size, run.charSpacing, run.wordSpacing)
          : 0;
        if (pieceWidth === 0) {
          edits.push({run, bytes: [], tz: run.hScale * 100});
          continue;
        }
        const factor = caps[r] / pieceWidth;
        // Text is never stretched wider than its natural glyphs; a small squeeze
        // keeps the run inside its original slot so nothing shifts.
        if (factor < FIT_MIN) {
          rejected = {factor, text: piece};
          break;
        }
        edits.push({run, bytes: pieceBytes!, tz: run.hScale * Math.min(1, factor) * 100});
      }

      if (rejected) {
        keepOriginal();
        warnOnce(
          `fit${block.pageIndex}`,
          `page ${block.pageIndex + 1}: "${block.text.slice(0, 40)}${block.text.length > 40 ? '…' : ''}" would need ${Math.round((1 / Math.max(0.01, rejected.factor)) * 100)}% of its original width, so it was left unchanged to keep the layout exact`
        );
        continue;
      }

      const list = pageEdits.get(block.pageIndex) || [];
      list.push(...edits);
      pageEdits.set(block.pageIndex, list);
      changed++;
    }

    for (const [pageIndex, edits] of pageEdits) {
      const page = outDoc.getPages()[pageIndex] as unknown as {node: PDFDict};
      const content = pageContentBytes(page, outDoc.context);
      const expected = pageContentLength.get(pageIndex);
      if (!content || (expected !== undefined && content.length !== expected)) {
        applyWarnings.push(`page ${pageIndex + 1}: content stream changed while writing, left untouched`);
        continue;
      }

      edits.sort((a, b) => a.run.start - b.run.start);
      const chunks: Uint8Array[] = [];
      let cursor = 0;
      for (const edit of edits) {
        const {run} = edit;
        if (run.start < cursor) {
          applyWarnings.push(`page ${pageIndex + 1}: overlapping text runs, some replacements skipped`);
          continue;
        }
        chunks.push(content.subarray(cursor, run.start));
        const originalTz = run.hScale * 100;
        const seq: number[] = [];
        const ascii = (s: string) => {
          for (const ch of s) seq.push(ch.charCodeAt(0));
        };
        if (Math.abs(edit.tz - originalTz) > 0.01) {
          ascii(`${fmt(edit.tz)} Tz `);
        }
        const esc = escapeLiteral(edit.bytes);
        for (const byte of esc) seq.push(byte);
        ascii(run.op === 'quote' ? " '" : ' Tj');
        if (Math.abs(edit.tz - originalTz) > 0.01) {
          ascii(` ${fmt(originalTz)} Tz`);
        }
        chunks.push(Uint8Array.from(Buffer.from(seq)));
        cursor = run.end;
      }
      chunks.push(content.subarray(cursor));

      const merged = Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.length)));
      const compressed = zlib.deflateSync(merged);
      const newStream = PDFRawStream.of(
        outDoc.context.obj({
          Type: 'XObject',
          Subtype: 'Stream',
          Filter: 'FlateDecode',
          Length: PDFNumber.of(compressed.length),
        }) as PDFDict,
        new Uint8Array(compressed)
      );

      const contents = page.node.get(PDFName.of('Contents'));
      if (contents instanceof PDFRef) {
        outDoc.context.assign(contents, newStream);
      } else {
        const ref = outDoc.context.register(newStream);
        page.node.set(PDFName.of('Contents'), ref);
      }
    }

    const saved = await outDoc.save({useObjectStreams: false});
    return {
      buffer: Buffer.from(saved),
      texts,
      changedUnits: changed,
      warnings: [...warnings, ...applyWarnings],
    };
  };

  return {
    units,
    pageCount: pages.length,
    imageCount,
    warnings,
    apply,
  };
}

/** Fonts of a page, resolved against a freshly loaded copy of the document. */
function pageResFor(
  doc: PDFDocument,
  pageIndex: number,
  cache: Map<string, {measurer: FontMeasurer | null; reason: string}>
): PageResources | null {
  const page = doc.getPages()[pageIndex] as unknown as {node: PDFDict} | undefined;
  if (!page) return null;
  return collectResources(page, doc.context, cache);
}
